"""
Configuration for competitor intelligence services
"""

import os

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'marketplace'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'hi'),
    'port': int(os.getenv('DB_PORT', '5432'))
}

# Scraping configuration
SCRAPING_CONFIG = {
    'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'rate_limit_min': 1,  # Minimum seconds between requests
    'rate_limit_max': 3,  # Maximum seconds between requests
    'timeout': 10,  # Request timeout in seconds
    'max_retries': 3
}

# Competitor discovery configuration
DISCOVERY_CONFIG = {
    'min_similarity': 0.70,  # Minimum TF-IDF similarity score
    'price_range_min': 0.70,  # Minimum price ratio (70% of product price)
    'price_range_max': 1.30,  # Maximum price ratio (130% of product price)
    'top_competitors': 5,  # Number of top competitors to store
    'max_search_results': 20  # Maximum search results to process
}

# Scheduler configuration
SCHEDULER_CONFIG = {
    'discovery_time': '02:00',  # Daily discovery time (HH:MM)
    'tracking_interval': 30,  # Price tracking interval in minutes
    'cleanup_day': 'sunday',  # Day for cleanup
    'cleanup_time': '03:00',  # Cleanup time (HH:MM)
    'data_retention_days': 90  # Days to keep price history
}

# Marketplace configuration
MARKETPLACE_CONFIG = {
    'amazon_in': {
        'base_url': 'https://www.amazon.in',
        'search_url': 'https://www.amazon.in/s?k={query}',
        'product_url': 'https://www.amazon.in/dp/{asin}'
    }
}
