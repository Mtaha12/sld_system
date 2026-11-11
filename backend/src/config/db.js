import mongoose from 'mongoose';
import { backfillAllMissingUniqueIds } from '../utils/backfillUniqueIds.js';
import { computeAndPersistCitationStats } from '../controllers/caseController.js';

let isConnecting = false;
let reconnectTimer = null;
let watchdogTimer = null;
let listenersAttached = false;
let startupTasksDone = false;

const MONGO_OPTIONS = {
  maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE, 10) || 50,
  minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE, 10) || 5,
  maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_MS, 10) || 300000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 15000,
  serverSelectionTimeoutMS: 15000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
  family: 4, // Use IPv4 to avoid unnecessary IPv6 DNS lookup stalls
};

const runStartupTasksOnce = () => {
  if (startupTasksDone) return;
  startupTasksDone = true;

  backfillAllMissingUniqueIds().catch((err) => {
    console.error(`[Unique ID Backfill Error]: ${err.message}`);
  });

  computeAndPersistCitationStats().catch((err) => {
    console.warn(`[Citation Stats Warmup Warning]: ${err.message}`);
  });
};

const scheduleReconnect = (delayMs = 3000) => {
  if (reconnectTimer || mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (mongoose.connection.readyState === 0) {
      connectDB(Math.min(delayMs * 1.5, 15000));
    }
  }, delayMs);
  if (typeof reconnectTimer.unref === 'function') {
    reconnectTimer.unref();
  }
};

const attachLifecycleListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    console.log(`[SLD System Backend] MongoDB Connected: ${mongoose.connection.host}`);
    runStartupTasksOnce();
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[SLD System Backend] MongoDB connection lost. Scheduling automatic reconnect...');
    scheduleReconnect(3000);
  });

  mongoose.connection.on('reconnected', () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    console.log('[SLD System Backend] MongoDB reconnected successfully.');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[SLD System Backend] MongoDB runtime connection error:', err.message);
    if (mongoose.connection.readyState === 0) {
      scheduleReconnect(5000);
    }
  });

  // Periodic keep-alive watchdog guarantees VPS DB never stays disconnected after transient restarts
  if (!watchdogTimer) {
    watchdogTimer = setInterval(() => {
      if (process.env.MONGODB_URI && mongoose.connection.readyState === 0 && !isConnecting) {
        console.warn('[SLD System Backend] Watchdog detected disconnected MongoDB. Attempting reconnect...');
        connectDB(5000);
      }
    }, 30000);
    if (typeof watchdogTimer.unref === 'function') {
      watchdogTimer.unref();
    }
  }
};

/**
 * Establishes and maintains a persistent connection to the MongoDB database.
 */
const connectDB = async (retryDelayMs = 3000) => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('[MongoDB Error] MONGODB_URI is not defined in the environment variables.');
    console.warn('[MongoDB Warning] Server is starting without database connection. MONGODB_URI is required for full functionality.');
    return;
  }

  attachLifecycleListeners();

  if (isConnecting || mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  isConnecting = true;
  try {
    await mongoose.connect(mongoUri, MONGO_OPTIONS);
    runStartupTasksOnce();
  } catch (error) {
    console.error(`[SLD System Backend] Database Connection Failed: ${error.message}`);
    // Never exit PM2 process on transient DB boot/restart errors; retry with backoff until connected
    scheduleReconnect(retryDelayMs);
  } finally {
    isConnecting = false;
  }
};

export default connectDB;
