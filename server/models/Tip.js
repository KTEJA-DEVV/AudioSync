const mongoose = require('mongoose');

const tipSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    to: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      enum: ['tokens', 'usd'],
      default: 'tokens',
    },
    message: {
      type: String,
      maxlength: 200,
      trim: true,
    },
    session: {
      type: mongoose.Schema.ObjectId,
      ref: 'Session',
    },
    song: {
      type: mongoose.Schema.ObjectId,
      ref: 'Song',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'refunded', 'failed'],
      default: 'pending',
    },
    completedAt: {
      type: Date,
    },
    paymentDetails: {
      provider: String, // stripe, paypal, etc.
      transactionId: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
tipSchema.index({ from: 1, createdAt: -1 });
tipSchema.index({ to: 1, createdAt: -1 });
tipSchema.index({ session: 1, createdAt: -1 });
tipSchema.index({ status: 1, createdAt: 1 });

// Prevent self-tipping
tipSchema.pre('save', function(next) {
  if (this.from.equals(this.to)) {
    return next(new Error('Cannot tip yourself'));
  }
  next();
});

// Method to complete tip
tipSchema.methods.complete = async function(transactionId = null) {
  if (this.status !== 'pending') {
    throw new Error('Tip already processed');
  }
  
  this.status = 'completed';
  this.completedAt = new Date();
  if (transactionId) {
    this.paymentDetails.transactionId = transactionId;
  }
  await this.save();
  
  return this;
};

// Method to refund tip
tipSchema.methods.refund = async function() {
  if (this.status !== 'completed') {
    throw new Error('Can only refund completed tips');
  }
  
  this.status = 'refunded';
  await this.save();
  
  return this;
};

// Static to get tips received by user
tipSchema.statics.getReceived = async function(userId, options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  return this.find({ to: userId, status: 'completed' })
    .populate('from', 'username displayName avatar')
    .populate('session', 'title')
    .populate('song', 'title')
    .sort('-completedAt')
    .skip(skip)
    .limit(limit)
    .lean();
};

// Static to get tips sent by user
tipSchema.statics.getSent = async function(userId, options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  return this.find({ from: userId })
    .populate('to', 'username displayName avatar')
    .populate('session', 'title')
    .populate('song', 'title')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit)
    .lean();
};

// Static to get tip totals for user
tipSchema.statics.getTotals = async function(userId) {
  const [received, sent] = await Promise.all([
    this.aggregate([
      { $match: { to: new mongoose.Types.ObjectId(userId), status: 'completed' } },
      {
        $group: {
          _id: '$currency',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    this.aggregate([
      { $match: { from: new mongoose.Types.ObjectId(userId), status: { $in: ['completed', 'pending'] } } },
      {
        $group: {
          _id: '$currency',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);
  
  const format = (arr) => arr.reduce((acc, r) => {
    acc[r._id] = { total: r.total, count: r.count };
    return acc;
  }, { tokens: { total: 0, count: 0 }, usd: { total: 0, count: 0 } });
  
  return {
    received: format(received),
    sent: format(sent),
  };
};

// Static to get top tippers for a session
tipSchema.statics.getTopTippers = async function(sessionId, limit = 10) {
  return this.aggregate([
    { $match: { session: new mongoose.Types.ObjectId(sessionId), status: 'completed' } },
    {
      $group: {
        _id: '$from',
        totalAmount: { $sum: '$amount' },
        tipCount: { $sum: 1 },
      },
    },
    { $sort: { totalAmount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        username: '$user.username',
        displayName: '$user.displayName',
        avatar: '$user.avatar',
        totalAmount: 1,
        tipCount: 1,
      },
    },
  ]);
};

module.exports = mongoose.model('Tip', tipSchema);

