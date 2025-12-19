const { asyncHandler, AppError, ErrorCodes } = require('../middleware/errorHandler');
const User = require('../models/User');
const Contribution = require('../models/Contribution');

// @desc    Get user public profile
// @route   GET /api/users/:id
// @access  Public
const getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-email -password -emailVerificationToken -passwordResetToken');

  if (!user) {
    return next(new AppError('User not found', 404, ErrorCodes.NOT_FOUND));
  }

  res.status(200).json({
    success: true,
    data: {
      user: user.toPublicProfile(),
    },
  });
});

// @desc    Get user by username
// @route   GET /api/users/username/:username
// @access  Public
const getUserByUsername = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() })
    .select('-email -password -emailVerificationToken -passwordResetToken');

  if (!user) {
    return next(new AppError('User not found', 404, ErrorCodes.NOT_FOUND));
  }

  res.status(200).json({
    success: true,
    data: {
      user: user.toPublicProfile(),
    },
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res, next) => {
  const allowedFields = ['displayName', 'bio', 'avatar', 'coverImage', 'socialLinks', 'userType'];
  const updates = {};

  // Only include allowed fields
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  // Validate bio length
  if (updates.bio && updates.bio.length > 500) {
    return next(new AppError('Bio cannot exceed 500 characters', 400, ErrorCodes.VALIDATION_ERROR));
  }

  // Validate display name length
  if (updates.displayName && updates.displayName.length > 50) {
    return next(new AppError('Display name cannot exceed 50 characters', 400, ErrorCodes.VALIDATION_ERROR));
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404, ErrorCodes.NOT_FOUND));
  }

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatarUrl,
        coverImage: user.coverImage,
        bio: user.bio,
        role: user.role,
        userType: user.userType,
        socialLinks: user.socialLinks,
      },
    },
  });
});

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Private
const updatePreferences = asyncHandler(async (req, res, next) => {
  const { favoriteGenres, notifications, audioQuality, theme } = req.body;
  const updates = {};

  if (favoriteGenres !== undefined) {
    updates['preferences.favoriteGenres'] = favoriteGenres;
  }

  if (notifications !== undefined) {
    if (notifications.email !== undefined) updates['preferences.notifications.email'] = notifications.email;
    if (notifications.push !== undefined) updates['preferences.notifications.push'] = notifications.push;
    if (notifications.inApp !== undefined) updates['preferences.notifications.inApp'] = notifications.inApp;
  }

  if (audioQuality !== undefined) {
    if (!['low', 'medium', 'high'].includes(audioQuality)) {
      return next(new AppError('Invalid audio quality setting', 400, ErrorCodes.VALIDATION_ERROR));
    }
    updates['preferences.audioQuality'] = audioQuality;
  }

  if (theme !== undefined) {
    if (!['light', 'dark', 'system'].includes(theme)) {
      return next(new AppError('Invalid theme setting', 400, ErrorCodes.VALIDATION_ERROR));
    }
    updates['preferences.theme'] = theme;
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: updates },
    { new: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404, ErrorCodes.NOT_FOUND));
  }

  res.status(200).json({
    success: true,
    message: 'Preferences updated successfully',
    data: {
      preferences: user.preferences,
    },
  });
});

// @desc    Get user contributions
// @route   GET /api/users/:id/contributions
// @access  Public
const getUserContributions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;

  const query = { user: req.params.id };
  if (type) query.type = type;

  // Check if Contribution model exists
  let contributions = [];
  let total = 0;

  try {
    contributions = await Contribution.find(query)
      .populate('session', 'title genre')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    total = await Contribution.countDocuments(query);
  } catch (error) {
    // Contribution model may not have data yet
    contributions = [];
    total = 0;
  }

  res.status(200).json({
    success: true,
    data: {
      contributions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// @desc    Get leaderboard
// @route   GET /api/users/leaderboard
// @access  Public
const getLeaderboard = asyncHandler(async (req, res) => {
  const { limit = 50, sortBy = 'reputation', timeframe = 'all' } = req.query;

  let sortField;
  switch (sortBy) {
    case 'contributions':
      sortField = { 'stats.songsContributed': -1 };
      break;
    case 'votes':
      sortField = { 'stats.votesCast': -1 };
      break;
    case 'sessions':
      sortField = { 'stats.sessionsAttended': -1 };
      break;
    case 'earnings':
      sortField = { 'stats.totalEarnings': -1 };
      break;
    case 'reputation':
    default:
      sortField = { 'reputation.score': -1 };
  }

  // Build query based on timeframe
  const query = {};
  if (timeframe !== 'all') {
    const now = new Date();
    switch (timeframe) {
      case 'week':
        query.lastActiveAt = { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) };
        break;
      case 'month':
        query.lastActiveAt = { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
        break;
    }
  }

  const users = await User.find(query)
    .select('username displayName avatar reputation stats createdAt')
    .sort(sortField)
    .limit(Number(limit))
    .lean();

  // Add rank to each user
  const leaderboard = users.map((user, index) => ({
    rank: index + 1,
    id: user._id,
    username: user.username,
    displayName: user.displayName,
    avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
    reputation: {
      score: user.reputation?.score || 0,
      level: user.reputation?.level || 'bronze',
      badges: user.reputation?.badges?.slice(0, 3) || [], // Top 3 badges
    },
    stats: user.stats,
  }));

  res.status(200).json({
    success: true,
    data: {
      leaderboard,
      meta: {
        sortBy,
        timeframe,
        total: leaderboard.length,
      },
    },
  });
});

// @desc    Search users
// @route   GET /api/users/search
// @access  Public
const searchUsers = asyncHandler(async (req, res) => {
  const { q, limit = 10 } = req.query;

  if (!q || q.length < 2) {
    return res.status(200).json({
      success: true,
      data: { users: [] },
    });
  }

  const users = await User.find({
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { displayName: { $regex: q, $options: 'i' } },
    ],
  })
    .select('username displayName avatar reputation.level')
    .limit(Number(limit))
    .lean();

  res.status(200).json({
    success: true,
    data: {
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
        level: user.reputation?.level || 'bronze',
      })),
    },
  });
});

// @desc    Follow user
// @route   POST /api/users/:id/follow
// @access  Private
const followUser = asyncHandler(async (req, res, next) => {
  if (req.params.id === req.userId) {
    return next(new AppError('You cannot follow yourself', 400, ErrorCodes.VALIDATION_ERROR));
  }

  // This would require a Following model - placeholder for now
  res.status(200).json({
    success: true,
    message: 'User followed successfully',
  });
});

// @desc    Unfollow user
// @route   DELETE /api/users/:id/follow
// @access  Private
const unfollowUser = asyncHandler(async (req, res, next) => {
  // Placeholder
  res.status(200).json({
    success: true,
    message: 'User unfollowed successfully',
  });
});

module.exports = {
  getUserProfile,
  getUserByUsername,
  updateProfile,
  updatePreferences,
  getUserContributions,
  getLeaderboard,
  searchUsers,
  followUser,
  unfollowUser,
};

