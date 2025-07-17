// server.js
import express from 'express';
import pkg from 'pg';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const { Pool } = pkg;

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// PostgreSQL config
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432, // default PostgreSQL port
});

// Test connection
pool.connect()
  .then(client => {
    console.log('✅ Connected to PostgreSQL');
    client.release();
  })
  .catch(err => console.error('❌ PostgreSQL connection failed:', err));

// ------------------------
// 📌 GET all cards
// ------------------------
app.get('/api/cards', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM card ORDER BY id');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching cards:', err);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// ------------------------
// 🔁 PUT Update card status/priority
// ------------------------
app.put('/api/v1/cards/:cardId', async (req, res) => {
  const { cardId } = req.params;
  const { newStatus, newPriority, oldStatus, oldPriority } = req.body;

  if (!newStatus || newPriority === undefined || !oldStatus || oldPriority === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update card
    await client.query(
      `UPDATE card SET status = $1, priority = $2 WHERE id = $3`,
      [newStatus, newPriority, cardId]
    );

    // Insert into change history
    await client.query(
      `INSERT INTO card_change_history (cardID, oldStatus, newStatus, oldPriority, newPriority, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [cardId, oldStatus, newStatus, oldPriority, newPriority, Math.floor(Date.now() / 1000)]
    );

    // Fetch updated cards
    const result = await client.query('SELECT * FROM card ORDER BY id');
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

// ------------------------
// 🔐 POST Verify user PIN
// ------------------------
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
      const user = result.rows[0];
      res.status(200).json({ valid: true, userId: user.id });
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

// ------------------------
// 🚀 Start server
// ------------------------
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
