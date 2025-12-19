const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  startTime: { type: Number, required: true }, // seconds
  endTime: { type: Number, required: true },
  type: { 
    type: String, 
    enum: ['intro', 'verse', 'pre-chorus', 'chorus', 'bridge', 'hook', 'outro', 'instrumental'],
  },
  lyricsText: { type: String }, // Lyrics for this section
  contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who wrote this section
}, { _id: false });

const contributorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contributionType: {
    type: String,
    enum: [
      'lyrics', 'melody-stem', 'drum-stem', 'bass-stem', 'vocal-stem', 
      'synth-stem', 'guitar-stem', 'piano-stem', 'production', 
      'vocal', 'concept', 'vote', 'mixing', 'mastering', 'host'
    ],
    required: true,
  },
  percentage: { type: Number, min: 0, max: 100, default: 0 }, // Ownership percentage
  attribution: { type: String }, // Display text like "Lyrics by @username"
  acceptedAt: { type: Date, default: Date.now },
  addedAt: { type: Date, default: Date.now },
}, { _id: false });

const stemReferenceSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['drums', 'bass', 'melody', 'vocals', 'synth', 'guitar', 'piano', 'other'],
  },
  url: { type: String, required: true },
  contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const ownershipDistributionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shares: { type: Number, required: true, min: 0 },
  percentage: { type: Number, min: 0, max: 100 }, // Calculated from shares/totalShares
}, { _id: false });

const songSchema = new mongoose.Schema(
  {
    // References
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session is required'],
    },
    lyrics: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LyricsSubmission',
      required: [true, 'Lyrics reference is required'],
    },
    
    // Basic Info
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    versionLabel: {
      type: String,
      enum: ['A', 'B', 'C', 'D', 'E'],
    },
    
    // Audio
    audioUrl: { type: String },
    waveformData: [{ type: Number }],
    duration: { type: Number }, // seconds
    coverArt: { type: String },
    
    // Generation Parameters
    generationParams: {
      genre: { type: String },
      mood: [{ type: String }],
      tempo: { type: Number, min: 40, max: 220 },
      key: { type: String },
      vocalStyle: {
        type: String,
        enum: ['male', 'female', 'duet', 'instrumental', 'ai-voice'],
      },
      instruments: [{ type: String }],
      style: { type: String, maxlength: 500 },
      referenceTrack: { type: String },
    },
    
    // AI Info
    aiModel: { type: String },
    generationPrompt: { type: String },
    generationJobId: { type: mongoose.Schema.Types.ObjectId, ref: 'GenerationJob' },
    
    // Human Inputs
    humanInputs: {
      stems: [stemReferenceSchema],
      abletonProject: { type: String },
      additionalFiles: [{ type: String }],
      instructions: { type: String, maxlength: 1000 },
    },
    
    // Song Structure
    sections: [sectionSchema],
    
    // Status - Extended
    status: {
      type: String,
      enum: ['generating', 'ready', 'selected', 'rejected', 'published', 'archived'],
      default: 'generating',
    },
    
    // Voting
    votes: { type: Number, default: 0 },
    weightedVoteScore: { type: Number, default: 0 },
    voterIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Contributors with detailed attribution
    contributors: [contributorSchema],
    
    // Ownership tracking
    ownership: {
      totalShares: { type: Number, default: 10000 }, // Granularity for ownership
      distribution: [ownershipDistributionSchema],
      transferable: { type: Boolean, default: false },
      tokenized: { type: Boolean, default: false },
      contractAddress: { type: String }, // If tokenized on blockchain
    },
    
    // Revenue tracking
    revenue: {
      totalPlays: { type: Number, default: 0 },
      totalLikes: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 }, // In cents/smallest currency unit
      lastCalculated: { type: Date },
    },
    
    // Metadata for publishing
    metadata: {
      isrc: { type: String }, // International Standard Recording Code
      upc: { type: String }, // Universal Product Code
      releaseDate: { type: Date },
      recordLabel: { type: String, default: 'CrowdBeat' },
      copyright: { type: String },
      explicit: { type: Boolean, default: false },
      language: { type: String, default: 'en' },
      tags: [{ type: String }],
    },
    
    // Engagement
    plays: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Feature flags
    featured: { type: Boolean, default: false },
    featuredAt: { type: Date },
    downloadEnabled: { type: Boolean, default: true },
    commentsEnabled: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
songSchema.index({ session: 1, version: 1 });
songSchema.index({ session: 1, votes: -1 });
songSchema.index({ session: 1, status: 1 });
songSchema.index({ status: 1, createdAt: -1 });
songSchema.index({ status: 1, plays: -1 }); // For trending
songSchema.index({ status: 1, likes: -1 }); // For popular
songSchema.index({ featured: 1, featuredAt: -1 }); // For featured songs
songSchema.index({ 'generationParams.genre': 1, status: 1 }); // For genre filter
songSchema.index({ 'contributors.user': 1 }); // For user's songs
songSchema.index({ 'ownership.distribution.user': 1 }); // For ownership queries
songSchema.index({ title: 'text', 'metadata.tags': 'text' }); // Text search

// Virtual for vote count
songSchema.virtual('voteCount').get(function () {
  return this.voterIds?.length || this.votes || 0;
});

// Virtual to calculate ownership percentage from shares
songSchema.virtual('ownershipPercentages').get(function () {
  if (!this.ownership?.distribution?.length) return [];
  const totalShares = this.ownership.totalShares || 10000;
  return this.ownership.distribution.map(d => ({
    user: d.user,
    shares: d.shares,
    percentage: ((d.shares / totalShares) * 100).toFixed(2),
  }));
});

// Pre-save hook to calculate ownership percentages
songSchema.pre('save', function(next) {
  if (this.ownership?.distribution?.length && this.ownership.totalShares) {
    this.ownership.distribution = this.ownership.distribution.map(d => ({
      ...d.toObject ? d.toObject() : d,
      percentage: (d.shares / this.ownership.totalShares) * 100,
    }));
  }
  next();
});

// Method: Check if user has voted
songSchema.methods.hasVoted = function (userId) {
  return this.voterIds.some(id => id.toString() === userId.toString());
};

// Method: Add vote
songSchema.methods.addVote = async function (userId, weight = 1) {
  if (this.hasVoted(userId)) {
    throw new Error('User has already voted on this song');
  }
  
  this.voterIds.push(userId);
  this.votes += 1;
  this.weightedVoteScore += weight;
  
  await this.save();
  return this;
};

// Method: Remove vote
songSchema.methods.removeVote = async function (userId, weight = 1) {
  if (!this.hasVoted(userId)) {
    throw new Error('User has not voted on this song');
  }
  
  this.voterIds = this.voterIds.filter(id => id.toString() !== userId.toString());
  this.votes = Math.max(0, this.votes - 1);
  this.weightedVoteScore = Math.max(0, this.weightedVoteScore - weight);
  
  await this.save();
  return this;
};

// Method: Add play
songSchema.methods.recordPlay = async function () {
  this.plays += 1;
  this.revenue.totalPlays = (this.revenue.totalPlays || 0) + 1;
  await this.save();
  return this;
};

// Method: Toggle like
songSchema.methods.toggleLike = async function (userId) {
  const isLiked = this.likedBy.some(id => id.toString() === userId.toString());
  
  if (isLiked) {
    this.likedBy = this.likedBy.filter(id => id.toString() !== userId.toString());
    this.likes = Math.max(0, this.likes - 1);
    this.revenue.totalLikes = Math.max(0, (this.revenue.totalLikes || 0) - 1);
  } else {
    this.likedBy.push(userId);
    this.likes += 1;
    this.revenue.totalLikes = (this.revenue.totalLikes || 0) + 1;
  }
  
  await this.save();
  return !isLiked; // Returns new like state
};

// Method: Check if user has ownership
songSchema.methods.hasOwnership = function (userId) {
  return this.ownership?.distribution?.some(
    d => d.user.toString() === userId.toString()
  );
};

// Method: Get user's ownership percentage
songSchema.methods.getUserOwnership = function (userId) {
  const ownership = this.ownership?.distribution?.find(
    d => d.user.toString() === userId.toString()
  );
  if (!ownership) return 0;
  return ownership.percentage || (ownership.shares / this.ownership.totalShares) * 100;
};

// Method: Get public data
songSchema.methods.toPublicJSON = function (userId = null) {
  return {
    id: this._id,
    session: this.session,
    lyrics: this.lyrics,
    title: this.title,
    description: this.description,
    version: this.version,
    versionLabel: this.versionLabel,
    audioUrl: this.audioUrl,
    waveformData: this.waveformData,
    duration: this.duration,
    coverArt: this.coverArt,
    generationParams: this.generationParams,
    sections: this.sections,
    status: this.status,
    votes: this.votes,
    weightedVoteScore: this.weightedVoteScore,
    hasVoted: userId ? this.hasVoted(userId) : false,
    contributors: this.contributors,
    ownership: this.ownership,
    metadata: this.metadata,
    plays: this.plays,
    likes: this.likes,
    isLiked: userId ? this.likedBy.some(id => id.toString() === userId.toString()) : false,
    featured: this.featured,
    downloadEnabled: this.downloadEnabled,
    createdAt: this.createdAt,
  };
};

// Method: Get full details for song page
songSchema.methods.toDetailedJSON = function (userId = null) {
  return {
    ...this.toPublicJSON(userId),
    revenue: userId && this.hasOwnership(userId) ? {
      totalPlays: this.revenue.totalPlays,
      totalLikes: this.revenue.totalLikes,
      userOwnership: this.getUserOwnership(userId),
    } : undefined,
    humanInputs: this.humanInputs,
    aiModel: this.aiModel,
    commentsEnabled: this.commentsEnabled,
  };
};

// Static: Get ranked songs for session
songSchema.statics.getRankedSongs = async function (sessionId) {
  return this.find({
    session: sessionId,
    status: { $in: ['ready', 'selected', 'published'] },
  })
    .populate('lyrics', 'content.title author')
    .sort({ weightedVoteScore: -1, votes: -1 })
    .lean();
};

// Static: Get published library songs
songSchema.statics.getLibrary = async function (options = {}) {
  const {
    page = 1,
    limit = 20,
    genre,
    mood,
    sortBy = 'newest',
    search,
  } = options;

  const query = { status: 'published' };
  
  if (genre) query['generationParams.genre'] = genre;
  if (mood) query['generationParams.mood'] = { $in: Array.isArray(mood) ? mood : [mood] };
  if (search) {
    query.$text = { $search: search };
  }

  let sortOption = {};
  switch (sortBy) {
    case 'popular':
      sortOption = { plays: -1 };
      break;
    case 'likes':
      sortOption = { likes: -1 };
      break;
    case 'trending':
      sortOption = { plays: -1, createdAt: -1 };
      break;
    case 'newest':
    default:
      sortOption = { createdAt: -1 };
  }

  const skip = (page - 1) * limit;
  
  const [songs, total] = await Promise.all([
    this.find(query)
      .populate('contributors.user', 'username displayName avatar')
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    songs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// Static: Get featured songs
songSchema.statics.getFeatured = async function (limit = 10) {
  return this.find({ status: 'published', featured: true })
    .populate('contributors.user', 'username displayName avatar')
    .sort({ featuredAt: -1 })
    .limit(limit)
    .lean();
};

// Static: Get trending songs
songSchema.statics.getTrending = async function (limit = 20, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return this.find({
    status: 'published',
    updatedAt: { $gte: since },
  })
    .populate('contributors.user', 'username displayName avatar')
    .sort({ plays: -1, likes: -1 })
    .limit(limit)
    .lean();
};

// Static: Get user's contributed songs
songSchema.statics.getUserContributions = async function (userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const query = { 'contributors.user': userId };

  const [songs, total] = await Promise.all([
    this.find(query)
      .populate('contributors.user', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);

  return { songs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

// Static: Get user's owned songs
songSchema.statics.getUserOwnedSongs = async function (userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;

  const query = { 'ownership.distribution.user': userId };

  const [songs, total] = await Promise.all([
    this.find(query)
      .populate('contributors.user', 'username displayName avatar')
      .populate('ownership.distribution.user', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query),
  ]);

  return { songs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

const Song = mongoose.model('Song', songSchema);

module.exports = Song;
