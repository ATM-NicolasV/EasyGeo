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

# Router
admin_router = APIRouter(prefix="/api/admin", tags=["Administration"])

# Models
class NewsSource(BaseModel):
    name: str
    url: str
    description: Optional[str] = None
    scraper_type: str  # "lemonde", "bfm", "blast", "generic"
    is_active: bool = True
    css_selectors: Optional[Dict[str, str]] = None
    
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
async def trigger_manual_scraping():
    """Déclencher un scraping manuel"""
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
async def trigger_manual_synthesis():
    """Déclencher une génération de synthèse manuelle"""
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