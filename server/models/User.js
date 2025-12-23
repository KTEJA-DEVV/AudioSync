const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

const userSchema = new mongoose.Schema(
  {
    // Basic Info
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username cannot exceed 20 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't include password in queries by default
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
    },
    avatar: {
      type: String,
      default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
    },
    coverImage: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
    
    // Role & Type - UPDATED: Added clear role hierarchy for session management
    role: {
      type: String,
      enum: ['user', 'creator', 'moderator', 'admin'],
      default: 'user',
    },
    userType: {
      type: String,
      enum: ['casual', 'technical', 'creator'],
      default: 'casual',
    },

    // NEW: Account Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Stats - UPDATED: Added session-related stats
    stats: {
      songsContributed: { type: Number, default: 0 },
      lyricsAccepted: { type: Number, default: 0 },
      lyricsWon: { type: Number, default: 0 },
      stemsAccepted: { type: Number, default: 0 },
      votesCast: { type: Number, default: 0 },
      sessionsAttended: { type: Number, default: 0 },
      sessionsHosted: { type: Number, default: 0 },
      sessionsCreated: { type: Number, default: 0 }, // NEW: Track sessions created by admin
      totalEarnings: { type: Number, default: 0 },
      helpfulFeedback: { type: Number, default: 0 },
      feedbackSubmitted: { type: Number, default: 0 }, // NEW: Track feedback given
      tipsSent: { type: Number, default: 0 },
      tipsReceived: { type: Number, default: 0 },
      competitionsWon: { type: Number, default: 0 },
    },

    // Activity Streaks
    streaks: {
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      lastActiveDate: { type: Date },
    },

    // Reputation System
    reputation: {
      score: { type: Number, default: 0 },
      level: {
        type: String,
        enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
        default: 'bronze',
      },
      badges: [
        {
          badgeId: { type: String, required: true },
          name: { type: String, required: true },
          description: { type: String },
          icon: { type: String },
          rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'] },
          earnedAt: { type: Date, default: Date.now },
        },
      ],
      voteWeight: { type: Number, default: 1, min: 1, max: 10 },
    },

    // Preferences
    preferences: {
      favoriteGenres: [{ type: String }],
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        sessionUpdates: { type: Boolean, default: true }, // NEW: Session-specific notifications
        voteResults: { type: Boolean, default: true }, // NEW: Vote result notifications
      },
      audioQuality: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'high',
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      // NEW: Session preferences
      sessionPreferences: {
        autoJoinPublic: { type: Boolean, default: false },
        showInParticipantList: { type: Boolean, default: true },
        allowDirectMessages: { type: Boolean, default: true },
      },
    },

    // Subscription
    subscription: {
      tier: {
        type: String,
        enum: ['free', 'supporter', 'creator', 'pro'],
        default: 'free',
      },
      validUntil: { type: Date },
      features: [{ type: String }],
      stripeCustomerId: { type: String },
      stripeSubscriptionId: { type: String },
    },

    // Wallet
    wallet: {
      balance: { type: Number, default: 0 },
      pendingEarnings: { type: Number, default: 0 },
      payoutMethod: {
        type: { type: String, enum: ['paypal', 'stripe', 'bank'] },
        details: { type: mongoose.Schema.Types.Mixed },
      },
      tokenBalance: { type: Number, default: 0 },
    },

    // Social Links
    socialLinks: {
      twitter: { type: String, default: '' },
      instagram: { type: String, default: '' },
      soundcloud: { type: String, default: '' },
      spotify: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },

    // Email Verification
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    // Password Reset
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    // Activity
    lastActiveAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date }, // NEW: Track last login
    isOnline: { type: Boolean, default: false },

    // NEW: Session-related tracking
    currentSession: {
      sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
      joinedAt: { type: Date },
      role: { type: String, enum: ['participant', 'host', 'moderator'] },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient role-based queries
userSchema.index({ role: 1 });
userSchema.index({ 'reputation.score': -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1 }); // NEW: Index for role-based queries
userSchema.index({ isActive: 1 }); // NEW: Index for active user queries
userSchema.index({ 'stats.sessionsCreated': -1 }); // NEW: Index for admin session stats

// Virtual for avatar URL with fallback
userSchema.virtual('avatarUrl').get(function () {
  if (this.avatar) return this.avatar;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.username}`;
});

// Virtual for contributor tier based on contributions
userSchema.virtual('contributorTier').get(function () {
  const totalContributions = 
    (this.stats?.songsContributed || 0) +
    (this.stats?.lyricsAccepted || 0) +
    (this.stats?.stemsAccepted || 0);
  
  if (totalContributions >= 200) return 'elite';
  if (totalContributions >= 51) return 'dedicated';
  if (totalContributions >= 11) return 'active';
  return 'casual';
});

// Virtual for total contributions count
userSchema.virtual('totalContributions').get(function () {
  return (
    (this.stats?.songsContributed || 0) +
    (this.stats?.lyricsAccepted || 0) +
    (this.stats?.stemsAccepted || 0)
  );
});

// NEW: Virtual to check if user can create sessions (admin or creator role)
userSchema.virtual('canCreateSession').get(function () {
  return ['admin', 'creator', 'moderator'].includes(this.role);
});

// NEW: Virtual to check if user can manage sessions (admin only for full control)
userSchema.virtual('canManageSessions').get(function () {
  return this.role === 'admin';
});

// NEW: Virtual to check if user can moderate (admin or moderator)
userSchema.virtual('canModerate').get(function () {
  return ['admin', 'moderator'].includes(this.role);
});

// NEW: Virtual for role display name
userSchema.virtual('roleDisplayName').get(function () {
  const roleNames = {
    user: 'Participant',
    creator: 'Creator',
    moderator: 'Moderator',
    admin: 'Administrator',
  };
  return roleNames[this.role] || 'User';
});

// Pre-save hook for password hashing
userSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();

  try {
    // Generate salt and hash password with 12 rounds
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save hook for display name default
userSchema.pre('save', function (next) {
  if (!this.displayName) {
    this.displayName = this.username;
  }

// Method: Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Role-based permission methods
userSchema.methods.hasRole = function(roles) {
  if (!this.role) return false;
  if (typeof roles === 'string') {
    return this.role === roles;
  }
  return roles.includes(this.role);
};

userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

userSchema.methods.canCreateSession = function() {
  return this.role === 'admin';
};

userSchema.methods.canModerate = function() {
  return ['admin', 'moderator'].includes(this.role);
};

// Virtual for permissions
userSchema.virtual('permissions').get(function() {
  return {
    canCreateSession: this.role === 'admin',
    canModerate: ['admin', 'moderator'].includes(this.role),
    canCreateCompetition: ['admin', 'creator'].includes(this.role),
    canUploadStems: ['admin', 'creator', 'technical'].includes(this.role) || this.userType === 'technical',
    voteWeight: this.calculateVoteWeight()
  };
});

// Method: Generate JWT token - UPDATED: Include more role info
userSchema.methods.generateToken = function (expiresIn = config.jwtExpiresIn) {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      tier: this.subscription?.tier || 'free',
      canCreateSession: this.canCreateSession,
      canManageSessions: this.canManageSessions,
      canModerate: this.canModerate,
    },
    config.jwtSecret,
    { expiresIn }
  );
};

// Method: Get public profile - UPDATED: Include role permissions info
userSchema.methods.toPublicProfile = function() {
  const user = this;
  const publicProfile = {
    id: user._id,
    username: user.username,
    displayName: user.displayName || user.username,
    avatar: user.avatarUrl,
    bio: user.bio,
    role: user.role,
    userType: user.userType,
    stats: user.stats,
    reputation: {
      score: user.reputation.score,
      level: user.reputation.level,
      badges: user.reputation.badges,
      voteWeight: user.reputation.voteWeight,
    },
    socialLinks: user.socialLinks,
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt,
    // Include permissions in public profile
    permissions: user.permissions
  };

  return publicProfile;
};

// Method to get auth response (for login/register)
userSchema.methods.toAuthResponse = function() {
  const user = this;
  const token = user.generateToken();
  
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    displayName: user.displayName || user.username,
    avatar: user.avatarUrl,
    role: user.role,
    userType: user.userType,
    subscription: {
      tier: user.subscription?.tier || 'free',
      validUntil: user.subscription?.validUntil,
    },
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    // Permission flags for frontend role-based UI
    permissions: {
      canCreateSession: user.canCreateSession,
      canManageSessions: user.canManageSessions,
      canModerate: user.canModerate,
      isAdmin: user.isAdmin(),
    },
  };
};

// NEW: Method to increment session stats
userSchema.methods.incrementSessionStat = async function (statName, value = 1) {
  const validStats = [
    'sessionsAttended',
    'sessionsHosted',
    'sessionsCreated',
    'votesCast',
    'feedbackSubmitted',
  ];

  if (!validStats.includes(statName)) {
    throw new Error(`Invalid stat name: ${statName}`);
  }

  this.stats[statName] = (this.stats[statName] || 0) + value;
  
  // Check for new badges after stat update
  const newBadges = await this.checkBadgeEligibility();
  
  await this.save();
  
  return { newValue: this.stats[statName], newBadges };
};

// NEW: Method to update current session
userSchema.methods.joinSession = async function (sessionId, role = 'participant') {
  this.currentSession = {
    sessionId,
    joinedAt: new Date(),
    role,
  };
  this.lastActiveAt = new Date();
  await this.save();
};

// NEW: Method to leave current session
userSchema.methods.leaveSession = async function () {
  this.currentSession = undefined;
  this.lastActiveAt = new Date();
  await this.save();
};

// Static: Find by credentials
userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email }).select('+password');
  
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // NEW: Check if user is active
  if (!user.isActive) {
    throw new Error('Your account has been deactivated. Please contact support.');
  }

  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  // Update last login
  user.lastLoginAt = new Date();
  user.lastActiveAt = new Date();
  await user.save();

  return user;
};

// Static: Get leaderboard
userSchema.statics.getLeaderboard = async function (options = {}) {
  const {
    limit = 50,
    sortBy = 'reputation.score',
    filter = {},
  } = options;

  return this.find({ ...filter, isActive: true }) // Only active users
    .select('username displayName avatar reputation.score reputation.level reputation.badges stats')
    .sort({ [sortBy]: -1 })
    .limit(limit)
    .lean();
};

// NEW: Static: Find admins
userSchema.statics.findAdmins = async function () {
  return this.find({ role: 'admin', isActive: true })
    .select('username displayName email avatar')
    .lean();
};

// NEW: Static: Find users by role
userSchema.statics.findByRole = async function (role, options = {}) {
  const { limit = 50, skip = 0 } = options;
  
  return this.find({ role, isActive: true })
    .select('username displayName avatar role stats reputation.score reputation.level')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// NEW: Static: Get session creators (users who can create sessions)
userSchema.statics.getSessionCreators = async function () {
  return this.find({ 
    role: { $in: ['admin', 'creator', 'moderator'] },
    isActive: true 
  })
    .select('username displayName avatar role stats.sessionsCreated stats.sessionsHosted')
    .sort({ 'stats.sessionsCreated': -1 })
    .lean();
};

// NEW: Static: Check if email exists
userSchema.statics.emailExists = async function (email) {
  const user = await this.findOne({ email: email.toLowerCase() });
  return !!user;
};

// NEW: Static: Check if username exists
userSchema.statics.usernameExists = async function (username) {
  const user = await this.findOne({ username: username.toLowerCase() });
  return !!user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;