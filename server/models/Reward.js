const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'lyrics-winner',
        'stem-accepted',
        'top-voter',
        'streak',
        'badge-earned',
        'competition-winner',
        'referral',
        'tip-received',
        'royalty',
        'session-host',
        'daily-bonus',
      ],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ['reputation', 'tokens', 'usd'],
      default: 'reputation',
    },
    source: {
      sessionId: { type: mongoose.Schema.ObjectId, ref: 'Session' },
      songId: { type: mongoose.Schema.ObjectId, ref: 'Song' },
      competitionId: { type: mongoose.Schema.ObjectId, ref: 'ElementCompetition' },
      lyricsId: { type: mongoose.Schema.ObjectId, ref: 'LyricsSubmission' },
      fromUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
    },
    description: {
      type: String,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: ['pending', 'credited', 'paid-out', 'cancelled'],
      default: 'pending',
    },
    creditedAt: {
      type: Date,
    },
    paidOutAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
rewardSchema.index({ user: 1, createdAt: -1 });
rewardSchema.index({ user: 1, status: 1 });
rewardSchema.index({ user: 1, type: 1 });
rewardSchema.index({ status: 1, createdAt: 1 }); // For batch processing

// Method to credit reward
rewardSchema.methods.credit = async function() {
  if (this.status !== 'pending') {
    throw new Error('Reward already processed');
  }
  
  this.status = 'credited';
  this.creditedAt = new Date();
  await this.save();
  
  return this;
};

// Method to mark as paid out
rewardSchema.methods.payout = async function() {
  if (this.status !== 'credited') {
    throw new Error('Reward not ready for payout');
  }
  
  this.status = 'paid-out';
  this.paidOutAt = new Date();
  await this.save();
  
  return this;
};

// Static to get pending rewards for user
rewardSchema.statics.getPending = async function(userId) {
  return this.find({ user: userId, status: 'pending' })
    .sort('-createdAt')
    .lean();
};

// Static to get user's reward history
rewardSchema.statics.getHistory = async function(userId, options = {}) {
  const { limit = 50, skip = 0, type } = options;
  
  const query = { user: userId };
  if (type) query.type = type;
  
  return this.find(query)
    .sort('-createdAt')
    .skip(skip)
    .limit(limit)
    .lean();
};

// Static to get earnings summary
rewardSchema.statics.getEarningsSummary = async function(userId) {
  const results = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: { type: '$type', currency: '$currency', status: '$status' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);
  
  const summary = {
    total: { reputation: 0, tokens: 0, usd: 0 },
    pending: { reputation: 0, tokens: 0, usd: 0 },
    credited: { reputation: 0, tokens: 0, usd: 0 },
    byType: {},
  };
  
  results.forEach(r => {
    const { type, currency, status } = r._id;
    summary[status][currency] = (summary[status][currency] || 0) + r.total;
    summary.total[currency] = (summary.total[currency] || 0) + r.total;
    
    if (!summary.byType[type]) {
      summary.byType[type] = { reputation: 0, tokens: 0, usd: 0, count: 0 };
    }
    summary.byType[type][currency] += r.total;
    summary.byType[type].count += r.count;
  });
  
  return summary;
};

module.exports = mongoose.model('Reward', rewardSchema);

