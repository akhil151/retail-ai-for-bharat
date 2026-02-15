import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pgTable, text, serial, varchar, timestamp } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';

// Define schema locally to avoid import issues
const userPreferences = pgTable('user_preferences', {
    id: serial('id').primaryKey(),
    userId: varchar('user_id', { length: 255 }).notNull().unique(),
    platforms: text('platforms').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

async function main() {
    console.log('🔍 Debugging Auth/DB...');

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ DATABASE_URL is not set!');
        return;
    }
    console.log('✓ DATABASE_URL found');

    const pool = new Pool({ connectionString });
    const db = drizzle(pool);

    try {
        // 1. Check table existence
        const tableResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_preferences'
    `);

        if (tableResult.rows.length === 0) {
            console.error('❌ Table user_preferences DOES NOT EXIST!');
            // List all tables
            const allTables = await pool.query(`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
      `);
            console.log('Tables found:', allTables.rows.map(r => r.table_name).join(', '));
            return;
        }
        console.log('✓ Table user_preferences exists');

        // 2. Try Insertion (Signup logic)
        const testEmail = 'debug_test@example.com';
        const testPlatforms = ['Amazon', 'Flipkart'];

        console.log(`Testing insert for ${testEmail}...`);
        await db.insert(userPreferences).values({
            userId: testEmail,
            platforms: JSON.stringify(testPlatforms)
        }).onConflictDoUpdate({
            target: userPreferences.userId,
            set: { platforms: JSON.stringify(testPlatforms), updatedAt: new Date() }
        });
        console.log('✓ Insert/Update successful');

        // 3. Try Selection (Login logic)
        console.log(`Testing select for ${testEmail}...`);
        const prefs = await db.select().from(userPreferences).where(eq(userPreferences.userId, testEmail));

        if (prefs.length > 0) {
            console.log('✓ Record found:', prefs[0]);
            console.log('Platforms:', JSON.parse(prefs[0].platforms));
        } else {
            console.error('❌ Record NOT found after insert!');
        }

    } catch (error) {
        console.error('❌ Error during DB operations:', error);
    } finally {
        await pool.end();
    }
}

main();
