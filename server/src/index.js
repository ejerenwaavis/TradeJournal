require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

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
const PORT = process.env.PORT || 5000;

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

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    console.log(`Node.js ${process.version} | ENV: ${process.env.NODE_ENV || 'development'}`);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Routes: /api/auth /api/trades /api/charts /api/analytics /api/insights /api/backtest-projects');
    });
  })
  .catch((err) => {
    console.error('MongoDB connection FAILED:', err.message);
    process.exit(1);
  });
