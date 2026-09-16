'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  MAX_VIEWPORT_LIMIT,
  worldV2ResursSqlCedvelleriMovcuddurClient,
  worldV2ResursSahesiniSqlDenAlClient,
  worldV2ResursNodeYazClient,
  legacyRuntimeSetirleriniHazirla,
  worldV2LegacyRuntimeImportEtClient,
} = require('./dovlet_xerite_worldv2_resurs_runtime_postgres');

async function run() {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (sql.includes('to_regclass')) return { rows: [{ runtime_table: 'dovlet_worldv2_resurs_runtime', state_table: 'dovlet_worldv2_resurs_state' }] };
      if (sql.includes('FROM dovlet_worldv2_resurs_runtime') && sql.includes('BETWEEN')) {
        return { rows: [
          { node_index: 7, spawn_serial: 2, x: 100, y: 101, remaining_amount: 55,
            occupied_by_player_id: '', occupied_by_convoy_id: '', occupied_until_ms: 0,
            respawn_at_ms: 0, last_spawn_at_ms: 123 },
        ] };
      }
      if (sql.includes('RETURNING revision')) return { rows: [{ revision: 9 }] };
      return { rows: [] };
    },
  };

  assert.equal(await worldV2ResursSqlCedvelleriMovcuddurClient(client), true);
  const view = await worldV2ResursSahesiniSqlDenAlClient(client, 3,
    { minX: 90, minY: 91, maxX: 110, maxY: 111 }, MAX_VIEWPORT_LIMIT);
  assert.equal(view.nodes.length, 1);
  assert.equal(view.nodes[0].index, 7);
  const viewportQuery = queries.find(q => q.sql.includes('BETWEEN'));
  assert.deepEqual(viewportQuery.params, [3, 90, 110, 91, 111, 4097]);
  assert.match(viewportQuery.sql, /remaining_amount > 0/);
  assert.match(viewportQuery.sql, /respawn_at_ms = 0/);
  assert.ok(!viewportQuery.sql.includes('hesab_audit_jurnali'), 'Viewport giant audit JSON oxumamalıdır');

  await worldV2ResursNodeYazClient(client, 3, 7, {
    spawnSerial: 3, x: 102, y: 103, remainingAmount: 44,
    occupiedByPlayerId: 'P1', occupiedByConvoyId: 'C1', occupiedUntilMs: 500,
    respawnAtMs: 0, lastSpawnAtMs: 400,
  });
  const upsert = queries.find(q => q.sql.includes('ON CONFLICT (state_id, node_index)'));
  assert.ok(upsert, 'Node yazısı state/index səviyyəsində upsert olmalıdır');
  assert.equal(upsert.params[0], 3);
  assert.equal(upsert.params[1], 7);

  const legacy = { nodes: {} };
  for (let i = 1; i <= 1601; i++) {
    legacy.nodes[`state_3_worldv2_resource_${i}`] = {
      spawnSerial: 2, x: i % 1201, y: (i * 2) % 1201, remainingAmount: 100,
      occupiedByPlayerId: '', occupiedByConvoyId: '', occupiedUntilMs: 0,
      respawnAtMs: 0, lastSpawnAtMs: 10,
    };
  }
  legacy.nodes.state_99_worldv2_resource_1 = { x: 1, y: 1, remainingAmount: 1 };
  assert.equal(legacyRuntimeSetirleriniHazirla(3, legacy).length, 1601, 'Başqa Dövlət node-u import olunmamalıdır');

  const before = queries.length;
  const imported = await worldV2LegacyRuntimeImportEtClient(client, 3, legacy, '12345', { batchSize: 750 });
  assert.equal(imported.importedCount, 1601);
  const importQueries = queries.slice(before).filter(q => q.sql.includes('FROM UNNEST'));
  assert.equal(importQueries.length, 3, '1601 node 750-lik üç batch olmalıdır');
  assert.equal(importQueries[0].params[1].length, 750);
  assert.equal(importQueries[2].params[1].length, 101);
  assert.ok(importQueries.every(q => !q.sql.includes('hesab_audit_jurnali')), 'Import hər batch-da giant audit yazmamalıdır');
  const meta = queries.slice(before).find(q => q.sql.includes('INSERT INTO dovlet_worldv2_resurs_state'));
  assert.ok(meta, 'Import yalnız node-lar bitəndən sonra state metadata yazmalıdır');
  assert.equal(meta.params[3], '12345');

  const migration = fs.readFileSync(path.join(__dirname, 'miqrasiyalar', '20260916_worldv2_resurs_runtime.sql'), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS dovlet_worldv2_resurs_runtime/);
  assert.match(migration, /idx_worldv2_resurs_viewport/);
  assert.match(migration, /WHERE remaining_amount > 0 AND respawn_at_ms = 0/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS dovlet_worldv2_resurs_state/);
  assert.match(migration, /TO demiryumruq_app/);

  console.log('WorldV2 row-based SQL runtime, bounded viewport and batch import tests OK');
}

module.exports = run();
