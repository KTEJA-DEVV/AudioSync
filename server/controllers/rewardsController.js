const { asyncHandler, AppError, ErrorCodes } = require('../middleware/errorHandler');
const User = require('../models/User');
const Reward = require('../models/Reward');
const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const Tip = require('../models/Tip');
const ReputationTransaction = require('../models/ReputationTransaction');
const reputationService = require('../services/reputationService');
const badgeService = require('../services/badgeService');
const rewardService = require('../services/rewardService');

// ==========================================
// REPUTATION
// ==========================================

// @desc    Get user reputation details
// @route   GET /api/users/:id/reputation
// @access  Public
const getReputation = asyncHandler(async (req, res, next) => {
  const userId = req.params.id === 'me' ? req.userId : req.params.id;
  
  if (!userId) {
    return next(new AppError('User ID required', 400, ErrorCodes.VALIDATION_ERROR));
  }

  const details = await reputationService.getReputationDetails(userId);
  if (!details) {
    return next(new AppError('User not found', 404, ErrorCodes.NOT_FOUND));
  }

  res.status(200).json({
    success: true,
    data: details,
  });
});

// @desc    Get reputation leaderboard
// @route   GET /api/reputation/leaderboard
// @access  Public
const getReputationLeaderboard = asyncHandler(async (req, res) => {
  const { period = 'all-time', limit = 50, offset = 0 } = req.query;

  const leaderboard = await reputationService.getLeaderboard({
    period,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });

  // Find current user's position if authenticated
  let myPosition = null;
  if (req.userId) {
    const user = await User.findById(req.userId).select('reputation.score');
    if (user) {
      const higherCount = await User.countDocuments({
        'reputation.score': { $gt: user.reputation.score },
      });
      myPosition = {
        rank: higherCount + 1,
        score: user.reputation.score,
      };
    }
  }

  res.status(200).json({
    success: true,
    data: {
      leaderboard,
      myPosition,
      period,
    },
  });
});

// @desc    Get current user's vote weight
// @route   GET /api/users/me/vote-weight
// @access  Private
const getVoteWeight = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);
  
  const breakdown = user.getVoteWeightBreakdown();

  res.status(200).json({
    success: true,
    data: breakdown,
  });
});

// @desc    Recalculate all user reputations (Admin)
// @route   POST /api/reputation/calculate
// @access  Private (Admin)
const recalculateReputations = asyncHandler(async (req, res) => {
  // This would be a batch job in production
  const users = await User.find({}).select('_id reputation');
  let updated = 0;

  for (const user of users) {
    const result = await reputationService.checkLevelUp(user._id);
    if (result?.leveled) updated++;
  }

  res.status(200).json({
    success: true,
    message: `Recalculated ${users.length} users, ${updated} level changes`,
  });
});

// ==========================================
// BADGES
// ==========================================

// @desc    Get all available badges
// @route   GET /api/badges
// @access  Public
const getAllBadges = asyncHandler(async (req, res) => {
  const { category } = req.query;
  
  let badges;
  if (category) {
    badges = await Badge.getByCategory(category);
  } else {
    badges = await Badge.getActive();
  }

  // Group by category
  const grouped = badges.reduce((acc, badge) => {
    if (!acc[badge.category]) {
      acc[badge.category] = [];
    }
    acc[badge.category].push({
      ...badge,
      rarityColor: badgeService.RARITY_COLORS[badge.rarity],
    });
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    data: {
      badges,
      grouped,
      categories: Object.keys(grouped),
    },
  });
});

// @desc    Get user's badges
// @route   GET /api/users/:id/badges
// @access  Public
const getUserBadges = asyncHandler(async (req, res) => {
  const userId = req.params.id === 'me' ? req.userId : req.params.id;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID required' });
  }

  const badges = await badgeService.getUserBadges(userId);
  const badgeCount = badges.length;

  // Get pinned badges
  const pinnedBadges = badges.filter(b => b.isPinned);

  res.status(200).json({
    success: true,
    data: {
      badges,
      pinnedBadges,
      count: badgeCount,
    },
  });
});

// @desc    Get all badges with user progress
// @route   GET /api/badges/progress
// @access  Private
const getBadgesWithProgress = asyncHandler(async (req, res) => {
  const badges = await badgeService.getBadgesWithProgress(req.userId);

  // Group by category
  const grouped = badges.reduce((acc, badge) => {
    if (!acc[badge.category]) {
      acc[badge.category] = [];
    }
    acc[badge.category].push(badge);
    return acc;
  }, {});

  // Stats
  const earned = badges.filter(b => b.earned).length;
  const total = badges.length;

  res.status(200).json({
    success: true,
    data: {
      badges,
      grouped,
      stats: {
        earned,
        total,
        percentage: Math.round((earned / total) * 100),
      },
    },
  });
});

// @desc    Check and award badges for user
// @route   POST /api/badges/check/:userId
// @access  Private (System)
const checkBadges = asyncHandler(async (req, res) => {
  const userId = req.params.userId || req.userId;

  const awarded = await badgeService.checkAllBadges(userId);

  res.status(200).json({
    success: true,
    data: {
      awarded,
      count: awarded.length,
    },
  });
});

// @desc    Pin/unpin badge on profile
// @route   PUT /api/users/me/badges/:badgeId/pin
// @access  Private
const togglePinBadge = asyncHandler(async (req, res) => {
  const { pinned } = req.body;
  const { badgeId } = req.params;

  const result = await badgeService.togglePinBadge(req.userId, badgeId, pinned);

  res.status(200).json({
    success: true,
    data: result,
  });
});

// ==========================================
// REWARDS
// ==========================================

// @desc    Get user's reward history
// @route   GET /api/users/me/rewards
// @access  Private
const getRewards = asyncHandler(async (req, res) => {
  const { limit = 50, skip = 0, type, status } = req.query;

  const query = { user: req.userId };
  if (type) query.type = type;
  if (status) query.status = status;

  const [rewards, total] = await Promise.all([
    Reward.find(query)
      .sort('-createdAt')
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .lean(),
    Reward.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      rewards,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
      },
    },
  });
});

// @desc    Get pending rewards
// @route   GET /api/users/me/rewards/pending
// @access  Private
const getPendingRewards = asyncHandler(async (req, res) => {
  const rewards = await Reward.getPending(req.userId);

  res.status(200).json({
    success: true,
    data: { rewards },
  });
});

// @desc    Claim a pending reward
// @route   POST /api/users/me/rewards/:id/claim
// @access  Private
const claimReward = asyncHandler(async (req, res, next) => {
  try {
    const reward = await rewardService.claimReward(req.params.id, req.userId);

    res.status(200).json({
      success: true,
      message: 'Reward claimed',
      data: { reward },
    });
  } catch (error) {
    return next(new AppError(error.message, 400, ErrorCodes.VALIDATION_ERROR));
  }
});

// @desc    Get earnings summary
// @route   GET /api/users/me/earnings
// @access  Private
const getEarnings = asyncHandler(async (req, res) => {
  const summary = await rewardService.getEarningsSummary(req.userId);

  res.status(200).json({
    success: true,
    data: summary,
  });
});

// @desc    Request payout
// @route   POST /api/users/me/payout
// @access  Private
const requestPayout = asyncHandler(async (req, res, next) => {
  const { currency, amount } = req.body;

  if (!currency || !amount) {
    return next(new AppError('Currency and amount required', 400, ErrorCodes.VALIDATION_ERROR));
  }

  try {
    const result = await rewardService.requestPayout(req.userId, currency, parseFloat(amount));

    res.status(200).json({
      success: true,
      message: 'Payout requested',
      data: result,
    });
  } catch (error) {
    return next(new AppError(error.message, 400, ErrorCodes.VALIDATION_ERROR));
  }
});

// ==========================================
// TIPS
// ==========================================

// @desc    Send a tip
// @route   POST /api/tips
// @access  Private
const sendTip = asyncHandler(async (req, res, next) => {
  const { toUserId, amount, currency = 'tokens', message, sessionId, songId } = req.body;

  if (!toUserId || !amount) {
    return next(new AppError('Recipient and amount required', 400, ErrorCodes.VALIDATION_ERROR));
  }

  if (toUserId === req.userId.toString()) {
    return next(new AppError('Cannot tip yourself', 400, ErrorCodes.VALIDATION_ERROR));
  }

  // Check sender has enough balance
  const sender = await User.findById(req.userId);
  if (currency === 'tokens' && sender.wallet.tokenBalance < amount) {
    return next(new AppError('Insufficient token balance', 400, ErrorCodes.VALIDATION_ERROR));
  }

  // Create tip
  const tip = await Tip.create({
    from: req.userId,
    to: toUserId,
    amount,
    currency,
    message,
    session: sessionId,
    song: songId,
    status: 'completed', // For demo; would be 'pending' in production
    completedAt: new Date(),
  });

  // Deduct from sender
  if (currency === 'tokens') {
    sender.wallet.tokenBalance -= amount;
    sender.stats.tipsSent = (sender.stats.tipsSent || 0) + 1;
    await sender.save();
  }

  // Add to recipient
  const recipient = await User.findById(toUserId);
  if (recipient) {
    if (currency === 'tokens') {
      recipient.wallet.tokenBalance += amount;
    } else {
      recipient.wallet.balance += amount;
    }
    recipient.stats.tipsReceived = (recipient.stats.tipsReceived || 0) + 1;
    await recipient.save();

    // Award reputation bonus for receiving tip
    await reputationService.addReputation(toUserId, 5, 'tip-received', { fromUserId: req.userId });
  }

  await tip.populate('to', 'username displayName avatar');

  res.status(201).json({
    success: true,
    message: 'Tip sent!',
    data: { tip },
  });
});

// @desc    Get tips received
// @route   GET /api/users/me/tips/received
// @access  Private
const getTipsReceived = asyncHandler(async (req, res) => {
  const { limit = 50, skip = 0 } = req.query;

  const tips = await Tip.getReceived(req.userId, {
    limit: parseInt(limit),
    skip: parseInt(skip),
  });

  const totals = await Tip.getTotals(req.userId);

  res.status(200).json({
    success: true,
    data: {
      tips,
      totals: totals.received,
    },
  });
});

// @desc    Get tips sent
// @route   GET /api/users/me/tips/sent
// @access  Private
const getTipsSent = asyncHandler(async (req, res) => {
  const { limit = 50, skip = 0 } = req.query;

  const tips = await Tip.getSent(req.userId, {
    limit: parseInt(limit),
    skip: parseInt(skip),
  });

  const totals = await Tip.getTotals(req.userId);

  res.status(200).json({
    success: true,
    data: {
      tips,
      totals: totals.sent,
    },
  });
});

module.exports = {
  // Reputation
  getReputation,
  getReputationLeaderboard,
  getVoteWeight,
  recalculateReputations,
  // Badges
  getAllBadges,
  getUserBadges,
  getBadgesWithProgress,
  checkBadges,
  togglePinBadge,
  // Rewards
  getRewards,
  getPendingRewards,
  claimReward,
  getEarnings,
  requestPayout,
  // Tips
  sendTip,
  getTipsReceived,
  getTipsSent,
};

