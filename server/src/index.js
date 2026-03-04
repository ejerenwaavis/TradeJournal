require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Patch all console methods with timestamps
['log', 'error', 'warn', 'info'].forEach((method) => {
  const orig = console[method].bind(console);
  console[method] = (...args) => orig(`[${new Date().toISOString()}]`, ...args);
});

const authRoutes = require('./routes/auth');
const socialAuthRoutes = require('./routes/socialAuth');
const tradeRoutes = require('./routes/trades');
const chartRoutes = require('./routes/charts');
const analyticsRoutes = require('./routes/analytics');
const insightsRoutes = require('./routes/insights');
const backtestProjectRoutes = require('./routes/backtest-projects');

const app = express();
// Passenger injects PORT dynamically — never hardcode a fallback
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Health check â€” available at both /health and /api/health
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/auth', socialAuthRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/charts', chartRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/backtest-projects', backtestProjectRoutes);

app.use('/api/backtest-projects', backtestProjectRoutes);

// ── Serve React frontend (production / Namecheap Passenger) ──────────────────
// Repo layout: server/src/index.js  →  ../../public_html
const FRONTEND_DIR = path.resolve(__dirname, '../../public_html');
app.use(express.static(FRONTEND_DIR));

// SPA catch-all — must come after all /api routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ── Database + server start ───────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    console.log(`Node.js ${process.version} | ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Frontend dir: ${FRONTEND_DIR}`);

    // Passenger sets PORT dynamically — always listen on whatever port it provides
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      console.log('Routes: /api/auth /api/trades /api/charts /api/analytics /api/insights /api/backtest-projects');
    });
  })
  .catch((err) => {
    console.error('MongoDB connection FAILED:', err.message);
    process.exit(1);
  });

// Passenger requires the app to be exported
module.exports = app;
