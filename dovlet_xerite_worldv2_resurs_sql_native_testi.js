'use strict';

const assert = require('node:assert/strict');
const {
  worldV2ResursHedefiniAlClient,
  worldV2ResursuRezervEtClient,
  worldV2ResursToplamaniBitirClient,
} = require('./dovlet_xerite_worldv2_resurs_emeliyyat_sistemi');
const {
  worldV2SqlRespawnlariYenileClient,
} = require('./dovlet_xerite_worldv2_resurs_sql_native');

function rowEt(node) {
  return {
    node_index: node.index,
    spawn_serial: node.spawnSerial,
    x: node.x,
    y: node.y,
    remaining_amount: node.remainingAmount,
    occupied_by_player_id: node.occupiedByPlayerId || '',
    occupied_by_convoy_id: node.occupiedByConvoyId || '',
    occupied_until_ms: node.occupiedUntilMs || 0,
    respawn_at_ms: node.respawnAtMs || 0,
    last_spawn_at_ms: node.lastSpawnAtMs || 0,
  };
}

function saxtaSqlClientYarat(ilkinNode) {
  let node = { ...ilkinNode };
  let revision = 10;
  const sorqular = [];
  return {
    sorqular,
    nodeAl() { return { ...node }; },
    async query(sql, params = []) {
      const metn = String(sql);
      sorqular.push({ sql: metn, params });

      if (metn.includes('SELECT state_id, runtime_mode')) {
        return { rows: [{
          state_id: 1,
          runtime_mode: 'sql_authoritative',
          sql_authoritative_at: new Date().toISOString(),
          provisioned_count: 80000,
          physical_capacity_reached: false,
          revision,
          legacy_audit_id: '100',
        }] };
      }

      if (metn.includes('FROM dovlet_worldv2_resurs_runtime') &&
          metn.includes('respawn_at_ms > 0') && metn.includes('SKIP LOCKED')) {
        return node.respawnAtMs > 0 && node.respawnAtMs <= Number(params[1])
          ? { rows: [rowEt(node)] }
          : { rows: [] };
      }

      if (metn.includes('FROM dovlet_worldv2_resurs_runtime') &&
          metn.includes('node_index <>') && metn.includes('SELECT 1')) {
        return { rows: [] };
      }

      if (metn.includes('FROM dovlet_worldv2_resurs_runtime') &&
          metn.includes('node_index = $2')) {
        return Number(params[1]) === node.index ? { rows: [rowEt(node)] } : { rows: [] };
      }

      if (metn.includes('INSERT INTO dovlet_worldv2_resurs_runtime')) {
        node = {
          index: Number(params[1]),
          spawnSerial: Number(params[2]),
          x: Number(params[3]),
          y: Number(params[4]),
          remainingAmount: Number(params[5]),
          occupiedByPlayerId: String(params[6] || ''),
          occupiedByConvoyId: String(params[7] || ''),
          occupiedUntilMs: Number(params[8] || 0),
          respawnAtMs: Number(params[9] || 0),
          lastSpawnAtMs: Number(params[10] || 0),
        };
        return { rows: [] };
      }

      if (metn.includes('INSERT INTO dovlet_worldv2_resurs_state') && metn.includes('RETURNING revision')) {
        revision++;
        return { rows: [{ revision }] };
      }

      if (metn.includes('WITH son_snapshot AS')) {
        return { rows: [] };
      }

      if (metn.includes('pg_advisory_xact_lock') || metn === 'BEGIN' || metn === 'COMMIT' || metn === 'ROLLBACK') {
        return { rows: [] };
      }

      throw new Error(`Saxta SQL client tanımadığı SQL aldı: ${metn}`);
    },
  };
}

async function run() {
  const kohneFlag = process.env.WORLDV2_RESOURCE_SQL_MUTATIONS;
  try {
    process.env.WORLDV2_RESOURCE_SQL_MUTATIONS = '1';
    const now = 1770000000000;
    const targetId = 'state_1_worldv2_resource_1_spawn_1';
    const client = saxtaSqlClientYarat({
      index: 1, spawnSerial: 1, x: 1000, y: 600, remainingAmount: 100,
      occupiedByPlayerId: '', occupiedByConvoyId: '', occupiedUntilMs: 0,
      respawnAtMs: 0, lastSpawnAtMs: now - 1000,
    });

    const bax = await worldV2ResursHedefiniAlClient(client, 1, targetId, now);
    assert.equal(bax.success, true);
    assert.equal(bax.hedef.remainingAmount, 100);

    const rezerv = await worldV2ResursuRezervEtClient(client, {
      stateId: 1, targetId, playerId: 'p1', convoyId: 'c1',
      occupiedUntilMs: now + 60000, nowMs: now,
    });
    assert.equal(rezerv.success, true);
    assert.equal(client.nodeAl().occupiedByPlayerId, 'p1');

    const toplama = await worldV2ResursToplamaniBitirClient(client, {
      stateId: 1, targetId, playerId: 'p1', convoyId: 'c1', miqdar: 999999,
      nowMs: now + 60000,
    });
    assert.equal(toplama.success, true);
    assert.equal(toplama.remainingAmount, 0);
    assert.ok(toplama.respawnAtMs > now + 60000);

    assert.equal(
      client.sorqular.some(q => q.sql.includes('SELECT detallar') || q.sql.includes('INSERT INTO hesab_audit_jurnali')),
      false,
      'SQL authoritative mutasiya giant audit JSON oxumamalı/yazmamalıdır',
    );

    const kohneMovqe = { x: client.nodeAl().x, y: client.nodeAl().y };
    const respawn = await worldV2SqlRespawnlariYenileClient(client, 1, toplama.respawnAtMs + 1, 64);
    assert.equal(respawn.updated, 1);
    const yeni = client.nodeAl();
    assert.equal(yeni.spawnSerial, 2);
    assert.equal(yeni.respawnAtMs, 0);
    assert.ok(yeni.remainingAmount > 0);
    const dx = yeni.x - kohneMovqe.x;
    const dy = yeni.y - kohneMovqe.y;
    assert.ok(dx * dx + dy * dy >= 50 * 50, 'Respawn köhnə mövqedən ən az 50 vahid uzaq olmalıdır');

    console.log('✓ WorldV2 SQL-native reserve/gather/respawn testləri keçdi.');
  } finally {
    if (kohneFlag == null) delete process.env.WORLDV2_RESOURCE_SQL_MUTATIONS;
    else process.env.WORLDV2_RESOURCE_SQL_MUTATIONS = kohneFlag;
  }
}

module.exports = run();
