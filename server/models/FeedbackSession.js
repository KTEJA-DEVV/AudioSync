const mongoose = require('mongoose');

const topWordSchema = new mongoose.Schema({
  word: { type: String, required: true },
  count: { type: Number, required: true },
  category: { type: String },
}, { _id: false });

const feedbackSessionSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.ObjectId,
      ref: 'Session',
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['closed', 'open', 'paused'],
      default: 'closed',
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    totalInputs: {
      type: Number,
      default: 0,
    },
    uniqueWords: {
      type: Number,
      default: 0,
    },
    topWords: {
      type: [topWordSchema],
      default: [],
    },
    settings: {
      allowVoice: {
        type: Boolean,
        default: true,
      },
      allowText: {
        type: Boolean,
        default: true,
      },
      maxWordsPerUser: {
        type: Number,
        default: 50,
      },
      cooldownSeconds: {
        type: Number,
        default: 2,
      },
      wordMinLength: {
        type: Number,
        default: 2,
      },
      wordMaxLength: {
        type: Number,
        default: 30,
      },
      blockedWords: {
        type: [String],
        default: [],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick session lookup
feedbackSessionSchema.index({ session: 1 });
feedbackSessionSchema.index({ status: 1 });

// Method to start feedback collection
feedbackSessionSchema.methods.start = async function() {
  this.status = 'open';
  this.startedAt = new Date();
  this.endedAt = null;
  await this.save();
  return this;
};

// Method to stop feedback collection
feedbackSessionSchema.methods.stop = async function() {
  this.status = 'closed';
  this.endedAt = new Date();
  await this.save();
  return this;
};

// Method to pause feedback collection
feedbackSessionSchema.methods.pause = async function() {
  this.status = 'paused';
  await this.save();
  return this;
};

// Method to update cached top words
feedbackSessionSchema.methods.updateTopWords = async function(topWords) {
  this.topWords = topWords.slice(0, 50).map(w => ({
    word: w.word,
    count: w.count,
    category: w.category,
  }));
  await this.save();
  return this;
};

// Method to increment stats
feedbackSessionSchema.methods.incrementStats = async function(inputCount = 1, newUniqueWords = 0) {
  this.totalInputs += inputCount;
  this.uniqueWords += newUniqueWords;
  await this.save();
  return this;
};

// Static method to get or create feedback session
feedbackSessionSchema.statics.getOrCreate = async function(sessionId, settings = {}) {
  let feedbackSession = await this.findOne({ session: sessionId });
  
  if (!feedbackSession) {
    feedbackSession = await this.create({
      session: sessionId,
      settings: {
        ...settings,
      },
    });
  }
  
  return feedbackSession;
};

module.exports = mongoose.model('FeedbackSession', feedbackSessionSchema);

