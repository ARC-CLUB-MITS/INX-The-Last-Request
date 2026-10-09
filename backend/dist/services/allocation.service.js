"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllocationService = void 0;
const pool_1 = require("../db/pool");
const audit_service_1 = require("./audit.service");
// In-Process Keyed Mutex ensuring hardware-grade lock serialization in all execution modes
class AsyncKeyedMutex {
    locks = new Map();
    async runExclusive(key, fn) {
        while (this.locks.has(key)) {
            try {
                await this.locks.get(key);
            }
            catch {
                // Continue loop if previous promise errored
            }
        }
        let releaseLock = () => { };
        const lockPromise = new Promise((resolve) => {
            releaseLock = resolve;
        });
        this.locks.set(key, lockPromise);
        try {
            return await fn();
        }
        finally {
            this.locks.delete(key);
            releaseLock();
        }
    }
}
const mutex = new AsyncKeyedMutex();
class AllocationService {
    /**
     * Fetches all resources with status and current allocation metadata
     */
    static async getAllResources() {
        const query = `
      SELECT 
        id, resource_code, name, tier, status, 
        allocated_to_user_id, allocated_user_name, allocated_at, 
        idempotency_key, version, created_at, updated_at
      FROM resources
      ORDER BY id ASC;
    `;
        const result = await pool_1.pool.query(query);
        return result.rows;
    }
    /**
     * Fetches a single resource by ID
     */
    static async getResourceById(id) {
        const query = `
      SELECT 
        id, resource_code, name, tier, status, 
        allocated_to_user_id, allocated_user_name, allocated_at, 
        idempotency_key, version, created_at, updated_at
      FROM resources
      WHERE id = $1;
    `;
        const result = await pool_1.pool.query(query, [id]);
        return result.rows[0] || null;
    }
    /**
     * Allocates a SPECIFIC Resource by ID with Row-Level Locking (Pessimistic SELECT ... FOR UPDATE)
     * Prevents race conditions and double-booking even when 1,000 requests hit the same ID.
     */
    static async allocateSpecificResource(req) {
        const startTime = Date.now();
        const { resourceId, userId, userName = 'Anonymous Operative', idempotencyKey, metadata = {} } = req;
        if (!resourceId) {
            return {
                status: 'FAILED',
                statusCode: 400,
                message: 'Resource ID is required for targeted allocation',
                executionTimestamp: new Date().toISOString(),
            };
        }
        return await mutex.runExclusive(resourceId, async () => {
            try {
                return await (0, pool_1.withTransaction)(async (client) => {
                    // 1. Idempotency Check
                    if (idempotencyKey) {
                        const existingIdempotent = await client.query(`SELECT * FROM resources WHERE idempotency_key = $1;`, [idempotencyKey]);
                        if (existingIdempotent.rows.length > 0) {
                            const resource = existingIdempotent.rows[0];
                            return {
                                status: 'SUCCESS',
                                statusCode: 200,
                                message: `Idempotent request replayed. Resource ${resource.resource_code} is secured.`,
                                resource,
                                lockDurationMs: Date.now() - startTime,
                                executionTimestamp: new Date().toISOString(),
                            };
                        }
                    }
                    // 2. Acquire Row-Level Exclusive Lock
                    const lockQuery = `
            SELECT * FROM resources
            WHERE id = $1
            FOR UPDATE;
          `;
                    const lockResult = await client.query(lockQuery, [resourceId]);
                    if (lockResult.rows.length === 0) {
                        return {
                            status: 'FAILED',
                            statusCode: 404,
                            message: `Resource '${resourceId}' not found in the INX catalog.`,
                            executionTimestamp: new Date().toISOString(),
                        };
                    }
                    const currentResource = lockResult.rows[0];
                    // 3. State Consistency Check
                    if (currentResource.status !== 'AVAILABLE') {
                        await audit_service_1.AuditService.recordAuditLog(client, {
                            resourceId: currentResource.id,
                            resourceCode: currentResource.resource_code,
                            userId,
                            action: 'CONFLICT_REJECTED',
                            previousStatus: currentResource.status,
                            newStatus: currentResource.status,
                            idempotencyKey,
                            metadata: {
                                ...metadata,
                                attemptedBy: userId,
                                alreadyAllocatedTo: currentResource.allocated_to_user_id,
                                allocatedAt: currentResource.allocated_at,
                                reason: 'Resource already claimed by another operative',
                            },
                        });
                        return {
                            status: 'FAILED',
                            statusCode: 409,
                            message: `ALLOCATION_CONFLICT: Resource ${currentResource.resource_code} is already claimed by operative '${currentResource.allocated_to_user_id}'.`,
                            conflictReason: 'RESOURCE_ALREADY_ALLOCATED',
                            resource: currentResource,
                            lockDurationMs: Date.now() - startTime,
                            executionTimestamp: new Date().toISOString(),
                        };
                    }
                    // 4. Perform Atomic Mutation
                    const nowIso = new Date().toISOString();
                    const updateQuery = `
            UPDATE resources
            SET status = 'ALLOCATED',
                allocated_to_user_id = $1,
                allocated_user_name = $2,
                allocated_at = $3,
                idempotency_key = $4,
                version = version + 1,
                updated_at = $5
            WHERE id = $6
            RETURNING *;
          `;
                    const updateResult = await client.query(updateQuery, [
                        userId,
                        userName,
                        nowIso,
                        idempotencyKey || null,
                        nowIso,
                        resourceId,
                    ]);
                    const updatedResource = updateResult.rows[0];
                    // 5. Append Immutable Audit Record
                    await audit_service_1.AuditService.recordAuditLog(client, {
                        resourceId: updatedResource.id,
                        resourceCode: updatedResource.resource_code,
                        userId,
                        action: 'ALLOCATED',
                        previousStatus: 'AVAILABLE',
                        newStatus: 'ALLOCATED',
                        idempotencyKey,
                        metadata: {
                            ...metadata,
                            userName,
                            lockDurationMs: Date.now() - startTime,
                        },
                    });
                    setImmediate(() => {
                        audit_service_1.AuditService.broadcastEvent('RESOURCE_ALLOCATED', updatedResource);
                    });
                    return {
                        status: 'SUCCESS',
                        statusCode: 200,
                        message: `SUCCESS: Resource ${updatedResource.resource_code} allocated to ${userId}.`,
                        resource: updatedResource,
                        lockDurationMs: Date.now() - startTime,
                        executionTimestamp: new Date().toISOString(),
                    };
                });
            }
            catch (error) {
                console.error('[AllocationService.allocateSpecificResource Error]', error);
                return {
                    status: 'FAILED',
                    statusCode: 500,
                    message: `Internal allocation error: ${error.message}`,
                    executionTimestamp: new Date().toISOString(),
                };
            }
        });
    }
    /**
     * Allocates the NEXT AVAILABLE Resource with Non-Blocking Row Locks (SELECT ... FOR UPDATE SKIP LOCKED)
     * High-Throughput Mechanism: Eliminates lock convoying and database deadlocks during burst traffic.
     */
    static async allocateNextAvailableResource(req) {
        const startTime = Date.now();
        const { userId, userName = 'Anonymous Operative', tier, idempotencyKey, metadata = {} } = req;
        return await mutex.runExclusive('global_auto_allocate', async () => {
            try {
                return await (0, pool_1.withTransaction)(async (client) => {
                    // 1. Idempotency Check
                    if (idempotencyKey) {
                        const existingIdempotent = await client.query(`SELECT * FROM resources WHERE idempotency_key = $1;`, [idempotencyKey]);
                        if (existingIdempotent.rows.length > 0) {
                            const resource = existingIdempotent.rows[0];
                            return {
                                status: 'SUCCESS',
                                statusCode: 200,
                                message: `Idempotent request replayed. Resource ${resource.resource_code} is secured.`,
                                resource,
                                lockDurationMs: Date.now() - startTime,
                                executionTimestamp: new Date().toISOString(),
                            };
                        }
                    }
                    // 2. Select first available row
                    let selectQuery = `
            SELECT * FROM resources
            WHERE status = 'AVAILABLE'
          `;
                    const params = [];
                    if (tier) {
                        params.push(tier);
                        selectQuery += ` AND tier = $${params.length}`;
                    }
                    if (!(0, pool_1.isInMemoryActive)()) {
                        selectQuery += `
              ORDER BY id ASC
              LIMIT 1
              FOR UPDATE SKIP LOCKED;
            `;
                    }
                    else {
                        selectQuery += `
              ORDER BY id ASC
              LIMIT 1
              FOR UPDATE;
            `;
                    }
                    const lockResult = await client.query(selectQuery, params);
                    if (lockResult.rows.length === 0) {
                        const countAvailable = await client.query(`SELECT COUNT(*) FROM resources WHERE status = 'AVAILABLE';`);
                        const availableCount = parseInt(countAvailable.rows[0].count, 10);
                        return {
                            status: 'FAILED',
                            statusCode: 410,
                            message: availableCount === 0
                                ? 'CAPACITY_EXHAUSTED: All resource slots in the INX pool have been allocated.'
                                : 'RESOURCE_BUSY: All candidate resources are currently undergoing concurrent locking. Retry shortly.',
                            conflictReason: 'CAPACITY_EXHAUSTED',
                            lockDurationMs: Date.now() - startTime,
                            executionTimestamp: new Date().toISOString(),
                        };
                    }
                    const candidateResource = lockResult.rows[0];
                    // 3. Atomically Update
                    const nowIso = new Date().toISOString();
                    const updateQuery = `
            UPDATE resources
            SET status = 'ALLOCATED',
                allocated_to_user_id = $1,
                allocated_user_name = $2,
                allocated_at = $3,
                idempotency_key = $4,
                version = version + 1,
                updated_at = $5
            WHERE id = $6
            RETURNING *;
          `;
                    const updateResult = await client.query(updateQuery, [
                        userId,
                        userName,
                        nowIso,
                        idempotencyKey || null,
                        nowIso,
                        candidateResource.id,
                    ]);
                    const allocatedResource = updateResult.rows[0];
                    // 4. Audit Log
                    await audit_service_1.AuditService.recordAuditLog(client, {
                        resourceId: allocatedResource.id,
                        resourceCode: allocatedResource.resource_code,
                        userId,
                        action: 'ALLOCATED',
                        previousStatus: 'AVAILABLE',
                        newStatus: 'ALLOCATED',
                        idempotencyKey,
                        metadata: {
                            ...metadata,
                            strategy: 'SKIP_LOCKED',
                            requestedTier: tier || 'ANY',
                            lockDurationMs: Date.now() - startTime,
                        },
                    });
                    setImmediate(() => {
                        audit_service_1.AuditService.broadcastEvent('RESOURCE_ALLOCATED', allocatedResource);
                    });
                    return {
                        status: 'SUCCESS',
                        statusCode: 200,
                        message: `SUCCESS: Secured ${allocatedResource.name} (${allocatedResource.resource_code}) for ${userId}.`,
                        resource: allocatedResource,
                        lockDurationMs: Date.now() - startTime,
                        executionTimestamp: new Date().toISOString(),
                    };
                });
            }
            catch (error) {
                console.error('[AllocationService.allocateNextAvailableResource Error]', error);
                return {
                    status: 'FAILED',
                    statusCode: 500,
                    message: `Internal allocation error: ${error.message}`,
                    executionTimestamp: new Date().toISOString(),
                };
            }
        });
    }
    /**
     * Cancels and Releases an Allocation back to the Available Pool
     */
    static async cancelAllocation(req) {
        const startTime = Date.now();
        const { resourceId, userId, reason = 'Operative initiated release', isAdmin = false } = req;
        return await mutex.runExclusive(resourceId, async () => {
            try {
                return await (0, pool_1.withTransaction)(async (client) => {
                    const lockQuery = `SELECT * FROM resources WHERE id = $1 FOR UPDATE;`;
                    const lockResult = await client.query(lockQuery, [resourceId]);
                    if (lockResult.rows.length === 0) {
                        return {
                            status: 'FAILED',
                            statusCode: 404,
                            message: `Resource '${resourceId}' not found.`,
                            executionTimestamp: new Date().toISOString(),
                        };
                    }
                    const resource = lockResult.rows[0];
                    if (resource.status !== 'ALLOCATED') {
                        return {
                            status: 'FAILED',
                            statusCode: 400,
                            message: `Resource ${resource.resource_code} is not currently allocated (Status: ${resource.status}).`,
                            executionTimestamp: new Date().toISOString(),
                        };
                    }
                    if (!isAdmin && resource.allocated_to_user_id !== userId) {
                        return {
                            status: 'FAILED',
                            statusCode: 403,
                            message: `FORBIDDEN: User '${userId}' does not hold the lease for ${resource.resource_code}.`,
                            executionTimestamp: new Date().toISOString(),
                        };
                    }
                    const prevOwner = resource.allocated_to_user_id;
                    const nowIso = new Date().toISOString();
                    const updateQuery = `
            UPDATE resources
            SET status = 'AVAILABLE',
                allocated_to_user_id = NULL,
                allocated_user_name = NULL,
                allocated_at = NULL,
                idempotency_key = NULL,
                version = version + 1,
                updated_at = $1
            WHERE id = $2
            RETURNING *;
          `;
                    const updateResult = await client.query(updateQuery, [nowIso, resourceId]);
                    const releasedResource = updateResult.rows[0];
                    await audit_service_1.AuditService.recordAuditLog(client, {
                        resourceId: releasedResource.id,
                        resourceCode: releasedResource.resource_code,
                        userId,
                        action: 'CANCELLED',
                        previousStatus: 'ALLOCATED',
                        newStatus: 'AVAILABLE',
                        metadata: {
                            previousOwner: prevOwner,
                            reason,
                            releasedBy: userId,
                            isAdmin,
                            lockDurationMs: Date.now() - startTime,
                        },
                    });
                    setImmediate(() => {
                        audit_service_1.AuditService.broadcastEvent('RESOURCE_CANCELLED', releasedResource);
                    });
                    return {
                        status: 'SUCCESS',
                        statusCode: 200,
                        message: `SUCCESS: Resource ${releasedResource.resource_code} released back to pool.`,
                        resource: releasedResource,
                        lockDurationMs: Date.now() - startTime,
                        executionTimestamp: new Date().toISOString(),
                    };
                });
            }
            catch (error) {
                console.error('[AllocationService.cancelAllocation Error]', error);
                return {
                    status: 'FAILED',
                    statusCode: 500,
                    message: `Cancellation error: ${error.message}`,
                    executionTimestamp: new Date().toISOString(),
                };
            }
        });
    }
    /**
     * Resets the entire resource pool (useful for repeated test runs & live demo resets)
     */
    static async resetAllResources() {
        return await mutex.runExclusive('global_auto_allocate', async () => {
            return await (0, pool_1.withTransaction)(async (client) => {
                const nowIso = new Date().toISOString();
                await client.query(`
          UPDATE resources
          SET status = 'AVAILABLE',
              allocated_to_user_id = NULL,
              allocated_user_name = NULL,
              allocated_at = NULL,
              idempotency_key = NULL,
              version = version + 1,
              updated_at = $1;
        `, [nowIso]);
                const resourcesRes = await client.query(`SELECT id, resource_code FROM resources;`);
                const total = resourcesRes.rows.length;
                for (const row of resourcesRes.rows) {
                    await client.query(`
            INSERT INTO resource_audit_logs (id, resource_id, resource_code, user_id, action, previous_status, new_status, metadata, created_at)
            VALUES ($1, $2, $3, 'SYSTEM_ADMIN', 'SYSTEM_RESET', 'ALLOCATED', 'AVAILABLE', '{"reason": "Manual scenario reset"}'::jsonb, $4);
          `, [
                        'audit_reset_' + row.id + '_' + Date.now(),
                        row.id,
                        row.resource_code,
                        nowIso,
                    ]);
                }
                setImmediate(() => {
                    audit_service_1.AuditService.broadcastEvent('SYSTEM_RESET', { totalReset: total });
                });
                return { success: true, totalReset: total };
            });
        });
    }
    /**
     * Calculates real-time system metrics and tier breakdown
     */
    static async getSystemStats() {
        const res = await pool_1.pool.query(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available,
        SUM(CASE WHEN status = 'ALLOCATED' THEN 1 ELSE 0 END) AS allocated,
        SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS maintenance,
        SUM(CASE WHEN tier = 'APEX_COMMAND' THEN 1 ELSE 0 END) AS apex_total,
        SUM(CASE WHEN tier = 'APEX_COMMAND' AND status = 'AVAILABLE' THEN 1 ELSE 0 END) AS apex_available,
        SUM(CASE WHEN tier = 'APEX_COMMAND' AND status = 'ALLOCATED' THEN 1 ELSE 0 END) AS apex_allocated,
        SUM(CASE WHEN tier = 'ORBITAL_CORE' THEN 1 ELSE 0 END) AS orbital_total,
        SUM(CASE WHEN tier = 'ORBITAL_CORE' AND status = 'AVAILABLE' THEN 1 ELSE 0 END) AS orbital_available,
        SUM(CASE WHEN tier = 'ORBITAL_CORE' AND status = 'ALLOCATED' THEN 1 ELSE 0 END) AS orbital_allocated,
        SUM(CASE WHEN tier = 'CRYOPOD_STANDARD' THEN 1 ELSE 0 END) AS standard_total,
        SUM(CASE WHEN tier = 'CRYOPOD_STANDARD' AND status = 'AVAILABLE' THEN 1 ELSE 0 END) AS standard_available,
        SUM(CASE WHEN tier = 'CRYOPOD_STANDARD' AND status = 'ALLOCATED' THEN 1 ELSE 0 END) AS standard_allocated
      FROM resources;
    `);
        const auditCountRes = await pool_1.pool.query(`SELECT COUNT(*) AS total FROM resource_audit_logs;`);
        const row = res.rows[0];
        const total = parseInt(row.total || '0', 10);
        const allocated = parseInt(row.allocated || '0', 10);
        const available = parseInt(row.available || '0', 10);
        const maintenance = parseInt(row.maintenance || '0', 10);
        const auditLogCount = parseInt(auditCountRes.rows[0]?.total || '0', 10);
        return {
            total,
            available,
            allocated,
            maintenance,
            allocationPercentage: total > 0 ? Math.round((allocated / total) * 100) : 0,
            tierBreakdown: {
                apex: {
                    total: parseInt(row.apex_total || '0', 10),
                    available: parseInt(row.apex_available || '0', 10),
                    allocated: parseInt(row.apex_allocated || '0', 10),
                },
                orbital: {
                    total: parseInt(row.orbital_total || '0', 10),
                    available: parseInt(row.orbital_available || '0', 10),
                    allocated: parseInt(row.orbital_allocated || '0', 10),
                },
                standard: {
                    total: parseInt(row.standard_total || '0', 10),
                    available: parseInt(row.standard_available || '0', 10),
                    allocated: parseInt(row.standard_allocated || '0', 10),
                },
            },
            auditLogCount,
        };
    }
}
exports.AllocationService = AllocationService;
