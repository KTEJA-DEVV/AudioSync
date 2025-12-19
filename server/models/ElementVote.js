const mongoose = require('mongoose');

const elementVoteSchema = new mongoose.Schema(
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
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
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
    elementId: {
      type: String,
      required: [true, 'Element ID is required'],
    },
    
    // Vote details
    value: {
      type: mongoose.Schema.Types.Mixed, // Can be number (BPM) or string (pattern name)
    },
    voteValue: {
      type: Number,
      required: true,
      enum: [-1, 1, 2, 3, 4, 5], // -1 reject, 1 approve, or 1-5 rating
    },
    weight: {
      type: Number,
      default: 1,
    },
    
    // Optional feedback
    comment: {
      type: String,
      maxlength: [200, 'Comment cannot exceed 200 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate votes
elementVoteSchema.index(
  { session: 1, user: 1, elementType: 1, elementId: 1 },
  { unique: true }
);

// Additional indexes for querying
elementVoteSchema.index({ session: 1, elementType: 1 });
elementVoteSchema.index({ session: 1, song: 1, elementType: 1 });
elementVoteSchema.index({ user: 1, createdAt: -1 });

// Static: Get vote summary for an element
elementVoteSchema.statics.getElementSummary = async function (sessionId, elementType, elementId) {
  const votes = await this.find({
    session: sessionId,
    elementType,
    elementId,
  }).lean();

  const approvals = votes.filter(v => v.voteValue === 1).length;
  const rejections = votes.filter(v => v.voteValue === -1).length;
  const ratings = votes.filter(v => v.voteValue >= 1 && v.voteValue <= 5);
  
  const totalWeight = votes.reduce((sum, v) => sum + (v.weight || 1), 0);
  const weightedApprovals = votes.filter(v => v.voteValue === 1).reduce((sum, v) => sum + (v.weight || 1), 0);
  
  let avgRating = 0;
  if (ratings.length > 0) {
    avgRating = ratings.reduce((sum, v) => sum + v.voteValue, 0) / ratings.length;
  }

  return {
    elementType,
    elementId,
    totalVotes: votes.length,
    approvals,
    rejections,
    approvalRate: votes.length > 0 ? (approvals / votes.length) * 100 : 0,
    avgRating: Math.round(avgRating * 10) / 10,
    totalWeight,
    weightedApprovals,
    weightedApprovalRate: totalWeight > 0 ? (weightedApprovals / totalWeight) * 100 : 0,
  };
};

// Static: Get all element summaries for a session
elementVoteSchema.statics.getSessionSummary = async function (sessionId) {
  const votes = await this.aggregate([
    { $match: { session: new mongoose.Types.ObjectId(sessionId) } },
    {
      $group: {
        _id: { elementType: '$elementType', elementId: '$elementId' },
        totalVotes: { $sum: 1 },
        approvals: { $sum: { $cond: [{ $eq: ['$voteValue', 1] }, 1, 0] } },
        rejections: { $sum: { $cond: [{ $eq: ['$voteValue', -1] }, 1, 0] } },
        totalWeight: { $sum: '$weight' },
        weightedApprovals: {
          $sum: { $cond: [{ $eq: ['$voteValue', 1] }, '$weight', 0] },
        },
        avgRating: {
          $avg: {
            $cond: [{ $and: [{ $gte: ['$voteValue', 1] }, { $lte: ['$voteValue', 5] }] }, '$voteValue', null],
          },
        },
      },
    },
    {
      $project: {
        elementType: '$_id.elementType',
        elementId: '$_id.elementId',
        totalVotes: 1,
        approvals: 1,
        rejections: 1,
        approvalRate: {
          $multiply: [{ $divide: ['$approvals', { $max: ['$totalVotes', 1] }] }, 100],
        },
        avgRating: { $round: ['$avgRating', 1] },
        totalWeight: 1,
        weightedApprovals: 1,
        weightedApprovalRate: {
          $multiply: [{ $divide: ['$weightedApprovals', { $max: ['$totalWeight', 1] }] }, 100],
        },
      },
    },
  ]);

  // Group by element type
  const grouped = {};
  for (const vote of votes) {
    if (!grouped[vote.elementType]) {
      grouped[vote.elementType] = [];
    }
    grouped[vote.elementType].push(vote);
  }

  return grouped;
};

const ElementVote = mongoose.model('ElementVote', elementVoteSchema);

module.exports = ElementVote;

