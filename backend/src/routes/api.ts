import { Router } from 'express';
import { ResourceController } from '../controllers/resource.controller';

export const apiRouter = Router();

// Resource discovery & direct operations
apiRouter.get('/resources', ResourceController.listResources);
apiRouter.get('/resources/:id', ResourceController.getResource);
apiRouter.post('/resources/:id/allocate', ResourceController.allocateSpecific);
apiRouter.post('/resources/:id/cancel', ResourceController.cancel);

// High-concurrency auto allocation (SKIP LOCKED)
apiRouter.post('/resources/auto-allocate', ResourceController.autoAllocate);

// Real-time telemetry & auditing
apiRouter.get('/stats', ResourceController.getStats);
apiRouter.get('/audit-logs', ResourceController.getAuditLogs);
apiRouter.get('/events', ResourceController.streamEvents);

// System operations
apiRouter.post('/system/reset', ResourceController.resetSystem);
