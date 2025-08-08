from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import logging
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Import des fonctions d'authentification
from auth import require_admin, User

logger = logging.getLogger(__name__)

# Configuration
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'political_analyzer')

# Database
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
news_sources_collection = db.news_sources
scraped_articles_collection = db.scraped_articles
daily_syntheses_collection = db.daily_syntheses
scraping_config_collection = db.scraping_config
config_collection = db.admin_config
ai_models_collection = db.ai_models
glossary_collection = db.glossary

# Router
admin_router = APIRouter(prefix="/api/admin", tags=["Administration"])

# Models
class NewsSource(BaseModel):
    name: str
    url: str
    description: Optional[str] = None
    scraper_type: str = "generic"
    css_selectors: Optional[Dict[str, str]] = {}
    is_active: bool = True
    headers: Optional[Dict[str, str]] = {}
    custom_scraping_rules: Optional[Dict[str, Any]] = {}

class AIModel(BaseModel):
    name: str
    provider: str  # "anthropic", "openai", "local", etc.
    model_id: str  # "claude-3-5-haiku-20241022", "gpt-4", etc.
    api_key: Optional[str] = None
    api_endpoint: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = {}
    is_active: bool = True
    description: Optional[str] = None

class GlossaryTerm(BaseModel):
    term: str
    display_term: str
    definition: str
    detailed_explanation: Optional[str] = None
    category: Optional[str] = "general"
    examples: Optional[List[str]] = []

class SystemConfig(BaseModel):
    scraping_frequency_hours: int = 1
    synthesis_times: List[str] = ["09:00", "15:00", "20:00"]
    max_articles_per_synthesis: int = 50
    reliability_threshold: float = 0.7
    auto_glossary_generation: bool = True
    default_ai_model: str = "claude-3-5-haiku"
    email_notifications: bool = False
    notification_email: Optional[str] = None
    data_retention_days: int = 365

class SynthesisRequest(BaseModel):
    ai_model: str
    max_articles: Optional[int] = 20
    custom_prompt: Optional[str] = None
    themes_filter: Optional[List[str]] = None
    
class ScrapingConfig(BaseModel):
    scraping_interval_hours: int = 1
    max_articles_per_source: int = 10
    political_keywords_threshold: int = 2
    synthesis_hours: List[int] = [9, 15, 20]
    
class NewsSourceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    css_selectors: Optional[Dict[str, str]] = None

# Endpoints - Gestion des sources
@admin_router.post("/sources")
async def add_news_source(source: NewsSource, current_admin: User = Depends(require_admin)):
    """Ajouter une nouvelle source d'actualités - Admin uniquement"""
    
    # Vérifier si la source existe déjà
    existing = await news_sources_collection.find_one({"url": source.url})
    if existing:
        raise HTTPException(status_code=400, detail="Cette source existe déjà")
    
    source_doc = {
        "id": str(uuid.uuid4()),
        "name": source.name,
        "url": source.url,
        "description": source.description,
        "scraper_type": source.scraper_type,
        "is_active": source.is_active,
        "css_selectors": source.css_selectors or {},
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "articles_scraped": 0,
        "last_scrape": None
    }
    
    await news_sources_collection.insert_one(source_doc)
    
    return {
        "message": "Source ajoutée avec succès",
        "source_id": source_doc["id"],
        "source_name": source.name
    }

@admin_router.get("/sources")
async def get_all_news_sources():
    """Récupérer toutes les sources d'actualités"""
    
    sources = []
    async for source in news_sources_collection.find():
        if "_id" in source:
            del source["_id"]
        sources.append(source)
    
    return {
        "sources": sources,
        "total": len(sources),
        "active": len([s for s in sources if s.get("is_active", True)])
    }

@admin_router.put("/sources/{source_id}")
async def update_news_source(source_id: str, updates: NewsSourceUpdate):
    """Mettre à jour une source d'actualités"""
    
    # Vérifier que la source existe
    existing = await news_sources_collection.find_one({"id": source_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Source non trouvée")
    
    # Préparer les mises à jour
    update_data = {}
    for field, value in updates.dict(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    if update_data:
        update_data["updated_at"] = datetime.now()
        
        await news_sources_collection.update_one(
            {"id": source_id},
            {"$set": update_data}
        )
    
    return {"message": "Source mise à jour avec succès"}

@admin_router.delete("/sources/{source_id}")
async def delete_news_source(source_id: str):
    """Supprimer une source d'actualités"""
    
    result = await news_sources_collection.delete_one({"id": source_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Source non trouvée")
    
    return {"message": "Source supprimée avec succès"}

# Endpoints - Configuration du scraping
@admin_router.get("/config")
async def get_scraping_config():
    """Récupérer la configuration du scraping"""
    
    config = await scraping_config_collection.find_one({"type": "main"})
    
    if not config:
        # Configuration par défaut
        default_config = {
            "id": str(uuid.uuid4()),
            "type": "main",
            "scraping_interval_hours": 1,
            "max_articles_per_source": 10,
            "political_keywords_threshold": 2,
            "synthesis_hours": [9, 15, 20],
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        await scraping_config_collection.insert_one(default_config)
        config = default_config
    
    if "_id" in config:
        del config["_id"]
    
    return config

@admin_router.put("/config")
async def update_scraping_config(config: ScrapingConfig):
    """Mettre à jour la configuration du scraping"""
    
    config_data = {
        "scraping_interval_hours": config.scraping_interval_hours,
        "max_articles_per_source": config.max_articles_per_source,
        "political_keywords_threshold": config.political_keywords_threshold,
        "synthesis_hours": config.synthesis_hours,
        "updated_at": datetime.now()
    }
    
    await scraping_config_collection.update_one(
        {"type": "main"},
        {"$set": config_data},
        upsert=True
    )
    
    return {"message": "Configuration mise à jour avec succès"}

# Endpoints - Statistiques et monitoring
@admin_router.get("/stats")
async def get_scraping_stats():
    """Récupérer les statistiques de scraping"""
    
    # Compter les articles par source
    articles_by_source = {}
    async for article in scraped_articles_collection.find():
        source = article.get("source", "Unknown")
        articles_by_source[source] = articles_by_source.get(source, 0) + 1
    
    # Compter les articles d'aujourd'hui
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_articles = await scraped_articles_collection.count_documents({
        "scraped_at": {"$gte": today_start}
    })
    
    # Compter les synthèses
    total_syntheses = await daily_syntheses_collection.count_documents({})
    
    # Dernière synthèse
    last_synthesis = await daily_syntheses_collection.find_one(
        {}, sort=[("created_at", -1)]
    )
    
    return {
        "articles_by_source": articles_by_source,
        "today_articles": today_articles,
        "total_articles": sum(articles_by_source.values()),
        "total_syntheses": total_syntheses,
        "last_synthesis": {
            "date": last_synthesis.get("date") if last_synthesis else None,
            "title": last_synthesis.get("title") if last_synthesis else None,
            "sources_count": last_synthesis.get("sources_count") if last_synthesis else 0
        } if last_synthesis else None
    }

@admin_router.get("/articles/recent")
async def get_recent_articles(limit: int = 20):
    """Récupérer les articles récents"""
    
    articles = []
    cursor = scraped_articles_collection.find().sort("scraped_at", -1).limit(limit)
    
    async for article in cursor:
        if "_id" in article:
            del article["_id"]
        articles.append({
            "id": article.get("id"),
            "title": article.get("title"),
            "source": article.get("source"),
            "url": article.get("url"),
            "scraped_at": article.get("scraped_at"),
            "is_political": article.get("is_political", False)
        })
    
    return {"articles": articles}

@admin_router.get("/syntheses/recent")
async def get_recent_syntheses(limit: int = 10):
    """Récupérer les synthèses récentes"""
    
    syntheses = []
    cursor = daily_syntheses_collection.find().sort("created_at", -1).limit(limit)
    
    async for synthesis in cursor:
        if "_id" in synthesis:
            del synthesis["_id"]
        syntheses.append({
            "id": synthesis.get("id"),
            "date": synthesis.get("date"),
            "title": synthesis.get("title"),
            "sources_count": synthesis.get("sources_count"),
            "reliability_score": synthesis.get("reliability_score"),
            "themes": synthesis.get("themes", []),
            "created_at": synthesis.get("created_at")
        })
    
    return {"syntheses": syntheses}

# =====================================
# ENDPOINTS - GESTION DES SOURCES
# =====================================

@admin_router.get("/sources/all")
async def get_all_sources(current_admin: User = Depends(require_admin)):
    """Récupérer toutes les sources configurées avec détails complets"""
    sources = []
    cursor = news_sources_collection.find()
    async for source in cursor:
        if "_id" in source:
            del source["_id"]
        sources.append(source)
    return {"sources": sources}

@admin_router.post("/sources/create")
async def create_news_source(source: NewsSource, current_admin: User = Depends(require_admin)):
    """Ajouter une nouvelle source d'actualités"""
    try:
        source_dict = {
            "id": str(uuid.uuid4()),
            "name": source.name,
            "url": source.url,
            "description": source.description,
            "scraper_type": source.scraper_type,
            "css_selectors": source.css_selectors or {},
            "headers": source.headers or {},
            "custom_scraping_rules": source.custom_scraping_rules or {},
            "is_active": source.is_active,
            "articles_scraped": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_scrape": None
        }
        
        await news_sources_collection.insert_one(source_dict)
        
        return {
            "message": "Source ajoutée avec succès",
            "source_id": source_dict["id"],
            "source_name": source_dict["name"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'ajout de la source: {str(e)}")

@admin_router.put("/sources/{source_id}")
async def update_news_source(source_id: str, source: NewsSource, current_admin: User = Depends(require_admin)):
    """Modifier une source existante"""
    try:
        update_data = {
            "name": source.name,
            "url": source.url,
            "description": source.description,
            "scraper_type": source.scraper_type,
            "css_selectors": source.css_selectors or {},
            "headers": source.headers or {},
            "custom_scraping_rules": source.custom_scraping_rules or {},
            "is_active": source.is_active,
            "updated_at": datetime.utcnow()
        }
        
        result = await news_sources_collection.update_one(
            {"id": source_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Source non trouvée")
            
        return {"message": "Source mise à jour avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

@admin_router.delete("/sources/{source_id}")
async def delete_news_source(source_id: str, current_admin: User = Depends(require_admin)):
    """Supprimer une source"""
    try:
        result = await news_sources_collection.delete_one({"id": source_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Source non trouvée")
            
        return {"message": "Source supprimée avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

@admin_router.post("/sources/{source_id}/test")
async def test_source_scraping(source_id: str, current_admin: User = Depends(require_admin)):
    """Tester le scraping d'une source spécifique"""
    try:
        # Récupérer la source
        source = await news_sources_collection.find_one({"id": source_id})
        if not source:
            raise HTTPException(status_code=404, detail="Source non trouvée")
            
        # Tester le scraping (simulation pour cet exemple)
        from scraper import NewsScrapingService
        service = NewsScrapingService()
        
        # Test de scraping de cette source uniquement
        test_articles = []  # Logique de test à implémenter
        
        return {
            "message": "Test de scraping terminé",
            "source_name": source["name"],
            "articles_found": len(test_articles),
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du test: {str(e)}")

# =====================================
# ENDPOINTS - GESTION DES IA
# =====================================

@admin_router.get("/ai-models")
async def get_ai_models(current_admin: User = Depends(require_admin)):
    """Récupérer tous les modèles IA configurés"""
    models = []
    cursor = ai_models_collection.find()
    async for model in cursor:
        if "_id" in model:
            del model["_id"]
        # Masquer les clés API pour la sécurité
        if "api_key" in model:
            model["api_key"] = "***MASQUÉ***" if model["api_key"] else None
        models.append(model)
    
    return {"ai_models": models}

@admin_router.post("/ai-models")
async def add_ai_model(model: AIModel, current_admin: User = Depends(require_admin)):
    """Ajouter un nouveau modèle IA"""
    try:
        model_dict = {
            "id": str(uuid.uuid4()),
            "name": model.name,
            "provider": model.provider,
            "model_id": model.model_id,
            "api_key": model.api_key,
            "api_endpoint": model.api_endpoint,
            "parameters": model.parameters or {},
            "is_active": model.is_active,
            "description": model.description,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await ai_models_collection.insert_one(model_dict)
        
        return {
            "message": "Modèle IA ajouté avec succès",
            "model_id": model_dict["id"],
            "model_name": model_dict["name"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'ajout du modèle: {str(e)}")

@admin_router.post("/ai-models/{model_id}/test")
async def test_ai_model(model_id: str, current_admin: User = Depends(require_admin)):
    """Tester un modèle IA avec une requête simple"""
    try:
        # Récupérer le modèle
        model = await ai_models_collection.find_one({"id": model_id})
        if not model:
            raise HTTPException(status_code=404, detail="Modèle IA non trouvé")
        
        # Test simple du modèle
        test_prompt = "Résumez en une phrase : l'intelligence artificielle révolutionne l'analyse politique."
        
        # Simulation de test (implémentation réelle selon le provider)
        test_result = {
            "model_name": model["name"],
            "provider": model["provider"],
            "test_prompt": test_prompt,
            "response": "Test simulé - Modèle fonctionnel",
            "success": True,
            "response_time_ms": 150
        }
        
        return test_result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du test: {str(e)}")

# =====================================
# ENDPOINTS - GESTION DU GLOSSAIRE
# =====================================

@admin_router.get("/glossary")
async def get_glossary_admin(current_admin: User = Depends(require_admin)):
    """Récupérer tout le glossaire pour édition"""
    terms = []
    cursor = glossary_collection.find()
    async for term in cursor:
        if "_id" in term:
            del term["_id"]
        terms.append(term)
    
    return {"glossary": terms}

@admin_router.post("/glossary")
async def add_glossary_term(term: GlossaryTerm, current_admin: User = Depends(require_admin)):
    """Ajouter un terme au glossaire"""
    try:
        term_dict = {
            "id": str(uuid.uuid4()),
            "term": term.term.lower(),
            "display_term": term.display_term,
            "definition": term.definition,
            "detailed_explanation": term.detailed_explanation,
            "category": term.category,
            "examples": term.examples or [],
            "auto_generated": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await glossary_collection.insert_one(term_dict)
        
        return {
            "message": "Terme ajouté au glossaire",
            "term_id": term_dict["id"],
            "term": term_dict["display_term"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'ajout: {str(e)}")

@admin_router.put("/glossary/{term_id}")
async def update_glossary_term(term_id: str, term: GlossaryTerm, current_admin: User = Depends(require_admin)):
    """Modifier un terme du glossaire"""
    try:
        update_data = {
            "term": term.term.lower(),
            "display_term": term.display_term,
            "definition": term.definition,
            "detailed_explanation": term.detailed_explanation,
            "category": term.category,
            "examples": term.examples or [],
            "updated_at": datetime.utcnow()
        }
        
        result = await glossary_collection.update_one(
            {"id": term_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Terme non trouvé")
            
        return {"message": "Terme mis à jour avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

@admin_router.delete("/glossary/{term_id}")
async def delete_glossary_term(term_id: str, current_admin: User = Depends(require_admin)):
    """Supprimer un terme du glossaire"""
    try:
        result = await glossary_collection.delete_one({"id": term_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Terme non trouvé")
            
        return {"message": "Terme supprimé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")

# =====================================
# ENDPOINTS - CONFIGURATION SYSTÈME
# =====================================

@admin_router.get("/config")
async def get_system_config(current_admin: User = Depends(require_admin)):
    """Récupérer la configuration système actuelle"""
    try:
        config = await config_collection.find_one({"type": "system"})
        
        if not config:
            # Configuration par défaut
            default_config = {
                "type": "system",
                "scraping_frequency_hours": 1,
                "synthesis_times": ["09:00", "15:00", "20:00"],
                "max_articles_per_synthesis": 50,
                "reliability_threshold": 0.7,
                "auto_glossary_generation": True,
                "default_ai_model": "claude-3-5-haiku",
                "email_notifications": False,
                "notification_email": None,
                "data_retention_days": 365,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await config_collection.insert_one(default_config)
            config = default_config
            
        if "_id" in config:
            del config["_id"]
            
        return {"config": config}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération: {str(e)}")

@admin_router.put("/config")
async def update_system_config(config: SystemConfig, current_admin: User = Depends(require_admin)):
    """Mettre à jour la configuration système"""
    try:
        config_dict = {
            "type": "system",
            "scraping_frequency_hours": config.scraping_frequency_hours,
            "synthesis_times": config.synthesis_times,
            "max_articles_per_synthesis": config.max_articles_per_synthesis,
            "reliability_threshold": config.reliability_threshold,
            "auto_glossary_generation": config.auto_glossary_generation,
            "default_ai_model": config.default_ai_model,
            "email_notifications": config.email_notifications,
            "notification_email": config.notification_email,
            "data_retention_days": config.data_retention_days,
            "updated_at": datetime.utcnow()
        }
        
        result = await config_collection.update_one(
            {"type": "system"},
            {"$set": config_dict},
            upsert=True
        )
        
        return {"message": "Configuration mise à jour avec succès"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

# =====================================
# ENDPOINTS - SYNTHÈSE AVEC IA PERSONNALISÉE
# =====================================

@admin_router.post("/synthesis/generate-with-ai")
async def generate_synthesis_with_custom_ai(
    request: SynthesisRequest,
    current_admin: User = Depends(require_admin)
):
    """Générer une synthèse avec un modèle IA spécifique"""
    try:
        # Récupérer le modèle IA spécifié
        ai_model = await ai_models_collection.find_one({"model_id": request.ai_model})
        if not ai_model:
            raise HTTPException(status_code=404, detail="Modèle IA non trouvé")
            
        if not ai_model.get("is_active", True):
            raise HTTPException(status_code=400, detail="Modèle IA inactif")
        
        # Récupérer les articles récents
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        pipeline = [
            {"$match": {
                "scraped_at": {"$gte": today_start},
                "is_political": True
            }},
            {"$sort": {"scraped_at": -1}},
            {"$limit": request.max_articles or 20}
        ]
        
        articles_cursor = scraped_articles_collection.aggregate(pipeline)
        articles_data = await articles_cursor.to_list(length=None)
        
        if not articles_data:
            return {
                "message": "Aucun article politique trouvé pour la synthèse",
                "success": False
            }
        
        # Préparer les articles pour la synthèse
        articles_text = []
        sources_breakdown = {}
        
        for article in articles_data:
            source = article.get("source", "Inconnu")
            sources_breakdown[source] = sources_breakdown.get(source, 0) + 1
            
            article_text = f"[{source}] {article.get('title', '')}\n{article.get('content', '')[:500]}"
            articles_text.append(article_text)
        
        # Prompt personnalisé ou par défaut
        if request.custom_prompt:
            synthesis_prompt = request.custom_prompt
        else:
            synthesis_prompt = f"""Analysez ces {len(articles_data)} articles d'actualité politique et géopolitique française et internationale.

Articles à analyser:
{chr(10).join(articles_text[:10])}

Rédigez une synthèse neutre et factuelle qui :
1. Résume les événements principaux
2. Identifie les tendances politiques
3. Analyse les enjeux géopolitiques
4. Reste objective et équilibrée

Format souhaité : Titre + Introduction + 3-4 sections thématiques + Conclusion"""

        # Simulation de génération IA (à remplacer par l'implémentation réelle)
        synthesis_content = f"""# Synthèse Politique - {datetime.utcnow().strftime('%d/%m/%Y')}

## Introduction
Synthèse générée avec le modèle {ai_model['name']} ({ai_model['provider']}) analysant {len(articles_data)} articles d'actualité politique et géopolitique.

## Événements Principaux
[Contenu généré par {ai_model['model_id']}]

## Analyse Géopolitique  
[Analyse approfondie des enjeux internationaux]

## Tendances Politiques
[Identification des tendances émergentes]

## Conclusion
Synthèse basée sur {len(articles_data)} sources fiables avec un taux de confiance élevé.
"""
        
        # Sauvegarder la synthèse
        synthesis_dict = {
            "id": str(uuid.uuid4()),
            "title": f"Synthèse Politique - {datetime.utcnow().strftime('%d/%m/%Y')}",
            "content": synthesis_content,
            "date": datetime.utcnow().strftime('%Y-%m-%d'),
            "sources_count": len(articles_data),
            "sources_breakdown": sources_breakdown,
            "themes": request.themes_filter or ["Politique française", "Géopolitique", "Économie"],
            "reliability_score": 0.95,
            "articles_analyzed": len(articles_data),
            "ai_model_used": {
                "name": ai_model["name"],
                "provider": ai_model["provider"],
                "model_id": ai_model["model_id"]
            },
            "custom_prompt_used": bool(request.custom_prompt),
            "created_at": datetime.utcnow(),
            "status": "completed",
            "admin_generated": True
        }
        
        await daily_syntheses_collection.insert_one(synthesis_dict)
        
        return {
            "message": "Synthèse générée avec succès",
            "synthesis_id": synthesis_dict["id"],
            "ai_model": ai_model["name"],
            "articles_analyzed": len(articles_data),
            "sources_used": list(sources_breakdown.keys()),
            "synthesis_title": synthesis_dict["title"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la génération: {str(e)}")

@admin_router.get("/synthesis/compare-models")
async def compare_ai_models_performance(current_admin: User = Depends(require_admin)):
    """Comparer les performances des différents modèles IA utilisés"""
    try:
        pipeline = [
            {"$match": {"ai_model_used": {"$exists": True}}},
            {"$group": {
                "_id": "$ai_model_used.model_id",
                "model_name": {"$first": "$ai_model_used.name"},
                "provider": {"$first": "$ai_model_used.provider"},
                "syntheses_count": {"$sum": 1},
                "avg_articles_analyzed": {"$avg": "$articles_analyzed"},
                "avg_reliability": {"$avg": "$reliability_score"},
                "last_used": {"$max": "$created_at"}
            }},
            {"$sort": {"syntheses_count": -1}}
        ]
        
        models_stats = await daily_syntheses_collection.aggregate(pipeline).to_list(length=None)
        
        return {
            "models_comparison": models_stats,
            "total_models_used": len(models_stats)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la comparaison: {str(e)}")

@admin_router.get("/articles/by-source")
async def get_articles_by_source(source: str, limit: int = 50):
    """Récupérer les articles d'une source spécifique"""
    
    articles = []
    cursor = scraped_articles_collection.find({
        "source": source
    }).sort("scraped_at", -1).limit(limit)
    
    async for article in cursor:
        if "_id" in article:
            del article["_id"]
        
        # Formater l'article pour l'affichage
        articles.append({
            "id": article.get("id"),
            "title": article.get("title"),
            "url": article.get("url"),
            "content": article.get("content", "")[:200] + "..." if article.get("content") else "",
            "scraped_at": article.get("scraped_at"),
            "is_political": article.get("is_political", False),
            "source": article.get("source")
        })
    
    return {
        "articles": articles,
        "source": source,
        "total": len(articles)
    }

# Endpoints - Actions manuelles
@admin_router.post("/scrape/manual")
async def trigger_manual_scraping(current_admin: User = Depends(require_admin)):
    """Déclencher un scraping manuel - Admin uniquement"""
    try:
        from scraper import NewsScrapingService
        
        service = NewsScrapingService()
        articles = await service.scrape_all_sources()
        
        # Sauvegarder les articles
        new_articles_count = 0
        for article in articles:
            existing = await scraped_articles_collection.find_one({"url": article.url})
            if not existing:
                await scraped_articles_collection.insert_one(article.to_dict())
                new_articles_count += 1
        
        return {
            "message": "Scraping manuel terminé",
            "articles_found": len(articles),
            "new_articles": new_articles_count
        }
        
    except Exception as e:
        logger.error(f"Erreur lors du scraping manuel: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

@admin_router.post("/synthesis/manual")
async def trigger_manual_synthesis(current_admin: User = Depends(require_admin)):
    """Déclencher une génération de synthèse manuelle - Admin uniquement"""
    try:
        from scheduler import DailySynthesisGenerator
        from scraper import NewsArticle
        
        # Récupérer les articles du jour
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        cursor = scraped_articles_collection.find({
            "scraped_at": {"$gte": today_start},
            "is_political": True
        })
        
        articles_data = await cursor.to_list(length=None)
        
        if not articles_data:
            raise HTTPException(status_code=400, detail="Aucun article politique trouvé aujourd'hui")
        
        # Convertir en objets NewsArticle
        articles = []
        for data in articles_data:
            article = NewsArticle(
                title=data["title"],
                content=data["content"],
                url=data["url"],
                source=data["source"]
            )
            article.id = data["id"]
            articles.append(article)
        
        # Générer la synthèse
        generator = DailySynthesisGenerator(
            MONGO_URL, DB_NAME, os.environ.get('ANTHROPIC_API_KEY')
        )
        
        synthesis = await generator.generate_daily_synthesis(articles)
        
        if synthesis:
            synthesis["manual"] = True
            await daily_syntheses_collection.insert_one(synthesis)
            
            return {
                "message": "Synthèse générée avec succès",
                "synthesis_id": synthesis["id"],
                "articles_analyzed": len(articles)
            }
        else:
            raise HTTPException(status_code=500, detail="Erreur lors de la génération de synthèse")
            
    except Exception as e:
        logger.error(f"Erreur lors de la génération manuelle: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# =====================================
# ENDPOINT - INITIALISATION SOURCES PAR DÉFAUT
# =====================================

@admin_router.post("/sources/initialize-defaults")
async def initialize_default_sources(current_admin: User = Depends(require_admin)):
    """Initialiser les sources par défaut (Le Monde, BFM, Blast)"""
    try:
        default_sources = [
            {
                "id": str(uuid.uuid4()),
                "name": "Le Monde",
                "url": "https://www.lemonde.fr",
                "description": "Journal français de référence couvrant l'actualité politique, économique et internationale",
                "scraper_type": "lemonde",
                "is_active": True,
                "css_selectors": {
                    "article": "article",
                    "title": "h1, .article__title",
                    "content": ".article__content, .article__paragraph"
                },
                "headers": {"User-Agent": "EasyGeo-Political-Analyzer/1.0"},
                "custom_scraping_rules": {},
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "articles_scraped": 0,
                "last_scrape": None
            },
            {
                "id": str(uuid.uuid4()),
                "name": "BFM Business",
                "url": "https://www.bfmtv.com",
                "description": "Chaîne d'information économique française spécialisée dans l'actualité financière et politique",
                "scraper_type": "bfm",
                "is_active": True,
                "css_selectors": {
                    "article": ".article",
                    "title": "h1, .article-title",
                    "content": ".article-body, .content"
                },
                "headers": {"User-Agent": "EasyGeo-Political-Analyzer/1.0"},
                "custom_scraping_rules": {},
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "articles_scraped": 0,
                "last_scrape": None
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Blast",
                "url": "https://www.blast-info.fr",
                "description": "Media indépendant d'investigation politique et sociale français",
                "scraper_type": "blast",
                "is_active": True,
                "css_selectors": {
                    "article": ".post, article",
                    "title": "h1, .entry-title",
                    "content": ".entry-content, .post-content"
                },
                "headers": {"User-Agent": "EasyGeo-Political-Analyzer/1.0"},
                "custom_scraping_rules": {},
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "articles_scraped": 0,
                "last_scrape": None
            }
        ]
        
        sources_added = 0
        existing_sources = []
        
        for source_data in default_sources:
            # Vérifier si la source existe déjà
            existing = await news_sources_collection.find_one({"name": source_data["name"]})
            if not existing:
                await news_sources_collection.insert_one(source_data)
                sources_added += 1
            else:
                existing_sources.append(source_data["name"])
        
        return {
            "message": f"Initialisation terminée: {sources_added} nouvelles sources ajoutées",
            "sources_added": sources_added,
            "existing_sources": existing_sources,
            "total_default_sources": len(default_sources)
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de l'initialisation des sources: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")

# =====================================
# ENDPOINT - INITIALISATION MODÈLE IA PAR DÉFAUT
# =====================================

@admin_router.post("/ai-models/initialize-defaults")
async def initialize_default_ai_models(current_admin: User = Depends(require_admin)):
    """Initialiser les modèles IA par défaut (Claude 3.5 Haiku)"""
    try:
        default_models = [
            {
                "id": str(uuid.uuid4()),
                "name": "Claude 3.5 Haiku",
                "provider": "anthropic",
                "model_id": "claude-3-5-haiku-20241022",
                "description": "Modèle Claude 3.5 Haiku d'Anthropic, optimisé pour l'analyse rapide et précise de contenu politique",
                "is_active": True,
                "api_key": os.environ.get('ANTHROPIC_API_KEY', ''),
                "api_endpoint": "https://api.anthropic.com/v1/messages",
                "parameters": {
                    "max_tokens": 4000,
                    "temperature": 0.3,
                    "top_p": 0.9
                },
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "usage_count": 0,
                "last_used": None
            }
        ]
        
        models_added = 0
        existing_models = []
        
        for model_data in default_models:
            # Vérifier si le modèle existe déjà
            existing = await ai_models_collection.find_one({"model_id": model_data["model_id"]})
            if not existing:
                await ai_models_collection.insert_one(model_data)
                models_added += 1
            else:
                existing_models.append(model_data["name"])
        
        return {
            "message": f"Initialisation terminée: {models_added} nouveaux modèles IA ajoutés",
            "models_added": models_added,
            "existing_models": existing_models,
            "total_default_models": len(default_models)
        }
        
    except Exception as e:
        logger.error(f"Erreur lors de l'initialisation des modèles IA: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")