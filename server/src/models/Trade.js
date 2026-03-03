const mongoose = require('mongoose');

const chartSchema = new mongoose.Schema({
  label: { type: String, default: '' }, // e.g. "Entry", "Higher TF"
  tvLink: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  aiRaw: { type: mongoose.Schema.Types.Mixed, default: null },
});

const tradeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Identity
    instrument: { type: String, required: true, trim: true, uppercase: true }, // e.g. EURUSD, AAPL
    assetClass: { type: String, enum: ['forex', 'stocks'], required: true },
    direction: { type: String, enum: ['long', 'short'], required: true },

    // Price levels
    entryPrice: { type: Number },
    stopLoss: { type: Number },
    takeProfit1: { type: Number },
    takeProfit2: { type: Number },
    riskReward: { type: Number }, // auto-calculated

    // Outcome
    status: { type: String, enum: ['open', 'closed', 'cancelled'], default: 'open' },
    exitPrice: { type: Number },
    pnlPips: { type: Number },
    pnlDollars: { type: Number },
    result: { type: String, enum: ['win', 'loss', 'breakeven', ''], default: '' },

    // Position sizing
    lotSize: { type: Number },
    positionSize: { type: Number },

    // Timing
    entryDate: { type: Date },
    exitDate: { type: Date },
    timeframe: { type: String, enum: ['1M', '5M', '15M', '1H', '4H', 'D', 'W', ''], default: '' },

    // Setup
    setupType: { type: String, default: '' }, // OB, FVG, BOS+MSS, etc.
    confluences: [{ type: String }],
    session: { type: String, enum: ['NY Premarket', 'NY Open', 'NY Lunch', 'NY PM', 'London', 'Asian', 'London', 'NY', 'London/NY Overlap', ''], default: '' },

    // Emotion & execution
    emotionPreTrade: {
      type: String,
      enum: ['Calm', 'Excited', 'Fearful', 'FOMO', 'Revenge', 'Confident', ''],
      default: '',
    },
    emotionPostTrade: {
      type: String,
      enum: ['Calm', 'Excited', 'Fearful', 'FOMO', 'Revenge', 'Confident', ''],
      default: '',
    },
    executionRating: { type: Number, min: 1, max: 5 },

    // Backtest & planning fields
    htfBias:      { type: String, enum: ['Bullish', 'Bearish', 'Neutral', ''], default: '' },
    riskPercent:  { type: Number },
    durationMins: { type: Number },
    account:      { type: String, default: '' },
    tradeType:    { type: String, enum: ['live', 'backtest'], default: 'live' },
    projectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'BacktestProject', default: null },

    // Notes
    preTradeNotes: { type: String, default: '' },
    postTradeNotes: { type: String, default: '' },

    // Charts (max 3)
    charts: { type: [chartSchema], validate: [(arr) => arr.length <= 3, 'Max 3 charts'] },
  },
  { timestamps: true }
);

// Auto-calculate R:R before save
tradeSchema.pre('save', function (next) {
  if (this.entryPrice && this.stopLoss && this.takeProfit1) {
    const risk = Math.abs(this.entryPrice - this.stopLoss);
    const reward = Math.abs(this.takeProfit1 - this.entryPrice);
    this.riskReward = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : null;
  }
  next();
});

module.exports = mongoose.model('Trade', tradeSchema);
