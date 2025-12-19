const { Song, Ownership, RevenueDistribution, User, Reward } = require('../models');

/**
 * Revenue calculation constants
 */
const REVENUE_RATES = {
  perPlay: 0.004, // $0.004 per play (in dollars)
  perLike: 0.001, // $0.001 per like
  perDownload: 0.10, // $0.10 per download
};

const libraryRevenueService = {
  /**
   * Calculate revenue for a song in a specific period
   * @param {string} songId - The song ID
   * @param {string} period - Period in YYYY-MM format
   * @returns {Promise<Object>} Revenue calculation result
   */
  calculateSongRevenue: async (songId, period) => {
    const song = await Song.findById(songId);
    if (!song) throw new Error('Song not found');

    // Get or create analytics for the period
    // In production, this would query actual analytics data
    // For now, we'll calculate based on current stats
    const [year, month] = period.split('-').map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // Check if this is the current period
    const now = new Date();
    const isCurrentPeriod = 
      now.getFullYear() === year && 
      now.getMonth() === month - 1;

    // For demo: estimate plays/likes in this period
    // In production: query actual analytics with date filters
    let periodPlays, periodLikes, periodDownloads;

    if (isCurrentPeriod) {
      // Use actual current stats
      periodPlays = song.plays || 0;
      periodLikes = song.likes || 0;
      periodDownloads = 0; // Would come from download tracking
    } else {
      // For past periods, we'd query historical data
      // Simulating with estimated values
      periodPlays = Math.floor(song.plays * 0.1); // Rough estimate
      periodLikes = Math.floor(song.likes * 0.1);
      periodDownloads = 0;
    }

    // Calculate revenue from each source (in cents)
    const playRevenue = Math.round(periodPlays * REVENUE_RATES.perPlay * 100);
    const likeRevenue = Math.round(periodLikes * REVENUE_RATES.perLike * 100);
    const downloadRevenue = Math.round(periodDownloads * REVENUE_RATES.perDownload * 100);

    const totalRevenue = playRevenue + likeRevenue + downloadRevenue;

    return {
      songId,
      period,
      periodStart,
      periodEnd,
      sources: {
        plays: playRevenue,
        likes: likeRevenue,
        downloads: downloadRevenue,
      },
      totalRevenue,
      stats: {
        totalPlays: periodPlays,
        totalLikes: periodLikes,
        totalDownloads: periodDownloads,
      },
    };
  },

  /**
   * Create revenue distribution records for a song and period
   * @param {string} songId - The song ID
   * @param {string} period - Period in YYYY-MM format
   * @returns {Promise<Object>} Distribution record
   */
  distributeRevenue: async (songId, period) => {
    // Check if distribution already exists
    const existing = await RevenueDistribution.findOne({ song: songId, period });
    if (existing) {
      throw new Error(`Distribution already exists for song ${songId} in period ${period}`);
    }

    // Calculate revenue for the period
    const revenueData = await libraryRevenueService.calculateSongRevenue(songId, period);

    // Skip if no revenue
    if (revenueData.totalRevenue === 0) {
      return null;
    }

    // Create the distribution record
    const distribution = await RevenueDistribution.createDistribution(songId, period, revenueData);

    // Update song's total revenue
    await Song.findByIdAndUpdate(songId, {
      $inc: { 'revenue.totalRevenue': revenueData.totalRevenue },
      'revenue.lastCalculated': new Date(),
    });

    return distribution;
  },

  /**
   * Process all pending distributions and mark as paid
   * @returns {Promise<Object>} Processing result
   */
  processPayouts: async () => {
    const pendingDistributions = await RevenueDistribution.find({
      status: 'calculated',
      'distributions.status': 'pending',
    }).populate('distributions.user', 'username email wallet');

    const results = {
      processed: 0,
      totalAmount: 0,
      errors: [],
    };

    for (const distribution of pendingDistributions) {
      try {
        for (const entry of distribution.distributions) {
          if (entry.status === 'pending' && entry.amount > 0) {
            // In production: integrate with payment processor
            // For now: mark as paid and update user's wallet
            
            await User.findByIdAndUpdate(entry.user, {
              $inc: {
                'wallet.pendingEarnings': entry.amount,
                'stats.totalEarnings': entry.amount,
              },
            });

            // Create reward record
            await Reward.create({
              user: entry.user,
              type: 'royalty',
              amount: entry.amount,
              currency: 'usd',
              source: {
                songId: distribution.song,
              },
              description: `Revenue share for ${distribution.period}`,
              status: 'credited',
              creditedAt: new Date(),
            });

            entry.status = 'paid';
            entry.paidAt = new Date();
            results.totalAmount += entry.amount;
          }
        }

        distribution.status = 'distributed';
        distribution.distributedAt = new Date();
        await distribution.save();
        results.processed++;
      } catch (error) {
        results.errors.push({
          distributionId: distribution._id,
          error: error.message,
        });
      }
    }

    return results;
  },

  /**
   * Run monthly revenue calculation for all published songs
   * @param {string} period - Period in YYYY-MM format
   */
  runMonthlyCalculation: async (period) => {
    // Default to previous month if not specified
    if (!period) {
      const now = new Date();
      now.setMonth(now.getMonth() - 1);
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const publishedSongs = await Song.find({ status: 'published' }).select('_id title');
    const results = {
      total: publishedSongs.length,
      processed: 0,
      skipped: 0,
      errors: [],
    };

    for (const song of publishedSongs) {
      try {
        const distribution = await libraryRevenueService.distributeRevenue(song._id, period);
        if (distribution) {
          results.processed++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        if (error.message.includes('already exists')) {
          results.skipped++;
        } else {
          results.errors.push({
            songId: song._id,
            title: song.title,
            error: error.message,
          });
        }
      }
    }

    return results;
  },

  /**
   * Get revenue summary for a user
   * @param {string} userId - The user ID
   */
  getUserRevenueSummary: async (userId) => {
    return RevenueDistribution.getUserRevenueSummary(userId);
  },

  /**
   * Get detailed revenue history for a user
   * @param {string} userId - The user ID
   * @param {Object} options - Query options
   */
  getUserRevenueHistory: async (userId, options = {}) => {
    return RevenueDistribution.getUserRevenue(userId, options);
  },

  /**
   * Get revenue breakdown for a specific song
   * @param {string} songId - The song ID
   * @param {Object} options - Query options
   */
  getSongRevenueHistory: async (songId, options = {}) => {
    const song = await Song.findById(songId).select('title revenue ownership').lean();
    if (!song) throw new Error('Song not found');

    const history = await RevenueDistribution.getSongRevenueHistory(songId, options);

    return {
      song: {
        id: songId,
        title: song.title,
        totalRevenue: song.revenue?.totalRevenue || 0,
        totalPlays: song.revenue?.totalPlays || 0,
      },
      history,
    };
  },

  /**
   * Estimate potential earnings for a song
   * Based on current engagement and average rates
   */
  estimateSongEarnings: async (songId) => {
    const song = await Song.findById(songId).lean();
    if (!song) throw new Error('Song not found');

    const monthlyEstimate = {
      plays: Math.round((song.plays || 0) * REVENUE_RATES.perPlay * 100),
      likes: Math.round((song.likes || 0) * REVENUE_RATES.perLike * 100),
    };

    return {
      currentStats: {
        plays: song.plays || 0,
        likes: song.likes || 0,
      },
      estimatedMonthlyRevenue: monthlyEstimate.plays + monthlyEstimate.likes,
      rates: REVENUE_RATES,
    };
  },
};

module.exports = libraryRevenueService;

