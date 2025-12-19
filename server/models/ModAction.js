const mongoose = require('mongoose');

const modActionSchema = new mongoose.Schema(
  {
    moderator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Moderator is required'],
    },
    actionType: {
      type: String,
      enum: [
        'warn', 'mute', 'unmute', 'ban', 'unban',
        'delete-content', 'hide-content', 'restore-content', 'feature-content',
        'edit-content', 'resolve-report', 'dismiss-report',
        'update-user-role', 'update-settings', 'cancel-session',
        'create-announcement', 'update-announcement'
      ],
      required: [true, 'Action type is required'],
    },
    targetType: {
      type: String,
      enum: ['user', 'submission', 'song', 'message', 'session', 'comment', 'stem', 'report', 'setting', 'announcement'],
      required: [true, 'Target type is required'],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Target ID is required'],
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reason: {
      type: String,
      maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      // Can store: duration for mutes, old/new values for edits, etc.
    },
    relatedReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
    },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
modActionSchema.index({ moderator: 1, createdAt: -1 });
modActionSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
modActionSchema.index({ targetUser: 1, createdAt: -1 });
modActionSchema.index({ actionType: 1, createdAt: -1 });
modActionSchema.index({ createdAt: -1 });

// Static: Get mod actions with filters
modActionSchema.statics.getActions = async function (options = {}) {
  const {
    page = 1,
    limit = 50,
    moderator,
    targetUser,
    targetType,
    actionType,
  } = options;

  const query = {};
  if (moderator) query.moderator = moderator;
  if (targetUser) query.targetUser = targetUser;
  if (targetType) query.targetType = targetType;
  if (actionType) query.actionType = actionType;

  const skip = (page - 1) * limit;

  const [actions, total] = await Promise.all([
    this.find(query)
      .populate('moderator', 'username displayName avatar')
      .populate('targetUser', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    actions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

// Static: Get recent actions for a user
modActionSchema.statics.getUserHistory = async function (userId, limit = 10) {
  return this.find({ targetUser: userId })
    .populate('moderator', 'username displayName')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static: Log an action
modActionSchema.statics.logAction = async function (data) {
  return this.create(data);
};

const ModAction = mongoose.model('ModAction', modActionSchema);

module.exports = ModAction;
