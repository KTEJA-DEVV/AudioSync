/**
 * Badge Service for CrowdBeat
 * Manages badge eligibility checking and awarding
 */

const User = require('../models/User');
const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const Reward = require('../models/Reward');
const { emitToRoom } = require('../config/socket');
const { addReputation, REPUTATION_VALUES } = require('./reputationService');

// Rarity colors for UI
const RARITY_COLORS = {
  common: '#9CA3AF',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F97316',
};

// Rarity bonus reputation
const RARITY_BONUS = {
  common: 5,
  uncommon: 10,
  rare: 25,
  epic: 50,
  legendary: 100,
};

/**
 * Get nested property from object using dot notation
 */
const getNestedProperty = (obj, path) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

/**
 * Check if user meets badge criteria
 */
const checkCriteria = async (user, badge) => {
  const { criteria } = badge;

  switch (criteria.type) {
    case 'count':
    case 'threshold': {
      const value = getNestedProperty(user, criteria.field);
      return (value || 0) >= criteria.value;
    }

    case 'streak': {
      const streakValue = user.streaks?.[criteria.field] || 0;
      return streakValue >= criteria.value;
    }

    case 'special': {
      return checkSpecialCriteria(user, criteria.customCheck);
    }

    case 'unique': {
      // Unique achievements - usually awarded manually or by specific events
      return false;
    }

    default:
      return false;
  }
};

/**
 * Check special badge criteria
 */
const checkSpecialCriteria = async (user, checkName) => {
  switch (checkName) {
    case 'hasWonLyrics':
      return (user.stats?.lyricsWon || 0) >= 1;

    case 'isEarlyAdopter':
      // Users who joined before a certain date
      const earlyAdopterCutoff = new Date('2025-03-01');
      return user.createdAt < earlyAdopterCutoff;

    case 'isVerifiedArtist':
      return user.role === 'creator' && user.userType === 'creator';

    default:
      return false;
  }
};

/**
 * Check all badges for a user and award eligible ones
 */
const checkAllBadges = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const badges = await Badge.getActive();
  const awardedBadges = [];

  for (const badge of badges) {
    // Check if user already has badge
    const hasBadge = await UserBadge.hasBadge(userId, badge.badgeId);
    if (hasBadge) continue;

    // Check criteria
    const eligible = await checkCriteria(user, badge);
    if (eligible) {
      const result = await awardBadge(userId, badge.badgeId);
      if (!result.alreadyHad) {
        awardedBadges.push({
          ...badge,
          earnedAt: result.userBadge.earnedAt,
        });
      }
    }
  }

  return awardedBadges;
};

/**
 * Award a specific badge to user
 */
const awardBadge = async (userId, badgeId) => {
  const badge = await Badge.findOne({ badgeId });
  if (!badge) {
    throw new Error(`Badge ${badgeId} not found`);
  }

  // Award badge
  const result = await UserBadge.awardBadge(userId, badgeId);

  if (!result.alreadyHad) {
    // Give reputation bonus
    const bonus = RARITY_BONUS[badge.rarity] || RARITY_BONUS.common;
    await addReputation(userId, bonus, 'badge-bonus', { badgeId }, `Earned badge: ${badge.name}`);

    // Create reward record
    await Reward.create({
      user: userId,
      type: 'badge-earned',
      amount: bonus,
      currency: 'reputation',
      source: { badgeId },
      description: `Earned ${badge.name} badge`,
      status: 'credited',
      creditedAt: new Date(),
    });

    // Emit badge earned event
    emitToRoom(userId.toString(), 'badge:earned', {
      badge: {
        badgeId: badge.badgeId,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        rarity: badge.rarity,
        rarityColor: RARITY_COLORS[badge.rarity],
      },
      reputationBonus: bonus,
    });
  }

  return result;
};

/**
 * Get badge progress for a specific badge
 */
const getBadgeProgress = async (userId, badgeId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const badge = await Badge.findOne({ badgeId });
  if (!badge) return null;

  const hasBadge = await UserBadge.hasBadge(userId, badgeId);
  if (hasBadge) {
    return {
      badge,
      earned: true,
      progress: 100,
      currentValue: null,
      requiredValue: null,
    };
  }

  const { criteria } = badge;
  let currentValue = 0;
  let progress = 0;

  if (criteria.type === 'count' || criteria.type === 'threshold') {
    currentValue = getNestedProperty(user, criteria.field) || 0;
    progress = Math.min(100, Math.round((currentValue / criteria.value) * 100));
  } else if (criteria.type === 'streak') {
    currentValue = user.streaks?.[criteria.field] || 0;
    progress = Math.min(100, Math.round((currentValue / criteria.value) * 100));
  }

  return {
    badge: {
      ...badge.toObject(),
      rarityColor: RARITY_COLORS[badge.rarity],
    },
    earned: false,
    progress,
    currentValue,
    requiredValue: criteria.value,
  };
};

/**
 * Get all badges with user progress
 */
const getBadgesWithProgress = async (userId) => {
  const badges = await Badge.getActive();
  const userBadges = await UserBadge.getUserBadges(userId);
  const earnedBadgeIds = new Set(userBadges.map(ub => ub.badge.badgeId));

  const results = [];

  for (const badge of badges) {
    if (earnedBadgeIds.has(badge.badgeId)) {
      const userBadge = userBadges.find(ub => ub.badge.badgeId === badge.badgeId);
      results.push({
        ...badge,
        rarityColor: RARITY_COLORS[badge.rarity],
        earned: true,
        earnedAt: userBadge.earnedAt,
        isPinned: userBadge.isPinned,
        progress: 100,
      });
    } else {
      const progress = await getBadgeProgress(userId, badge.badgeId);
      results.push({
        ...badge,
        rarityColor: RARITY_COLORS[badge.rarity],
        earned: false,
        progress: progress?.progress || 0,
        currentValue: progress?.currentValue,
        requiredValue: progress?.requiredValue,
      });
    }
  }

  return results;
};

/**
 * Get user's earned badges for profile
 */
const getUserBadges = async (userId, options = {}) => {
  const userBadges = await UserBadge.getUserBadges(userId, options);
  
  return userBadges.map(ub => ({
    ...ub.badge,
    rarityColor: RARITY_COLORS[ub.badge.rarity],
    earnedAt: ub.earnedAt,
    isPinned: ub.isPinned,
    displayOrder: ub.displayOrder,
  }));
};

/**
 * Pin/unpin badge on profile
 */
const togglePinBadge = async (userId, badgeId, pinned) => {
  const badge = await Badge.findOne({ badgeId });
  if (!badge) throw new Error('Badge not found');

  const userBadge = await UserBadge.findOne({ user: userId, badge: badge._id });
  if (!userBadge) throw new Error('User does not have this badge');

  userBadge.isPinned = pinned;
  await userBadge.save();

  return userBadge;
};

/**
 * Reorder badges on profile
 */
const reorderBadges = async (userId, badgeOrder) => {
  // badgeOrder is array of { badgeId, displayOrder }
  for (const item of badgeOrder) {
    const badge = await Badge.findOne({ badgeId: item.badgeId });
    if (!badge) continue;

    await UserBadge.findOneAndUpdate(
      { user: userId, badge: badge._id },
      { displayOrder: item.displayOrder }
    );
  }

  return getUserBadges(userId);
};

/**
 * Get badge statistics
 */
const getBadgeStats = async (badgeId) => {
  const badge = await Badge.findOne({ badgeId });
  if (!badge) return null;

  const totalUsers = await User.countDocuments();
  const earnedPercentage = totalUsers > 0 
    ? Math.round((badge.earnedCount / totalUsers) * 100 * 10) / 10
    : 0;

  return {
    badge,
    earnedCount: badge.earnedCount,
    totalUsers,
    earnedPercentage,
    rarity: badge.rarity,
    rarityColor: RARITY_COLORS[badge.rarity],
  };
};

/**
 * Initialize default badges (run on server start)
 */
const initializeBadges = async () => {
  await Badge.seedDefaultBadges();
};

module.exports = {
  checkAllBadges,
  awardBadge,
  getBadgeProgress,
  getBadgesWithProgress,
  getUserBadges,
  togglePinBadge,
  reorderBadges,
  getBadgeStats,
  initializeBadges,
  RARITY_COLORS,
  RARITY_BONUS,
};

