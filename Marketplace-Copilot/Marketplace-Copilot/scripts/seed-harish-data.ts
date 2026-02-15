import 'dotenv/config';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:hi@localhost:5432/marketplace';
const USER_ID = 'harish@gmail.com';

async function seedHarishData() {
    const pool = new Pool({ connectionString: DATABASE_URL });

    try {
        console.log(`🚀 Starting seed for user: ${USER_ID}`);

        // clear existing data for this user to avoid duplicates if run multiple times
        // console.log('Cleaning up existing data for this user...');
        // await pool.query('DELETE FROM sales WHERE user_id = $1', [USER_ID]);
        // await pool.query('DELETE FROM inventory WHERE user_id = $1', [USER_ID]);
        // await pool.query('DELETE FROM products WHERE user_id = $1', [USER_ID]);
        // NOTE: Decided NOT to delete, but use ON CONFLICT or checks to prevent issues if run multiple times.
        // Actually for a clean state fix, maybe deleting is better? 
        // Let's stick to inserting ensuring we have data.

        // Initialize user preferences if not exist
        await pool.query(`
      INSERT INTO user_preferences (user_id, platforms)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO NOTHING
    `, [USER_ID, JSON.stringify(['Amazon', 'Flipkart', 'Meesho'])]);

        // Read CSVs
        const amazonProducts = parseCSV(readFileSync(join(process.cwd(), 'data', 'amazon_products.csv'), 'utf-8'));
        const flipkartProducts = parseCSV(readFileSync(join(process.cwd(), 'data', 'flipkart_products.csv'), 'utf-8'));
        const meeshoProducts = parseCSV(readFileSync(join(process.cwd(), 'data', 'meesho_products.csv'), 'utf-8'));

        // We will use existing sales CSVs, but assign them to this user
        const amazonSales = parseCSV(readFileSync(join(process.cwd(), 'data', 'amazon_sales.csv'), 'utf-8'));

        let productCount = 0;
        let inventoryCount = 0;
        let competitorCount = 0;

        // --- Helper to process products ---
        async function processProducts(products: any[], marketplace: string) {
            for (const row of products) {
                // 1. Insert Product
                let sku = row.sku;
                // Fix SKU if missing
                if (!sku) continue;

                const sellingPrice = parseFloat(row.selling_price || row.your_price || row.price || '0');
                const mrp = parseFloat(row.mrp || (sellingPrice * 1.2).toString());
                const stock = parseInt(row.stock_count || row.quantity_available || '100');

                // Check if product exists for this user
                const existingProd = await pool.query('SELECT id FROM products WHERE sku = $1 AND user_id = $2', [sku, USER_ID]);

                let productId;
                if (existingProd.rows.length === 0) {
                    const insertResult = await pool.query(`
                INSERT INTO products (
                    name, sku, price, marketplace, user_id, 
                    product_title, brand, mrp, selling_price, 
                    stock_count, status, description, listing_status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
            `, [
                        row.product_name || row.product_title || 'Unknown Product',
                        sku,
                        sellingPrice.toString(),
                        marketplace,
                        USER_ID,
                        row.product_title || row.product_name,
                        row.brand || 'Generic',
                        mrp.toString(),
                        sellingPrice.toString(),
                        stock.toString(),
                        'Active',
                        row.category || '',
                        'Active'
                    ]);
                    productId = insertResult.rows[0].id;
                    productCount++;
                } else {
                    productId = existingProd.rows[0].id;
                }

                // 2. Insert Inventory (Vital for BI Dashboard)
                // Check if inventory exists
                const existingInv = await pool.query('SELECT id FROM inventory WHERE sku = $1 AND user_id = $2', [sku, USER_ID]);
                if (existingInv.rows.length === 0) {
                    // Cost price = 70% of selling price (30% margin)
                    const costPrice = (sellingPrice * 0.7).toFixed(2);
                    await pool.query(`
                INSERT INTO inventory (
                    sku, product_name, total_stock, 
                    amazon_stock, flipkart_stock, meesho_stock, 
                    reorder_level, cost_price, last_updated, user_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
                        sku,
                        row.product_name || row.product_title || 'Unknown',
                        stock,
                        marketplace === 'Amazon' ? stock : 0,
                        marketplace === 'Flipkart' ? stock : 0,
                        marketplace === 'Meesho' ? stock : 0,
                        10, // reorder level
                        costPrice,
                        new Date().toISOString(),
                        USER_ID
                    ]);
                    inventoryCount++;
                }

                // 3. Generate Competitors (Vital for Competitor Analysis)
                // 3-5 competitors
                const numCompetitors = 3 + Math.floor(Math.random() * 3);

                for (let i = 0; i < numCompetitors; i++) {
                    const competitorPrice = sellingPrice * (0.85 + Math.random() * 0.30); // +/- 15%
                    const asin = `COMP${sku}${i}`;

                    // Insert Mapping
                    const mappingResult = await pool.query(`
                INSERT INTO competitor_mapping (
                    sku, competitor_asin, competitor_title, competitor_brand,
                    marketplace, similarity_score, initial_price, rank_position, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (sku, competitor_asin, marketplace) DO UPDATE SET last_updated = NOW()
                RETURNING id
            `, [
                        sku,
                        asin,
                        `Competitor for ${sku} - ${i + 1}`,
                        'CompetitorBrand',
                        marketplace,
                        (0.8 + Math.random() * 0.15).toFixed(2),
                        competitorPrice.toFixed(2),
                        i + 1,
                        true
                    ]);

                    const mappingId = mappingResult.rows[0].id;

                    // Insert Price History (Last 7 days)
                    for (let d = 0; d < 7; d++) {
                        const date = new Date();
                        date.setDate(date.getDate() - d);
                        const histPrice = competitorPrice * (0.98 + Math.random() * 0.04);

                        await pool.query(`
                    INSERT INTO competitor_price_history (
                        competitor_mapping_id, price, availability, scraped_at
                    ) VALUES ($1, $2, $3, $4)
                `, [mappingId, histPrice.toFixed(2), 'in_stock', date]);
                    }
                    competitorCount++;
                }
            }
        }

        console.log('Processing Amazon Products...');
        await processProducts(amazonProducts, 'Amazon');

        console.log('Processing Flipkart Products...');
        await processProducts(flipkartProducts, 'Flipkart');

        console.log('Processing Meesho Products...');
        await processProducts(meeshoProducts, 'Meesho');


        // 4. Generate Sales (Vital for Revenue)
        console.log('Generating Sales Data...');
        let salesCount = 0;

        // Get all user products to map IDs
        const allUserProducts = await pool.query('SELECT id, sku, selling_price FROM products WHERE user_id = $1', [USER_ID]);
        const productsMap = allUserProducts.rows;

        if (productsMap.length > 0) {
            // Generate random sales for the last 30 days
            for (let d = 0; d < 30; d++) {
                const date = new Date();
                date.setDate(date.getDate() - d);
                const dateStr = date.toISOString().split('T')[0];

                // Randomly select 20-50 products to have sales each day
                const dailyProducts = productsMap.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 30) + 20);

                for (const prod of dailyProducts) {
                    const qty = Math.floor(Math.random() * 5) + 1;
                    const price = parseFloat(prod.selling_price) || 500;
                    const amount = price * qty;

                    await pool.query(`
                    INSERT INTO sales (product_id, quantity, amount, date, user_id)
                    VALUES ($1, $2, $3, $4, $5)
                `, [prod.id, qty, amount.toString(), dateStr, USER_ID]);
                    salesCount++;
                }
            }
        }

        console.log('\nSummary:');
        console.log(`- Products Added/Verified: ${productCount}`);
        console.log(`- Inventory Records Created: ${inventoryCount}`);
        console.log(`- Competitors Mapped: ${competitorCount}`);
        console.log(`- Sales Records Generated: ${salesCount}`);
        console.log(`\n✅ Successfully seeded data for ${USER_ID}`);

    } catch (e) {
        console.error('Error seeding data:', e);
    } finally {
        await pool.end();
    }
}

function parseCSV(content: string) {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    return lines.slice(1).map(line => {
        // Handle commas inside quotes? Simple split for now as data seems simple
        const values = line.split(',');
        const row: any = {};
        headers.forEach((h, i) => {
            row[h] = values[i]?.trim();
        });
        return row;
    });
}

seedHarishData();
