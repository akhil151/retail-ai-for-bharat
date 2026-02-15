
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:hi@localhost:5432/marketplace';
const pool = new Pool({ connectionString });

const userConfig = [
    {
        email: 'harish@gmail.com',
        platform: 'Amazon',
        productsCsv: 'amazon_products.csv',
        salesCsv: 'amazon_sales.csv',
        firstName: 'Harish',
        lastName: 'User'
    },
    {
        email: 'darshan@gmail.com',
        platform: 'Flipkart',
        productsCsv: 'flipkart_products.csv',
        salesCsv: 'flipkart_sales.csv',
        firstName: 'Darshan',
        lastName: 'User'
    },
    {
        email: 'akash@gmail.com',
        platform: 'Meesho',
        productsCsv: 'meesho_products.csv',
        salesCsv: 'meesho_sales.csv',
        firstName: 'Akash',
        lastName: 'User'
    }
];

async function importUserData() {
    try {
        const dataDir = join(process.cwd(), 'data');
        const inventoryMasterCSV = readFileSync(join(dataDir, 'inventory_master.csv'), 'utf-8');
        const platformFeesCSV = readFileSync(join(dataDir, 'platform_fees.csv'), 'utf-8');

        // Helper to parse CSV
        const parseCSV = (content: string) => {
            const lines = content.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            const data = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const values = line.split(',');
                const row: any = {};
                headers.forEach((h, idx) => {
                    row[h] = values[idx]?.trim() || '';
                });
                data.push(row);
            }
            return data;
        };

        const inventoryData = parseCSV(inventoryMasterCSV);
        const feeData = parseCSV(platformFeesCSV);

        for (const user of userConfig) {
            try {
                console.log(`\nProcessing user: ${user.email} (${user.platform})...`);

                // 1. Ensure User Exists / Update Preferences
                console.log(`- Updating user preferences...`);
                await pool.query(
                    `INSERT INTO user_preferences (user_id, platforms, updated_at)
                     VALUES ($1, $2, NOW())
                     ON CONFLICT (user_id) DO UPDATE SET platforms = $2, updated_at = NOW()`,
                    [user.email, JSON.stringify([user.platform])]
                );

                // 2. Clear existing data
                console.log(`- Clearing existing data...`);
                await pool.query('DELETE FROM products WHERE user_id = $1', [user.email]);
                await pool.query('DELETE FROM sales WHERE user_id = $1', [user.email]);
                await pool.query('DELETE FROM inventory_master WHERE user_id = $1', [user.email]);
                await pool.query('DELETE FROM platform_fees WHERE user_id = $1', [user.email]);

                // 3. Import Products
                console.log(`- Importing Products from ${user.productsCsv}...`);
                const productContent = readFileSync(join(dataDir, user.productsCsv), 'utf-8');
                const products = parseCSV(productContent);
                let prodCount = 0;

                for (const row of products) {
                    try {
                        let query = '';
                        let params: any[] = [];

                        if (user.platform === 'Amazon') {
                            query = `INSERT INTO products (name, sku, price, marketplace, user_id, asin, category, brand, listing_price, your_price, quantity_available, condition, fulfillment_channel, status, product_title) 
                                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`;
                            params = [
                                row.product_name, row.sku, row.your_price || '0', 'Amazon', user.email,
                                row.asin, row.category, row.brand, row.listing_price, row.your_price,
                                row.quantity_available, row.condition, row.fulfillment_channel, row.status, row.product_name
                            ];
                        } else if (user.platform === 'Flipkart') {
                            query = `INSERT INTO products (name, sku, price, marketplace, user_id, fsn, product_title, vertical, sub_category, brand, mrp, selling_price, stock_count, listing_status, procurement_sla) 
                                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`;
                            params = [
                                row.product_title, row.sku, row.selling_price || '0', 'Flipkart', user.email,
                                row.fsn, row.product_title, row.vertical, row.sub_category, row.brand,
                                row.mrp, row.selling_price, row.stock_count, row.listing_status, row.procurement_sla
                            ];
                        } else if (user.platform === 'Meesho') {
                            query = `INSERT INTO products (name, sku, price, marketplace, user_id, product_title, category, sub_category, selling_price, stock_count, status) 
                                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;
                            params = [
                                row.product_name, row.sku, row.selling_price || '0', 'Meesho', user.email,
                                row.product_name, row.category, row.sub_category, row.selling_price, row.stock_quantity, row.product_status
                            ];
                        }

                        if (query) {
                            await pool.query(query, params);
                            prodCount++;
                        }
                    } catch (err) {
                        console.error(`  Error inserting product SKU ${row.sku}:`, err);
                    }
                }
                console.log(`  ✓ Imported ${prodCount} products.`);

                // 4. Import Inventory
                console.log(`- Importing Inventory...`);
                let invCount = 0;
                for (const row of inventoryData) {
                    try {
                        await pool.query(
                            `INSERT INTO inventory_master (sku, product_name, total_stock, amazon_stock, flipkart_stock, meesho_stock, cost_price, user_id)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                            [
                                row.sku, row.product_name, parseInt(row.total_stock || '0'),
                                parseInt(row.amazon_stock || '0'), parseInt(row.flipkart_stock || '0'),
                                parseInt(row.meesho_stock || '0'), row.cost_price, user.email
                            ]
                        );
                        invCount++;
                    } catch (err) {
                        console.error(`  Error inserting inventory SKU ${row.sku}:`, err);
                    }
                }
                console.log(`  ✓ Imported ${invCount} inventory records.`);

                // 5. Import Platform Fees
                console.log(`- Importing Platform Fees...`);
                let feeCount = 0;
                for (const row of feeData) {
                    try {
                        await pool.query(
                            `INSERT INTO platform_fees (platform, percent, fixed, user_id)
                             VALUES ($1, $2, $3, $4)`,
                            [row.platform, row.commission_percentage || '0', row.fixed_fee || '0', user.email]
                        );
                        feeCount++;
                    } catch (err) {
                        console.error(`  Error inserting fee for ${row.platform}:`, err);
                    }
                }
                console.log(`  ✓ Imported ${feeCount} fees.`);

                // 6. Import Sales
                console.log(`- Importing Sales from ${user.salesCsv}...`);
                const salesContent = readFileSync(join(dataDir, user.salesCsv), 'utf-8');
                const sales = parseCSV(salesContent);
                let salesCount = 0;

                for (const row of sales) {
                    try {
                        const productRes = await pool.query(
                            `SELECT id FROM products WHERE sku = $1 AND marketplace = $2 AND user_id = $3 LIMIT 1`,
                            [row.sku, user.platform, user.email]
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
                                    user.email
                                ]
                            );
                            salesCount++;
                        }
                    } catch (err) {
                        console.error(`  Error inserting sale for SKU ${row.sku}:`, err);
                    }
                }
                console.log(`  ✓ Imported ${salesCount} sales records.`);

            } catch (userErr) {
                console.error(`Error processing user ${user.email}:`, userErr);
            }
        }

        console.log('\nAll users processed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    }
}

importUserData();
