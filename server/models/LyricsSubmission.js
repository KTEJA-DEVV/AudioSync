const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['verse', 'chorus', 'bridge', 'hook', 'outro', 'intro', 'pre-chorus'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: [1000, 'Section content cannot exceed 1000 characters'],
  },
  lineCount: { type: Number },
  order: { type: Number, default: 0 },
}, { _id: false });

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
    required: true,
  },
  comment: {
    type: String,
    maxlength: [500, 'Feedback comment cannot exceed 500 characters'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

const lyricsSubmissionSchema = new mongoose.Schema(
  {
    // References
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session is required'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
    },
    
    // Content
    content: {
      title: {
        type: String,
        trim: true,
        maxlength: [100, 'Title cannot exceed 100 characters'],
      },
      fullLyrics: {
        type: String,
        required: [true, 'Lyrics content is required'],
        maxlength: [5000, 'Lyrics cannot exceed 5000 characters'],
      },
      sections: [sectionSchema],
    },
    
    // Metadata
    metadata: {
      theme: {
        type: String,
        maxlength: [100, 'Theme cannot exceed 100 characters'],
      },
      inspiration: {
        type: String,
        maxlength: [300, 'Inspiration cannot exceed 300 characters'],
      },
      targetMood: {
        type: String,
        enum: ['happy', 'sad', 'energetic', 'chill', 'angry', 'romantic', 'inspirational', 'dark', 'uplifting', 'melancholic'],
      },
      language: {
        type: String,
        default: 'en',
      },
    },
    
    // Voting
    votes: {
      type: Number,
      default: 0,
    },
    voterIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    weightedVoteScore: {
      type: Number,
      default: 0,
    },
    ranking: {
      type: Number,
    },
    
    // Status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'winner', 'runnerUp'],
      default: 'pending',
    },
    
    // Moderation
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    moderationNote: {
      type: String,
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    moderatedAt: { type: Date },
    
    // Feedback
    feedback: [feedbackSchema],
    averageRating: {
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
lyricsSubmissionSchema.index({ session: 1, votes: -1 });
lyricsSubmissionSchema.index({ session: 1, weightedVoteScore: -1 });
lyricsSubmissionSchema.index({ session: 1, createdAt: -1 });
lyricsSubmissionSchema.index({ author: 1, session: 1 });
lyricsSubmissionSchema.index({ status: 1, session: 1 });

// Virtual for vote count display
lyricsSubmissionSchema.virtual('voteCount').get(function () {
  return this.voterIds?.length || this.votes || 0;
});

// Virtual for word count
lyricsSubmissionSchema.virtual('wordCount').get(function () {
  if (!this.content?.fullLyrics) return 0;
  return this.content.fullLyrics.split(/\s+/).filter(word => word.length > 0).length;
});

// Virtual for line count
lyricsSubmissionSchema.virtual('lineCount').get(function () {
  if (!this.content?.fullLyrics) return 0;
  return this.content.fullLyrics.split('\n').filter(line => line.trim().length > 0).length;
});

// Pre-save hook to calculate line counts for sections
lyricsSubmissionSchema.pre('save', function (next) {
  if (this.content?.sections) {
    this.content.sections.forEach((section, index) => {
      section.lineCount = section.content.split('\n').filter(line => line.trim().length > 0).length;
      section.order = index;
    });
  }
  
  // Calculate average rating
  if (this.feedback && this.feedback.length > 0) {
    const sum = this.feedback.reduce((acc, f) => acc + f.rating, 0);
    this.averageRating = Math.round((sum / this.feedback.length) * 10) / 10;
  }
  
  next();
});

// Method: Check if user has voted
lyricsSubmissionSchema.methods.hasVoted = function (userId) {
  return this.voterIds.some(id => id.toString() === userId.toString());
};

// Method: Add vote
lyricsSubmissionSchema.methods.addVote = async function (userId, weight = 1) {
  if (this.hasVoted(userId)) {
    throw new Error('User has already voted on this submission');
  }
  
  this.voterIds.push(userId);
  this.votes += 1;
  this.weightedVoteScore += weight;
  
  await this.save();
  return this;
};

// Method: Remove vote
lyricsSubmissionSchema.methods.removeVote = async function (userId, weight = 1) {
  if (!this.hasVoted(userId)) {
    throw new Error('User has not voted on this submission');
  }
  
  this.voterIds = this.voterIds.filter(id => id.toString() !== userId.toString());
  this.votes = Math.max(0, this.votes - 1);
  this.weightedVoteScore = Math.max(0, this.weightedVoteScore - weight);
  
  await this.save();
  return this;
};

// Method: Add feedback
lyricsSubmissionSchema.methods.addFeedback = async function (userId, rating, comment) {
  // Remove existing feedback from this user
  this.feedback = this.feedback.filter(f => f.user.toString() !== userId.toString());
  
  this.feedback.push({
    user: userId,
    rating,
    comment,
  });
  
  // Recalculate average
  const sum = this.feedback.reduce((acc, f) => acc + f.rating, 0);
  this.averageRating = Math.round((sum / this.feedback.length) * 10) / 10;
  
  await this.save();
  return this;
};

// Method: Get public data
lyricsSubmissionSchema.methods.toPublicJSON = function (includeVotes = false, showAuthor = true) {
  const data = {
    id: this._id,
    session: this.session,
    content: {
      title: this.content.title,
      fullLyrics: this.content.fullLyrics,
      sections: this.content.sections,
    },
    metadata: this.metadata,
    status: this.status,
    wordCount: this.wordCount,
    lineCount: this.lineCount,
    averageRating: this.averageRating,
    feedbackCount: this.feedback?.length || 0,
    createdAt: this.createdAt,
  };
  
  if (showAuthor && !this.isAnonymous) {
    data.author = this.author;
  } else {
    data.isAnonymous = true;
  }
  
  if (includeVotes) {
    data.votes = this.votes;
    data.weightedVoteScore = this.weightedVoteScore;
    data.ranking = this.ranking;
  }
  
  return data;
};

// Static: Get ranked submissions for a session
lyricsSubmissionSchema.statics.getRankedSubmissions = async function (sessionId, votingSystem = 'simple') {
  const sortField = votingSystem === 'weighted' || votingSystem === 'tokenized' 
    ? 'weightedVoteScore' 
    : 'votes';
  
  const submissions = await this.find({ 
    session: sessionId,
    status: { $in: ['pending', 'approved', 'winner', 'runnerUp'] },
  })
    .populate('author', 'username displayName avatar reputation.level')
    .sort({ [sortField]: -1, createdAt: 1 })
    .lean();
  
  // Add rankings
  return submissions.map((sub, index) => ({
    ...sub,
    ranking: index + 1,
  }));
};

const LyricsSubmission = mongoose.model('LyricsSubmission', lyricsSubmissionSchema);

module.exports = LyricsSubmission;

