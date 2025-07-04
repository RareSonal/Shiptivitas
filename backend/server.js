// server.js
import express from 'express';
import mssql from 'mssql';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// SQL Server configuration
const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

// MSSQL connection pool
const pool = new mssql.ConnectionPool(sqlConfig);
const poolConnect = pool.connect();

poolConnect
  .then(() => console.log('✅ Connected to SQL Server'))
  .catch((err) => console.error('❌ SQL Server connection failed:', err));

/**
 * GET /api/cards
 * Fetch all cards
 */
app.get('/api/cards', async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query('SELECT * FROM card');
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching cards:', err);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

/**
 * PUT /api/v1/cards/:cardId
 * Update a card's status and priority
 */
app.put('/api/v1/cards/:cardId', async (req, res) => {
  const { cardId } = req.params;
  const { newStatus, newPriority, oldStatus, oldPriority, userId } = req.body;

  if (
    !newStatus ||
    newPriority === undefined ||
    !oldStatus ||
    oldPriority === undefined ||
    !userId
  ) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await poolConnect;

    // Update the card
    await pool.request()
      .input('cardId', mssql.Int, cardId)
      .input('newStatus', mssql.NVarChar, newStatus)
      .input('newPriority', mssql.Int, newPriority)
      .query(`
        UPDATE card
        SET status = @newStatus, priority = @newPriority
        WHERE id = @cardId
      `);

    // Log the change
    const description = `Status: ${oldStatus} → ${newStatus}, Priority: ${oldPriority} → ${newPriority}`;
    const timestamp = Math.floor(Date.now() / 1000);

    await pool.request()
      .input('cardID', mssql.Int, cardId)
      .input('description', mssql.NVarChar, description)
      .input('changedBy', mssql.Int, userId)
      .input('timestamp', mssql.BigInt, timestamp)
      .query(`
        INSERT INTO card_change_history (cardID, description, changedBy, timestamp)
        VALUES (@cardID, @description, @changedBy, @timestamp)
      `);

    // Return updated cards
    const result = await pool.request().query('SELECT * FROM card');
    res.status(200).json(result.recordset);

  } catch (err) {
    console.error('Error updating card:', err);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

/**
 * POST /api/card-change
 * Log a manual card change event (called from handleCardChange)
 */
app.post('/api/card-change', async (req, res) => {
  const { card_id, change_description, changed_by } = req.body;

  if (!card_id || !change_description || !changed_by) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await poolConnect;
    const timestamp = Math.floor(Date.now() / 1000);

    await pool.request()
      .input('cardID', mssql.Int, card_id)
      .input('description', mssql.NVarChar, change_description)
      .input('changedBy', mssql.Int, changed_by)
      .input('timestamp', mssql.BigInt, timestamp)
      .query(`
        INSERT INTO card_change_history (cardID, description, changedBy, timestamp)
        VALUES (@cardID, @description, @changedBy, @timestamp)
      `);

    res.status(200).json({ message: 'Card change logged successfully' });

  } catch (err) {
    console.error('Error logging card change:', err);
    res.status(500).json({ error: 'Failed to log card change' });
  }
});

/**
 * POST /api/verify-pin
 * Authenticate a user by their 4-digit PIN
 */
app.post('/api/verify-pin', async (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ error: 'Missing PIN' });
  }

  try {
    await poolConnect;

    const result = await pool.request()
      .input('pin', mssql.VarChar, String(pin).trim())
      .query('SELECT id FROM users WHERE pin = @pin');

    if (result.recordset.length === 1) {
      const user = result.recordset[0];
      res.status(200).json({ valid: true, userId: user.id });
    } else if (result.recordset.length > 1) {
      res.status(401).json({ valid: false, error: 'PIN is not unique. Contact admin.' });
    } else {
      res.status(401).json({ valid: false, error: 'Invalid PIN' });
    }

  } catch (err) {
    console.error('Error verifying PIN:', err);
    res.status(500).json({ error: 'Failed to verify PIN' });
  }
});

/**
 * Start the server
 */
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
