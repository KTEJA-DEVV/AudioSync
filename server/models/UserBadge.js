const mongoose = require('mongoose');

const userBadgeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    badge: {
      type: mongoose.Schema.ObjectId,
      ref: 'Badge',
      required: true,
    },
    earnedAt: {
      type: Date,
      default: Date.now,
    },
    displayOrder: {
      type: Number,
      default: 0, // Lower = more prominent on profile
    },
    isPinned: {
      type: Boolean,
      default: false, // Featured/pinned badges
    },
  },
  {
    timestamps: false,
  }
);

// Compound unique index - user can only earn each badge once
userBadgeSchema.index({ user: 1, badge: 1 }, { unique: true });
userBadgeSchema.index({ user: 1, displayOrder: 1 });
userBadgeSchema.index({ user: 1, isPinned: -1, earnedAt: -1 });

// Static to check if user has badge
userBadgeSchema.statics.hasBadge = async function(userId, badgeId) {
  const Badge = mongoose.model('Badge');
  const badge = await Badge.findOne({ badgeId });
  if (!badge) return false;
  
  const userBadge = await this.findOne({ user: userId, badge: badge._id });
  return !!userBadge;
};

// Static to get user's badges
userBadgeSchema.statics.getUserBadges = async function(userId, options = {}) {
  const { limit, pinnedFirst = true } = options;
  
  let query = this.find({ user: userId })
    .populate('badge')
    .sort(pinnedFirst ? { isPinned: -1, displayOrder: 1, earnedAt: -1 } : { earnedAt: -1 });
  
  if (limit) {
    query = query.limit(limit);
  }
  
  return query.lean();
};

// Static to award badge to user
userBadgeSchema.statics.awardBadge = async function(userId, badgeId) {
  const Badge = mongoose.model('Badge');
  const badge = await Badge.findOne({ badgeId });
  
  if (!badge) {
    throw new Error(`Badge ${badgeId} not found`);
  }
  
  // Check if already has badge
  const existing = await this.findOne({ user: userId, badge: badge._id });
  if (existing) {
    return { alreadyHad: true, userBadge: existing };
  }
  
  // Award badge
  const userBadge = await this.create({
    user: userId,
    badge: badge._id,
  });
  
  // Increment earned count
  await Badge.incrementEarnedCount(badgeId);
  
  return { alreadyHad: false, userBadge };
};

// Static to get badge counts by user
userBadgeSchema.statics.getBadgeCount = async function(userId) {
  return this.countDocuments({ user: userId });
};

// Static to get users who have a specific badge
userBadgeSchema.statics.getUsersWithBadge = async function(badgeId, limit = 100) {
  const Badge = mongoose.model('Badge');
  const badge = await Badge.findOne({ badgeId });
  if (!badge) return [];
  
  return this.find({ badge: badge._id })
    .populate('user', 'username displayName avatar')
    .sort('-earnedAt')
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('UserBadge', userBadgeSchema);

