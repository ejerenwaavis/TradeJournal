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
// Passenger injects PORT dynamically; fallback to 5000 for local dev
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Health check — includes DB readyState to diagnose connection issues
// readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
app.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStateLabel = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';
  res.json({
    status: 'ok',
    ts: new Date().toISOString(),
    db: dbStateLabel,
    mongoUriSet: !!process.env.MONGODB_URI,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/auth', socialAuthRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/charts', chartRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/insights', insightsRoutes);
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
console.log(`MONGODB_URI configured: ${!!process.env.MONGODB_URI}`);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    console.log(`Node.js ${process.version} | ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Frontend dir: ${FRONTEND_DIR}`);
  })
  .catch((err) => {
    // Log the error but do NOT exit — Passenger must keep running so /health still responds
    console.error('MongoDB connection FAILED:', err.message);
  });

// Listen immediately — do not gate on MongoDB connect
// Passenger may use module.exports instead, but calling listen is harmless and ensures local dev works
const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log('Routes: /api/auth /api/trades /api/charts /api/analytics /api/insights /api/backtest-projects');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is busy, trying port ${port + 1}...`);
      startServer(port + 1);
      return;
    }
    throw err;
  });
};

startServer(PORT);

// Passenger requires the app to be exported
module.exports = app;
