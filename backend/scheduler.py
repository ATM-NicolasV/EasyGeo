import asyncio
import schedule
import time
from datetime import datetime, timedelta
import logging
from typing import List
from scraper import NewsScrapingService, NewsArticle
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
import uuid
import json

logger = logging.getLogger(__name__)

class DailySynthesisGenerator:
    """Générateur de synthèses quotidiennes"""
    
    def __init__(self, mongo_url: str, db_name: str, anthropic_api_key: str):
        self.client = AsyncIOMotorClient(mongo_url)
        self.db = self.client[db_name]
        self.articles_collection = self.db.scraped_articles
        self.syntheses_collection = self.db.daily_syntheses
        self.anthropic_api_key = anthropic_api_key
        
    async def generate_daily_synthesis(self, articles: List[NewsArticle]) -> dict:
        """Génère une synthèse quotidienne à partir des articles"""
        
        if not articles:
            return None
            
        # Grouper les articles par thème/sujet
        themes = self._extract_themes(articles)
        
        # Préparer le prompt pour Claude
        synthesis_prompt = self._build_synthesis_prompt(articles, themes)
        
        # Générer la synthèse avec Claude
        try:
            chat = LlmChat(
                api_key=self.anthropic_api_key,
                session_id=str(uuid.uuid4()),
                system_message="Tu es un expert journaliste spécialisé dans l'analyse politique et géopolitique. Tu crées des synthèses quotidiennes neutres et factuelles à partir d'articles de presse."
            ).with_model("anthropic", "claude-3-5-haiku-20241022").with_max_tokens(4000)
            
            user_message = UserMessage(text=synthesis_prompt)
            synthesis_text = await chat.send_message(user_message)
            
            # Calculer le score de fiabilité
            reliability_score = self._calculate_reliability_score(articles)
            
            # Créer l'objet synthèse
            synthesis = {
                "id": str(uuid.uuid4()),
                "date": datetime.now().strftime("%Y-%m-%d"),
                "title": f"Synthèse politique du {datetime.now().strftime('%d/%m/%Y')}",
                "content": synthesis_text,
                "sources_count": len(articles),
                "sources_breakdown": self._get_sources_breakdown(articles),
                "themes": themes,
                "reliability_score": reliability_score,
                "articles_analyzed": [article.id for article in articles],
                "created_at": datetime.now(),
                "status": "published"
            }
            
            return synthesis
            
        except Exception as e:
            logger.error(f"Erreur lors de la génération de synthèse: {e}")
            return None
    
    def _extract_themes(self, articles: List[NewsArticle]) -> List[str]:
        """Extrait les thèmes principaux des articles"""
        
        # Mots-clés pour identifier les thèmes
        theme_keywords = {
            "Politique française": ["macron", "gouvernement", "assemblée", "sénat", "ministre", "parti"],
            "Géopolitique": ["ukraine", "russie", "chine", "usa", "otan", "international"],
            "Économie": ["inflation", "croissance", "budget", "dette", "économie", "entreprise"],
            "Social": ["retraites", "chômage", "manifestation", "grève", "social"],
            "Sécurité": ["terrorisme", "sécurité", "police", "violence", "criminalité"],
            "Immigration": ["immigration", "migrants", "frontière", "asile", "réfugiés"],
            "Environnement": ["climat", "environnement", "écologie", "énergie", "transition"],
            "Santé": ["santé", "hôpital", "médecin", "pandémie", "vaccin"]
        }
        
        themes_found = []
        all_text = " ".join([f"{article.title} {article.content}" for article in articles]).lower()
        
        for theme, keywords in theme_keywords.items():
            keyword_count = sum(1 for keyword in keywords if keyword in all_text)
            if keyword_count >= 2:  # Seuil pour considérer un thème
                themes_found.append(theme)
        
        return themes_found[:5]  # Limiter à 5 thèmes max
    
    def _build_synthesis_prompt(self, articles: List[NewsArticle], themes: List[str]) -> str:
        """Construit le prompt pour la génération de synthèse"""
        
        articles_summary = []
        for article in articles:
            articles_summary.append(f"• {article.source}: {article.title}\n  {article.content[:300]}...")
        
        prompt = f"""
MISSION: Créer une synthèse quotidienne neutre et factuelle des actualités politiques et géopolitiques.

DATE: {datetime.now().strftime('%d/%m/%Y')}

ARTICLES ANALYSÉS ({len(articles)} sources):
{chr(10).join(articles_summary)}

THÈMES IDENTIFIÉS: {', '.join(themes)}

CONSIGNES POUR LA SYNTHÈSE:

1. **Structure claire**:
   - Titre attractif
   - Introduction (contexte du jour)
   - 3-5 sections thématiques
   - Conclusion synthétique

2. **Ton neutre et factuel**:
   - Éviter tout jugement ou opinion
   - Présenter les faits vérifiés
   - Mentionner les sources (Le Monde, BFM, Blast)
   - Signaler les contradictions éventuelles

3. **Longueur**: 800-1200 mots maximum

4. **Focus sur**:
   - Les faits marquants du jour
   - Les déclarations officielles
   - Les chiffres et données factuelles
   - Les implications potentielles

5. **Éviter**:
   - Les spéculations
   - Le sensationnalisme
   - Les termes chargés émotionnellement
   - La prise de parti

Créé maintenant cette synthèse quotidienne professionnelle.
"""
        return prompt
    
    def _calculate_reliability_score(self, articles: List[NewsArticle]) -> float:
        """Calcule un score de fiabilité basé sur les sources"""
        
        # Pondération des sources
        source_weights = {
            "Le Monde": 0.9,
            "BFM Business": 0.8,
            "Blast": 0.7
        }
        
        total_weight = 0
        source_count = 0
        
        sources_seen = set()
        for article in articles:
            if article.source not in sources_seen:
                sources_seen.add(article.source)
                weight = source_weights.get(article.source, 0.6)
                total_weight += weight
                source_count += 1
        
        # Score basé sur diversité des sources et leur fiabilité
        diversity_bonus = min(source_count * 0.1, 0.3)  # Bonus pour diversité
        base_score = total_weight / max(source_count, 1)
        
        final_score = min(base_score + diversity_bonus, 1.0)
        return round(final_score, 2)
    
    def _get_sources_breakdown(self, articles: List[NewsArticle]) -> dict:
        """Retourne la répartition des sources"""
        breakdown = {}
        for article in articles:
            breakdown[article.source] = breakdown.get(article.source, 0) + 1
        return breakdown

class NewsScheduler:
    """Planificateur pour le scraping automatique"""
    
    def __init__(self):
        self.mongo_url = os.environ.get('MONGO_URL')
        self.db_name = os.environ.get('DB_NAME', 'political_analyzer')
        self.anthropic_api_key = os.environ.get('ANTHROPIC_API_KEY')
        
        self.scraping_service = NewsScrapingService()
        self.synthesis_generator = DailySynthesisGenerator(
            self.mongo_url, self.db_name, self.anthropic_api_key
        )
        
        # Base de données
        self.client = AsyncIOMotorClient(self.mongo_url)
        self.db = self.client[self.db_name]
        self.articles_collection = self.db.scraped_articles
        self.syntheses_collection = self.db.daily_syntheses
        
    async def hourly_scraping_job(self):
        """Tâche de scraping à exécuter toutes les heures"""
        try:
            logger.info("=== DÉBUT DU SCRAPING AUTOMATIQUE ===")
            
            # Scraper les articles
            articles = await self.scraping_service.scrape_all_sources()
            
            if not articles:
                logger.warning("Aucun article récupéré")
                return
            
            # Sauvegarder les nouveaux articles
            new_articles_count = 0
            for article in articles:
                # Vérifier si l'article existe déjà
                existing = await self.articles_collection.find_one({"url": article.url})
                if not existing:
                    await self.articles_collection.insert_one(article.to_dict())
                    new_articles_count += 1
            
            logger.info(f"Sauvegardé: {new_articles_count} nouveaux articles")
            
            # Générer une synthèse quotidienne si c'est le bon moment
            await self._check_and_generate_daily_synthesis()
            
        except Exception as e:
            logger.error(f"Erreur lors du scraping automatique: {e}")
    
    async def _check_and_generate_daily_synthesis(self):
        """Vérifie s'il faut générer une synthèse quotidienne"""
        current_hour = datetime.now().hour
        current_date = datetime.now().strftime("%Y-%m-%d")
        
        # Générer une synthèse à 9h, 15h et 20h
        synthesis_hours = [9, 15, 20]
        
        if current_hour in synthesis_hours:
            # Vérifier si une synthèse existe déjà pour cette date et cette heure
            existing_synthesis = await self.syntheses_collection.find_one({
                "date": current_date,
                "hour": current_hour
            })
            
            if not existing_synthesis:
                await self._generate_daily_synthesis(current_hour)
    
    async def _generate_daily_synthesis(self, hour: int):
        """Génère une synthèse quotidienne"""
        try:
            logger.info(f"=== GÉNÉRATION SYNTHÈSE QUOTIDIENNE ({hour}h) ===")
            
            # Récupérer les articles du jour
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)
            
            cursor = self.articles_collection.find({
                "scraped_at": {"$gte": today_start, "$lt": today_end},
                "is_political": True
            })
            
            articles_data = await cursor.to_list(length=None)
            
            if not articles_data:
                logger.warning("Aucun article politique trouvé pour la synthèse")
                return
            
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
            synthesis = await self.synthesis_generator.generate_daily_synthesis(articles)
            
            if synthesis:
                synthesis["hour"] = hour  # Ajouter l'heure pour éviter les doublons
                await self.syntheses_collection.insert_one(synthesis)
                logger.info(f"Synthèse quotidienne générée avec succès ({len(articles)} articles)")
            else:
                logger.error("Erreur lors de la génération de synthèse")
                
        except Exception as e:
            logger.error(f"Erreur lors de la génération de synthèse: {e}")
    
    def start_scheduler(self):
        """Démarre le planificateur"""
        logger.info("=== DÉMARRAGE DU PLANIFICATEUR ===")
        
        # Programmer le scraping toutes les heures
        schedule.every().hour.do(lambda: asyncio.create_task(self.hourly_scraping_job()))
        
        # Exécution immédiate pour test
        schedule.run_all()
        
        # Boucle principale
        while True:
            schedule.run_pending()
            time.sleep(60)  # Vérifier toutes les minutes

def run_scheduler():
    """Point d'entrée pour démarrer le planificateur"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    scheduler = NewsScheduler()
    scheduler.start_scheduler()

if __name__ == "__main__":
    run_scheduler()