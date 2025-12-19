const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter is required'],
    },
    targetType: {
      type: String,
      enum: ['user', 'submission', 'song', 'message', 'session', 'comment', 'stem'],
      required: [true, 'Target type is required'],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Target ID is required'],
    },
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'harassment', 'copyright', 'hate-speech', 'violence', 'misinformation', 'other'],
      required: [true, 'Reason is required'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolution: {
      action: {
        type: String,
        enum: ['no-action', 'warning-issued', 'content-removed', 'user-muted', 'user-banned', 'other'],
      },
      note: {
        type: String,
        maxlength: [500, 'Resolution note cannot exceed 500 characters'],
      },
      resolvedAt: Date,
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    // For auto-flagged content
    autoFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: String, // e.g., "profanity detected", "spam score high"
  },
  {
    timestamps: true,
  }
);

// Indexes
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ assignedTo: 1, status: 1 });
reportSchema.index({ priority: 1, status: 1, createdAt: -1 });

// Static: Get pending reports count
reportSchema.statics.getPendingCount = async function () {
  return this.countDocuments({ status: 'pending' });
};

// Static: Get reports with filters
reportSchema.statics.getReports = async function (options = {}) {
  const {
    page = 1,
    limit = 20,
    status,
    targetType,
    priority,
    assignedTo,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const query = {};
  if (status) query.status = status;
  if (targetType) query.targetType = targetType;
  if (priority) query.priority = priority;
  if (assignedTo) query.assignedTo = assignedTo;

  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    this.find(query)
      .populate('reporter', 'username displayName avatar')
      .populate('assignedTo', 'username displayName avatar')
      .populate('resolution.resolvedBy', 'username displayName')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    reports,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
