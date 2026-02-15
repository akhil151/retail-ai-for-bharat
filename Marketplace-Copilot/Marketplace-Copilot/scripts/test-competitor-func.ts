import 'dotenv/config';
import { Pool } from 'pg';

async function testCompetitorIntelligence() {
    console.log('🧪 Testing Competitor Intelligence Function...');

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    try {
        // 1. Get a product SKU
        const productRes = await pool.query('SELECT sku FROM products LIMIT 1');
        if (productRes.rows.length === 0) {
            console.log('⚠️ No products found to test.');
            return;
        }
        const sku = productRes.rows[0].sku;
        console.log(`Testing for SKU: ${sku}`);

        // 2. Call the function
        const result = await pool.query('SELECT * FROM get_price_intelligence($1)', [sku]);

        if (result.rows.length > 0) {
            console.log('✅ Function call successful!');
            console.log('Result:', result.rows[0]);
        } else {
            console.log('⚠️ Function returned no rows (expected if no competitor data, but row should exist if product exists due to LEFT JOINs in function)');
        }

    } catch (error) {
        console.error('❌ Error calling get_price_intelligence:', error);
    } finally {
        await pool.end();
    }
}

testCompetitorIntelligence();
