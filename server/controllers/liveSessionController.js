const { asyncHandler, AppError, ErrorCodes } = require('../middleware/errorHandler');
const LiveSession = require('../models/LiveSession');
const ChatMessage = require('../models/ChatMessage');
const Reaction = require('../models/Reaction');
const { emitToRoom } = require('../config/socket');
const { startHypeLoop, stopHypeLoop, getHypeDescription } = require('../services/hypeCalculationService');

// Track viewers per session
const sessionViewers = new Map(); // sessionId -> Set of socket ids

// ==========================================
// LIVE SESSION MANAGEMENT
// ==========================================

// @desc    Create a new live session
// @route   POST /api/live-sessions
// @access  Private (Creator+)
const createLiveSession = asyncHandler(async (req, res, next) => {
  const {
    title,
    description,
    scheduledStart,
    streamConfig,
    linkedSession,
    thumbnail,
    tags,
    category,
  } = req.body;

  const session = await LiveSession.create({
    title,
    description,
    host: req.userId,
    scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
    streamConfig,
    linkedSession,
    thumbnail,
    tags,
    category,
  });

  await session.populate('host', 'username displayName avatar');

  res.status(201).json({
    success: true,
    message: 'Live session created',
    data: { session },
  });
});

// @desc    Get all live sessions with filters
// @route   GET /api/live-sessions
// @access  Public
const getLiveSessions = asyncHandler(async (req, res) => {
  const { status, category, host, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;
  if (host) query.host = host;

  const sessions = await LiveSession.find(query)
    .populate('host', 'username displayName avatar')
    .sort(status === 'live' ? '-engagement.currentViewers' : '-createdAt')
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .lean();

  const total = await LiveSession.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// @desc    Get currently live sessions
// @route   GET /api/live-sessions/live
// @access  Public
const getCurrentlyLive = asyncHandler(async (req, res) => {
  const sessions = await LiveSession.getLive();

  res.status(200).json({
    success: true,
    data: { sessions },
  });
});

// @desc    Get upcoming sessions
// @route   GET /api/live-sessions/upcoming
// @access  Public
const getUpcoming = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const sessions = await LiveSession.getUpcoming(parseInt(limit));

  res.status(200).json({
    success: true,
    data: { sessions },
  });
});

// @desc    Get past sessions
// @route   GET /api/live-sessions/past
// @access  Public
const getPast = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;
  const sessions = await LiveSession.getPast(parseInt(limit));

  res.status(200).json({
    success: true,
    data: { sessions },
  });
});

// @desc    Get single live session
// @route   GET /api/live-sessions/:id
// @access  Public
const getLiveSession = asyncHandler(async (req, res, next) => {
  const session = await LiveSession.findById(req.params.id)
    .populate('host', 'username displayName avatar')
    .populate('coHosts', 'username displayName avatar')
    .populate('linkedSession', 'title status stage');

  if (!session) {
    return next(new AppError('Live session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Add hype description
  const sessionObj = session.toObject();
  sessionObj.hypeDescription = getHypeDescription(session.engagement.hypeLevel);

  res.status(200).json({
    success: true,
    data: { session: sessionObj },
  });
});

// @desc    Update live session
// @route   PUT /api/live-sessions/:id
// @access  Private (Host only)
const updateLiveSession = asyncHandler(async (req, res, next) => {
  const session = await LiveSession.findById(req.params.id);

  if (!session) {
    return next(new AppError('Live session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!session.isHostOrCoHost(req.userId)) {
    return next(new AppError('Only the host can update this session', 403, ErrorCodes.FORBIDDEN));
  }

  const allowedUpdates = [
    'title', 'description', 'scheduledStart', 'streamConfig',
    'thumbnail', 'tags', 'category', 'coHosts',
  ];

  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      session[field] = req.body[field];
    }
  });

  await session.save();
  await session.populate('host', 'username displayName avatar');

  res.status(200).json({
    success: true,
    message: 'Live session updated',
    data: { session },
  });
});

// @desc    Go live
// @route   POST /api/live-sessions/:id/go-live
// @access  Private (Host only)
const goLive = asyncHandler(async (req, res, next) => {
  const session = await LiveSession.findById(req.params.id);

  if (!session) {
    return next(new AppError('Live session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!session.isHostOrCoHost(req.userId)) {
    return next(new AppError('Only the host can start the stream', 403, ErrorCodes.FORBIDDEN));
  }

  if (session.status === 'live') {
    return next(new AppError('Session is already live', 400, ErrorCodes.CONFLICT));
  }

  await session.goLive();

  // Start hype calculation loop
  startHypeLoop(session._id.toString());

  // Broadcast to all connected clients
  emitToRoom(session._id.toString(), 'session:status', {
    status: 'live',
    startedAt: session.actualStart,
  });

  res.status(200).json({
    success: true,
    message: 'You are now live!',
    data: { session },
  });
});

// @desc    End stream
// @route   POST /api/live-sessions/:id/end
// @access  Private (Host only)
const endStream = asyncHandler(async (req, res, next) => {
  const session = await LiveSession.findById(req.params.id);

  if (!session) {
    return next(new AppError('Live session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!session.isHostOrCoHost(req.userId)) {
    return next(new AppError('Only the host can end the stream', 403, ErrorCodes.FORBIDDEN));
  }

  await session.endStream();

  // Stop hype calculation
  stopHypeLoop(session._id.toString());

  // Broadcast to all viewers
  emitToRoom(session._id.toString(), 'session:status', {
    status: 'ended',
    endedAt: session.endedAt,
    duration: session.duration,
  });

  res.status(200).json({
    success: true,
    message: 'Stream ended',
    data: { session },
  });
});

// @desc    Pause stream (break time)
// @route   POST /api/live-sessions/:id/pause
// @access  Private (Host only)
const pauseStream = asyncHandler(async (req, res, next) => {
  const session = await LiveSession.findById(req.params.id);

  if (!session) {
    return next(new AppError('Live session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!session.isHostOrCoHost(req.userId)) {
    return next(new AppError('Only the host can pause the stream', 403, ErrorCodes.FORBIDDEN));
  }

  if (session.status === 'paused') {
    await session.resumeStream();
  } else {
    await session.pauseStream();
  }

  emitToRoom(session._id.toString(), 'session:status', {
    status: session.status,
  });

  res.status(200).json({
    success: true,
    message: session.status === 'paused' ? 'Stream paused' : 'Stream resumed',
    data: { session },
  });
});

// ==========================================
// CHAT
// ==========================================

// @desc    Get recent chat messages
// @route   GET /api/live-sessions/:id/chat
// @access  Public
const getChatMessages = asyncHandler(async (req, res, next) => {
  const { limit = 100, before } = req.query;
  
  const messages = await ChatMessage.getRecent(
    req.params.id,
    parseInt(limit),
    before ? new Date(before) : null
  );

  res.status(200).json({
    success: true,
    data: { messages },
  });
});

// @desc    Post chat message
// @route   POST /api/live-sessions/:id/chat
// @access  Private
const postChatMessage = asyncHandler(async (req, res, next) => {
  const { message, replyTo } = req.body;
  const sessionId = req.params.id;

  const session = await LiveSession.findById(sessionId);
  if (!session) {
    return next(new AppError('Live session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!session.streamConfig.chatEnabled) {
    return next(new AppError('Chat is disabled for this session', 400, ErrorCodes.FORBIDDEN));
  }

  // Check slow mode
  if (session.streamConfig.slowModeSeconds > 0) {
    const cooldownTime = new Date(Date.now() - session.streamConfig.slowModeSeconds * 1000);
    const recentMessage = await ChatMessage.findOne({
      session: sessionId,
      user: req.userId,
      createdAt: { $gte: cooldownTime },
    });

    if (recentMessage) {
      const waitTime = Math.ceil(
        (recentMessage.createdAt.getTime() + session.streamConfig.slowModeSeconds * 1000 - Date.now()) / 1000
      );
      return res.status(429).json({
        success: false,
        error: 'Slow mode active',
        message: `Please wait ${waitTime} seconds`,
        waitSeconds: waitTime,
      });
    }
  }

  // Determine message type and badges
  const isHost = session.isHostOrCoHost(req.userId);
  const badges = [];
  if (isHost) badges.push('creator');
  if (['moderator', 'admin'].includes(req.user?.role)) badges.push('moderator');

  const chatMessage = await ChatMessage.create({
    session: sessionId,
    user: req.userId,
    message,
    type: isHost ? 'host' : 'message',
    badges,
    replyTo,
    color: ChatMessage.getColorForUsername(req.user?.username),
    metadata: {
      userReputation: req.user?.reputation?.score,
      userType: req.user?.userType,
    },
  });

  await chatMessage.populate('user', 'username displayName avatar');
  if (replyTo) {
    await chatMessage.populate('replyTo', 'message user');
  }

  // Increment chat count
  session.engagement.chatMessages++;
  await session.save();

  // Broadcast to session
  emitToRoom(sessionId, 'chat:message', chatMessage.toSafeObject());

  res.status(201).json({
    success: true,
    data: { message: chatMessage.toSafeObject() },
  });
});

// @desc    Delete chat message
// @route   DELETE /api/live-sessions/:id/chat/:messageId
// @access  Private (Moderator/Host)
const deleteChatMessage = asyncHandler(async (req, res, next) => {
  const { id: sessionId, messageId } = req.params;

  const session = await LiveSession.findById(sessionId);
  if (!session) {
    return next(new AppError('Live session not found', 404, ErrorCodes.NOT_FOUND));
  }

  const isHost = session.isHostOrCoHost(req.userId);
  const isModerator = ['moderator', 'admin'].includes(req.user?.role);

  if (!isHost && !isModerator) {
    return next(new AppError('Not authorized to delete messages', 403, ErrorCodes.FORBIDDEN));
  }

  const message = await ChatMessage.findById(messageId);
  if (!message || message.session.toString() !== sessionId) {
    return next(new AppError('Message not found', 404, ErrorCodes.NOT_FOUND));
  }

  await message.softDelete(req.userId);

  emitToRoom(sessionId, 'chat:delete', { messageId });

  res.status(200).json({
    success: true,
    message: 'Message deleted',
  });
});

// @desc    Highlight chat message
// @route   POST /api/live-sessions/:id/chat/:messageId/highlight
// @access  Private (Moderator/Host)
const highlightChatMessage = asyncHandler(async (req, res, next) => {
  const { id: sessionId, messageId } = req.params;

  const session = await LiveSession.findById(sessionId);
  if (!session) {
    return next(new AppError('Live session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!session.isHostOrCoHost(req.userId)) {
    return next(new AppError('Not authorized to highlight messages', 403, ErrorCodes.FORBIDDEN));
  }

  const message = await ChatMessage.findById(messageId);
  if (!message || message.session.toString() !== sessionId) {
    return next(new AppError('Message not found', 404, ErrorCodes.NOT_FOUND));
  }

  await message.highlight();
  await message.populate('user', 'username displayName avatar');

  emitToRoom(sessionId, 'chat:highlight', message.toSafeObject());

  res.status(200).json({
    success: true,
    data: { message: message.toSafeObject() },
  });
});

// ==========================================
// REACTIONS
// ==========================================

// @desc    Post reaction
// @route   POST /api/live-sessions/:id/react
// @access  Private
const postReaction = asyncHandler(async (req, res, next) => {
  const { type } = req.body;
  const sessionId = req.params.id;

  if (!Reaction.REACTION_EMOJIS[type]) {
    return next(new AppError('Invalid reaction type', 400, ErrorCodes.VALIDATION_ERROR));
  }

  const session = await LiveSession.findById(sessionId);
  if (!session) {
    return next(new AppError('Live session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check rate limit
  const canReact = await Reaction.checkRateLimit(sessionId, req.userId, type);
  if (!canReact) {
    return res.status(429).json({
      success: false,
      error: 'Rate limited',
      message: 'Please wait before sending another reaction',
    });
  }

  // Create reaction
  await Reaction.create({
    session: sessionId,
    user: req.userId,
    type,
  });

  // Update session reaction count
  await session.addReaction(type);

  // Broadcast reaction (for floating animation)
  emitToRoom(sessionId, 'reaction:burst', {
    type,
    emoji: Reaction.REACTION_EMOJIS[type],
    userId: req.userId,
  });

  // Check for reaction burst
  const isBurst = await Reaction.detectBurst(sessionId);
  if (isBurst) {
    emitToRoom(sessionId, 'reaction:megaBurst', {
      message: 'Reaction burst!',
    });
  }

  res.status(200).json({
    success: true,
    data: { type, emoji: Reaction.REACTION_EMOJIS[type] },
  });
});

// @desc    Get reaction counts
// @route   GET /api/live-sessions/:id/reactions
// @access  Public
const getReactions = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  const { period = 60 } = req.query;

  const recentCounts = await Reaction.getRecentCounts(sessionId, parseInt(period));
  
  const session = await LiveSession.findById(sessionId).select('engagement.reactions');
  const totalCounts = session?.engagement?.reactions || {};

  res.status(200).json({
    success: true,
    data: {
      recent: recentCounts,
      total: totalCounts,
      emojis: Reaction.REACTION_EMOJIS,
    },
  });
});

// ==========================================
// VOTING ROUNDS
// ==========================================

// @desc    Start voting round
// @route   POST /api/live-sessions/:id/voting-round
// @access  Private (Host)
const startVotingRound = asyncHandler(async (req, res, next) => {
  const { type, question, options, duration = 30 } = req.body;
  const sessionId = req.params.id;

  const session = await LiveSession.findById(sessionId);
  if (!session) {
    return next(new AppError('Live session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!session.isHostOrCoHost(req.userId)) {
    return next(new AppError('Only the host can start voting rounds', 403, ErrorCodes.FORBIDDEN));
  }

  // Check no active round
  const activeRound = session.votingRounds.find(r => r.status === 'active');
  if (activeRound) {
    return next(new AppError('A voting round is already active', 400, ErrorCodes.CONFLICT));
  }

  const formattedOptions = options.map((opt, idx) => ({
    id: opt.id || `option-${idx}`,
    label: opt.label,
    value: opt.value,
    votes: 0,
  }));

  const round = await session.startVotingRound({
    type,
    question,
    options: formattedOptions,
    duration,
  });

  // Broadcast to session
  emitToRoom(sessionId, 'voting:start', {
    round,
    endsAt: new Date(Date.now() + duration * 1000).toISOString(),
  });

  // Auto-end after duration
  setTimeout(async () => {
    const updatedSession = await LiveSession.findById(sessionId);
    const stillActive = updatedSession?.votingRounds.find(
      r => r.roundNumber === round.roundNumber && r.status === 'active'
    );
    if (stillActive) {
      const endedRound = await updatedSession.endCurrentVotingRound();
      emitToRoom(sessionId, 'voting:end', { round: endedRound });
    }
  }, duration * 1000);

  res.status(201).json({
    success: true,
    data: { round },
  });
});

// @desc    Cast vote in voting round
// @route   PUT /api/live-sessions/:id/voting-round/:round/vote
// @access  Private
const castVoteInRound = asyncHandler(async (req, res, next) => {
  const { optionId } = req.body;
  const { id: sessionId, round: roundNumber } = req.params;

  const session = await LiveSession.findById(sessionId);
  if (!session) {
    return next(new AppError('Live session not found', 404, ErrorCodes.NOT_FOUND));
  }

  const round = session.votingRounds.find(
    r => r.roundNumber === parseInt(roundNumber) && r.status === 'active'
  );

  if (!round) {
    return next(new AppError('Voting round not found or not active', 404, ErrorCodes.NOT_FOUND));
  }

  // Check if already voted
  if (round.voters.includes(req.userId)) {
    return next(new AppError('You have already voted in this round', 400, ErrorCodes.CONFLICT));
  }

  // Find and increment option
  const option = round.options.find(o => o.id === optionId);
  if (!option) {
    return next(new AppError('Invalid option', 400, ErrorCodes.VALIDATION_ERROR));
  }

  option.votes++;
  round.voters.push(req.userId);
  await session.save();

  // Broadcast vote update
  emitToRoom(sessionId, 'voting:update', {
    roundNumber: round.roundNumber,
    options: round.options.map(o => ({ id: o.id, votes: o.votes })),
    totalVotes: round.voters.length,
  });

  res.status(200).json({
    success: true,
    message: 'Vote recorded',
    data: { votedFor: optionId },
  });
});

// @desc    Get current voting round
// @route   GET /api/live-sessions/:id/voting-round/current
// @access  Public
const getCurrentVotingRound = asyncHandler(async (req, res) => {
  const session = await LiveSession.findById(req.params.id);
  
  if (!session) {
    return res.status(200).json({
      success: true,
      data: { round: null },
    });
  }

  const activeRound = session.votingRounds.find(r => r.status === 'active');

  res.status(200).json({
    success: true,
    data: { round: activeRound || null },
  });
});

// ==========================================
// ACTIVITY
// ==========================================

// @desc    Update current activity
// @route   POST /api/live-sessions/:id/activity
// @access  Private (Host)
const updateActivity = asyncHandler(async (req, res, next) => {
  const { type, data } = req.body;
  const sessionId = req.params.id;

  const session = await LiveSession.findById(sessionId);
  if (!session) {
    return next(new AppError('Live session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!session.isHostOrCoHost(req.userId)) {
    return next(new AppError('Only the host can update activity', 403, ErrorCodes.FORBIDDEN));
  }

  session.currentActivity = {
    type,
    data,
    startedAt: new Date(),
  };
  await session.save();

  emitToRoom(sessionId, 'activity:change', session.currentActivity);

  res.status(200).json({
    success: true,
    data: { activity: session.currentActivity },
  });
});

// @desc    Get current activity
// @route   GET /api/live-sessions/:id/activity
// @access  Public
const getActivity = asyncHandler(async (req, res) => {
  const session = await LiveSession.findById(req.params.id).select('currentActivity');

  res.status(200).json({
    success: true,
    data: { activity: session?.currentActivity || null },
  });
});

module.exports = {
  createLiveSession,
  getLiveSessions,
  getCurrentlyLive,
  getUpcoming,
  getPast,
  getLiveSession,
  updateLiveSession,
  goLive,
  endStream,
  pauseStream,
  getChatMessages,
  postChatMessage,
  deleteChatMessage,
  highlightChatMessage,
  postReaction,
  getReactions,
  startVotingRound,
  castVoteInRound,
  getCurrentVotingRound,
  updateActivity,
  getActivity,
};

