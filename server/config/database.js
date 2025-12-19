const mongoose = require('mongoose');
const config = require('./index');

let isConnected = false;
let connectionPromise = null;

const connectDatabase = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('Using existing database connection');
    return mongoose.connection;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      const options = {
        // Connection pooling
        maxPoolSize: 10,
        minPoolSize: 5,
        
        // Timeouts - increased for slower connections
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        
        // Buffering - ENABLED to queue operations while connecting
        bufferCommands: true,
        
        // Heartbeat
        heartbeatFrequencyMS: 10000,
        
        // Auto-indexing (disable in production)
        autoIndex: config.nodeEnv === 'development',
      };

      console.log('Connecting to MongoDB...');
      console.log(`URI: ${config.mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
      
      const conn = await mongoose.connect(config.mongoUri, options);
      isConnected = true;

      console.log(`✓ MongoDB Connected: ${conn.connection.host}`);

      // Connection event handlers
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
        isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Attempting to reconnect...');
        isConnected = false;
        connectionPromise = null;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
        isConnected = true;
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        try {
          await mongoose.connection.close();
          console.log('MongoDB connection closed through app termination');
        } catch (err) {
          console.error('Error closing MongoDB connection:', err);
        }
      });

      return conn;
    } catch (error) {
      console.error('✗ Error connecting to MongoDB:', error.message);
      console.error('');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('  MongoDB Connection Failed!');
      console.error('');
      console.error('  Please check your server/.env file and ensure MONGO_URI');
      console.error('  is set correctly:');
      console.error('');
      console.error('  Option 1 - MongoDB Atlas (Recommended):');
      console.error('    MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/crowdbeat');
      console.error('');
      console.error('  Option 2 - Local MongoDB:');
      console.error('    MONGO_URI=mongodb://127.0.0.1:27017/crowdbeat');
      console.error('');
      console.error('  Get a free MongoDB Atlas cluster at: https://mongodb.com/atlas');
      console.error('═══════════════════════════════════════════════════════════');
      console.error('');
      isConnected = false;
      connectionPromise = null;
      return null;
    }
  })();

  return connectionPromise;
};

const isDatabaseConnected = () => isConnected;

const getConnection = () => mongoose.connection;

module.exports = { 
  connectDatabase, 
  isDatabaseConnected,
  getConnection,
};
