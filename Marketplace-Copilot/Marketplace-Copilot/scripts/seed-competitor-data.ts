import 'dotenv/config';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:hi@localhost:5432/marketplace';

async function seedCompetitorData() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('🌱 Seeding competitor data...');

    // Get existing products
    const productsResult = await pool.query(`
      SELECT sku, 
             CAST(COALESCE(selling_price, price, '0') AS DECIMAL) as price,
             product_title, 
             brand
      FROM products 
      WHERE sku IS NOT NULL 
      LIMIT 20
    `);

    if (productsResult.rows.length === 0) {
      console.log('⚠️  No products found in database. Please run setup-db.ts first.');
      process.exit(1);
    }

    console.log(`Found ${productsResult.rows.length} products to add competitors for`);

    let competitorCount = 0;
    let priceHistoryCount = 0;

    for (const product of productsResult.rows) {
      const basePrice = parseFloat(product.price) || 1000;
      const numCompetitors = 3 + Math.floor(Math.random() * 3); // 3-5 competitors per product

      for (let i = 0; i < numCompetitors; i++) {
        const competitorPrice = basePrice * (0.85 + Math.random() * 0.30); // ±15% variation
        const similarityScore = 0.70 + Math.random() * 0.29; // 0.70-0.99
        const rankPosition = i + 1;

        // Insert competitor mapping
        const mappingResult = await pool.query(`
          INSERT INTO competitor_mapping (
            sku, 
            competitor_asin, 
            competitor_title, 
            competitor_brand, 
            marketplace, 
            similarity_score, 
            initial_price, 
            rank_position,
            is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (sku, competitor_asin, marketplace) 
          DO UPDATE SET 
            last_updated = CURRENT_TIMESTAMP,
            rank_position = EXCLUDED.rank_position
          RETURNING id
        `, [
          product.sku,
          `B${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`, // Random ASIN
          `${product.product_title || 'Product'} - Competitor ${i + 1}`,
          product.brand || `Brand ${String.fromCharCode(65 + i)}`,
          'amazon',
          similarityScore.toFixed(4),
          competitorPrice.toFixed(2),
          rankPosition,
          true
        ]);

        const mappingId = mappingResult.rows[0].id;
        competitorCount++;

        // Insert price history entries (simulate 7 days of price tracking)
        for (let day = 7; day >= 0; day--) {
          const historicalPrice = competitorPrice * (0.95 + Math.random() * 0.10);
          const scrapedAt = new Date();
          scrapedAt.setDate(scrapedAt.getDate() - day);

          await pool.query(`
            INSERT INTO competitor_price_history (
              competitor_mapping_id,
              price,
              availability,
              seller_rating,
              seller_name,
              shipping_cost,
              scraped_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            mappingId,
            historicalPrice.toFixed(2),
            Math.random() > 0.1 ? 'in_stock' : 'low_stock',
            (3.5 + Math.random() * 1.5).toFixed(2), // Rating 3.5-5.0
            `Seller ${String.fromCharCode(65 + i)}`,
            (Math.random() * 50).toFixed(2), // Shipping 0-50
            scrapedAt
          ]);

          priceHistoryCount++;
        }
      }
    }

    console.log(`✅ Seeded ${competitorCount} competitors`);
    console.log(`✅ Inserted ${priceHistoryCount} price history entries`);
    console.log('✅ Competitor data seeding complete!');

    await pool.end();
  } catch (error) {
    console.error('❌ Error seeding competitor data:', error);
    process.exit(1);
  }
}

seedCompetitorData();
