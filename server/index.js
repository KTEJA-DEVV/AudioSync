require('dotenv').config();
const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { connectDatabase, isDatabaseConnected } = require('./config/database');
const { getRedisClient, closeRedis } = require('./config/redis');
const { initializeSocketIO } = require('./config/socket');
const { initializeQueue } = require('./config/queue');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');
const { applyRateLimiting } = require('./middleware/rateLimiter');
const apiRoutes = require('./routes');
const setupWebSocketHandlers = require('./websockets/handlers');

// Middleware to check database connection
const checkDatabaseConnection = (req, res, next) => {
  // Skip check for health endpoint
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }
  
  // Check if mongoose is connected
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: 'Database not connected',
      message: 'The server is starting up or the database connection failed. Please check your MongoDB configuration.',
      hint: 'Ensure MONGO_URI is set correctly in server/.env file',
    });
  }
  next();
};

const app = express();
const server = http.createServer(app);

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS Configuration for React Frontend
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [config.clientUrl, 'http://localhost:5173', 'http://localhost:5174'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// Request Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// JSON Body Parser with 50mb limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Socket.io
const io = initializeSocketIO(server, corsOptions);
setupWebSocketHandlers(io);

// Make io available to routes
app.set('io', io);

// Apply rate limiting to API requests
app.use('/api', applyRateLimiting);

// Check database connection before processing API requests
app.use('/api', checkDatabaseConnection);

// API Routes
app.use('/api', apiRoutes);

// Serve static files for local uploads
app.use('/uploads', express.static('uploads'));

// Error Handling Middleware (must be last)
app.use(errorHandler);

// Server Start Function
const startServer = async () => {
  try {
    // Connect to MongoDB
    const dbConnection = await connectDatabase();
    if (dbConnection) {
      console.log('✓ MongoDB connected');
    } else {
      console.error('');
      console.error('⚠️  MongoDB not connected!');
      console.error('   API endpoints requiring database will return 503 errors.');
      console.error('   Please set a valid MONGO_URI in server/.env');
      console.error('');
    }

    // Connect to Redis
    const redisClient = await getRedisClient();
    if (redisClient) {
      console.log('✓ Redis connected');
    } else {
      console.warn('⚠ Redis not connected - some features may be limited');
    }

    // Initialize Job Queue
    initializeQueue();
    console.log('✓ Job queue initialized');

    // Start server
    server.listen(config.port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎵 CrowdBeat Server Running                             ║
║                                                           ║
║   Environment: ${config.nodeEnv.padEnd(40)}║
║   Port: ${String(config.port).padEnd(47)}║
║   Client URL: ${config.clientUrl.padEnd(41)}║
║                                                           ║
║   API: http://localhost:${config.port}/api${' '.repeat(27)}║
║   Health: http://localhost:${config.port}/api/health${' '.repeat(20)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received: closing HTTP server gracefully`);
  
  server.close(async () => {
    console.log('HTTP server closed');
    await closeRedis();
    console.log('Redis connections closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
