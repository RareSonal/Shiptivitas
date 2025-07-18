// backend/seed_db.js

import fs from 'fs';
import path from 'path';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Client } = pkg;

const ACTION = process.argv[3];
const REQUIRED_TABLES = ['users', 'card', 'card_change_history', 'login_history'];
const SQL_FILE = process.env.SQL_FILE || 'shiptivitas_postgres.sql';

const DB_CONFIG = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
};

const run = async () => {
  if (!['seed', 'verify'].includes(ACTION)) {
    console.error(JSON.stringify({ message: '❌ Invalid action. Use "seed" or "verify".' }));
    process.exit(1);
  }

  const client = new Client(DB_CONFIG);

  try {
    await client.connect();

    if (ACTION === 'seed') {
      await client.query(`
        CREATE TABLE IF NOT EXISTS seed_metadata (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      const res = await client.query("SELECT value FROM seed_metadata WHERE key = 'db_seeded';");
      if (res.rows[0]?.value === 'true') {
        console.log(JSON.stringify({ message: '✅ DB already seeded. Skipping.' }));
        return;
      }

      // Check for missing tables
      const missingTables = [];
      for (const table of REQUIRED_TABLES) {
        const result = await client.query(`
          SELECT to_regclass('public.${table}');
        `);
        if (!result.rows[0].to_regclass) missingTables.push(table);
      }

      if (missingTables.length === 0) {
        await client.query(`
          INSERT INTO seed_metadata (key, value)
          VALUES ('db_seeded', 'true')
          ON CONFLICT (key) DO NOTHING;
          `);

        console.log(JSON.stringify({
          message: '✅ All required tables already exist. Skipping seed and marking as seeded.',
          checked_tables: REQUIRED_TABLES
          }, null, 2));
          return;
        }


      // Seed DB from SQL file
      const sql = fs.readFileSync(path.resolve(SQL_FILE), 'utf8');
      await client.query(sql);

      await client.query(`
        INSERT INTO seed_metadata (key, value)
        VALUES ('db_seeded', 'true');
      `);

      console.log(JSON.stringify({ message: '✅ DB seeded successfully.' }));
    }

    if (ACTION === 'verify') {
      const existingRes = await client.query(`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public';
      `);
      const existingTables = existingRes.rows.map(row => row.tablename);

      const sampleData = {};
      for (const table of REQUIRED_TABLES) {
        if (existingTables.includes(table)) {
          try {
            const result = await client.query(`SELECT * FROM ${table} ORDER BY random() LIMIT 10`);
            sampleData[table] = result.rows;
          } catch (e) {
            sampleData[table] = `Error fetching data: ${e.message}`;
          }
        } else {
          sampleData[table] = 'Table does not exist';
        }
      }

      console.log(JSON.stringify({
        message: '✅ Verification complete.',
        tables: existingTables,
        sample_data: sampleData
      }, null, 2));
    }

  } catch (err) {
    console.error(JSON.stringify({
      message: '❌ Operation failed.',
      error: err.message,
      stack: err.stack,
    }));
    process.exit(1);
  } finally {
    await client.end();
  }
};

run();
