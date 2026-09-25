import mongoose from 'mongoose';
import dns from 'dns';
import { env } from './env';
import { logger } from '../utils/logger';

// Ensure standard public DNS servers are used for resolving MongoDB SRV records on Windows local development
if (process.platform === 'win32' && env.NODE_ENV !== 'production') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch {
    // Ignore if custom DNS cannot be set
  }
}

let isConnected = false;

export const connectDatabase = async (): Promise<void> => {
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  try {
    mongoose.set('strictQuery', true);
    logger.info(`Attempting database connection to: ${env.MONGODB_URI}`);
    
    // Set a 5-second serverSelectionTimeoutMS so if local/remote MongoDB is unreachable, it fails quickly to memory fallback in dev
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    logger.info('MongoDB Atlas / Database connection successfully established.');
  } catch (error: any) {
    logger.warn(`Primary database connection failed (${error.message}). Attempting in-memory database fallback for local dev...`);
    
    if (env.NODE_ENV !== 'production') {
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        logger.info(`Starting in-memory MongoDB at: ${uri}`);
        await mongoose.connect(uri);
        isConnected = true;
        logger.info('In-memory MongoDB successfully connected for local development & testing.');
      } catch (memError: any) {
        logger.error('Failed to initialize in-memory MongoDB:', memError.message);
        throw error;
      }
    } else {
      logger.error('Database connection failed in production mode:', error.message);
      throw error;
    }
  }

  mongoose.connection.on('error', (err) => {
    logger.error('Mongoose connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('Mongoose disconnected. Reconnecting...');
    isConnected = false;
  });
};
