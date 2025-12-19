const { asyncHandler, AppError, ErrorCodes } = require('../middleware/errorHandler');
const Session = require('../models/Session');
const LyricsSubmission = require('../models/LyricsSubmission');
const Vote = require('../models/Vote');
const User = require('../models/User');
const { emitToSession } = require('../config/socket');

// @desc    Cast vote on lyrics
// @route   POST /api/sessions/:id/lyrics/:lyricsId/vote
// @access  Private
const castVote = asyncHandler(async (req, res, next) => {
  const { value = 1, tokenAmount = 0 } = req.body;

  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check if user can vote
  const canVote = session.canVote(req.userId);
  if (!canVote.allowed) {
    return next(new AppError(canVote.reason, 400, ErrorCodes.FORBIDDEN));
  }

  const submission = await LyricsSubmission.findById(req.params.lyricsId);

  if (!submission) {
    return next(new AppError('Lyrics submission not found', 404, ErrorCodes.NOT_FOUND));
  }

  if (submission.session.toString() !== session._id.toString()) {
    return next(new AppError('Lyrics not found in this session', 404, ErrorCodes.NOT_FOUND));
  }

  // Can't vote on your own lyrics
  if (submission.author.toString() === req.userId) {
    return next(new AppError('You cannot vote on your own lyrics', 400, ErrorCodes.CONFLICT));
  }

  // Check if already voted
  const existingVote = await Vote.findOne({
    user: req.userId,
    targetId: submission._id,
    targetType: 'lyrics',
  });

  if (existingVote) {
    return next(new AppError('You have already voted on this submission', 400, ErrorCodes.CONFLICT));
  }

  // Get user's vote weight
  const user = await User.findById(req.userId);
  let voteWeight = 1;

  if (session.settings.votingSystem === 'weighted' && user) {
    voteWeight = user.reputation?.voteWeight || user.calculateVoteWeight();
  }

  // Validate vote value based on voting system
  let voteValue = 1;
  if (session.settings.votingSystem === 'weighted') {
    voteValue = Math.min(Math.max(value, 1), 10); // 1-10 for weighted
  } else if (session.settings.votingSystem === 'tokenized') {
    voteValue = 1;
    // Token validation would go here
  }

  // Create vote
  const vote = await Vote.create({
    user: req.userId,
    targetType: 'lyrics',
    targetId: submission._id,
    session: session._id,
    value: voteValue,
    weight: voteWeight,
    tokenAmount: session.settings.votingSystem === 'tokenized' ? tokenAmount : 0,
  });

  // Update submission vote counts
  submission.voterIds.push(req.userId);
  submission.votes += 1;
  submission.weightedVoteScore += vote.totalPower;
  await submission.save();

  // Update session stats
  session.stats.totalVotes += 1;
  await session.save();

  // Award reputation for voting
  if (user) {
    user.stats.votesCast += 1;
    await user.save();
    await user.addReputation(1, 'vote_cast');
  }

  // Get updated vote count for response
  const voteStats = await Vote.getVoteStats(submission._id, 'lyrics');

  // Emit vote update
  emitToSession(session._id.toString(), 'lyrics:voteUpdate', {
    submissionId: submission._id,
    votes: submission.votes,
    weightedVoteScore: submission.weightedVoteScore,
  });

  res.status(201).json({
    success: true,
    message: 'Vote cast successfully',
    data: {
      vote: {
        id: vote._id,
        value: vote.value,
        weight: vote.weight,
        totalPower: vote.totalPower,
      },
      submissionVotes: voteStats,
    },
  });
});

// @desc    Remove vote from lyrics
// @route   DELETE /api/sessions/:id/lyrics/:lyricsId/vote
// @access  Private
const removeVote = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Check if voting is still open
  if (session.status !== 'lyrics-voting' && session.status !== 'song-voting') {
    return next(new AppError('Voting is no longer open', 400, ErrorCodes.CONFLICT));
  }

  const submission = await LyricsSubmission.findById(req.params.lyricsId);

  if (!submission) {
    return next(new AppError('Lyrics submission not found', 404, ErrorCodes.NOT_FOUND));
  }

  // Find and delete the vote
  const vote = await Vote.findOneAndDelete({
    user: req.userId,
    targetId: submission._id,
    targetType: 'lyrics',
  });

  if (!vote) {
    return next(new AppError('You have not voted on this submission', 400, ErrorCodes.NOT_FOUND));
  }

  // Update submission vote counts
  submission.voterIds = submission.voterIds.filter(id => id.toString() !== req.userId);
  submission.votes = Math.max(0, submission.votes - 1);
  submission.weightedVoteScore = Math.max(0, submission.weightedVoteScore - vote.totalPower);
  await submission.save();

  // Update session stats
  session.stats.totalVotes = Math.max(0, session.stats.totalVotes - 1);
  await session.save();

  // Emit vote update
  emitToSession(session._id.toString(), 'lyrics:voteUpdate', {
    submissionId: submission._id,
    votes: submission.votes,
    weightedVoteScore: submission.weightedVoteScore,
  });

  res.status(200).json({
    success: true,
    message: 'Vote removed successfully',
  });
});

// @desc    Get user's votes for session
// @route   GET /api/sessions/:id/votes
// @access  Private
const getUserVotes = asyncHandler(async (req, res) => {
  const { targetType } = req.query;

  const votes = await Vote.getUserVotesForSession(req.userId, req.params.id, targetType);

  const votedTargetIds = votes.map(v => v.targetId.toString());
  const totalVotePower = votes.reduce((sum, v) => sum + v.totalPower, 0);

  res.status(200).json({
    success: true,
    data: {
      votes,
      votedTargetIds,
      totalVotePower,
      voteCount: votes.length,
    },
  });
});

// @desc    Get vote leaderboard for session
// @route   GET /api/sessions/:id/votes/leaderboard
// @access  Public
const getVoteLeaderboard = asyncHandler(async (req, res, next) => {
  const session = await Session.findById(req.params.id);

  if (!session) {
    return next(new AppError('Session not found', 404, ErrorCodes.NOT_FOUND));
  }

  const { targetType = 'lyrics', limit = 10 } = req.query;

  // Only show leaderboard if allowed
  const canShow = session.settings.showVoteCountsDuringVoting || 
    ['generation', 'song-voting', 'completed'].includes(session.status);

  if (!canShow) {
    return next(new AppError('Leaderboard is not available during voting', 400, ErrorCodes.FORBIDDEN));
  }

  const leaderboard = await Vote.getSessionVoteLeaderboard(session._id, targetType, Number(limit));

  // Fetch submission details
  const submissionIds = leaderboard.map(l => l._id);
  const submissions = await LyricsSubmission.find({ _id: { $in: submissionIds } })
    .populate('author', 'username displayName avatar reputation.level')
    .lean();

  const submissionMap = {};
  submissions.forEach(s => {
    submissionMap[s._id.toString()] = s;
  });

  const leaderboardWithDetails = leaderboard.map((item, index) => {
    const submission = submissionMap[item._id.toString()];
    return {
      rank: index + 1,
      submissionId: item._id,
      title: submission?.content?.title || 'Untitled',
      author: submission?.isAnonymous ? null : submission?.author,
      isAnonymous: submission?.isAnonymous,
      totalVotes: item.totalVotes,
      totalPower: item.totalPower,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      leaderboard: leaderboardWithDetails,
    },
  });
});

module.exports = {
  castVote,
  removeVote,
  getUserVotes,
  getVoteLeaderboard,
};

