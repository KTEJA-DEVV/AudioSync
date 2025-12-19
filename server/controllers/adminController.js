const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const {
  User,
  Session,
  Song,
  LyricsSubmission,
  Report,
  ModAction,
  SystemSetting,
  Announcement,
  Reward,
  StemUpload,
  ChatMessage,
} = require('../models');
const AppError = require('../utils/AppError');
const { logModAction } = require('../middleware/auditLog');

// ==================== STATS ====================

/**
 * @desc    Get dashboard overview stats
 * @route   GET /api/admin/stats
 * @access  Admin/Moderator
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersThisMonth,
    newUsersThisWeek,
    activeUsers24h,
    totalSessions,
    activeSessions,
    completedSessions,
    totalSongs,
    pendingReports,
    totalReports,
    recentModActions,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    User.countDocuments({ lastActive: { $gte: oneDayAgo } }),
    Session.countDocuments(),
    Session.countDocuments({ status: { $in: ['lyrics-open', 'lyrics-voting', 'generation', 'song-voting', 'live'] } }),
    Session.countDocuments({ status: 'completed' }),
    Song.countDocuments(),
    Report.countDocuments({ status: 'pending' }),
    Report.countDocuments(),
    ModAction.countDocuments({ createdAt: { $gte: oneDayAgo } }),
  ]);

  // Calculate revenue (simplified - would need actual payment integration)
  const revenueData = await Reward.aggregate([
    { $match: { status: 'credited', createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const revenueThisMonth = revenueData[0]?.total || 0;

  // Previous period comparisons
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const prevMonthUsers = await User.countDocuments({
    createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
  });

  const userGrowth = prevMonthUsers > 0 
    ? ((newUsersThisMonth - prevMonthUsers) / prevMonthUsers * 100).toFixed(1)
    : 100;

  res.json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
        newThisWeek: newUsersThisWeek,
        active24h: activeUsers24h,
        growth: parseFloat(userGrowth),
      },
      sessions: {
        total: totalSessions,
        active: activeSessions,
        completed: completedSessions,
        completionRate: totalSessions > 0 
          ? ((completedSessions / totalSessions) * 100).toFixed(1) 
          : 0,
      },
      songs: {
        total: totalSongs,
      },
      reports: {
        pending: pendingReports,
        total: totalReports,
      },
      modActions: {
        last24h: recentModActions,
      },
      revenue: {
        thisMonth: revenueThisMonth,
      },
    },
  });
});

/**
 * @desc    Get user growth stats
 * @route   GET /api/admin/stats/users
 * @access  Admin/Moderator
 */
const getUserStats = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Daily user signups
  const dailySignups = await User.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // User by role
  const usersByRole = await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);

  // User by subscription tier
  const usersByTier = await User.aggregate([
    { $group: { _id: '$subscription.tier', count: { $sum: 1 } } },
  ]);

  // Top contributors
  const topContributors = await User.find({})
    .select('username displayName avatar reputation.score stats')
    .sort({ 'reputation.score': -1 })
    .limit(10)
    .lean();

  res.json({
    success: true,
    data: {
      dailySignups,
      usersByRole,
      usersByTier,
      topContributors,
    },
  });
});

/**
 * @desc    Get session stats
 * @route   GET /api/admin/stats/sessions
 * @access  Admin/Moderator
 */
const getSessionStats = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Daily sessions
  const dailySessions = await Session.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Sessions by status
  const sessionsByStatus = await Session.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Sessions by genre
  const sessionsByGenre = await Session.aggregate([
    { $group: { _id: '$genre', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  // Average participation
  const avgParticipation = await Session.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, avg: { $avg: '$stats.totalParticipants' } } },
  ]);

  res.json({
    success: true,
    data: {
      dailySessions,
      sessionsByStatus,
      sessionsByGenre,
      avgParticipation: avgParticipation[0]?.avg || 0,
    },
  });
});

/**
 * @desc    Get revenue stats
 * @route   GET /api/admin/stats/revenue
 * @access  Admin
 */
const getRevenueStats = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Daily revenue (simulated based on rewards)
  const dailyRevenue = await Reward.aggregate([
    { $match: { createdAt: { $gte: startDate }, status: 'credited' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        amount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Revenue by source
  const revenueBySource = await Reward.aggregate([
    { $match: { createdAt: { $gte: startDate }, status: 'credited' } },
    { $group: { _id: '$source', amount: { $sum: '$amount' } } },
  ]);

  res.json({
    success: true,
    data: {
      dailyRevenue,
      revenueBySource,
    },
  });
});

// ==================== USER MANAGEMENT ====================

/**
 * @desc    Get paginated user list
 * @route   GET /api/admin/users
 * @access  Admin/Moderator
 */
const getUsers = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    role,
    status,
    tier,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { displayName: { $regex: search, $options: 'i' } },
    ];
  }

  if (role) query.role = role;
  if (status) {
    if (status === 'banned') query.isBanned = true;
    else if (status === 'muted') query.isMuted = true;
    else if (status === 'active') {
      query.isBanned = { $ne: true };
      query.isMuted = { $ne: true };
    }
  }
  if (tier) query['subscription.tier'] = tier;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    User.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * @desc    Get user details with mod history
 * @route   GET /api/admin/users/:id
 * @access  Admin/Moderator
 */
const getUserDetails = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .lean();

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Get mod action history for this user
  const modHistory = await ModAction.find({ targetUser: user._id })
    .populate('moderator', 'username displayName')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // Get user's activity stats
  const [sessionsCreated, lyricsSubmitted, songsContributed] = await Promise.all([
    Session.countDocuments({ host: user._id }),
    LyricsSubmission.countDocuments({ author: user._id }),
    Song.countDocuments({ 'contributors.user': user._id }),
  ]);

  res.json({
    success: true,
    data: {
      user,
      modHistory,
      activity: {
        sessionsCreated,
        lyricsSubmitted,
        songsContributed,
      },
    },
  });
});

/**
 * @desc    Update user
 * @route   PUT /api/admin/users/:id
 * @access  Admin
 */
const updateUser = asyncHandler(async (req, res) => {
  const { role, subscription, displayName, bio } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Store old values for audit
  const oldValues = {
    role: user.role,
    subscription: user.subscription?.tier,
  };

  if (role && role !== user.role) {
    user.role = role;
  }
  if (subscription) {
    user.subscription = { ...user.subscription, ...subscription };
  }
  if (displayName) user.displayName = displayName;
  if (bio !== undefined) user.bio = bio;

  await user.save();

  // Log action
  await logModAction({
    moderator: req.user._id,
    actionType: 'update-user-role',
    targetType: 'user',
    targetId: user._id,
    targetUser: user._id,
    details: { oldValues, newValues: req.body },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: user,
    message: 'User updated successfully',
  });
});

/**
 * @desc    Issue warning to user
 * @route   POST /api/admin/users/:id/warn
 * @access  Admin/Moderator
 */
const warnUser = asyncHandler(async (req, res) => {
  const { reason, notifyUser = true } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Increment warning count (add to user model if not exists)
  user.warnings = (user.warnings || 0) + 1;
  await user.save();

  // Log action
  await logModAction({
    moderator: req.user._id,
    actionType: 'warn',
    targetType: 'user',
    targetId: user._id,
    targetUser: user._id,
    reason,
    details: { warningCount: user.warnings, notifyUser },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // TODO: Send notification/email to user if notifyUser is true

  res.json({
    success: true,
    message: 'Warning issued successfully',
    data: { warningCount: user.warnings },
  });
});

/**
 * @desc    Mute user
 * @route   POST /api/admin/users/:id/mute
 * @access  Admin/Moderator
 */
const muteUser = asyncHandler(async (req, res) => {
  const { reason, duration = 24 } = req.body; // duration in hours

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const muteUntil = new Date();
  muteUntil.setHours(muteUntil.getHours() + parseInt(duration));

  user.isMuted = true;
  user.muteUntil = muteUntil;
  user.muteReason = reason;
  await user.save();

  // Log action
  await logModAction({
    moderator: req.user._id,
    actionType: 'mute',
    targetType: 'user',
    targetId: user._id,
    targetUser: user._id,
    reason,
    details: { duration, muteUntil },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    message: `User muted until ${muteUntil.toISOString()}`,
  });
});

/**
 * @desc    Ban user
 * @route   POST /api/admin/users/:id/ban
 * @access  Admin
 */
const banUser = asyncHandler(async (req, res) => {
  const { reason, permanent = false, duration } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.role === 'admin') {
    throw new AppError('Cannot ban an admin', 400);
  }

  user.isBanned = true;
  user.banReason = reason;
  user.bannedAt = new Date();
  
  if (!permanent && duration) {
    const banUntil = new Date();
    banUntil.setHours(banUntil.getHours() + parseInt(duration));
    user.banUntil = banUntil;
  }
  
  await user.save();

  // Log action
  await logModAction({
    moderator: req.user._id,
    actionType: 'ban',
    targetType: 'user',
    targetId: user._id,
    targetUser: user._id,
    reason,
    details: { permanent, duration, banUntil: user.banUntil },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    message: permanent ? 'User permanently banned' : `User banned until ${user.banUntil?.toISOString()}`,
  });
});

/**
 * @desc    Unban user
 * @route   POST /api/admin/users/:id/unban
 * @access  Admin
 */
const unbanUser = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.isBanned = false;
  user.banReason = undefined;
  user.bannedAt = undefined;
  user.banUntil = undefined;
  await user.save();

  // Log action
  await logModAction({
    moderator: req.user._id,
    actionType: 'unban',
    targetType: 'user',
    targetId: user._id,
    targetUser: user._id,
    reason,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    message: 'User unbanned successfully',
  });
});

// ==================== REPORTS ====================

/**
 * @desc    Get reports with filters
 * @route   GET /api/admin/reports
 * @access  Admin/Moderator
 */
const getReports = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    targetType,
    priority,
    assignedTo,
  } = req.query;

  const result = await Report.getReports({
    page: parseInt(page),
    limit: parseInt(limit),
    status,
    targetType,
    priority,
    assignedTo,
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * @desc    Get report details
 * @route   GET /api/admin/reports/:id
 * @access  Admin/Moderator
 */
const getReportDetails = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id)
    .populate('reporter', 'username displayName avatar')
    .populate('assignedTo', 'username displayName avatar')
    .populate('resolution.resolvedBy', 'username displayName')
    .lean();

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  // Get the target content based on type
  let targetContent = null;
  const Model = {
    user: User,
    submission: LyricsSubmission,
    song: Song,
    session: Session,
    message: ChatMessage,
    stem: StemUpload,
  }[report.targetType];

  if (Model) {
    targetContent = await Model.findById(report.targetId)
      .select(report.targetType === 'user' ? '-password' : '')
      .lean();
  }

  res.json({
    success: true,
    data: {
      report,
      targetContent,
    },
  });
});

/**
 * @desc    Update report (assign, resolve, dismiss)
 * @route   PUT /api/admin/reports/:id
 * @access  Admin/Moderator
 */
const updateReport = asyncHandler(async (req, res) => {
  const { status, assignedTo, resolution, priority } = req.body;

  const report = await Report.findById(req.params.id);
  if (!report) {
    throw new AppError('Report not found', 404);
  }

  if (status) report.status = status;
  if (assignedTo) report.assignedTo = assignedTo;
  if (priority) report.priority = priority;
  
  if (resolution) {
    report.resolution = {
      ...resolution,
      resolvedAt: new Date(),
      resolvedBy: req.user._id,
    };
    if (status !== 'dismissed') report.status = 'resolved';
  }

  await report.save();

  // Log action
  const actionType = status === 'dismissed' ? 'dismiss-report' : 'resolve-report';
  await logModAction({
    moderator: req.user._id,
    actionType,
    targetType: 'report',
    targetId: report._id,
    details: { status, resolution },
    relatedReport: report._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: report,
    message: 'Report updated successfully',
  });
});

// ==================== CONTENT MODERATION ====================

/**
 * @desc    Get flagged content
 * @route   GET /api/admin/content/flagged
 * @access  Admin/Moderator
 */
const getFlaggedContent = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get auto-flagged reports
  const query = { autoFlagged: true, status: 'pending' };
  if (type) query.targetType = type;

  const [reports, total] = await Promise.all([
    Report.find(query)
      .populate('reporter', 'username displayName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Report.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      items: reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * @desc    Hide content
 * @route   POST /api/admin/content/:type/:id/hide
 * @access  Admin/Moderator
 */
const hideContent = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const { reason } = req.body;

  const ModelMap = {
    submission: LyricsSubmission,
    song: Song,
    stem: StemUpload,
    message: ChatMessage,
  };

  const Model = ModelMap[type];
  if (!Model) {
    throw new AppError('Invalid content type', 400);
  }

  const content = await Model.findById(id);
  if (!content) {
    throw new AppError('Content not found', 404);
  }

  content.isHidden = true;
  content.hiddenBy = req.user._id;
  content.hiddenAt = new Date();
  content.hiddenReason = reason;
  await content.save();

  // Log action
  await logModAction({
    moderator: req.user._id,
    actionType: 'hide-content',
    targetType: type,
    targetId: id,
    targetUser: content.author || content.contributor || content.user,
    reason,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    message: 'Content hidden successfully',
  });
});

/**
 * @desc    Delete content
 * @route   POST /api/admin/content/:type/:id/delete
 * @access  Admin
 */
const deleteContent = asyncHandler(async (req, res) => {
  const { type, id } = req.params;
  const { reason } = req.body;

  const ModelMap = {
    submission: LyricsSubmission,
    song: Song,
    stem: StemUpload,
    message: ChatMessage,
  };

  const Model = ModelMap[type];
  if (!Model) {
    throw new AppError('Invalid content type', 400);
  }

  const content = await Model.findById(id);
  if (!content) {
    throw new AppError('Content not found', 404);
  }

  // Store info before deletion
  const targetUser = content.author || content.contributor || content.user;

  await Model.findByIdAndDelete(id);

  // Log action
  await logModAction({
    moderator: req.user._id,
    actionType: 'delete-content',
    targetType: type,
    targetId: id,
    targetUser,
    reason,
    details: { deletedContent: content.toJSON ? content.toJSON() : content },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    message: 'Content deleted successfully',
  });
});

/**
 * @desc    Feature content
 * @route   POST /api/admin/content/:type/:id/feature
 * @access  Admin/Moderator
 */
const featureContent = asyncHandler(async (req, res) => {
  const { type, id } = req.params;

  const ModelMap = {
    song: Song,
    session: Session,
  };

  const Model = ModelMap[type];
  if (!Model) {
    throw new AppError('Invalid content type for featuring', 400);
  }

  const content = await Model.findById(id);
  if (!content) {
    throw new AppError('Content not found', 404);
  }

  content.isFeatured = true;
  content.featuredAt = new Date();
  content.featuredBy = req.user._id;
  await content.save();

  // Log action
  await logModAction({
    moderator: req.user._id,
    actionType: 'feature-content',
    targetType: type,
    targetId: id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    message: 'Content featured successfully',
  });
});

// ==================== SESSION MANAGEMENT ====================

/**
 * @desc    Get all sessions with admin details
 * @route   GET /api/admin/sessions
 * @access  Admin/Moderator
 */
const getSessions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const query = {};
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [sessions, total] = await Promise.all([
    Session.find(query)
      .populate('host', 'username displayName avatar')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Session.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

/**
 * @desc    Admin update session
 * @route   PUT /api/admin/sessions/:id
 * @access  Admin
 */
const updateSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    throw new AppError('Session not found', 404);
  }

  const allowedFields = ['title', 'description', 'status', 'isFeatured'];
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      session[field] = req.body[field];
    }
  });

  await session.save();

  res.json({
    success: true,
    data: session,
    message: 'Session updated successfully',
  });
});

/**
 * @desc    Force cancel session
 * @route   POST /api/admin/sessions/:id/cancel
 * @access  Admin
 */
const cancelSession = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const session = await Session.findById(req.params.id);
  if (!session) {
    throw new AppError('Session not found', 404);
  }

  session.status = 'cancelled';
  session.cancelledAt = new Date();
  session.cancelledBy = req.user._id;
  session.cancelReason = reason;
  await session.save();

  // Log action
  await logModAction({
    moderator: req.user._id,
    actionType: 'cancel-session',
    targetType: 'session',
    targetId: session._id,
    targetUser: session.host,
    reason,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    message: 'Session cancelled successfully',
  });
});

/**
 * @desc    Feature session
 * @route   POST /api/admin/sessions/:id/feature
 * @access  Admin/Moderator
 */
const featureSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    throw new AppError('Session not found', 404);
  }

  session.isFeatured = !session.isFeatured;
  session.featuredAt = session.isFeatured ? new Date() : undefined;
  await session.save();

  res.json({
    success: true,
    message: session.isFeatured ? 'Session featured' : 'Session unfeatured',
    data: { isFeatured: session.isFeatured },
  });
});

// ==================== SETTINGS ====================

/**
 * @desc    Get all system settings
 * @route   GET /api/admin/settings
 * @access  Admin
 */
const getSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSetting.getAllSettings();
  
  // Group by category
  const grouped = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) acc[setting.category] = [];
    acc[setting.category].push(setting);
    return acc;
  }, {});

  res.json({
    success: true,
    data: grouped,
  });
});

/**
 * @desc    Update setting
 * @route   PUT /api/admin/settings/:key
 * @access  Admin
 */
const updateSetting = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  const setting = await SystemSetting.findOne({ key });
  if (!setting) {
    throw new AppError('Setting not found', 404);
  }

  const oldValue = setting.value;
  setting.value = value;
  setting.updatedBy = req.user._id;
  await setting.save();

  // Log action
  await logModAction({
    moderator: req.user._id,
    actionType: 'update-settings',
    targetType: 'setting',
    targetId: setting._id,
    details: { key, oldValue, newValue: value },
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: setting,
    message: 'Setting updated successfully',
  });
});

// ==================== ANNOUNCEMENTS ====================

/**
 * @desc    Get all announcements
 * @route   GET /api/admin/announcements
 * @access  Admin/Moderator
 */
const getAnnouncements = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  
  const result = await Announcement.getAll({
    page: parseInt(page),
    limit: parseInt(limit),
    status,
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * @desc    Create announcement
 * @route   POST /api/admin/announcements
 * @access  Admin
 */
const createAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.create({
    ...req.body,
    createdBy: req.user._id,
  });

  // Log action
  await logModAction({
    moderator: req.user._id,
    actionType: 'create-announcement',
    targetType: 'announcement',
    targetId: announcement._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.status(201).json({
    success: true,
    data: announcement,
    message: 'Announcement created successfully',
  });
});

/**
 * @desc    Update announcement
 * @route   PUT /api/admin/announcements/:id
 * @access  Admin
 */
const updateAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) {
    throw new AppError('Announcement not found', 404);
  }

  const allowedFields = [
    'title', 'content', 'summary', 'type', 'status',
    'targetAudience', 'priority', 'startDate', 'endDate',
    'dismissible', 'showBanner', 'bannerColor', 'actionUrl', 'actionText'
  ];

  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      announcement[field] = req.body[field];
    }
  });

  announcement.updatedBy = req.user._id;
  
  if (req.body.status === 'active' && announcement.status !== 'active') {
    announcement.publishedAt = new Date();
  }
  if (req.body.status === 'archived' && announcement.status !== 'archived') {
    announcement.archivedAt = new Date();
  }

  await announcement.save();

  // Log action
  await logModAction({
    moderator: req.user._id,
    actionType: 'update-announcement',
    targetType: 'announcement',
    targetId: announcement._id,
    details: req.body,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
  });

  res.json({
    success: true,
    data: announcement,
    message: 'Announcement updated successfully',
  });
});

/**
 * @desc    Delete announcement
 * @route   DELETE /api/admin/announcements/:id
 * @access  Admin
 */
const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) {
    throw new AppError('Announcement not found', 404);
  }

  await Announcement.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Announcement deleted successfully',
  });
});

// ==================== MOD ACTIONS LOG ====================

/**
 * @desc    Get mod actions log
 * @route   GET /api/admin/mod-actions
 * @access  Admin
 */
const getModActions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    moderator,
    actionType,
    targetType,
  } = req.query;

  const result = await ModAction.getActions({
    page: parseInt(page),
    limit: parseInt(limit),
    moderator,
    actionType,
    targetType,
  });

  res.json({
    success: true,
    data: result,
  });
});

module.exports = {
  // Stats
  getDashboardStats,
  getUserStats,
  getSessionStats,
  getRevenueStats,
  // User Management
  getUsers,
  getUserDetails,
  updateUser,
  warnUser,
  muteUser,
  banUser,
  unbanUser,
  // Reports
  getReports,
  getReportDetails,
  updateReport,
  // Content
  getFlaggedContent,
  hideContent,
  deleteContent,
  featureContent,
  // Sessions
  getSessions,
  updateSession,
  cancelSession,
  featureSession,
  // Settings
  getSettings,
  updateSetting,
  // Announcements
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  // Mod Actions
  getModActions,
};
