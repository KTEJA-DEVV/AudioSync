const { Song, LyricsSubmission, Ownership, RevenueDistribution, User } = require('../models');
const { attributionService, libraryRevenueService } = require('../services');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

// ==================== LIBRARY ROUTES ====================

/**
 * GET /api/songs
 * Get paginated library with filters
 */
exports.getSongs = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    genre,
    mood,
    sortBy = 'newest',
    search,
  } = req.query;

  const result = await Song.getLibrary({
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 50),
    genre,
    mood,
    sortBy,
    search,
  });

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * GET /api/songs/featured
 * Get featured songs
 */
exports.getFeaturedSongs = catchAsync(async (req, res, next) => {
  const { limit = 10 } = req.query;
  const songs = await Song.getFeatured(parseInt(limit));

  res.status(200).json({
    status: 'success',
    results: songs.length,
    data: { songs },
  });
});

/**
 * GET /api/songs/trending
 * Get trending songs
 */
exports.getTrendingSongs = catchAsync(async (req, res, next) => {
  const { limit = 20, days = 7 } = req.query;
  const songs = await Song.getTrending(parseInt(limit), parseInt(days));

  res.status(200).json({
    status: 'success',
    results: songs.length,
    data: { songs },
  });
});

/**
 * GET /api/songs/search
 * Search songs
 */
exports.searchSongs = catchAsync(async (req, res, next) => {
  const { q, page = 1, limit = 20 } = req.query;

  if (!q || q.length < 2) {
    return next(new AppError('Search query must be at least 2 characters', 400));
  }

  const result = await Song.getLibrary({
    page: parseInt(page),
    limit: Math.min(parseInt(limit), 50),
    search: q,
  });

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * GET /api/songs/:id
 * Get full song details
 */
exports.getSong = catchAsync(async (req, res, next) => {
  const song = await Song.findById(req.params.id)
    .populate('session', 'title status host')
    .populate('lyrics', 'content author')
    .populate('contributors.user', 'username displayName avatar reputation.level')
    .populate('ownership.distribution.user', 'username displayName avatar');

  if (!song) {
    return next(new AppError('Song not found', 404));
  }

  const userId = req.user?.id;
  const songData = song.toDetailedJSON(userId);

  // Get related songs from same session
  const relatedSongs = await Song.find({
    session: song.session._id,
    _id: { $ne: song._id },
    status: 'published',
  })
    .select('title coverArt plays likes duration')
    .limit(5)
    .lean();

  res.status(200).json({
    status: 'success',
    data: {
      song: songData,
      relatedSongs,
    },
  });
});

/**
 * POST /api/songs/:id/play
 * Increment play count
 */
exports.recordPlay = catchAsync(async (req, res, next) => {
  const song = await Song.findById(req.params.id);

  if (!song) {
    return next(new AppError('Song not found', 404));
  }

  await song.recordPlay();

  res.status(200).json({
    status: 'success',
    data: { plays: song.plays },
  });
});

/**
 * POST /api/songs/:id/like
 * Toggle like
 */
exports.toggleLike = catchAsync(async (req, res, next) => {
  const song = await Song.findById(req.params.id);

  if (!song) {
    return next(new AppError('Song not found', 404));
  }

  const isLiked = await song.toggleLike(req.user.id);

  res.status(200).json({
    status: 'success',
    data: {
      isLiked,
      likes: song.likes,
    },
  });
});

/**
 * GET /api/songs/:id/lyrics
 * Get full lyrics with attribution
 */
exports.getSongLyrics = catchAsync(async (req, res, next) => {
  const song = await Song.findById(req.params.id)
    .populate('lyrics')
    .populate('sections.contributor', 'username displayName');

  if (!song) {
    return next(new AppError('Song not found', 404));
  }

  const lyricsData = song.lyrics ? {
    fullLyrics: song.lyrics.content?.fullLyrics,
    sections: song.lyrics.content?.sections,
    title: song.lyrics.content?.title,
    author: song.lyrics.author,
  } : null;

  // Add section-level attribution if available
  const sectionsWithAttribution = song.sections?.map(section => ({
    ...section.toObject(),
    lyricsText: section.lyricsText,
    contributor: section.contributor,
  }));

  res.status(200).json({
    status: 'success',
    data: {
      lyrics: lyricsData,
      sections: sectionsWithAttribution,
    },
  });
});

// ==================== CONTRIBUTORS ROUTES ====================

/**
 * GET /api/songs/:id/contributors
 * Get detailed contributor list
 */
exports.getSongContributors = catchAsync(async (req, res, next) => {
  const song = await Song.findById(req.params.id)
    .populate('contributors.user', 'username displayName avatar reputation stats.songsContributed')
    .lean();

  if (!song) {
    return next(new AppError('Song not found', 404));
  }

  const credits = attributionService.formatCredits(song.contributors);

  res.status(200).json({
    status: 'success',
    data: {
      contributors: song.contributors,
      credits,
      totalContributors: song.contributors.length,
    },
  });
});

/**
 * GET /api/users/:id/songs
 * Get songs user contributed to
 */
exports.getUserContributions = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;

  const result = await Song.getUserContributions(req.params.id, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

/**
 * GET /api/users/:id/owned-songs
 * Get songs user has ownership in
 */
exports.getUserOwnedSongs = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;

  const result = await Song.getUserOwnedSongs(req.params.id, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  // Calculate ownership percentages for each song
  const songsWithOwnership = result.songs.map(song => {
    const userOwnership = song.ownership?.distribution?.find(
      d => d.user._id.toString() === req.params.id
    );
    return {
      ...song,
      userOwnership: userOwnership ? {
        shares: userOwnership.shares,
        percentage: userOwnership.percentage,
      } : null,
    };
  });

  res.status(200).json({
    status: 'success',
    data: {
      songs: songsWithOwnership,
      pagination: result.pagination,
    },
  });
});

// ==================== OWNERSHIP ROUTES ====================

/**
 * GET /api/songs/:id/ownership
 * Get ownership distribution
 */
exports.getSongOwnership = catchAsync(async (req, res, next) => {
  const song = await Song.findById(req.params.id)
    .select('ownership title')
    .populate('ownership.distribution.user', 'username displayName avatar')
    .lean();

  if (!song) {
    return next(new AppError('Song not found', 404));
  }

  const ownerships = await Ownership.getSongOwnership(req.params.id);

  res.status(200).json({
    status: 'success',
    data: {
      totalShares: song.ownership?.totalShares || 10000,
      transferable: song.ownership?.transferable || false,
      tokenized: song.ownership?.tokenized || false,
      distribution: ownerships,
    },
  });
});

/**
 * POST /api/songs/:id/ownership/transfer
 * Transfer shares (placeholder)
 */
exports.transferOwnership = catchAsync(async (req, res, next) => {
  const { toUserId, shares, price } = req.body;

  if (!toUserId || !shares) {
    return next(new AppError('Recipient and shares amount are required', 400));
  }

  const song = await Song.findById(req.params.id);
  if (!song) {
    return next(new AppError('Song not found', 404));
  }

  if (!song.ownership?.transferable) {
    return next(new AppError('Ownership transfer is not enabled for this song', 400));
  }

  const result = await Ownership.transferShares(
    req.params.id,
    req.user.id,
    toUserId,
    shares,
    price || 0
  );

  res.status(200).json({
    status: 'success',
    message: `Successfully transferred ${shares} shares`,
    data: result,
  });
});

/**
 * GET /api/users/me/ownership
 * Get all songs user has ownership in with values
 */
exports.getMyOwnership = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;

  const result = await Ownership.getUserOwnership(req.user.id, {
    page: parseInt(page),
    limit: parseInt(limit),
  });

  // Calculate total value
  let totalShares = 0;
  let totalEstimatedValue = 0;

  result.ownerships.forEach(o => {
    totalShares += o.shares;
    if (o.song?.revenue?.totalRevenue) {
      // Estimate value based on revenue share
      const ownershipPercentage = o.percentage || 0;
      totalEstimatedValue += (o.song.revenue.totalRevenue * ownershipPercentage) / 100;
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      ...result,
      summary: {
        totalSongsOwned: result.ownerships.length,
        totalShares,
        totalEstimatedValue,
      },
    },
  });
});

// ==================== REVENUE ROUTES ====================

/**
 * GET /api/songs/:id/revenue
 * Get revenue history for song (owner/contributor only)
 */
exports.getSongRevenue = catchAsync(async (req, res, next) => {
  const song = await Song.findById(req.params.id);

  if (!song) {
    return next(new AppError('Song not found', 404));
  }

  // Check if user has access (is owner or contributor)
  const isContributor = song.contributors.some(
    c => c.user.toString() === req.user.id
  );
  const isOwner = song.hasOwnership(req.user.id);

  if (!isContributor && !isOwner && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to view this revenue data', 403));
  }

  const revenueHistory = await libraryRevenueService.getSongRevenueHistory(req.params.id);

  res.status(200).json({
    status: 'success',
    data: revenueHistory,
  });
});

/**
 * GET /api/users/me/revenue
 * Get user's total revenue across songs
 */
exports.getMyRevenue = catchAsync(async (req, res, next) => {
  const summary = await libraryRevenueService.getUserRevenueSummary(req.user.id);

  res.status(200).json({
    status: 'success',
    data: summary,
  });
});

/**
 * GET /api/users/me/revenue/history
 * Get detailed revenue history
 */
exports.getMyRevenueHistory = catchAsync(async (req, res, next) => {
  const { limit = 12, period } = req.query;

  const history = await libraryRevenueService.getUserRevenueHistory(req.user.id, {
    limit: parseInt(limit),
    period,
  });

  res.status(200).json({
    status: 'success',
    results: history.length,
    data: { history },
  });
});

/**
 * GET /api/songs/genres
 * Get list of available genres
 */
exports.getGenres = catchAsync(async (req, res, next) => {
  const genres = await Song.distinct('generationParams.genre', { status: 'published' });

  res.status(200).json({
    status: 'success',
    data: { genres: genres.filter(Boolean) },
  });
});

/**
 * GET /api/songs/moods
 * Get list of available moods
 */
exports.getMoods = catchAsync(async (req, res, next) => {
  const moods = await Song.distinct('generationParams.mood', { status: 'published' });

  res.status(200).json({
    status: 'success',
    data: { moods: moods.flat().filter(Boolean) },
  });
});

