const express = require('express');
const router = express.Router();

// =============================================
// CONTROLLER IMPORTS
// =============================================

// Session Controllers
const {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
  advanceStage,
  goLive,
  endSession,
  submitLyrics,
  getLyrics,
  voteOnLyrics,
  removeVote,
  submitFeedback,
  getFeedback,
  submitFeedbackWords,
  joinSession,
  leaveSession,
  sendReaction,
  startVotingRound,
  endVotingRound,
  getLiveSessions,
  getUpcomingSessions
} = require('../controllers/sessionController');

// Lyrics Controllers
const {
  submitLyrics,
  getSessionLyrics,
  getLyricsById,
  updateLyrics,
  deleteLyrics,
  getVotingResults,
  addFeedback: addLyricsFeedback,
} = require('../controllers/lyricsController');

// Vote Controllers
const {
  castVote,
  removeVote: removeLyricsVote,
  getUserVotes,
  getVoteLeaderboard,
} = require('../controllers/voteController');

// Song/Generation Controllers
const {
  triggerGeneration,
  getGenerationStatus,
  cancelSessionGeneration,
  getSessionSongs,
  getSongResults,
  addSong,
  removeSong,
  reorderSongs,
} = require('../controllers/songController');

// Stem Controllers
const {
  uploadStem,
  getSessionStems,
  uploadProjectFile,
  uploadAudioFile,
} = require('../controllers/stemController');

// Element Controllers
const {
  createElementOptions,
  getElementOptions,
  voteElementOption,
  removeElementOptionVote,
  getElementResults,
  submitUserOption,
  createCompetition,
  getCompetitions,
  getGranularBreakdown,
} = require('../controllers/elementController');

// Feedback/Word Cloud Controllers
const {
  startFeedback: startWordFeedback,
  stopFeedback: stopWordFeedback,
  submitWords,
  getWords,
  getStats: getFeedbackStats,
  deleteWord,
  getSuggestions,
  streamUpdates,
} = require('../controllers/feedbackController');

// =============================================
// MIDDLEWARE IMPORTS
// =============================================

const {
  protect,
  requireAdmin,
  requireHostOrAdmin,
  optionalAuth
} = require('../middleware/auth');

// =============================================
// HELPER MIDDLEWARE
// =============================================

/**
 * Middleware to check if user is session host, moderator, or admin
 * Used for routes where session management access is required
 */
const isHost = async (req, res, next) => {
  try {
    const Session = require('../models/Session');
    const sessionId = req.params.id || req.params.sessionId;
    
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
        code: 'SESSION_NOT_FOUND',
      });
    }
    
    const isSessionHost = session.host.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isModerator = req.user.role === 'moderator';
    const isSessionMod = session.isSessionModerator ? session.isSessionModerator(req.user._id) : false;
    
    if (!isSessionHost && !isAdmin && !isModerator && !isSessionMod) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only the session host, moderators, or administrators can perform this action.',
        code: 'FORBIDDEN',
      });
    }
    
    // Attach session and permission flags to request
    req.session = session;
    req.isSessionHost = isSessionHost;
    req.isAdmin = isAdmin;
    req.isModerator = isModerator;
    req.isSessionMod = isSessionMod;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user can modify session content
 * Includes session moderators in addition to host/admin/moderator
 */
const canModifySession = async (req, res, next) => {
  try {
    const Session = require('../models/Session');
    const sessionId = req.params.id || req.params.sessionId;
    
    const session = req.session || await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
        code: 'SESSION_NOT_FOUND',
      });
    }
    
    const isSessionHost = session.host.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isModerator = req.user.role === 'moderator';
    const isSessionMod = session.isSessionModerator ? session.isSessionModerator(req.user._id) : false;
    
    if (!isSessionHost && !isAdmin && !isModerator && !isSessionMod) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to modify this session.',
        code: 'FORBIDDEN',
      });
    }
    
    req.session = session;
    req.isSessionHost = isSessionHost;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user is host only (not just moderator)
 * Used for sensitive operations like promoting/demoting
 */
const isHostOnly = async (req, res, next) => {
  try {
    const Session = require('../models/Session');
    const sessionId = req.params.id || req.params.sessionId;
    
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
        code: 'SESSION_NOT_FOUND',
      });
    }
    
    const isSessionHost = session.host.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isSessionHost && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only the session host or administrators can perform this action.',
        code: 'FORBIDDEN',
      });
    }
    
    req.session = session;
    req.isSessionHost = isSessionHost;
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to load session without permission check
 * Useful for routes that need session data but handle permissions internally
 */
const loadSession = async (req, res, next) => {
  try {
    const Session = require('../models/Session');
    const sessionId = req.params.id || req.params.sessionId;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required',
        code: 'BAD_REQUEST',
      });
    }
    
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
        code: 'SESSION_NOT_FOUND',
      });
    }
    
    req.session = session;
    next();
  } catch (error) {
    next(error);
  }
};

// =============================================
// PUBLIC ROUTES (No authentication required)
// =============================================
router.get('/', getSessions);
router.get('/live', getLiveSessions);
router.get('/upcoming', getUpcomingSessions);
router.get('/:id', getSessionById);
router.get('/:id/lyrics', getLyrics);
router.get('/:id/feedback', getFeedback);

// =============================================
// PROTECTED ROUTES (Authenticated users)
// =============================================
router.post('/:id/lyrics', protect, submitLyrics);
router.post('/:id/lyrics/:lyricsId/vote', protect, voteOnLyrics);
router.delete('/:id/lyrics/:lyricsId/vote', protect, removeVote);
router.post('/:id/feedback', protect, submitFeedback);
router.post('/:id/feedback/words', protect, submitFeedbackWords);
router.post('/:id/join', protect, joinSession);
router.post('/:id/leave', protect, leaveSession);
router.post('/:id/react', protect, sendReaction);

// =============================================
// ADMIN ONLY ROUTES (Session Management)
// =============================================
router.post('/', protect, requireAdmin, createSession);
router.delete('/:id', protect, requireAdmin, deleteSession);

// =============================================
// HOST OR ADMIN ROUTES (Session Control)
// =============================================
router.put('/:id', protect, requireHostOrAdmin, updateSession);
router.put('/:id/stage', protect, requireHostOrAdmin, advanceStage);
router.post('/:id/go-live', protect, requireHostOrAdmin, goLive);
router.post('/:id/end', protect, requireHostOrAdmin, endSession);
router.post('/:id/voting-round', protect, requireHostOrAdmin, startVotingRound);
router.put('/:id/voting-round/:roundId', protect, requireHostOrAdmin, endVotingRound);

// =============================================
// ADMIN ROUTES (Must be before /:id routes)
// =============================================

/**
 * @route   GET /api/sessions/admin/all
 * @desc    Get all sessions for admin dashboard
 * @access  Private (Admin only)
 */
router.get('/admin/all', requireAuth, requireAdmin, getAllSessionsAdmin);

/**
 * @route   GET /api/sessions/admin/stats
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin only)
 */
router.get('/admin/stats', requireAuth, requireAdmin, getAdminSessionStats);

// =============================================
// PUBLIC STATIC ROUTES (Before parameterized routes)
// =============================================

/**
 * @route   GET /api/sessions
 * @desc    Get all sessions (filtered based on auth and role)
 * @access  Public (results filtered based on role)
 */
router.get('/', optionalAuth, getSessions);

/**
 * @route   GET /api/sessions/live
 * @desc    Get all live/active sessions
 * @access  Public
 */
router.get('/live', optionalAuth, getLiveSessions);

/**
 * @route   POST /api/sessions
 * @desc    Create a new session
 * @access  Private (Admin, Moderator, Creator roles only)
 */
router.post('/', requireAuth, canCreateSession, createSession);

/**
 * @route   GET /api/sessions/code/:code
 * @desc    Get session by session code
 * @access  Public
 */
router.get('/code/:code', optionalAuth, getSessionByCode);

// =============================================
// SESSION ROUTES (Parameterized - /:id)
// =============================================

/**
 * @route   GET /api/sessions/:id
 * @desc    Get single session by ID
 * @access  Public (with role-based data filtering)
 */
router.get('/:id', optionalAuth, getSession);

/**
 * @route   PUT /api/sessions/:id
 * @desc    Update session details
 * @access  Private (Host, Moderator, Admin)
 */
router.put('/:id', requireAuth, isHost, updateSession);

/**
 * @route   DELETE /api/sessions/:id
 * @desc    Delete/Cancel a session (Admin can hard delete, Host can cancel)
 * @access  Private (Admin for hard delete, Host for cancel)
 */
router.delete('/:id', requireAuth, loadSession, deleteSession);

// =============================================
// SESSION STATE MANAGEMENT ROUTES
// =============================================

/**
 * @route   PUT /api/sessions/:id/start
 * @desc    Start a session
 * @access  Private (Host, Moderator, Admin)
 */
router.put('/:id/start', requireAuth, isHost, startSession);

/**
 * @route   PUT /api/sessions/:id/pause
 * @desc    Pause a session
 * @access  Private (Host, Moderator, Admin)
 */
router.put('/:id/pause', requireAuth, isHost, pauseSession);

/**
 * @route   PUT /api/sessions/:id/resume
 * @desc    Resume a paused session
 * @access  Private (Host, Moderator, Admin)
 */
router.put('/:id/resume', requireAuth, isHost, resumeSession);

/**
 * @route   PUT /api/sessions/:id/end
 * @desc    End a session
 * @access  Private (Host, Moderator, Admin)
 */
router.put('/:id/end', requireAuth, isHost, endSession);

/**
 * @route   PUT /api/sessions/:id/stage
 * @desc    Advance session to next stage
 * @access  Private (Host, Moderator, Admin)
 */
router.put('/:id/stage', requireAuth, isHost, advanceStage);

/**
 * @route   GET /api/sessions/:id/stats
 * @desc    Get session statistics
 * @access  Private (Host, Moderator, Admin)
 */
router.get('/:id/stats', requireAuth, isHost, getSessionStats);

// =============================================
// PARTICIPANT ROUTES (All authenticated users)
// =============================================

/**
 * @route   POST /api/sessions/:id/join
 * @desc    Join a session
 * @access  Private (All authenticated users)
 */
router.post('/:id/join', requireAuth, joinSession);

/**
 * @route   POST /api/sessions/:id/leave
 * @desc    Leave a session
 * @access  Private (All authenticated users)
 */
router.post('/:id/leave', requireAuth, leaveSession);

/**
 * @route   GET /api/sessions/:id/participants
 * @desc    Get session participants
 * @access  Public
 */
router.get('/:id/participants', optionalAuth, async (req, res, next) => {
  try {
    const Session = require('../models/Session');
    const session = await Session.findById(req.params.id)
      .populate('participants.user', 'username displayName avatar reputation.level role')
      .select('participants host');
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }
    
    // Filter and format participants
    const participants = session.participants
      .filter(p => p.isActive !== false)
      .map(p => ({
        user: p.user,
        role: p.role,
        joinedAt: p.joinedAt,
        isHost: p.user._id.toString() === session.host.toString(),
      }));
    
    res.status(200).json({
      success: true,
      data: {
        participants,
        count: participants.length,
        activeCount: participants.filter(p => p.isActive !== false).length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// =============================================
// PARTICIPANT MANAGEMENT ROUTES (Host/Mod/Admin)
// =============================================

/**
 * @route   POST /api/sessions/:id/kick/:userId
 * @desc    Kick a participant from session
 * @access  Private (Host, Moderator, Admin)
 */
router.post('/:id/kick/:userId', requireAuth, isHost, kickParticipant);

/**
 * @route   POST /api/sessions/:id/ban/:userId
 * @desc    Ban user from session
 * @access  Private (Host, Moderator, Admin)
 */
router.post('/:id/ban/:userId', requireAuth, isHost, async (req, res, next) => {
  try {
    const { reason, duration } = req.body;
    const session = req.session;
    const targetUserId = req.params.userId;
    
    // Validation
    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot ban yourself',
        code: 'INVALID_OPERATION',
      });
    }
    
    if (targetUserId === session.host.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot ban the session host',
        code: 'INVALID_OPERATION',
      });
    }
    
    // Check if target is a system admin/moderator
    const User = require('../models/User');
    const targetUser = await User.findById(targetUserId);
    
    if (targetUser && ['admin', 'moderator'].includes(targetUser.role) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot ban administrators or moderators',
        code: 'FORBIDDEN',
      });
    }
    
    const result = await session.banUser(
      targetUserId,
      req.user._id,
      reason || null,
      duration ? duration * 60 * 1000 : null // Convert minutes to ms
    );
    
    // Emit socket event for real-time update
    const { emitToSession } = require('../config/socket');
    emitToSession(session._id.toString(), 'session:userBanned', {
      userId: targetUserId,
      bannedBy: req.user._id,
      reason,
    });
    
    res.status(200).json({
      success: true,
      message: 'User banned successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/sessions/:id/unban/:userId
 * @desc    Unban user from session
 * @access  Private (Host, Moderator, Admin)
 */
router.post('/:id/unban/:userId', requireAuth, isHost, async (req, res, next) => {
  try {
    const session = req.session;
    const result = await session.unbanUser(req.params.userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.reason,
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User unbanned successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/sessions/:id/mute/:userId
 * @desc    Mute user in session
 * @access  Private (Host, Moderator, Admin)
 */
router.post('/:id/mute/:userId', requireAuth, isHost, async (req, res, next) => {
  try {
    const { duration } = req.body;
    const session = req.session;
    const targetUserId = req.params.userId;
    
    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot mute yourself',
      });
    }
    
    const result = await session.muteUser(
      targetUserId,
      req.user._id,
      duration ? duration * 60 * 1000 : null
    );
    
    // Emit socket event
    const { emitToSession } = require('../config/socket');
    emitToSession(session._id.toString(), 'session:userMuted', {
      userId: targetUserId,
      mutedBy: req.user._id,
      duration,
    });
    
    res.status(200).json({
      success: true,
      message: 'User muted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/sessions/:id/unmute/:userId
 * @desc    Unmute user in session
 * @access  Private (Host, Moderator, Admin)
 */
router.post('/:id/unmute/:userId', requireAuth, isHost, async (req, res, next) => {
  try {
    const session = req.session;
    const result = await session.unmuteUser(req.params.userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.reason,
      });
    }
    
    // Emit socket event
    const { emitToSession } = require('../config/socket');
    emitToSession(session._id.toString(), 'session:userUnmuted', {
      userId: req.params.userId,
    });
    
    res.status(200).json({
      success: true,
      message: 'User unmuted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/sessions/:id/promote/:userId
 * @desc    Promote participant to session moderator
 * @access  Private (Host or Admin only)
 */
router.post('/:id/promote/:userId', requireAuth, isHostOnly, async (req, res, next) => {
  try {
    const session = req.session;
    const targetUserId = req.params.userId;
    
    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot promote yourself',
      });
    }
    
    const result = await session.promoteToModerator(targetUserId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.reason,
      });
    }
    
    // Emit socket event
    const { emitToSession } = require('../config/socket');
    emitToSession(session._id.toString(), 'session:userPromoted', {
      userId: targetUserId,
      promotedBy: req.user._id,
      newRole: 'moderator',
    });
    
    res.status(200).json({
      success: true,
      message: 'User promoted to session moderator',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/sessions/:id/demote/:userId
 * @desc    Demote session moderator to participant
 * @access  Private (Host or Admin only)
 */
router.post('/:id/demote/:userId', requireAuth, isHostOnly, async (req, res, next) => {
  try {
    const session = req.session;
    const targetUserId = req.params.userId;
    
    const result = await session.demoteToParticipant(targetUserId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.reason,
      });
    }
    
    // Emit socket event
    const { emitToSession } = require('../config/socket');
    emitToSession(session._id.toString(), 'session:userDemoted', {
      userId: targetUserId,
      demotedBy: req.user._id,
      newRole: 'participant',
    });
    
    res.status(200).json({
      success: true,
      message: 'User demoted to participant',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/sessions/:id/banned
 * @desc    Get list of banned users in session
 * @access  Private (Host, Moderator, Admin)
 */
router.get('/:id/banned', requireAuth, isHost, async (req, res, next) => {
  try {
    const Session = require('../models/Session');
    const session = await Session.findById(req.params.id)
      .populate('moderation.bannedUsers.user', 'username displayName avatar')
      .populate('moderation.bannedUsers.bannedBy', 'username displayName')
      .select('moderation.bannedUsers');
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        bannedUsers: session.moderation?.bannedUsers || [],
        count: session.moderation?.bannedUsers?.length || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// =============================================
// VOTING ROUTES (All authenticated users)
// =============================================

/**
 * @route   POST /api/sessions/:id/vote
 * @desc    Vote for a song/submission
 * @access  Private (All authenticated users)
 */
router.post('/:id/vote', requireAuth, vote);

/**
 * @route   DELETE /api/sessions/:id/vote/:targetId
 * @desc    Remove vote from a song/submission
 * @access  Private (All authenticated users)
 */
router.delete('/:id/vote/:targetId', requireAuth, removeVote);

/**
 * @route   GET /api/sessions/:id/votes
 * @desc    Get user's votes for a session
 * @access  Private
 */
router.get('/:id/votes', requireAuth, getUserVotes);

/**
 * @route   GET /api/sessions/:id/votes/leaderboard
 * @desc    Get vote leaderboard for session
 * @access  Public
 */
router.get('/:id/votes/leaderboard', optionalAuth, getVoteLeaderboard);

// =============================================
// FEEDBACK ROUTES
// =============================================

/**
 * @route   POST /api/sessions/:id/feedback
 * @desc    Submit feedback for a session
 * @access  Private (All authenticated users)
 */
router.post('/:id/feedback', requireAuth, submitFeedback);

/**
 * @route   GET /api/sessions/:id/feedback
 * @desc    Get session feedback (limited for non-hosts)
 * @access  Public (detailed for Host/Mod/Admin)
 */
router.get('/:id/feedback', optionalAuth, async (req, res, next) => {
  try {
    const Session = require('../models/Session');
    const session = await Session.findById(req.params.id)
      .populate('feedback.user', 'username displayName avatar')
      .select('feedback host stats.averageRating stats.totalFeedback');
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }
    
    // Check if user can see detailed feedback
    const isHost = req.user && session.host.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === 'admin';
    const isModerator = req.user && req.user.role === 'moderator';
    const canViewDetails = isHost || isAdmin || isModerator;
    
    if (canViewDetails) {
      // Return full feedback details
      res.status(200).json({
        success: true,
        data: {
          feedback: session.feedback,
          stats: {
            averageRating: session.stats?.averageRating || 0,
            totalFeedback: session.stats?.totalFeedback || session.feedback?.length || 0,
          },
        },
      });
    } else {
      // Return only aggregate stats for non-privileged users
      const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      session.feedback?.forEach(f => {
        if (ratingCounts[f.rating] !== undefined) {
          ratingCounts[f.rating]++;
        }
      });
      
      res.status(200).json({
        success: true,
        data: {
          stats: {
            averageRating: session.stats?.averageRating || 0,
            totalFeedback: session.feedback?.length || 0,
            ratingDistribution: ratingCounts,
          },
        },
      });
    }
  } catch (error) {
    next(error);
  }
});

// =============================================
// LYRICS ROUTES
// =============================================

/**
 * @route   GET /api/sessions/:id/lyrics
 * @desc    Get all lyrics submissions for a session
 * @access  Public
 */
router.get('/:id/lyrics', optionalAuth, getSessionLyrics);

/**
 * @route   GET /api/sessions/:id/lyrics/results
 * @desc    Get voting results for lyrics
 * @access  Public
 */
router.get('/:id/lyrics/results', optionalAuth, getVotingResults);

/**
 * @route   POST /api/sessions/:id/lyrics
 * @desc    Submit lyrics to a session
 * @access  Private (All authenticated users)
 */
router.post('/:id/lyrics', requireAuth, submitLyrics);

/**
 * @route   GET /api/sessions/:id/lyrics/:lyricsId
 * @desc    Get single lyrics submission
 * @access  Public
 */
router.get('/:id/lyrics/:lyricsId', optionalAuth, getLyricsById);

/**
 * @route   PUT /api/sessions/:id/lyrics/:lyricsId
 * @desc    Update lyrics submission
 * @access  Private (Author or Admin)
 */
router.put('/:id/lyrics/:lyricsId', requireAuth, updateLyrics);

/**
 * @route   DELETE /api/sessions/:id/lyrics/:lyricsId
 * @desc    Delete lyrics submission
 * @access  Private (Author, Host, or Admin)
 */
router.delete('/:id/lyrics/:lyricsId', requireAuth, deleteLyrics);

// =============================================
// LYRICS VOTING ROUTES
// =============================================

/**
 * @route   POST /api/sessions/:id/lyrics/:lyricsId/vote
 * @desc    Vote for a lyrics submission
 * @access  Private (All authenticated users)
 */
router.post('/:id/lyrics/:lyricsId/vote', requireAuth, castVote);

/**
 * @route   DELETE /api/sessions/:id/lyrics/:lyricsId/vote
 * @desc    Remove vote from lyrics submission
 * @access  Private (All authenticated users)
 */
router.delete('/:id/lyrics/:lyricsId/vote', requireAuth, removeLyricsVote);

/**
 * @route   POST /api/sessions/:id/lyrics/:lyricsId/feedback
 * @desc    Add feedback to lyrics submission
 * @access  Private (All authenticated users)
 */
router.post('/:id/lyrics/:lyricsId/feedback', requireAuth, addLyricsFeedback);

// =============================================
// SONG GENERATION ROUTES
// =============================================

/**
 * @route   POST /api/sessions/:id/generate
 * @desc    Trigger song generation
 * @access  Private (Host, Moderator, Admin)
 */
router.post('/:id/generate', requireAuth, isHost, triggerGeneration);

/**
 * @route   GET /api/sessions/:id/generation-status
 * @desc    Get generation status
 * @access  Public
 */
router.get('/:id/generation-status', optionalAuth, getGenerationStatus);

/**
 * @route   POST /api/sessions/:id/cancel-generation
 * @desc    Cancel ongoing generation
 * @access  Private (Host, Moderator, Admin)
 */
router.post('/:id/cancel-generation', requireAuth, isHost, cancelSessionGeneration);

// =============================================
// SONG QUEUE ROUTES
// =============================================

/**
 * @route   GET /api/sessions/:id/songs
 * @desc    Get session song queue
 * @access  Public
 */
router.get('/:id/songs', optionalAuth, getSessionSongs);

/**
 * @route   GET /api/sessions/:id/songs/results
 * @desc    Get song voting results
 * @access  Public
 */
router.get('/:id/songs/results', optionalAuth, getSongResults);

/**
 * @route   POST /api/sessions/:id/songs
 * @desc    Add song to queue
 * @access  Private (All users if allowSongRequests, otherwise Host/Mod/Admin)
 */
router.post('/:id/songs', requireAuth, addSong);

/**
 * @route   DELETE /api/sessions/:id/songs/:songId
 * @desc    Remove song from queue
 * @access  Private (Host, Moderator, Admin, or song owner)
 */
router.delete('/:id/songs/:songId', requireAuth, canModifySession, removeSong);

/**
 * @route   PUT /api/sessions/:id/songs/reorder
 * @desc    Reorder song queue
 * @access  Private (Host, Moderator, Admin)
 */
router.put('/:id/songs/reorder', requireAuth, isHost, reorderSongs);

/**
 * @route   POST /api/sessions/:id/songs/:songId/vote
 * @desc    Vote for a song in queue
 * @access  Private (All authenticated users)
 */
router.post('/:id/songs/:songId/vote', requireAuth, async (req, res, next) => {
  try {
    const Session = require('../models/Session');
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }
    
    // Check if voting is enabled
    const canVote = session.canVote(req.user._id);
    if (!canVote.allowed) {
      return res.status(400).json({
        success: false,
        message: canVote.reason,
      });
    }
    
    // Calculate vote weight
    const voteWeight = req.user.calculateVoteWeight ? req.user.calculateVoteWeight() : 1;
    
    const result = await session.voteForSong(req.params.songId, req.user._id, voteWeight);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.reason,
      });
    }
    
    // Emit socket event
    const { emitToSession } = require('../config/socket');
    emitToSession(session._id.toString(), 'session:songVoted', {
      songId: req.params.songId,
      userId: req.user._id,
      voteCount: result.voteCount,
    });
    
    res.status(200).json({
      success: true,
      message: 'Vote recorded',
      data: { voteCount: result.voteCount },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/sessions/:id/songs/:songId/vote
 * @desc    Remove vote from a song in queue
 * @access  Private (All authenticated users)
 */
router.delete('/:id/songs/:songId/vote', requireAuth, async (req, res, next) => {
  try {
    const Session = require('../models/Session');
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }
    
    const result = await session.removeVoteFromSong(req.params.songId, req.user._id);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.reason,
      });
    }
    
    // Emit socket event
    const { emitToSession } = require('../config/socket');
    emitToSession(session._id.toString(), 'session:songVoteRemoved', {
      songId: req.params.songId,
      userId: req.user._id,
      voteCount: result.voteCount,
    });
    
    res.status(200).json({
      success: true,
      message: 'Vote removed',
      data: { voteCount: result.voteCount },
    });
  } catch (error) {
    next(error);
  }
});

// =============================================
// STEM/AUDIO UPLOAD ROUTES
// =============================================

/**
 * @route   GET /api/sessions/:id/stems
 * @desc    Get session stems
 * @access  Public
 */
router.get('/:id/stems', optionalAuth, getSessionStems);

/**
 * @route   POST /api/sessions/:id/stems
 * @desc    Upload stem to session
 * @access  Private (Host, Moderator, Admin, or if allowed by settings)
 */
router.post('/:id/stems', requireAuth, uploadStem);

/**
 * @route   POST /api/sessions/:id/upload-project
 * @desc    Upload project file
 * @access  Private (Host, Moderator, Admin)
 */
router.post('/:id/upload-project', requireAuth, isHost, uploadProjectFile);

/**
 * @route   POST /api/sessions/:id/upload-audio
 * @desc    Upload audio file
 * @access  Private (Host, Moderator, Admin)
 */
router.post('/:id/upload-audio', requireAuth, isHost, uploadAudioFile);

// =============================================
// ELEMENT VOTING ROUTES
// =============================================

/**
 * @route   GET /api/sessions/:id/element-options
 * @desc    Get element options for session
 * @access  Public
 */
router.get('/:id/element-options', optionalAuth, getElementOptions);

/**
 * @route   POST /api/sessions/:id/element-options
 * @desc    Create element options
 * @access  Private (Host, Moderator, Admin)
 */
router.post('/:id/element-options', requireAuth, isHost, createElementOptions);

/**
 * @route   POST /api/sessions/:id/element-options/submit
 * @desc    Submit user option
 * @access  Private (All authenticated users)
 */
router.post('/:id/element-options/submit', requireAuth, submitUserOption);

/**
 * @route   POST /api/sessions/:id/element-options/:optionId/vote
 * @desc    Vote for element option
 * @access  Private (All authenticated users)
 */
router.post('/:id/element-options/:optionId/vote', requireAuth, voteElementOption);

/**
 * @route   DELETE /api/sessions/:id/element-options/:optionId/vote
 * @desc    Remove vote from element option
 * @access  Private (All authenticated users)
 */
router.delete('/:id/element-options/:optionId/vote', requireAuth, removeElementOptionVote);

/**
 * @route   GET /api/sessions/:id/element-results
 * @desc    Get element voting results
 * @access  Public
 */
router.get('/:id/element-results', optionalAuth, getElementResults);

// =============================================
// ELEMENT COMPETITION ROUTES
// =============================================

/**
 * @route   GET /api/sessions/:id/element-competitions
 * @desc    Get competitions for session
 * @access  Public
 */
router.get('/:id/element-competitions', optionalAuth, getCompetitions);

/**
 * @route   POST /api/sessions/:id/element-competitions
 * @desc    Create competition
 * @access  Private (Host, Moderator, Admin)
 */
router.post('/:id/element-competitions', requireAuth, isHost, createCompetition);

/**
 * @route   GET /api/sessions/:id/granular-breakdown
 * @desc    Get granular breakdown
 * @access  Public
 */
router.get('/:id/granular-breakdown', optionalAuth, getGranularBreakdown);

// =============================================
// WORD CLOUD/FEEDBACK ROUTES
// =============================================

/**
 * @route   POST /api/sessions/:id/wordcloud/start
 * @desc    Start word cloud/feedback collection
 * @access  Private (Host, Moderator, Admin)
 */
router.post('/:id/wordcloud/start', requireAuth, isHost, startWordFeedback);

/**
 * @route   POST /api/sessions/:id/wordcloud/stop
 * @desc    Stop word cloud/feedback collection
 * @access  Private (Host, Moderator, Admin)
 */
router.post('/:id/wordcloud/stop', requireAuth, isHost, stopWordFeedback);

/**
 * @route   POST /api/sessions/:id/wordcloud/words
 * @desc    Submit words for word cloud
 * @access  Public (or authenticated based on session settings)
 */
router.post('/:id/wordcloud/words', optionalAuth, submitWords);

/**
 * @route   GET /api/sessions/:id/wordcloud/words
 * @desc    Get submitted words
 * @access  Public
 */
router.get('/:id/wordcloud/words', optionalAuth, getWords);

/**
 * @route   GET /api/sessions/:id/wordcloud/stats
 * @desc    Get word cloud statistics
 * @access  Public
 */
router.get('/:id/wordcloud/stats', optionalAuth, getFeedbackStats);

/**
 * @route   GET /api/sessions/:id/wordcloud/suggestions
 * @desc    Get word suggestions
 * @access  Public
 */
router.get('/:id/wordcloud/suggestions', optionalAuth, getSuggestions);

/**
 * @route   GET /api/sessions/:id/wordcloud/stream
 * @desc    Stream real-time word cloud updates
 * @access  Public
 */
router.get('/:id/wordcloud/stream', optionalAuth, streamUpdates);

/**
 * @route   DELETE /api/sessions/:id/wordcloud/word/:word
 * @desc    Delete a word from word cloud
 * @access  Private (Host, Moderator, Admin)
 */
router.delete('/:id/wordcloud/word/:word', requireAuth, isHost, deleteWord);

// Legacy feedback routes (keeping for backward compatibility)
router.post('/:id/feedback/start', requireAuth, isHost, startWordFeedback);
router.post('/:id/feedback/stop', requireAuth, isHost, stopWordFeedback);
router.post('/:id/feedback/words', optionalAuth, submitWords);
router.get('/:id/feedback/words', optionalAuth, getWords);
router.get('/:id/feedback/stats', optionalAuth, getFeedbackStats);
router.get('/:id/feedback/suggestions', optionalAuth, getSuggestions);
router.get('/:id/feedback/stream', optionalAuth, streamUpdates);
router.delete('/:id/feedback/word/:word', requireAuth, isHost, deleteWord);

// =============================================
// EXPORT ROUTER
// =============================================

module.exports = router;