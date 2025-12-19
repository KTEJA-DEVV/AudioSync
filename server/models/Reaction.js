const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.ObjectId,
      ref: 'LiveSession',
      required: true,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['fire', 'heart', 'clap', 'mindblown', 'rocket', 'hundred'],
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// TTL index to auto-delete after 1 hour (for burst tracking only)
reactionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

// Index for querying recent reactions
reactionSchema.index({ session: 1, createdAt: -1 });
reactionSchema.index({ session: 1, type: 1, createdAt: -1 });

// Rate limit: prevent same user from spamming same reaction
reactionSchema.index({ session: 1, user: 1, type: 1, createdAt: -1 });

// Reaction emoji mapping
reactionSchema.statics.REACTION_EMOJIS = {
  fire: '🔥',
  heart: '❤️',
  clap: '👏',
  mindblown: '🤯',
  rocket: '🚀',
  hundred: '💯',
};

// Static to check rate limit (max 1 reaction per type per 2 seconds)
reactionSchema.statics.checkRateLimit = async function(sessionId, userId, type) {
  const twoSecondsAgo = new Date(Date.now() - 2000);
  const recentReaction = await this.findOne({
    session: sessionId,
    user: userId,
    type,
    createdAt: { $gte: twoSecondsAgo },
  });
  return !recentReaction;
};

// Static to get reaction counts for last N seconds
reactionSchema.statics.getRecentCounts = async function(sessionId, seconds = 60) {
  const since = new Date(Date.now() - seconds * 1000);
  
  const counts = await this.aggregate([
    { $match: { session: new mongoose.Types.ObjectId(sessionId), createdAt: { $gte: since } } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
  ]);
  
  const result = { fire: 0, heart: 0, clap: 0, mindblown: 0, rocket: 0, hundred: 0 };
  counts.forEach(c => {
    result[c._id] = c.count;
  });
  
  return result;
};

// Static to get total reactions per minute
reactionSchema.statics.getReactionsPerMinute = async function(sessionId) {
  const oneMinuteAgo = new Date(Date.now() - 60000);
  const count = await this.countDocuments({
    session: sessionId,
    createdAt: { $gte: oneMinuteAgo },
  });
  return count;
};

// Static to detect burst (many reactions in short time)
reactionSchema.statics.detectBurst = async function(sessionId, threshold = 20, seconds = 5) {
  const since = new Date(Date.now() - seconds * 1000);
  const count = await this.countDocuments({
    session: sessionId,
    createdAt: { $gte: since },
  });
  return count >= threshold;
};

module.exports = mongoose.model('Reaction', reactionSchema);

