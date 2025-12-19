require('dotenv').config();

module.exports = {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/crowdbeat',
  
  // Authentication
  jwtSecret: process.env.JWT_SECRET || 'crowdbeat-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // Client
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // AWS S3
  aws: {
    s3Bucket: process.env.AWS_S3_BUCKET || '',
    accessKey: process.env.AWS_ACCESS_KEY || '',
    secretKey: process.env.AWS_SECRET_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
  },
  
  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  
  // Rate Limiting
  rateLimit: {
    anonymous: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50,
    },
    authenticated: {
      windowMs: 15 * 60 * 1000,
      max: 200,
    },
    premium: {
      windowMs: 15 * 60 * 1000,
      max: 1000,
    },
  },
};
