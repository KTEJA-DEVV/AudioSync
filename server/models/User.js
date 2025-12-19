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
    
    // Role & Type
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

    // Stats
    stats: {
      songsContributed: { type: Number, default: 0 },
      lyricsAccepted: { type: Number, default: 0 },
      lyricsWon: { type: Number, default: 0 },
      stemsAccepted: { type: Number, default: 0 },
      votesCast: { type: Number, default: 0 },
      sessionsAttended: { type: Number, default: 0 },
      sessionsHosted: { type: Number, default: 0 },
      totalEarnings: { type: Number, default: 0 },
      helpfulFeedback: { type: Number, default: 0 },
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
    isOnline: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes - only add indexes that aren't already defined via unique: true
userSchema.index({ 'reputation.score': -1 });
userSchema.index({ createdAt: -1 });

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
  next();
});

// Method: Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method: Generate JWT token
userSchema.methods.generateToken = function (expiresIn = config.jwtExpiresIn) {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      tier: this.subscription?.tier || 'free',
    },
    config.jwtSecret,
    { expiresIn }
  );
};

// Method: Calculate vote weight based on reputation
// Formula: base 1 + (reputation / 1000), capped at 5
userSchema.methods.calculateVoteWeight = function () {
  const score = this.reputation?.score || 0;
  
  // Base weight: 1 + (reputation / 1000)
  const weight = 1 + (score / 1000);
  
  // Cap at 5
  return Math.min(Math.round(weight * 100) / 100, 5);
};

// Method: Get vote weight breakdown for UI
userSchema.methods.getVoteWeightBreakdown = function () {
  const score = this.reputation?.score || 0;
  const baseWeight = 1;
  const reputationBonus = Math.min(score / 1000, 4); // Max 4 from reputation
  const totalWeight = this.calculateVoteWeight();
  
  return {
    base: baseWeight,
    reputationBonus: Math.round(reputationBonus * 100) / 100,
    total: totalWeight,
    maxPossible: 5,
    reputationNeededForMax: 4000,
  };
};

// Method: Add reputation points
userSchema.methods.addReputation = async function (points, reason) {
  this.reputation.score += points;
  
  // Update level based on score
  const newLevel = this.calculateLevel();
  const levelChanged = newLevel !== this.reputation.level;
  this.reputation.level = newLevel;
  
  // Recalculate vote weight
  this.reputation.voteWeight = this.calculateVoteWeight();
  
  // Check for new badges
  await this.checkBadgeEligibility();
  
  await this.save();
  
  return { levelChanged, newLevel, newScore: this.reputation.score };
};

// Method: Calculate reputation level
userSchema.methods.calculateLevel = function () {
  const score = this.reputation.score;
  
  if (score >= 10000) return 'diamond';
  if (score >= 5000) return 'platinum';
  if (score >= 2000) return 'gold';
  if (score >= 500) return 'silver';
  return 'bronze';
};

// Method: Check badge eligibility
userSchema.methods.checkBadgeEligibility = async function () {
  const earnedBadges = [];
  const existingBadgeIds = this.reputation.badges.map(b => b.badgeId);

  const badgeRules = [
    {
      badgeId: 'first_contribution',
      name: 'First Steps',
      description: 'Made your first contribution',
      icon: '🎵',
      rarity: 'common',
      condition: () => this.stats.songsContributed >= 1,
    },
    {
      badgeId: 'ten_contributions',
      name: 'Rising Star',
      description: 'Made 10 contributions',
      icon: '⭐',
      rarity: 'rare',
      condition: () => this.stats.songsContributed >= 10,
    },
    {
      badgeId: 'fifty_contributions',
      name: 'Prolific Creator',
      description: 'Made 50 contributions',
      icon: '🌟',
      rarity: 'epic',
      condition: () => this.stats.songsContributed >= 50,
    },
    {
      badgeId: 'hundred_votes',
      name: 'Democracy Hero',
      description: 'Cast 100 votes',
      icon: '🗳️',
      rarity: 'rare',
      condition: () => this.stats.votesCast >= 100,
    },
    {
      badgeId: 'ten_sessions',
      name: 'Session Regular',
      description: 'Attended 10 live sessions',
      icon: '🎤',
      rarity: 'rare',
      condition: () => this.stats.sessionsAttended >= 10,
    },
    {
      badgeId: 'gold_reputation',
      name: 'Golden Voice',
      description: 'Reached Gold reputation level',
      icon: '🏆',
      rarity: 'epic',
      condition: () => this.reputation.score >= 2000,
    },
    {
      badgeId: 'diamond_reputation',
      name: 'Diamond Legend',
      description: 'Reached Diamond reputation level',
      icon: '💎',
      rarity: 'legendary',
      condition: () => this.reputation.score >= 10000,
    },
  ];

  for (const rule of badgeRules) {
    if (!existingBadgeIds.includes(rule.badgeId) && rule.condition()) {
      const badge = {
        badgeId: rule.badgeId,
        name: rule.name,
        description: rule.description,
        icon: rule.icon,
        rarity: rule.rarity,
        earnedAt: new Date(),
      };
      this.reputation.badges.push(badge);
      earnedBadges.push(badge);
    }
  }

  return earnedBadges;
};

// Method: Get public profile
userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    username: this.username,
    displayName: this.displayName,
    avatar: this.avatarUrl,
    coverImage: this.coverImage,
    bio: this.bio,
    role: this.role,
    userType: this.userType,
    stats: this.stats,
    reputation: {
      score: this.reputation.score,
      level: this.reputation.level,
      badges: this.reputation.badges,
      voteWeight: this.reputation.voteWeight,
    },
    socialLinks: this.socialLinks,
    createdAt: this.createdAt,
    lastActiveAt: this.lastActiveAt,
  };
};

// Static: Find by credentials
userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email }).select('+password');
  
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  return user;
};

// Static: Get leaderboard
userSchema.statics.getLeaderboard = async function (options = {}) {
  const {
    limit = 50,
    sortBy = 'reputation.score',
    filter = {},
  } = options;

  return this.find(filter)
    .select('username displayName avatar reputation.score reputation.level reputation.badges stats')
    .sort({ [sortBy]: -1 })
    .limit(limit)
    .lean();
};

const User = mongoose.model('User', userSchema);

module.exports = User;
