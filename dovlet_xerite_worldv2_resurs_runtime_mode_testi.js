'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  LEGACY_SHADOW,
  SQL_AUTHORITATIVE,
  worldV2ResursRuntimeModeAlClient,
  worldV2ResursSqlAuthoritativeEtClient,
} = require('./dovlet_xerite_worldv2_resurs_runtime_mode');

function clientYarat({ currentAuditId = '100', legacyAuditId = '100', provisionedCount = 80000 } = {}) {
  const sorqular = [];
  return {
    sorqular,
    async query(sql, params = []) {
      const metn = String(sql);
      sorqular.push({ sql: metn, params });
      if (metn.includes('to_regclass')) {
        return { rows: [{ runtime_table: 'dovlet_worldv2_resurs_runtime', state_table: 'dovlet_worldv2_resurs_state' }] };
      }
      if (metn.includes('SELECT state_id, runtime_mode')) {
        return { rows: [{
          state_id: 1,
          runtime_mode: LEGACY_SHADOW,
          sql_authoritative_at: null,
          provisioned_count: provisionedCount,
          physical_capacity_reached: false,
          revision: '5',
          legacy_audit_id: legacyAuditId,
        }] };
      }
      if (metn.includes('SELECT id::text AS id')) {
        return { rows: currentAuditId ? [{ id: currentAuditId }] : [] };
      }
      if (metn.includes('pg_advisory_xact_lock')) return { rows: [] };
      if (metn.includes('UPDATE dovlet_worldv2_resurs_state')) {
        return { rows: [{ runtime_mode: SQL_AUTHORITATIVE, revision: '6', sql_authoritative_at: new Date().toISOString() }] };
      }
      throw new Error(`Tanımadığım SQL: ${metn}`);
    },
  };
}

async function run() {
  const oldMut = process.env.WORLDV2_RESOURCE_SQL_MUTATIONS;
  const oldView = process.env.WORLDV2_RESOURCE_SQL_VIEWPORT;
  const oldDense = process.env.WORLDV2_RESOURCE_DENSE_COUNT;
  try {
    delete process.env.WORLDV2_RESOURCE_SQL_MUTATIONS;
    delete process.env.WORLDV2_RESOURCE_SQL_VIEWPORT;
    await assert.rejects(
      () => worldV2ResursSqlAuthoritativeEtClient(clientYarat(), 1),
      /SQL authoritative keçid/,
    );

    process.env.WORLDV2_RESOURCE_SQL_MUTATIONS = '1';
    process.env.WORLDV2_RESOURCE_SQL_VIEWPORT = '1';
    process.env.WORLDV2_RESOURCE_DENSE_COUNT = '80000';

    const mode = await worldV2ResursRuntimeModeAlClient(clientYarat(), 1);
    assert.equal(mode.runtimeMode, LEGACY_SHADOW);
    assert.equal(mode.migrationReady, true);

    const enabled = await worldV2ResursSqlAuthoritativeEtClient(clientYarat(), 1);
    assert.equal(enabled.success, true);
    assert.equal(enabled.runtimeMode, SQL_AUTHORITATIVE);

    await assert.rejects(
      () => worldV2ResursSqlAuthoritativeEtClient(clientYarat({ currentAuditId: '101' }), 1),
      /fresh deyil/,
    );

    await assert.rejects(
      () => worldV2ResursSqlAuthoritativeEtClient(clientYarat({ provisionedCount: 3000 }), 1),
      /coverage natamamdır/,
    );

    const migration = fs.readFileSync(
      path.join(__dirname, 'miqrasiyalar', '20260916_worldv2_resurs_sql_authoritative.sql'), 'utf8',
    );
    assert.match(migration, /runtime_mode TEXT NOT NULL DEFAULT 'legacy_shadow'/);
    assert.match(migration, /sql_authoritative_at TIMESTAMPTZ/);
    assert.match(migration, /idx_worldv2_resurs_due_respawn/);
    assert.match(migration, /respawn_at_ms > 0/);

    console.log('✓ WorldV2 SQL authoritative mode guard testləri keçdi.');
  } finally {
    if (oldMut == null) delete process.env.WORLDV2_RESOURCE_SQL_MUTATIONS;
    else process.env.WORLDV2_RESOURCE_SQL_MUTATIONS = oldMut;
    if (oldView == null) delete process.env.WORLDV2_RESOURCE_SQL_VIEWPORT;
    else process.env.WORLDV2_RESOURCE_SQL_VIEWPORT = oldView;
    if (oldDense == null) delete process.env.WORLDV2_RESOURCE_DENSE_COUNT;
    else process.env.WORLDV2_RESOURCE_DENSE_COUNT = oldDense;
  }
}

module.exports = run();
