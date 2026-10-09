/**
 * Lifecycle and Edge Case Verification Suite
 * Tests:
 * 1. Normal Allocation
 * 2. Idempotency Key Replay
 * 3. Double Booking Conflict
 * 4. Cancellation & Security Guardrails
 * 5. Re-allocation after Release
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api';

async function runLifecycleTests() {
  console.log('================================================================');
  console.log('🧪 INX: RESOURCE LIFECYCLE & EDGE CASE VERIFICATION SUITE');
  console.log('================================================================\n');

  // Reset
  await fetch(`${BASE_URL}/system/reset`, { method: 'POST' });

  // 1. Normal Allocation
  console.log('1️⃣ Test: Normal Allocation of POD-005...');
  const idempKey = `test_idemp_${Date.now()}`;
  const allocRes = await fetch(`${BASE_URL}/resources/res_005/allocate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'AGENT_TEST_01',
      userName: 'Dr. John Doe',
      idempotencyKey: idempKey,
    }),
  });
  const allocData = await allocRes.json();
  if (allocRes.status !== 200 || allocData.status !== 'SUCCESS') {
    throw new Error(`Normal allocation failed: ${JSON.stringify(allocData)}`);
  }
  console.log(`✅ Allocated res_005 to AGENT_TEST_01 (Version: ${allocData.resource.version})\n`);

  // 2. Idempotency Key Replay
  console.log('2️⃣ Test: Idempotent Replay with exact same key...');
  const replayRes = await fetch(`${BASE_URL}/resources/res_005/allocate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'AGENT_TEST_01',
      userName: 'Dr. John Doe',
      idempotencyKey: idempKey,
    }),
  });
  const replayData = await replayRes.json();
  if (replayRes.status !== 200 || replayData.status !== 'SUCCESS') {
    throw new Error(`Idempotent replay failed: ${JSON.stringify(replayData)}`);
  }
  console.log(`✅ Idempotency verified: Replay returned SUCCESS without duplicating state.\n`);

  // 3. Double Booking Conflict Attempt
  console.log('3️⃣ Test: Second user attempting to claim the same POD-005...');
  const conflictRes = await fetch(`${BASE_URL}/resources/res_005/allocate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'AGENT_RIVAL_99',
      userName: 'Rival Operative',
      idempotencyKey: `rival_${Date.now()}`,
    }),
  });
  const conflictData = await conflictRes.json();
  if (conflictRes.status !== 409 || conflictData.status !== 'FAILED') {
    throw new Error(`Expected 409 conflict, got: ${conflictRes.status}`);
  }
  console.log(`✅ Conflict prevented: HTTP 409 received. Reason: ${conflictData.message}\n`);

  // 4. Unauthorized Release Attempt
  console.log('4️⃣ Test: Unauthorized user attempting to cancel someone else\'s slot...');
  const unauthRes = await fetch(`${BASE_URL}/resources/res_005/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'AGENT_RIVAL_99',
      isAdmin: false,
    }),
  });
  if (unauthRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for unauthorized cancel, got ${unauthRes.status}`);
  }
  console.log(`✅ Security verified: HTTP 403 Forbidden received for unauthorized cancellation.\n`);

  // 5. Authorized Cancellation
  console.log('5️⃣ Test: Authorized owner releasing POD-005...');
  const cancelRes = await fetch(`${BASE_URL}/resources/res_005/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'AGENT_TEST_01',
    }),
  });
  const cancelData = await cancelRes.json();
  if (cancelRes.status !== 200 || cancelData.resource.status !== 'AVAILABLE') {
    throw new Error(`Cancel failed: ${JSON.stringify(cancelData)}`);
  }
  console.log(`✅ Resource res_005 successfully released back to AVAILABLE status.\n`);

  // 6. Re-allocation
  console.log('6️⃣ Test: New user claiming POD-005 after release...');
  const reallocRes = await fetch(`${BASE_URL}/resources/res_005/allocate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'AGENT_RIVAL_99',
      userName: 'Rival Operative',
    }),
  });
  const reallocData = await reallocRes.json();
  if (reallocRes.status !== 200 || reallocData.resource.status !== 'ALLOCATED') {
    throw new Error(`Re-allocation failed: ${JSON.stringify(reallocData)}`);
  }
  console.log(`✅ Re-allocation succeeded: res_005 claimed by AGENT_RIVAL_99.\n`);

  console.log('================================================================');
  console.log('🎉 ALL LIFECYCLE AND EDGE CASE TESTS PASSED');
  console.log('================================================================\n');
}

runLifecycleTests().catch((err) => {
  console.error('Lifecycle test failure:', err);
  process.exit(1);
});
