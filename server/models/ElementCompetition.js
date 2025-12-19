const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  audioUrl: {
    type: String,
    required: [true, 'Audio URL is required'],
  },
  waveformData: [{
    type: Number,
  }],
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  metadata: {
    bpm: { type: Number },
    key: { type: String },
    duration: { type: Number },
    filename: { type: String },
  },
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
  status: {
    type: String,
    enum: ['pending', 'approved', 'winner', 'runnerUp', 'rejected'],
    default: 'pending',
  },
  feedback: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: { type: String, maxlength: 200 },
    createdAt: { type: Date, default: Date.now },
  }],
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

const elementCompetitionSchema = new mongoose.Schema(
  {
    // References
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: [true, 'Session is required'],
    },
    
    // Competition details
    elementType: {
      type: String,
      enum: [
        'hihat', 'kick', 'snare', 'drums',
        'bass', 'melody', 'vocals', 'synth', 'pad', 'lead',
        'intro', 'verse', 'chorus', 'bridge', 'outro',
        'mix', 'master', 'arrangement',
      ],
      required: [true, 'Element type is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    guidelines: {
      type: String,
      maxlength: [2000, 'Guidelines cannot exceed 2000 characters'],
    },
    
    // Requirements
    requirements: {
      bpm: { type: Number },
      key: { type: String },
      minDuration: { type: Number }, // seconds
      maxDuration: { type: Number },
      fileFormats: [{ type: String }], // ['wav', 'mp3']
      maxFileSize: { type: Number }, // bytes
    },
    
    // Schedule
    submissionDeadline: {
      type: Date,
      required: [true, 'Submission deadline is required'],
    },
    votingDeadline: {
      type: Date,
    },
    
    // Submissions
    submissions: [submissionSchema],
    maxSubmissionsPerUser: {
      type: Number,
      default: 1,
    },
    
    // Status
    status: {
      type: String,
      enum: ['draft', 'open', 'voting', 'closed', 'cancelled'],
      default: 'draft',
    },
    
    // Winner
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    winningSubmissionIndex: {
      type: Number,
    },
    
    // Prize
    prize: {
      reputationPoints: { type: Number, default: 50 },
      badgeId: { type: String },
      badgeName: { type: String },
      monetary: {
        amount: { type: Number },
        currency: { type: String, default: 'USD' },
      },
      tokens: { type: Number },
      description: { type: String },
    },
    
    // Stats
    stats: {
      totalSubmissions: { type: Number, default: 0 },
      totalVotes: { type: Number, default: 0 },
      uniqueParticipants: { type: Number, default: 0 },
    },
    
    // Creator
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
elementCompetitionSchema.index({ session: 1, status: 1 });
elementCompetitionSchema.index({ session: 1, elementType: 1 });
elementCompetitionSchema.index({ status: 1, submissionDeadline: 1 });
elementCompetitionSchema.index({ createdBy: 1 });

// Virtual for time remaining
elementCompetitionSchema.virtual('timeRemaining').get(function () {
  if (this.status === 'open' && this.submissionDeadline) {
    return Math.max(0, new Date(this.submissionDeadline) - new Date());
  }
  if (this.status === 'voting' && this.votingDeadline) {
    return Math.max(0, new Date(this.votingDeadline) - new Date());
  }
  return 0;
});

// Virtual for submission count
elementCompetitionSchema.virtual('submissionCount').get(function () {
  return this.submissions?.length || 0;
});

// Method: Check if user can submit
elementCompetitionSchema.methods.canSubmit = function (userId) {
  if (this.status !== 'open') {
    return { allowed: false, reason: 'Competition is not open for submissions' };
  }
  
  if (new Date() > new Date(this.submissionDeadline)) {
    return { allowed: false, reason: 'Submission deadline has passed' };
  }
  
  const userSubmissions = this.submissions.filter(
    s => s.user.toString() === userId.toString()
  );
  
  if (userSubmissions.length >= this.maxSubmissionsPerUser) {
    return { allowed: false, reason: 'Maximum submissions reached' };
  }
  
  return { allowed: true };
};

// Method: Add submission
elementCompetitionSchema.methods.addSubmission = async function (userId, data) {
  const canSubmit = this.canSubmit(userId);
  if (!canSubmit.allowed) {
    throw new Error(canSubmit.reason);
  }
  
  this.submissions.push({
    user: userId,
    audioUrl: data.audioUrl,
    waveformData: data.waveformData,
    description: data.description,
    metadata: data.metadata,
  });
  
  this.stats.totalSubmissions += 1;
  
  // Track unique participants
  const uniqueUsers = new Set(this.submissions.map(s => s.user.toString()));
  this.stats.uniqueParticipants = uniqueUsers.size;
  
  await this.save();
  return this.submissions[this.submissions.length - 1];
};

// Method: Vote on submission
elementCompetitionSchema.methods.voteOnSubmission = async function (submissionIndex, userId, weight = 1) {
  if (this.status !== 'voting') {
    throw new Error('Voting is not open');
  }
  
  const submission = this.submissions[submissionIndex];
  if (!submission) {
    throw new Error('Submission not found');
  }
  
  // Check if user has already voted on this submission
  if (submission.voterIds.some(id => id.toString() === userId.toString())) {
    throw new Error('Already voted on this submission');
  }
  
  // Prevent self-voting
  if (submission.user.toString() === userId.toString()) {
    throw new Error('Cannot vote on your own submission');
  }
  
  submission.voterIds.push(userId);
  submission.votes += 1;
  submission.weightedVotes += weight;
  this.stats.totalVotes += 1;
  
  await this.save();
  return submission;
};

// Method: Determine winner
elementCompetitionSchema.methods.determineWinner = async function () {
  if (this.submissions.length === 0) {
    throw new Error('No submissions to determine winner');
  }
  
  // Sort by weighted votes, then regular votes
  const sortedSubmissions = [...this.submissions].sort((a, b) => {
    if (b.weightedVotes !== a.weightedVotes) {
      return b.weightedVotes - a.weightedVotes;
    }
    return b.votes - a.votes;
  });
  
  const winnerSubmission = sortedSubmissions[0];
  const winnerIndex = this.submissions.findIndex(
    s => s._id.toString() === winnerSubmission._id.toString()
  );
  
  this.winner = winnerSubmission.user;
  this.winningSubmissionIndex = winnerIndex;
  this.submissions[winnerIndex].status = 'winner';
  
  // Mark runner-ups
  if (sortedSubmissions.length > 1) {
    const runnerUpIndex = this.submissions.findIndex(
      s => s._id.toString() === sortedSubmissions[1]._id.toString()
    );
    this.submissions[runnerUpIndex].status = 'runnerUp';
  }
  
  this.status = 'closed';
  await this.save();
  
  return {
    winner: this.winner,
    winningSubmission: this.submissions[winnerIndex],
  };
};

// Method: Get public data
elementCompetitionSchema.methods.toPublicJSON = function (userId = null) {
  const submissions = this.submissions.map((sub, index) => ({
    index,
    user: sub.user,
    audioUrl: sub.audioUrl,
    waveformData: sub.waveformData,
    description: sub.description,
    metadata: sub.metadata,
    votes: sub.votes,
    hasVoted: userId ? sub.voterIds.some(id => id.toString() === userId.toString()) : false,
    status: sub.status,
    submittedAt: sub.submittedAt,
  }));

  return {
    id: this._id,
    session: this.session,
    elementType: this.elementType,
    title: this.title,
    description: this.description,
    guidelines: this.guidelines,
    requirements: this.requirements,
    submissionDeadline: this.submissionDeadline,
    votingDeadline: this.votingDeadline,
    submissions,
    submissionCount: this.submissionCount,
    status: this.status,
    winner: this.winner,
    prize: this.prize,
    stats: this.stats,
    timeRemaining: this.timeRemaining,
    canSubmit: userId ? this.canSubmit(userId) : { allowed: false },
    createdBy: this.createdBy,
    createdAt: this.createdAt,
  };
};

// Static: Get active competitions for session
elementCompetitionSchema.statics.getActiveCompetitions = async function (sessionId) {
  return this.find({
    session: sessionId,
    status: { $in: ['open', 'voting'] },
  })
    .populate('createdBy', 'username displayName avatar')
    .populate('submissions.user', 'username displayName avatar')
    .sort({ submissionDeadline: 1 })
    .lean();
};

const ElementCompetition = mongoose.model('ElementCompetition', elementCompetitionSchema);

module.exports = ElementCompetition;

