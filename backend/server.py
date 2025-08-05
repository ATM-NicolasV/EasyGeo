from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import asyncio
import aiohttp
from bs4 import BeautifulSoup
import html2text
import uuid
from typing import List, Optional, Dict, Any
import logging
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
except ImportError as e:
    print(f"Warning: Could not import emergentintegrations: {e}")
    # Create fallback classes
    class LlmChat:
        def __init__(self, api_key, session_id, system_message):
            self.api_key = api_key
            self.session_id = session_id
            self.system_message = system_message
            
        def with_model(self, provider, model):
            self.provider = provider
            self.model = model
            return self
            
        def with_max_tokens(self, tokens):
            self.max_tokens = tokens
            return self
            
        async def send_message(self, message):
            # Fallback implementation using direct API call
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=self.api_key)
            response = await client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                system=self.system_message,
                messages=[{"role": "user", "content": message.text}]
            )
            return response.content[0].text
    
    class UserMessage:
        def __init__(self, text):
            self.text = text
import json
from datetime import datetime, timedelta
import re
from admin_routes import admin_router

load_dotenv()

# Configuration
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'political_analyzer')
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')

# FastAPI app
app = FastAPI(title="Political Analysis API", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include admin routes
app.include_router(admin_router)

# Database client
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
articles_collection = db.articles  # Ancienne collection (à garder pour compatibilité)
syntheses_collection = db.syntheses  # Ancienne collection (à garder pour compatibilité)
glossary_collection = db.glossary
sources_collection = db.sources

# Nouvelles collections pour le scraping automatique
scraped_articles_collection = db.scraped_articles
daily_syntheses_collection = db.daily_syntheses
news_sources_collection = db.news_sources

# Models
class SourceURL(BaseModel):
    url: str
    description: Optional[str] = None

class AIProvider(BaseModel):
    provider: str = "anthropic"
    model: str = "claude-3-5-haiku-20241022"

class AnalysisRequest(BaseModel):
    urls: List[str]
    topic: str
    ai_settings: Optional[AIProvider] = AIProvider()

class GlossaryTerm(BaseModel):
    term: str
    definition: str
    detailed_explanation: Optional[str] = None

class Article(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    title: str
    content: str
    source: str
    extracted_at: datetime = Field(default_factory=datetime.now)
    facts: List[str] = []
    bias_analysis: Optional[str] = None

class Synthesis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    topic: str
    neutral_article: str
    sources_used: List[str]
    reliability_score: float
    facts_verified: List[Dict[str, Any]]
    created_at: datetime = Field(default_factory=datetime.now)
    ai_provider: str = "anthropic"
    ai_model: str = "claude-3-5-haiku-20241022"

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Utility functions
async def extract_web_content(url: str) -> Dict[str, str]:
    """Extract content from a web URL"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status != 200:
                    raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {url}")
                
                html_content = await response.text()
                soup = BeautifulSoup(html_content, 'html.parser')
                
                # Extract title
                title = soup.find('title')
                title = title.get_text().strip() if title else "No title found"
                
                # Convert HTML to text
                h = html2text.HTML2Text()
                h.ignore_links = True
                h.ignore_images = True
                text_content = h.handle(html_content)
                
                # Clean up text
                text_content = re.sub(r'\n+', '\n', text_content).strip()
                
                return {
                    "title": title,
                    "content": text_content[:5000],  # Limit content length
                    "source": url
                }
    except Exception as e:
        logger.error(f"Error extracting content from {url}: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error extracting content: {str(e)}")

async def analyze_with_claude(content: str, task: str, ai_settings: AIProvider) -> str:
    """Analyze content using Claude AI"""
    try:
        chat = LlmChat(
            api_key=ANTHROPIC_API_KEY,
            session_id=str(uuid.uuid4()),
            system_message="Tu es un expert en analyse politique et géopolitique. Tu analyses les contenus de manière neutre et factuelle."
        ).with_model(ai_settings.provider, ai_settings.model).with_max_tokens(4000)
        
        user_message = UserMessage(text=f"{task}\n\nContenu à analyser :\n{content}")
        response = await chat.send_message(user_message)
        
        return response
    except Exception as e:
        logger.error(f"Error with Claude analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI analysis error: {str(e)}")

# API Endpoints
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "political-analyzer", "version": "2.0.0"}

# Nouveaux endpoints pour l'interface utilisateur

@app.get("/api/daily-synthesis")
async def get_daily_synthesis(date: Optional[str] = None):
    """Récupérer la synthèse quotidienne"""
    
    # Si pas de date spécifiée, prendre aujourd'hui
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    # Récupérer la synthèse du jour
    synthesis = await daily_syntheses_collection.find_one(
        {"date": date},
        sort=[("created_at", -1)]  # La plus récente si plusieurs
    )
    
    if not synthesis:
        # Pas de synthèse pour ce jour
        return {
            "date": date,
            "synthesis": None,
            "message": "Aucune synthèse disponible pour cette date"
        }
    
    # Nettoyer l'objet MongoDB
    if "_id" in synthesis:
        del synthesis["_id"]
    
    return {
        "date": date,
        "synthesis": synthesis
    }

@app.get("/api/daily-syntheses")
async def get_daily_syntheses_history(limit: int = 30):
    """Récupérer l'historique des synthèses quotidiennes"""
    
    syntheses = []
    cursor = daily_syntheses_collection.find().sort("created_at", -1).limit(limit)
    
    async for synthesis in cursor:
        if "_id" in synthesis:
            del synthesis["_id"]
        
        # Résumé pour la liste
        syntheses.append({
            "id": synthesis.get("id"),
            "date": synthesis.get("date"),
            "title": synthesis.get("title"),
            "sources_count": synthesis.get("sources_count", 0),
            "themes": synthesis.get("themes", []),
            "reliability_score": synthesis.get("reliability_score", 0),
            "created_at": synthesis.get("created_at"),
            "preview": synthesis.get("content", "")[:200] + "..." if synthesis.get("content") else ""
        })
    
    return {
        "syntheses": syntheses,
        "total": len(syntheses)
    }

@app.get("/api/daily-synthesis/{synthesis_id}")
async def get_specific_daily_synthesis(synthesis_id: str):
    """Récupérer une synthèse spécifique"""
    
    synthesis = await daily_syntheses_collection.find_one({"id": synthesis_id})
    
    if not synthesis:
        raise HTTPException(status_code=404, detail="Synthèse non trouvée")
    
    if "_id" in synthesis:
        del synthesis["_id"]
    
    return synthesis

@app.get("/api/sources-status")
async def get_sources_status():
    """Récupérer le statut des sources configurées"""
    
    sources = []
    async for source in news_sources_collection.find():
        if "_id" in source:
            del source["_id"]
        sources.append(source)
    
    # Compter les articles par source aujourd'hui
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    for source in sources:
        article_count = await scraped_articles_collection.count_documents({
            "source": source["name"],
            "scraped_at": {"$gte": today_start}
        })
        source["today_articles"] = article_count
    
    return {
        "sources": sources,
        "last_updated": datetime.now()
    }

@app.post("/api/sources")
async def add_source(source: SourceURL):
    """Add a new news source"""
    source_doc = {
        "id": str(uuid.uuid4()),
        "url": source.url,
        "description": source.description,
        "added_at": datetime.now(),
        "active": True
    }
    
    await sources_collection.insert_one(source_doc)
    return {"message": "Source added successfully", "id": source_doc["id"]}

@app.get("/api/sources")
async def get_sources():
    """Get all news sources"""
    sources = []
    async for source in sources_collection.find({"active": True}):
        # Remove MongoDB ObjectId to avoid serialization issues
        if "_id" in source:
            del source["_id"]
        sources.append({
            "id": source["id"],
            "url": source["url"],
            "description": source.get("description", ""),
            "added_at": source["added_at"]
        })
    return {"sources": sources}

@app.post("/api/analyze")
async def analyze_sources(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """Analyze sources and generate neutral synthesis"""
    
    # Extract content from URLs
    articles = []
    for url in request.urls:
        try:
            content_data = await extract_web_content(url)
            
            # Analyze individual article for facts and bias
            fact_analysis = await analyze_with_claude(
                content_data["content"],
                f"Extrait uniquement les FAITS vérifiables de ce contenu sur le sujet '{request.topic}'. Ignore les opinions et commentaires. Liste les faits sous forme de points:",
                request.ai_settings
            )
            
            bias_analysis = await analyze_with_claude(
                content_data["content"],
                f"Analyse le biais éventuel de ce contenu concernant '{request.topic}'. Identifie la perspective politique/idéologique:",
                request.ai_settings
            )
            
            article = Article(
                url=url,
                title=content_data["title"],
                content=content_data["content"],
                source=content_data["source"],
                facts=[fact.strip() for fact in fact_analysis.split('\n') if fact.strip() and not fact.strip().startswith('#')],
                bias_analysis=bias_analysis
            )
            
            articles.append(article)
            
            # Save to database
            await articles_collection.insert_one(article.dict())
            
        except Exception as e:
            logger.error(f"Error processing {url}: {str(e)}")
            continue
    
    if not articles:
        raise HTTPException(status_code=400, detail="No articles could be processed")
    
    # Generate synthesis
    all_facts = []
    for article in articles:
        all_facts.extend(article.facts)
    
    synthesis_prompt = f"""
    Sujet: {request.topic}
    
    Voici les faits extraits de {len(articles)} sources différentes:
    {chr(10).join([f"- {fact}" for fact in all_facts])}
    
    Sources analysées:
    {chr(10).join([f"- {article.title} ({article.source})" for article in articles])}
    
    Créé un article de synthèse COMPLÈTEMENT NEUTRE sur le sujet '{request.topic}':
    1. Ne présente que les faits corroborés par plusieurs sources
    2. Indique le nombre de sources pour chaque information
    3. Évite tout langage partisan ou émotionnel
    4. Structure l'article de manière claire et objective
    5. Maximum 800 mots
    """
    
    neutral_synthesis = await analyze_with_claude(
        synthesis_prompt,
        "Génère un article de synthèse neutre et factuel:",
        request.ai_settings
    )
    
    # Calculate reliability score (simple version based on source count)
    reliability_score = min(len(articles) / 5.0, 1.0)  # Max score when 5+ sources
    
    # Create synthesis object
    synthesis = Synthesis(
        topic=request.topic,
        neutral_article=neutral_synthesis,
        sources_used=[article.url for article in articles],
        reliability_score=reliability_score,
        facts_verified=[{"fact": fact, "source_count": 1} for fact in all_facts[:20]],  # Simplified
        ai_provider=request.ai_settings.provider,
        ai_model=request.ai_settings.model
    )
    
    # Save synthesis
    await syntheses_collection.insert_one(synthesis.dict())
    
    return {
        "synthesis_id": synthesis.id,
        "topic": synthesis.topic,
        "article": synthesis.neutral_article,
        "sources_count": len(articles),
        "reliability_score": synthesis.reliability_score,
        "sources_used": synthesis.sources_used
    }

@app.get("/api/syntheses")
async def get_syntheses():
    """Get all syntheses"""
    syntheses = []
    async for synthesis in syntheses_collection.find().sort("created_at", -1):
        # Remove MongoDB ObjectId to avoid serialization issues
        if "_id" in synthesis:
            del synthesis["_id"]
        syntheses.append({
            "id": synthesis["id"],
            "topic": synthesis["topic"],
            "article": synthesis["neutral_article"][:200] + "...",  # Preview
            "sources_count": len(synthesis["sources_used"]),
            "reliability_score": synthesis["reliability_score"],
            "created_at": synthesis["created_at"]
        })
    return {"syntheses": syntheses}

@app.get("/api/syntheses/{synthesis_id}")
async def get_synthesis(synthesis_id: str):
    """Get specific synthesis"""
    synthesis = await syntheses_collection.find_one({"id": synthesis_id})
    if not synthesis:
        raise HTTPException(status_code=404, detail="Synthesis not found")
    
    # Remove MongoDB ObjectId to avoid serialization issues
    if "_id" in synthesis:
        del synthesis["_id"]
    
    return synthesis

@app.post("/api/glossary")
async def add_glossary_term(term: GlossaryTerm):
    """Add a term to the glossary"""
    # Check if term already exists
    existing = await glossary_collection.find_one({"term": term.term.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Term already exists")
    
    term_doc = {
        "id": str(uuid.uuid4()),
        "term": term.term.lower(),
        "display_term": term.term,
        "definition": term.definition,
        "detailed_explanation": term.detailed_explanation,
        "created_at": datetime.now()
    }
    
    await glossary_collection.insert_one(term_doc)
    return {"message": "Term added successfully", "id": term_doc["id"]}

@app.get("/api/glossary")
async def get_glossary():
    """Get all glossary terms"""
    terms = []
    async for term in glossary_collection.find().sort("term", 1):
        # Remove MongoDB ObjectId to avoid serialization issues
        if "_id" in term:
            del term["_id"]
        terms.append({
            "id": term["id"],
            "term": term["display_term"],
            "definition": term["definition"],
            "detailed_explanation": term.get("detailed_explanation", "")
        })
    return {"terms": terms}

@app.get("/api/glossary/{term}")
async def get_glossary_term(term: str):
    """Get specific glossary term"""
    term_doc = await glossary_collection.find_one({"term": term.lower()})
    if not term_doc:
        raise HTTPException(status_code=404, detail="Term not found")
    
    return {
        "term": term_doc["display_term"],
        "definition": term_doc["definition"],
        "detailed_explanation": term_doc.get("detailed_explanation", "")
    }

@app.post("/api/auto-glossary")
async def auto_generate_glossary(background_tasks: BackgroundTasks):
    """Auto-generate glossary terms from political/geopolitical context"""
    
    # Pre-defined important terms for political analysis
    terms_to_add = [
        {
            "term": "PIB",
            "definition": "Produit Intérieur Brut - valeur totale des biens et services produits dans un pays",
            "detailed_explanation": "Indicateur économique principal mesurant la richesse créée sur le territoire national en une année."
        },
        {
            "term": "OTAN",
            "definition": "Organisation du Traité de l'Atlantique Nord - alliance militaire occidentale",
            "detailed_explanation": "Alliance militaire créée en 1949 regroupant 31 pays, principalement occidentaux, pour assurer leur défense collective."
        },
        {
            "term": "Dette souveraine",
            "definition": "Dette contractée par un État auprès de créanciers publics ou privés",
            "detailed_explanation": "Montant total des emprunts d'un pays, indicateur clé de sa santé financière et de sa capacité à honorer ses engagements."
        },
        {
            "term": "Géopolitique",
            "definition": "Étude des relations internationales sous l'angle géographique et politique",
            "detailed_explanation": "Discipline analysant l'influence des facteurs géographiques sur les relations de pouvoir entre États et acteurs internationaux."
        },
        {
            "term": "Soft power",
            "definition": "Pouvoir d'influence par l'attractivité culturelle et idéologique",
            "detailed_explanation": "Concept développé par Joseph Nye désignant la capacité d'un acteur à influencer sans contrainte, par l'attrait de ses valeurs et de sa culture."
        }
    ]
    
    for term_data in terms_to_add:
        existing = await glossary_collection.find_one({"term": term_data["term"].lower()})
        if not existing:
            term_doc = {
                "id": str(uuid.uuid4()),
                "term": term_data["term"].lower(),
                "display_term": term_data["term"],
                "definition": term_data["definition"],
                "detailed_explanation": term_data["detailed_explanation"],
                "created_at": datetime.now(),
                "auto_generated": True
            }
            await glossary_collection.insert_one(term_doc)
    
    return {"message": f"Auto-generated {len(terms_to_add)} glossary terms"}

# Endpoint pour initialiser les sources par défaut
@app.post("/api/init-default-sources")
async def initialize_default_sources():
    """Initialiser les sources par défaut (Le Monde, BFM, Blast)"""
    
    default_sources = [
        {
            "id": str(uuid.uuid4()),
            "name": "Le Monde",
            "url": "https://www.lemonde.fr",
            "description": "Journal français de référence",
            "scraper_type": "lemonde",
            "is_active": True,
            "css_selectors": {},
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "articles_scraped": 0,
            "last_scrape": None
        },
        {
            "id": str(uuid.uuid4()),
            "name": "BFM Business",
            "url": "https://www.bfmtv.com",
            "description": "Chaîne d'information économique",
            "scraper_type": "bfm",
            "is_active": True,
            "css_selectors": {},
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "articles_scraped": 0,
            "last_scrape": None
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Blast",
            "url": "https://www.blast-info.fr",
            "description": "Media indépendant d'investigation",
            "scraper_type": "blast",
            "is_active": True,
            "css_selectors": {},
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "articles_scraped": 0,
            "last_scrape": None
        }
    ]
    
    sources_added = 0
    for source_data in default_sources:
        # Vérifier si la source existe déjà
        existing = await news_sources_collection.find_one({"name": source_data["name"]})
        if not existing:
            await news_sources_collection.insert_one(source_data)
            sources_added += 1
    
    return {
        "message": f"Initialisé {sources_added} sources par défaut",
        "sources": [s["name"] for s in default_sources]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)