const mongoose = require('mongoose');

const stemUploadSchema = new mongoose.Schema(
  {
    // References
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session is required'],
    },
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song',
    },
    contributor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Contributor is required'],
    },
    
    // Stem Info
    type: {
      type: String,
      enum: ['drums', 'bass', 'melody', 'vocals', 'synth', 'guitar', 'piano', 'other'],
      required: [true, 'Stem type is required'],
    },
    audioUrl: {
      type: String,
      required: [true, 'Audio URL is required'],
    },
    filename: { type: String },
    fileSize: { type: Number }, // bytes
    format: { type: String }, // wav, mp3, etc.
    
    // Audio Properties
    duration: { type: Number }, // seconds
    bpm: { type: Number, min: 40, max: 220 },
    key: { type: String },
    waveformData: [{ type: Number }],
    
    // Metadata
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    
    // Status
    status: {
      type: String,
      enum: ['pending', 'approved', 'used', 'rejected'],
      default: 'pending',
    },
    
    // Voting
    votes: { type: Number, default: 0 },
    voterIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Usage tracking
    usedIn: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    
    // Moderation
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: { type: Date },
    moderationNote: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
stemUploadSchema.index({ session: 1, type: 1 });
stemUploadSchema.index({ session: 1, status: 1 });
stemUploadSchema.index({ contributor: 1, session: 1 });
stemUploadSchema.index({ song: 1 });

// Virtual for vote count
stemUploadSchema.virtual('voteCount').get(function () {
  return this.voterIds?.length || this.votes || 0;
});

// Method: Check if user has voted
stemUploadSchema.methods.hasVoted = function (userId) {
  return this.voterIds.some(id => id.toString() === userId.toString());
};

// Method: Add vote
stemUploadSchema.methods.addVote = async function (userId) {
  if (this.hasVoted(userId)) {
    throw new Error('User has already voted on this stem');
  }
  
  this.voterIds.push(userId);
  this.votes += 1;
  
  await this.save();
  return this;
};

// Method: Remove vote
stemUploadSchema.methods.removeVote = async function (userId) {
  if (!this.hasVoted(userId)) {
    throw new Error('User has not voted on this stem');
  }
  
  this.voterIds = this.voterIds.filter(id => id.toString() !== userId.toString());
  this.votes = Math.max(0, this.votes - 1);
  
  await this.save();
  return this;
};

// Method: Mark as used in song
stemUploadSchema.methods.markUsedIn = async function (songId) {
  if (!this.usedIn.includes(songId)) {
    this.usedIn.push(songId);
    this.status = 'used';
    await this.save();
  }
  return this;
};

// Method: Approve stem
stemUploadSchema.methods.approve = async function (moderatorId) {
  this.status = 'approved';
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  await this.save();
  return this;
};

// Method: Reject stem
stemUploadSchema.methods.reject = async function (moderatorId, note) {
  this.status = 'rejected';
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  this.moderationNote = note;
  await this.save();
  return this;
};

// Method: Get public data
stemUploadSchema.methods.toPublicJSON = function (userId = null) {
  return {
    id: this._id,
    session: this.session,
    song: this.song,
    contributor: this.contributor,
    type: this.type,
    audioUrl: this.audioUrl,
    filename: this.filename,
    duration: this.duration,
    bpm: this.bpm,
    key: this.key,
    waveformData: this.waveformData,
    description: this.description,
    status: this.status,
    votes: this.votes,
    hasVoted: userId ? this.hasVoted(userId) : false,
    usedIn: this.usedIn,
    createdAt: this.createdAt,
  };
};

// Static: Get stems by type for session
stemUploadSchema.statics.getStemsByType = async function (sessionId) {
  const stems = await this.find({ 
    session: sessionId,
    status: { $in: ['pending', 'approved', 'used'] },
  })
    .populate('contributor', 'username displayName avatar')
    .sort({ votes: -1, createdAt: -1 })
    .lean();

  // Group by type
  const grouped = {};
  for (const stem of stems) {
    if (!grouped[stem.type]) {
      grouped[stem.type] = [];
    }
    grouped[stem.type].push(stem);
  }
  
  return grouped;
};

const StemUpload = mongoose.model('StemUpload', stemUploadSchema);

module.exports = StemUpload;

