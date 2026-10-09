import fs from 'fs';
import path from 'path';
import { pool, isInMemoryActive } from './pool';

export async function runMigrations(): Promise<void> {
  console.log('[Migration] Initiating schema migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (!isInMemoryActive()) {
      // Execute full native schema.sql with PostgreSQL extensions & PL/pgSQL blocks
      const schemaPath = path.resolve(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
    } else {
      // Clean standard DDL for embedded in-memory PostgreSQL engine
      await client.query(`
        CREATE TABLE IF NOT EXISTS resources (
          id VARCHAR(64) PRIMARY KEY,
          resource_code VARCHAR(32) NOT NULL UNIQUE,
          name VARCHAR(128) NOT NULL,
          tier VARCHAR(32) NOT NULL DEFAULT 'CRYOPOD_STANDARD',
          status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
          allocated_to_user_id VARCHAR(128) DEFAULT NULL,
          allocated_user_name VARCHAR(128) DEFAULT NULL,
          allocated_at TIMESTAMPTZ DEFAULT NULL,
          idempotency_key VARCHAR(128) DEFAULT NULL UNIQUE,
          version INT NOT NULL DEFAULT 1,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS resource_audit_logs (
          id VARCHAR(64) PRIMARY KEY,
          resource_id VARCHAR(64) NOT NULL,
          resource_code VARCHAR(32) NOT NULL,
          user_id VARCHAR(128) NOT NULL,
          action VARCHAR(32) NOT NULL,
          previous_status VARCHAR(32),
          new_status VARCHAR(32),
          idempotency_key VARCHAR(128),
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS system_config (
          key VARCHAR(64) PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    await client.query('COMMIT');
    console.log('✅ [Migration] Schema migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [Migration] Schema migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
