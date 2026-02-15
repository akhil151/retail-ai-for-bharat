
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

// Use strict parsing for CSV lines to handle commas inside quotes if needed, 
// but for now we'll use the simple split logic as the data seems simple.
// If data includes commas, we might need a better parser. 
// Given the file views, it looks standard.

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:hi@localhost:5432/marketplace';
console.log(`Connecting to database: ${connectionString}`);

const pool = new Pool({ connectionString });

async function importAllData() {
    try {
        // 1. Get the real user
        const userRes = await pool.query('SELECT user_id FROM user_preferences LIMIT 1');
        if (userRes.rows.length === 0) {
            console.error("No registered users found! Please sign up in the application first.");
            process.exit(1);
        }
        const userId = userRes.rows[0].user_id;
        console.log(`Found user: ${userId}`);

        // 2. Read CSVs
        const dataDir = join(process.cwd(), 'data');
        console.log(`Reading CSVs from ${dataDir}...`);

        const amazonProductsCSV = readFileSync(join(dataDir, 'amazon_products.csv'), 'utf-8');
        const flipkartProductsCSV = readFileSync(join(dataDir, 'flipkart_products.csv'), 'utf-8');
        const meeshoProductsCSV = readFileSync(join(dataDir, 'meesho_products.csv'), 'utf-8');

        const amazonSalesCSV = readFileSync(join(dataDir, 'amazon_sales.csv'), 'utf-8');
        const flipkartSalesCSV = readFileSync(join(dataDir, 'flipkart_sales.csv'), 'utf-8');
        const meeshoSalesCSV = readFileSync(join(dataDir, 'meesho_sales.csv'), 'utf-8');

        const inventoryMasterCSV = readFileSync(join(dataDir, 'inventory_master.csv'), 'utf-8');
        const platformFeesCSV = readFileSync(join(dataDir, 'platform_fees.csv'), 'utf-8');

        // 3. Helper to parse CSV
        const parseCSV = (content: string) => {
            const lines = content.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            const data = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                // Simple comma split - caveat: doesn't handle commas in quotes
                const values = line.split(',');
                const row: any = {};
                headers.forEach((h, idx) => {
                    row[h] = values[idx]?.trim() || '';
                });
                data.push(row);
            }
            return data;
        };

        // 4. Import Products
        console.log('Importing Products...');
        let productCount = 0;

        // Amazon
        const amazonProducts = parseCSV(amazonProductsCSV);
        for (const row of amazonProducts) {
            await pool.query(
                `INSERT INTO products (name, sku, price, marketplace, user_id, asin, category, brand, listing_price, your_price, quantity_available, condition, fulfillment_channel, status, product_title) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                [
                    row.product_name,
                    row.sku,
                    row.your_price || '0',
                    'Amazon',
                    userId,
                    row.asin,
                    row.category,
                    row.brand,
                    row.listing_price,
                    row.your_price,
                    row.quantity_available,
                    row.condition,
                    row.fulfillment_channel,
                    row.status,
                    row.product_name
                ]
            );
            productCount++;
        }

        // Flipkart
        const flipkartProducts = parseCSV(flipkartProductsCSV);
        for (const row of flipkartProducts) {
            await pool.query(
                `INSERT INTO products (name, sku, price, marketplace, user_id, fsn, product_title, vertical, sub_category, brand, mrp, selling_price, stock_count, listing_status, procurement_sla) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                [
                    row.product_title,
                    row.sku,
                    row.selling_price || '0',
                    'Flipkart',
                    userId,
                    row.fsn,
                    row.product_title,
                    row.vertical,
                    row.sub_category,
                    row.brand,
                    row.mrp,
                    row.selling_price,
                    row.stock_count,
                    row.listing_status,
                    row.procurement_sla
                ]
            );
            productCount++;
        }

        // Meesho
        const meeshoProducts = parseCSV(meeshoProductsCSV);
        for (const row of meeshoProducts) {
            await pool.query(
                `INSERT INTO products (name, sku, price, marketplace, user_id, product_title, category, sub_category, selling_price, stock_count, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    row.product_name,
                    row.sku,
                    row.selling_price || '0',
                    'Meesho',
                    userId,
                    row.product_name,
                    row.category,
                    row.sub_category,
                    row.selling_price,
                    row.stock_quantity,
                    row.product_status
                ]
            );
            productCount++;
        }
        console.log(`✓ Imported ${productCount} products.`);

        // 5. Import Inventory Master
        console.log('Importing Inventory Master...');
        const inventoryData = parseCSV(inventoryMasterCSV);
        let invCount = 0;
        for (const row of inventoryData) {
            // Import into inventory_master
            await pool.query(
                `INSERT INTO inventory_master (sku, product_name, total_stock, amazon_stock, flipkart_stock, meesho_stock, cost_price, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    row.sku,
                    row.product_name,
                    parseInt(row.total_stock || '0'),
                    parseInt(row.amazon_stock || '0'),
                    parseInt(row.flipkart_stock || '0'),
                    parseInt(row.meesho_stock || '0'),
                    row.cost_price,
                    userId
                ]
            );

            // Also import into inventory (legacy/redundant table?)
            await pool.query(
                `INSERT INTO inventory (sku, product_name, total_stock, amazon_stock, flipkart_stock, meesho_stock, reorder_level, cost_price, last_updated, user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    row.sku,
                    row.product_name,
                    parseInt(row.total_stock || '0'),
                    parseInt(row.amazon_stock || '0'),
                    parseInt(row.flipkart_stock || '0'),
                    parseInt(row.meesho_stock || '0'),
                    parseInt(row.reorder_level || '0'),
                    row.cost_price,
                    row.last_updated || new Date().toISOString().split('T')[0],
                    userId
                ]
            );
            invCount++;
        }
        console.log(`✓ Imported ${invCount} inventory records.`);

        // 6. Import Platform Fees
        console.log('Importing Platform Fees...');
        const feeData = parseCSV(platformFeesCSV);
        let feeCount = 0;
        for (const row of feeData) {
            await pool.query(
                `INSERT INTO platform_fees (platform, percent, fixed, user_id)
             VALUES ($1, $2, $3, $4)`,
                [
                    row.platform,
                    row.commission_percentage || '0',
                    row.fixed_fee || '0',
                    userId
                ]
            );
            feeCount++;
        }
        console.log(`✓ Imported ${feeCount} platform fee records.`);


        // 7. Import Sales
        console.log('Importing Sales...');
        let salesCount = 0;
        const salesFiles = [
            { data: parseCSV(amazonSalesCSV), marketplace: 'Amazon' },
            { data: parseCSV(flipkartSalesCSV), marketplace: 'Flipkart' },
            { data: parseCSV(meeshoSalesCSV), marketplace: 'Meesho' }
        ];

        for (const { data, marketplace } of salesFiles) {
            for (const row of data) {
                // Find product ID (must exist now)
                // We need to match by SKU and Marketplace
                // Warning: The products we just inserted might have duplicate SKUs across marketplaces.
                // We should find the product specific to this marketplace.
                const productRes = await pool.query(
                    `SELECT id FROM products WHERE sku = $1 AND marketplace = $2 AND user_id = $3 LIMIT 1`,
                    [row.sku, marketplace, userId]
                );

                if (productRes.rows.length > 0) {
                    const productId = productRes.rows[0].id;
                    await pool.query(
                        `INSERT INTO sales (product_id, quantity, amount, date, user_id)
                     VALUES ($1, $2, $3, $4, $5)`,
                        [
                            productId,
                            parseInt(row.quantity || row.units_sold || '0'),
                            row.total_price || row.selling_price || row.customer_paid_amount || '0',
                            row.order_date || row.date || new Date().toISOString().split('T')[0],
                            userId
                        ]
                    );
                    salesCount++;
                }
            }
        }
        console.log(`✓ Imported ${salesCount} sales records.`);

        console.log('\n✓ Import complete!');
        await pool.end();

    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    }
}

importAllData();
