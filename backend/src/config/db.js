import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ENV } from './env.js';

let mongodInstance = null;

export async function connectDB() {
  // Reuse existing connection in serverless warm starts
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  try {
    if (ENV.MONGODB_URI) {
      console.log('Connecting to provided MONGODB_URI...');
      await mongoose.connect(ENV.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000
      });
      console.log('MongoDB connected successfully via MONGODB_URI.');
      return mongoose.connection;
    }

    if (process.env.VERCEL) {
      throw new Error(
        'MONGODB_URI is not set. On Vercel, an external database connection string (such as MongoDB Atlas) is required in Vercel Project Settings because serverless functions cannot execute local in-memory databases.'
      );
    }

    // Default to in-memory MongoDB for local evaluation and automated reproducibility
    console.log('No external MONGODB_URI provided. Initializing local MongoDB instance...');
    mongodInstance = await MongoMemoryServer.create();
    const uri = mongodInstance.getUri();
    await mongoose.connect(uri);
    console.log(`Connected to local MongoDB instance at: ${uri}`);
    return mongoose.connection;
  } catch (err) {
    if (process.env.VERCEL) {
      throw err;
    }
    console.warn(`Connection to primary DB failed (${err.message}). Attempting MongoMemoryServer fallback...`);
    try {
      if (!mongodInstance) {
        mongodInstance = await MongoMemoryServer.create();
      }
      const uri = mongodInstance.getUri();
      await mongoose.connect(uri);
      console.log(`Fallback: Connected to local MongoMemoryServer at: ${uri}`);
      return mongoose.connection;
    } catch (fallbackErr) {
      console.error('Fatal: Failed to initialize MongoDB connection:', fallbackErr);
      throw fallbackErr;
    }
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
}
