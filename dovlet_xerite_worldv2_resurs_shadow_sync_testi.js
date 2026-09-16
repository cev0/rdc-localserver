'use strict';

const assert = require('assert');
const {
  worldV2ResursShadowSyncAktivdir,
  targetleriNodeMelumatinaCevir,
  worldV2ResursShadowSyncEtClient,
} = require('./dovlet_xerite_worldv2_resurs_shadow_sync');

async function run() {
  const kohne = process.env.WORLDV2_RESOURCE_SQL_SHADOW_SYNC;
  try {
    process.env.WORLDV2_RESOURCE_SQL_SHADOW_SYNC = '1';
    assert.strictEqual(worldV2ResursShadowSyncAktivdir(), true);

    const hedefler = targetleriNodeMelumatinaCevir(1, [
      'state_1_worldv2_resource_7_spawn_2',
      'STATE_1_WORLDV2_RESOURCE_7_SPAWN_2',
      'state_2_worldv2_resource_9_spawn_1',
    ]);
    assert.deepStrictEqual(hedefler.map(x => x.index), [7]);

    const sorqular = [];
    const client = {
      async query(sql, params = []) {
        const metn = String(sql);
        sorqular.push({ sql: metn, params });
        if (metn.includes('to_regclass')) {
          return { rows: [{ runtime_table: 'dovlet_worldv2_resurs_runtime', state_table: 'dovlet_worldv2_resurs_state' }] };
        }
        if (metn.includes('SELECT id') && metn.includes('LIMIT 2')) {
          return { rows: [{ id: '101' }, { id: '100' }] };
        }
        if (metn.includes('SELECT state_id, provisioned_count')) {
          return { rows: [{ state_id: 1, provisioned_count: 3000, physical_capacity_reached: false, revision: '5', legacy_audit_id: '100' }] };
        }
        if (metn.includes("CROSS JOIN UNNEST($3::text[])")) {
          return { rows: [{
            id: '101',
            node_id: 'state_1_worldv2_resource_7',
            node: {
              spawnSerial: 2,
              x: 123,
              y: 456,
              remainingAmount: 900,
              occupiedByPlayerId: 'p1',
              occupiedByConvoyId: 'c1',
              occupiedUntilMs: 999999,
              respawnAtMs: 0,
              lastSpawnAtMs: 111,
            },
          }] };
        }
        if (metn.includes('INSERT INTO dovlet_worldv2_resurs_state')) {
          return { rows: [{ revision: '6' }] };
        }
        return { rows: [] };
      },
    };

    const netice = await worldV2ResursShadowSyncEtClient(
      client,
      1,
      ['state_1_worldv2_resource_7_spawn_2'],
    );
    assert.strictEqual(netice.synced, true);
    assert.strictEqual(netice.reason, 'updated');
    assert.strictEqual(netice.syncedCount, 1);
    assert.ok(sorqular.some(x => x.sql.includes('INSERT INTO dovlet_worldv2_resurs_runtime')));
    assert.ok(sorqular.some(x => x.sql.includes('SAVEPOINT worldv2_resurs_shadow_sync')));
    assert.ok(sorqular.some(x => x.sql.includes('RELEASE SAVEPOINT worldv2_resurs_shadow_sync')));

    const staleClient = {
      async query(sql) {
        const metn = String(sql);
        if (metn.includes('to_regclass')) return { rows: [{ runtime_table: 'a', state_table: 'b' }] };
        if (metn.includes('SELECT id') && metn.includes('LIMIT 2')) return { rows: [{ id: '103' }, { id: '102' }] };
        if (metn.includes('SELECT state_id, provisioned_count')) {
          return { rows: [{ state_id: 1, provisioned_count: 3000, physical_capacity_reached: false, revision: '5', legacy_audit_id: '100' }] };
        }
        return { rows: [] };
      },
    };
    const stale = await worldV2ResursShadowSyncEtClient(staleClient, 1, ['state_1_worldv2_resource_7_spawn_2']);
    assert.strictEqual(stale.synced, false);
    assert.strictEqual(stale.reason, 'continuity_lost');

    console.log('✓ WorldV2 SQL shadow-sync continuity testləri keçdi.');
  } finally {
    if (kohne == null) delete process.env.WORLDV2_RESOURCE_SQL_SHADOW_SYNC;
    else process.env.WORLDV2_RESOURCE_SQL_SHADOW_SYNC = kohne;
  }
}

module.exports = run();
