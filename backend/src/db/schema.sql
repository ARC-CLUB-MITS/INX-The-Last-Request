-- ============================================================================
-- INX: THE LAST REQUEST - HIGH-CONCURRENCY RESOURCE ALLOCATION SCHEMA
-- Database: PostgreSQL (14+)
-- Engine Guarantee: Zero double-allocations, Row-Level Locks, Full Audit Trail
-- ============================================================================

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for Resource Status
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_status') THEN
        CREATE TYPE resource_status AS ENUM ('AVAILABLE', 'ALLOCATED', 'MAINTENANCE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
        CREATE TYPE audit_action AS ENUM ('REQUESTED', 'ALLOCATED', 'CANCELLED', 'RELEASED', 'CONFLICT_REJECTED', 'SYSTEM_RESET');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_tier') THEN
        CREATE TYPE resource_tier AS ENUM ('APEX_COMMAND', 'ORBITAL_CORE', 'CRYOPOD_STANDARD');
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- TABLE: resources
-- Primary storage for the finite resource pool (e.g. 100 Cryo-Stasis Units)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resources (
    id VARCHAR(64) PRIMARY KEY,
    resource_code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    tier resource_tier NOT NULL DEFAULT 'CRYOPOD_STANDARD',
    status resource_status NOT NULL DEFAULT 'AVAILABLE',
    allocated_to_user_id VARCHAR(128) DEFAULT NULL,
    allocated_user_name VARCHAR(128) DEFAULT NULL,
    allocated_at TIMESTAMPTZ DEFAULT NULL,
    idempotency_key VARCHAR(128) DEFAULT NULL UNIQUE,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Invariant Integrity Constraint: Status and ownership must stay in lockstep
    CONSTRAINT chk_resource_state_integrity CHECK (
        (status = 'AVAILABLE' AND allocated_to_user_id IS NULL AND allocated_at IS NULL) OR
        (status = 'ALLOCATED' AND allocated_to_user_id IS NOT NULL AND allocated_at IS NOT NULL) OR
        (status = 'MAINTENANCE')
    )
);

-- Indexes for ultra-fast locking and filtered scans
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
CREATE INDEX IF NOT EXISTS idx_resources_tier_status ON resources(tier, status);
CREATE INDEX IF NOT EXISTS idx_resources_allocated_user ON resources(allocated_to_user_id);

-- ----------------------------------------------------------------------------
-- TABLE: resource_audit_logs
-- Append-only immutable ledger recording every state mutation
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id VARCHAR(64) NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    resource_code VARCHAR(32) NOT NULL,
    user_id VARCHAR(128) NOT NULL,
    action audit_action NOT NULL,
    previous_status resource_status,
    new_status resource_status,
    idempotency_key VARCHAR(128),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_resource_id ON resource_audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON resource_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON resource_audit_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- TABLE: system_config
-- Dynamic runtime configuration for simulation parameters
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_config (key, value)
VALUES ('scenario_metadata', '{
    "scenario_title": "INX: The Last Request - Project Aegis Cryo-Stasis Core",
    "total_slots": 100,
    "lock_strategy": "PESSIMISTIC_ROW_LOCK_SKIP_LOCKED",
    "mission_deadline": "2026-12-31T23:59:59Z",
    "status": "OPERATIONAL"
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
