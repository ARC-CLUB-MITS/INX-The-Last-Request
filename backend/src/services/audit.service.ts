import { EventEmitter } from 'events';
import { PoolClient } from 'pg';
import { pool } from '../db/pool';
import { AuditAction, ResourceAuditLog, ResourceStatus } from '../types';

export const realtimeEmitter = new EventEmitter();
realtimeEmitter.setMaxListeners(1000); // Support high number of connected frontend SSE clients

export interface CreateAuditEntryParams {
  resourceId: string;
  resourceCode: string;
  userId: string;
  action: AuditAction;
  previousStatus: ResourceStatus | null;
  newStatus: ResourceStatus | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, any>;
}

export class AuditService {
  /**
   * Records an immutable audit log within the caller's transaction context.
   */
  static async recordAuditLog(
    client: PoolClient,
    params: CreateAuditEntryParams
  ): Promise<ResourceAuditLog> {
    const auditId = 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    const createdAt = new Date().toISOString();
    const query = `
      INSERT INTO resource_audit_logs (
        id,
        resource_id,
        resource_code,
        user_id,
        action,
        previous_status,
        new_status,
        idempotency_key,
        metadata,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const values = [
      auditId,
      params.resourceId,
      params.resourceCode,
      params.userId,
      params.action,
      params.previousStatus,
      params.newStatus,
      params.idempotencyKey || null,
      JSON.stringify(params.metadata || {}),
      createdAt,
    ];

    const res = await client.query(query, values);
    const log: ResourceAuditLog = res.rows[0];

    return log;
  }

  /**
   * Fetches recent audit logs with pagination and optional filters
   */
  static async getAuditLogs(options: {
    limit?: number;
    offset?: number;
    resourceId?: string;
    userId?: string;
  }): Promise<{ logs: ResourceAuditLog[]; total: number }> {
    const limit = Math.min(options.limit || 50, 200);
    const offset = options.offset || 0;

    let whereClauses: string[] = [];
    let params: any[] = [];
    let paramIdx = 1;

    if (options.resourceId) {
      whereClauses.push(`resource_id = $${paramIdx++}`);
      params.push(options.resourceId);
    }
    if (options.userId) {
      whereClauses.push(`user_id = $${paramIdx++}`);
      params.push(options.userId);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) AS total FROM resource_audit_logs ${whereStr}`;
    const dataQuery = `
      SELECT * FROM resource_audit_logs
      ${whereStr}
      ORDER BY created_at DESC, id DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    const dataResult = await pool.query(dataQuery, [...params, limit, offset]);

    return {
      logs: dataResult.rows,
      total,
    };
  }

  /**
   * Broadcasts real-time events to connected clients
   */
  static broadcastEvent(type: 'RESOURCE_ALLOCATED' | 'RESOURCE_CANCELLED' | 'SYSTEM_RESET', payload: any) {
    realtimeEmitter.emit('stream_event', {
      type,
      payload,
      timestamp: new Date().toISOString(),
    });
  }
}
