import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { apiRouter } from './routes/api';
import { pool, checkDatabaseConnection } from './db/pool';
import { runMigrations } from './db/migrate';
import { seedResources } from './db/seed';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test' && !req.url.includes('/events')) {
      console.log(`[HTTP] ${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbConnected = await checkDatabaseConnection();
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'HEALTHY' : 'DEGRADED',
    service: 'INX: The Last Request - Allocation Engine',
    database: dbConnected ? 'CONNECTED' : 'DISCONNECTED',
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.',
  });
});

// Server Initialization
export async function startServer() {
  console.log('🚀 Starting INX: The Last Request Resource Allocation Engine...');
  
  try {
    console.log('⚡ Initializing Database Schema and Seeding Resources...');
    await seedResources(config.totalResources);
    console.log('✅ Database Engine Ready.');
  } catch (err) {
    console.warn('⚠️ Auto-seed check warning:', err);
  }

  const server = app.listen(config.port, () => {
    console.log(`📡 Allocation Service running on http://localhost:${config.port}`);
    console.log(`📊 Health Endpoint: http://localhost:${config.port}/health`);
    console.log(`⚡ API Endpoints: http://localhost:${config.port}/api/resources`);
  });

  return server;
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  });
}

export default app;
