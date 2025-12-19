const mongoose = require('mongoose');

const reputationTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true, // Can be positive or negative
    },
    type: {
      type: String,
      enum: [
        'vote-received',
        'submission-accepted',
        'lyrics-won',
        'stem-accepted',
        'feedback-given',
        'report-correct',
        'streak-bonus',
        'badge-bonus',
        'level-up-bonus',
        'tip-received',
        'tip-sent',
        'decay',
        'penalty',
        'admin-adjustment',
        'competition-win',
        'session-hosted',
      ],
      required: true,
    },
    source: {
      sessionId: { type: mongoose.Schema.ObjectId, ref: 'Session' },
      songId: { type: mongoose.Schema.ObjectId, ref: 'Song' },
      lyricsId: { type: mongoose.Schema.ObjectId, ref: 'LyricsSubmission' },
      stemId: { type: mongoose.Schema.ObjectId, ref: 'StemUpload' },
      voteId: { type: mongoose.Schema.ObjectId, ref: 'Vote' },
      fromUserId: { type: mongoose.Schema.ObjectId, ref: 'User' },
      badgeId: String,
    },
    description: {
      type: String,
      maxlength: 200,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
reputationTransactionSchema.index({ user: 1, createdAt: -1 });
reputationTransactionSchema.index({ user: 1, type: 1 });
reputationTransactionSchema.index({ createdAt: -1 });

// Static to log transaction
reputationTransactionSchema.statics.log = async function(userId, amount, type, source, balanceAfter, description = null) {
  return this.create({
    user: userId,
    amount,
    type,
    source,
    balanceAfter,
    description,
  });
};

// Static to get user's transaction history
reputationTransactionSchema.statics.getHistory = async function(userId, options = {}) {
  const { limit = 50, skip = 0, type } = options;
  
  const query = { user: userId };
  if (type) query.type = type;
  
  return this.find(query)
    .sort('-createdAt')
    .skip(skip)
    .limit(limit)
    .lean();
};

// Static to get reputation changes summary
reputationTransactionSchema.statics.getSummary = async function(userId, since = null) {
  const match = { user: new mongoose.Types.ObjectId(userId) };
  if (since) {
    match.createdAt = { $gte: since };
  }
  
  const results = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
  ]);
  
  let totalGained = 0;
  let totalLost = 0;
  
  results.forEach(r => {
    if (r.total > 0) totalGained += r.total;
    else totalLost += Math.abs(r.total);
  });
  
  return {
    byType: results.reduce((acc, r) => {
      acc[r._id] = { total: r.total, count: r.count };
      return acc;
    }, {}),
    totalGained,
    totalLost,
    net: totalGained - totalLost,
  };
};

// Static to get leaderboard changes
reputationTransactionSchema.statics.getRecentChanges = async function(since, limit = 100) {
  return this.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: '$user',
        totalChange: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
      },
    },
    { $sort: { totalChange: -1 } },
    { $limit: limit },
  ]);
};

module.exports = mongoose.model('ReputationTransaction', reputationTransactionSchema);

