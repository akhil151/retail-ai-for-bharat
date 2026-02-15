import 'dotenv/config';
import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set in .env file');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    const sql = readFileSync(join(process.cwd(), 'migrations', 'init.sql'), 'utf-8');
    await pool.query(sql);
    console.log('✓ Database tables created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
