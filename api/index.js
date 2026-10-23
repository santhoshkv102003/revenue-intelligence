import { app } from '../backend/src/server.js';
import { connectDB } from '../backend/src/config/db.js';
import { Conversation } from '../backend/src/models/Conversation.js';
import { seedDatabase } from '../backend/src/data/seedRunner.js';

let isInitialized = false;

async function ensureInitialized() {
  if (isInitialized) return;

  await connectDB();

  try {
    const count = await Conversation.countDocuments({});
    if (count === 0) {
      console.log('Database empty. Running initial synthetic seed...');
      await seedDatabase();
    }
  } catch (err) {
    console.warn('Initial seed check error:', err.message);
  }

  isInitialized = true;
}

export default async function handler(req, res) {
  try {
    await ensureInitialized();
  } catch (err) {
    console.error('API Serverless Initialization Error:', err);
    return res.status(500).json({
      error: 'Backend Initialization Error',
      message: err.message,
      hint: !process.env.MONGODB_URI
        ? 'Please configure the MONGODB_URI environment variable in your Vercel Project Settings (e.g. free MongoDB Atlas cluster).'
        : undefined
    });
  }

  return app(req, res);
}
