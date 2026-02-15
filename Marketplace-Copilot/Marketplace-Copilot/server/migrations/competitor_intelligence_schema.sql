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
    UNIQUE(sku, competitor_asin, marketplace),
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE CASCADE
);

CREATE INDEX idx_competitor_mapping_sku ON competitor_mapping(sku);
CREATE INDEX idx_competitor_mapping_asin ON competitor_mapping(competitor_asin);
CREATE INDEX idx_competitor_mapping_active ON competitor_mapping(is_active);

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

CREATE INDEX idx_price_history_mapping_id ON competitor_price_history(competitor_mapping_id);
CREATE INDEX idx_price_history_scraped_at ON competitor_price_history(scraped_at);
CREATE INDEX idx_price_history_price ON competitor_price_history(price);

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
        SELECT p.sku, p.selling_price
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
