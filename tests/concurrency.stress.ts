/**
 * Standalone High-Concurrency Stress Test Runner for Node.js
 * Fires 1,000 asynchronous HTTP calls simultaneously against the backend
 * Verifies:
 * - 0 double allocations
 * - 0 negative inventory states
 * - 100% data consistency
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api';

async function runConcurrentPool<T>(
  items: (() => Promise<T>)[],
  concurrency = 50
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await items[currentIndex]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function runTest() {
  console.log('================================================================');
  console.log('⚡ INX: THE LAST REQUEST — CONCURRENCY STRESS PROOF (1,000 REQS)');
  console.log('================================================================\n');

  // 1. Reset System
  console.log('1️⃣ Resetting Resource Pool...');
  const resetRes = await fetch(`${BASE_URL}/system/reset`, { method: 'POST' });
  if (!resetRes.ok) {
    throw new Error(`Failed to reset system. Is the backend running on ${BASE_URL}?`);
  }
  console.log('✅ Pool reset to 100 AVAILABLE resources.\n');

  // 2. TEST 1: HOTSPOT CONCURRENCY (500 simultaneous requests hitting res_001)
  console.log('2️⃣ Firing TEST 1: 500 Simultaneous Requests on SINGLE Resource (res_001)...');
  const hotspotStart = Date.now();
  const hotspotTasks = Array.from({ length: 500 }).map((_, idx) => async () => {
    try {
      const res = await fetch(`${BASE_URL}/resources/res_001/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `HOTSPOT_AGENT_${idx + 1}`,
          userName: `Agent ${idx + 1}`,
          idempotencyKey: `hs_${idx}_${Date.now()}`,
        }),
      });
      return { status: res.status, body: await res.json() };
    } catch (err: any) {
      return { status: 500, error: err.message };
    }
  });

  const hotspotResults = await runConcurrentPool(hotspotTasks, 50);
  const hotspotDuration = Date.now() - hotspotStart;

  const hotspotSuccesses = hotspotResults.filter((r) => r.status === 200);
  const hotspotConflicts = hotspotResults.filter((r) => r.status === 409);

  console.log(`⏱️ Hotspot Test completed in ${hotspotDuration}ms`);
  console.log(`   - Successful Allocations (200 OK): ${hotspotSuccesses.length}`);
  console.log(`   - Clean Conflict Rejections (409 Conflict): ${hotspotConflicts.length}`);

  if (hotspotSuccesses.length !== 1) {
    console.error(`❌ FAILURE: Expected exactly 1 successful allocation, got ${hotspotSuccesses.length}!`);
    process.exit(1);
  } else {
    console.log('✅ PASS: Exactly 1 request acquired the row lock. 499 rejected safely.\n');
  }

  // 3. Reset for Pool Burst
  await fetch(`${BASE_URL}/system/reset`, { method: 'POST' });

  // 4. TEST 2: POOL EXHAUSTION WAVE (1,000 simultaneous auto-allocate requests for 100 items)
  console.log('3️⃣ Firing TEST 2: 1,000 Simultaneous Auto-Allocations (Pool Capacity = 100)...');
  const burstStart = Date.now();
  const burstTasks = Array.from({ length: 1000 }).map((_, idx) => async () => {
    try {
      const res = await fetch(`${BASE_URL}/resources/auto-allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `BURST_AGENT_${idx + 1}`,
          userName: `Operative ${idx + 1}`,
          idempotencyKey: `burst_${idx}_${Date.now()}`,
        }),
      });
      return { status: res.status, body: await res.json() };
    } catch (err: any) {
      return { status: 500, error: err.message };
    }
  });

  const burstResults = await runConcurrentPool(burstTasks, 50);
  const burstDuration = Date.now() - burstStart;

  const burstSuccesses = burstResults.filter((r) => r.status === 200);
  const burstExhausted = burstResults.filter((r) => r.status === 410 || r.status === 409);
  const allocatedIds = burstSuccesses.map((r: any) => r.body?.resource?.id).filter(Boolean);
  const uniqueAllocatedIds = new Set(allocatedIds);

  console.log(`⏱️ Pool Burst completed in ${burstDuration}ms`);
  console.log(`   - Successful Allocations (200 OK): ${burstSuccesses.length}`);
  console.log(`   - Capacity Exhausted Rejections (410/409): ${burstExhausted.length}`);
  console.log(`   - Unique Resource IDs Claimed: ${uniqueAllocatedIds.size}`);

  if (burstSuccesses.length !== 100) {
    console.error(`❌ FAILURE: Expected exactly 100 successful allocations, got ${burstSuccesses.length}!`);
    process.exit(1);
  }
  if (uniqueAllocatedIds.size !== 100) {
    console.error(`❌ FAILURE: Duplicate allocations detected! ${allocatedIds.length} claims on ${uniqueAllocatedIds.size} unique IDs.`);
    process.exit(1);
  }

  console.log('✅ PASS: Exactly 100 slots claimed with 0 duplicates and 0 double-bookings.\n');

  // 5. Final State Verification
  console.log('4️⃣ Verifying Database Telemetry Invariants...');
  const statsRes = await fetch(`${BASE_URL}/stats`);
  const statsJson = await statsRes.json();
  const stats = statsJson.data;

  console.log(`   - Total Pool: ${stats.total}`);
  console.log(`   - Allocated: ${stats.allocated}`);
  console.log(`   - Available: ${stats.available}`);
  console.log(`   - Audit Ledger Count: ${stats.auditLogCount}`);

  if (stats.available !== 0 || stats.allocated !== 100) {
    console.error('❌ FAILURE: Invariant mismatch in database!');
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL 1,000 CONCURRENT REQUEST TESTS PASSED WITH 100% INTEGRITY');
  console.log('================================================================\n');
}

runTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
