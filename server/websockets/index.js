const {
  handleChatMessage,
  handleVote,
  handleWordCloudSubmission,
  handlePresence,
  handleTimerSync,
  handleContributionSubmitted,
  getRecentMessages,
  getWordCloud,
} = require('./handlers');

/**
 * Initialize WebSocket event handlers
 * @param {Object} io - Socket.io server instance
 */
const initializeWebSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`WebSocket connected: ${socket.id}`);

    // Chat handlers
    socket.on('chat:send', (data) => handleChatMessage(socket, data));

    // Voting handlers
    socket.on('vote:submit', (data) => handleVote(socket, data));

    // Word cloud handlers
    socket.on('wordcloud:submit', (data) => handleWordCloudSubmission(socket, data));

    // Presence handlers
    socket.on('presence:update', (data) => handlePresence(socket, data));

    // Timer sync handlers
    socket.on('timer:sync', (data) => handleTimerSync(socket, data));

    // Contribution handlers
    socket.on('contribution:submitted', (data) => handleContributionSubmitted(socket, data));

    // Request handlers - for fetching current state
    socket.on('chat:getRecent', async ({ sessionId }, callback) => {
      const messages = await getRecentMessages(sessionId);
      if (typeof callback === 'function') {
        callback({ messages });
      }
    });

    socket.on('wordcloud:get', async ({ sessionId }, callback) => {
      const wordCloud = await getWordCloud(sessionId);
      if (typeof callback === 'function') {
        callback({ wordCloud });
      }
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      console.log(`WebSocket disconnected: ${socket.id}, reason: ${reason}`);
    });
  });
};

module.exports = {
  initializeWebSocketHandlers,
};

