import asyncio
import aiohttp
from bs4 import BeautifulSoup
import html2text
from datetime import datetime, timedelta
import re
from typing import List, Dict, Optional
import logging
from urllib.parse import urljoin, urlparse
import uuid

logger = logging.getLogger(__name__)

class NewsArticle:
    def __init__(self, title: str, content: str, url: str, source: str, published_at: Optional[datetime] = None):
        self.id = str(uuid.uuid4())
        self.title = title
        self.content = content
        self.url = url
        self.source = source
        self.published_at = published_at or datetime.now()
        self.scraped_at = datetime.now()
        self.category = None
        self.is_political = False

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "url": self.url,
            "source": self.source,
            "published_at": self.published_at,
            "scraped_at": self.scraped_at,
            "category": self.category,
            "is_political": self.is_political
        }

class PoliticalFilter:
    """Filtre pour identifier les articles politiques/géopolitiques/complotisme"""
    
    POLITICAL_KEYWORDS = [
        # Politique française
        "politique", "élection", "gouvernement", "ministre", "président", "assemblée",
        "sénat", "député", "parti", "macron", "le pen", "mélenchon", "bardella",
        "renaissance", "rn", "lfi", "lr", "ps", "écologistes",
        
        # Géopolitique
        "géopolitique", "international", "ukraine", "russie", "chine", "usa", "états-unis",
        "otan", "ue", "union européenne", "brexit", "trump", "biden", "poutine",
        "moyen-orient", "israël", "palestine", "iran", "syrie", "afghanistan",
        "corée", "taiwan", "japon", "afrique", "sahel", "mali", "burkina",
        
        # Économie politique
        "inflation", "récession", "crise économique", "dette", "budget", "impôts",
        "croissance", "chômage", "retraites", "smic", "pouvoir d'achat",
        
        # Complotisme et sujets sensibles
        "complot", "théorie", "fake news", "désinformation", "manipulation",
        "deep state", "illuminati", "franc-maçon", "nouvel ordre mondial",
        "vaccination", "covid", "pandémie", "pass sanitaire", "liberté",
        
        # Actualités chaudes
        "manifestation", "grève", "protestation", "émeutes", "violence",
        "terrorisme", "sécurité", "immigration", "migrants", "frontière"
    ]
    
    @classmethod
    def is_political(cls, title: str, content: str) -> bool:
        """Détermine si un article est politique/géopolitique"""
        text = f"{title} {content}".lower()
        
        # Compter les mots-clés trouvés
        keyword_count = 0
        for keyword in cls.POLITICAL_KEYWORDS:
            if keyword in text:
                keyword_count += 1
        
        # Seuil : au moins 2 mots-clés politiques trouvés
        return keyword_count >= 2

class BaseScraper:
    """Classe de base pour tous les scrapers"""
    
    def __init__(self, source_name: str, base_url: str):
        self.source_name = source_name
        self.base_url = base_url
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def fetch_page(self, url: str) -> Optional[str]:
        """Récupère le contenu HTML d'une page"""
        try:
            async with self.session.get(url) as response:
                if response.status == 200:
                    return await response.text()
        except Exception as e:
            logger.error(f"Erreur lors du fetch de {url}: {e}")
        return None
    
    def clean_text(self, html_content: str) -> str:
        """Nettoie et convertit le HTML en texte"""
        h = html2text.HTML2Text()
        h.ignore_links = True
        h.ignore_images = True
        text = h.handle(html_content)
        return re.sub(r'\n+', '\n', text).strip()
    
    async def scrape_articles(self) -> List[NewsArticle]:
        """Méthode à implémenter par chaque scraper"""
        raise NotImplementedError

class LeMondeScraper(BaseScraper):
    """Scraper pour Le Monde"""
    
    def __init__(self):
        super().__init__("Le Monde", "https://www.lemonde.fr")
    
    async def scrape_articles(self) -> List[NewsArticle]:
        articles = []
        
        # Pages à scraper
        pages_to_scrape = [
            "/politique/",
            "/international/",
            "/economie/",
            "/idees/"
        ]
        
        for page_path in pages_to_scrape:
            url = f"{self.base_url}{page_path}"
            html = await self.fetch_page(url)
            
            if not html:
                continue
                
            soup = BeautifulSoup(html, 'html.parser')
            
            # Sélecteurs pour les articles Le Monde
            article_links = soup.find_all('a', class_=['article', 'teaser__link'])
            
            for link in article_links[:5]:  # Limite à 5 articles par section
                article_url = link.get('href')
                if not article_url:
                    continue
                    
                if article_url.startswith('/'):
                    article_url = urljoin(self.base_url, article_url)
                
                article = await self._scrape_article(article_url)
                if article:
                    articles.append(article)
        
        return articles
    
    async def _scrape_article(self, url: str) -> Optional[NewsArticle]:
        """Scrape un article spécifique"""
        html = await self.fetch_page(url)
        if not html:
            return None
            
        soup = BeautifulSoup(html, 'html.parser')
        
        try:
            # Titre
            title_elem = soup.find('h1') or soup.find('title')
            title = title_elem.get_text().strip() if title_elem else "Titre non trouvé"
            
            # Contenu
            content_elems = soup.find_all(['p', 'div'], class_=['article__paragraph', 'article__content'])
            content = ' '.join([elem.get_text().strip() for elem in content_elems])
            
            if not content:
                # Fallback : prendre tous les paragraphes
                content = ' '.join([p.get_text().strip() for p in soup.find_all('p')])
            
            # Limiter la taille du contenu
            content = content[:3000]
            
            if len(content) < 100:  # Article trop court
                return None
            
            article = NewsArticle(title, content, url, self.source_name)
            article.is_political = PoliticalFilter.is_political(title, content)
            
            return article if article.is_political else None
            
        except Exception as e:
            logger.error(f"Erreur lors du scraping de l'article {url}: {e}")
            return None

class BFMBusinessScraper(BaseScraper):
    """Scraper pour BFM Business"""
    
    def __init__(self):
        super().__init__("BFM Business", "https://www.bfmtv.com")
    
    async def scrape_articles(self) -> List[NewsArticle]:
        articles = []
        
        # Pages à scraper
        pages_to_scrape = [
            "/politique/",
            "/international/",
            "/economie/"
        ]
        
        for page_path in pages_to_scrape:
            url = f"{self.base_url}{page_path}"
            html = await self.fetch_page(url)
            
            if not html:
                continue
                
            soup = BeautifulSoup(html, 'html.parser')
            
            # Sélecteurs pour les articles BFM
            article_links = soup.find_all('a', href=True)
            
            # Filtrer les liens d'articles
            article_urls = []
            for link in article_links:
                href = link.get('href')
                if href and ('/politique/' in href or '/international/' in href or '/economie/' in href):
                    if href.startswith('/'):
                        href = urljoin(self.base_url, href)
                    article_urls.append(href)
            
            # Supprimer les doublons et limiter
            article_urls = list(set(article_urls))[:10]
            
            for article_url in article_urls:
                article = await self._scrape_article(article_url)
                if article:
                    articles.append(article)
        
        return articles
    
    async def _scrape_article(self, url: str) -> Optional[NewsArticle]:
        """Scrape un article spécifique"""
        html = await self.fetch_page(url)
        if not html:
            return None
            
        soup = BeautifulSoup(html, 'html.parser')
        
        try:
            # Titre
            title_elem = soup.find('h1') or soup.find('title')
            title = title_elem.get_text().strip() if title_elem else "Titre non trouvé"
            
            # Contenu
            content_elems = soup.find_all(['p', 'div'], class_=['content', 'article-content'])
            content = ' '.join([elem.get_text().strip() for elem in content_elems])
            
            if not content:
                # Fallback : prendre tous les paragraphes
                content = ' '.join([p.get_text().strip() for p in soup.find_all('p')])
            
            # Limiter la taille du contenu
            content = content[:3000]
            
            if len(content) < 100:  # Article trop court
                return None
            
            article = NewsArticle(title, content, url, self.source_name)
            article.is_political = PoliticalFilter.is_political(title, content)
            
            return article if article.is_political else None
            
        except Exception as e:
            logger.error(f"Erreur lors du scraping de l'article {url}: {e}")
            return None

class BlastScraper(BaseScraper):
    """Scraper pour Blast"""
    
    def __init__(self):
        super().__init__("Blast", "https://www.blast-info.fr")
    
    async def scrape_articles(self) -> List[NewsArticle]:
        articles = []
        
        # Page principale
        html = await self.fetch_page(self.base_url)
        if not html:
            return articles
            
        soup = BeautifulSoup(html, 'html.parser')
        
        # Sélecteurs pour les articles Blast
        article_links = soup.find_all('a', href=True)
        
        # Filtrer les liens d'articles
        article_urls = []
        for link in article_links:
            href = link.get('href')
            if href and ('article' in href or 'news' in href):
                if href.startswith('/'):
                    href = urljoin(self.base_url, href)
                article_urls.append(href)
        
        # Supprimer les doublons et limiter
        article_urls = list(set(article_urls))[:15]
        
        for article_url in article_urls:
            article = await self._scrape_article(article_url)
            if article:
                articles.append(article)
        
        return articles
    
    async def _scrape_article(self, url: str) -> Optional[NewsArticle]:
        """Scrape un article spécifique"""
        html = await self.fetch_page(url)
        if not html:
            return None
            
        soup = BeautifulSoup(html, 'html.parser')
        
        try:
            # Titre
            title_elem = soup.find('h1') or soup.find('title')
            title = title_elem.get_text().strip() if title_elem else "Titre non trouvé"
            
            # Contenu
            content_elems = soup.find_all(['p', 'div'])
            content = ' '.join([elem.get_text().strip() for elem in content_elems])
            
            # Limiter la taille du contenu
            content = content[:3000]
            
            if len(content) < 100:  # Article trop court
                return None
            
            article = NewsArticle(title, content, url, self.source_name)
            article.is_political = PoliticalFilter.is_political(title, content)
            
            return article if article.is_political else None
            
        except Exception as e:
            logger.error(f"Erreur lors du scraping de l'article {url}: {e}")
            return None

class NewsScrapingService:
    """Service principal de scraping des actualités"""
    
    def __init__(self):
        self.scrapers = [
            LeMondeScraper(),
            BFMBusinessScraper(),
            BlastScraper()
        ]
    
    async def scrape_all_sources(self) -> List[NewsArticle]:
        """Scrape tous les sources configurées"""
        all_articles = []
        
        for scraper in self.scrapers:
            try:
                logger.info(f"Scraping {scraper.source_name}...")
                async with scraper:
                    articles = await scraper.scrape_articles()
                    logger.info(f"{scraper.source_name}: {len(articles)} articles politiques trouvés")
                    all_articles.extend(articles)
            except Exception as e:
                logger.error(f"Erreur lors du scraping de {scraper.source_name}: {e}")
        
        # Déduplication par URL
        seen_urls = set()
        unique_articles = []
        for article in all_articles:
            if article.url not in seen_urls:
                seen_urls.add(article.url)
                unique_articles.append(article)
        
        logger.info(f"Total: {len(unique_articles)} articles uniques récupérés")
        return unique_articles

# Fonction utilitaire pour tester le scraping
async def test_scraping():
    """Fonction de test du scraping"""
    service = NewsScrapingService()
    articles = await service.scrape_all_sources()
    
    print(f"\n=== RÉSULTATS DU SCRAPING ===")
    print(f"Total articles: {len(articles)}")
    
    for article in articles[:5]:  # Afficher les 5 premiers
        print(f"\n--- {article.source} ---")
        print(f"Titre: {article.title}")
        print(f"URL: {article.url}")
        print(f"Contenu: {article.content[:200]}...")
        print(f"Politique: {article.is_political}")

if __name__ == "__main__":
    # Test du scraping
    asyncio.run(test_scraping())