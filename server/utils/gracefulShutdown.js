/**
 * Graceful Shutdown Handler for CrowdBeat
 * Ensures clean shutdown of all connections and processes
 */

const mongoose = require('mongoose');
const { cacheService } = require('../services/cacheService');

let isShuttingDown = false;
let server = null;
let connections = new Set();

/**
 * Track connections for graceful shutdown
 */
const trackConnections = (httpServer) => {
  server = httpServer;

  httpServer.on('connection', (connection) => {
    connections.add(connection);
    connection.on('close', () => {
      connections.delete(connection);
    });
  });
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    console.log('Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Create timeout for forced shutdown
  const forceShutdownTimeout = setTimeout(() => {
    console.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000); // 30 second timeout

  try {
    // Step 1: Stop accepting new connections
    if (server) {
      console.log('Stopping HTTP server...');
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('HTTP server stopped');
    }

    // Step 2: Close existing connections gracefully
    console.log(`Closing ${connections.size} active connections...`);
    for (const connection of connections) {
      connection.end();
    }

    // Wait a moment for connections to close
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Force close remaining connections
    for (const connection of connections) {
      connection.destroy();
    }
    console.log('Active connections closed');

    // Step 3: Close Redis connection
    console.log('Closing Redis connection...');
    await cacheService.disconnect();
    console.log('Redis connection closed');

    // Step 4: Close MongoDB connection
    console.log('Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('MongoDB connection closed');

    // Step 5: Clear timeout and exit
    clearTimeout(forceShutdownTimeout);
    console.log('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    clearTimeout(forceShutdownTimeout);
    process.exit(1);
  }
};

/**
 * Setup shutdown handlers
 */
const setupShutdownHandlers = (httpServer) => {
  trackConnections(httpServer);

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't shutdown on unhandled rejections in production
    // but log them for monitoring
    if (process.env.NODE_ENV !== 'production') {
      gracefulShutdown('UNHANDLED_REJECTION');
    }
  });
};

/**
 * Check if server is shutting down
 */
const isServerShuttingDown = () => isShuttingDown;

module.exports = {
  setupShutdownHandlers,
  gracefulShutdown,
  isServerShuttingDown,
  trackConnections,
};

