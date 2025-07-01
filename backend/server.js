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

// SQL Server config
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

const pool = new mssql.ConnectionPool(sqlConfig);
const poolConnect = pool.connect();

poolConnect
  .then(() => console.log('✅ Connected to SQL Server'))
  .catch(err => console.error('❌ SQL Server connection failed:', err));

// Get all cards
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

// Update card status and priority
app.put('/api/v1/cards/:cardId', async (req, res) => {
  const { cardId } = req.params;
  const { newStatus, newPriority, oldStatus, oldPriority } = req.body;

  if (!newStatus || newPriority === undefined || !oldStatus || oldPriority === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    await poolConnect;
    const request = pool.request();

    await request
      .input('cardId', mssql.Int, cardId)
      .input('newStatus', mssql.NVarChar, newStatus)
      .input('newPriority', mssql.Int, newPriority)
      .query(`
        UPDATE card
        SET status = @newStatus, priority = @newPriority
        WHERE id = @cardId
      `);

    await pool.request()
      .input('cardId', mssql.Int, cardId)
      .input('oldStatus', mssql.NVarChar, oldStatus)
      .input('newStatusHistory', mssql.NVarChar, newStatus)
      .input('oldPriority', mssql.Int, oldPriority)
      .input('newPriority', mssql.Int, newPriority)
      .input('timestamp', mssql.BigInt, Math.floor(Date.now() / 1000))
      .query(`
        INSERT INTO card_change_history (cardID, oldStatus, newStatus, oldPriority, newPriority, timestamp)
        VALUES (@cardId, @oldStatus, @newStatusHistory, @oldPriority, @newPriority, @timestamp)
      `);

    const result = await pool.request().query('SELECT * FROM card');
    res.status(200).json(result.recordset);

  } catch (err) {
    console.error('Error updating card:', err);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Verify PIN only (no user ID required)
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

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});


