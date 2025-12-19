const mongoose = require('mongoose');

const feedbackWordSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.ObjectId,
      ref: 'Session',
      required: true,
    },
    word: {
      type: String,
      required: [true, 'Word is required'],
      lowercase: true,
      trim: true,
      maxlength: [30, 'Word cannot exceed 30 characters'],
    },
    count: {
      type: Number,
      default: 1,
      min: 1,
    },
    contributors: [{
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    }],
    category: {
      type: String,
      enum: ['general', 'positive', 'negative', 'technical', 'mood', 'genre', 'element'],
      default: 'general',
    },
    sentiment: {
      type: Number,
      min: -1,
      max: 1,
      default: 0,
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast upsert (session + word)
feedbackWordSchema.index({ session: 1, word: 1 }, { unique: true });

// Index for sorted retrieval by count
feedbackWordSchema.index({ session: 1, count: -1 });

// Index for category filtering
feedbackWordSchema.index({ session: 1, category: 1, count: -1 });

// Static method to increment word count or create new
feedbackWordSchema.statics.incrementWord = async function(sessionId, word, userId, category = 'general', sentiment = 0) {
  const now = new Date();
  
  const result = await this.findOneAndUpdate(
    { session: sessionId, word: word.toLowerCase().trim() },
    {
      $inc: { count: 1 },
      $addToSet: { contributors: userId },
      $set: { lastUpdatedAt: now, category, sentiment },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, new: true }
  );
  
  return result;
};

// Static method to get top words for a session
feedbackWordSchema.statics.getTopWords = async function(sessionId, limit = 100) {
  return this.find({ session: sessionId })
    .sort('-count')
    .limit(limit)
    .select('word count category sentiment')
    .lean();
};

// Static method to get words by category
feedbackWordSchema.statics.getWordsByCategory = async function(sessionId, category, limit = 50) {
  return this.find({ session: sessionId, category })
    .sort('-count')
    .limit(limit)
    .select('word count sentiment')
    .lean();
};

module.exports = mongoose.model('FeedbackWord', feedbackWordSchema);

