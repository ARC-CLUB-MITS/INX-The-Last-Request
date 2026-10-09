"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const api_1 = require("./routes/api");
const pool_1 = require("./db/pool");
const seed_1 = require("./db/seed");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: env_1.config.corsOrigin }));
app.use(express_1.default.json());
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
    const dbConnected = await (0, pool_1.checkDatabaseConnection)();
    res.status(dbConnected ? 200 : 503).json({
        status: dbConnected ? 'HEALTHY' : 'DEGRADED',
        service: 'INX: The Last Request - Allocation Engine',
        database: dbConnected ? 'CONNECTED' : 'DISCONNECTED',
        timestamp: new Date().toISOString(),
    });
});
// Mount API routes
app.use('/api', api_1.apiRouter);
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[Unhandled Server Error]', err);
    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message || 'An unexpected error occurred.',
    });
});
// Server Initialization
async function startServer() {
    console.log('🚀 Starting INX: The Last Request Resource Allocation Engine...');
    try {
        console.log('⚡ Initializing Database Schema and Seeding Resources...');
        await (0, seed_1.seedResources)(env_1.config.totalResources);
        console.log('✅ Database Engine Ready.');
    }
    catch (err) {
        console.warn('⚠️ Auto-seed check warning:', err);
    }
    const server = app.listen(env_1.config.port, () => {
        console.log(`📡 Allocation Service running on http://localhost:${env_1.config.port}`);
        console.log(`📊 Health Endpoint: http://localhost:${env_1.config.port}/health`);
        console.log(`⚡ API Endpoints: http://localhost:${env_1.config.port}/api/resources`);
    });
    return server;
}
if (require.main === module) {
    startServer().catch((err) => {
        console.error('Fatal initialization error:', err);
        process.exit(1);
    });
}
exports.default = app;
