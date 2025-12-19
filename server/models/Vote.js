const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    // User who cast the vote
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    
    // What type of item is being voted on
    targetType: {
      type: String,
      enum: ['lyrics', 'song', 'element'],
      required: [true, 'Target type is required'],
    },
    
    // The ID of the item being voted on
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Target ID is required'],
    },
    
    // Session this vote belongs to
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session is required'],
    },
    
    // Vote value (1 for simple, variable for weighted)
    value: {
      type: Number,
      default: 1,
      min: 0,
      max: 100,
    },
    
    // User's vote weight at time of voting (snapshot)
    weight: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    
    // For tokenized voting - how many tokens were spent
    tokenAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Calculated total vote power (value * weight + tokenAmount)
    totalPower: {
      type: Number,
      default: 1,
    },
    
    // IP tracking for abuse prevention (hashed)
    ipHash: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent double voting
voteSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });

// Index for session queries
voteSchema.index({ session: 1, targetType: 1 });
voteSchema.index({ targetId: 1, targetType: 1 });
voteSchema.index({ user: 1, session: 1 });

// Pre-save hook to calculate total power
voteSchema.pre('save', function (next) {
  this.totalPower = (this.value * this.weight) + this.tokenAmount;
  next();
});

// Static: Get user's votes for a session
voteSchema.statics.getUserVotesForSession = async function (userId, sessionId, targetType = null) {
  const query = { user: userId, session: sessionId };
  if (targetType) {
    query.targetType = targetType;
  }
  return this.find(query).lean();
};

// Static: Get vote stats for a target
voteSchema.statics.getVoteStats = async function (targetId, targetType) {
  const result = await this.aggregate([
    { $match: { targetId: new mongoose.Types.ObjectId(targetId), targetType } },
    {
      $group: {
        _id: null,
        totalVotes: { $sum: 1 },
        totalValue: { $sum: '$value' },
        totalPower: { $sum: '$totalPower' },
        avgWeight: { $avg: '$weight' },
      },
    },
  ]);
  
  return result[0] || { totalVotes: 0, totalValue: 0, totalPower: 0, avgWeight: 0 };
};

// Static: Get all votes for a target
voteSchema.statics.getVotesForTarget = async function (targetId, targetType) {
  return this.find({ targetId, targetType })
    .populate('user', 'username displayName avatar')
    .sort({ createdAt: -1 })
    .lean();
};

// Static: Check if user voted for a target
voteSchema.statics.hasUserVoted = async function (userId, targetId, targetType) {
  const vote = await this.findOne({ user: userId, targetId, targetType });
  return !!vote;
};

// Static: Get leaderboard for session votes
voteSchema.statics.getSessionVoteLeaderboard = async function (sessionId, targetType, limit = 10) {
  return this.aggregate([
    { $match: { session: new mongoose.Types.ObjectId(sessionId), targetType } },
    {
      $group: {
        _id: '$targetId',
        totalVotes: { $sum: 1 },
        totalPower: { $sum: '$totalPower' },
      },
    },
    { $sort: { totalPower: -1 } },
    { $limit: limit },
  ]);
};

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;

