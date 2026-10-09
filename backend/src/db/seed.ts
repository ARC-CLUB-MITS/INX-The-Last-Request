import { pool } from './pool';
import { runMigrations } from './migrate';
import { ResourceTier } from '../types';

export async function seedResources(total = 100): Promise<void> {
  await runMigrations();

  const client = await pool.connect();
  try {
    console.log(`[Seed] Initializing seed for ${total} resources in INX: The Last Request...`);
    await client.query('BEGIN');

    // Clean existing resources and audit logs
    await client.query('DELETE FROM resource_audit_logs');
    await client.query('DELETE FROM resources');

    const insertValues: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (let i = 1; i <= total; i++) {
      const padNum = String(i).padStart(3, '0');
      const id = `res_${padNum}`;
      const code = `INX-POD-${padNum}`;

      let tier: ResourceTier = 'CRYOPOD_STANDARD';
      let name = `Aegis Civilian Cryo-Pod #${padNum}`;

      if (i <= 10) {
        tier = 'APEX_COMMAND';
        name = `Apex Command Stasis Core #${padNum}`;
      } else if (i <= 35) {
        tier = 'ORBITAL_CORE';
        name = `Orbital Specialist Life Support #${padNum}`;
      }

      insertValues.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, 'AVAILABLE', 1)`);
      params.push(id, code, name, tier);
    }

    const query = `
      INSERT INTO resources (id, resource_code, name, tier, status, version)
      VALUES ${insertValues.join(', ')}
    `;

    await client.query(query, params);

    // Initial audit log for seed
    const seedTime = new Date().toISOString();
    const resourcesRes = await client.query('SELECT id, resource_code FROM resources');
    for (const row of resourcesRes.rows) {
      await client.query(`
        INSERT INTO resource_audit_logs (id, resource_id, resource_code, user_id, action, previous_status, new_status, metadata, created_at)
        VALUES ($1, $2, $3, 'SYSTEM', 'SYSTEM_RESET', NULL, 'AVAILABLE', $4, $5)
      `, [
        'audit_seed_' + row.id,
        row.id,
        row.resource_code,
        JSON.stringify({ reason: 'Initial system deployment seed' }),
        seedTime,
      ]);
    }

    await client.query('COMMIT');
    console.log(`✅ [Seed] Successfully initialized ${total} resources with full audit integrity.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [Seed] Resource seeding failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedResources(100)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
