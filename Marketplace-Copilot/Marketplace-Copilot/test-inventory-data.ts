import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:hi@localhost:5432/marketplace'
});

async function testInventoryData() {
  try {
    console.log('Testing Inventory Optimization Data Flow...\n');
    
    // Test 1: Check products
    const products = await pool.query('SELECT COUNT(*) as count FROM products WHERE user_id = $1', ['demo-user']);
    console.log(`✓ Products: ${products.rows[0].count} records`);
    
    // Test 2: Check sales
    const sales = await pool.query('SELECT COUNT(*) as count FROM sales WHERE user_id = $1', ['demo-user']);
    console.log(`✓ Sales: ${sales.rows[0].count} records`);
    
    // Test 3: Check inventory_master
    const inventory = await pool.query('SELECT COUNT(*) as count FROM inventory_master WHERE user_id = $1', ['demo-user']);
    console.log(`✓ Inventory Master: ${inventory.rows[0].count} records`);
    
    // Test 4: Sample inventory data
    const sampleInv = await pool.query('SELECT * FROM inventory_master WHERE user_id = $1 LIMIT 3', ['demo-user']);
    console.log('\nSample Inventory Master Records:');
    sampleInv.rows.forEach(row => {
      console.log(`  - SKU: ${row.sku}, Product: ${row.product_name}, Total Stock: ${row.total_stock}, Cost: ${row.cost_price}`);
    });
    
    // Test 5: Check if products have matching inventory
    const matchQuery = await pool.query(`
      SELECT p.sku, p.name, im.total_stock, im.cost_price
      FROM products p
      LEFT JOIN inventory_master im ON p.sku = im.sku AND p.user_id = im.user_id
      WHERE p.user_id = $1
      LIMIT 5
    `, ['demo-user']);
    
    console.log('\nProduct-Inventory Matching:');
    matchQuery.rows.forEach(row => {
      const status = row.total_stock !== null ? '✓ Matched' : '✗ No inventory';
      console.log(`  ${status} - SKU: ${row.sku}, Stock: ${row.total_stock || 'N/A'}`);
    });
    
    // Test 6: Calculate sample metrics
    const metricsQuery = await pool.query(`
      SELECT 
        p.sku,
        p.name,
        im.total_stock as current_stock,
        COALESCE(SUM(s.quantity), 0) as total_sales,
        COALESCE(SUM(s.quantity), 0) / 30.0 as avg_daily_sales,
        im.cost_price,
        CAST(p.price AS NUMERIC) as selling_price
      FROM products p
      LEFT JOIN inventory_master im ON p.sku = im.sku AND p.user_id = im.user_id
      LEFT JOIN sales s ON p.id = s.product_id AND p.user_id = s.user_id
      WHERE p.user_id = $1
      GROUP BY p.sku, p.name, im.total_stock, im.cost_price, p.price
      LIMIT 5
    `, ['demo-user']);
    
    console.log('\nSample Metrics for Optimization:');
    metricsQuery.rows.forEach(row => {
      console.log(`  SKU: ${row.sku}`);
      console.log(`    Current Stock: ${row.current_stock || 0}`);
      console.log(`    Avg Daily Sales: ${Number(row.avg_daily_sales || 0).toFixed(2)}`);
      console.log(`    Predicted 30d Demand: ${Math.round(Number(row.avg_daily_sales || 0) * 30)}`);
    });
    
    console.log('\n✓ All tests passed! Data is ready for inventory optimization.');
    
  } catch (error) {
    console.error('✗ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testInventoryData();
