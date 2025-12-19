/**
 * Health Check Routes for CrowdBeat
 * Provides endpoints for monitoring service health
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { cacheService } = require('../services/cacheService');
const os = require('os');

/**
 * @desc    Basic health check
 * @route   GET /api/health
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * @desc    Detailed health check with all service statuses
 * @route   GET /api/health/full
 * @access  Public (but should be protected in production via IP whitelist)
 */
router.get('/full', async (req, res) => {
  const startTime = Date.now();

  // Database health
  let dbHealth = { status: 'unknown' };
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    
    if (dbState === 1) {
      // Test actual query
      const pingStart = Date.now();
      await mongoose.connection.db.admin().ping();
      const pingTime = Date.now() - pingStart;
      
      dbHealth = {
        status: 'healthy',
        state: states[dbState],
        responseTime: `${pingTime}ms`,
      };
    } else {
      dbHealth = {
        status: 'unhealthy',
        state: states[dbState] || 'unknown',
      };
    }
  } catch (error) {
    dbHealth = {
      status: 'error',
      error: error.message,
    };
  }

  // Redis/Cache health
  let cacheHealth;
  try {
    cacheHealth = await cacheService.healthCheck();
  } catch (error) {
    cacheHealth = {
      status: 'error',
      error: error.message,
    };
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  const systemMem = {
    total: os.totalmem(),
    free: os.freemem(),
    usedPercent: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(2),
  };

  // Overall status
  const isHealthy = dbHealth.status === 'healthy';
  const overallStatus = isHealthy ? 'healthy' : 'degraded';

  const responseTime = Date.now() - startTime;

  res.status(isHealthy ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: {
      seconds: Math.floor(process.uptime()),
      formatted: formatUptime(process.uptime()),
    },
    services: {
      database: dbHealth,
      cache: cacheHealth,
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      cpuCores: os.cpus().length,
      memory: {
        process: {
          heapUsed: formatBytes(memUsage.heapUsed),
          heapTotal: formatBytes(memUsage.heapTotal),
          external: formatBytes(memUsage.external),
          rss: formatBytes(memUsage.rss),
        },
        system: {
          total: formatBytes(systemMem.total),
          free: formatBytes(systemMem.free),
          usedPercent: `${systemMem.usedPercent}%`,
        },
      },
      loadAverage: os.loadavg(),
    },
  });
});

/**
 * @desc    Readiness probe for Kubernetes/load balancers
 * @route   GET /api/health/ready
 * @access  Public
 */
router.get('/ready', async (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  
  if (dbReady) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', reason: 'Database not connected' });
  }
});

/**
 * @desc    Liveness probe for Kubernetes
 * @route   GET /api/health/live
 * @access  Public
 */
router.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Helper functions
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let value = bytes;
  
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  
  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

module.exports = router;
