const mongoose = require('mongoose');

const elementOptionSchema = new mongoose.Schema(
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
    
    // Element identification
    elementType: {
      type: String,
      enum: [
        // Tempo/Key elements
        'bpm', 'tempo', 'key',
        // Drum elements
        'hihat', 'kick', 'snare', 'drums',
        // Melodic elements
        'bass', 'melody', 'vocals', 'synth', 'pad', 'lead',
        // Song structure sections
        'intro', 'verse', 'pre-chorus', 'chorus', 'bridge', 'hook', 'outro',
        // Overall
        'overall', 'mix', 'master', 'arrangement',
        // Effects
        'reverb', 'delay', 'compression',
      ],
      required: [true, 'Element type is required'],
    },
    optionId: {
      type: String,
      required: [true, 'Option ID is required'],
    },
    
    // Option details
    label: {
      type: String,
      required: [true, 'Label is required'],
      maxlength: [100, 'Label cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    audioUrl: {
      type: String, // For audio elements (drums, melody, etc.)
    },
    waveformData: [{
      type: Number,
    }],
    imageUrl: {
      type: String, // For visual representations
    },
    value: {
      type: mongoose.Schema.Types.Mixed, // The actual value: BPM number, pattern name, etc.
      required: [true, 'Value is required'],
    },
    
    // Metadata for audio elements
    metadata: {
      bpm: { type: Number },
      key: { type: String },
      duration: { type: Number },
      startTime: { type: Number }, // For section options
      endTime: { type: Number },
    },
    
    // Voting
    votes: {
      type: Number,
      default: 0,
    },
    weightedVotes: {
      type: Number,
      default: 0,
    },
    voterIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    
    // Status
    status: {
      type: String,
      enum: ['pending', 'selected', 'rejected', 'alternative'],
      default: 'pending',
    },
    
    // Creator (for user-submitted options)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isUserSubmitted: {
      type: Boolean,
      default: false,
    },
    
    // Display order
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
elementOptionSchema.index({ session: 1, elementType: 1, status: 1 });
elementOptionSchema.index({ session: 1, song: 1, elementType: 1 });
elementOptionSchema.index({ session: 1, optionId: 1 }, { unique: true });
elementOptionSchema.index({ votes: -1 });

// Virtual for vote percentage (requires total votes context)
elementOptionSchema.virtual('voteCount').get(function () {
  return this.voterIds?.length || this.votes || 0;
});

// Method: Check if user has voted
elementOptionSchema.methods.hasVoted = function (userId) {
  return this.voterIds.some(id => id.toString() === userId.toString());
};

// Method: Add vote
elementOptionSchema.methods.addVote = async function (userId, weight = 1) {
  if (this.hasVoted(userId)) {
    throw new Error('User has already voted on this option');
  }
  
  this.voterIds.push(userId);
  this.votes += 1;
  this.weightedVotes += weight;
  
  await this.save();
  return this;
};

// Method: Remove vote
elementOptionSchema.methods.removeVote = async function (userId, weight = 1) {
  if (!this.hasVoted(userId)) {
    throw new Error('User has not voted on this option');
  }
  
  this.voterIds = this.voterIds.filter(id => id.toString() !== userId.toString());
  this.votes = Math.max(0, this.votes - 1);
  this.weightedVotes = Math.max(0, this.weightedVotes - weight);
  
  await this.save();
  return this;
};

// Method: Get public data
elementOptionSchema.methods.toPublicJSON = function (userId = null) {
  return {
    id: this._id,
    optionId: this.optionId,
    session: this.session,
    song: this.song,
    elementType: this.elementType,
    label: this.label,
    description: this.description,
    audioUrl: this.audioUrl,
    waveformData: this.waveformData,
    imageUrl: this.imageUrl,
    value: this.value,
    metadata: this.metadata,
    votes: this.votes,
    weightedVotes: this.weightedVotes,
    voteCount: this.voteCount,
    hasVoted: userId ? this.hasVoted(userId) : false,
    status: this.status,
    isUserSubmitted: this.isUserSubmitted,
    createdBy: this.createdBy,
    order: this.order,
    createdAt: this.createdAt,
  };
};

// Static: Get options grouped by type for a session
elementOptionSchema.statics.getGroupedOptions = async function (sessionId, songId = null) {
  const query = { session: sessionId };
  if (songId) query.song = songId;
  
  const options = await this.find(query)
    .populate('createdBy', 'username displayName avatar')
    .sort({ elementType: 1, order: 1, votes: -1 })
    .lean();

  // Group by element type
  const grouped = {};
  for (const option of options) {
    if (!grouped[option.elementType]) {
      grouped[option.elementType] = {
        type: option.elementType,
        options: [],
        totalVotes: 0,
      };
    }
    grouped[option.elementType].options.push(option);
    grouped[option.elementType].totalVotes += option.votes;
  }

  // Calculate percentages
  for (const type of Object.keys(grouped)) {
    const total = grouped[type].totalVotes;
    grouped[type].options = grouped[type].options.map(opt => ({
      ...opt,
      percentage: total > 0 ? Math.round((opt.votes / total) * 100) : 0,
    }));
  }

  return grouped;
};

// Static: Get winning option for each element type
elementOptionSchema.statics.getWinningOptions = async function (sessionId) {
  const options = await this.aggregate([
    { $match: { session: new mongoose.Types.ObjectId(sessionId) } },
    { $sort: { weightedVotes: -1, votes: -1 } },
    {
      $group: {
        _id: '$elementType',
        winner: { $first: '$$ROOT' },
      },
    },
  ]);

  const winners = {};
  for (const opt of options) {
    winners[opt._id] = opt.winner;
  }

  return winners;
};

const ElementOption = mongoose.model('ElementOption', elementOptionSchema);

module.exports = ElementOption;

