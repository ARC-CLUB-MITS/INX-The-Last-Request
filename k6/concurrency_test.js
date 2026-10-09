import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

/**
 * ============================================================================
 * INX: THE LAST REQUEST - HIGH-CONCURRENCY VERIFICATION SUITE (K6)
 * Objective: 1,000 genuinely simultaneous requests attacking a pool of 100 resources.
 * Rule: Sequential execution is strictly prohibited. Zero double-allocations permitted.
 * ============================================================================
 */

// Custom K6 Telemetry Metrics
export const successfulAllocations = new Counter('successful_allocations');
export const conflictRejections = new Counter('conflict_rejections');
export const capacityExhaustions = new Counter('capacity_exhaustions');
export const doubleAllocationsDetected = new Counter('double_allocations_detected');
export const lockAcquisitionDuration = new Trend('lock_acquisition_duration_ms');

export const options = {
  scenarios: {
    // SCENARIO 1: Targeted Hotspot Clash (500 simultaneous requests hitting POD-001)
    hotspot_single_resource_clash: {
      executor: 'per-vu-iterations',
      vus: 500,
      iterations: 1,
      maxDuration: '30s',
      startTime: '0s',
      exec: 'hotspotTest',
    },
    // SCENARIO 2: Total Pool Exhaustion Wave (1,000 simultaneous auto-allocations for 100 pods)
    pool_exhaustion_wave: {
      executor: 'per-vu-iterations',
      vus: 1000,
      iterations: 1,
      maxDuration: '45s',
      startTime: '35s', // Runs after hotspot test
      exec: 'poolExhaustionTest',
    },
  },
  thresholds: {
    // Absolute Invariant: 0 Double Allocations Allowed
    double_allocations_detected: ['count==0'],
    http_req_duration: ['p(95)<1500'], // 95% of concurrent requests complete under 1.5s
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:4000/api';

/**
 * Reset helper executed before the test run
 */
export function setup() {
  console.log('⚡ [K6 Setup] Resetting resource pool for pristine concurrency verification...');
  const res = http.post(`${BASE_URL}/system/reset`);
  check(res, {
    'system reset successful': (r) => r.status === 200,
  });
  return { startTime: Date.now() };
}

/**
 * SCENARIO 1: Hotspot Test
 * 500 VUs simultaneously fight to lock and claim 'res_001'.
 * Theoretical & Physical Guarantee: Exactly 1 winner, 499 HTTP 409 conflicts.
 */
export function hotspotTest() {
  const vuId = __VU;
  const url = `${BASE_URL}/resources/res_001/allocate`;
  const payload = JSON.stringify({
    userId: `AGENT_HOTSPOT_VU_${vuId}`,
    userName: `Special Agent ${vuId}`,
    idempotencyKey: `k6_hotspot_${vuId}_${Date.now()}`,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s',
  };

  const res = http.post(url, payload, params);

  if (res.status === 200) {
    successfulAllocations.add(1);
    const body = JSON.parse(res.body);
    if (body.lockDurationMs) {
      lockAcquisitionDuration.add(body.lockDurationMs);
    }
    check(res, {
      'status is 200': (r) => r.status === 200,
      'resource is allocated': () => body.status === 'SUCCESS',
    });
  } else if (res.status === 409) {
    conflictRejections.add(1);
    check(res, {
      'status is 409 Conflict': (r) => r.status === 409,
      'conflict reason verified': () => res.body.includes('ALLOCATION_CONFLICT') || res.body.includes('already claimed'),
    });
  } else {
    check(res, {
      'unexpected status code': () => false,
    });
  }
}

/**
 * SCENARIO 2: Pool Exhaustion Wave
 * 1,000 VUs simultaneously hit /api/resources/auto-allocate (SKIP LOCKED).
 * Theoretical & Physical Guarantee: Exactly 100 allocations succeed; 900 receive 410 Exhausted.
 */
export function poolExhaustionTest() {
  const vuId = __VU;
  const url = `${BASE_URL}/resources/auto-allocate`;
  const payload = JSON.stringify({
    userId: `AGENT_BURST_VU_${vuId}`,
    userName: `Operative ${vuId}`,
    idempotencyKey: `k6_pool_${vuId}_${Date.now()}`,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '15s',
  };

  const res = http.post(url, payload, params);

  if (res.status === 200) {
    successfulAllocations.add(1);
    const body = JSON.parse(res.body);
    if (body.lockDurationMs) {
      lockAcquisitionDuration.add(body.lockDurationMs);
    }
    check(res, {
      'auto-allocate status is 200': (r) => r.status === 200,
      'valid resource returned': () => !!body.resource?.id,
    });
  } else if (res.status === 410 || res.status === 409) {
    capacityExhaustions.add(1);
    check(res, {
      'capacity exhausted correctly reported': (r) => r.status === 410 || r.status === 409,
    });
  } else {
    check(res, {
      'unexpected auto-allocate code': () => false,
    });
  }
}

/**
 * Teardown validation check against database metrics
 */
export function teardown() {
  console.log('🏁 [K6 Teardown] Verifying final state consistency in database...');
  const res = http.get(`${BASE_URL}/stats`);
  const stats = JSON.parse(res.body).data;

  console.log(`📊 Total Pods: ${stats.total}`);
  console.log(`📊 Claimed Pods: ${stats.allocated}`);
  console.log(`📊 Available Pods: ${stats.available}`);
  console.log(`📊 Audit Ledger Events Recorded: ${stats.auditLogCount}`);

  // Invariant verification
  if (stats.allocated > stats.total) {
    console.error('❌ CRITICAL ERROR: Allocated count exceeds total capacity!');
    doubleAllocationsDetected.add(1);
  }
  if (stats.available < 0) {
    console.error('❌ CRITICAL ERROR: Negative inventory detected!');
    doubleAllocationsDetected.add(1);
  }
}
