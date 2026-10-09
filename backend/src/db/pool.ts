import { Pool, PoolClient } from 'pg';
import { newDb, IMemoryDb, DataType } from 'pg-mem';
import { config } from '../config/env';

let realPool: Pool | null = null;
let memDb: IMemoryDb | null = null;
let memPool: any = null;
let isUsingInMemoryDb = false;

function createRealPool(): Pool {
  return new Pool(
    process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          max: config.db.maxConnections,
          idleTimeoutMillis: config.db.idleTimeoutMillis,
          connectionTimeoutMillis: config.db.connectionTimeoutMillis,
        }
      : {
          host: config.db.host,
          port: config.db.port,
          user: config.db.user,
          password: config.db.password,
          database: config.db.database,
          max: config.db.maxConnections,
          idleTimeoutMillis: config.db.idleTimeoutMillis,
          connectionTimeoutMillis: config.db.connectionTimeoutMillis,
        }
  );
}

function initInMemoryDatabase() {
  if (memPool) return memPool;
  console.log('⚡ [Database Engine] Initializing In-Memory PostgreSQL Engine (Zero-Prerequisite Mode)...');
  
  memDb = newDb({
    autoCreateForeignKeyIndices: true,
  });
  
  // Register uuid-ossp extension
  memDb.registerExtension('uuid-ossp', (schema) => {
    schema.registerFunction({
      name: 'uuid_generate_v4',
      returns: DataType.text,
      implementation: () => 'uuid-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now(),
    });
  });

  memDb.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: DataType.text,
    implementation: () => 'uuid-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now(),
  });

  const adapter = memDb.adapters.createPg();
  memPool = new adapter.Pool();
  isUsingInMemoryDb = true;

  return memPool;
}

export const pool: any = {
  async query(text: string, params?: any[]) {
    const activePool = await getActivePool();
    return activePool.query(text, params);
  },
  async connect() {
    const activePool = await getActivePool();
    return activePool.connect();
  },
  on(event: any, listener: (...args: any[]) => void) {
    if (realPool) (realPool as any).on(event, listener);
  },
};

export async function getActivePool(): Promise<any> {
  if (isUsingInMemoryDb && memPool) {
    return memPool;
  }

  if (!realPool) {
    realPool = createRealPool();
  }

  try {
    const probeClient = await Promise.race([
      realPool.connect(),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('PG_TIMEOUT')), 1500)),
    ]);
    if (probeClient) {
      probeClient.release();
      return realPool;
    }
  } catch (err: any) {
    console.warn(`⚠️ [Database Notice] External PostgreSQL not detected. Running on Embedded In-Memory PostgreSQL.`);
    return initInMemoryDatabase();
  }

  return realPool;
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const activePool = await getActivePool();
  const client = await activePool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('[Transaction Rollback Error]', rollbackErr);
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const activePool = await getActivePool();
    const res = await activePool.query('SELECT NOW() AS current_time');
    return !!res.rows[0]?.current_time;
  } catch (error) {
    return false;
  }
}

export function isInMemoryActive(): boolean {
  return isUsingInMemoryDb;
}
