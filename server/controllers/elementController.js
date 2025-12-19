const { asyncHandler, AppError, ErrorCodes } = require('../middleware/errorHandler');
const Session = require('../models/Session');
const ElementVote = require('../models/ElementVote');
const ElementOption = require('../models/ElementOption');
const ElementCompetition = require('../models/ElementCompetition');
const User = require('../models/User');
const { emitToSession } = require('../config/socket');
const { v4: uuidv4 } = require('uuid');

// ==================== ELEMENT OPTIONS ====================

// @desc    Create element options
// @route   POST /api/sessions/:id/element-options
// @access  Private (Host/Moderator)
const createElementOptions = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  const { elementType, options } = req.body;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check permissions
  const isHost = session.host.toString() === req.userId.toString();
  const isModerator = ['moderator', 'admin'].includes(req.user.role);
  
  if (!isHost && !isModerator) {
    return next(new AppError('Only host or moderator can create element options', 403, ErrorCodes.FORBIDDEN));
  }

  // Create options
  const createdOptions = [];
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    const option = await ElementOption.create({
      session: sessionId,
      song: opt.song || null,
      elementType,
      optionId: opt.optionId || `${elementType}-${uuidv4().slice(0, 8)}`,
      label: opt.label,
      description: opt.description,
      audioUrl: opt.audioUrl,
      waveformData: opt.waveformData,
      imageUrl: opt.imageUrl,
      value: opt.value,
      metadata: opt.metadata,
      order: i,
      createdBy: req.userId,
      isUserSubmitted: false,
    });
    createdOptions.push(option);
  }

  // Emit real-time update
  emitToSession(sessionId, 'element:optionsCreated', {
    elementType,
    count: createdOptions.length,
  });

  res.status(201).json({
    success: true,
    message: `Created ${createdOptions.length} options for ${elementType}`,
    data: { options: createdOptions },
  });
});

// @desc    Get all element options for session
// @route   GET /api/sessions/:id/element-options
// @access  Public
const getElementOptions = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  const { elementType, songId } = req.query;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  let options;
  if (elementType) {
    const query = { session: sessionId, elementType };
    if (songId) query.song = songId;
    
    options = await ElementOption.find(query)
      .populate('createdBy', 'username displayName avatar')
      .sort({ order: 1, votes: -1 });
      
    // Calculate percentages
    const totalVotes = options.reduce((sum, opt) => sum + opt.votes, 0);
    options = options.map(opt => ({
      ...opt.toPublicJSON(req.userId),
      percentage: totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0,
    }));
  } else {
    options = await ElementOption.getGroupedOptions(sessionId, songId);
  }

  res.status(200).json({
    success: true,
    data: { options },
  });
});

// @desc    Vote on element option
// @route   POST /api/sessions/:id/element-options/:optionId/vote
// @access  Private
const voteElementOption = asyncHandler(async (req, res, next) => {
  const { id: sessionId, optionId } = req.params;
  const { voteValue = 1 } = req.body; // 1 approve, -1 reject

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  const option = await ElementOption.findOne({ session: sessionId, optionId });
  if (!option) {
    return next(new AppError('Option not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Get user vote weight
  const user = await User.findById(req.userId);
  const weight = user?.reputation?.voteWeight || 1;

  // Check if already voted
  if (option.hasVoted(req.userId)) {
    return next(new AppError('Already voted on this option', 409, ErrorCodes.CONFLICT));
  }

  // Add vote
  await option.addVote(req.userId, weight);

  // Record detailed vote
  await ElementVote.findOneAndUpdate(
    {
      session: sessionId,
      user: req.userId,
      elementType: option.elementType,
      elementId: optionId,
    },
    {
      session: sessionId,
      song: option.song,
      user: req.userId,
      elementType: option.elementType,
      elementId: optionId,
      value: option.value,
      voteValue,
      weight,
    },
    { upsert: true, new: true }
  );

  // Emit real-time update
  emitToSession(sessionId, 'element:voted', {
    optionId,
    elementType: option.elementType,
    votes: option.votes,
    weightedVotes: option.weightedVotes,
  });

  res.status(200).json({
    success: true,
    message: 'Vote recorded',
    data: {
      optionId,
      votes: option.votes,
      weightedVotes: option.weightedVotes,
      hasVoted: true,
    },
  });
});

// @desc    Remove vote from element option
// @route   DELETE /api/sessions/:id/element-options/:optionId/vote
// @access  Private
const removeElementOptionVote = asyncHandler(async (req, res, next) => {
  const { id: sessionId, optionId } = req.params;

  const option = await ElementOption.findOne({ session: sessionId, optionId });
  if (!option) {
    return next(new AppError('Option not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!option.hasVoted(req.userId)) {
    return next(new AppError('Have not voted on this option', 404, ErrorCodes.NOT_FOUND));
  }

  // Get user vote weight
  const user = await User.findById(req.userId);
  const weight = user?.reputation?.voteWeight || 1;

  await option.removeVote(req.userId, weight);

  // Remove detailed vote record
  await ElementVote.findOneAndDelete({
    session: sessionId,
    user: req.userId,
    elementType: option.elementType,
    elementId: optionId,
  });

  emitToSession(sessionId, 'element:voteRemoved', {
    optionId,
    elementType: option.elementType,
    votes: option.votes,
    weightedVotes: option.weightedVotes,
  });

  res.status(200).json({
    success: true,
    message: 'Vote removed',
    data: {
      optionId,
      votes: option.votes,
      weightedVotes: option.weightedVotes,
      hasVoted: false,
    },
  });
});

// @desc    Get element voting results
// @route   GET /api/sessions/:id/element-results
// @access  Public
const getElementResults = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Get grouped options with vote counts
  const options = await ElementOption.getGroupedOptions(sessionId);
  
  // Get winning options
  const winners = await ElementOption.getWinningOptions(sessionId);

  // Get vote summary
  const voteSummary = await ElementVote.getSessionSummary(sessionId);

  res.status(200).json({
    success: true,
    data: {
      options,
      winners,
      voteSummary,
    },
  });
});

// @desc    Submit user option (for technical users)
// @route   POST /api/sessions/:id/element-options/submit
// @access  Private (Technical users)
const submitUserOption = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  const { elementType, label, description, audioUrl, waveformData, value, metadata } = req.body;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check if user is technical
  if (req.user.userType !== 'technical' && !['creator', 'admin'].includes(req.user.role)) {
    return next(new AppError('Only technical users can submit custom options', 403, ErrorCodes.FORBIDDEN));
  }

  const option = await ElementOption.create({
    session: sessionId,
    elementType,
    optionId: `user-${elementType}-${uuidv4().slice(0, 8)}`,
    label,
    description,
    audioUrl,
    waveformData,
    value,
    metadata,
    createdBy: req.userId,
    isUserSubmitted: true,
    status: 'pending',
  });

  emitToSession(sessionId, 'element:userOptionSubmitted', {
    optionId: option.optionId,
    elementType,
    submittedBy: req.user.username,
  });

  res.status(201).json({
    success: true,
    message: 'Option submitted for review',
    data: { option: option.toPublicJSON(req.userId) },
  });
});

// ==================== ELEMENT COMPETITIONS ====================

// @desc    Create element competition
// @route   POST /api/sessions/:id/element-competitions
// @access  Private (Host)
const createCompetition = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  const {
    elementType,
    title,
    description,
    guidelines,
    requirements,
    submissionDeadline,
    votingDeadline,
    maxSubmissionsPerUser,
    prize,
  } = req.body;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check if host
  if (session.host.toString() !== req.userId.toString()) {
    return next(new AppError('Only host can create competitions', 403, ErrorCodes.FORBIDDEN));
  }

  const competition = await ElementCompetition.create({
    session: sessionId,
    elementType,
    title,
    description,
    guidelines,
    requirements,
    submissionDeadline,
    votingDeadline,
    maxSubmissionsPerUser: maxSubmissionsPerUser || 1,
    prize: prize || { reputationPoints: 50 },
    status: 'open',
    createdBy: req.userId,
  });

  emitToSession(sessionId, 'competition:created', {
    competitionId: competition._id,
    elementType,
    title,
    deadline: submissionDeadline,
  });

  res.status(201).json({
    success: true,
    message: 'Competition created',
    data: { competition: competition.toPublicJSON(req.userId) },
  });
});

// @desc    Get all competitions for session
// @route   GET /api/sessions/:id/element-competitions
// @access  Public
const getCompetitions = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  const { status, elementType } = req.query;

  const query = { session: sessionId };
  if (status) query.status = status;
  if (elementType) query.elementType = elementType;

  const competitions = await ElementCompetition.find(query)
    .populate('createdBy', 'username displayName avatar')
    .populate('submissions.user', 'username displayName avatar')
    .populate('winner', 'username displayName avatar')
    .sort({ submissionDeadline: 1 });

  res.status(200).json({
    success: true,
    data: {
      competitions: competitions.map(c => c.toPublicJSON(req.userId)),
    },
  });
});

// @desc    Get single competition
// @route   GET /api/element-competitions/:id
// @access  Public
const getCompetition = asyncHandler(async (req, res, next) => {
  const competition = await ElementCompetition.findById(req.params.id)
    .populate('createdBy', 'username displayName avatar')
    .populate('submissions.user', 'username displayName avatar reputation.level')
    .populate('winner', 'username displayName avatar');

  if (!competition) {
    return next(new AppError('Competition not found', 404, ErrorCodes.NOT_FOUND));
  }

  res.status(200).json({
    success: true,
    data: { competition: competition.toPublicJSON(req.userId) },
  });
});

// @desc    Submit entry to competition
// @route   POST /api/element-competitions/:id/submit
// @access  Private
const submitToCompetition = asyncHandler(async (req, res, next) => {
  const competition = await ElementCompetition.findById(req.params.id);
  if (!competition) {
    return next(new AppError('Competition not found', 404, ErrorCodes.NOT_FOUND));
  }

  const { audioUrl, waveformData, description, metadata } = req.body;

  // Check if user is technical
  if (req.user.userType !== 'technical' && !['creator', 'admin'].includes(req.user.role)) {
    return next(new AppError('Only technical users can submit to competitions', 403, ErrorCodes.FORBIDDEN));
  }

  const submission = await competition.addSubmission(req.userId, {
    audioUrl,
    waveformData,
    description,
    metadata,
  });

  emitToSession(competition.session.toString(), 'competition:submission', {
    competitionId: competition._id,
    submittedBy: req.user.username,
    submissionCount: competition.submissionCount,
  });

  res.status(201).json({
    success: true,
    message: 'Submission added',
    data: { submission },
  });
});

// @desc    Vote on competition entry
// @route   POST /api/element-competitions/:id/vote
// @access  Private
const voteOnCompetition = asyncHandler(async (req, res, next) => {
  const { submissionIndex } = req.body;

  const competition = await ElementCompetition.findById(req.params.id);
  if (!competition) {
    return next(new AppError('Competition not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Get user vote weight
  const user = await User.findById(req.userId);
  const weight = user?.reputation?.voteWeight || 1;

  const submission = await competition.voteOnSubmission(submissionIndex, req.userId, weight);

  emitToSession(competition.session.toString(), 'competition:vote', {
    competitionId: competition._id,
    submissionIndex,
    votes: submission.votes,
  });

  res.status(200).json({
    success: true,
    message: 'Vote recorded',
    data: {
      submissionIndex,
      votes: submission.votes,
      weightedVotes: submission.weightedVotes,
    },
  });
});

// @desc    Get competition results
// @route   GET /api/element-competitions/:id/results
// @access  Public
const getCompetitionResults = asyncHandler(async (req, res, next) => {
  const competition = await ElementCompetition.findById(req.params.id)
    .populate('submissions.user', 'username displayName avatar reputation.level')
    .populate('winner', 'username displayName avatar');

  if (!competition) {
    return next(new AppError('Competition not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Sort submissions by votes
  const sortedSubmissions = [...competition.submissions].sort((a, b) => {
    if (b.weightedVotes !== a.weightedVotes) {
      return b.weightedVotes - a.weightedVotes;
    }
    return b.votes - a.votes;
  });

  // Add rankings
  const rankedSubmissions = sortedSubmissions.map((sub, index) => ({
    ...sub.toObject(),
    rank: index + 1,
    isWinner: index === 0 && competition.status === 'closed',
  }));

  res.status(200).json({
    success: true,
    data: {
      competition: {
        id: competition._id,
        title: competition.title,
        elementType: competition.elementType,
        status: competition.status,
        prize: competition.prize,
      },
      results: rankedSubmissions,
      winner: competition.winner,
      stats: competition.stats,
    },
  });
});

// @desc    Advance competition to voting stage
// @route   POST /api/element-competitions/:id/start-voting
// @access  Private (Host)
const startCompetitionVoting = asyncHandler(async (req, res, next) => {
  const competition = await ElementCompetition.findById(req.params.id);
  if (!competition) {
    return next(new AppError('Competition not found', 404, ErrorCodes.NOT_FOUND));
  }

  const session = await Session.findById(competition.session);
  if (session.host.toString() !== req.userId.toString()) {
    return next(new AppError('Only host can advance competition', 403, ErrorCodes.FORBIDDEN));
  }

  if (competition.status !== 'open') {
    return next(new AppError('Competition must be open to start voting', 400, ErrorCodes.CONFLICT));
  }

  competition.status = 'voting';
  if (!competition.votingDeadline) {
    // Default 48 hours for voting
    competition.votingDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);
  }
  await competition.save();

  emitToSession(competition.session.toString(), 'competition:votingStarted', {
    competitionId: competition._id,
    votingDeadline: competition.votingDeadline,
  });

  res.status(200).json({
    success: true,
    message: 'Voting started',
    data: { competition: competition.toPublicJSON() },
  });
});

// @desc    Close competition and determine winner
// @route   POST /api/element-competitions/:id/close
// @access  Private (Host)
const closeCompetition = asyncHandler(async (req, res, next) => {
  const competition = await ElementCompetition.findById(req.params.id);
  if (!competition) {
    return next(new AppError('Competition not found', 404, ErrorCodes.NOT_FOUND));
  }

  const session = await Session.findById(competition.session);
  if (session.host.toString() !== req.userId.toString()) {
    return next(new AppError('Only host can close competition', 403, ErrorCodes.FORBIDDEN));
  }

  const result = await competition.determineWinner();

  // Award reputation to winner
  if (competition.winner && competition.prize?.reputationPoints) {
    const winner = await User.findById(competition.winner);
    if (winner) {
      winner.addReputation(competition.prize.reputationPoints, competition.prize.badgeId);
      await winner.save();
    }
  }

  emitToSession(competition.session.toString(), 'competition:closed', {
    competitionId: competition._id,
    winnerId: competition.winner,
    prize: competition.prize,
  });

  res.status(200).json({
    success: true,
    message: 'Competition closed',
    data: { result },
  });
});

// @desc    Get granular breakdown for session
// @route   GET /api/sessions/:id/granular-breakdown
// @access  Public
const getGranularBreakdown = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Get all element options with results
  const options = await ElementOption.getGroupedOptions(sessionId);
  
  // Get winning options
  const winners = await ElementOption.getWinningOptions(sessionId);

  // Get active competitions
  const competitions = await ElementCompetition.getActiveCompetitions(sessionId);

  // Get vote summary
  const voteSummary = await ElementVote.getSessionSummary(sessionId);

  // Calculate progress
  const elementTypes = Object.keys(options);
  const decidedElements = Object.keys(winners);
  const progress = {
    total: elementTypes.length,
    decided: decidedElements.length,
    pending: elementTypes.length - decidedElements.length,
    percentage: elementTypes.length > 0 
      ? Math.round((decidedElements.length / elementTypes.length) * 100) 
      : 0,
  };

  res.status(200).json({
    success: true,
    data: {
      options,
      winners,
      competitions: competitions.map(c => ({
        id: c._id,
        title: c.title,
        elementType: c.elementType,
        status: c.status,
        submissionCount: c.submissions?.length || 0,
        deadline: c.submissionDeadline,
      })),
      voteSummary,
      progress,
    },
  });
});

module.exports = {
  // Element Options
  createElementOptions,
  getElementOptions,
  voteElementOption,
  removeElementOptionVote,
  getElementResults,
  submitUserOption,
  
  // Competitions
  createCompetition,
  getCompetitions,
  getCompetition,
  submitToCompetition,
  voteOnCompetition,
  getCompetitionResults,
  startCompetitionVoting,
  closeCompetition,
  
  // Granular
  getGranularBreakdown,
};

