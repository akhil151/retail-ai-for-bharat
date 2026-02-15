import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:hi@localhost:5432/marketplace'
});

async function addUserPreferences() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL UNIQUE,
        platforms TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ user_preferences table created');
    await pool.end();
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
}

addUserPreferences();
