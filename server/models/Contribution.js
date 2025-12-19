const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    round: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['audio', 'midi', 'sample', 'generated'],
      default: 'audio',
    },
    audioUrl: {
      type: String,
      required: [true, 'Audio URL is required'],
    },
    audioKey: String, // S3 key for deletion
    duration: {
      type: Number, // in seconds
      required: true,
    },
    waveform: [Number], // Array of waveform data points
    metadata: {
      format: String,
      sampleRate: Number,
      bitrate: Number,
      channels: Number,
      fileSize: Number,
    },
    instrument: {
      type: String,
      default: 'unknown',
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    votes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        value: { type: Number, enum: [1, -1], default: 1 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    voteCount: {
      type: Number,
      default: 0,
    },
    isWinner: {
      type: Boolean,
      default: false,
    },
    isIncludedInFinal: {
      type: Boolean,
      default: false,
    },
    position: {
      // Position in the final track timeline
      start: Number,
      end: Number,
      track: Number,
    },
    processing: {
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending',
      },
      error: String,
      completedAt: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
contributionSchema.index({ session: 1, round: 1 });
contributionSchema.index({ user: 1 });
contributionSchema.index({ voteCount: -1 });
contributionSchema.index({ 'processing.status': 1 });

// Calculate vote count
contributionSchema.methods.calculateVoteCount = function () {
  this.voteCount = this.votes.reduce((sum, vote) => sum + vote.value, 0);
  return this.voteCount;
};

// Check if user has voted
contributionSchema.methods.hasUserVoted = function (userId) {
  return this.votes.some((v) => v.user.toString() === userId.toString());
};

// Pre-save hook to update vote count
contributionSchema.pre('save', function (next) {
  if (this.isModified('votes')) {
    this.calculateVoteCount();
  }
  next();
});

const Contribution = mongoose.model('Contribution', contributionSchema);

module.exports = Contribution;

