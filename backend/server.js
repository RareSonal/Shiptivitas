// server.js
const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// PostgreSQL RDS config
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432, // Default port for PostgreSQL
  ssl: {
    rejectUnauthorized: false, // Use true in production with proper cert
  },
});

// ✅ Test DB connection
pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL (RDS)'))
  .catch(err => console.error('❌ PostgreSQL connection failed:', err));

// 🟢 Get all cards
app.get('/api/cards', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM card');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching cards:', err);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// 🟡 Update card status and priority
app.put('/api/v1/cards/:cardId', async (req, res) => {
  const { cardId } = req.params;
  const { newStatus, newPriority, oldStatus, oldPriority } = req.body;

  if (!newStatus || newPriority === undefined || !oldStatus || oldPriority === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE card
       SET status = $1, priority = $2
       WHERE id = $3`,
      [newStatus, newPriority, cardId]
    );

    await client.query(
      `INSERT INTO card_change_history (cardID, oldStatus, newStatus, oldPriority, newPriority, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [cardId, oldStatus, newStatus, oldPriority, newPriority, timestamp]
    );

    const result = await client.query('SELECT * FROM card');
    await client.query('COMMIT');

    res.status(200).json(result.rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating card:', err);
    res.status(500).json({ error: 'Failed to update card' });
  } finally {
    client.release();
  }
});

// 🔐 Verify PIN only (no user ID required)
app.post('/api/verify-pin', async (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ error: 'Missing PIN' });
  }

  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE pin = $1',
      [String(pin).trim()]
    );

    if (result.rows.length === 1) {
      res.status(200).json({ valid: true, userId: result.rows[0].id });
    } else if (result.rows.length > 1) {
      res.status(401).json({ valid: false, error: 'PIN is not unique. Contact admin.' });
    } else {
      res.status(401).json({ valid: false, error: 'Invalid PIN' });
    }

  } catch (err) {
    console.error('Error verifying PIN:', err);
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
