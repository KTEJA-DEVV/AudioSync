/**
 * Reputation Service for CrowdBeat
 * Manages user reputation, levels, vote weights, and decay
 */

const User = require('../models/User');
const ReputationTransaction = require('../models/ReputationTransaction');
const { emitToRoom } = require('../config/socket');

// Reputation level thresholds
const LEVEL_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
  diamond: 10000,
};

// Level colors for UI
const LEVEL_COLORS = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
  diamond: '#B9F2FF',
};

// Reputation values for different actions
const REPUTATION_VALUES = {
  'vote-received': 1,
  'submission-accepted': 5,
  'lyrics-won': 50,
  'stem-accepted': 10,
  'feedback-given': 2,
  'report-correct': 10,
  'streak-bonus': 5,
  'badge-bonus': 10,
  'level-up-bonus': 25,
  'tip-received': 5,
  'competition-win': 100,
  'session-hosted': 20,
  'decay': -1,
  'penalty': -10,
};

/**
 * Add reputation to user
 */
const addReputation = async (userId, amount, type, source = {}, description = null) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const previousLevel = user.reputation.level;
  const previousScore = user.reputation.score;

  // Update score
  user.reputation.score = Math.max(0, user.reputation.score + amount);

  // Check for level change
  const newLevel = calculateLevel(user.reputation.score);
  const levelChanged = newLevel !== previousLevel;
  user.reputation.level = newLevel;

  // Update vote weight
  user.reputation.voteWeight = user.calculateVoteWeight();

  await user.save();

  // Log transaction
  await ReputationTransaction.log(
    userId,
    amount,
    type,
    source,
    user.reputation.score,
    description
  );

  // If leveled up, give bonus
  if (levelChanged && amount > 0) {
    await addReputation(userId, REPUTATION_VALUES['level-up-bonus'], 'level-up-bonus', {}, `Leveled up to ${newLevel}!`);
    
    // Emit level up event
    emitToRoom(userId.toString(), 'reputation:levelUp', {
      previousLevel,
      newLevel,
      score: user.reputation.score,
    });
  }

  return {
    previousScore,
    newScore: user.reputation.score,
    previousLevel,
    newLevel,
    levelChanged,
    voteWeight: user.reputation.voteWeight,
  };
};

/**
 * Remove reputation from user (penalties)
 */
const removeReputation = async (userId, amount, type, source = {}, description = null) => {
  return addReputation(userId, -Math.abs(amount), type, source, description);
};

/**
 * Calculate level from score
 */
const calculateLevel = (score) => {
  if (score >= LEVEL_THRESHOLDS.diamond) return 'diamond';
  if (score >= LEVEL_THRESHOLDS.platinum) return 'platinum';
  if (score >= LEVEL_THRESHOLDS.gold) return 'gold';
  if (score >= LEVEL_THRESHOLDS.silver) return 'silver';
  return 'bronze';
};

/**
 * Get progress to next level
 */
const getLevelProgress = (score) => {
  const currentLevel = calculateLevel(score);
  const levels = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  const currentIndex = levels.indexOf(currentLevel);

  if (currentLevel === 'diamond') {
    return {
      currentLevel,
      nextLevel: null,
      currentScore: score,
      nextLevelThreshold: null,
      progress: 100,
      pointsToNextLevel: 0,
    };
  }

  const nextLevel = levels[currentIndex + 1];
  const currentThreshold = LEVEL_THRESHOLDS[currentLevel];
  const nextThreshold = LEVEL_THRESHOLDS[nextLevel];
  const progressInLevel = score - currentThreshold;
  const levelRange = nextThreshold - currentThreshold;
  const progress = Math.round((progressInLevel / levelRange) * 100);

  return {
    currentLevel,
    nextLevel,
    currentScore: score,
    currentThreshold,
    nextLevelThreshold: nextThreshold,
    progress: Math.min(100, Math.max(0, progress)),
    pointsToNextLevel: nextThreshold - score,
  };
};

/**
 * Calculate vote weight from reputation
 */
const calculateVoteWeight = (reputation) => {
  const score = reputation?.score || reputation || 0;
  const weight = 1 + (score / 1000);
  return Math.min(Math.round(weight * 100) / 100, 5);
};

/**
 * Check if user leveled up
 */
const checkLevelUp = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const expectedLevel = calculateLevel(user.reputation.score);
  if (expectedLevel !== user.reputation.level) {
    const previousLevel = user.reputation.level;
    user.reputation.level = expectedLevel;
    await user.save();

    return {
      leveled: true,
      previousLevel,
      newLevel: expectedLevel,
    };
  }

  return { leveled: false, currentLevel: user.reputation.level };
};

/**
 * Apply reputation decay to inactive users
 * Should be run as a cron job (e.g., daily)
 */
const applyDecay = async (inactiveDays = 30, decayPercentage = 1) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

  // Find inactive users with reputation above bronze threshold
  const inactiveUsers = await User.find({
    lastActiveAt: { $lt: cutoffDate },
    'reputation.score': { $gt: LEVEL_THRESHOLDS.silver },
  }).select('_id reputation.score');

  const results = [];

  for (const user of inactiveUsers) {
    const decayAmount = Math.ceil(user.reputation.score * (decayPercentage / 100));
    
    if (decayAmount > 0) {
      const result = await removeReputation(
        user._id,
        decayAmount,
        'decay',
        {},
        `Inactivity decay (${inactiveDays}+ days)`
      );
      results.push({ userId: user._id, decayed: decayAmount, ...result });
    }
  }

  console.log(`Applied reputation decay to ${results.length} users`);
  return results;
};

/**
 * Get user's reputation details
 */
const getReputationDetails = async (userId) => {
  const user = await User.findById(userId).select('reputation stats streaks');
  if (!user) return null;

  const levelProgress = getLevelProgress(user.reputation.score);
  const voteWeightBreakdown = user.getVoteWeightBreakdown();

  // Get recent transactions
  const recentTransactions = await ReputationTransaction.getHistory(userId, { limit: 10 });

  // Get summary since last month
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const summary = await ReputationTransaction.getSummary(userId, lastMonth);

  return {
    score: user.reputation.score,
    level: user.reputation.level,
    levelColor: LEVEL_COLORS[user.reputation.level],
    levelProgress,
    voteWeight: user.reputation.voteWeight,
    voteWeightBreakdown,
    streaks: user.streaks,
    recentTransactions,
    summary,
  };
};

/**
 * Get reputation leaderboard
 */
const getLeaderboard = async (options = {}) => {
  const { period = 'all-time', limit = 50, offset = 0 } = options;

  let pipeline = [
    { $match: { 'reputation.score': { $gt: 0 } } },
    {
      $project: {
        username: 1,
        displayName: 1,
        avatar: 1,
        'reputation.score': 1,
        'reputation.level': 1,
        'stats.songsContributed': 1,
      },
    },
    { $sort: { 'reputation.score': -1 } },
    { $skip: offset },
    { $limit: limit },
  ];

  // For weekly/monthly, we need to aggregate from transactions
  if (period !== 'all-time') {
    const since = new Date();
    if (period === 'weekly') {
      since.setDate(since.getDate() - 7);
    } else if (period === 'monthly') {
      since.setMonth(since.getMonth() - 1);
    }

    const changes = await ReputationTransaction.getRecentChanges(since, limit);
    const userIds = changes.map(c => c._id);

    const users = await User.find({ _id: { $in: userIds } })
      .select('username displayName avatar reputation.score reputation.level')
      .lean();

    const userMap = users.reduce((acc, u) => {
      acc[u._id.toString()] = u;
      return acc;
    }, {});

    return changes.map((change, index) => ({
      rank: index + 1,
      ...userMap[change._id.toString()],
      periodChange: change.totalChange,
    }));
  }

  const users = await User.aggregate(pipeline);
  return users.map((user, index) => ({
    rank: offset + index + 1,
    ...user,
  }));
};

/**
 * Update user streak
 */
const updateStreak = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActive = user.streaks?.lastActiveDate;
  
  if (lastActive) {
    const lastActiveDay = new Date(lastActive);
    lastActiveDay.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today - lastActiveDay) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      // Consecutive day, increment streak
      user.streaks.currentStreak += 1;
      if (user.streaks.currentStreak > user.streaks.longestStreak) {
        user.streaks.longestStreak = user.streaks.currentStreak;
      }

      // Award streak bonus every 7 days
      if (user.streaks.currentStreak % 7 === 0) {
        await addReputation(userId, REPUTATION_VALUES['streak-bonus'] * (user.streaks.currentStreak / 7), 'streak-bonus', {}, `${user.streaks.currentStreak} day streak!`);
      }
    } else if (daysDiff > 1) {
      // Streak broken
      user.streaks.currentStreak = 1;
    }
    // daysDiff === 0 means same day, no change
  } else {
    // First activity
    user.streaks.currentStreak = 1;
  }

  user.streaks.lastActiveDate = new Date();
  await user.save();

  return user.streaks;
};

module.exports = {
  addReputation,
  removeReputation,
  calculateLevel,
  getLevelProgress,
  calculateVoteWeight,
  checkLevelUp,
  applyDecay,
  getReputationDetails,
  getLeaderboard,
  updateStreak,
  LEVEL_THRESHOLDS,
  LEVEL_COLORS,
  REPUTATION_VALUES,
};

