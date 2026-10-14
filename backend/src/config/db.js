import mongoose from 'mongoose';
import { backfillAllMissingUniqueIds } from '../utils/backfillUniqueIds.js';

/**
 * Establishes connection to MongoDB database
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('[MongoDB Error] MONGODB_URI is not defined in the environment variables.');
    // Do not crash the application during build or validation if Mongo is not provided yet,
    // but log a clear warning so developers know it's missing.
    console.warn('[MongoDB Warning] Server is starting without database connection. MONGODB_URI is required for full functionality.');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE, 10) || 50,
      minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE, 10) || 10,
      maxIdleTimeMS: 60000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      family: 4 // Use IPv4, skip unnecessary IPv6 lookup roundtrips
    });
    console.log(`[SLD System Backend] MongoDB Connected: ${conn.connection.host}`);

    // Set up connection lifecycle monitoring
    mongoose.connection.on('disconnected', () => {
      console.warn('[SLD System Backend] MongoDB connection lost. Driver will automatically retry...');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('[SLD System Backend] MongoDB reconnected successfully.');
    });
    mongoose.connection.on('error', (err) => {
      console.error('[SLD System Backend] MongoDB runtime connection error:', err.message);
    });
    
    // Automatically verify and backfill missing Unique IDs on existing records
    backfillAllMissingUniqueIds().catch((err) => {
      console.error(`[Unique ID Backfill Error]: ${err.message}`);
    });
  } catch (error) {
    console.error(`[SLD System Backend] Database Connection Failed: ${error.message}`);
    // Exiting the process on connection failure in production, or retrying in development
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};


export default connectDB;
