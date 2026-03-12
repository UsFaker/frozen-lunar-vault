require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const vaultRoutes = require('./routes/vault');

const app = express();
const PORT = process.env.PORT || 3000;

// Security and utility middlewares
app.use(helmet({
  contentSecurityPolicy: false, // For easier dev; enable strictly in prod
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// API Routes
app.use('/api', vaultRoutes);

// Static files (Frontend)
app.use(express.static(path.join(__dirname, '../public')));

// SPA fallback for frontend paths
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
