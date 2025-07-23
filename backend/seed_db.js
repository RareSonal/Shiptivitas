// seed_db.js
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const TABLES_TO_CHECK = ['users', 'card', 'card_change_history', 'login_history'];
const SQL_FILE_PATH = path.join(__dirname, 'shiptivitas_postgres.sql'); 

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const action = process.argv[2] || 'verify';

(async () => {
  const client = await pool.connect();

  try {
    if (action === 'seed') {
      console.log('⏳ Seeding database...');

      // Create seed_metadata table if not exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS seed_metadata (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      const { rows } = await client.query(`SELECT value FROM seed_metadata WHERE key = 'db_seeded';`);
      if (rows.length && rows[0].value === 'true') {
        console.log('✅ DB already seeded. Skipping.');
        return;
      }

      // Check if all required tables exist
      const missingTables = [];
      for (const table of TABLES_TO_CHECK) {
        const res = await client.query(`SELECT to_regclass('public.${table}')`);
        if (!res.rows[0].to_regclass) {
          missingTables.push(table);
        }
      }

      if (missingTables.length === 0) {
        await client.query(`
          INSERT INTO seed_metadata (key, value)
          VALUES ('db_seeded', 'true')
          ON CONFLICT (key) DO NOTHING;
        `);
        console.log('✅ Tables already exist. Marker set. Skipping seeding.');
        return;
      }

      // Read and execute SQL file
      const sql = fs.readFileSync(SQL_FILE_PATH, 'utf8');
      await client.query(sql);
      await client.query(`INSERT INTO seed_metadata (key, value) VALUES ('db_seeded', 'true');`);
      console.log('✅ DB seeded successfully.');
    }

    else if (action === 'verify') {
      console.log('🔍 Verifying tables and fetching 10 random rows...');

      const { rows: tables } = await client.query(`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public';
      `);

      const existingTables = tables.map(row => row.tablename);
      const sampleData = {};

      for (const table of TABLES_TO_CHECK) {
        if (existingTables.includes(table)) {
          try {
            const result = await client.query(`SELECT * FROM ${table} ORDER BY random() LIMIT 10`);
            sampleData[table] = result.rows;
          } catch (e) {
            sampleData[table] = `❌ Error: ${e.message}`;
          }
        } else {
          sampleData[table] = '⚠️ Table does not exist';
        }
      }

      console.log('✅ Verification complete.\n');
      console.log('Existing Tables:', existingTables);
      console.log('Sample Data:\n', JSON.stringify(sampleData, null, 2));
    }

    else {
      console.error("❌ Invalid action. Use: 'node seed_db.js seed' or 'node seed_db.js verify'");
    }

  } catch (err) {
    console.error('❌ Operation failed:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    process.exit();
  }
})();
