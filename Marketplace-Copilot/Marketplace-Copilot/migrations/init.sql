CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sku VARCHAR(255) NOT NULL,
  price VARCHAR(50) NOT NULL,
  marketplace VARCHAR(100) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  fsn VARCHAR(255),
  product_title TEXT,
  vertical VARCHAR(255),
  sub_category VARCHAR(255),
  brand VARCHAR(255),
  mrp VARCHAR(50),
  selling_price VARCHAR(50),
  stock_count VARCHAR(50),
  listing_status VARCHAR(100),
  procurement_sla VARCHAR(100),
  asin VARCHAR(255),
  category VARCHAR(255),
  listing_price VARCHAR(50),
  your_price VARCHAR(50),
  quantity_available VARCHAR(50),
  condition VARCHAR(100),
  fulfillment_channel VARCHAR(100),
  status VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  amount VARCHAR(50) NOT NULL,
  date VARCHAR(50) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS uploads (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  error TEXT,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(255) NOT NULL,
  product_name TEXT NOT NULL,
  total_stock INTEGER NOT NULL,
  amazon_stock INTEGER NOT NULL,
  flipkart_stock INTEGER NOT NULL,
  meesho_stock INTEGER NOT NULL,
  reorder_level INTEGER NOT NULL,
  cost_price VARCHAR(50) NOT NULL,
  last_updated VARCHAR(50) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_marketplace ON products(marketplace);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_sku_marketplace ON products(sku, marketplace);

CREATE TABLE IF NOT EXISTS inventory_master (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(255) NOT NULL,
  product_name TEXT,
  total_stock INTEGER DEFAULT 0,
  amazon_stock INTEGER DEFAULT 0,
  flipkart_stock INTEGER DEFAULT 0,
  meesho_stock INTEGER DEFAULT 0,
  cost_price VARCHAR(50) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_fees (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(100) NOT NULL,
  percent VARCHAR(50) NOT NULL,
  fixed VARCHAR(50) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory_master(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_user_id ON platform_fees(user_id);

-- User Preferences (for auth + platform selections)
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  platforms TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Competitor Intelligence Schema

-- Competitor Mapping Table
CREATE TABLE IF NOT EXISTS competitor_mapping (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(255) NOT NULL,
    competitor_asin VARCHAR(50) NOT NULL,
    competitor_title TEXT NOT NULL,
    competitor_brand VARCHAR(255),
    marketplace VARCHAR(50) DEFAULT 'amazon',
    similarity_score DECIMAL(5, 4) NOT NULL,
    initial_price DECIMAL(10, 2),
    discovery_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    rank_position INTEGER,
    UNIQUE(sku, competitor_asin, marketplace)
);

CREATE INDEX IF NOT EXISTS idx_competitor_mapping_sku ON competitor_mapping(sku);
CREATE INDEX IF NOT EXISTS idx_competitor_mapping_asin ON competitor_mapping(competitor_asin);
CREATE INDEX IF NOT EXISTS idx_competitor_mapping_active ON competitor_mapping(is_active);

-- Competitor Price History Table
CREATE TABLE IF NOT EXISTS competitor_price_history (
    id SERIAL PRIMARY KEY,
    competitor_mapping_id INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    availability VARCHAR(50) DEFAULT 'in_stock',
    seller_rating DECIMAL(3, 2),
    seller_name VARCHAR(255),
    shipping_cost DECIMAL(10, 2) DEFAULT 0,
    total_price DECIMAL(10, 2) GENERATED ALWAYS AS (price + COALESCE(shipping_cost, 0)) STORED,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (competitor_mapping_id) REFERENCES competitor_mapping(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_price_history_mapping_id ON competitor_price_history(competitor_mapping_id);
CREATE INDEX IF NOT EXISTS idx_price_history_scraped_at ON competitor_price_history(scraped_at);
CREATE INDEX IF NOT EXISTS idx_price_history_price ON competitor_price_history(price);

-- View for latest competitor prices
CREATE OR REPLACE VIEW latest_competitor_prices AS
SELECT DISTINCT ON (cph.competitor_mapping_id)
    cm.id as mapping_id,
    cm.sku,
    cm.competitor_asin,
    cm.competitor_title,
    cm.similarity_score,
    cph.price,
    cph.availability,
    cph.seller_rating,
    cph.total_price,
    cph.scraped_at
FROM competitor_price_history cph
JOIN competitor_mapping cm ON cph.competitor_mapping_id = cm.id
WHERE cm.is_active = TRUE
ORDER BY cph.competitor_mapping_id, cph.scraped_at DESC;

-- Function to calculate price statistics
CREATE OR REPLACE FUNCTION get_price_intelligence(p_sku VARCHAR)
RETURNS TABLE (
    sku VARCHAR,
    your_price DECIMAL,
    lowest_price DECIMAL,
    avg_price DECIMAL,
    highest_price DECIMAL,
    price_gap_percent DECIMAL,
    volatility DECIMAL,
    competitor_count INTEGER,
    price_drop_alert BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH product_price AS (
        SELECT p.sku, 
               CAST(COALESCE(p.selling_price, p.price, '0') AS DECIMAL) as selling_price
        FROM products p
        WHERE p.sku = p_sku
    ),
    competitor_stats AS (
        SELECT
            cm.sku,
            MIN(lcp.price) as min_price,
            AVG(lcp.price) as avg_price,
            MAX(lcp.price) as max_price,
            COUNT(DISTINCT cm.id) as comp_count,
            STDDEV(lcp.price) as price_stddev
        FROM competitor_mapping cm
        JOIN latest_competitor_prices lcp ON cm.id = lcp.mapping_id
        WHERE cm.sku = p_sku AND cm.is_active = TRUE
        GROUP BY cm.sku
    ),
    price_drops AS (
        SELECT
            cm.sku,
            BOOL_OR(
                (cph_prev.price - cph_curr.price) / cph_prev.price > 0.03
            ) as has_drop
        FROM competitor_mapping cm
        JOIN competitor_price_history cph_curr ON cm.id = cph_curr.competitor_mapping_id
        JOIN competitor_price_history cph_prev ON cm.id = cph_prev.competitor_mapping_id
        WHERE cm.sku = p_sku
          AND cph_curr.scraped_at >= NOW() - INTERVAL '1 day'
          AND cph_prev.scraped_at >= NOW() - INTERVAL '2 days'
          AND cph_prev.scraped_at < cph_curr.scraped_at
        GROUP BY cm.sku
    )
    SELECT
        pp.sku,
        pp.selling_price,
        cs.min_price,
        cs.avg_price,
        cs.max_price,
        CASE
            WHEN cs.min_price > 0 THEN ((pp.selling_price - cs.min_price) / cs.min_price * 100)
            ELSE 0
        END as gap_percent,
        COALESCE(cs.price_stddev, 0),
        COALESCE(cs.comp_count, 0)::INTEGER,
        COALESCE(pd.has_drop, FALSE)
    FROM product_price pp
    LEFT JOIN competitor_stats cs ON pp.sku = cs.sku
    LEFT JOIN price_drops pd ON pp.sku = pd.sku;
END;
$$ LANGUAGE plpgsql;
