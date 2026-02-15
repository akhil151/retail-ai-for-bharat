"""
Scheduler Module
Manages periodic execution of competitor discovery and price tracking.
"""

import logging
import schedule
import time
from datetime import datetime
from typing import Dict
import psycopg2
from psycopg2.extras import RealDictCursor

from competitor_discovery import CompetitorDiscovery
from price_tracker import PriceTracker

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CompetitorScheduler:
    """Manages scheduled tasks for competitor intelligence"""
    
    def __init__(self, db_config: Dict[str, str]):
        self.db_config = db_config
        self.discovery = CompetitorDiscovery(db_config)
        self.tracker = PriceTracker(db_config)
    
    def get_db_connection(self):
        """Create database connection"""
        return psycopg2.connect(**self.db_config)
    
    def get_all_skus(self) -> list:
        """Fetch all SKUs from products table"""
        try:
            with self.get_db_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("SELECT sku FROM products")
                    return [row['sku'] for row in cur.fetchall()]
        except Exception as e:
            logger.error(f"Error fetching SKUs: {e}")
            return []
    
    def discover_all_competitors(self):
        """Discover competitors for all products"""
        logger.info("Starting competitor discovery for all products")
        start_time = datetime.now()
        
        skus = self.get_all_skus()
        total = len(skus)
        success = 0
        failed = 0
        
        for i, sku in enumerate(skus, 1):
            try:
                logger.info(f"Processing {i}/{total}: {sku}")
                if self.discovery.discover_competitors(sku):
                    success += 1
                else:
                    failed += 1
                
                # Rate limiting between products
                if i < total:
                    time.sleep(5)
            
            except Exception as e:
                logger.error(f"Error processing SKU {sku}: {e}")
                failed += 1
        
        duration = (datetime.now() - start_time).total_seconds()
        logger.info(
            f"Competitor discovery complete: {success} success, {failed} failed, "
            f"{duration:.1f}s total"
        )
    
    def track_all_prices(self):
        """Track prices for all active competitors"""
        logger.info("Starting price tracking for all competitors")
        start_time = datetime.now()
        
        stats = self.tracker.track_prices()
        
        duration = (datetime.now() - start_time).total_seconds()
        logger.info(
            f"Price tracking complete: {stats['success']} success, {stats['failed']} failed, "
            f"{duration:.1f}s total"
        )
    
    def cleanup_old_data(self):
        """Clean up old price history data"""
        logger.info("Starting data cleanup")
        deleted = self.tracker.cleanup_old_data(days_to_keep=90)
        logger.info(f"Cleanup complete: {deleted} records deleted")
    
    def setup_schedules(self):
        """Setup all scheduled tasks"""
        # Discover competitors: Daily at 2 AM
        schedule.every().day.at("02:00").do(self.discover_all_competitors)
        
        # Track prices: Every 30 minutes
        schedule.every(30).minutes.do(self.track_all_prices)
        
        # Cleanup old data: Weekly on Sunday at 3 AM
        schedule.every().sunday.at("03:00").do(self.cleanup_old_data)
        
        logger.info("Schedules configured:")
        logger.info("  - Competitor discovery: Daily at 2:00 AM")
        logger.info("  - Price tracking: Every 30 minutes")
        logger.info("  - Data cleanup: Weekly on Sunday at 3:00 AM")
    
    def run(self):
        """Run the scheduler"""
        self.setup_schedules()
        
        logger.info("Scheduler started. Press Ctrl+C to stop.")
        
        # Run initial price tracking
        logger.info("Running initial price tracking...")
        self.track_all_prices()
        
        # Main loop
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        
        except KeyboardInterrupt:
            logger.info("Scheduler stopped by user")
        except Exception as e:
            logger.error(f"Scheduler error: {e}")
            raise


# CLI usage
if __name__ == "__main__":
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='Competitor Intelligence Scheduler')
    parser.add_argument('--mode', choices=['run', 'discover', 'track', 'cleanup'],
                       default='run', help='Operation mode')
    parser.add_argument('--sku', help='Specific SKU to process')
    
    args = parser.parse_args()
    
    db_config = {
        'host': 'localhost',
        'database': 'marketplace_copilot',
        'user': 'postgres',
        'password': 'postgres',
        'port': 5432
    }
    
    scheduler = CompetitorScheduler(db_config)
    
    if args.mode == 'run':
        scheduler.run()
    elif args.mode == 'discover':
        if args.sku:
            scheduler.discovery.discover_competitors(args.sku)
        else:
            scheduler.discover_all_competitors()
    elif args.mode == 'track':
        if args.sku:
            scheduler.tracker.track_prices(args.sku)
        else:
            scheduler.track_all_prices()
    elif args.mode == 'cleanup':
        scheduler.cleanup_old_data()
