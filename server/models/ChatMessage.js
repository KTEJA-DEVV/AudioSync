const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.ObjectId,
      ref: 'LiveSession',
      required: true,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      maxlength: [500, 'Message cannot exceed 500 characters'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['message', 'system', 'host', 'highlighted', 'command'],
      default: 'message',
    },
    color: {
      type: String,
      default: null, // Will be generated from username hash
    },
    badges: [{
      type: String,
      enum: ['subscriber', 'moderator', 'creator', 'vip', 'verified', 'top-contributor'],
    }],
    replyTo: {
      type: mongoose.Schema.ObjectId,
      ref: 'ChatMessage',
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      default: null,
    },
    metadata: {
      userReputation: Number,
      userType: String,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to auto-delete after 24 hours
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// Index for fetching messages
chatMessageSchema.index({ session: 1, createdAt: -1 });
chatMessageSchema.index({ session: 1, type: 1, createdAt: -1 });

// Predefined username colors
const USERNAME_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Sage
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Sky
  '#F8B500', // Orange
  '#82E0AA', // Green
];

// Generate consistent color from username
chatMessageSchema.statics.getColorForUsername = function(username) {
  if (!username) return USERNAME_COLORS[0];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USERNAME_COLORS[Math.abs(hash) % USERNAME_COLORS.length];
};

// Pre-save: generate color if not set
chatMessageSchema.pre('save', async function(next) {
  if (!this.color && this.user) {
    // Get username from populated user or fetch it
    if (this.populated('user')) {
      this.color = chatMessageSchema.statics.getColorForUsername(this.user.username);
    }
  }
  next();
});

// Method to soft delete
chatMessageSchema.methods.softDelete = async function(deletedByUserId) {
  this.isDeleted = true;
  this.deletedBy = deletedByUserId;
  this.message = '[Message deleted]';
  await this.save();
  return this;
};

// Method to highlight
chatMessageSchema.methods.highlight = async function() {
  this.type = 'highlighted';
  await this.save();
  return this;
};

// Static to get recent messages for a session
chatMessageSchema.statics.getRecent = async function(sessionId, limit = 100, before = null) {
  const query = { 
    session: sessionId,
    isDeleted: false,
  };
  
  if (before) {
    query.createdAt = { $lt: before };
  }
  
  return this.find(query)
    .populate('user', 'username displayName avatar reputation.level userType')
    .populate('replyTo', 'message user')
    .sort('-createdAt')
    .limit(limit)
    .lean()
    .then(messages => messages.reverse()); // Return in chronological order
};

// Static to get highlighted messages
chatMessageSchema.statics.getHighlighted = async function(sessionId) {
  return this.find({ 
    session: sessionId, 
    type: 'highlighted',
    isDeleted: false,
  })
    .populate('user', 'username displayName avatar')
    .sort('-createdAt')
    .lean();
};

// Transform for safe output
chatMessageSchema.methods.toSafeObject = function() {
  return {
    id: this._id,
    message: this.isDeleted ? '[Message deleted]' : this.message,
    type: this.type,
    color: this.color,
    badges: this.badges,
    isDeleted: this.isDeleted,
    createdAt: this.createdAt,
    user: this.user,
    replyTo: this.replyTo,
  };
};

module.exports = mongoose.model('ChatMessage', chatMessageSchema);

