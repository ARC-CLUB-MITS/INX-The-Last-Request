"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceController = void 0;
const zod_1 = require("zod");
const allocation_service_1 = require("../services/allocation.service");
const audit_service_1 = require("../services/audit.service");
const AllocateSpecificSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, 'User ID is required'),
    userName: zod_1.z.string().optional(),
    idempotencyKey: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
const AllocateAutoSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, 'User ID is required'),
    userName: zod_1.z.string().optional(),
    tier: zod_1.z.enum(['APEX_COMMAND', 'ORBITAL_CORE', 'CRYOPOD_STANDARD']).optional(),
    idempotencyKey: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
const CancelSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1, 'User ID is required'),
    reason: zod_1.z.string().optional(),
    isAdmin: zod_1.z.boolean().optional(),
});
class ResourceController {
    /**
     * GET /api/resources
     * Lists all resources with real-time status
     */
    static async listResources(req, res) {
        try {
            const resources = await allocation_service_1.AllocationService.getAllResources();
            res.status(200).json({
                success: true,
                count: resources.length,
                data: resources,
            });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
    /**
     * GET /api/resources/:id
     * Retrieves single resource details
     */
    static async getResource(req, res) {
        try {
            const id = req.params.id;
            const resource = await allocation_service_1.AllocationService.getResourceById(id);
            if (!resource) {
                res.status(404).json({ success: false, message: `Resource ${id} not found.` });
                return;
            }
            res.status(200).json({ success: true, data: resource });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
    /**
     * POST /api/resources/:id/allocate
     * Allocates a specific resource using SELECT ... FOR UPDATE
     */
    static async allocateSpecific(req, res) {
        try {
            const id = req.params.id;
            const parseResult = AllocateSpecificSchema.safeParse(req.body);
            if (!parseResult.success) {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: parseResult.error.errors,
                });
                return;
            }
            const { userId, userName, idempotencyKey, metadata } = parseResult.data;
            const result = await allocation_service_1.AllocationService.allocateSpecificResource({
                resourceId: id,
                userId,
                userName,
                idempotencyKey,
                metadata: {
                    ...metadata,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                },
            });
            res.status(result.statusCode).json(result);
        }
        catch (error) {
            res.status(500).json({
                status: 'FAILED',
                statusCode: 500,
                message: error.message,
                executionTimestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * POST /api/resources/auto-allocate
     * Allocates next available resource using SELECT ... FOR UPDATE SKIP LOCKED
     */
    static async autoAllocate(req, res) {
        try {
            const parseResult = AllocateAutoSchema.safeParse(req.body);
            if (!parseResult.success) {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: parseResult.error.errors,
                });
                return;
            }
            const { userId, userName, tier, idempotencyKey, metadata } = parseResult.data;
            const result = await allocation_service_1.AllocationService.allocateNextAvailableResource({
                userId,
                userName,
                tier,
                idempotencyKey,
                metadata: {
                    ...metadata,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                },
            });
            res.status(result.statusCode).json(result);
        }
        catch (error) {
            res.status(500).json({
                status: 'FAILED',
                statusCode: 500,
                message: error.message,
                executionTimestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * POST /api/resources/:id/cancel
     * Releases an allocation back to the pool
     */
    static async cancel(req, res) {
        try {
            const id = req.params.id;
            const parseResult = CancelSchema.safeParse(req.body);
            if (!parseResult.success) {
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: parseResult.error.errors,
                });
                return;
            }
            const { userId, reason, isAdmin } = parseResult.data;
            const result = await allocation_service_1.AllocationService.cancelAllocation({
                resourceId: id,
                userId,
                reason,
                isAdmin,
            });
            res.status(result.statusCode).json(result);
        }
        catch (error) {
            res.status(500).json({
                status: 'FAILED',
                statusCode: 500,
                message: error.message,
                executionTimestamp: new Date().toISOString(),
            });
        }
    }
    /**
     * GET /api/stats
     * Provides real-time capacity and tier metrics
     */
    static async getStats(req, res) {
        try {
            const stats = await allocation_service_1.AllocationService.getSystemStats();
            res.status(200).json({ success: true, data: stats });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
    /**
     * GET /api/audit-logs
     * Retrieves paginated audit logs
     */
    static async getAuditLogs(req, res) {
        try {
            const limit = parseInt(req.query.limit || '50', 10);
            const offset = parseInt(req.query.offset || '0', 10);
            const resourceId = req.query.resourceId;
            const userId = req.query.userId;
            const result = await audit_service_1.AuditService.getAuditLogs({ limit, offset, resourceId, userId });
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
    /**
     * POST /api/system/reset
     * Resets all allocations for testing and demo flows
     */
    static async resetSystem(req, res) {
        try {
            const result = await allocation_service_1.AllocationService.resetAllResources();
            res.status(200).json({ message: 'Resource pool successfully reset.', ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
    /**
     * GET /api/events
     * Server-Sent Events (SSE) stream for zero-latency live updates
     */
    static streamEvents(req, res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();
        // Send initial handshake
        res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE stream connected' })}\n\n`);
        const listener = (eventData) => {
            res.write(`data: ${JSON.stringify(eventData)}\n\n`);
        };
        audit_service_1.realtimeEmitter.on('stream_event', listener);
        // Keepalive heartbeat every 15 seconds
        const heartbeat = setInterval(() => {
            res.write(': heartbeat\n\n');
        }, 15000);
        req.on('close', () => {
            clearInterval(heartbeat);
            audit_service_1.realtimeEmitter.off('stream_event', listener);
        });
    }
}
exports.ResourceController = ResourceController;
