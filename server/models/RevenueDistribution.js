const mongoose = require('mongoose');

const distributionEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  shares: {
    type: Number,
    required: true,
  },
  percentage: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number, // In cents
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed'],
    default: 'pending',
  },
  paidAt: Date,
  transactionId: String, // Payment processor transaction ID
}, { _id: false });

const revenueDistributionSchema = new mongoose.Schema(
  {
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song',
      required: [true, 'Song reference is required'],
    },
    period: {
      type: String, // Format: "2024-01" for monthly
      required: [true, 'Period is required'],
      match: [/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format'],
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    
    // Revenue sources
    revenueSources: {
      plays: { type: Number, default: 0 }, // Revenue from plays
      likes: { type: Number, default: 0 }, // Revenue from likes (if monetized)
      downloads: { type: Number, default: 0 },
      tips: { type: Number, default: 0 },
      licensing: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    
    totalRevenue: {
      type: Number, // In cents
      required: true,
      min: 0,
    },
    
    // Platform fee
    platformFee: {
      percentage: { type: Number, default: 10 }, // 10% platform fee
      amount: { type: Number, default: 0 },
    },
    
    // Net revenue after platform fee
    netRevenue: {
      type: Number,
      min: 0,
    },
    
    // Distribution to owners
    distributions: [distributionEntrySchema],
    
    // Stats for this period
    stats: {
      totalPlays: { type: Number, default: 0 },
      uniqueListeners: { type: Number, default: 0 },
      totalLikes: { type: Number, default: 0 },
      totalDownloads: { type: Number, default: 0 },
    },
    
    status: {
      type: String,
      enum: ['calculated', 'approved', 'distributed', 'completed'],
      default: 'calculated',
    },
    
    calculatedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: Date,
    distributedAt: Date,
    completedAt: Date,
    
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
revenueDistributionSchema.index({ song: 1, period: 1 }, { unique: true });
revenueDistributionSchema.index({ period: 1, status: 1 });
revenueDistributionSchema.index({ 'distributions.user': 1, period: 1 });
revenueDistributionSchema.index({ status: 1, calculatedAt: -1 });

// Pre-save: Calculate net revenue and platform fee
revenueDistributionSchema.pre('save', function (next) {
  if (this.isModified('totalRevenue') || this.isModified('platformFee.percentage')) {
    this.platformFee.amount = Math.round(this.totalRevenue * (this.platformFee.percentage / 100));
    this.netRevenue = this.totalRevenue - this.platformFee.amount;
  }
  next();
});

// Static: Get revenue history for a song
revenueDistributionSchema.statics.getSongRevenueHistory = async function (songId, options = {}) {
  const { limit = 12 } = options; // Default last 12 months

  return this.find({ song: songId })
    .sort({ period: -1 })
    .limit(limit)
    .lean();
};

// Static: Get user's revenue across all songs
revenueDistributionSchema.statics.getUserRevenue = async function (userId, options = {}) {
  const { period, limit = 12 } = options;

  const match = { 'distributions.user': userId };
  if (period) match.period = period;

  const results = await this.aggregate([
    { $match: match },
    { $unwind: '$distributions' },
    { $match: { 'distributions.user': userId } },
    { $sort: { period: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'songs',
        localField: 'song',
        foreignField: '_id',
        as: 'songDetails',
      },
    },
    { $unwind: '$songDetails' },
    {
      $project: {
        period: 1,
        songId: '$song',
        songTitle: '$songDetails.title',
        songCoverArt: '$songDetails.coverArt',
        userAmount: '$distributions.amount',
        userPercentage: '$distributions.percentage',
        status: '$distributions.status',
        totalRevenue: 1,
        stats: 1,
      },
    },
  ]);

  return results;
};

// Static: Get user's total revenue summary
revenueDistributionSchema.statics.getUserRevenueSummary = async function (userId) {
  const results = await this.aggregate([
    { $match: { 'distributions.user': userId } },
    { $unwind: '$distributions' },
    { $match: { 'distributions.user': userId } },
    {
      $group: {
        _id: null,
        totalEarned: { $sum: '$distributions.amount' },
        totalPending: {
          $sum: {
            $cond: [{ $eq: ['$distributions.status', 'pending'] }, '$distributions.amount', 0],
          },
        },
        totalPaid: {
          $sum: {
            $cond: [{ $eq: ['$distributions.status', 'paid'] }, '$distributions.amount', 0],
          },
        },
        songCount: { $addToSet: '$song' },
        periodCount: { $addToSet: '$period' },
      },
    },
    {
      $project: {
        _id: 0,
        totalEarned: 1,
        totalPending: 1,
        totalPaid: 1,
        uniqueSongs: { $size: '$songCount' },
        periodsWithRevenue: { $size: '$periodCount' },
      },
    },
  ]);

  return results[0] || {
    totalEarned: 0,
    totalPending: 0,
    totalPaid: 0,
    uniqueSongs: 0,
    periodsWithRevenue: 0,
  };
};

// Static: Create distribution for a period
revenueDistributionSchema.statics.createDistribution = async function (songId, period, revenueData) {
  const Ownership = mongoose.model('Ownership');
  const Song = mongoose.model('Song');

  const song = await Song.findById(songId);
  if (!song) throw new Error('Song not found');

  const ownerships = await Ownership.find({ song: songId }).lean();
  if (!ownerships.length) throw new Error('No ownership records found');

  const totalShares = song.ownership?.totalShares || 10000;
  const platformFeePercentage = 10; // 10% platform fee
  const platformFee = Math.round(revenueData.totalRevenue * (platformFeePercentage / 100));
  const netRevenue = revenueData.totalRevenue - platformFee;

  // Calculate distributions
  const distributions = ownerships.map(ownership => {
    const percentage = (ownership.shares / totalShares) * 100;
    const amount = Math.round(netRevenue * (percentage / 100));
    return {
      user: ownership.user,
      shares: ownership.shares,
      percentage,
      amount,
      status: 'pending',
    };
  });

  // Parse period to get start/end dates
  const [year, month] = period.split('-').map(Number);
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const distribution = await this.create({
    song: songId,
    period,
    periodStart,
    periodEnd,
    revenueSources: revenueData.sources || {},
    totalRevenue: revenueData.totalRevenue,
    platformFee: { percentage: platformFeePercentage, amount: platformFee },
    netRevenue,
    distributions,
    stats: revenueData.stats || {},
    status: 'calculated',
  });

  return distribution;
};

const RevenueDistribution = mongoose.model('RevenueDistribution', revenueDistributionSchema);

module.exports = RevenueDistribution;

