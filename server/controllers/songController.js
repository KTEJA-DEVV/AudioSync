const { asyncHandler, AppError, ErrorCodes } = require('../middleware/errorHandler');
const Session = require('../models/Session');
const Song = require('../models/Song');
const Vote = require('../models/Vote');
const GenerationJob = require('../models/GenerationJob');
const { generateMultipleVersions, cancelGeneration } = require('../services/aiGenerationService');
const { emitToSession } = require('../config/socket');

// @desc    Trigger AI generation for a session
// @route   POST /api/sessions/:id/generate
// @access  Private (Host only)
const triggerGeneration = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  const { params, numVersions = 3 } = req.body;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check if user is host
  if (session.host.toString() !== req.userId.toString()) {
    return next(new AppError('Only the host can trigger generation', 403, ErrorCodes.FORBIDDEN));
  }

  // Check session status
  if (session.status !== 'generation') {
    return next(new AppError(`Session must be in generation stage. Current: ${session.status}`, 400, ErrorCodes.CONFLICT));
  }

  // Check for winning lyrics
  if (!session.results?.winningLyrics) {
    return next(new AppError('No winning lyrics selected for generation', 400, ErrorCodes.CONFLICT));
  }

  // Check if generation is already in progress
  const existingJobs = await GenerationJob.find({
    session: sessionId,
    status: { $in: ['queued', 'processing'] },
  });

  if (existingJobs.length > 0) {
    return next(new AppError('Generation is already in progress', 400, ErrorCodes.CONFLICT));
  }

  // Validate params
  const generationParams = {
    genre: params?.genre || session.genre || 'pop',
    mood: params?.mood || [session.mood],
    tempo: params?.tempo || session.targetBPM || 120,
    key: params?.key || 'auto',
    vocalStyle: params?.vocalStyle || 'ai-voice',
    instruments: params?.instruments || [],
    style: params?.style || '',
    referenceTrack: params?.referenceTrack || '',
  };

  // Start generation
  const { jobs, songs } = await generateMultipleVersions(
    sessionId,
    session.results.winningLyrics,
    generationParams,
    Math.min(numVersions, 5)
  );

  res.status(201).json({
    success: true,
    message: `Started generating ${jobs.length} song versions`,
    data: {
      jobs: jobs.map(j => j.toPublicJSON()),
      songs: songs.map(s => ({
        id: s._id,
        version: s.version,
        versionLabel: s.versionLabel,
        title: s.title,
        status: s.status,
      })),
    },
  });
});

// @desc    Get generation status for session
// @route   GET /api/sessions/:id/generation-status
// @access  Public
const getGenerationStatus = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  const jobs = await GenerationJob.find({ session: sessionId })
    .populate('song', 'title version versionLabel status audioUrl coverArt duration')
    .sort({ createdAt: 1 });

  const overallProgress = jobs.length > 0
    ? Math.round(jobs.reduce((sum, j) => sum + j.progress, 0) / jobs.length)
    : 0;

  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const failedCount = jobs.filter(j => j.status === 'failed').length;
  const processingCount = jobs.filter(j => ['queued', 'processing'].includes(j.status)).length;

  res.status(200).json({
    success: true,
    data: {
      jobs: jobs.map(j => j.toPublicJSON()),
      summary: {
        total: jobs.length,
        completed: completedCount,
        failed: failedCount,
        processing: processingCount,
        overallProgress,
        isComplete: processingCount === 0 && jobs.length > 0,
      },
    },
  });
});

// @desc    Cancel generation for a session
// @route   POST /api/sessions/:id/cancel-generation
// @access  Private (Host only)
const cancelSessionGeneration = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (session.host.toString() !== req.userId.toString()) {
    return next(new AppError('Only the host can cancel generation', 403, ErrorCodes.FORBIDDEN));
  }

  const jobs = await GenerationJob.find({
    session: sessionId,
    status: { $in: ['queued', 'processing'] },
  });

  for (const job of jobs) {
    await cancelGeneration(job._id);
  }

  emitToSession(sessionId, 'generation:cancelled', {
    cancelledCount: jobs.length,
  });

  res.status(200).json({
    success: true,
    message: `Cancelled ${jobs.length} generation jobs`,
  });
});

// @desc    Get all songs for a session
// @route   GET /api/sessions/:id/songs
// @access  Public
const getSessionSongs = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  const { status, sortBy = 'version', order = 1 } = req.query;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  const query = { session: sessionId };
  if (status) {
    query.status = status;
  }

  const sortOptions = {};
  sortOptions[sortBy] = Number(order);

  const songs = await Song.find(query)
    .populate('lyrics', 'content.title author')
    .populate('contributors.user', 'username displayName avatar')
    .sort(sortOptions);

  res.status(200).json({
    success: true,
    data: {
      songs: songs.map(s => s.toPublicJSON(req.userId)),
      count: songs.length,
    },
  });
});

// @desc    Get single song with full details
// @route   GET /api/songs/:id
// @access  Public
const getSong = asyncHandler(async (req, res, next) => {
  const song = await Song.findById(req.params.id)
    .populate('session', 'title genre status host')
    .populate('lyrics', 'content author')
    .populate('contributors.user', 'username displayName avatar reputation.level')
    .populate('generationJobId');

  if (!song) {
    return next(new AppError('Song not found', 404, ErrorCodes.NOT_FOUND));
  }

  res.status(200).json({
    success: true,
    data: {
      song: song.toPublicJSON(req.userId),
    },
  });
});

// @desc    Vote for a song version
// @route   POST /api/songs/:id/vote
// @access  Private
const voteSong = asyncHandler(async (req, res, next) => {
  const songId = req.params.id;

  const song = await Song.findById(songId).populate('session');
  if (!song) {
    return next(new AppError('Song not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check if voting is open
  if (song.session.status !== 'song-voting') {
    return next(new AppError('Song voting is not open for this session', 400, ErrorCodes.CONFLICT));
  }

  // Check for existing vote
  if (song.hasVoted(req.userId)) {
    return next(new AppError('You have already voted for this song', 409, ErrorCodes.CONFLICT));
  }

  // Get user vote weight
  const user = await require('../models/User').findById(req.userId);
  const weight = user?.reputation?.voteWeight || 1;

  await song.addVote(req.userId, weight);

  // Create vote record
  await Vote.create({
    user: req.userId,
    targetType: 'song',
    targetId: songId,
    session: song.session._id,
    value: 1,
    weight,
  });

  // Update session stats
  await Session.findByIdAndUpdate(song.session._id, {
    $inc: { 'stats.totalVotes': 1 },
  });

  // Emit real-time update
  emitToSession(song.session._id.toString(), 'song:voteUpdate', {
    songId: song._id,
    votes: song.votes,
    weightedVoteScore: song.weightedVoteScore,
  });

  res.status(200).json({
    success: true,
    message: 'Vote recorded',
    data: {
      votes: song.votes,
      weightedVoteScore: song.weightedVoteScore,
      hasVoted: true,
    },
  });
});

// @desc    Remove vote from song
// @route   DELETE /api/songs/:id/vote
// @access  Private
const removeSongVote = asyncHandler(async (req, res, next) => {
  const songId = req.params.id;

  const song = await Song.findById(songId).populate('session');
  if (!song) {
    return next(new AppError('Song not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (song.session.status !== 'song-voting') {
    return next(new AppError('Cannot remove vote outside voting stage', 400, ErrorCodes.CONFLICT));
  }

  if (!song.hasVoted(req.userId)) {
    return next(new AppError('You have not voted for this song', 404, ErrorCodes.NOT_FOUND));
  }

  // Find and delete vote record
  const vote = await Vote.findOneAndDelete({
    user: req.userId,
    targetType: 'song',
    targetId: songId,
  });

  const weight = vote?.weight || 1;
  await song.removeVote(req.userId, weight);

  // Update session stats
  await Session.findByIdAndUpdate(song.session._id, {
    $inc: { 'stats.totalVotes': -1 },
  });

  // Emit real-time update
  emitToSession(song.session._id.toString(), 'song:voteUpdate', {
    songId: song._id,
    votes: song.votes,
    weightedVoteScore: song.weightedVoteScore,
  });

  res.status(200).json({
    success: true,
    message: 'Vote removed',
    data: {
      votes: song.votes,
      weightedVoteScore: song.weightedVoteScore,
      hasVoted: false,
    },
  });
});

// @desc    Get ranked song results for session
// @route   GET /api/sessions/:id/songs/results
// @access  Public
const getSongResults = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  const songs = await Song.getRankedSongs(sessionId);

  // Add ranking
  const rankedSongs = songs.map((song, index) => ({
    ...song,
    ranking: index + 1,
    isWinner: index === 0 && session.status === 'completed',
  }));

  res.status(200).json({
    success: true,
    data: {
      songs: rankedSongs,
      winningSong: rankedSongs[0] || null,
      votingComplete: ['completed', 'cancelled'].includes(session.status),
    },
  });
});

// @desc    Record a play
// @route   POST /api/songs/:id/play
// @access  Public
const recordPlay = asyncHandler(async (req, res, next) => {
  const song = await Song.findById(req.params.id);
  if (!song) {
    return next(new AppError('Song not found', 404, ErrorCodes.NOT_FOUND));
  }

  await song.recordPlay();

  res.status(200).json({
    success: true,
    data: { plays: song.plays },
  });
});

// @desc    Toggle like on song
// @route   POST /api/songs/:id/like
// @access  Private
const toggleLike = asyncHandler(async (req, res, next) => {
  const song = await Song.findById(req.params.id);
  if (!song) {
    return next(new AppError('Song not found', 404, ErrorCodes.NOT_FOUND));
  }

  const isLiked = await song.toggleLike(req.userId);

  res.status(200).json({
    success: true,
    data: {
      likes: song.likes,
      isLiked,
    },
  });
});

module.exports = {
  triggerGeneration,
  getGenerationStatus,
  cancelSessionGeneration,
  getSessionSongs,
  getSong,
  voteSong,
  removeSongVote,
  getSongResults,
  recordPlay,
  toggleLike,
};

