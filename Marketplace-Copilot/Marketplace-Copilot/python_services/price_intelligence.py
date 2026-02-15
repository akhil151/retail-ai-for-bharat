"""
Price Intelligence Module
Calculates price intelligence metrics and provides insights.
"""

import logging
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
import psycopg2
from psycopg2.extras import RealDictCursor
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class PriceIntelligence:
    sku: str
    your_price: float
    lowest_price: Optional[float]
    avg_price: Optional[float]
    highest_price: Optional[float]
    price_gap_percentage: float
    volatility: float
    competitor_count: int
    price_drop_alert: bool
    market_position: str
    recommended_action: str

class PriceIntelligenceEngine:
    """Calculates price intelligence metrics"""
    
    def __init__(self, db_config: Dict[str, str]):
        self.db_config = db_config
    
    def get_db_connection(self):
        """Create database connection"""
        return psycopg2.connect(**self.db_config)
    
    def get_price_intelligence(self, sku: str) -> Optional[PriceIntelligence]:
        """Get comprehensive price intelligence for a SKU"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Use the database function
                    cur.execute("SELECT * FROM get_price_intelligence(%s)", (sku,))
                    row = cur.fetchone()
                    
                    if not row:
                        logger.warning(f"No data found for SKU {sku}")
                        return None
                    
                    # Determine market position
                    market_position = self._determine_market_position(
                        row['your_price'],
                        row['lowest_price'],
                        row['avg_price']
                    )
                    
                    # Determine recommended action
                    recommended_action = self._recommend_action(
                        row['your_price'],
                        row['lowest_price'],
                        row['avg_price'],
                        row['price_gap_percent'],
                        row['price_drop_alert']
                    )
                    
                    return PriceIntelligence(
                        sku=row['sku'],
                        your_price=float(row['your_price']) if row['your_price'] else 0.0,
                        lowest_price=float(row['lowest_price']) if row['lowest_price'] else None,
                        avg_price=float(row['avg_price']) if row['avg_price'] else None,
                        highest_price=float(row['highest_price']) if row['highest_price'] else None,
                        price_gap_percentage=float(row['price_gap_percent']) if row['price_gap_percent'] else 0.0,
                        volatility=float(row['volatility']) if row['volatility'] else 0.0,
                        competitor_count=int(row['competitor_count']) if row['competitor_count'] else 0,
                        price_drop_alert=bool(row['price_drop_alert']),
                        market_position=market_position,
                        recommended_action=recommended_action
                    )
        
        except Exception as e:
            logger.error(f"Error getting price intelligence for {sku}: {e}")
            return None
    
    def _determine_market_position(
        self,
        your_price: float,
        lowest_price: Optional[float],
        avg_price: Optional[float]
    ) -> str:
        """Determine market position"""
        if not lowest_price or not avg_price:
            return "unknown"
        
        if your_price <= lowest_price * 1.02:  # Within 2% of lowest
            return "best_price"
        elif your_price <= avg_price:
            return "competitive"
        elif your_price <= avg_price * 1.10:
            return "slightly_high"
        else:
            return "overpriced"
    
    def _recommend_action(
        self,
        your_price: float,
        lowest_price: Optional[float],
        avg_price: Optional[float],
        price_gap: float,
        price_drop_alert: bool
    ) -> str:
        """Recommend pricing action"""
        if not lowest_price or not avg_price:
            return "monitor"
        
        if price_drop_alert:
            return "urgent_review"
        
        if price_gap > 10:
            return "decrease_price"
        elif price_gap < -5:
            return "consider_increase"
        elif your_price <= lowest_price * 1.02:
            return "maintain"
        else:
            return "monitor"
    
    def get_bulk_intelligence(self, skus: List[str] = None) -> List[PriceIntelligence]:
        """Get price intelligence for multiple SKUs"""
        results = []
        
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    if skus:
                        # Get specific SKUs
                        for sku in skus:
                            intelligence = self.get_price_intelligence(sku)
                            if intelligence:
                                results.append(intelligence)
                    else:
                        # Get all products with competitors
                        cur.execute("""
                            SELECT DISTINCT sku
                            FROM competitor_mapping
                            WHERE is_active = TRUE
                        """)
                        rows = cur.fetchall()
                        
                        for row in rows:
                            intelligence = self.get_price_intelligence(row['sku'])
                            if intelligence:
                                results.append(intelligence)
        
        except Exception as e:
            logger.error(f"Error getting bulk intelligence: {e}")
        
        return results
    
    def get_recent_price_changes(self, hours: int = 1, limit: int = 10) -> List[Dict]:
        """Get recent significant price changes"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        WITH recent_prices AS (
                            SELECT
                                cm.sku,
                                cm.competitor_asin,
                                cm.competitor_title,
                                cph.price as current_price,
                                cph.scraped_at,
                                LAG(cph.price) OVER (
                                    PARTITION BY cm.id
                                    ORDER BY cph.scraped_at
                                ) as previous_price,
                                LAG(cph.scraped_at) OVER (
                                    PARTITION BY cm.id
                                    ORDER BY cph.scraped_at
                                ) as previous_scraped_at
                            FROM competitor_mapping cm
                            JOIN competitor_price_history cph ON cm.id = cph.competitor_mapping_id
                            WHERE cph.scraped_at >= NOW() - INTERVAL '%s hours'
                              AND cm.is_active = TRUE
                        )
                        SELECT
                            sku,
                            competitor_asin,
                            competitor_title,
                            current_price,
                            previous_price,
                            ((current_price - previous_price) / previous_price * 100) as price_change_percent,
                            EXTRACT(EPOCH FROM (scraped_at - previous_scraped_at)) / 60 as minutes_ago
                        FROM recent_prices
                        WHERE previous_price IS NOT NULL
                          AND ABS((current_price - previous_price) / previous_price) > 0.01
                        ORDER BY ABS(price_change_percent) DESC
                        LIMIT %s
                    """, (hours, limit))
                    
                    return [dict(row) for row in cur.fetchall()]
        
        except Exception as e:
            logger.error(f"Error getting recent price changes: {e}")
            return []
    
    def get_price_alerts(self, sku: Optional[str] = None) -> Dict[str, List[str]]:
        """Get active price alerts"""
        alerts = {
            'overpriced': [],
            'best_price': [],
            'price_drops': [],
            'high_volatility': []
        }
        
        try:
            skus_to_check = [sku] if sku else None
            intelligence_data = self.get_bulk_intelligence(skus_to_check)
            
            for intel in intelligence_data:
                # Overpriced products
                if intel.price_gap_percentage > 10:
                    alerts['overpriced'].append(intel.sku)
                
                # Best price products
                if intel.market_position == 'best_price':
                    alerts['best_price'].append(intel.sku)
                
                # Price drop alerts
                if intel.price_drop_alert:
                    alerts['price_drops'].append(intel.sku)
                
                # High volatility
                if intel.volatility > 50:  # High volatility threshold
                    alerts['high_volatility'].append(intel.sku)
        
        except Exception as e:
            logger.error(f"Error getting price alerts: {e}")
        
        return alerts
    
    def to_json(self, intelligence: PriceIntelligence) -> str:
        """Convert intelligence to JSON"""
        return json.dumps(asdict(intelligence), indent=2, default=str)


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
    
    engine = PriceIntelligenceEngine(db_config)
    
    if len(sys.argv) > 1:
        sku = sys.argv[1]
        intelligence = engine.get_price_intelligence(sku)
        if intelligence:
            print(engine.to_json(intelligence))
        else:
            print(f"No intelligence data for SKU: {sku}")
    else:
        # Get all intelligence
        all_intelligence = engine.get_bulk_intelligence()
        for intel in all_intelligence:
            print(f"\n{intel.sku}:")
            print(engine.to_json(intel))
