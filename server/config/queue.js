const Bull = require('bull');
const config = require('./index');

let audioQueue = null;
let aiQueue = null;
let queuesInitialized = false;

const initializeQueue = async () => {
  // Skip queue initialization if Redis URL is not available
  if (!config.redisUrl) {
    console.warn('⚠ Redis URL not configured - job queues disabled');
    queuesInitialized = false;
    return;
  }

  try {
    const redisConfig = {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      retryDelayOnFailover: 100,
      connectTimeout: 3000,
    };

    // Parse Redis URL if provided
    try {
      const url = new URL(config.redisUrl);
      redisConfig.host = url.hostname || 'localhost';
      redisConfig.port = parseInt(url.port) || 6379;
      if (url.password) redisConfig.password = url.password;
    } catch {
      // Use default config if URL parsing fails
    }

    audioQueue = new Bull('audio-processing', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    aiQueue = new Bull('ai-generation', {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    // Only log errors once, not repeatedly
    let audioErrorLogged = false;
    let aiErrorLogged = false;

    audioQueue.on('error', (error) => {
      if (!audioErrorLogged) {
        console.warn('Audio queue unavailable:', error.message);
        audioErrorLogged = true;
      }
    });

    aiQueue.on('error', (error) => {
      if (!aiErrorLogged) {
        console.warn('AI queue unavailable:', error.message);
        aiErrorLogged = true;
      }
    });

    audioQueue.on('ready', () => {
      audioErrorLogged = false;
    });

    aiQueue.on('ready', () => {
      aiErrorLogged = false;
    });

    queuesInitialized = true;
    console.log('✓ Job queue initialized');
  } catch (error) {
    console.warn('⚠ Failed to initialize job queues:', error.message);
    queuesInitialized = false;
  }
};

const getAudioQueue = () => {
  return audioQueue;
};

const getAiQueue = () => {
  return aiQueue;
};

const isQueuesInitialized = () => queuesInitialized;

const closeQueues = async () => {
  try {
    if (audioQueue) {
      await audioQueue.close();
      audioQueue = null;
    }
    if (aiQueue) {
      await aiQueue.close();
      aiQueue = null;
    }
    queuesInitialized = false;
  } catch (error) {
    console.error('Error closing queues:', error.message);
  }
};

module.exports = {
  initializeQueue,
  getAudioQueue,
  getAiQueue,
  isQueuesInitialized,
  closeQueues,
};
