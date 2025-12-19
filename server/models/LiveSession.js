const mongoose = require('mongoose');
const crypto = require('crypto');

// Encryption helpers for stream key
const algorithm = 'aes-256-cbc';
const secretKey = process.env.STREAM_KEY_SECRET || crypto.randomBytes(32).toString('hex').slice(0, 32);

const encrypt = (text) => {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
  if (!text) return null;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return null;
  }
};

const votingRoundSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  type: { 
    type: String, 
    enum: ['lyrics', 'song', 'element', 'poll', 'a-b-test'],
    required: true 
  },
  question: { type: String },
  options: [{
    id: String,
    label: String,
    value: mongoose.Schema.Types.Mixed,
    votes: { type: Number, default: 0 },
  }],
  voters: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  status: { 
    type: String, 
    enum: ['pending', 'active', 'ended'],
    default: 'pending'
  },
  startedAt: Date,
  endedAt: Date,
  duration: { type: Number, default: 30 }, // seconds
  winner: String,
}, { _id: false });

const highlightSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  type: { 
    type: String, 
    enum: ['milestone', 'reaction-burst', 'vote-result', 'lyrics-selected', 'song-generated', 'custom'],
  },
  description: String,
}, { _id: false });

const liveSessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    host: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    coHosts: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    }],
    // Link to main Session (for music creation workflow)
    linkedSession: {
      type: mongoose.Schema.ObjectId,
      ref: 'Session',
    },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'paused', 'ended'],
      default: 'scheduled',
    },
    scheduledStart: {
      type: Date,
    },
    actualStart: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    thumbnail: {
      type: String,
    },
    streamConfig: {
      platform: {
        type: String,
        enum: ['twitch', 'youtube', 'custom', 'none'],
        default: 'none',
      },
      streamUrl: String,
      streamKey: String, // Encrypted
      overlayUrl: String,
      chatEnabled: { type: Boolean, default: true },
      slowModeSeconds: { type: Number, default: 0 },
    },
    currentActivity: {
      type: {
        type: String,
        enum: ['lyrics-submission', 'voting', 'generation', 'feedback', 'break', 'none'],
        default: 'none',
      },
      data: mongoose.Schema.Types.Mixed,
      startedAt: Date,
    },
    engagement: {
      currentViewers: { type: Number, default: 0 },
      peakViewers: { type: Number, default: 0 },
      totalUniqueViewers: { type: Number, default: 0 },
      chatMessages: { type: Number, default: 0 },
      reactions: {
        fire: { type: Number, default: 0 },
        heart: { type: Number, default: 0 },
        clap: { type: Number, default: 0 },
        mindblown: { type: Number, default: 0 },
        rocket: { type: Number, default: 0 },
        hundred: { type: Number, default: 0 },
      },
      hypeLevel: { type: Number, default: 0, min: 0, max: 100 },
    },
    votingRounds: [votingRoundSchema],
    highlights: [highlightSchema],
    recording: {
      enabled: { type: Boolean, default: false },
      url: String,
      duration: Number, // seconds
    },
    tags: [String],
    category: {
      type: String,
      enum: ['music-creation', 'remix', 'live-performance', 'qa', 'tutorial', 'other'],
      default: 'music-creation',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
liveSessionSchema.index({ status: 1, scheduledStart: 1 });
liveSessionSchema.index({ host: 1, status: 1 });
liveSessionSchema.index({ status: 1, 'engagement.currentViewers': -1 });
liveSessionSchema.index({ createdAt: -1 });

// Virtual for duration
liveSessionSchema.virtual('duration').get(function() {
  if (this.actualStart) {
    const end = this.endedAt || new Date();
    return Math.floor((end - this.actualStart) / 1000);
  }
  return 0;
});

// Virtual for isLive
liveSessionSchema.virtual('isLive').get(function() {
  return this.status === 'live';
});

// Encrypt stream key before save
liveSessionSchema.pre('save', function(next) {
  if (this.isModified('streamConfig.streamKey') && this.streamConfig.streamKey) {
    // Only encrypt if not already encrypted
    if (!this.streamConfig.streamKey.includes(':')) {
      this.streamConfig.streamKey = encrypt(this.streamConfig.streamKey);
    }
  }
  next();
});

// Method to get decrypted stream key (host only)
liveSessionSchema.methods.getStreamKey = function() {
  return decrypt(this.streamConfig.streamKey);
};

// Method to check if user is host or co-host
liveSessionSchema.methods.isHostOrCoHost = function(userId) {
  const userIdStr = userId.toString();
  return this.host.toString() === userIdStr || 
         this.coHosts.some(ch => ch.toString() === userIdStr);
};

// Method to go live
liveSessionSchema.methods.goLive = async function() {
  this.status = 'live';
  this.actualStart = new Date();
  await this.save();
  return this;
};

// Method to end stream
liveSessionSchema.methods.endStream = async function() {
  this.status = 'ended';
  this.endedAt = new Date();
  await this.save();
  return this;
};

// Method to pause stream
liveSessionSchema.methods.pauseStream = async function() {
  this.status = 'paused';
  await this.save();
  return this;
};

// Method to resume stream
liveSessionSchema.methods.resumeStream = async function() {
  this.status = 'live';
  await this.save();
  return this;
};

// Method to update hype level
liveSessionSchema.methods.updateHype = async function(newLevel) {
  this.engagement.hypeLevel = Math.min(100, Math.max(0, newLevel));
  await this.save();
  return this.engagement.hypeLevel;
};

// Method to update viewer count
liveSessionSchema.methods.updateViewers = async function(count) {
  this.engagement.currentViewers = count;
  if (count > this.engagement.peakViewers) {
    this.engagement.peakViewers = count;
  }
  await this.save();
  return this;
};

// Method to increment reaction
liveSessionSchema.methods.addReaction = async function(type) {
  if (this.engagement.reactions[type] !== undefined) {
    this.engagement.reactions[type]++;
    await this.save();
  }
  return this.engagement.reactions;
};

// Method to start voting round
liveSessionSchema.methods.startVotingRound = async function(roundData) {
  const roundNumber = this.votingRounds.length + 1;
  const newRound = {
    roundNumber,
    ...roundData,
    status: 'active',
    startedAt: new Date(),
  };
  this.votingRounds.push(newRound);
  await this.save();
  return newRound;
};

// Method to end current voting round
liveSessionSchema.methods.endCurrentVotingRound = async function() {
  const activeRound = this.votingRounds.find(r => r.status === 'active');
  if (activeRound) {
    activeRound.status = 'ended';
    activeRound.endedAt = new Date();
    // Determine winner
    if (activeRound.options.length > 0) {
      const winner = activeRound.options.reduce((a, b) => a.votes > b.votes ? a : b);
      activeRound.winner = winner.id;
    }
    await this.save();
  }
  return activeRound;
};

// Method to add highlight
liveSessionSchema.methods.addHighlight = async function(type, description) {
  this.highlights.push({ type, description, timestamp: new Date() });
  await this.save();
  return this.highlights[this.highlights.length - 1];
};

// Static method to get live sessions
liveSessionSchema.statics.getLive = function() {
  return this.find({ status: 'live' })
    .populate('host', 'username displayName avatar')
    .sort('-engagement.currentViewers');
};

// Static method to get upcoming sessions
liveSessionSchema.statics.getUpcoming = function(limit = 10) {
  return this.find({ 
    status: 'scheduled', 
    scheduledStart: { $gte: new Date() } 
  })
    .populate('host', 'username displayName avatar')
    .sort('scheduledStart')
    .limit(limit);
};

// Static method to get past sessions
liveSessionSchema.statics.getPast = function(limit = 20) {
  return this.find({ status: 'ended' })
    .populate('host', 'username displayName avatar')
    .sort('-endedAt')
    .limit(limit);
};

module.exports = mongoose.model('LiveSession', liveSessionSchema);

