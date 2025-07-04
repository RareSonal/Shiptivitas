// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Postgres connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: +process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Verify connectivity
pool
  .connect()
  .then(client => {
    client.release();
    console.log('✅ Connected to PostgreSQL');
  })
  .catch(err => console.error('❌ PG connection error:', err));

// GET /api/cards
app.get('/api/cards', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM card');
    return res.json(rows);
  } catch (err) {
    console.error('Error fetching cards:', err);
    return res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// PUT /api/v1/cards/:cardId
app.put('/api/v1/cards/:cardId', async (req, res) => {
  const { cardId } = req.params;
  const { newStatus, newPriority, oldStatus, oldPriority, userId } = req.body;
  if (!newStatus || newPriority === undefined || !oldStatus || oldPriority === undefined || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'UPDATE card SET status = $1, priority = $2 WHERE id = $3',
      [newStatus, newPriority, cardId]
    );
    const description = `Status: ${oldStatus} → ${newStatus}, Priority: ${oldPriority} → ${newPriority}`;
    const timestamp = Math.floor(Date.now() / 1000);
    await client.query(
      `INSERT INTO card_change_history (cardid, description, changedby, timestamp)
       VALUES ($1, $2, $3, to_timestamp($4))`,
      [cardId, description, userId, timestamp]
    );
    await client.query('COMMIT');

    const { rows } = await pool.query('SELECT * FROM card');
    return res.json(rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating card:', err);
    return res.status(500).json({ error: 'Failed to update card' });
  } finally {
    client.release();
  }
});

// POST /api/card-change
app.post('/api/card-change', async (req, res) => {
  const { card_id, change_description, changed_by } = req.body;
  if (!card_id || !change_description || !changed_by) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    await pool.query(
      `INSERT INTO card_change_history (cardid, description, changedby, timestamp)
       VALUES ($1, $2, $3, to_timestamp($4))`,
      [card_id, change_description, changed_by, timestamp]
    );
    return res.json({ message: 'Card change logged successfully' });
  } catch (err) {
    console.error('Error logging card change:', err);
    return res.status(500).json({ error: 'Failed to log card change' });
  }
});

// POST /api/verify-pin
app.post('/api/verify-pin', async (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    return res.status(400).json({ error: 'Missing PIN' });
  }

  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE pin = $1', [String(pin).trim()]);
    if (rows.length === 1) {
      return res.json({ valid: true, userId: rows[0].id });
    } else if (rows.length > 1) {
      return res.status(401).json({ valid: false, error: 'PIN is not unique. Contact admin.' });
    } else {
      return res.status(401).json({ valid: false, error: 'Invalid PIN' });
    }
  } catch (err) {
    console.error('Error verifying PIN:', err);
    return res.status(500).json({ error: 'Failed to verify PIN' });
  }
});

app.listen(port, () => console.log(`🚀 Server listening on port ${port}`));
