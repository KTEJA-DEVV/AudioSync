const { asyncHandler, AppError, ErrorCodes } = require('../middleware/errorHandler');
const Session = require('../models/Session');
const LyricsSubmission = require('../models/LyricsSubmission');
const Vote = require('../models/Vote');
const { emitToSession, broadcast } = require('../config/socket');

// @desc    Create new session
// @route   POST /api/sessions
// @access  Private (creator+ role)
const createSession = asyncHandler(async (req, res, next) => {
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
  if (!title || !genre) {
    return next(new AppError('Title and genre are required', 400, ErrorCodes.MISSING_FIELD));
  }

  const session = await Session.create({
    title,
    description,
    genre,
    mood,
    targetBPM,
    theme,
    guidelines,
    maxParticipants,
    settings: {
      lyricsDeadline: settings?.lyricsDeadline,
      votingDeadline: settings?.votingDeadline,
      allowAnonymous: settings?.allowAnonymous || false,
      minReputationToSubmit: settings?.minReputationToSubmit || 0,
      votingSystem: settings?.votingSystem || 'simple',
      maxLyricsPerUser: settings?.maxLyricsPerUser || 1,
      showVoteCountsDuringVoting: settings?.showVoteCountsDuringVoting || false,
      requireApproval: settings?.requireApproval || false,
    },
    schedule: {
      scheduledStart: schedule?.scheduledStart,
      estimatedDuration: schedule?.estimatedDuration,
    },
    tags,
    visibility: visibility || 'public',
    host: req.userId,
    participants: [{ user: req.userId, role: 'host' }],
    stats: { totalParticipants: 1 },
  });

  res.status(201).json({
    success: true,
    data: { session },
  });
});

// @desc    Get all sessions
// @route   GET /api/sessions
// @access  Public
const getSessions = asyncHandler(async (req, res) => {
  const { 
    status, 
    genre, 
    upcoming, 
    past, 
    live,
    host,
    page = 1, 
    limit = 20, 
    sort = '-createdAt' 
  } = req.query;

  const query = { visibility: 'public' };
  
  if (status) {
    query.status = status;
  }
  
  if (genre) {
    query.genre = genre;
  }
  
  if (host) {
    query.host = host;
  }
  
  if (live === 'true') {
    query.status = { $in: ['lyrics-open', 'lyrics-voting', 'generation', 'song-voting'] };
  }
  
  if (upcoming === 'true') {
    query.status = 'draft';
    query['schedule.scheduledStart'] = { $gte: new Date() };
  }
  
  if (past === 'true') {
    query.status = 'completed';
  }

  const sessions = await Session.find(query)
    .populate('host', 'username displayName avatar reputation.level')
    .select('-participants -inviteCode')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  const total = await Session.countDocuments(query);

  // Add computed fields
  const sessionsWithMeta = sessions.map(session => ({
    ...session,
    participantCount: session.stats?.totalParticipants || 0,
    isActive: ['lyrics-open', 'lyrics-voting', 'generation', 'song-voting'].includes(session.status),
  }));

  res.status(200).json({
    success: true,
    data: {
      sessions: sessionsWithMeta,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// @desc    Get live sessions
// @route   GET /api/sessions/live
// @access  Public
const getLiveSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({
    status: { $in: ['lyrics-open', 'lyrics-voting', 'generation', 'song-voting'] },
    visibility: 'public',
  })
    .populate('host', 'username displayName avatar reputation.level')
    .select('-participants -inviteCode')
    .sort({ 'stats.totalParticipants': -1, createdAt: -1 })
    .limit(20)
    .lean();

  res.status(200).json({
    success: true,
    data: { 
      sessions,
      count: sessions.length,
    },
  });
});

// @desc    Get single session
// @route   GET /api/sessions/:id
// @access  Public
const getSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id)
    .populate('host', 'username displayName avatar reputation.level reputation.score')
    .populate('results.winningLyrics', 'content.title content.fullLyrics author')
    .lean();

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Get submission count
  const submissionCount = await LyricsSubmission.countDocuments({ 
    session: session._id,
    status: { $ne: 'rejected' },
  });

  // Get user's submission if authenticated
  let userSubmission = null;
  let userVotes = [];
  
  if (req.userId) {
    userSubmission = await LyricsSubmission.findOne({
      session: session._id,
      author: req.userId,
    }).lean();
    
    userVotes = await Vote.getUserVotesForSession(req.userId, session._id, 'lyrics');
  }

  res.status(200).json({
    success: true,
    data: {
      session: {
        ...session,
        participantCount: session.stats?.totalParticipants || session.participants?.length || 0,
        submissionCount,
        isActive: ['lyrics-open', 'lyrics-voting', 'generation', 'song-voting'].includes(session.status),
      },
      userSubmission,
      userVotes: userVotes.map(v => v.targetId.toString()),
    },
  });
});

// @desc    Update session
// @route   PUT /api/sessions/:id
// @access  Private (host only)
const updateSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!session.isHost(req.userId)) {
    return next(new AppError('Only the host can update this session', 403, ErrorCodes.FORBIDDEN));
  }

  // Only allow updates on draft sessions or specific fields on active sessions
  const allowedUpdates = session.status === 'draft' 
    ? ['title', 'description', 'genre', 'mood', 'targetBPM', 'theme', 'guidelines', 'maxParticipants', 'settings', 'schedule', 'tags', 'visibility']
    : ['description', 'guidelines', 'settings.votingDeadline', 'settings.lyricsDeadline'];

  const updates = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  const updatedSession = await Session.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('host', 'username displayName avatar');

  // Emit update to session room
  emitToSession(session._id.toString(), 'session:updated', { session: updatedSession });

  res.status(200).json({
    success: true,
    data: { session: updatedSession },
  });
});

// @desc    Advance session to next stage
// @route   PUT /api/sessions/:id/stage
// @access  Private (host only)
const advanceStage = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!session.isHost(req.userId)) {
    return next(new AppError('Only the host can advance the stage', 403, ErrorCodes.FORBIDDEN));
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
    }
  }

  await session.advanceStage();

  // Emit stage change
  emitToSession(session._id.toString(), 'session:stageChanged', {
    sessionId: session._id,
    newStatus: session.status,
    newStage: session.stage,
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
    data: { session },
  });
});

// @desc    Join session
// @route   POST /api/sessions/:id/join
// @access  Private
const joinSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (session.status === 'completed' || session.status === 'cancelled') {
    return next(new AppError('Session has ended', 400, ErrorCodes.CONFLICT));
  }

  try {
    await session.addParticipant(req.userId);
  } catch (error) {
    if (error.message === 'Session is full') {
      return next(new AppError('Session is full', 400, ErrorCodes.CONFLICT));
    }
    // Already a participant, just continue
  }

  // Emit participant joined
  emitToSession(session._id.toString(), 'session:participantJoined', {
    userId: req.userId,
    participantCount: session.participants.length,
  });

  res.status(200).json({
    success: true,
    data: { session },
  });
});

// @desc    Cancel/delete session
// @route   DELETE /api/sessions/:id
// @access  Private (host only)
const cancelSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!session.isHost(req.userId) && req.userRole !== 'admin') {
    return next(new AppError('Only the host can cancel this session', 403, ErrorCodes.FORBIDDEN));
  }

  session.status = 'cancelled';
  await session.save();

  // Emit cancellation
  emitToSession(session._id.toString(), 'session:cancelled', {
    sessionId: session._id,
  });

  res.status(200).json({
    success: true,
    message: 'Session cancelled',
  });
});

module.exports = {
  createSession,
  getSessions,
  getLiveSessions,
  getSession,
  updateSession,
  advanceStage,
  joinSession,
  cancelSession,
};
