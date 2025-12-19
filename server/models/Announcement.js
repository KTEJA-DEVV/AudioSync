const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      maxlength: [5000, 'Content cannot exceed 5000 characters'],
    },
    summary: {
      type: String,
      maxlength: [300, 'Summary cannot exceed 300 characters'],
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'feature', 'maintenance', 'update', 'event'],
      default: 'info',
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'archived'],
      default: 'draft',
    },
    targetAudience: {
      type: String,
      enum: ['all', 'creators', 'subscribers', 'free-users', 'moderators', 'admins'],
      default: 'all',
    },
    priority: {
      type: Number,
      default: 0, // Higher = more important
      min: 0,
      max: 100,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    // Display options
    dismissible: {
      type: Boolean,
      default: true,
    },
    showBanner: {
      type: Boolean,
      default: false,
    },
    bannerColor: {
      type: String,
      default: '#6366f1', // Primary color
    },
    // Link
    actionUrl: String,
    actionText: String,
    // Stats
    views: {
      type: Number,
      default: 0,
    },
    dismissedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    publishedAt: Date,
    archivedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
announcementSchema.index({ status: 1, startDate: 1, endDate: 1 });
announcementSchema.index({ status: 1, priority: -1 });
announcementSchema.index({ createdAt: -1 });

// Virtual: Check if currently active
announcementSchema.virtual('isCurrentlyActive').get(function () {
  if (this.status !== 'active') return false;
  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  return true;
});

// Static: Get active announcements for a user
announcementSchema.statics.getActiveForUser = async function (user = null) {
  const now = new Date();
  
  const query = {
    status: 'active',
    $or: [
      { startDate: null },
      { startDate: { $lte: now } },
    ],
    $and: [
      {
        $or: [
          { endDate: null },
          { endDate: { $gte: now } },
        ],
      },
    ],
  };

  // Filter by audience if user provided
  if (user) {
    const audienceFilter = ['all'];
    if (user.role === 'admin') audienceFilter.push('admins');
    if (['moderator', 'admin'].includes(user.role)) audienceFilter.push('moderators');
    if (user.role === 'creator') audienceFilter.push('creators');
    if (user.subscription?.tier && user.subscription.tier !== 'free') {
      audienceFilter.push('subscribers');
    } else {
      audienceFilter.push('free-users');
    }
    query.targetAudience = { $in: audienceFilter };
    
    // Exclude dismissed
    query.dismissedBy = { $ne: user._id };
  } else {
    query.targetAudience = 'all';
  }

  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .limit(10)
    .lean();
};

// Static: Get all announcements for admin
announcementSchema.statics.getAll = async function (options = {}) {
  const { page = 1, limit = 20, status } = options;

  const query = {};
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const [announcements, total] = await Promise.all([
    this.find(query)
      .populate('createdBy', 'username displayName')
      .populate('updatedBy', 'username displayName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    announcements,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

// Method: Dismiss for user
announcementSchema.methods.dismissForUser = async function (userId) {
  if (!this.dismissedBy.includes(userId)) {
    this.dismissedBy.push(userId);
    await this.save();
  }
};

// Method: Record view
announcementSchema.methods.recordView = async function () {
  this.views += 1;
  await this.save();
};

const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = Announcement;
