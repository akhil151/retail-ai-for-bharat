import 'dotenv/config';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:hi@localhost:5432/marketplace';

async function listUsers() {
    const pool = new Pool({ connectionString: DATABASE_URL });

    try {
        console.log('🔍 Scanning database for users...');

        const tables = ['user_preferences', 'products', 'sales', 'inventory', 'inventory_master'];
        const users = new Set<string>();

        for (const table of tables) {
            // Check if table exists first prevents crash if table missing
            const tableExists = await pool.query(`
        SELECT EXISTS (
           SELECT FROM information_schema.tables 
           WHERE  table_schema = 'public'
           AND    table_name   = $1
        );
      `, [table]);

            if (tableExists.rows[0].exists) {
                try {
                    const result = await pool.query(`SELECT DISTINCT user_id FROM ${table}`);
                    result.rows.forEach(r => {
                        if (r.user_id) users.add(r.user_id);
                    });
                } catch (e) {
                    console.log(`Could not query ${table}: ${e.message}`);
                }
            }
        }

        console.log('\n============== FOUND USERS ==============');
        if (users.size === 0) {
            console.log("No users found in any table.");
        } else {
            users.forEach(u => console.log(`- ${u}`));
        }
        console.log('=========================================\n');

    } catch (error) {
        console.error('Error listing users:', error);
    } finally {
        await pool.end();
    }
}

listUsers();
