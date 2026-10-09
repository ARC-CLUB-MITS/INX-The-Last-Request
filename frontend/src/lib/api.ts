import { AllocationResult, Resource, ResourceAuditLog, SystemStats } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';

export class ApiClient {
  static async getResources(): Promise<Resource[]> {
    const res = await fetch(`${API_BASE}/resources`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch resources: ${res.statusText}`);
    const json = await res.json();
    return json.data;
  }

  static async getStats(): Promise<SystemStats> {
    const res = await fetch(`${API_BASE}/stats`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
    const json = await res.json();
    return json.data;
  }

  static async getAuditLogs(limit = 50, offset = 0): Promise<{ logs: ResourceAuditLog[]; total: number }> {
    const res = await fetch(`${API_BASE}/audit-logs?limit=${limit}&offset=${offset}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch audit logs: ${res.statusText}`);
    return res.json();
  }

  static async allocateSpecific(resourceId: string, payload: { userId: string; userName?: string; idempotencyKey?: string }): Promise<AllocationResult> {
    const res = await fetch(`${API_BASE}/resources/${resourceId}/allocate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  static async autoAllocate(payload: { userId: string; userName?: string; tier?: string; idempotencyKey?: string }): Promise<AllocationResult> {
    const res = await fetch(`${API_BASE}/resources/auto-allocate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  static async cancelAllocation(resourceId: string, payload: { userId: string; reason?: string; isAdmin?: boolean }): Promise<AllocationResult> {
    const res = await fetch(`${API_BASE}/resources/${resourceId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  static async resetSystem(): Promise<{ success: boolean; totalReset: number }> {
    const res = await fetch(`${API_BASE}/system/reset`, {
      method: 'POST',
    });
    return res.json();
  }

  static getEventSource(): EventSource {
    return new EventSource(`${API_BASE}/events`);
  }
}
