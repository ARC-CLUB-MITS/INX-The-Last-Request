"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.getActivePool = getActivePool;
exports.withTransaction = withTransaction;
exports.checkDatabaseConnection = checkDatabaseConnection;
exports.isInMemoryActive = isInMemoryActive;
const pg_1 = require("pg");
const pg_mem_1 = require("pg-mem");
const env_1 = require("../config/env");
let realPool = null;
let memDb = null;
let memPool = null;
let isUsingInMemoryDb = false;
function createRealPool() {
    return new pg_1.Pool(process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            max: env_1.config.db.maxConnections,
            idleTimeoutMillis: env_1.config.db.idleTimeoutMillis,
            connectionTimeoutMillis: env_1.config.db.connectionTimeoutMillis,
        }
        : {
            host: env_1.config.db.host,
            port: env_1.config.db.port,
            user: env_1.config.db.user,
            password: env_1.config.db.password,
            database: env_1.config.db.database,
            max: env_1.config.db.maxConnections,
            idleTimeoutMillis: env_1.config.db.idleTimeoutMillis,
            connectionTimeoutMillis: env_1.config.db.connectionTimeoutMillis,
        });
}
function initInMemoryDatabase() {
    if (memPool)
        return memPool;
    console.log('⚡ [Database Engine] Initializing In-Memory PostgreSQL Engine (Zero-Prerequisite Mode)...');
    memDb = (0, pg_mem_1.newDb)({
        autoCreateForeignKeyIndices: true,
    });
    // Register uuid-ossp extension
    memDb.registerExtension('uuid-ossp', (schema) => {
        schema.registerFunction({
            name: 'uuid_generate_v4',
            returns: pg_mem_1.DataType.text,
            implementation: () => 'uuid-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now(),
        });
    });
    memDb.public.registerFunction({
        name: 'uuid_generate_v4',
        returns: pg_mem_1.DataType.text,
        implementation: () => 'uuid-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now(),
    });
    const adapter = memDb.adapters.createPg();
    memPool = new adapter.Pool();
    isUsingInMemoryDb = true;
    return memPool;
}
exports.pool = {
    async query(text, params) {
        const activePool = await getActivePool();
        return activePool.query(text, params);
    },
    async connect() {
        const activePool = await getActivePool();
        return activePool.connect();
    },
    on(event, listener) {
        if (realPool)
            realPool.on(event, listener);
    },
};
async function getActivePool() {
    if (isUsingInMemoryDb && memPool) {
        return memPool;
    }
    if (!realPool) {
        realPool = createRealPool();
    }
    try {
        const probeClient = await Promise.race([
            realPool.connect(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('PG_TIMEOUT')), 1500)),
        ]);
        if (probeClient) {
            probeClient.release();
            return realPool;
        }
    }
    catch (err) {
        console.warn(`⚠️ [Database Notice] External PostgreSQL not detected. Running on Embedded In-Memory PostgreSQL.`);
        return initInMemoryDatabase();
    }
    return realPool;
}
async function withTransaction(callback) {
    const activePool = await getActivePool();
    const client = await activePool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        try {
            await client.query('ROLLBACK');
        }
        catch (rollbackErr) {
            console.error('[Transaction Rollback Error]', rollbackErr);
        }
        throw error;
    }
    finally {
        client.release();
    }
}
async function checkDatabaseConnection() {
    try {
        const activePool = await getActivePool();
        const res = await activePool.query('SELECT NOW() AS current_time');
        return !!res.rows[0]?.current_time;
    }
    catch (error) {
        return false;
    }
}
function isInMemoryActive() {
    return isUsingInMemoryDb;
}
