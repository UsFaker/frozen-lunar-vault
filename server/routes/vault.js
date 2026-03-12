const express = require('express');
const crypto = require('crypto');
const appDb = require('../db');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5 // limit each IP to 5 auth attempts per 1 minute
});

// Auth endpoint: Validate hash and create session
router.post('/auth', authLimiter, (req, res) => {
  const { unlockHash } = req.body;
  const validHash = process.env.UNLOCK_HASH;
  console.log("Auth attempt:", { incomingHash: unlockHash, expectedHash: validHash, body: req.body });

  if (unlockHash !== validHash) {
    console.log("Hash mismatch!")
    return res.status(401).json({ error: 'Invalid unlock pattern' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiryHours = parseInt(process.env.SESSION_EXPIRY_HOURS || '24', 10);
  const expiresAt = Date.now() + expiryHours * 60 * 60 * 1000;

  const stmt = appDb.prepare('INSERT INTO sessions (token, created_at, expires_at) VALUES (?, ?, ?)');
  stmt.run(token, Date.now(), expiresAt);

  res.json({ token, expiresAt });
});

router.use(authenticate);

router.get('/entries', (req, res) => {
  const stmt = appDb.prepare('SELECT id, category, created_at, updated_at FROM entries ORDER BY updated_at DESC');
  const entries = stmt.all();
  res.json(entries);
});

router.get('/entries/:id', (req, res) => {
  const { id } = req.params;
  const stmt = appDb.prepare('SELECT * FROM entries WHERE id = ?');
  const entry = stmt.get(id);
  
  if (!entry) return res.status(404).json({ error: 'Not found' });
  res.json(entry);
});

router.post('/entries', (req, res) => {
  const { category, encrypted_data, iv } = req.body;
  if (!category || !encrypted_data || !iv) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  
  const stmt = appDb.prepare('INSERT INTO entries (id, category, encrypted_data, iv, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)');
  try {
    stmt.run(id, category, encrypted_data, iv, now, now);
    res.status(201).json({ id, category, created_at: now, updated_at: now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.put('/entries/:id', (req, res) => {
  const { id } = req.params;
  const { category, encrypted_data, iv } = req.body;
  const now = Date.now();
  
  const stmt = appDb.prepare('UPDATE entries SET category = ?, encrypted_data = ?, iv = ?, updated_at = ? WHERE id = ?');
  const result = stmt.run(category, encrypted_data, iv, now, id);
  
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true, updated_at: now });
});

router.delete('/entries/:id', (req, res) => {
  const { id } = req.params;
  const stmt = appDb.prepare('DELETE FROM entries WHERE id = ?');
  const result = stmt.run(id);
  
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
