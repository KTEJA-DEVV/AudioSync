const mongoose = require('mongoose');

const userFeedbackLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      default: null, // Null for anonymous users
    },
    session: {
      type: mongoose.Schema.ObjectId,
      ref: 'Session',
      required: true,
    },
    words: {
      type: [String],
      required: true,
      validate: {
        validator: function(arr) {
          return arr.length > 0 && arr.length <= 10;
        },
        message: 'Words array must contain 1-10 words',
      },
    },
    inputMethod: {
      type: String,
      enum: ['text', 'voice'],
      default: 'text',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: false, // We use submittedAt instead
  }
);

// Index for user rate limiting
userFeedbackLogSchema.index({ user: 1, session: 1, submittedAt: -1 });

// Index for IP-based rate limiting (anonymous users)
userFeedbackLogSchema.index({ ipAddress: 1, session: 1, submittedAt: -1 });

// Index for session analytics
userFeedbackLogSchema.index({ session: 1, submittedAt: -1 });

// Static method to check rate limit
userFeedbackLogSchema.statics.checkRateLimit = async function(sessionId, userId, ipAddress, cooldownSeconds) {
  const cooldownTime = new Date(Date.now() - cooldownSeconds * 1000);
  
  const query = userId
    ? { session: sessionId, user: userId, submittedAt: { $gte: cooldownTime } }
    : { session: sessionId, ipAddress, user: null, submittedAt: { $gte: cooldownTime } };
  
  const recentSubmission = await this.findOne(query);
  
  if (recentSubmission) {
    const waitTime = Math.ceil((recentSubmission.submittedAt.getTime() + cooldownSeconds * 1000 - Date.now()) / 1000);
    return { limited: true, waitSeconds: waitTime };
  }
  
  return { limited: false, waitSeconds: 0 };
};

// Static method to get user's word count in session
userFeedbackLogSchema.statics.getUserWordCount = async function(sessionId, userId, ipAddress) {
  const query = userId
    ? { session: sessionId, user: userId }
    : { session: sessionId, ipAddress, user: null };
  
  const logs = await this.find(query);
  
  return logs.reduce((total, log) => total + log.words.length, 0);
};

// Static method to get most active contributors
userFeedbackLogSchema.statics.getActiveContributors = async function(sessionId, limit = 10) {
  return this.aggregate([
    { $match: { session: new mongoose.Types.ObjectId(sessionId), user: { $ne: null } } },
    { $unwind: '$words' },
    { $group: { _id: '$user', wordCount: { $sum: 1 } } },
    { $sort: { wordCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo',
      },
    },
    { $unwind: '$userInfo' },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        username: '$userInfo.username',
        displayName: '$userInfo.displayName',
        avatar: '$userInfo.avatar',
        wordCount: 1,
      },
    },
  ]);
};

module.exports = mongoose.model('UserFeedbackLog', userFeedbackLogSchema);

