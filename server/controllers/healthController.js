const { isDatabaseConnected } = require('../config/database');
const { getRedisClient } = require('../config/redis');
const { getQueueStats } = require('../config/queue');

const getHealthStatus = async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: {
        status: 'unknown',
        message: '',
      },
      redis: {
        status: 'unknown',
        message: '',
      },
      queues: null,
    },
  };

  // Check MongoDB
  try {
    const dbConnected = isDatabaseConnected();
    health.services.database = {
      status: dbConnected ? 'connected' : 'disconnected',
      message: dbConnected ? 'MongoDB is connected' : 'MongoDB is not connected',
    };
    if (!dbConnected) health.status = 'degraded';
  } catch (error) {
    health.services.database = {
      status: 'error',
      message: error.message,
    };
    health.status = 'degraded';
  }

  // Check Redis (with timeout to prevent hanging)
  try {
    const redisCheckPromise = (async () => {
      const redisClient = await getRedisClient();
      return redisClient && redisClient.status === 'ready';
    })();
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis check timeout')), 2000)
    );
    
    const redisReady = await Promise.race([redisCheckPromise, timeoutPromise]).catch(() => false);
    
    if (redisReady) {
      health.services.redis = {
        status: 'connected',
        message: 'Redis is connected',
      };
    } else {
      health.services.redis = {
        status: 'disconnected',
        message: 'Redis is not connected',
      };
      health.status = 'degraded';
    }
  } catch (error) {
    health.services.redis = {
      status: 'disconnected',
      message: error.message || 'Redis unavailable',
    };
    health.status = 'degraded';
  }

  // Check Queues
  try {
    health.services.queues = await getQueueStats();
  } catch {
    health.services.queues = null;
  }

  // Return 200 for healthy/degraded (server running), 503 only for critical failure
  const statusCode = health.status === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json(health);
};

// Liveness probe (simple check)
const getLiveness = (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
};

// Readiness probe (check if ready to serve traffic)
const getReadiness = async (req, res) => {
  const dbConnected = isDatabaseConnected();
  
  if (dbConnected) {
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ status: 'not ready', message: 'Database not connected' });
  }
};

module.exports = {
  getHealthStatus,
  getLiveness,
  getReadiness,
};
