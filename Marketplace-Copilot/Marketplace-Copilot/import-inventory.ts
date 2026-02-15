import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const pool = new Pool({
  connectionString: 'postgresql://postgres:hi@localhost:5432/marketplace'
});

async function importInventory() {
  try {
    // Create inventory table
    await pool.query(`
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
      CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
      CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
    `);

    const csv = readFileSync(join(process.cwd(), 'data', 'inventory_master.csv'), 'utf-8');
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    
    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row: any = {};
      headers.forEach((h, idx) => row[h.trim()] = values[idx]?.trim());
      
      await pool.query(
        `INSERT INTO inventory (sku, product_name, total_stock, amazon_stock, flipkart_stock, meesho_stock, reorder_level, cost_price, last_updated, user_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          row.sku,
          row.product_name,
          parseInt(row.total_stock),
          parseInt(row.amazon_stock),
          parseInt(row.flipkart_stock),
          parseInt(row.meesho_stock),
          parseInt(row.reorder_level),
          row.cost_price,
          row.last_updated,
          'demo-user'
        ]
      );
      count++;
    }
    
    console.log(`✓ Imported ${count} inventory records`);
    await pool.end();
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

importInventory();
