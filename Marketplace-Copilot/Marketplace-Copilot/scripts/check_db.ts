
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:hi@localhost:5432/marketplace"
});

async function checkData() {
    try {
        const client = await pool.connect();

        // Check Revenue by Platform
        console.log("--- Revenue by Platform ---");
        const revRes = await client.query(`
      SELECT p.marketplace, COUNT(s.id) as sales_count, SUM(CAST(s.amount AS DECIMAL)) as total_revenue
      FROM sales s
      JOIN products p ON s."productId" = p.id
      GROUP BY p.marketplace
    `);
        console.table(revRes.rows);

        // Check for Zero Revenue Sales in Amazon
        const zeroRes = await client.query(`
      SELECT COUNT(*) as zero_rev_count 
      FROM sales s
      JOIN products p ON s."productId" = p.id
      WHERE p.marketplace = 'Amazon' AND CAST(s.amount AS DECIMAL) = 0
    `);
        console.log("Amazon Zero Revenue Count:", zeroRes.rows[0].zero_rev_count);

        // Check Inventory Master
        const invRes = await client.query(`SELECT COUNT(*) as count FROM inventory_master`);
        console.log("Inventory Master Rows:", invRes.rows[0].count);

        // Check Products Count
        const prodRes = await client.query(`SELECT marketplace, COUNT(*) FROM products GROUP BY marketplace`);
        console.table(prodRes.rows);

        client.release();
    } catch (err) {
        console.error("DB Check Failed:", err);
    } finally {
        await pool.end();
    }
}

checkData();
