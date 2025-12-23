const crypto = require('crypto');
const { asyncHandler, AppError, ErrorCodes } = require('../middleware/errorHandler');
const Session = require('../models/Session');
const LyricsSubmission = require('../models/LyricsSubmission');
const Vote = require('../models/Vote');
const User = require('../models/User');
const { emitToSession, broadcast } = require('../config/socket');

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Generate unique 6-character session code
 * @returns {string} Uppercase alphanumeric code
 */
const generateSessionCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

/**
 * Check if user can perform action on session
 * @param {Object} user - User object
 * @param {Object} session - Session object
 * @param {string} action - Action to perform
 * @returns {boolean}
 */
const canPerformAction = (user, session, action) => {
  // Admin can do everything
  if (user.role === 'admin') return true;

  const isHost = session.host.toString() === user._id.toString();
  const isModerator = user.role === 'moderator';

  switch (action) {
    case 'create':
      return ['admin', 'moderator', 'creator'].includes(user.role);
    case 'update':
    case 'delete':
    case 'advance':
    case 'start':
    case 'end':
    case 'pause':
    case 'resume':
      return isHost || isModerator;
    case 'addSong':
      return isHost || isModerator || (session.settings?.allowSongRequests);
    case 'removeSong':
    case 'kick':
      return isHost || isModerator;
    case 'join':
    case 'leave':
    case 'vote':
    case 'feedback':
      return true; // All authenticated users
    default:
      return false;
  }
};

/**
 * Format session response with computed fields
 * @param {Object} session - Session object
 * @param {Object} options - Additional options
 * @returns {Object} Formatted session
 */
const formatSessionResponse = (session, options = {}) => {
  const sessionObj = session.toObject ? session.toObject() : session;
  
  return {
    ...sessionObj,
    participantCount: sessionObj.stats?.totalParticipants || sessionObj.participants?.length || 0,
    isActive: ['lyrics-open', 'lyrics-voting', 'generation', 'song-voting', 'active'].includes(sessionObj.status),
    ...options,
  };
};

// =============================================
// SESSION CRUD OPERATIONS
// =============================================

// @desc    Create new session
// @route   POST /api/sessions
// @access  Private (admin, moderator, creator roles only)
const createSession = asyncHandler(async (req, res, next) => {
  // Double-check permission (middleware should catch this, but extra safety)
  if (!req.user.canCreateSession) {
    return next(new AppError(
      'Access denied. Only administrators, moderators, and creators can create sessions.',
      403,
      ErrorCodes.FORBIDDEN
    ));
  }

  const {
    title,
    description,
    genre,
    mood,
    targetBPM,
    theme,
    guidelines,
    maxParticipants,
    settings,
    schedule,
    tags,
    visibility,
  } = req.body;

  // Validate required fields
  if (!title) {
    return next(new AppError('Title is required', 400, ErrorCodes.MISSING_FIELD));
  }

  if (!genre) {
    return next(new AppError('Genre is required', 400, ErrorCodes.MISSING_FIELD));
  }

  // Generate unique session code
  let sessionCode = generateSessionCode();
  let codeExists = await Session.findOne({ sessionCode });
  let attempts = 0;
  
  while (codeExists && attempts < 10) {
    sessionCode = generateSessionCode();
    codeExists = await Session.findOne({ sessionCode });
    attempts++;
  }

  if (codeExists) {
    return next(new AppError(
      'Error generating unique session code. Please try again.',
      500,
      ErrorCodes.INTERNAL_ERROR
    ));
  }

  // Create session
  const session = await Session.create({
    title: title.trim(),
    description: description?.trim() || '',
    genre,
    mood,
    targetBPM,
    theme,
    guidelines,
    maxParticipants: maxParticipants || 100,
    sessionCode,
    settings: {
      lyricsDeadline: settings?.lyricsDeadline,
      votingDeadline: settings?.votingDeadline,
      allowAnonymous: settings?.allowAnonymous || false,
      minReputationToSubmit: settings?.minReputationToSubmit || 0,
      votingSystem: settings?.votingSystem || 'simple',
      maxLyricsPerUser: settings?.maxLyricsPerUser || 1,
      showVoteCountsDuringVoting: settings?.showVoteCountsDuringVoting || false,
      requireApproval: settings?.requireApproval || false,
      allowSongRequests: settings?.allowSongRequests !== false,
      votingEnabled: settings?.votingEnabled !== false,
      isPublic: settings?.isPublic !== false,
    },
    schedule: {
      scheduledStart: schedule?.scheduledStart,
      estimatedDuration: schedule?.estimatedDuration,
    },
    tags: tags || [],
    visibility: visibility || 'public',
    host: req.userId,
    participants: [{ user: req.userId, role: 'host', joinedAt: new Date() }],
    stats: { totalParticipants: 1 },
    status: 'draft',
  });

  // Update user stats
  await User.findByIdAndUpdate(req.userId, {
    $inc: { 'stats.sessionsCreated': 1, 'stats.sessionsHosted': 1 },
  });

  // Populate host info
  await session.populate('host', 'username displayName avatar role reputation.level');

  res.status(201).json({
    success: true,
    message: 'Session created successfully',
    data: { 
      session: formatSessionResponse(session),
    },
  });
});

// @desc    Get all sessions
// @route   GET /api/sessions
// @access  Public (filtered based on role)
const getSessions = asyncHandler(async (req, res) => {
  const { 
    status, 
    genre, 
    upcoming, 
    past, 
    live,
    host,
    search,
    page = 1, 
    limit = 20, 
    sort = '-createdAt' 
  } = req.query;

  // Build query based on user role
  let query = {};

  // Non-authenticated users or regular users only see public sessions
  if (!req.user || req.user.role === 'user') {
    query.visibility = 'public';
    query.status = { $nin: ['draft', 'cancelled'] };
  } else if (req.user.role === 'creator') {
    // Creators see public sessions and their own sessions
    query.$or = [
      { visibility: 'public', status: { $nin: ['cancelled'] } },
      { host: req.userId },
    ];
  }
  // Admin and moderator see all sessions (no filter)
  
  // Apply filters
  if (status) {
    if (Array.isArray(query.status)) {
      query.status.$in = query.status.$in || [];
      query.status.$in.push(status);
    } else {
      query.status = status;
    }
  }
  
  if (genre) {
    query.genre = genre;
  }
  
  if (host) {
    query.host = host;
  }

  if (search) {
    query.$or = query.$or || [];
    query.$or.push(
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    );
  }
  
  if (live === 'true') {
    query.status = { $in: ['lyrics-open', 'lyrics-voting', 'generation', 'song-voting', 'active'] };
  }
  
  if (upcoming === 'true') {
    query.status = 'draft';
    query['schedule.scheduledStart'] = { $gte: new Date() };
  }
  
  if (past === 'true') {
    query.status = 'completed';
  }

  // Execute query with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [sessions, total] = await Promise.all([
    Session.find(query)
      .populate('host', 'username displayName avatar reputation.level role')
      .select('-inviteCode')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Session.countDocuments(query),
  ]);

  // Add computed fields
  const sessionsWithMeta = sessions.map(session => formatSessionResponse(session));

  res.status(200).json({
    success: true,
    data: {
      sessions: sessionsWithMeta,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

// @desc    Get live sessions
// @route   GET /api/sessions/live
// @access  Public
const getLiveSessions = asyncHandler(async (req, res) => {
  const query = {
    status: { $in: ['lyrics-open', 'lyrics-voting', 'generation', 'song-voting', 'active'] },
    visibility: 'public',
  };

  const sessions = await Session.find(query)
    .populate('host', 'username displayName avatar reputation.level role')
    .select('-participants -inviteCode')
    .sort({ 'stats.totalParticipants': -1, createdAt: -1 })
    .limit(20)
    .lean();

  res.status(200).json({
    success: true,
    data: { 
      sessions: sessions.map(s => formatSessionResponse(s)),
      count: sessions.length,
    },
  });
});

// @desc    Get single session by ID
// @route   GET /api/sessions/:id
// @access  Public (with role-based data filtering)
const getSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id)
    .populate('host', 'username displayName avatar reputation.level reputation.score role')
    .populate('participants.user', 'username displayName avatar reputation.level')
    .populate('results.winningLyrics', 'content.title content.fullLyrics author')
    .lean();

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check access for non-public sessions
  const isHost = req.userId && session.host._id.toString() === req.userId;
  const isAdmin = req.user && req.user.role === 'admin';
  const isModerator = req.user && req.user.role === 'moderator';
  const isParticipant = req.userId && session.participants?.some(
    p => p.user._id.toString() === req.userId
  );

  if (session.visibility !== 'public' && !isHost && !isAdmin && !isModerator && !isParticipant) {
    return next(new AppError('Access denied. This is a private session.', 403, ErrorCodes.FORBIDDEN));
  }

  // Get submission count
  const submissionCount = await LyricsSubmission.countDocuments({ 
    session: session._id,
    status: { $ne: 'rejected' },
  });

  // Get user's submission and votes if authenticated
  let userSubmission = null;
  let userVotes = [];
  let userRole = null;
  
  if (req.userId) {
    userSubmission = await LyricsSubmission.findOne({
      session: session._id,
      author: req.userId,
    }).lean();
    
    userVotes = await Vote.getUserVotesForSession(req.userId, session._id, 'lyrics');
    
    // Get user's role in this session
    const participant = session.participants?.find(p => p.user._id.toString() === req.userId);
    userRole = participant?.role || null;
  }

  // Build response with user permissions for this session
  const userPermissions = req.user ? {
    canEdit: isHost || isAdmin || isModerator,
    canDelete: isHost || isAdmin,
    canAdvance: isHost || isAdmin || isModerator,
    canKick: isHost || isAdmin || isModerator,
    canAddSong: isHost || isAdmin || isModerator || session.settings?.allowSongRequests,
    canRemoveSong: isHost || isAdmin || isModerator,
    canVote: true,
    canSubmitFeedback: true,
    isHost,
    isParticipant: !!isParticipant,
  } : {
    canEdit: false,
    canDelete: false,
    canAdvance: false,
    canKick: false,
    canAddSong: false,
    canRemoveSong: false,
    canVote: false,
    canSubmitFeedback: false,
    isHost: false,
    isParticipant: false,
  };

  res.status(200).json({
    success: true,
    data: {
      session: formatSessionResponse(session, { submissionCount }),
      userSubmission,
      userVotes: userVotes.map(v => v.targetId.toString()),
      userRole,
      userPermissions,
    },
  });
});

// @desc    Get session by code
// @route   GET /api/sessions/code/:code
// @access  Public
const getSessionByCode = asyncHandler(async (req, res, next) => {
  const sessionCode = req.params.code.toUpperCase();

  const session = await Session.findOne({ sessionCode })
    .populate('host', 'username displayName avatar reputation.level role')
    .populate('participants.user', 'username displayName avatar')
    .lean();

  if (!session) {
    return next(new AppError('Session not found. Please check the code and try again.', 404, ErrorCodes.NOT_FOUND));
  }

  res.status(200).json({
    success: true,
    data: {
      session: formatSessionResponse(session),
    },
  });
});

// @desc    Update session
// @route   PUT /api/sessions/:id
// @access  Private (host, moderator, or admin only)
const updateSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check permission
  const isHost = session.host.toString() === req.userId;
  const isAdmin = req.user.role === 'admin';
  const isModerator = req.user.role === 'moderator';

  if (!isHost && !isAdmin && !isModerator) {
    return next(new AppError(
      'Access denied. Only the host, moderators, or administrators can update this session.',
      403,
      ErrorCodes.FORBIDDEN
    ));
  }

  // Define allowed updates based on session status and user role
  let allowedUpdates;
  
  if (isAdmin) {
    // Admin can update everything
    allowedUpdates = [
      'title', 'description', 'genre', 'mood', 'targetBPM', 'theme', 
      'guidelines', 'maxParticipants', 'settings', 'schedule', 'tags', 
      'visibility', 'status'
    ];
  } else if (session.status === 'draft') {
    // Host/moderator can update all fields on draft sessions
    allowedUpdates = [
      'title', 'description', 'genre', 'mood', 'targetBPM', 'theme',
      'guidelines', 'maxParticipants', 'settings', 'schedule', 'tags', 'visibility'
    ];
  } else {
    // Host/moderator can only update limited fields on active sessions
    allowedUpdates = ['description', 'guidelines', 'settings.votingDeadline', 'settings.lyricsDeadline'];
  }

  // Filter updates
  const updates = {};
  for (const key of allowedUpdates) {
    if (key.includes('.')) {
      // Handle nested updates
      const [parent, child] = key.split('.');
      if (req.body[parent]?.[child] !== undefined) {
        updates[key] = req.body[parent][child];
      }
    } else if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  const updatedSession = await Session.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('host', 'username displayName avatar role');

  // Emit update to session room
  emitToSession(session._id.toString(), 'session:updated', { 
    session: formatSessionResponse(updatedSession),
    updatedBy: req.userId,
  });

  res.status(200).json({
    success: true,
    message: 'Session updated successfully',
    data: { session: formatSessionResponse(updatedSession) },
  });
});

// @desc    Delete session
// @route   DELETE /api/sessions/:id
// @access  Private (admin only for hard delete, host can cancel)
const deleteSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  const isHost = session.host.toString() === req.userId;
  const isAdmin = req.user.role === 'admin';

  // Only admin can hard delete, host can only cancel
  if (!isAdmin && !isHost) {
    return next(new AppError(
      'Access denied. Only administrators can delete sessions.',
      403,
      ErrorCodes.FORBIDDEN
    ));
  }

  if (isAdmin) {
    // Hard delete
    await Session.findByIdAndDelete(req.params.id);
    
    // Also delete related data
    await Promise.all([
      LyricsSubmission.deleteMany({ session: req.params.id }),
      Vote.deleteMany({ session: req.params.id }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Session deleted permanently',
    });
  } else {
    // Host can only cancel (soft delete)
    session.status = 'cancelled';
    await session.save();

    // Emit cancellation
    emitToSession(session._id.toString(), 'session:cancelled', {
      sessionId: session._id,
      cancelledBy: req.userId,
    });

    res.status(200).json({
      success: true,
      message: 'Session cancelled',
    });
  }
});

// =============================================
// SESSION STATE MANAGEMENT
// =============================================

// @desc    Start session
// @route   PUT /api/sessions/:id/start
// @access  Private (host, moderator, or admin only)
const startSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check permission
  const isHost = session.host.toString() === req.userId;
  const isAdmin = req.user.role === 'admin';
  const isModerator = req.user.role === 'moderator';

  if (!isHost && !isAdmin && !isModerator) {
    return next(new AppError(
      'Access denied. Only the host, moderators, or administrators can start this session.',
      403,
      ErrorCodes.FORBIDDEN
    ));
  }

  if (!['draft', 'paused'].includes(session.status)) {
    return next(new AppError(
      `Cannot start session. Current status: ${session.status}`,
      400,
      ErrorCodes.CONFLICT
    ));
  }

  // Update session status
  session.status = 'lyrics-open'; // or 'active' depending on your flow
  session.startedAt = session.startedAt || new Date();
  await session.save();

  // Emit session started
  emitToSession(session._id.toString(), 'session:started', {
    sessionId: session._id,
    status: session.status,
    startedBy: req.userId,
  });

  // Broadcast to all users that a new session is live
  broadcast('session:live', {
    sessionId: session._id,
    title: session.title,
    genre: session.genre,
    host: session.host,
  });

  res.status(200).json({
    success: true,
    message: 'Session started successfully',
    data: { session: formatSessionResponse(session) },
  });
});

// @desc    Pause session
// @route   PUT /api/sessions/:id/pause
// @access  Private (host, moderator, or admin only)
const pauseSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check permission
  const isHost = session.host.toString() === req.userId;
  const isAdmin = req.user.role === 'admin';
  const isModerator = req.user.role === 'moderator';

  if (!isHost && !isAdmin && !isModerator) {
    return next(new AppError(
      'Access denied. Only the host, moderators, or administrators can pause this session.',
      403,
      ErrorCodes.FORBIDDEN
    ));
  }

  const activeStatuses = ['lyrics-open', 'lyrics-voting', 'generation', 'song-voting', 'active'];
  if (!activeStatuses.includes(session.status)) {
    return next(new AppError('Can only pause active sessions', 400, ErrorCodes.CONFLICT));
  }

  // Store previous status for resume
  session.previousStatus = session.status;
  session.status = 'paused';
  await session.save();

  // Emit pause event
  emitToSession(session._id.toString(), 'session:paused', {
    sessionId: session._id,
    pausedBy: req.userId,
  });

  res.status(200).json({
    success: true,
    message: 'Session paused',
    data: { session: formatSessionResponse(session) },
  });
});

// @desc    Resume session
// @route   PUT /api/sessions/:id/resume
// @access  Private (host, moderator, or admin only)
const resumeSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check permission
  const isHost = session.host.toString() === req.userId;
  const isAdmin = req.user.role === 'admin';
  const isModerator = req.user.role === 'moderator';

  if (!isHost && !isAdmin && !isModerator) {
    return next(new AppError(
      'Access denied. Only the host, moderators, or administrators can resume this session.',
      403,
      ErrorCodes.FORBIDDEN
    ));
  }

  if (session.status !== 'paused') {
    return next(new AppError('Can only resume paused sessions', 400, ErrorCodes.CONFLICT));
  }

  // Restore previous status
  session.status = session.previousStatus || 'lyrics-open';
  session.previousStatus = undefined;
  await session.save();

  // Emit resume event
  emitToSession(session._id.toString(), 'session:resumed', {
    sessionId: session._id,
    status: session.status,
    resumedBy: req.userId,
  });

  res.status(200).json({
    success: true,
    message: 'Session resumed',
    data: { session: formatSessionResponse(session) },
  });
});

// @desc    End session
// @route   PUT /api/sessions/:id/end
// @access  Private (host, moderator, or admin only)
const endSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check permission
  const isHost = session.host.toString() === req.userId;
  const isAdmin = req.user.role === 'admin';
  const isModerator = req.user.role === 'moderator';

  if (!isHost && !isAdmin && !isModerator) {
    return next(new AppError(
      'Access denied. Only the host, moderators, or administrators can end this session.',
      403,
      ErrorCodes.FORBIDDEN
    ));
  }

  if (['completed', 'cancelled'].includes(session.status)) {
    return next(new AppError('Session has already ended', 400, ErrorCodes.CONFLICT));
  }

  // Mark all participants as inactive
  session.participants.forEach(p => {
    if (p.isActive !== false) {
      p.isActive = false;
      p.leftAt = new Date();
    }
  });

  session.status = 'completed';
  session.endedAt = new Date();
  await session.save();

  // Emit end event
  emitToSession(session._id.toString(), 'session:ended', {
    sessionId: session._id,
    endedBy: req.userId,
  });

  res.status(200).json({
    success: true,
    message: 'Session ended successfully',
    data: { session: formatSessionResponse(session) },
  });
});

// @desc    Advance session to next stage
// @route   PUT /api/sessions/:id/stage
// @access  Private (host, moderator, or admin only)
const advanceStage = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check permission
  const isHost = session.host.toString() === req.userId;
  const isAdmin = req.user.role === 'admin';
  const isModerator = req.user.role === 'moderator';

  if (!isHost && !isAdmin && !isModerator) {
    return next(new AppError(
      'Access denied. Only the host, moderators, or administrators can advance the stage.',
      403,
      ErrorCodes.FORBIDDEN
    ));
  }

  if (session.status === 'completed' || session.status === 'cancelled') {
    return next(new AppError('Session has already ended', 400, ErrorCodes.CONFLICT));
  }

  // If advancing from lyrics-voting, calculate winners
  if (session.status === 'lyrics-voting') {
    const rankedSubmissions = await LyricsSubmission.getRankedSubmissions(
      session._id,
      session.settings.votingSystem
    );

    if (rankedSubmissions.length > 0) {
      // Mark winner and runner-ups
      const winner = rankedSubmissions[0];
      await LyricsSubmission.findByIdAndUpdate(winner._id, { 
        status: 'winner', 
        ranking: 1 
      });

      session.results.winningLyrics = winner._id;
      session.results.runnerUpLyrics = rankedSubmissions.slice(1, 4).map(s => s._id);

      // Update rankings for others
      for (let i = 1; i < rankedSubmissions.length; i++) {
        await LyricsSubmission.findByIdAndUpdate(rankedSubmissions[i]._id, {
          status: i < 4 ? 'runnerUp' : 'approved',
          ranking: i + 1,
        });
      }

      // Award reputation to winner
      if (winner.author) {
        await User.findByIdAndUpdate(winner.author, {
          $inc: { 
            'reputation.score': 50,
            'stats.lyricsWon': 1,
          },
        });
      }
    }
  }

  await session.advanceStage();

  // Emit stage change
  emitToSession(session._id.toString(), 'session:stageChanged', {
    sessionId: session._id,
    newStatus: session.status,
    newStage: session.stage,
    advancedBy: req.userId,
  });

  // Broadcast if session went live
  if (session.status === 'lyrics-open') {
    broadcast('session:live', {
      sessionId: session._id,
      title: session.title,
      genre: session.genre,
    });
  }

  res.status(200).json({
    success: true,
    message: `Session advanced to ${session.status}`,
    data: { session: formatSessionResponse(session) },
  });
});

// =============================================
// PARTICIPANT MANAGEMENT
// =============================================

// @desc    Join session
// @route   POST /api/sessions/:id/join
// @access  Private (all authenticated users)
const joinSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (session.status === 'completed' || session.status === 'cancelled') {
    return next(new AppError('Session has ended', 400, ErrorCodes.CONFLICT));
  }

  // Check if session is full
  if (session.maxParticipants && session.participants.length >= session.maxParticipants) {
    return next(new AppError('Session is full', 400, ErrorCodes.CONFLICT));
  }

  // Check if already a participant
  const existingParticipant = session.participants.find(
    p => p.user.toString() === req.userId
  );

  if (existingParticipant) {
    if (existingParticipant.isActive) {
      return next(new AppError('You have already joined this session', 400, ErrorCodes.CONFLICT));
    } else {
      // Rejoin
      existingParticipant.isActive = true;
      existingParticipant.joinedAt = new Date();
      existingParticipant.leftAt = undefined;
    }
  } else {
    // Add new participant
    session.participants.push({
      user: req.userId,
      role: 'participant',
      joinedAt: new Date(),
      isActive: true,
    });
    session.stats.totalParticipants = (session.stats.totalParticipants || 0) + 1;
  }

  await session.save();

  // Update user stats
  await User.findByIdAndUpdate(req.userId, {
    $inc: { 'stats.sessionsAttended': 1 },
    currentSession: {
      sessionId: session._id,
      joinedAt: new Date(),
      role: 'participant',
    },
  });

  // Emit participant joined
  emitToSession(session._id.toString(), 'session:participantJoined', {
    userId: req.userId,
    user: {
      id: req.user._id,
      username: req.user.username,
      displayName: req.user.displayName,
      avatar: req.user.avatarUrl,
    },
    participantCount: session.participants.filter(p => p.isActive).length,
  });

  await session.populate('host', 'username displayName avatar role');

  res.status(200).json({
    success: true,
    message: 'Successfully joined the session',
    data: { session: formatSessionResponse(session) },
  });
});

// @desc    Leave session
// @route   POST /api/sessions/:id/leave
// @access  Private (all authenticated users)
const leaveSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Find participant
  const participant = session.participants.find(
    p => p.user.toString() === req.userId
  );

  if (!participant) {
    return next(new AppError('You are not in this session', 400, ErrorCodes.CONFLICT));
  }

  // Check if user is host
  if (participant.role === 'host') {
    return next(new AppError('Host cannot leave the session. Please end the session instead.', 400, ErrorCodes.CONFLICT));
  }

  // Mark as inactive
  participant.isActive = false;
  participant.leftAt = new Date();

  await session.save();

  // Update user
  await User.findByIdAndUpdate(req.userId, {
    currentSession: undefined,
  });

  // Emit participant left
  emitToSession(session._id.toString(), 'session:participantLeft', {
    userId: req.userId,
    participantCount: session.participants.filter(p => p.isActive).length,
  });

  res.status(200).json({
    success: true,
    message: 'Successfully left the session',
  });
});

// @desc    Kick participant from session
// @route   POST /api/sessions/:id/kick/:userId
// @access  Private (host, moderator, or admin only)
const kickParticipant = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check permission
  const isHost = session.host.toString() === req.userId;
  const isAdmin = req.user.role === 'admin';
  const isModerator = req.user.role === 'moderator';

  if (!isHost && !isAdmin && !isModerator) {
    return next(new AppError(
      'Access denied. Only the host, moderators, or administrators can kick participants.',
      403,
      ErrorCodes.FORBIDDEN
    ));
  }

  const targetUserId = req.params.userId;

  // Cannot kick yourself
  if (targetUserId === req.userId) {
    return next(new AppError('You cannot kick yourself', 400, ErrorCodes.CONFLICT));
  }

  // Cannot kick the host
  if (targetUserId === session.host.toString()) {
    return next(new AppError('Cannot kick the session host', 400, ErrorCodes.CONFLICT));
  }

  // Find participant
  const participant = session.participants.find(
    p => p.user.toString() === targetUserId
  );

  if (!participant) {
    return next(new AppError('User is not in this session', 404, ErrorCodes.NOT_FOUND));
  }

  // Mark as kicked
  participant.isActive = false;
  participant.leftAt = new Date();
  participant.kickedAt = new Date();
  participant.kickedBy = req.userId;

  await session.save();

  // Update kicked user
  await User.findByIdAndUpdate(targetUserId, {
    currentSession: undefined,
  });

  // Emit kick event
  emitToSession(session._id.toString(), 'session:participantKicked', {
    userId: targetUserId,
    kickedBy: req.userId,
    participantCount: session.participants.filter(p => p.isActive).length,
  });

  res.status(200).json({
    success: true,
    message: 'Participant kicked successfully',
  });
});

// =============================================
// VOTING & FEEDBACK
// =============================================

// @desc    Vote for a submission/song
// @route   POST /api/sessions/:id/vote
// @access  Private (all authenticated users)
const vote = asyncHandler(async (req, res, next) => {
  const { targetId, voteType = 'lyrics' } = req.body;

  if (!targetId) {
    return next(new AppError('Target ID is required', 400, ErrorCodes.MISSING_FIELD));
  }

  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check if voting is enabled
  if (!session.settings?.votingEnabled) {
    return next(new AppError('Voting is disabled for this session', 400, ErrorCodes.CONFLICT));
  }

  // Check session status allows voting
  const votingStatuses = ['lyrics-voting', 'song-voting', 'active'];
  if (!votingStatuses.includes(session.status)) {
    return next(new AppError('Voting is not open for this session', 400, ErrorCodes.CONFLICT));
  }

  // Check if already voted
  const existingVote = await Vote.findOne({
    user: req.userId,
    session: session._id,
    targetId,
    targetType: voteType,
  });

  if (existingVote) {
    return next(new AppError('You have already voted for this', 400, ErrorCodes.CONFLICT));
  }

  // Calculate vote weight based on user reputation
  const voteWeight = req.user.calculateVoteWeight();

  // Create vote
  const vote = await Vote.create({
    user: req.userId,
    session: session._id,
    targetId,
    targetType: voteType,
    weight: voteWeight,
  });

  // Update user stats
  await User.findByIdAndUpdate(req.userId, {
    $inc: { 'stats.votesCast': 1 },
  });

  // Emit vote event
  emitToSession(session._id.toString(), 'session:vote', {
    targetId,
    voteType,
    userId: req.userId,
    totalVotes: await Vote.countDocuments({ session: session._id, targetId }),
  });

  res.status(200).json({
    success: true,
    message: 'Vote recorded successfully',
    data: {
      voteId: vote._id,
      weight: voteWeight,
    },
  });
});

// @desc    Remove vote
// @route   DELETE /api/sessions/:id/vote/:targetId
// @access  Private (all authenticated users)
const removeVote = asyncHandler(async (req, res, next) => {
  const { targetId } = req.params;

  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Find and remove vote
  const vote = await Vote.findOneAndDelete({
    user: req.userId,
    session: session._id,
    targetId,
  });

  if (!vote) {
    return next(new AppError('Vote not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Update user stats
  await User.findByIdAndUpdate(req.userId, {
    $inc: { 'stats.votesCast': -1 },
  });

  // Emit vote removed event
  emitToSession(session._id.toString(), 'session:voteRemoved', {
    targetId,
    userId: req.userId,
    totalVotes: await Vote.countDocuments({ session: session._id, targetId }),
  });

  res.status(200).json({
    success: true,
    message: 'Vote removed successfully',
  });
});

// @desc    Submit feedback for session
// @route   POST /api/sessions/:id/feedback
// @access  Private (all authenticated users)
const submitFeedback = asyncHandler(async (req, res, next) => {
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError('Please provide a rating between 1 and 5', 400, ErrorCodes.VALIDATION_ERROR));
  }

  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Initialize feedback array if not exists
  if (!session.feedback) {
    session.feedback = [];
  }

  // Check if user already submitted feedback
  const existingFeedbackIndex = session.feedback.findIndex(
    f => f.user.toString() === req.userId
  );

  if (existingFeedbackIndex !== -1) {
    // Update existing feedback
    session.feedback[existingFeedbackIndex].rating = rating;
    session.feedback[existingFeedbackIndex].comment = comment?.trim() || '';
    session.feedback[existingFeedbackIndex].updatedAt = new Date();
  } else {
    // Add new feedback
    session.feedback.push({
      user: req.userId,
      rating,
      comment: comment?.trim() || '',
      createdAt: new Date(),
    });

    // Update user stats
    await User.findByIdAndUpdate(req.userId, {
      $inc: { 'stats.feedbackSubmitted': 1 },
    });
  }

  await session.save();

  // Emit feedback event
  emitToSession(session._id.toString(), 'session:feedbackSubmitted', {
    userId: req.userId,
    rating,
  });

  res.status(200).json({
    success: true,
    message: 'Feedback submitted successfully',
  });
});

// =============================================
// ADMIN & STATISTICS
// =============================================

// @desc    Get session statistics
// @route   GET /api/sessions/:id/stats
// @access  Private (host, moderator, or admin only)
const getSessionStats = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id)
    .populate('feedback.user', 'username displayName');

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check permission
  const isHost = session.host.toString() === req.userId;
  const isAdmin = req.user.role === 'admin';
  const isModerator = req.user.role === 'moderator';

  if (!isHost && !isAdmin && !isModerator) {
    return next(new AppError(
      'Access denied. Only the host, moderators, or administrators can view session statistics.',
      403,
      ErrorCodes.FORBIDDEN
    ));
  }

  // Get various stats
  const [
    submissionCount,
    voteCount,
    uniqueVoters,
  ] = await Promise.all([
    LyricsSubmission.countDocuments({ session: session._id }),
    Vote.countDocuments({ session: session._id }),
    Vote.distinct('user', { session: session._id }),
  ]);

  // Calculate feedback stats
  const feedbackStats = {
    total: session.feedback?.length || 0,
    averageRating: 0,
    ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };

  if (session.feedback && session.feedback.length > 0) {
    const sum = session.feedback.reduce((acc, f) => {
      feedbackStats.ratings[f.rating] = (feedbackStats.ratings[f.rating] || 0) + 1;
      return acc + f.rating;
    }, 0);
    feedbackStats.averageRating = Math.round((sum / session.feedback.length) * 10) / 10;
  }

  // Get top submissions
  const topSubmissions = await LyricsSubmission.find({ session: session._id })
    .sort({ 'voteStats.totalVotes': -1 })
    .limit(5)
    .populate('author', 'username displayName avatar')
    .lean();

  const stats = {
    participants: {
      total: session.stats?.totalParticipants || session.participants?.length || 0,
      active: session.participants?.filter(p => p.isActive).length || 0,
    },
    submissions: {
      total: submissionCount,
    },
    votes: {
      total: voteCount,
      uniqueVoters: uniqueVoters.length,
    },
    feedback: feedbackStats,
    topSubmissions,
    duration: session.endedAt && session.startedAt 
      ? Math.round((session.endedAt - session.startedAt) / 1000 / 60) 
      : null,
  };

  res.status(200).json({
    success: true,
    data: { stats },
  });
});

// @desc    Get all sessions for admin
// @route   GET /api/sessions/admin/all
// @access  Private (admin only)
const getAllSessionsAdmin = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    host,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query = {};

  if (status) query.status = status;
  if (host) query.host = host;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { sessionCode: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [sessions, total] = await Promise.all([
    Session.find(query)
      .populate('host', 'username displayName email role')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Session.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: {
      sessions: sessions.map(s => formatSessionResponse(s)),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

// @desc    Get admin dashboard statistics
// @route   GET /api/sessions/admin/stats
// @access  Private (admin only)
const getAdminSessionStats = asyncHandler(async (req, res) => {
  const [
    totalSessions,
    activeSessions,
    completedSessions,
    cancelledSessions,
    totalParticipants,
    recentSessions,
  ] = await Promise.all([
    Session.countDocuments(),
    Session.countDocuments({ 
      status: { $in: ['lyrics-open', 'lyrics-voting', 'generation', 'song-voting', 'active'] } 
    }),
    Session.countDocuments({ status: 'completed' }),
    Session.countDocuments({ status: 'cancelled' }),
    Session.aggregate([
      { $group: { _id: null, total: { $sum: '$stats.totalParticipants' } } }
    ]),
    Session.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }),
  ]);

  // Sessions by status
  const sessionsByStatus = await Session.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  // Sessions by genre
  const sessionsByGenre = await Session.aggregate([
    { $group: { _id: '$genre', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalSessions,
        activeSessions,
        completedSessions,
        cancelledSessions,
        draftSessions: totalSessions - activeSessions - completedSessions - cancelledSessions,
        totalParticipants: totalParticipants[0]?.total || 0,
        recentSessions,
      },
      byStatus: sessionsByStatus.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      byGenre: sessionsByGenre,
    },
  });
});

// =============================================
// EXPORTS
// =============================================

module.exports = {
  // CRUD
  createSession,
  getSessions,
  getLiveSessions,
  getSession,
  getSessionByCode,
  updateSession,
  deleteSession,
  
  // State management
  startSession,
  pauseSession,
  resumeSession,
  endSession,
  advanceStage,
  
  // Participants
  joinSession,
  leaveSession,
  kickParticipant,
  
  // Voting & Feedback
  vote,
  removeVote,
  submitFeedback,
  
  // Statistics & Admin
  getSessionStats,
  getAllSessionsAdmin,
  getAdminSessionStats,
  
  // Aliases for compatibility
  cancelSession: deleteSession,
};