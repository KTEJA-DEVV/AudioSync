const mongoose = require('mongoose');
const crypto = require('crypto');

// =============================================
// SUB-SCHEMAS
// =============================================

// Vote Schema for songs/submissions
const voteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  weight: {
    type: Number,
    default: 1,
    min: 1,
    max: 10,
  },
  votedAt: {
    type: Date,
    default: Date.now,
  },
});

// Song Schema
const songSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Song title is required'],
    trim: true,
    maxlength: [200, 'Song title cannot exceed 200 characters'],
  },
  artist: {
    type: String,
    trim: true,
    maxlength: [200, 'Artist name cannot exceed 200 characters'],
  },
  album: {
    type: String,
    trim: true,
    maxlength: [200, 'Album name cannot exceed 200 characters'],
  },
  duration: {
    type: Number,
    default: 0,
    min: 0,
  },
  spotifyId: {
    type: String,
    trim: true,
  },
  youtubeId: {
    type: String,
    trim: true,
  },
  previewUrl: {
    type: String,
    trim: true,
  },
  imageUrl: {
    type: String,
    trim: true,
  },
  votes: [voteSchema],
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  isPlaying: {
    type: Boolean,
    default: false,
  },
  playedAt: {
    type: Date,
  },
  order: {
    type: Number,
    default: 0,
  },
});

// Participant Schema
const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
  leftAt: {
    type: Date,
  },
  role: {
    type: String,
    enum: ['participant', 'moderator', 'host'],
    default: 'participant',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  socketId: {
    type: String,
  },
  // Kick tracking
  kickedAt: {
    type: Date,
  },
  kickedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  kickReason: {
    type: String,
    maxlength: [200, 'Kick reason cannot exceed 200 characters'],
  },
  // Stats for this session
  sessionStats: {
    votesGiven: { type: Number, default: 0 },
    submissionsCount: { type: Number, default: 0 },
  },
});

// Feedback Schema
const feedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: [true, 'Rating is required'],
  },
  comment: {
    type: String,
    maxlength: [500, 'Feedback comment cannot exceed 500 characters'],
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
  },
});

// =============================================
// MAIN SESSION SCHEMA
// =============================================

const sessionSchema = new mongoose.Schema(
  {
    // Basic Info
    title: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Host is required'],
    },
    
    // Session Code for joining
    sessionCode: {
      type: String,
      unique: true,
      uppercase: true,
      minlength: 6,
      maxlength: 6,
      index: true,
    },
    
    // Invite Code for private sessions
    inviteCode: {
      type: String,
      select: false,
    },
    
    // Status & Stage
    status: {
      type: String,
      enum: ['draft', 'waiting', 'lyrics-open', 'lyrics-voting', 'generation', 'song-voting', 'active', 'paused', 'completed', 'cancelled'],
      default: 'draft',
    },
    previousStatus: {
      type: String,
      enum: ['draft', 'waiting', 'lyrics-open', 'lyrics-voting', 'generation', 'song-voting', 'active', 'paused', 'completed', 'cancelled'],
    },
    stage: {
      type: Number,
      min: 1,
      max: 6,
      default: 1,
    },
    
    // Music Info
    genre: {
      type: String,
      required: [true, 'Genre is required'],
      enum: [
        'pop', 'rock', 'hip-hop', 'r&b', 'electronic', 'jazz', 
        'classical', 'country', 'folk', 'indie', 'metal', 'punk',
        'soul', 'funk', 'reggae', 'blues', 'latin', 'world', 'other'
      ],
    },
    mood: {
      type: String,
      enum: ['happy', 'sad', 'energetic', 'chill', 'angry', 'romantic', 'inspirational', 'dark', 'uplifting', 'melancholic', 'other'],
    },
    targetBPM: {
      type: Number,
      min: 40,
      max: 220,
    },
    theme: {
      type: String,
      maxlength: [200, 'Theme cannot exceed 200 characters'],
    },
    guidelines: {
      type: String,
      maxlength: [1000, 'Guidelines cannot exceed 1000 characters'],
    },
    
    // Songs Queue
    songs: [songSchema],
    currentSongIndex: {
      type: Number,
      default: -1,
    },
    
    // Participation
    currentRound: {
      type: Number,
      default: 1,
    },
    maxParticipants: {
      type: Number,
      default: 100,
      min: 1,
      max: 10000,
    },
    participants: [participantSchema],
    
    // Feedback from participants
    feedback: [feedbackSchema],
    
    // Settings
    settings: {
      lyricsDeadline: { type: Date },
      votingDeadline: { type: Date },
      allowAnonymous: { type: Boolean, default: false },
      minReputationToSubmit: { type: Number, default: 0 },
      votingSystem: {
        type: String,
        enum: ['simple', 'weighted', 'tokenized'],
        default: 'simple',
      },
      maxLyricsPerUser: { type: Number, default: 1 },
      showVoteCountsDuringVoting: { type: Boolean, default: false },
      requireApproval: { type: Boolean, default: false },
      // New settings for session management
      allowSongRequests: { type: Boolean, default: true },
      votingEnabled: { type: Boolean, default: true },
      isPublic: { type: Boolean, default: true },
      autoPlay: { type: Boolean, default: false },
      allowSkip: { type: Boolean, default: true },
      skipThreshold: { type: Number, default: 50, min: 1, max: 100 }, // Percentage of votes needed to skip
      maxSongsPerUser: { type: Number, default: 5 },
      chatEnabled: { type: Boolean, default: true },
    },
    
    // Stats
    stats: {
      totalParticipants: { type: Number, default: 0 },
      totalSubmissions: { type: Number, default: 0 },
      totalVotes: { type: Number, default: 0 },
      peakConcurrentUsers: { type: Number, default: 0 },
      totalSongsPlayed: { type: Number, default: 0 },
      totalFeedback: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
    },
    
    // Results
    results: {
      winningLyrics: { type: mongoose.Schema.Types.ObjectId, ref: 'LyricsSubmission' },
      runnerUpLyrics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LyricsSubmission' }],
      generatedSongs: [{
        url: String,
        title: String,
        generatedAt: Date,
        votes: { type: Number, default: 0 },
      }],
      winningSong: {
        url: String,
        title: String,
        finalizedAt: Date,
      },
      topContributors: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        contributions: { type: Number, default: 0 },
        votes: { type: Number, default: 0 },
      }],
    },
    
    // Schedule & Timestamps
    schedule: {
      scheduledStart: { type: Date },
      actualStart: { type: Date },
      estimatedDuration: { type: Number }, // in minutes
      lyricsOpenAt: { type: Date },
      votingStartAt: { type: Date },
      completedAt: { type: Date },
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    pausedAt: { type: Date },
    
    // Stream Info
    streamInfo: {
      platform: { type: String, enum: ['youtube', 'twitch', 'discord', 'internal', 'none'] },
      streamUrl: { type: String },
      isLive: { type: Boolean, default: false },
      viewerCount: { type: Number, default: 0 },
    },
    
    // Human Inputs for AI generation
    humanInputs: {
      projectFile: {
        url: String,
        filename: String,
        format: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: Date,
      },
      additionalAudio: [{
        url: String,
        filename: String,
        description: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: Date,
      }],
      instructions: {
        type: String,
        maxlength: [2000, 'Instructions cannot exceed 2000 characters'],
      },
    },
    
    // Tags & Visibility
    tags: [{ type: String, lowercase: true, trim: true }],
    visibility: {
      type: String,
      enum: ['public', 'unlisted', 'private'],
      default: 'public',
    },
    
    // Moderation
    moderation: {
      bannedUsers: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        bannedAt: { type: Date, default: Date.now },
        bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, maxlength: 200 },
        expiresAt: { type: Date },
      }],
      mutedUsers: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        mutedAt: { type: Date, default: Date.now },
        mutedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        expiresAt: { type: Date },
      }],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// =============================================
// INDEXES
// =============================================

sessionSchema.index({ status: 1, 'schedule.scheduledStart': -1 });
sessionSchema.index({ host: 1, status: 1 });
sessionSchema.index({ genre: 1, status: 1 });
sessionSchema.index({ createdAt: -1 });
sessionSchema.index({ 'participants.user': 1 });
sessionSchema.index({ sessionCode: 1 }, { unique: true, sparse: true });
sessionSchema.index({ visibility: 1, status: 1 });
sessionSchema.index({ tags: 1 });

// =============================================
// VIRTUALS
// =============================================

// Virtual for checking if session is active
sessionSchema.virtual('isActive').get(function () {
  return ['lyrics-open', 'lyrics-voting', 'generation', 'song-voting', 'active', 'waiting'].includes(this.status);
});

// Virtual for checking if session is live
sessionSchema.virtual('isLive').get(function () {
  return ['lyrics-open', 'lyrics-voting', 'generation', 'song-voting', 'active'].includes(this.status);
});

// Virtual for participant count
sessionSchema.virtual('participantCount').get(function () {
  return this.participants?.filter(p => p.isActive).length || 0;
});

// Virtual for total participants (including inactive)
sessionSchema.virtual('totalParticipantCount').get(function () {
  return this.participants?.length || 0;
});

// Virtual for time remaining in current stage
sessionSchema.virtual('timeRemaining').get(function () {
  let deadline;
  if (this.status === 'lyrics-open') {
    deadline = this.settings?.lyricsDeadline;
  } else if (this.status === 'lyrics-voting' || this.status === 'song-voting') {
    deadline = this.settings?.votingDeadline;
  }
  
  if (!deadline) return null;
  
  const now = new Date();
  const remaining = new Date(deadline) - now;
  return remaining > 0 ? remaining : 0;
});

// Virtual for average rating from feedback
sessionSchema.virtual('averageRating').get(function () {
  if (!this.feedback || this.feedback.length === 0) return 0;
  const sum = this.feedback.reduce((acc, f) => acc + f.rating, 0);
  return Math.round((sum / this.feedback.length) * 10) / 10;
});

// Virtual for song vote count
songSchema.virtual('voteCount').get(function () {
  return this.votes?.length || 0;
});

// Virtual for weighted vote count
songSchema.virtual('weightedVoteCount').get(function () {
  if (!this.votes || this.votes.length === 0) return 0;
  return this.votes.reduce((acc, v) => acc + (v.weight || 1), 0);
});

// =============================================
// PRE-SAVE HOOKS
// =============================================

// Generate session code if not exists
sessionSchema.pre('save', async function (next) {
  if (!this.sessionCode) {
    let code;
    let exists = true;
    let attempts = 0;
    
    while (exists && attempts < 10) {
      code = crypto.randomBytes(3).toString('hex').toUpperCase();
      const existingSession = await mongoose.model('Session').findOne({ sessionCode: code });
      exists = !!existingSession;
      attempts++;
    }
    
    if (exists) {
      return next(new Error('Failed to generate unique session code'));
    }
    
    this.sessionCode = code;
  }
  next();
});

// Update stats when feedback changes
sessionSchema.pre('save', function (next) {
  if (this.isModified('feedback')) {
    this.stats.totalFeedback = this.feedback.length;
    if (this.feedback.length > 0) {
      const sum = this.feedback.reduce((acc, f) => acc + f.rating, 0);
      this.stats.averageRating = Math.round((sum / this.feedback.length) * 10) / 10;
    }
  }
  next();
});

// Update updatedAt timestamp
sessionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// =============================================
// INSTANCE METHODS
// =============================================

// Check if user is participant
sessionSchema.methods.isParticipant = function (userId) {
  if (!userId) return false;
  return this.participants.some(
    p => p.user.toString() === userId.toString() && p.isActive
  );
};

// Check if user is host
sessionSchema.methods.isHost = function (userId) {
  if (!userId) return false;
  return this.host.toString() === userId.toString();
};

// Check if user is session moderator
sessionSchema.methods.isSessionModerator = function (userId) {
  if (!userId) return false;
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  return participant?.role === 'moderator' || participant?.role === 'host';
};

// Check if user can perform action
sessionSchema.methods.canUserPerform = function (userId, userRole, action) {
  // System admin can do everything
  if (userRole === 'admin') return true;
  
  const isHost = this.isHost(userId);
  const isModeratorRole = userRole === 'moderator';
  const isSessionMod = this.isSessionModerator(userId);

  const permissions = {
    // Session management
    update: isHost || isModeratorRole,
    delete: isHost || userRole === 'admin',
    start: isHost || isModeratorRole || isSessionMod,
    end: isHost || isModeratorRole || isSessionMod,
    pause: isHost || isModeratorRole || isSessionMod,
    resume: isHost || isModeratorRole || isSessionMod,
    advance: isHost || isModeratorRole || isSessionMod,
    
    // Song management
    addSong: isHost || isModeratorRole || isSessionMod || this.settings?.allowSongRequests,
    removeSong: isHost || isModeratorRole || isSessionMod,
    skipSong: isHost || isModeratorRole || isSessionMod,
    reorderSongs: isHost || isModeratorRole || isSessionMod,
    
    // Participant management
    kick: isHost || isModeratorRole || isSessionMod,
    ban: isHost || isModeratorRole,
    mute: isHost || isModeratorRole || isSessionMod,
    promote: isHost,
    
    // Participant actions
    join: true,
    leave: true,
    vote: this.settings?.votingEnabled,
    feedback: true,
    chat: this.settings?.chatEnabled,
  };

  return permissions[action] || false;
};

// Check if user can submit lyrics
sessionSchema.methods.canSubmitLyrics = function (userId, userReputation = 0) {
  if (this.status !== 'lyrics-open') {
    return { allowed: false, reason: 'Lyrics submission is closed' };
  }
  if (this.settings.lyricsDeadline && new Date() > this.settings.lyricsDeadline) {
    return { allowed: false, reason: 'Submission deadline has passed' };
  }
  if (userReputation < this.settings.minReputationToSubmit) {
    return { allowed: false, reason: `Minimum reputation of ${this.settings.minReputationToSubmit} required` };
  }
  
  // Check if user is banned
  if (this.isUserBanned(userId)) {
    return { allowed: false, reason: 'You are banned from this session' };
  }
  
  return { allowed: true };
};

// Check if user can vote
sessionSchema.methods.canVote = function (userId) {
  if (!this.settings?.votingEnabled) {
    return { allowed: false, reason: 'Voting is disabled for this session' };
  }
  if (this.status !== 'lyrics-voting' && this.status !== 'song-voting' && this.status !== 'active') {
    return { allowed: false, reason: 'Voting is not open' };
  }
  if (this.settings.votingDeadline && new Date() > this.settings.votingDeadline) {
    return { allowed: false, reason: 'Voting deadline has passed' };
  }
  if (this.isUserBanned(userId)) {
    return { allowed: false, reason: 'You are banned from this session' };
  }
  
  return { allowed: true };
};

// Check if user can add songs
sessionSchema.methods.canAddSong = function (userId, userRole) {
  if (!this.settings?.allowSongRequests && !this.isHost(userId) && userRole !== 'admin' && userRole !== 'moderator') {
    return { allowed: false, reason: 'Song requests are not allowed in this session' };
  }
  if (this.isUserBanned(userId)) {
    return { allowed: false, reason: 'You are banned from this session' };
  }
  if (this.status === 'completed' || this.status === 'cancelled') {
    return { allowed: false, reason: 'Session has ended' };
  }
  
  // Check max songs per user
  const userSongCount = this.songs.filter(s => s.addedBy?.toString() === userId.toString()).length;
  if (this.settings?.maxSongsPerUser && userSongCount >= this.settings.maxSongsPerUser) {
    return { allowed: false, reason: `Maximum ${this.settings.maxSongsPerUser} songs per user` };
  }
  
  return { allowed: true };
};

// Check if user is banned
sessionSchema.methods.isUserBanned = function (userId) {
  if (!userId || !this.moderation?.bannedUsers) return false;
  
  const ban = this.moderation.bannedUsers.find(
    b => b.user.toString() === userId.toString()
  );
  
  if (!ban) return false;
  
  // Check if ban has expired
  if (ban.expiresAt && new Date() > ban.expiresAt) {
    return false;
  }
  
  return true;
};

// Check if user is muted
sessionSchema.methods.isUserMuted = function (userId) {
  if (!userId || !this.moderation?.mutedUsers) return false;
  
  const mute = this.moderation.mutedUsers.find(
    m => m.user.toString() === userId.toString()
  );
  
  if (!mute) return false;
  
  // Check if mute has expired
  if (mute.expiresAt && new Date() > mute.expiresAt) {
    return false;
  }
  
  return true;
};

// Add participant
sessionSchema.methods.addParticipant = async function (userId, role = 'participant') {
  // Check if already a participant
  const existingParticipant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (existingParticipant) {
    if (existingParticipant.isActive) {
      return { success: false, reason: 'Already a participant' };
    }
    // Rejoin
    existingParticipant.isActive = true;
    existingParticipant.joinedAt = new Date();
    existingParticipant.leftAt = undefined;
    await this.save();
    return { success: true, rejoined: true };
  }
  
  // Check if banned
  if (this.isUserBanned(userId)) {
    return { success: false, reason: 'You are banned from this session' };
  }
  
  // Check max participants
  if (this.maxParticipants && this.participantCount >= this.maxParticipants) {
    return { success: false, reason: 'Session is full' };
  }
  
  this.participants.push({
    user: userId,
    role,
    joinedAt: new Date(),
    isActive: true,
  });
  
  this.stats.totalParticipants = Math.max(
    this.stats.totalParticipants || 0,
    this.participants.length
  );
  
  // Update peak concurrent users
  const activeCount = this.participants.filter(p => p.isActive).length;
  if (activeCount > (this.stats.peakConcurrentUsers || 0)) {
    this.stats.peakConcurrentUsers = activeCount;
  }
  
  await this.save();
  return { success: true, rejoined: false };
};

// Remove participant
sessionSchema.methods.removeParticipant = async function (userId, kickedBy = null, reason = null) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (!participant) {
    return { success: false, reason: 'Not a participant' };
  }
  
  participant.isActive = false;
  participant.leftAt = new Date();
  
  if (kickedBy) {
    participant.kickedAt = new Date();
    participant.kickedBy = kickedBy;
    participant.kickReason = reason;
  }
  
  await this.save();
  return { success: true };
};

// Ban user
sessionSchema.methods.banUser = async function (userId, bannedBy, reason = null, duration = null) {
  if (!this.moderation) {
    this.moderation = { bannedUsers: [], mutedUsers: [] };
  }
  
  // Remove existing ban if any
  this.moderation.bannedUsers = this.moderation.bannedUsers.filter(
    b => b.user.toString() !== userId.toString()
  );
  
  const ban = {
    user: userId,
    bannedAt: new Date(),
    bannedBy,
    reason,
    expiresAt: duration ? new Date(Date.now() + duration) : null,
  };
  
  this.moderation.bannedUsers.push(ban);
  
  // Also remove from active participants
  await this.removeParticipant(userId, bannedBy, reason);
  
  await this.save();
  return { success: true };
};

// Unban user
sessionSchema.methods.unbanUser = async function (userId) {
  if (!this.moderation?.bannedUsers) {
    return { success: false, reason: 'User is not banned' };
  }
  
  const initialLength = this.moderation.bannedUsers.length;
  this.moderation.bannedUsers = this.moderation.bannedUsers.filter(
    b => b.user.toString() !== userId.toString()
  );
  
  if (this.moderation.bannedUsers.length === initialLength) {
    return { success: false, reason: 'User is not banned' };
  }
  
  await this.save();
  return { success: true };
};

// Mute user
sessionSchema.methods.muteUser = async function (userId, mutedBy, duration = null) {
  if (!this.moderation) {
    this.moderation = { bannedUsers: [], mutedUsers: [] };
  }
  
  // Remove existing mute if any
  this.moderation.mutedUsers = this.moderation.mutedUsers.filter(
    m => m.user.toString() !== userId.toString()
  );
  
  const mute = {
    user: userId,
    mutedAt: new Date(),
    mutedBy,
    expiresAt: duration ? new Date(Date.now() + duration) : null,
  };
  
  this.moderation.mutedUsers.push(mute);
  await this.save();
  return { success: true };
};

// Unmute user
sessionSchema.methods.unmuteUser = async function (userId) {
  if (!this.moderation?.mutedUsers) {
    return { success: false, reason: 'User is not muted' };
  }
  
  const initialLength = this.moderation.mutedUsers.length;
  this.moderation.mutedUsers = this.moderation.mutedUsers.filter(
    m => m.user.toString() !== userId.toString()
  );
  
  if (this.moderation.mutedUsers.length === initialLength) {
    return { success: false, reason: 'User is not muted' };
  }
  
  await this.save();
  return { success: true };
};

// Promote participant to moderator
sessionSchema.methods.promoteToModerator = async function (userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (!participant) {
    return { success: false, reason: 'Not a participant' };
  }
  
  if (participant.role === 'host') {
    return { success: false, reason: 'Cannot change host role' };
  }
  
  participant.role = 'moderator';
  await this.save();
  return { success: true };
};

// Demote moderator to participant
sessionSchema.methods.demoteToParticipant = async function (userId) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (!participant) {
    return { success: false, reason: 'Not a participant' };
  }
  
  if (participant.role === 'host') {
    return { success: false, reason: 'Cannot change host role' };
  }
  
  participant.role = 'participant';
  await this.save();
  return { success: true };
};

// Add song to queue
sessionSchema.methods.addSong = async function (songData, addedBy) {
  const song = {
    ...songData,
    addedBy,
    addedAt: new Date(),
    votes: [],
    order: this.songs.length,
  };
  
  this.songs.push(song);
  await this.save();
  
  return this.songs[this.songs.length - 1];
};

// Remove song from queue
sessionSchema.methods.removeSong = async function (songId) {
  const songIndex = this.songs.findIndex(s => s._id.toString() === songId.toString());
  
  if (songIndex === -1) {
    return { success: false, reason: 'Song not found' };
  }
  
  this.songs.splice(songIndex, 1);
  
  // Reorder remaining songs
  this.songs.forEach((song, index) => {
    song.order = index;
  });
  
  // Adjust currentSongIndex if needed
  if (this.currentSongIndex >= songIndex && this.currentSongIndex > 0) {
    this.currentSongIndex--;
  }
  
  await this.save();
  return { success: true };
};

// Vote for song
sessionSchema.methods.voteForSong = async function (songId, userId, weight = 1) {
  const song = this.songs.id(songId);
  
  if (!song) {
    return { success: false, reason: 'Song not found' };
  }
  
  // Check if already voted
  const existingVote = song.votes.find(
    v => v.user.toString() === userId.toString()
  );
  
  if (existingVote) {
    return { success: false, reason: 'Already voted for this song' };
  }
  
  song.votes.push({
    user: userId,
    weight,
    votedAt: new Date(),
  });
  
  this.stats.totalVotes = (this.stats.totalVotes || 0) + 1;
  
  await this.save();
  return { success: true, voteCount: song.votes.length };
};

// Remove vote from song
sessionSchema.methods.removeVoteFromSong = async function (songId, userId) {
  const song = this.songs.id(songId);
  
  if (!song) {
    return { success: false, reason: 'Song not found' };
  }
  
  const voteIndex = song.votes.findIndex(
    v => v.user.toString() === userId.toString()
  );
  
  if (voteIndex === -1) {
    return { success: false, reason: 'Vote not found' };
  }
  
  song.votes.splice(voteIndex, 1);
  this.stats.totalVotes = Math.max((this.stats.totalVotes || 0) - 1, 0);
  
  await this.save();
  return { success: true, voteCount: song.votes.length };
};

// Get songs sorted by votes
sessionSchema.methods.getSongsByVotes = function () {
  return [...this.songs].sort((a, b) => {
    const aVotes = a.votes?.reduce((acc, v) => acc + (v.weight || 1), 0) || 0;
    const bVotes = b.votes?.reduce((acc, v) => acc + (v.weight || 1), 0) || 0;
    return bVotes - aVotes;
  });
};

// Advance to next stage
sessionSchema.methods.advanceStage = async function () {
  const stageMap = {
    'draft': { next: 'waiting', stage: 1 },
    'waiting': { next: 'lyrics-open', stage: 1 },
    'lyrics-open': { next: 'lyrics-voting', stage: 2 },
    'lyrics-voting': { next: 'generation', stage: 3 },
    'generation': { next: 'song-voting', stage: 4 },
    'song-voting': { next: 'completed', stage: 5 },
    'active': { next: 'completed', stage: 5 },
    'paused': { next: this.previousStatus || 'active', stage: this.stage },
  };
  
  const transition = stageMap[this.status];
  if (!transition) {
    throw new Error('Cannot advance from current status');
  }
  
  this.previousStatus = this.status;
  this.status = transition.next;
  this.stage = transition.stage;
  
  // Set timestamps based on stage
  if (this.status === 'waiting' || this.status === 'lyrics-open' || this.status === 'active') {
    this.schedule.actualStart = this.schedule.actualStart || new Date();
    this.startedAt = this.startedAt || new Date();
    this.schedule.lyricsOpenAt = this.schedule.lyricsOpenAt || new Date();
  } else if (this.status === 'lyrics-voting') {
    this.schedule.votingStartAt = new Date();
  } else if (this.status === 'completed') {
    this.schedule.completedAt = new Date();
    this.endedAt = new Date();
  }
  
  await this.save();
  return this;
};

// Submit feedback
sessionSchema.methods.submitFeedback = async function (userId, rating, comment) {
  if (!this.feedback) {
    this.feedback = [];
  }
  
  const existingIndex = this.feedback.findIndex(
    f => f.user.toString() === userId.toString()
  );
  
  if (existingIndex !== -1) {
    // Update existing feedback
    this.feedback[existingIndex].rating = rating;
    this.feedback[existingIndex].comment = comment;
    this.feedback[existingIndex].updatedAt = new Date();
  } else {
    // Add new feedback
    this.feedback.push({
      user: userId,
      rating,
      comment,
      createdAt: new Date(),
    });
  }
  
  await this.save();
  return { success: true };
};

// Get public session data
sessionSchema.methods.toPublicJSON = function (userId = null, userRole = null) {
  const isHost = userId && this.isHost(userId);
  const isAdmin = userRole === 'admin';
  const isModerator = userRole === 'moderator';
  
  const publicData = {
    id: this._id,
    sessionCode: this.sessionCode,
    title: this.title,
    description: this.description,
    host: this.host,
    status: this.status,
    stage: this.stage,
    genre: this.genre,
    mood: this.mood,
    theme: this.theme,
    guidelines: this.guidelines,
    participantCount: this.participantCount,
    maxParticipants: this.maxParticipants,
    stats: this.stats,
    settings: {
      lyricsDeadline: this.settings?.lyricsDeadline,
      votingDeadline: this.settings?.votingDeadline,
      allowAnonymous: this.settings?.allowAnonymous,
      votingSystem: this.settings?.votingSystem,
      showVoteCountsDuringVoting: this.settings?.showVoteCountsDuringVoting,
      allowSongRequests: this.settings?.allowSongRequests,
      votingEnabled: this.settings?.votingEnabled,
      chatEnabled: this.settings?.chatEnabled,
    },
    schedule: this.schedule,
    streamInfo: this.streamInfo,
    tags: this.tags,
    visibility: this.visibility,
    createdAt: this.createdAt,
    startedAt: this.startedAt,
    endedAt: this.endedAt,
    isActive: this.isActive,
    isLive: this.isLive,
    timeRemaining: this.timeRemaining,
    averageRating: this.averageRating,
    songs: this.songs?.map(s => ({
      _id: s._id,
      title: s.title,
      artist: s.artist,
      duration: s.duration,
      imageUrl: s.imageUrl,
      voteCount: s.votes?.length || 0,
      addedBy: s.addedBy,
      isPlaying: s.isPlaying,
    })),
  };
  
  // Add user permissions if authenticated
  if (userId) {
    publicData.userPermissions = {
      canEdit: isHost || isAdmin || isModerator,
      canDelete: isHost || isAdmin,
      canStart: isHost || isAdmin || isModerator,
      canEnd: isHost || isAdmin || isModerator,
      canPause: isHost || isAdmin || isModerator,
      canAdvance: isHost || isAdmin || isModerator,
      canKick: isHost || isAdmin || isModerator,
      canBan: isHost || isAdmin || isModerator,
      canAddSong: this.canAddSong(userId, userRole).allowed,
      canRemoveSong: isHost || isAdmin || isModerator,
      canVote: this.canVote(userId).allowed,
      canSubmitFeedback: true,
      isHost,
      isParticipant: this.isParticipant(userId),
      isModerator: this.isSessionModerator(userId),
    };
  }
  
  return publicData;
};

// =============================================
// STATIC METHODS
// =============================================

// Find active sessions
sessionSchema.statics.findActiveSessions = function (options = {}) {
  const { limit = 20, genre, visibility = 'public' } = options;
  
  const query = {
    status: { $in: ['lyrics-open', 'lyrics-voting', 'generation', 'song-voting', 'active', 'waiting'] },
    visibility,
  };
  
  if (genre) {
    query.genre = genre;
  }
  
  return this.find(query)
    .populate('host', 'username displayName avatar reputation.level')
    .sort({ 'stats.totalParticipants': -1, createdAt: -1 })
    .limit(limit);
};

// Find sessions by host
sessionSchema.statics.findByHost = function (hostId, options = {}) {
  const { status, limit = 20, skip = 0 } = options;
  
  const query = { host: hostId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Find session by code
sessionSchema.statics.findByCode = function (code) {
  return this.findOne({ sessionCode: code.toUpperCase() })
    .populate('host', 'username displayName avatar reputation.level role');
};

// Get session statistics for admin
sessionSchema.statics.getAdminStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalParticipants: { $sum: '$stats.totalParticipants' },
      },
    },
  ]);
  
  const byGenre = await this.aggregate([
    {
      $group: {
        _id: '$genre',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);
  
  return { byStatus: stats, byGenre };
};

// =============================================
// ENSURE VIRTUALS IN JSON
// =============================================

songSchema.set('toJSON', { virtuals: true });
songSchema.set('toObject', { virtuals: true });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;