/**
 * Hype Calculation Service for CrowdBeat Live Sessions
 * Calculates and broadcasts hype level based on engagement metrics
 */

const LiveSession = require('../models/LiveSession');
const ChatMessage = require('../models/ChatMessage');
const Reaction = require('../models/Reaction');
const { emitToRoom } = require('../config/socket');

// Weights for hype calculation
const WEIGHTS = {
  messagesPerMinute: 0.3,    // 30% weight
  reactionsPerMinute: 0.35,  // 35% weight
  votingParticipation: 0.2,  // 20% weight
  viewerTrend: 0.15,         // 15% weight
};

// Thresholds for normalization
const THRESHOLDS = {
  messagesPerMinute: {
    low: 5,
    medium: 15,
    high: 40,
    max: 100,
  },
  reactionsPerMinute: {
    low: 10,
    medium: 30,
    high: 80,
    max: 200,
  },
  votingParticipation: {
    low: 0.1,   // 10% of viewers voting
    medium: 0.3,
    high: 0.5,
    max: 0.8,
  },
};

// Track previous viewer counts for trend calculation
const viewerHistory = new Map(); // sessionId -> [{ count, timestamp }]

/**
 * Normalize a value to 0-100 scale based on thresholds
 */
const normalizeValue = (value, thresholds) => {
  if (value <= 0) return 0;
  if (value <= thresholds.low) return (value / thresholds.low) * 25;
  if (value <= thresholds.medium) return 25 + ((value - thresholds.low) / (thresholds.medium - thresholds.low)) * 25;
  if (value <= thresholds.high) return 50 + ((value - thresholds.medium) / (thresholds.high - thresholds.medium)) * 30;
  if (value <= thresholds.max) return 80 + ((value - thresholds.high) / (thresholds.max - thresholds.high)) * 20;
  return 100;
};

/**
 * Calculate viewer trend (-1 to 1 scale)
 */
const calculateViewerTrend = (sessionId, currentViewers) => {
  const history = viewerHistory.get(sessionId) || [];
  const now = Date.now();
  
  // Add current data point
  history.push({ count: currentViewers, timestamp: now });
  
  // Keep only last 2 minutes of data
  const twoMinutesAgo = now - 120000;
  const recentHistory = history.filter(h => h.timestamp >= twoMinutesAgo);
  viewerHistory.set(sessionId, recentHistory);
  
  if (recentHistory.length < 2) return 0;
  
  // Calculate trend using simple linear regression
  const n = recentHistory.length;
  const oldAvg = recentHistory.slice(0, Math.floor(n / 2)).reduce((s, h) => s + h.count, 0) / Math.floor(n / 2);
  const newAvg = recentHistory.slice(Math.floor(n / 2)).reduce((s, h) => s + h.count, 0) / (n - Math.floor(n / 2));
  
  // Normalize to -1 to 1
  const change = (newAvg - oldAvg) / Math.max(oldAvg, 1);
  return Math.max(-1, Math.min(1, change));
};

/**
 * Get messages per minute for a session
 */
const getMessagesPerMinute = async (sessionId) => {
  const oneMinuteAgo = new Date(Date.now() - 60000);
  const count = await ChatMessage.countDocuments({
    session: sessionId,
    createdAt: { $gte: oneMinuteAgo },
    isDeleted: false,
  });
  return count;
};

/**
 * Get voting participation rate
 */
const getVotingParticipation = async (session) => {
  const activeRound = session.votingRounds.find(r => r.status === 'active');
  if (!activeRound || session.engagement.currentViewers === 0) return 0;
  
  const totalVotes = activeRound.voters?.length || 0;
  return totalVotes / session.engagement.currentViewers;
};

/**
 * Calculate hype level for a session
 */
const calculateHypeLevel = async (sessionId) => {
  try {
    const session = await LiveSession.findById(sessionId);
    if (!session || session.status !== 'live') {
      return null;
    }

    // Get metrics
    const messagesPerMinute = await getMessagesPerMinute(sessionId);
    const reactionsPerMinute = await Reaction.getReactionsPerMinute(sessionId);
    const votingParticipation = await getVotingParticipation(session);
    const viewerTrend = calculateViewerTrend(sessionId, session.engagement.currentViewers);

    // Normalize metrics
    const normalizedMessages = normalizeValue(messagesPerMinute, THRESHOLDS.messagesPerMinute);
    const normalizedReactions = normalizeValue(reactionsPerMinute, THRESHOLDS.reactionsPerMinute);
    const normalizedVoting = normalizeValue(votingParticipation, THRESHOLDS.votingParticipation);
    const normalizedTrend = (viewerTrend + 1) * 50; // Convert -1 to 1 to 0 to 100

    // Calculate weighted hype level
    const hypeLevel = Math.round(
      normalizedMessages * WEIGHTS.messagesPerMinute +
      normalizedReactions * WEIGHTS.reactionsPerMinute +
      normalizedVoting * WEIGHTS.votingParticipation +
      normalizedTrend * WEIGHTS.viewerTrend
    );

    return {
      hypeLevel: Math.min(100, Math.max(0, hypeLevel)),
      metrics: {
        messagesPerMinute,
        reactionsPerMinute,
        votingParticipation: Math.round(votingParticipation * 100),
        viewerTrend: Math.round(viewerTrend * 100),
      },
      normalized: {
        messages: Math.round(normalizedMessages),
        reactions: Math.round(normalizedReactions),
        voting: Math.round(normalizedVoting),
        trend: Math.round(normalizedTrend),
      },
    };
  } catch (error) {
    console.error('Error calculating hype level:', error);
    return null;
  }
};

/**
 * Update hype for a session and broadcast
 */
const updateAndBroadcastHype = async (sessionId) => {
  const result = await calculateHypeLevel(sessionId);
  if (!result) return;

  const session = await LiveSession.findById(sessionId);
  if (!session) return;

  // Only update if changed significantly (more than 2 points)
  const previousHype = session.engagement.hypeLevel;
  if (Math.abs(result.hypeLevel - previousHype) < 2) return;

  // Update in database
  await session.updateHype(result.hypeLevel);

  // Broadcast to session room
  emitToRoom(sessionId, 'hype:update', {
    hypeLevel: result.hypeLevel,
    previousLevel: previousHype,
    metrics: result.metrics,
  });

  // Check for hype milestones
  if (previousHype < 80 && result.hypeLevel >= 80) {
    await session.addHighlight('milestone', 'Hype level reached 80!');
    emitToRoom(sessionId, 'hype:milestone', { level: 80 });
  }
  if (previousHype < 100 && result.hypeLevel >= 100) {
    await session.addHighlight('milestone', 'Maximum hype achieved!');
    emitToRoom(sessionId, 'hype:milestone', { level: 100 });
  }

  return result;
};

// Store interval references for cleanup
const hypeIntervals = new Map();

/**
 * Start hype calculation loop for a session (every 5 seconds)
 */
const startHypeLoop = (sessionId) => {
  if (hypeIntervals.has(sessionId)) return;
  
  const interval = setInterval(() => {
    updateAndBroadcastHype(sessionId);
  }, 5000);
  
  hypeIntervals.set(sessionId, interval);
  console.log(`Hype calculation started for session ${sessionId}`);
};

/**
 * Stop hype calculation loop for a session
 */
const stopHypeLoop = (sessionId) => {
  const interval = hypeIntervals.get(sessionId);
  if (interval) {
    clearInterval(interval);
    hypeIntervals.delete(sessionId);
    viewerHistory.delete(sessionId);
    console.log(`Hype calculation stopped for session ${sessionId}`);
  }
};

/**
 * Get hype level description
 */
const getHypeDescription = (level) => {
  if (level >= 100) return { label: 'MAX HYPE!', color: 'rainbow' };
  if (level >= 80) return { label: 'On Fire!', color: 'red' };
  if (level >= 50) return { label: 'Getting Hot', color: 'orange' };
  if (level >= 20) return { label: 'Warming Up', color: 'yellow' };
  return { label: 'Chill', color: 'gray' };
};

module.exports = {
  calculateHypeLevel,
  updateAndBroadcastHype,
  startHypeLoop,
  stopHypeLoop,
  getHypeDescription,
  WEIGHTS,
  THRESHOLDS,
};

