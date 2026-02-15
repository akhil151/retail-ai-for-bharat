import 'dotenv/config';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:hi@localhost:5432/marketplace';

async function checkDatabase() {
    const pool = new Pool({ connectionString: DATABASE_URL });

    try {
        console.log('🔍 Checking database schema...\n');

        // Check if competitor tables exist
        const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('competitor_mapping', 'competitor_price_history', 'products')
      ORDER BY table_name
    `);

        console.log('📋 Tables found:');
        tablesResult.rows.forEach(row => {
            console.log(`  ✓ ${row.table_name}`);
        });

        if (tablesResult.rows.length < 3) {
            console.log('\n⚠️  Missing tables! Run migrations first.');
            process.exit(1);
        }

        // Check competitor_mapping data
        const mappingCountResult = await pool.query('SELECT COUNT(*) FROM competitor_mapping');
        console.log(`\n📊 Competitor mappings: ${mappingCountResult.rows[0].count}`);

        // Check competitor_price_history data
        const historyCountResult = await pool.query('SELECT COUNT(*) FROM competitor_price_history');
        console.log(`📊 Price history entries: ${historyCountResult.rows[0].count}`);

        // Check products data
        const productsCountResult = await pool.query('SELECT COUNT(*) FROM products');
        console.log(`📊 Products: ${productsCountResult.rows[0].count}`);

        // Check products indexes
        const indexResult = await pool.query(`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = 'products'
            AND indexname IN ('idx_products_sku', 'idx_products_sku_marketplace')
          ORDER BY indexname
        `);
        if (indexResult.rows.length > 0) {
          console.log('\n🔧 Products indexes:');
          indexResult.rows.forEach(row => {
            console.log(`  ✓ ${row.indexname}`);
          });
        } else {
          console.log('\n⚠️  Products SKU indexes not found');
        }

        // Test the price intelligence function
        const sampleSkuResult = await pool.query('SELECT sku FROM products LIMIT 1');
        if (sampleSkuResult.rows.length > 0) {
            const sku = sampleSkuResult.rows[0].sku;
            console.log(`\n🧪 Testing price intelligence for SKU: ${sku}`);

            const intelligenceResult = await pool.query(
                'SELECT * FROM get_price_intelligence($1)',
                [sku]
            );

            if (intelligenceResult.rows.length > 0) {
                const data = intelligenceResult.rows[0];
                console.log('  ✓ Price intelligence function works!');
                console.log(`    - Your price: ₹${data.your_price}`);
                console.log(`    - Lowest competitor: ₹${data.lowest_price || 'N/A'}`);
                console.log(`    - Avg competitor: ₹${data.avg_price || 'N/A'}`);
                const gap = data.price_gap_percent !== null && data.price_gap_percent !== undefined
                  ? Number(data.price_gap_percent)
                  : null;
                console.log(`    - Price gap: ${gap !== null && !Number.isNaN(gap) ? gap.toFixed(2) : 'N/A'}%`);
                console.log(`    - Competitors: ${data.competitor_count}`);
            } else {
                console.log('  ⚠️  No price intelligence data found');
            }
        }

        // Check if view exists
        const viewResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
        AND table_name = 'latest_competitor_prices'
    `);

        if (viewResult.rows.length > 0) {
            console.log('\n✓ latest_competitor_prices view exists');
        } else {
            console.log('\n⚠️  latest_competitor_prices view not found');
        }

        console.log('\n✅ Database check complete!');
        await pool.end();
    } catch (error) {
        console.error('❌ Database check failed:', error);
        process.exit(1);
    }
}

checkDatabase();
