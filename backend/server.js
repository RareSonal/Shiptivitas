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
const useSSL = process.env.DB_SSL === 'true';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

// Test DB connection
pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL (RDS)'))
  .catch(err => console.error('❌ PostgreSQL connection failed:', err));

// Get all cards, ordered by status and priority
app.get('/api/cards', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM card
       ORDER BY 
         CASE 
           WHEN status = 'backlog' THEN 1
           WHEN status = 'in-progress' THEN 2
           WHEN status = 'complete' THEN 3
           ELSE 4
         END,
         priority ASC`
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching cards:', err);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Update card status and priority with priority shifting
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

    // 1. Shift priorities in old status swimlane if status changed or priority changed
    if (oldStatus === newStatus) {
      // Same swimlane: Adjust priorities accordingly

      if (newPriority < oldPriority) {
        // Moved up in priority - increment priority of cards between newPriority and oldPriority -1
        await client.query(
          `UPDATE card
           SET priority = priority + 1
           WHERE status = $1
             AND priority >= $2
             AND priority < $3
             AND id <> $4`,
          [newStatus, newPriority, oldPriority, cardId]
        );
      } else if (newPriority > oldPriority) {
        // Moved down in priority - decrement priority of cards between oldPriority +1 and newPriority
        await client.query(
          `UPDATE card
           SET priority = priority - 1
           WHERE status = $1
             AND priority <= $2
             AND priority > $3
             AND id <> $4`,
          [newStatus, newPriority, oldPriority, cardId]
        );
      }
      // else same priority, no change needed

    } else {
      // Status changed: decrement old swimlane cards with priority > oldPriority
      await client.query(
        `UPDATE card
         SET priority = priority - 1
         WHERE status = $1
           AND priority > $2
           AND id <> $3`,
        [oldStatus, oldPriority, cardId]
      );

      // Increment new swimlane cards with priority >= newPriority
      await client.query(
        `UPDATE card
         SET priority = priority + 1
         WHERE status = $1
           AND priority >= $2
           AND id <> $3`,
        [newStatus, newPriority, cardId]
      );
    }

    // 2. Update the card with new status and priority
    await client.query(
      `UPDATE card
       SET status = $1, priority = $2
       WHERE id = $3`,
      [newStatus, newPriority, cardId]
    );

    // 3. Log the change
    await client.query(
      `INSERT INTO card_change_history 
       (cardID, oldStatus, newStatus, oldPriority, newPriority, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [cardId, oldStatus, newStatus, oldPriority, newPriority, timestamp]
    );

    // 4. Return all cards ordered by status and priority
    const result = await client.query(
      `SELECT * FROM card
       ORDER BY 
         CASE 
           WHEN status = 'backlog' THEN 1
           WHEN status = 'in-progress' THEN 2
           WHEN status = 'complete' THEN 3
           ELSE 4
         END,
         priority ASC`
    );

    await client.query('COMMIT');

    res.status(200).json(result.rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating card:', err);
    res.status(500).json({
      error: 'Failed to update card',
      details: err.message,
    });
  } finally {
    client.release();
  }
});

// Verify PIN only
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

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${port}`);
});
