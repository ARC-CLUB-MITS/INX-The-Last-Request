import { Request, Response } from 'express';
import { z } from 'zod';
import { AllocationService } from '../services/allocation.service';
import { AuditService, realtimeEmitter } from '../services/audit.service';

const AllocateSpecificSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  userName: z.string().optional(),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const AllocateAutoSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  userName: z.string().optional(),
  tier: z.enum(['APEX_COMMAND', 'ORBITAL_CORE', 'CRYOPOD_STANDARD']).optional(),
  idempotencyKey: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const CancelSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reason: z.string().optional(),
  isAdmin: z.boolean().optional(),
});

export class ResourceController {
  /**
   * GET /api/resources
   * Lists all resources with real-time status
   */
  static async listResources(req: Request, res: Response): Promise<void> {
    try {
      const resources = await AllocationService.getAllResources();
      res.status(200).json({
        success: true,
        count: resources.length,
        data: resources,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/resources/:id
   * Retrieves single resource details
   */
  static async getResource(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const resource = await AllocationService.getResourceById(id);
      if (!resource) {
        res.status(404).json({ success: false, message: `Resource ${id} not found.` });
        return;
      }
      res.status(200).json({ success: true, data: resource });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/resources/:id/allocate
   * Allocates a specific resource using SELECT ... FOR UPDATE
   */
  static async allocateSpecific(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
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

      const result = await AllocationService.allocateSpecificResource({
        resourceId: id,
        userId,
        userName,
        idempotencyKey,
        metadata: {
          ...metadata,
          ip: req.ip,
          userAgent: req.headers['user-agent'] as string | undefined,
        },
      });

      res.status(result.statusCode).json(result);
    } catch (error: any) {
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
  static async autoAllocate(req: Request, res: Response): Promise<void> {
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

      const result = await AllocationService.allocateNextAvailableResource({
        userId,
        userName,
        tier,
        idempotencyKey,
        metadata: {
          ...metadata,
          ip: req.ip,
          userAgent: req.headers['user-agent'] as string | undefined,
        },
      });

      res.status(result.statusCode).json(result);
    } catch (error: any) {
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
  static async cancel(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
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

      const result = await AllocationService.cancelAllocation({
        resourceId: id,
        userId,
        reason,
        isAdmin,
      });

      res.status(result.statusCode).json(result);
    } catch (error: any) {
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
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await AllocationService.getSystemStats();
      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/audit-logs
   * Retrieves paginated audit logs
   */
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);
      const resourceId = req.query.resourceId as string | undefined;
      const userId = req.query.userId as string | undefined;

      const result = await AuditService.getAuditLogs({ limit, offset, resourceId, userId });
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/system/reset
   * Resets all allocations for testing and demo flows
   */
  static async resetSystem(req: Request, res: Response): Promise<void> {
    try {
      const result = await AllocationService.resetAllResources();
      res.status(200).json({ message: 'Resource pool successfully reset.', ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/events
   * Server-Sent Events (SSE) stream for zero-latency live updates
   */
  static streamEvents(req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send initial handshake
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'SSE stream connected' })}\n\n`);

    const listener = (eventData: any) => {
      res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    };

    realtimeEmitter.on('stream_event', listener);

    // Keepalive heartbeat every 15 seconds
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      realtimeEmitter.off('stream_event', listener);
    });
  }
}
