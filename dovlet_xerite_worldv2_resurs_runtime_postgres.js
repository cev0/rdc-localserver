'use strict';

const { proqramHovuzunuAl } = require('./verilenler_bazasi');

const LEGACY_HADISE_NOVU = 'dovlet_worldv2_resurs_runtime_v2';
const RUNTIME_CEDVELI = 'dovlet_worldv2_resurs_runtime';
const STATE_CEDVELI = 'dovlet_worldv2_resurs_state';
const DEFAULT_IMPORT_BATCH = 750;
const MAX_VIEWPORT_LIMIT = 4096;

function tamEdedAl(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function menfiOlmayanTamEdedAl(v, fallback = 0) {
  return Math.max(0, tamEdedAl(v, fallback));
}

function sidAl(v) {
  return Math.max(1, tamEdedAl(v, 1));
}

function metnAl(v, max = 220) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function saheHazirla(sahe) {
  const minX = Math.max(0, Math.min(1200, tamEdedAl(sahe && sahe.minX)));
  const minY = Math.max(0, Math.min(1200, tamEdedAl(sahe && sahe.minY)));
  const maxX = Math.max(minX, Math.min(1200, tamEdedAl(sahe && sahe.maxX, minX)));
  const maxY = Math.max(minY, Math.min(1200, tamEdedAl(sahe && sahe.maxY, minY)));
  return { minX, minY, maxX, maxY };
}

function nodeSiraIndeksiniAl(nodeId, stateId) {
  const re = new RegExp(`^state_${sidAl(stateId)}_worldv2_resource_(\\d+)$`);
  const m = metnAl(nodeId).match(re);
  return m ? Math.max(0, tamEdedAl(m[1])) : 0;
}

function rowNodeHazirla(row) {
  if (!row) return null;
  return {
    index: tamEdedAl(row.node_index),
    spawnSerial: Math.max(1, tamEdedAl(row.spawn_serial, 1)),
    x: tamEdedAl(row.x),
    y: tamEdedAl(row.y),
    remainingAmount: menfiOlmayanTamEdedAl(row.remaining_amount),
    occupiedByPlayerId: metnAl(row.occupied_by_player_id, 128),
    occupiedByConvoyId: metnAl(row.occupied_by_convoy_id, 64),
    occupiedUntilMs: menfiOlmayanTamEdedAl(row.occupied_until_ms),
    respawnAtMs: menfiOlmayanTamEdedAl(row.respawn_at_ms),
    lastSpawnAtMs: menfiOlmayanTamEdedAl(row.last_spawn_at_ms),
  };
}

async function worldV2ResursSqlCedvelleriMovcuddurClient(client) {
  if (!client || typeof client.query !== 'function') return false;
  const netice = await client.query(
    `SELECT to_regclass($1) AS runtime_table, to_regclass($2) AS state_table`,
    [`public.${RUNTIME_CEDVELI}`, `public.${STATE_CEDVELI}`],
  );
  const row = netice && netice.rows && netice.rows[0];
  return !!(row && row.runtime_table && row.state_table);
}

async function worldV2ResursStateMetaAlClient(client, stateId) {
  const sid = sidAl(stateId);
  const netice = await client.query(
    `SELECT state_id, provisioned_count, physical_capacity_reached, revision, legacy_audit_id
       FROM ${STATE_CEDVELI}
      WHERE state_id = $1`,
    [sid],
  );
  const row = netice && netice.rows && netice.rows[0];
  return row ? {
    stateId: sid,
    provisionedCount: menfiOlmayanTamEdedAl(row.provisioned_count),
    physicalCapacityReached: row.physical_capacity_reached === true,
    revision: String(row.revision == null ? '0' : row.revision),
    legacyAuditId: row.legacy_audit_id == null ? null : String(row.legacy_audit_id),
  } : null;
}

async function worldV2ResursSahesiniSqlDenAlClient(client, stateId, sahe, limit = MAX_VIEWPORT_LIMIT) {
  if (!client || typeof client.query !== 'function') throw new Error('PostgreSQL client tələb olunur.');
  const sid = sidAl(stateId);
  const a = saheHazirla(sahe);
  const esasLimit = Math.max(1, Math.min(MAX_VIEWPORT_LIMIT, tamEdedAl(limit, MAX_VIEWPORT_LIMIT)));
  const netice = await client.query(
    `SELECT node_index, spawn_serial, x, y, remaining_amount,
            occupied_by_player_id, occupied_by_convoy_id, occupied_until_ms,
            respawn_at_ms, last_spawn_at_ms
       FROM ${RUNTIME_CEDVELI}
      WHERE state_id = $1
        AND x BETWEEN $2 AND $3
        AND y BETWEEN $4 AND $5
        AND remaining_amount > 0
        AND respawn_at_ms = 0
      ORDER BY node_index ASC
      LIMIT $6`,
    [sid, a.minX, a.maxX, a.minY, a.maxY, esasLimit + 1],
  );
  const rows = (netice && netice.rows) || [];
  const truncated = rows.length > esasLimit;
  const nodes = rows.slice(0, esasLimit).map(rowNodeHazirla).filter(Boolean);
  return { stateId: sid, area: a, nodes, truncated };
}

async function worldV2ResursNodeAlClient(client, stateId, index, forUpdate = false) {
  const sid = sidAl(stateId);
  const i = Math.max(1, tamEdedAl(index, 1));
  const netice = await client.query(
    `SELECT node_index, spawn_serial, x, y, remaining_amount,
            occupied_by_player_id, occupied_by_convoy_id, occupied_until_ms,
            respawn_at_ms, last_spawn_at_ms
       FROM ${RUNTIME_CEDVELI}
      WHERE state_id = $1 AND node_index = $2${forUpdate ? ' FOR UPDATE' : ''}`,
    [sid, i],
  );
  return rowNodeHazirla(netice && netice.rows && netice.rows[0]);
}

async function worldV2ResursNodeYazClient(client, stateId, index, node) {
  const sid = sidAl(stateId);
  const i = Math.max(1, tamEdedAl(index, 1));
  if (!node || !Number.isFinite(Number(node.x)) || !Number.isFinite(Number(node.y))) {
    throw new Error('WorldV2 resurs node koordinatları tələb olunur.');
  }
  const x = Math.max(0, Math.min(1200, tamEdedAl(node.x)));
  const y = Math.max(0, Math.min(1200, tamEdedAl(node.y)));
  await client.query(
    `INSERT INTO ${RUNTIME_CEDVELI}
      (state_id, node_index, spawn_serial, x, y, remaining_amount,
       occupied_by_player_id, occupied_by_convoy_id, occupied_until_ms,
       respawn_at_ms, last_spawn_at_ms, yenilenme_vaxti)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
     ON CONFLICT (state_id, node_index) DO UPDATE SET
       spawn_serial = EXCLUDED.spawn_serial,
       x = EXCLUDED.x, y = EXCLUDED.y,
       remaining_amount = EXCLUDED.remaining_amount,
       occupied_by_player_id = EXCLUDED.occupied_by_player_id,
       occupied_by_convoy_id = EXCLUDED.occupied_by_convoy_id,
       occupied_until_ms = EXCLUDED.occupied_until_ms,
       respawn_at_ms = EXCLUDED.respawn_at_ms,
       last_spawn_at_ms = EXCLUDED.last_spawn_at_ms,
       yenilenme_vaxti = NOW()`,
    [sid, i, Math.max(1, tamEdedAl(node.spawnSerial, 1)), x, y,
      menfiOlmayanTamEdedAl(node.remainingAmount), metnAl(node.occupiedByPlayerId, 128),
      metnAl(node.occupiedByConvoyId, 64), menfiOlmayanTamEdedAl(node.occupiedUntilMs),
      menfiOlmayanTamEdedAl(node.respawnAtMs), menfiOlmayanTamEdedAl(node.lastSpawnAtMs)],
  );
}

async function worldV2ResursRevisionArtirClient(client, stateId, {
  provisionedCount = null,
  physicalCapacityReached = null,
  legacyAuditId = null,
} = {}) {
  const sid = sidAl(stateId);
  const netice = await client.query(
    `INSERT INTO ${STATE_CEDVELI}
      (state_id, provisioned_count, physical_capacity_reached, revision, legacy_audit_id, yenilenme_vaxti)
     VALUES ($1, COALESCE($2,0), COALESCE($3,FALSE), 1, $4, NOW())
     ON CONFLICT (state_id) DO UPDATE SET
       provisioned_count = COALESCE($2, ${STATE_CEDVELI}.provisioned_count),
       physical_capacity_reached = COALESCE($3, ${STATE_CEDVELI}.physical_capacity_reached),
       legacy_audit_id = COALESCE($4, ${STATE_CEDVELI}.legacy_audit_id),
       revision = ${STATE_CEDVELI}.revision + 1,
       yenilenme_vaxti = NOW()
     RETURNING revision`,
    [sid,
      provisionedCount == null ? null : menfiOlmayanTamEdedAl(provisionedCount),
      physicalCapacityReached == null ? null : physicalCapacityReached === true,
      legacyAuditId == null ? null : String(legacyAuditId)],
  );
  return String(netice && netice.rows && netice.rows[0] && netice.rows[0].revision || '0');
}

async function worldV2LegacyRuntimeAuditdenAlClient(client, stateId) {
  const sid = sidAl(stateId);
  const acar = `__dovlet_worldv2_resurs_${sid}__`;
  const netice = await client.query(
    `SELECT id, detallar
       FROM hesab_audit_jurnali
      WHERE oyuncu_id = $1 AND hadise_novu = $2
      ORDER BY id DESC LIMIT 1`,
    [acar, LEGACY_HADISE_NOVU],
  );
  const row = netice && netice.rows && netice.rows[0];
  const runtime = row && row.detallar && row.detallar.runtime;
  return runtime && typeof runtime === 'object'
    ? { auditId: String(row.id), runtime }
    : null;
}

function legacyRuntimeSetirleriniHazirla(stateId, runtime) {
  const sid = sidAl(stateId);
  const rows = [];
  const nodes = runtime && runtime.nodes && typeof runtime.nodes === 'object' ? runtime.nodes : {};
  for (const [nodeId, node] of Object.entries(nodes)) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) continue;
    const index = nodeSiraIndeksiniAl(nodeId, sid);
    if (!index || !Number.isFinite(Number(node.x)) || !Number.isFinite(Number(node.y))) continue;
    rows.push({
      index,
      spawnSerial: Math.max(1, tamEdedAl(node.spawnSerial, 1)),
      x: Math.max(0, Math.min(1200, tamEdedAl(node.x))),
      y: Math.max(0, Math.min(1200, tamEdedAl(node.y))),
      remainingAmount: menfiOlmayanTamEdedAl(node.remainingAmount),
      occupiedByPlayerId: metnAl(node.occupiedByPlayerId, 128),
      occupiedByConvoyId: metnAl(node.occupiedByConvoyId, 64),
      occupiedUntilMs: menfiOlmayanTamEdedAl(node.occupiedUntilMs),
      respawnAtMs: menfiOlmayanTamEdedAl(node.respawnAtMs),
      lastSpawnAtMs: menfiOlmayanTamEdedAl(node.lastSpawnAtMs),
    });
  }
  rows.sort((a, b) => a.index - b.index);
  return rows;
}

async function worldV2LegacyRuntimeImportEtClient(client, stateId, runtime, legacyAuditId, {
  batchSize = DEFAULT_IMPORT_BATCH,
  provisionedCount = null,
  physicalCapacityReached = false,
} = {}) {
  const sid = sidAl(stateId);
  const rows = legacyRuntimeSetirleriniHazirla(sid, runtime);
  const batch = Math.max(50, Math.min(2000, tamEdedAl(batchSize, DEFAULT_IMPORT_BATCH)));
  let yazilan = 0;
  for (let offset = 0; offset < rows.length; offset += batch) {
    const p = rows.slice(offset, offset + batch);
    await client.query(
      `INSERT INTO ${RUNTIME_CEDVELI}
        (state_id, node_index, spawn_serial, x, y, remaining_amount,
         occupied_by_player_id, occupied_by_convoy_id, occupied_until_ms,
         respawn_at_ms, last_spawn_at_ms, yenilenme_vaxti)
       SELECT $1, t.node_index, t.spawn_serial, t.x, t.y, t.remaining_amount,
              t.occupied_by_player_id, t.occupied_by_convoy_id, t.occupied_until_ms,
              t.respawn_at_ms, t.last_spawn_at_ms, NOW()
       FROM UNNEST($2::integer[], $3::integer[], $4::smallint[], $5::smallint[],
                   $6::integer[], $7::text[], $8::text[], $9::bigint[],
                   $10::bigint[], $11::bigint[])
       AS t(node_index, spawn_serial, x, y, remaining_amount,
            occupied_by_player_id, occupied_by_convoy_id, occupied_until_ms,
            respawn_at_ms, last_spawn_at_ms)
       ON CONFLICT (state_id, node_index) DO UPDATE SET
         spawn_serial = EXCLUDED.spawn_serial,
         x = EXCLUDED.x, y = EXCLUDED.y,
         remaining_amount = EXCLUDED.remaining_amount,
         occupied_by_player_id = EXCLUDED.occupied_by_player_id,
         occupied_by_convoy_id = EXCLUDED.occupied_by_convoy_id,
         occupied_until_ms = EXCLUDED.occupied_until_ms,
         respawn_at_ms = EXCLUDED.respawn_at_ms,
         last_spawn_at_ms = EXCLUDED.last_spawn_at_ms,
         yenilenme_vaxti = NOW()`,
      [sid, p.map(r => r.index), p.map(r => r.spawnSerial), p.map(r => r.x), p.map(r => r.y),
        p.map(r => r.remainingAmount), p.map(r => r.occupiedByPlayerId), p.map(r => r.occupiedByConvoyId),
        p.map(r => r.occupiedUntilMs), p.map(r => r.respawnAtMs), p.map(r => r.lastSpawnAtMs)],
    );
    yazilan += p.length;
  }
  const say = provisionedCount == null ? rows.length : menfiOlmayanTamEdedAl(provisionedCount);
  await client.query(
    `INSERT INTO ${STATE_CEDVELI}
      (state_id, provisioned_count, physical_capacity_reached, revision, legacy_audit_id, yenilenme_vaxti)
     VALUES ($1,$2,$3,1,$4,NOW())
     ON CONFLICT (state_id) DO UPDATE SET
       provisioned_count = EXCLUDED.provisioned_count,
       physical_capacity_reached = EXCLUDED.physical_capacity_reached,
       revision = ${STATE_CEDVELI}.revision + 1,
       legacy_audit_id = EXCLUDED.legacy_audit_id,
       yenilenme_vaxti = NOW()`,
    [sid, say, physicalCapacityReached === true, legacyAuditId == null ? null : String(legacyAuditId)],
  );
  return { stateId: sid, importedCount: yazilan, legacyAuditId: legacyAuditId == null ? null : String(legacyAuditId) };
}

async function worldV2LegacyRuntimePostgreseKocur(stateId, options = {}) {
  const sid = sidAl(stateId);
  const client = await proqramHovuzunuAl().connect();
  try {
    await client.query('BEGIN');
    const hazirdir = await worldV2ResursSqlCedvelleriMovcuddurClient(client);
    if (!hazirdir) throw new Error('WorldV2 SQL runtime cədvəlləri yoxdur. Əvvəl npm run db:migrate icra et.');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1::text), $2::integer)`, [LEGACY_HADISE_NOVU, sid]);
    const legacy = await worldV2LegacyRuntimeAuditdenAlClient(client, sid);
    if (!legacy) throw new Error(`Dövlət ${sid} üçün legacy WorldV2 resurs runtime tapılmadı.`);
    const netice = await worldV2LegacyRuntimeImportEtClient(client, sid, legacy.runtime, legacy.auditId, options);
    await client.query('COMMIT');
    return netice;
  } catch (xeta) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw xeta;
  } finally {
    client.release();
  }
}

module.exports = {
  LEGACY_HADISE_NOVU,
  RUNTIME_CEDVELI,
  STATE_CEDVELI,
  MAX_VIEWPORT_LIMIT,
  worldV2ResursSqlCedvelleriMovcuddurClient,
  worldV2ResursStateMetaAlClient,
  worldV2ResursSahesiniSqlDenAlClient,
  worldV2ResursNodeAlClient,
  worldV2ResursNodeYazClient,
  worldV2ResursRevisionArtirClient,
  worldV2LegacyRuntimeAuditdenAlClient,
  legacyRuntimeSetirleriniHazirla,
  worldV2LegacyRuntimeImportEtClient,
  worldV2LegacyRuntimePostgreseKocur,
};
