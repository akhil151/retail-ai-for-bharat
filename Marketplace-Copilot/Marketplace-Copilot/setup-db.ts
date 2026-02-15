import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const DATABASE_URL = 'postgresql://postgres:hi@localhost:5432/postgres';
const DB_NAME = 'marketplace';

async function setup() {
  const adminPool = new Pool({ connectionString: DATABASE_URL });
  
  try {
    // Create database
    console.log('Creating database...');
    await adminPool.query(`DROP DATABASE IF EXISTS ${DB_NAME}`);
    await adminPool.query(`CREATE DATABASE ${DB_NAME}`);
    console.log('✓ Database created');
    await adminPool.end();

    // Connect to new database
    const dbPool = new Pool({
      connectionString: `postgresql://postgres:hi@localhost:5432/${DB_NAME}`
    });

    // Create tables
    console.log('Creating tables...');
    const sql = readFileSync(join(process.cwd(), 'migrations', 'init.sql'), 'utf-8');
    await dbPool.query(sql);
    console.log('✓ Tables created');

    // Import CSV data
    console.log('Importing CSV data...');
    
    // Read CSV files
    const amazonProductsCSV = readFileSync(join(process.cwd(), 'data', 'amazon_products.csv'), 'utf-8');
    const flipkartProductsCSV = readFileSync(join(process.cwd(), 'data', 'flipkart_products.csv'), 'utf-8');
    const meeshoProductsCSV = readFileSync(join(process.cwd(), 'data', 'meesho_products.csv'), 'utf-8');
    const amazonSalesCSV = readFileSync(join(process.cwd(), 'data', 'amazon_sales.csv'), 'utf-8');
    const flipkartSalesCSV = readFileSync(join(process.cwd(), 'data', 'flipkart_sales.csv'), 'utf-8');
    const meeshoSalesCSV = readFileSync(join(process.cwd(), 'data', 'meesho_sales.csv'), 'utf-8');
    
    let productCount = 0;
    
    // Import Amazon products
    const amazonLines = amazonProductsCSV.trim().split('\n');
    const amazonHeaders = amazonLines[0].split(',');
    for (let i = 1; i < amazonLines.length; i++) {
      const values = amazonLines[i].split(',');
      const row: any = {};
      amazonHeaders.forEach((h, idx) => row[h.trim()] = values[idx]?.trim());
      
      await dbPool.query(
        `INSERT INTO products (name, sku, price, marketplace, user_id, asin, category, brand, listing_price, your_price, quantity_available, condition, fulfillment_channel, status, product_title) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          row.product_name,
          row.sku,
          row.your_price || '0',
          'Amazon',
          'demo-user',
          row.asin || '',
          row.category || '',
          row.brand || '',
          row.listing_price || '0',
          row.your_price || '0',
          row.quantity_available || '0',
          row.condition || '',
          row.fulfillment_channel || '',
          row.status || '',
          row.product_name
        ]
      );
      productCount++;
    }
    
    // Import Flipkart products
    const flipkartLines = flipkartProductsCSV.trim().split('\n');
    const flipkartHeaders = flipkartLines[0].split(',');
    for (let i = 1; i < flipkartLines.length; i++) {
      const values = flipkartLines[i].split(',');
      const row: any = {};
      flipkartHeaders.forEach((h, idx) => row[h.trim()] = values[idx]?.trim());
      
      await dbPool.query(
        `INSERT INTO products (name, sku, price, marketplace, user_id, fsn, product_title, vertical, sub_category, brand, mrp, selling_price, stock_count, listing_status, procurement_sla) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          row.product_title,
          row.sku,
          row.selling_price || '0',
          'Flipkart',
          'demo-user',
          row.fsn || '',
          row.product_title,
          row.vertical || '',
          row.sub_category || '',
          row.brand || '',
          row.mrp || '0',
          row.selling_price || '0',
          row.stock_count || '0',
          row.listing_status || '',
          row.procurement_sla || ''
        ]
      );
      productCount++;
    }
    
    // Import Meesho products
    const meeshoLines = meeshoProductsCSV.trim().split('\n');
    const meeshoHeaders = meeshoLines[0].split(',');
    for (let i = 1; i < meeshoLines.length; i++) {
      const values = meeshoLines[i].split(',');
      const row: any = {};
      meeshoHeaders.forEach((h, idx) => row[h.trim()] = values[idx]?.trim());
      
      await dbPool.query(
        `INSERT INTO products (name, sku, price, marketplace, user_id, product_title, category, sub_category, selling_price, stock_count, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          row.product_name,
          row.sku,
          row.selling_price || '0',
          'Meesho',
          'demo-user',
          row.product_name,
          row.category || '',
          row.sub_category || '',
          row.selling_price || '0',
          row.stock_quantity || '0',
          row.product_status || ''
        ]
      );
      productCount++;
    }
    console.log(`✓ Imported ${productCount} products`);

    // Import sales
    let salesCount = 0;
    const salesData = [
      { csv: amazonSalesCSV, marketplace: 'Amazon' },
      { csv: flipkartSalesCSV, marketplace: 'Flipkart' },
      { csv: meeshoSalesCSV, marketplace: 'Meesho' }
    ];
    
    for (const { csv, marketplace } of salesData) {
      const lines = csv.trim().split('\n');
      const headers = lines[0].split(',');
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row: any = {};
        headers.forEach((h, idx) => row[h.trim()] = values[idx]?.trim());
        
        const productResult = await dbPool.query(
          'SELECT id FROM products WHERE sku = $1 AND marketplace = $2 LIMIT 1',
          [row.sku, marketplace]
        );
        
        if (productResult.rows.length > 0) {
          await dbPool.query(
            `INSERT INTO sales (product_id, quantity, amount, date, user_id) 
             VALUES ($1, $2, $3, $4, $5)`,
            [
              productResult.rows[0].id,
              parseInt(row.quantity || row.units_sold || '0'),
              row.total_price || row.selling_price || row.customer_paid_amount || '0',
              row.order_date || row.date || new Date().toISOString().split('T')[0],
              'demo-user'
            ]
          );
          salesCount++;
        }
      }
    }
    console.log(`✓ Imported ${salesCount} sales records`);

    // Import inventory_master
    console.log('Importing inventory master...');
    const inventoryCSV = readFileSync(join(process.cwd(), 'data', 'inventory_master.csv'), 'utf-8');
    const invLines = inventoryCSV.trim().split('\n');
    const invHeaders = invLines[0].split(',');
    let invCount = 0;
    
    for (let i = 1; i < invLines.length; i++) {
      const values = invLines[i].split(',');
      const row: any = {};
      invHeaders.forEach((h, idx) => row[h.trim()] = values[idx]?.trim());
      
      await dbPool.query(
        `INSERT INTO inventory_master (sku, product_name, total_stock, amazon_stock, flipkart_stock, meesho_stock, cost_price, user_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          row.sku,
          row.product_name,
          parseInt(row.total_stock || '0'),
          parseInt(row.amazon_stock || '0'),
          parseInt(row.flipkart_stock || '0'),
          parseInt(row.meesho_stock || '0'),
          row.cost_price || '0',
          'demo-user'
        ]
      );
      invCount++;
    }
    console.log(`✓ Imported ${invCount} inventory master records`);

    await dbPool.end();
    console.log('\n✓ Setup complete! Update your .env file:');
    console.log('DATABASE_URL=postgresql://postgres:hi@localhost:5432/marketplace');
    
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setup();
