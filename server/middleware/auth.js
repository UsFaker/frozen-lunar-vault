const db = require('../db');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  const stmt = db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?');
  const session = stmt.get(token, Date.now());

  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  next();
};

module.exports = { authenticate };
