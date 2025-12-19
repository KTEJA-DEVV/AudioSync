const { asyncHandler, AppError, ErrorCodes } = require('../middleware/errorHandler');
const Session = require('../models/Session');
const LyricsSubmission = require('../models/LyricsSubmission');
const Vote = require('../models/Vote');
const User = require('../models/User');
const { emitToSession } = require('../config/socket');

// @desc    Submit lyrics to session
// @route   POST /api/sessions/:id/lyrics
// @access  Private
const submitLyrics = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Get user reputation
  const user = await User.findById(req.userId);
  const userReputation = user?.reputation?.score || 0;

  // Check if user can submit
  const canSubmit = session.canSubmitLyrics(req.userId, userReputation);
  if (!canSubmit.allowed) {
    return next(new AppError(canSubmit.reason, 400, ErrorCodes.FORBIDDEN));
  }

  // Check if user already submitted max allowed
  const existingSubmissions = await LyricsSubmission.countDocuments({
    session: session._id,
    author: req.userId,
  });

  if (existingSubmissions >= session.settings.maxLyricsPerUser) {
    return next(new AppError(
      `You can only submit ${session.settings.maxLyricsPerUser} lyrics per session`,
      400,
      ErrorCodes.CONFLICT
    ));
  }

  const { title, fullLyrics, sections, theme, inspiration, targetMood, isAnonymous } = req.body;

  if (!fullLyrics || fullLyrics.trim().length === 0) {
    return next(new AppError('Lyrics content is required', 400, ErrorCodes.MISSING_FIELD));
  }

  if (fullLyrics.length > 5000) {
    return next(new AppError('Lyrics cannot exceed 5000 characters', 400, ErrorCodes.VALIDATION_ERROR));
  }

  // Create submission
  const submission = await LyricsSubmission.create({
    session: session._id,
    author: req.userId,
    content: {
      title,
      fullLyrics: fullLyrics.trim(),
      sections: sections || [],
    },
    metadata: {
      theme,
      inspiration,
      targetMood,
    },
    isAnonymous: session.settings.allowAnonymous && isAnonymous,
    status: session.settings.requireApproval ? 'pending' : 'approved',
  });

  // Update session stats
  session.stats.totalSubmissions += 1;
  
  // Add user as participant if not already
  if (!session.isParticipant(req.userId)) {
    session.participants.push({ user: req.userId, role: 'participant' });
    session.stats.totalParticipants = session.participants.length;
  }
  
  await session.save();

  // Populate author for response
  await submission.populate('author', 'username displayName avatar reputation.level');

  // Emit new submission event
  emitToSession(session._id.toString(), 'lyrics:submitted', {
    submissionId: submission._id,
    submission: submission.toPublicJSON(false, !submission.isAnonymous),
    totalSubmissions: session.stats.totalSubmissions,
  });

  // Award reputation points for submitting
  if (user) {
    await user.addReputation(5, 'lyrics_submitted');
  }

  res.status(201).json({
    success: true,
    data: { submission },
  });
});

// @desc    Get all lyrics for session
// @route   GET /api/sessions/:id/lyrics
// @access  Public
const getSessionLyrics = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  const { page = 1, limit = 20, sort = '-createdAt', status } = req.query;

  const query = { 
    session: session._id,
    status: { $in: ['approved', 'winner', 'runnerUp'] },
  };

  if (status) {
    query.status = status;
  }

  // Determine if we should show votes
  const showVotes = session.settings.showVoteCountsDuringVoting || 
    session.status === 'generation' || 
    session.status === 'song-voting' ||
    session.status === 'completed';

  // Determine sort field
  let sortField = sort;
  if (showVotes && (sort === 'votes' || sort === '-votes')) {
    sortField = session.settings.votingSystem === 'weighted' ? '-weightedVoteScore' : '-votes';
  }

  const submissions = await LyricsSubmission.find(query)
    .populate('author', 'username displayName avatar reputation.level')
    .sort(sortField)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  const total = await LyricsSubmission.countDocuments(query);

  // Get user's votes if authenticated
  let userVotedIds = [];
  if (req.userId) {
    const userVotes = await Vote.getUserVotesForSession(req.userId, session._id, 'lyrics');
    userVotedIds = userVotes.map(v => v.targetId.toString());
  }

  // Transform submissions
  const transformedSubmissions = submissions.map(sub => ({
    id: sub._id,
    content: sub.content,
    metadata: sub.metadata,
    author: sub.isAnonymous ? null : sub.author,
    isAnonymous: sub.isAnonymous,
    status: sub.status,
    ranking: sub.ranking,
    wordCount: sub.content.fullLyrics.split(/\s+/).filter(w => w.length > 0).length,
    lineCount: sub.content.fullLyrics.split('\n').filter(l => l.trim().length > 0).length,
    votes: showVotes ? sub.votes : null,
    weightedVoteScore: showVotes ? sub.weightedVoteScore : null,
    hasVoted: userVotedIds.includes(sub._id.toString()),
    averageRating: sub.averageRating,
    feedbackCount: sub.feedback?.length || 0,
    createdAt: sub.createdAt,
  }));

  res.status(200).json({
    success: true,
    data: {
      submissions: transformedSubmissions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      showVotes,
      votingSystem: session.settings.votingSystem,
    },
  });
});

// @desc    Get single lyrics submission
// @route   GET /api/sessions/:id/lyrics/:lyricsId
// @access  Public
const getLyricsById = asyncHandler(async (req, res, next) => {
  const submission = await LyricsSubmission.findById(req.params.lyricsId)
    .populate('author', 'username displayName avatar reputation.level reputation.score bio')
    .populate('feedback.user', 'username displayName avatar');

  if (!submission) {
    return next(new AppError('Lyrics submission not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (submission.session.toString() !== req.params.id) {
    return next(new AppError('Lyrics not found in this session', 404, ErrorCodes.NOT_FOUND));
  }

  const session = await Session.findById(req.params.id);
  const showVotes = session?.settings?.showVoteCountsDuringVoting || 
    ['generation', 'song-voting', 'completed'].includes(session?.status);

  // Check if user has voted
  let hasVoted = false;
  if (req.userId) {
    hasVoted = await Vote.hasUserVoted(req.userId, submission._id, 'lyrics');
  }

  res.status(200).json({
    success: true,
    data: {
      submission: {
        id: submission._id,
        content: submission.content,
        metadata: submission.metadata,
        author: submission.isAnonymous ? null : submission.author,
        isAnonymous: submission.isAnonymous,
        status: submission.status,
        ranking: submission.ranking,
        votes: showVotes ? submission.votes : null,
        weightedVoteScore: showVotes ? submission.weightedVoteScore : null,
        hasVoted,
        averageRating: submission.averageRating,
        feedback: submission.feedback,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
      },
    },
  });
});

// @desc    Update lyrics submission
// @route   PUT /api/sessions/:id/lyrics/:lyricsId
// @access  Private (author only, before voting)
const updateLyrics = asyncHandler(async (req, res, next) => {
  const submission = await LyricsSubmission.findById(req.params.lyricsId);

  if (!submission) {
    return next(new AppError('Lyrics submission not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (submission.author.toString() !== req.userId) {
    return next(new AppError('You can only edit your own lyrics', 403, ErrorCodes.FORBIDDEN));
  }

  const session = await Session.findById(req.params.id);

  if (session.status !== 'lyrics-open') {
    return next(new AppError('Cannot edit lyrics after submission period ends', 400, ErrorCodes.CONFLICT));
  }

  const { title, fullLyrics, sections, theme, inspiration, targetMood } = req.body;

  if (fullLyrics && fullLyrics.length > 5000) {
    return next(new AppError('Lyrics cannot exceed 5000 characters', 400, ErrorCodes.VALIDATION_ERROR));
  }

  // Update fields
  if (title !== undefined) submission.content.title = title;
  if (fullLyrics !== undefined) submission.content.fullLyrics = fullLyrics.trim();
  if (sections !== undefined) submission.content.sections = sections;
  if (theme !== undefined) submission.metadata.theme = theme;
  if (inspiration !== undefined) submission.metadata.inspiration = inspiration;
  if (targetMood !== undefined) submission.metadata.targetMood = targetMood;

  await submission.save();
  await submission.populate('author', 'username displayName avatar reputation.level');

  res.status(200).json({
    success: true,
    data: { submission },
  });
});

// @desc    Delete lyrics submission
// @route   DELETE /api/sessions/:id/lyrics/:lyricsId
// @access  Private (author or moderator)
const deleteLyrics = asyncHandler(async (req, res, next) => {
  const submission = await LyricsSubmission.findById(req.params.lyricsId);

  if (!submission) {
    return next(new AppError('Lyrics submission not found', 404, ErrorCodes.NOT_FOUND));
  }

  const session = await Session.findById(req.params.id);
  const isAuthor = submission.author.toString() === req.userId;
  const isModerator = session.isHost(req.userId) || req.userRole === 'moderator' || req.userRole === 'admin';

  if (!isAuthor && !isModerator) {
    return next(new AppError('You cannot delete this submission', 403, ErrorCodes.FORBIDDEN));
  }

  // Only allow deletion during lyrics-open stage
  if (session.status !== 'lyrics-open' && !isModerator) {
    return next(new AppError('Cannot delete lyrics after submission period ends', 400, ErrorCodes.CONFLICT));
  }

  await LyricsSubmission.findByIdAndDelete(req.params.lyricsId);

  // Remove associated votes
  await Vote.deleteMany({ targetId: submission._id, targetType: 'lyrics' });

  // Update session stats
  session.stats.totalSubmissions = Math.max(0, session.stats.totalSubmissions - 1);
  await session.save();

  // Emit deletion event
  emitToSession(session._id.toString(), 'lyrics:deleted', {
    submissionId: submission._id,
    totalSubmissions: session.stats.totalSubmissions,
  });

  res.status(200).json({
    success: true,
    message: 'Lyrics deleted successfully',
  });
});

// @desc    Get voting results
// @route   GET /api/sessions/:id/lyrics/results
// @access  Public (after voting ends)
const getVotingResults = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Only show results after voting ends
  const canShowResults = ['generation', 'song-voting', 'completed'].includes(session.status);

  if (!canShowResults && !session.settings.showVoteCountsDuringVoting) {
    return next(new AppError('Results are not available yet', 400, ErrorCodes.FORBIDDEN));
  }

  const rankedSubmissions = await LyricsSubmission.getRankedSubmissions(
    session._id,
    session.settings.votingSystem
  );

  // Get vote stats for each submission
  const resultsWithStats = await Promise.all(
    rankedSubmissions.map(async (sub) => {
      const voteStats = await Vote.getVoteStats(sub._id, 'lyrics');
      return {
        ...sub,
        voteStats,
      };
    })
  );

  res.status(200).json({
    success: true,
    data: {
      results: resultsWithStats,
      winner: resultsWithStats[0] || null,
      runnerUps: resultsWithStats.slice(1, 4),
      totalVotes: session.stats.totalVotes,
      votingSystem: session.settings.votingSystem,
    },
  });
});

// @desc    Add feedback to lyrics
// @route   POST /api/sessions/:id/lyrics/:lyricsId/feedback
// @access  Private
const addFeedback = asyncHandler(async (req, res, next) => {
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError('Rating must be between 1 and 5', 400, ErrorCodes.VALIDATION_ERROR));
  }

  const submission = await LyricsSubmission.findById(req.params.lyricsId);

  if (!submission) {
    return next(new AppError('Lyrics submission not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Can't give feedback on your own lyrics
  if (submission.author.toString() === req.userId) {
    return next(new AppError('You cannot rate your own lyrics', 400, ErrorCodes.CONFLICT));
  }

  await submission.addFeedback(req.userId, rating, comment);

  res.status(200).json({
    success: true,
    message: 'Feedback added successfully',
    data: {
      averageRating: submission.averageRating,
      feedbackCount: submission.feedback.length,
    },
  });
});

module.exports = {
  submitLyrics,
  getSessionLyrics,
  getLyricsById,
  updateLyrics,
  deleteLyrics,
  getVotingResults,
  addFeedback,
};

