import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';
import { Conversation } from './models/Conversation.js';
import { seedDatabase, writeSampleDataFiles } from './data/seedRunner.js';

import conversationRoutes from './routes/conversationRoutes.js';
import importRoutes from './routes/importRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';
import routingRoutes from './routes/routingRoutes.js';
import findingsRoutes from './routes/findingsRoutes.js';
import followUpRoutes from './routes/followUpRoutes.js';
import exportRoutes from './routes/exportRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Revenue Intelligence Inbox Backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Mount Core API Routes
app.use('/api/conversations', conversationRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/routing', routingRoutes);
app.use('/api/findings', findingsRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/exports', exportRoutes);

// Admin Dev Seed Endpoint
app.post('/api/admin/seed', async (req, res) => {
  try {
    const batch = await seedDatabase();
    res.json({ message: 'Database reset and seeded with 52 realistic conversations', batch });
  } catch (err) {
    res.status(500).json({ error: 'Failed to seed database', message: err.message });
  }
});

// Download sample data files endpoint
app.get('/api/sample-files/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const sampleFilePath1 = path.resolve(__dirname, '../../sample-data', safeFilename);
  const sampleFilePath2 = path.resolve(process.cwd(), 'sample-data', safeFilename);
  const targetPath = fs.existsSync(sampleFilePath1) ? sampleFilePath1 : sampleFilePath2;

  if (fs.existsSync(targetPath)) {
    res.download(targetPath, safeFilename);
  } else {
    res.status(404).json({ error: 'Sample file not found' });
  }
});

// Serve static frontend build if available (unified fullstack)
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Server Initialization
async function startServer() {
  await connectDB();

  // Generate sample CSV/JSON files on disk
  await writeSampleDataFiles();

  // If database is empty, seed automatically
  const count = await Conversation.countDocuments({});
  if (count === 0) {
    console.log('Database is empty. Running initial synthetic seed...');
    await seedDatabase();
  } else {
    console.log(`Database already initialized with ${count} conversations.`);
  }

  const PORT = ENV.PORT;
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` Revenue Intelligence Inbox API Server`);
    console.log(` Server running on http://localhost:${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

// Start if executed directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { app, startServer };
