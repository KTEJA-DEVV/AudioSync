const { asyncHandler, AppError, ErrorCodes } = require('../middleware/errorHandler');
const Session = require('../models/Session');
const FeedbackWord = require('../models/FeedbackWord');
const FeedbackSession = require('../models/FeedbackSession');
const UserFeedbackLog = require('../models/UserFeedbackLog');
const {
  processInput,
  categorizeWord,
  getWordSentiment,
  analyzeSentiment,
  getQuickFeedbackSuggestions,
} = require('../services/wordProcessingService');
const { emitToRoom } = require('../config/socket');

// Helper to get client IP
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
};

// @desc    Start feedback collection for a session
// @route   POST /api/sessions/:id/feedback/start
// @access  Private (Host only)
const startFeedback = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  const { settings = {} } = req.body;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!session.isHost(req.userId)) {
    return next(new AppError('Only the host can start feedback collection', 403, ErrorCodes.FORBIDDEN));
  }

  // Get or create feedback session
  const feedbackSession = await FeedbackSession.getOrCreate(sessionId, settings);
  await feedbackSession.start();

  // Emit to room
  emitToRoom(sessionId, 'feedback:started', {
    sessionId,
    settings: feedbackSession.settings,
    startedAt: feedbackSession.startedAt,
  });

  res.status(200).json({
    success: true,
    message: 'Feedback collection started',
    data: { feedbackSession },
  });
});

// @desc    Stop feedback collection for a session
// @route   POST /api/sessions/:id/feedback/stop
// @access  Private (Host only)
const stopFeedback = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (!session.isHost(req.userId)) {
    return next(new AppError('Only the host can stop feedback collection', 403, ErrorCodes.FORBIDDEN));
  }

  const feedbackSession = await FeedbackSession.findOne({ session: sessionId });
  if (!feedbackSession) {
    return next(new AppError('Feedback session not found', 404, ErrorCodes.NOT_FOUND));
  }

  await feedbackSession.stop();

  // Get final top words
  const topWords = await FeedbackWord.getTopWords(sessionId, 50);
  await feedbackSession.updateTopWords(topWords);

  // Emit to room
  emitToRoom(sessionId, 'feedback:stopped', {
    sessionId,
    endedAt: feedbackSession.endedAt,
    stats: {
      totalInputs: feedbackSession.totalInputs,
      uniqueWords: feedbackSession.uniqueWords,
    },
  });

  res.status(200).json({
    success: true,
    message: 'Feedback collection stopped',
    data: { feedbackSession },
  });
});

// @desc    Submit feedback words
// @route   POST /api/sessions/:id/feedback/words
// @access  Public (with rate limiting)
const submitWords = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  const { text, words: rawWords, inputMethod = 'text' } = req.body;
  const userId = req.userId || null;
  const ipAddress = getClientIP(req);

  // Get feedback session
  const feedbackSession = await FeedbackSession.findOne({ session: sessionId });
  if (!feedbackSession) {
    return next(new AppError('Feedback session not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (feedbackSession.status !== 'open') {
    return next(new AppError('Feedback collection is not open', 400, ErrorCodes.CONFLICT));
  }

  // Check input method allowed
  if (inputMethod === 'voice' && !feedbackSession.settings.allowVoice) {
    return next(new AppError('Voice input is not allowed for this session', 400, ErrorCodes.FORBIDDEN));
  }
  if (inputMethod === 'text' && !feedbackSession.settings.allowText) {
    return next(new AppError('Text input is not allowed for this session', 400, ErrorCodes.FORBIDDEN));
  }

  // Rate limiting check
  const rateLimit = await UserFeedbackLog.checkRateLimit(
    sessionId,
    userId,
    ipAddress,
    feedbackSession.settings.cooldownSeconds
  );

  if (rateLimit.limited) {
    return res.status(429).json({
      success: false,
      error: 'Rate limited',
      message: `Please wait ${rateLimit.waitSeconds} seconds before submitting again`,
      waitSeconds: rateLimit.waitSeconds,
    });
  }

  // Check max words per user
  const userWordCount = await UserFeedbackLog.getUserWordCount(sessionId, userId, ipAddress);
  if (userWordCount >= feedbackSession.settings.maxWordsPerUser) {
    return next(new AppError('You have reached the maximum word limit for this session', 400, ErrorCodes.CONFLICT));
  }

  // Process input
  let words = [];
  if (text) {
    words = processInput(text, {
      minLength: feedbackSession.settings.wordMinLength,
      maxLength: feedbackSession.settings.wordMaxLength,
      blockedWords: feedbackSession.settings.blockedWords,
    });
  } else if (rawWords && Array.isArray(rawWords)) {
    words = rawWords
      .filter(w => typeof w === 'string')
      .map(w => w.toLowerCase().trim())
      .filter(w => w.length >= feedbackSession.settings.wordMinLength && w.length <= feedbackSession.settings.wordMaxLength);
  }

  if (words.length === 0) {
    return next(new AppError('No valid words found in input', 400, ErrorCodes.VALIDATION_ERROR));
  }

  // Limit words per submission
  words = words.slice(0, 10);

  // Process each word
  const processedWords = [];
  const newWords = [];

  for (const word of words) {
    const category = categorizeWord(word);
    const sentiment = getWordSentiment(word);

    // Check if word already exists
    const existingWord = await FeedbackWord.findOne({ session: sessionId, word });
    const isNew = !existingWord;

    // Increment or create word
    const feedbackWord = await FeedbackWord.incrementWord(
      sessionId,
      word,
      userId,
      category,
      sentiment
    );

    processedWords.push({
      word: feedbackWord.word,
      count: feedbackWord.count,
      category: feedbackWord.category,
      isNew,
    });

    if (isNew) {
      newWords.push(word);
    }
  }

  // Log user submission
  await UserFeedbackLog.create({
    user: userId,
    session: sessionId,
    words,
    inputMethod,
    ipAddress,
  });

  // Update feedback session stats
  await feedbackSession.incrementStats(1, newWords.length);

  // Emit real-time updates
  processedWords.forEach(wordData => {
    if (wordData.isNew) {
      emitToRoom(sessionId, 'feedback:newWord', wordData);
    } else {
      emitToRoom(sessionId, 'feedback:wordUpdate', {
        word: wordData.word,
        newCount: wordData.count,
      });
    }
  });

  // Analyze sentiment of submission
  const sentiment = analyzeSentiment(words);

  res.status(200).json({
    success: true,
    message: `${words.length} word(s) submitted`,
    data: {
      words: processedWords,
      sentiment,
    },
  });
});

// @desc    Get current word cloud data
// @route   GET /api/sessions/:id/feedback/words
// @access  Public
const getWords = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;
  const { limit = 100, category } = req.query;

  const feedbackSession = await FeedbackSession.findOne({ session: sessionId });
  
  let words;
  if (category) {
    words = await FeedbackWord.getWordsByCategory(sessionId, category, parseInt(limit));
  } else {
    words = await FeedbackWord.getTopWords(sessionId, parseInt(limit));
  }

  // Get overall sentiment
  const allWords = await FeedbackWord.find({ session: sessionId }).select('word count').lean();
  const wordList = allWords.flatMap(w => Array(w.count).fill(w.word));
  const sentiment = analyzeSentiment(wordList);

  res.status(200).json({
    success: true,
    data: {
      words,
      stats: {
        totalWords: words.reduce((sum, w) => sum + w.count, 0),
        uniqueWords: words.length,
        sentiment,
        status: feedbackSession?.status || 'closed',
      },
    },
  });
});

// @desc    Get feedback stats
// @route   GET /api/sessions/:id/feedback/stats
// @access  Public
const getStats = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.id;

  const feedbackSession = await FeedbackSession.findOne({ session: sessionId });
  if (!feedbackSession) {
    return res.status(200).json({
      success: true,
      data: {
        status: 'not_started',
        totalInputs: 0,
        uniqueWords: 0,
        topWords: [],
        contributors: [],
      },
    });
  }

  // Get top contributors
  const contributors = await UserFeedbackLog.getActiveContributors(sessionId, 10);

  // Get top words
  const topWords = await FeedbackWord.getTopWords(sessionId, 10);

  // Get sentiment distribution
  const sentimentCounts = await FeedbackWord.aggregate([
    { $match: { session: feedbackSession.session } },
    {
      $group: {
        _id: '$category',
        count: { $sum: '$count' },
        words: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      status: feedbackSession.status,
      totalInputs: feedbackSession.totalInputs,
      uniqueWords: feedbackSession.uniqueWords,
      topWords,
      contributors,
      sentimentDistribution: sentimentCounts,
      settings: feedbackSession.settings,
      startedAt: feedbackSession.startedAt,
      endedAt: feedbackSession.endedAt,
    },
  });
});

// @desc    Delete a word (moderation)
// @route   DELETE /api/sessions/:id/feedback/word/:word
// @access  Private (Moderator/Host)
const deleteWord = asyncHandler(async (req, res, next) => {
  const { id: sessionId, word } = req.params;

  const session = await Session.findById(sessionId);
  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  const isHost = session.isHost(req.userId);
  const isModerator = ['moderator', 'admin'].includes(req.user?.role);

  if (!isHost && !isModerator) {
    return next(new AppError('Only moderators or the host can delete words', 403, ErrorCodes.FORBIDDEN));
  }

  const deletedWord = await FeedbackWord.findOneAndDelete({
    session: sessionId,
    word: word.toLowerCase(),
  });

  if (!deletedWord) {
    return next(new AppError('Word not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Emit deletion event
  emitToRoom(sessionId, 'feedback:wordDeleted', { word: word.toLowerCase() });

  res.status(200).json({
    success: true,
    message: `Word "${word}" deleted`,
  });
});

// @desc    Get quick feedback suggestions
// @route   GET /api/sessions/:id/feedback/suggestions
// @access  Public
const getSuggestions = asyncHandler(async (req, res) => {
  const { category } = req.query;
  
  const suggestions = getQuickFeedbackSuggestions(category);
  
  res.status(200).json({
    success: true,
    data: { suggestions },
  });
});

// @desc    SSE endpoint for real-time updates (alternative to WebSocket)
// @route   GET /api/sessions/:id/feedback/stream
// @access  Public
const streamUpdates = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Send initial data
  const words = await FeedbackWord.getTopWords(sessionId, 100);
  res.write(`data: ${JSON.stringify({ type: 'initial', words })}\n\n`);

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`: keepalive\n\n`);
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

module.exports = {
  startFeedback,
  stopFeedback,
  submitWords,
  getWords,
  getStats,
  deleteWord,
  getSuggestions,
  streamUpdates,
};

