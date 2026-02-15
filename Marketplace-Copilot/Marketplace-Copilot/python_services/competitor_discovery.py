"""
Competitor Discovery Module
Automatically discovers and maps competitors for products using marketplace search and similarity matching.
"""

import re
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
from bs4 import BeautifulSoup
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import time
import random

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Product:
    sku: str
    product_name: str
    brand: str
    category: str
    selling_price: float

@dataclass
class CompetitorProduct:
    asin: str
    title: str
    price: float
    rating: Optional[float]
    link: str
    brand: Optional[str]
    similarity_score: float

class CompetitorDiscovery:
    """Discovers and maps competitors for products"""
    
    # Words to remove from search queries
    FILLER_WORDS = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'should', 'could', 'may', 'might', 'must', 'can'
    }
    
    COLOR_WORDS = {
        'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
        'pink', 'brown', 'gray', 'grey', 'silver', 'gold', 'beige', 'navy',
        'maroon', 'cyan', 'magenta', 'lime', 'olive', 'teal', 'aqua'
    }
    
    def __init__(self, db_config: Dict[str, str]):
        self.db_config = db_config
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def get_db_connection(self):
        """Create database connection"""
        return psycopg2.connect(**self.db_config)
    
    def fetch_product(self, sku: str) -> Optional[Product]:
        """Fetch product data from database"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT sku, product_name, brand, category, selling_price
                        FROM products
                        WHERE sku = %s
                    """, (sku,))
                    row = cur.fetchone()
                    if row:
                        return Product(**row)
            return None
        except Exception as e:
            logger.error(f"Error fetching product {sku}: {e}")
            return None
    
    def clean_title_for_search(self, title: str, brand: str = None) -> str:
        """Clean product title to generate effective search query"""
        # Convert to lowercase
        title = title.lower()
        
        # Remove special characters but keep spaces
        title = re.sub(r'[^\w\s]', ' ', title)
        
        # Split into words
        words = title.split()
        
        # Filter out filler and color words
        filtered_words = [
            word for word in words
            if word not in self.FILLER_WORDS and word not in self.COLOR_WORDS
        ]
        
        # Keep brand at the beginning if provided
        if brand and brand.lower() not in filtered_words:
            filtered_words.insert(0, brand.lower())
        
        # Take first 6-8 most relevant words
        query = ' '.join(filtered_words[:8])
        
        logger.info(f"Cleaned search query: {query}")
        return query
    
    def scrape_amazon_search(self, query: str, max_results: int = 20) -> List[Dict]:
        """Scrape Amazon search results"""
        results = []
        
        try:
            # Add rate limiting
            time.sleep(random.uniform(1, 3))
            
            url = f"https://www.amazon.in/s?k={query.replace(' ', '+')}"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find product cards
            products = soup.find_all('div', {'data-component-type': 's-search-result'})
            
            for product in products[:max_results]:
                try:
                    # Extract ASIN
                    asin = product.get('data-asin')
                    if not asin:
                        continue
                    
                    # Extract title
                    title_elem = product.find('h2', class_='s-line-clamp-2')
                    title = title_elem.get_text(strip=True) if title_elem else None
                    
                    # Extract price
                    price_elem = product.find('span', class_='a-price-whole')
                    price = None
                    if price_elem:
                        price_text = price_elem.get_text(strip=True).replace(',', '').replace('₹', '')
                        try:
                            price = float(price_text)
                        except ValueError:
                            pass
                    
                    # Extract rating
                    rating_elem = product.find('span', class_='a-icon-alt')
                    rating = None
                    if rating_elem:
                        rating_text = rating_elem.get_text(strip=True)
                        match = re.search(r'(\d+\.?\d*)', rating_text)
                        if match:
                            rating = float(match.group(1))
                    
                    # Build product link
                    link = f"https://www.amazon.in/dp/{asin}"
                    
                    if title and price:
                        results.append({
                            'asin': asin,
                            'title': title,
                            'price': price,
                            'rating': rating,
                            'link': link
                        })
                
                except Exception as e:
                    logger.warning(f"Error parsing product: {e}")
                    continue
            
            logger.info(f"Scraped {len(results)} products from Amazon")
            
        except Exception as e:
            logger.error(f"Error scraping Amazon: {e}")
        
        return results
    
    def calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate TF-IDF cosine similarity between two texts"""
        try:
            vectorizer = TfidfVectorizer(lowercase=True, stop_words='english')
            tfidf_matrix = vectorizer.fit_transform([text1, text2])
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            return float(similarity)
        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return 0.0
    
    def filter_and_rank_competitors(
        self,
        product: Product,
        scraped_products: List[Dict],
        min_similarity: float = 0.70,
        price_range: tuple = (0.70, 1.30)
    ) -> List[CompetitorProduct]:
        """Filter and rank competitors based on similarity and price"""
        
        competitors = []
        
        for scraped in scraped_products:
            # Calculate similarity
            similarity = self.calculate_similarity(
                product.product_name,
                scraped['title']
            )
            
            # Filter by similarity threshold
            if similarity < min_similarity:
                continue
            
            # Filter by price range
            price_ratio = scraped['price'] / product.selling_price
            if not (price_range[0] <= price_ratio <= price_range[1]):
                continue
            
            # Extract brand from title (simple heuristic)
            brand = scraped['title'].split()[0] if scraped['title'] else None
            
            competitor = CompetitorProduct(
                asin=scraped['asin'],
                title=scraped['title'],
                price=scraped['price'],
                rating=scraped.get('rating'),
                link=scraped['link'],
                brand=brand,
                similarity_score=similarity
            )
            
            competitors.append(competitor)
        
        # Rank by similarity score and price closeness
        competitors.sort(
            key=lambda x: (
                x.similarity_score,
                -abs(x.price - product.selling_price)
            ),
            reverse=True
        )
        
        logger.info(f"Filtered to {len(competitors)} competitors")
        return competitors
    
    def store_competitors(self, sku: str, competitors: List[CompetitorProduct], top_n: int = 5):
        """Store top N competitors in database"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    # Deactivate existing competitors
                    cur.execute("""
                        UPDATE competitor_mapping
                        SET is_active = FALSE
                        WHERE sku = %s
                    """, (sku,))
                    
                    # Insert new competitors
                    for rank, competitor in enumerate(competitors[:top_n], 1):
                        cur.execute("""
                            INSERT INTO competitor_mapping (
                                sku, competitor_asin, competitor_title, competitor_brand,
                                similarity_score, initial_price, rank_position
                            )
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (sku, competitor_asin, marketplace)
                            DO UPDATE SET
                                is_active = TRUE,
                                similarity_score = EXCLUDED.similarity_score,
                                last_updated = CURRENT_TIMESTAMP,
                                rank_position = EXCLUDED.rank_position
                        """, (
                            sku,
                            competitor.asin,
                            competitor.title,
                            competitor.brand,
                            competitor.similarity_score,
                            competitor.price,
                            rank
                        ))
                    
                    conn.commit()
                    logger.info(f"Stored {min(len(competitors), top_n)} competitors for SKU {sku}")
        
        except Exception as e:
            logger.error(f"Error storing competitors: {e}")
            raise
    
    def discover_competitors(self, sku: str) -> bool:
        """Main function to discover competitors for a SKU"""
        try:
            # Fetch product
            product = self.fetch_product(sku)
            if not product:
                logger.error(f"Product {sku} not found")
                return False
            
            # Clean title for search
            search_query = self.clean_title_for_search(
                product.product_name,
                product.brand
            )
            
            # Scrape marketplace
            scraped_products = self.scrape_amazon_search(search_query)
            if not scraped_products:
                logger.warning(f"No products found for {sku}")
                return False
            
            # Filter and rank
            competitors = self.filter_and_rank_competitors(product, scraped_products)
            if not competitors:
                logger.warning(f"No valid competitors found for {sku}")
                return False
            
            # Store in database
            self.store_competitors(sku, competitors)
            
            return True
        
        except Exception as e:
            logger.error(f"Error discovering competitors for {sku}: {e}")
            return False


# CLI usage
if __name__ == "__main__":
    import sys
    
    db_config = {
        'host': 'localhost',
        'database': 'marketplace_copilot',
        'user': 'postgres',
        'password': 'postgres',
        'port': 5432
    }
    
    discovery = CompetitorDiscovery(db_config)
    
    if len(sys.argv) > 1:
        sku = sys.argv[1]
        success = discovery.discover_competitors(sku)
        print(f"Discovery {'successful' if success else 'failed'} for SKU: {sku}")
    else:
        print("Usage: python competitor_discovery.py <SKU>")
