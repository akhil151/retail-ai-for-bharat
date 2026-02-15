"""
Price Tracker Module
Tracks competitor prices periodically and stores historical data.
"""

import logging
from typing import List, Dict, Optional
from dataclasses import dataclass
import psycopg2
from psycopg2.extras import RealDictCursor
import requests
from bs4 import BeautifulSoup
import time
import random
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class CompetitorMapping:
    id: int
    sku: str
    competitor_asin: str
    competitor_title: str

@dataclass
class PriceData:
    price: float
    availability: str
    seller_rating: Optional[float]
    seller_name: Optional[str]
    shipping_cost: float

class PriceTracker:
    """Tracks competitor prices and stores historical data"""
    
    def __init__(self, db_config: Dict[str, str]):
        self.db_config = db_config
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        })
    
    def get_db_connection(self):
        """Create database connection"""
        return psycopg2.connect(**self.db_config)
    
    def fetch_active_competitors(self, sku: Optional[str] = None) -> List[CompetitorMapping]:
        """Fetch active competitor mappings from database"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    if sku:
                        cur.execute("""
                            SELECT id, sku, competitor_asin, competitor_title
                            FROM competitor_mapping
                            WHERE sku = %s AND is_active = TRUE
                        """, (sku,))
                    else:
                        cur.execute("""
                            SELECT id, sku, competitor_asin, competitor_title
                            FROM competitor_mapping
                            WHERE is_active = TRUE
                        """)
                    
                    rows = cur.fetchall()
                    return [CompetitorMapping(**row) for row in rows]
        
        except Exception as e:
            logger.error(f"Error fetching competitors: {e}")
            return []
    
    def scrape_amazon_product(self, asin: str) -> Optional[PriceData]:
        """Scrape product page for current price and availability"""
        try:
            # Rate limiting
            time.sleep(random.uniform(2, 4))
            
            url = f"https://www.amazon.in/dp/{asin}"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract price
            price = None
            price_selectors = [
                ('span', {'class': 'a-price-whole'}),
                ('span', {'id': 'priceblock_ourprice'}),
                ('span', {'id': 'priceblock_dealprice'}),
            ]
            
            for tag, attrs in price_selectors:
                price_elem = soup.find(tag, attrs)
                if price_elem:
                    price_text = price_elem.get_text(strip=True).replace(',', '').replace('₹', '')
                    try:
                        price = float(price_text)
                        break
                    except ValueError:
                        continue
            
            if not price:
                logger.warning(f"Could not extract price for ASIN {asin}")
                return None
            
            # Extract availability
            availability = 'in_stock'
            availability_elem = soup.find('div', {'id': 'availability'})
            if availability_elem:
                avail_text = availability_elem.get_text(strip=True).lower()
                if 'out of stock' in avail_text or 'unavailable' in avail_text:
                    availability = 'out_of_stock'
                elif 'temporarily' in avail_text:
                    availability = 'temporarily_unavailable'
            
            # Extract seller rating
            seller_rating = None
            rating_elem = soup.find('span', {'class': 'a-icon-alt'})
            if rating_elem:
                rating_text = rating_elem.get_text(strip=True)
                match = re.search(r'(\d+\.?\d*)', rating_text)
                if match:
                    seller_rating = float(match.group(1))
            
            # Extract seller name
            seller_name = None
            seller_elem = soup.find('a', {'id': 'sellerProfileTriggerId'})
            if seller_elem:
                seller_name = seller_elem.get_text(strip=True)
            
            # Extract shipping cost (simplified)
            shipping_cost = 0.0
            shipping_elem = soup.find('span', {'data-a-color': 'secondary'})
            if shipping_elem and 'delivery' in shipping_elem.get_text().lower():
                # Try to extract shipping cost if mentioned
                shipping_text = shipping_elem.get_text()
                match = re.search(r'₹\s*(\d+(?:,\d+)*(?:\.\d+)?)', shipping_text)
                if match:
                    try:
                        shipping_cost = float(match.group(1).replace(',', ''))
                    except ValueError:
                        pass
            
            return PriceData(
                price=price,
                availability=availability,
                seller_rating=seller_rating,
                seller_name=seller_name,
                shipping_cost=shipping_cost
            )
        
        except requests.RequestException as e:
            logger.error(f"Request error for ASIN {asin}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error scraping ASIN {asin}: {e}")
            return None
    
    def store_price_data(self, mapping_id: int, price_data: PriceData):
        """Store price data in history table"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO competitor_price_history (
                            competitor_mapping_id, price, availability,
                            seller_rating, seller_name, shipping_cost
                        )
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        mapping_id,
                        price_data.price,
                        price_data.availability,
                        price_data.seller_rating,
                        price_data.seller_name,
                        price_data.shipping_cost
                    ))
                    conn.commit()
        
        except Exception as e:
            logger.error(f"Error storing price data: {e}")
            raise
    
    def track_prices(self, sku: Optional[str] = None) -> Dict[str, int]:
        """Track prices for all active competitors or specific SKU"""
        stats = {'total': 0, 'success': 0, 'failed': 0}
        
        competitors = self.fetch_active_competitors(sku)
        stats['total'] = len(competitors)
        
        logger.info(f"Tracking prices for {stats['total']} competitors")
        
        for competitor in competitors:
            try:
                logger.info(f"Scraping ASIN {competitor.competitor_asin} for SKU {competitor.sku}")
                
                price_data = self.scrape_amazon_product(competitor.competitor_asin)
                
                if price_data:
                    self.store_price_data(competitor.id, price_data)
                    stats['success'] += 1
                    logger.info(f"Successfully tracked price: ₹{price_data.price}")
                else:
                    stats['failed'] += 1
                    logger.warning(f"Failed to scrape ASIN {competitor.competitor_asin}")
            
            except Exception as e:
                stats['failed'] += 1
                logger.error(f"Error tracking competitor {competitor.id}: {e}")
        
        logger.info(f"Price tracking complete: {stats}")
        return stats
    
    def cleanup_old_data(self, days_to_keep: int = 90):
        """Remove price history older than specified days"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        DELETE FROM competitor_price_history
                        WHERE scraped_at < NOW() - INTERVAL '%s days'
                    """, (days_to_keep,))
                    deleted = cur.rowcount
                    conn.commit()
                    logger.info(f"Cleaned up {deleted} old price records")
                    return deleted
        
        except Exception as e:
            logger.error(f"Error cleaning up old data: {e}")
            return 0


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
    
    tracker = PriceTracker(db_config)
    
    if len(sys.argv) > 1:
        sku = sys.argv[1]
        stats = tracker.track_prices(sku)
    else:
        stats = tracker.track_prices()
    
    print(f"Tracking complete: {stats}")
