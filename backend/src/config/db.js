import mongoose from 'mongoose';

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
    const conn = await mongoose.connect(mongoUri);
    console.log(`[SLD System Backend] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[SLD System Backend] Database Connection Failed: ${error.message}`);
    // Exiting the process on connection failure in production, or retrying in development
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export default connectDB;
