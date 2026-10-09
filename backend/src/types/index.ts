export type ResourceStatus = 'AVAILABLE' | 'ALLOCATED' | 'MAINTENANCE';
export type AuditAction = 'REQUESTED' | 'ALLOCATED' | 'CANCELLED' | 'RELEASED' | 'CONFLICT_REJECTED' | 'SYSTEM_RESET';
export type ResourceTier = 'APEX_COMMAND' | 'ORBITAL_CORE' | 'CRYOPOD_STANDARD';

export interface Resource {
  id: string;
  resource_code: string;
  name: string;
  tier: ResourceTier;
  status: ResourceStatus;
  allocated_to_user_id: string | null;
  allocated_user_name: string | null;
  allocated_at: string | null;
  idempotency_key: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ResourceAuditLog {
  id: string;
  resource_id: string;
  resource_code: string;
  user_id: string;
  action: AuditAction;
  previous_status: ResourceStatus | null;
  new_status: ResourceStatus | null;
  idempotency_key: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface AllocationResult {
  status: 'SUCCESS' | 'FAILED';
  statusCode: number;
  message: string;
  resource?: Resource;
  conflictReason?: string;
  lockDurationMs?: number;
  executionTimestamp: string;
}

export interface SystemStats {
  total: number;
  available: number;
  allocated: number;
  maintenance: number;
  allocationPercentage: number;
  tierBreakdown: {
    apex: { total: number; available: number; allocated: number };
    orbital: { total: number; available: number; allocated: number };
    standard: { total: number; available: number; allocated: number };
  };
  auditLogCount: number;
}
