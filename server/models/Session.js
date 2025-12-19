const mongoose = require('mongoose');

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
    
    // Status & Stage
    status: {
      type: String,
      enum: ['draft', 'lyrics-open', 'lyrics-voting', 'generation', 'song-voting', 'completed', 'cancelled'],
      default: 'draft',
    },
    stage: {
      type: Number,
      min: 1,
      max: 5,
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
      enum: ['happy', 'sad', 'energetic', 'chill', 'angry', 'romantic', 'inspirational', 'dark', 'uplifting', 'melancholic'],
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
    
    // Participation
    currentRound: {
      type: Number,
      default: 1,
    },
    maxParticipants: {
      type: Number,
      default: null, // null = unlimited
    },
    participants: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      joinedAt: { type: Date, default: Date.now },
      role: { type: String, enum: ['participant', 'moderator', 'host'], default: 'participant' },
    }],
    
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
    },
    
    // Stats
    stats: {
      totalParticipants: { type: Number, default: 0 },
      totalSubmissions: { type: Number, default: 0 },
      totalVotes: { type: Number, default: 0 },
      peakConcurrentUsers: { type: Number, default: 0 },
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
    },
    
    // Schedule
    schedule: {
      scheduledStart: { type: Date },
      actualStart: { type: Date },
      estimatedDuration: { type: Number }, // in minutes
      lyricsOpenAt: { type: Date },
      votingStartAt: { type: Date },
      completedAt: { type: Date },
    },
    
    // Stream Info
    streamInfo: {
      platform: { type: String, enum: ['youtube', 'twitch', 'discord', 'internal'] },
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
    inviteCode: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
sessionSchema.index({ status: 1, 'schedule.scheduledStart': -1 });
sessionSchema.index({ host: 1, status: 1 });
sessionSchema.index({ genre: 1, status: 1 });
sessionSchema.index({ createdAt: -1 });
sessionSchema.index({ 'participants.user': 1 });

// Virtual for checking if session is active
sessionSchema.virtual('isActive').get(function () {
  return ['lyrics-open', 'lyrics-voting', 'generation', 'song-voting'].includes(this.status);
});

// Virtual for participant count
sessionSchema.virtual('participantCount').get(function () {
  return this.participants?.length || 0;
});

// Virtual for time remaining in current stage
sessionSchema.virtual('timeRemaining').get(function () {
  let deadline;
  if (this.status === 'lyrics-open') {
    deadline = this.settings?.lyricsDeadline;
  } else if (this.status === 'lyrics-voting') {
    deadline = this.settings?.votingDeadline;
  }
  
  if (!deadline) return null;
  
  const now = new Date();
  const remaining = new Date(deadline) - now;
  return remaining > 0 ? remaining : 0;
});

// Method: Check if user is participant
sessionSchema.methods.isParticipant = function (userId) {
  return this.participants.some(p => p.user.toString() === userId.toString());
};

// Method: Check if user is host
sessionSchema.methods.isHost = function (userId) {
  return this.host.toString() === userId.toString();
};

// Method: Check if user can submit lyrics
sessionSchema.methods.canSubmitLyrics = function (userId, userReputation = 0) {
  if (this.status !== 'lyrics-open') return { allowed: false, reason: 'Lyrics submission is closed' };
  if (this.settings.lyricsDeadline && new Date() > this.settings.lyricsDeadline) {
    return { allowed: false, reason: 'Submission deadline has passed' };
  }
  if (userReputation < this.settings.minReputationToSubmit) {
    return { allowed: false, reason: `Minimum reputation of ${this.settings.minReputationToSubmit} required` };
  }
  return { allowed: true };
};

// Method: Check if user can vote
sessionSchema.methods.canVote = function (userId) {
  if (this.status !== 'lyrics-voting' && this.status !== 'song-voting') {
    return { allowed: false, reason: 'Voting is not open' };
  }
  if (this.settings.votingDeadline && new Date() > this.settings.votingDeadline) {
    return { allowed: false, reason: 'Voting deadline has passed' };
  }
  return { allowed: true };
};

// Method: Add participant
sessionSchema.methods.addParticipant = async function (userId, role = 'participant') {
  if (this.isParticipant(userId)) return false;
  
  if (this.maxParticipants && this.participants.length >= this.maxParticipants) {
    throw new Error('Session is full');
  }
  
  this.participants.push({ user: userId, role });
  this.stats.totalParticipants = this.participants.length;
  await this.save();
  return true;
};

// Method: Advance to next stage
sessionSchema.methods.advanceStage = async function () {
  const stageMap = {
    'draft': { next: 'lyrics-open', stage: 1 },
    'lyrics-open': { next: 'lyrics-voting', stage: 2 },
    'lyrics-voting': { next: 'generation', stage: 3 },
    'generation': { next: 'song-voting', stage: 4 },
    'song-voting': { next: 'completed', stage: 5 },
  };
  
  const transition = stageMap[this.status];
  if (!transition) {
    throw new Error('Cannot advance from current status');
  }
  
  this.status = transition.next;
  this.stage = transition.stage;
  
  // Set timestamps based on stage
  if (this.status === 'lyrics-open') {
    this.schedule.lyricsOpenAt = new Date();
    this.schedule.actualStart = this.schedule.actualStart || new Date();
  } else if (this.status === 'lyrics-voting') {
    this.schedule.votingStartAt = new Date();
  } else if (this.status === 'completed') {
    this.schedule.completedAt = new Date();
  }
  
  await this.save();
  return this;
};

// Method: Get public session data
sessionSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
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
    stats: this.stats,
    settings: {
      lyricsDeadline: this.settings.lyricsDeadline,
      votingDeadline: this.settings.votingDeadline,
      allowAnonymous: this.settings.allowAnonymous,
      votingSystem: this.settings.votingSystem,
      showVoteCountsDuringVoting: this.settings.showVoteCountsDuringVoting,
    },
    schedule: this.schedule,
    streamInfo: this.streamInfo,
    tags: this.tags,
    createdAt: this.createdAt,
    isActive: this.isActive,
    timeRemaining: this.timeRemaining,
  };
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
