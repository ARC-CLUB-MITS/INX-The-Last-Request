"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const resource_controller_1 = require("../controllers/resource.controller");
exports.apiRouter = (0, express_1.Router)();
// Resource discovery & direct operations
exports.apiRouter.get('/resources', resource_controller_1.ResourceController.listResources);
exports.apiRouter.get('/resources/:id', resource_controller_1.ResourceController.getResource);
exports.apiRouter.post('/resources/:id/allocate', resource_controller_1.ResourceController.allocateSpecific);
exports.apiRouter.post('/resources/:id/cancel', resource_controller_1.ResourceController.cancel);
// High-concurrency auto allocation (SKIP LOCKED)
exports.apiRouter.post('/resources/auto-allocate', resource_controller_1.ResourceController.autoAllocate);
// Real-time telemetry & auditing
exports.apiRouter.get('/stats', resource_controller_1.ResourceController.getStats);
exports.apiRouter.get('/audit-logs', resource_controller_1.ResourceController.getAuditLogs);
exports.apiRouter.get('/events', resource_controller_1.ResourceController.streamEvents);
// System operations
exports.apiRouter.post('/system/reset', resource_controller_1.ResourceController.resetSystem);
