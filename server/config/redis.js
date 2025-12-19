const Redis = require('ioredis');
const config = require('./index');

let redisClient = null;
let redisSubscriber = null;
let connectionErrorLogged = false;

const createRedisClient = (options = {}) => {
  const client = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 3) return null; // Stop retrying after 3 attempts
      return Math.min(times * 200, 1000);
    },
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 3000,
    ...options,
  });

  client.on('ready', () => {
    connectionErrorLogged = false;
    console.log('Redis connected');
  });

  client.on('error', (err) => {
    // Only log the first error to avoid spam
    if (!connectionErrorLogged) {
      console.warn('Redis unavailable:', err.message);
      connectionErrorLogged = true;
    }
  });

  return client;
};

const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = createRedisClient();
    try {
      // Add timeout to prevent hanging
      const connectPromise = redisClient.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 3000)
      );
      await Promise.race([connectPromise, timeoutPromise]);
    } catch (error) {
      if (!connectionErrorLogged) {
        console.warn('Redis unavailable:', error.message);
        connectionErrorLogged = true;
      }
      redisClient = null;
      return null;
    }
  }
  
  // Check if client is actually connected
  if (redisClient && redisClient.status !== 'ready') {
    return null;
  }
  
  return redisClient;
};

const getRedisSubscriber = async () => {
  if (!redisSubscriber) {
    redisSubscriber = createRedisClient({ enableOfflineQueue: false });
    try {
      await redisSubscriber.connect();
    } catch (error) {
      if (!connectionErrorLogged) {
        console.warn('Redis subscriber unavailable:', error.message);
        connectionErrorLogged = true;
      }
      return null;
    }
  }
  return redisSubscriber;
};

// Cache helper functions
const cache = {
  get: async (key) => {
    try {
      const client = await getRedisClient();
      if (!client) return null;
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },
  
  set: async (key, value, ttlSeconds = 3600) => {
    try {
      const client = await getRedisClient();
      if (!client) return false;
      await client.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  
  del: async (key) => {
    try {
      const client = await getRedisClient();
      if (!client) return false;
      await client.del(key);
      return true;
    } catch {
      return false;
    }
  },
  
  exists: async (key) => {
    try {
      const client = await getRedisClient();
      if (!client) return false;
      return await client.exists(key);
    } catch {
      return false;
    }
  },
};

// Pub/Sub helper functions
const pubsub = {
  publish: async (channel, message) => {
    try {
      const client = await getRedisClient();
      if (!client) return false;
      await client.publish(channel, JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  },
  
  subscribe: async (channel, callback) => {
    try {
      const subscriber = await getRedisSubscriber();
      if (!subscriber) return false;
      await subscriber.subscribe(channel);
      subscriber.on('message', (ch, message) => {
        if (ch === channel) {
          callback(JSON.parse(message));
        }
      });
      return true;
    } catch {
      return false;
    }
  },
};

const closeRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
    }
    if (redisSubscriber) {
      await redisSubscriber.quit();
      redisSubscriber = null;
    }
  } catch (error) {
    console.error('Error closing Redis connections:', error.message);
  }
};

module.exports = {
  getRedisClient,
  getRedisSubscriber,
  cache,
  pubsub,
  closeRedis,
};
