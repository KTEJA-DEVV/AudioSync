const { asyncHandler, AppError, ErrorCodes } = require('../middleware/errorHandler');
const Session = require('../models/Session');
const StemUpload = require('../models/StemUpload');
const Vote = require('../models/Vote');
const { analyzeStem, detectBPMKey } = require('../services/aiGenerationService');
const { emitToSession } = require('../config/socket');

// @desc    Upload a stem to a session
// @route   POST /api/sessions/:id/stems
// @access  Private
const uploadStem = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  const { type, audioUrl, filename, description, bpm, key, duration } = req.body;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check if session accepts stems
  if (!['lyrics-open', 'lyrics-voting', 'generation'].includes(session.status)) {
    return next(new AppError('Session is not accepting stem uploads at this stage', 400, ErrorCodes.CONFLICT));
  }

  // Validate audio URL
  if (!audioUrl) {
    return next(new AppError('Audio URL is required', 400, ErrorCodes.MISSING_FIELD));
  }

  // Create stem upload
  const stem = await StemUpload.create({
    session: sessionId,
    contributor: req.userId,
    type: type || 'other',
    audioUrl,
    filename,
    description,
    bpm,
    key,
    duration,
    status: 'pending',
  });

  await stem.populate('contributor', 'username displayName avatar');

  // Emit real-time update
  emitToSession(sessionId, 'stem:uploaded', {
    stemId: stem._id,
    type: stem.type,
    contributor: stem.contributor.username,
  });

  res.status(201).json({
    success: true,
    message: 'Stem uploaded successfully',
    data: { stem: stem.toPublicJSON(req.userId) },
  });
});

// @desc    Get all stems for a session
// @route   GET /api/sessions/:id/stems
// @access  Public
const getSessionStems = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  const { type, status, sortBy = 'votes', order = -1 } = req.query;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  const query = { session: sessionId };
  if (type) query.type = type;
  if (status) query.status = status;

  const sortOptions = {};
  sortOptions[sortBy] = Number(order);

  const stems = await StemUpload.find(query)
    .populate('contributor', 'username displayName avatar reputation.level')
    .sort(sortOptions);

  // Group by type
  const grouped = await StemUpload.getStemsByType(sessionId);

  res.status(200).json({
    success: true,
    data: {
      stems: stems.map(s => s.toPublicJSON(req.userId)),
      grouped,
      count: stems.length,
    },
  });
});

// @desc    Get single stem
// @route   GET /api/stems/:id
// @access  Public
const getStem = asyncHandler(async (req, res, next) => {
  const stem = await StemUpload.findById(req.params.id)
    .populate('contributor', 'username displayName avatar reputation.level')
    .populate('session', 'title genre status')
    .populate('usedIn', 'title version versionLabel');

  if (!stem) {
    return next(new AppError('Stem not found', 404, ErrorCodes.NOT_FOUND));
  }

  res.status(200).json({
    success: true,
    data: { stem: stem.toPublicJSON(req.userId) },
  });
});

// @desc    Update stem metadata
// @route   PUT /api/stems/:id
// @access  Private (Contributor only)
const updateStem = asyncHandler(async (req, res, next) => {
  const { type, description, bpm, key } = req.body;

  let stem = await StemUpload.findById(req.params.id);
  if (!stem) {
    return next(new AppError('Stem not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check ownership
  if (stem.contributor.toString() !== req.userId.toString()) {
    return next(new AppError('You can only update your own stems', 403, ErrorCodes.FORBIDDEN));
  }

  // Cannot update if already used
  if (stem.status === 'used') {
    return next(new AppError('Cannot update stem that is already used in a song', 400, ErrorCodes.CONFLICT));
  }

  // Update fields
  if (type) stem.type = type;
  if (description !== undefined) stem.description = description;
  if (bpm) stem.bpm = bpm;
  if (key) stem.key = key;

  stem = await stem.save();
  await stem.populate('contributor', 'username displayName avatar');

  res.status(200).json({
    success: true,
    message: 'Stem updated',
    data: { stem: stem.toPublicJSON(req.userId) },
  });
});

// @desc    Delete stem
// @route   DELETE /api/stems/:id
// @access  Private (Contributor or Moderator)
const deleteStem = asyncHandler(async (req, res, next) => {
  const stem = await StemUpload.findById(req.params.id);
  if (!stem) {
    return next(new AppError('Stem not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check ownership or moderator status
  const isOwner = stem.contributor.toString() === req.userId.toString();
  const isModerator = ['moderator', 'admin'].includes(req.user.role);

  if (!isOwner && !isModerator) {
    return next(new AppError('You cannot delete this stem', 403, ErrorCodes.FORBIDDEN));
  }

  // Cannot delete if used
  if (stem.status === 'used' && !isModerator) {
    return next(new AppError('Cannot delete stem that is used in a song', 400, ErrorCodes.CONFLICT));
  }

  await stem.deleteOne();

  // Emit real-time update
  emitToSession(stem.session.toString(), 'stem:deleted', {
    stemId: stem._id,
  });

  res.status(200).json({
    success: true,
    message: 'Stem deleted',
  });
});

// @desc    Vote on stem quality
// @route   POST /api/stems/:id/vote
// @access  Private
const voteStem = asyncHandler(async (req, res, next) => {
  const stem = await StemUpload.findById(req.params.id);
  if (!stem) {
    return next(new AppError('Stem not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Cannot vote on own stem
  if (stem.contributor.toString() === req.userId.toString()) {
    return next(new AppError('You cannot vote on your own stem', 403, ErrorCodes.FORBIDDEN));
  }

  // Check for existing vote
  if (stem.hasVoted(req.userId)) {
    return next(new AppError('You have already voted for this stem', 409, ErrorCodes.CONFLICT));
  }

  await stem.addVote(req.userId);

  // Emit real-time update
  emitToSession(stem.session.toString(), 'stem:voteUpdate', {
    stemId: stem._id,
    votes: stem.votes,
  });

  res.status(200).json({
    success: true,
    message: 'Vote recorded',
    data: {
      votes: stem.votes,
      hasVoted: true,
    },
  });
});

// @desc    Remove vote from stem
// @route   DELETE /api/stems/:id/vote
// @access  Private
const removeStemVote = asyncHandler(async (req, res, next) => {
  const stem = await StemUpload.findById(req.params.id);
  if (!stem) {
    return next(new AppError('Stem not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!stem.hasVoted(req.userId)) {
    return next(new AppError('You have not voted for this stem', 404, ErrorCodes.NOT_FOUND));
  }

  await stem.removeVote(req.userId);

  emitToSession(stem.session.toString(), 'stem:voteUpdate', {
    stemId: stem._id,
    votes: stem.votes,
  });

  res.status(200).json({
    success: true,
    message: 'Vote removed',
    data: {
      votes: stem.votes,
      hasVoted: false,
    },
  });
});

// @desc    Analyze stem (detect BPM, key)
// @route   POST /api/stems/:id/analyze
// @access  Private
const analyzeUploadedStem = asyncHandler(async (req, res, next) => {
  const stem = await StemUpload.findById(req.params.id);
  if (!stem) {
    return next(new AppError('Stem not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check ownership
  if (stem.contributor.toString() !== req.userId.toString()) {
    return next(new AppError('You can only analyze your own stems', 403, ErrorCodes.FORBIDDEN));
  }

  const analysis = await analyzeStem(stem.audioUrl);

  // Update stem with analysis results
  stem.bpm = analysis.bpm;
  stem.key = analysis.key;
  stem.duration = analysis.duration;
  stem.waveformData = analysis.waveformData;
  await stem.save();

  res.status(200).json({
    success: true,
    message: 'Stem analyzed',
    data: {
      bpm: analysis.bpm,
      key: analysis.key,
      duration: analysis.duration,
    },
  });
});

// @desc    Approve stem (moderator)
// @route   POST /api/stems/:id/approve
// @access  Private (Moderator)
const approveStem = asyncHandler(async (req, res, next) => {
  const stem = await StemUpload.findById(req.params.id);
  if (!stem) {
    return next(new AppError('Stem not found', 404, ErrorCodes.NOT_FOUND));
  }

  await stem.approve(req.userId);

  emitToSession(stem.session.toString(), 'stem:approved', {
    stemId: stem._id,
  });

  res.status(200).json({
    success: true,
    message: 'Stem approved',
    data: { stem: stem.toPublicJSON() },
  });
});

// @desc    Reject stem (moderator)
// @route   POST /api/stems/:id/reject
// @access  Private (Moderator)
const rejectStem = asyncHandler(async (req, res, next) => {
  const { note } = req.body;

  const stem = await StemUpload.findById(req.params.id);
  if (!stem) {
    return next(new AppError('Stem not found', 404, ErrorCodes.NOT_FOUND));
  }

  await stem.reject(req.userId, note);

  res.status(200).json({
    success: true,
    message: 'Stem rejected',
    data: { stem: stem.toPublicJSON() },
  });
});

// @desc    Upload project file
// @route   POST /api/sessions/:id/upload-project
// @access  Private
const uploadProjectFile = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  const { fileUrl, filename, format } = req.body;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // For now, store in session settings
  // In production, this would be stored more robustly
  if (!session.humanInputs) {
    session.humanInputs = {};
  }
  session.humanInputs.projectFile = {
    url: fileUrl,
    filename,
    format,
    uploadedBy: req.userId,
    uploadedAt: new Date(),
  };

  await session.save();

  res.status(200).json({
    success: true,
    message: 'Project file uploaded',
    data: { projectFile: session.humanInputs.projectFile },
  });
});

// @desc    Upload additional audio file
// @route   POST /api/sessions/:id/upload-audio
// @access  Private
const uploadAudioFile = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  const { fileUrl, filename, description } = req.body;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!session.humanInputs) {
    session.humanInputs = {};
  }
  if (!session.humanInputs.additionalAudio) {
    session.humanInputs.additionalAudio = [];
  }

  session.humanInputs.additionalAudio.push({
    url: fileUrl,
    filename,
    description,
    uploadedBy: req.userId,
    uploadedAt: new Date(),
  });

  await session.save();

  res.status(200).json({
    success: true,
    message: 'Audio file uploaded',
    data: { additionalAudio: session.humanInputs.additionalAudio },
  });
});

module.exports = {
  uploadStem,
  getSessionStems,
  getStem,
  updateStem,
  deleteStem,
  voteStem,
  removeStemVote,
  analyzeUploadedStem,
  approveStem,
  rejectStem,
  uploadProjectFile,
  uploadAudioFile,
};

