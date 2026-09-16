'use strict';

const { proqramHovuzunuAl } = require('./verilenler_bazasi');
const {
  worldV2ResursDescriptoruAl,
  zonaTesviriAl,
  XERITE_MAX,
  XERITE_MERKEZI,
  SERHED_PAYI,
  BAZADAN_MIN_MESAFE,
  RESURSDAN_MIN_MESAFE,
  KOHNE_MOVQEDEN_MIN_MESAFE,
  PREZIDENT_MERKEZINDEN_MIN_MESAFE,
} = require('./dovlet_xerite_worldv2_resurs_provider');
const {
  RUNTIME_CEDVELI,
  worldV2ResursNodeAlClient,
  worldV2ResursNodeYazClient,
  worldV2ResursRevisionArtirClient,
} = require('./dovlet_xerite_worldv2_resurs_runtime_postgres');
const {
  SQL_AUTHORITATIVE,
  worldV2SqlMutasiyaFlagAktivdir,
  worldV2ResursRuntimeModeAlClient,
  worldV2ResursRuntimeModeAl,
} = require('./dovlet_xerite_worldv2_resurs_runtime_mode');
const {
  dovletBazalariniBirbasaPostgresdenAlClient,
} = require('./dovlet_baza_kataloqu_postgres');

const TARGET_REGEX = /^state_(\d+)_worldv2_resource_(\d+)_spawn_(\d+)$/;
const MAKSIMUM_MOVQE_CEHDI = 180;
const RESPawn_BATCH = 64;
const RESPawn_YOXLAMA_ARALIGI_MS = 1000;
const sonRespawnYoxlamasi = new Map();

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
  return typeof v === 'string' ? v.trim().slice(0, max).toLowerCase() : '';
}

function targetiParcala(targetId) {
  const id = metnAl(targetId);
  const m = id.match(TARGET_REGEX);
  if (!m) return null;
  const stateId = tamEdedAl(m[1]);
  const index = tamEdedAl(m[2]);
  const spawnSerial = tamEdedAl(m[3]);
  if (stateId <= 0 || index <= 0 || spawnSerial <= 0) return null;
  return {
    targetId: id,
    stateId,
    index,
    spawnSerial,
    nodeId: `state_${stateId}_worldv2_resource_${index}`,
  };
}

function effektivMesgulluq(node, nowMs) {
  const occupiedUntilMs = menfiOlmayanTamEdedAl(node && node.occupiedUntilMs);
  const aktivdir = !!(
    node && metnAl(node.occupiedByPlayerId, 128) && metnAl(node.occupiedByConvoyId, 64) &&
    occupiedUntilMs > nowMs
  );
  return {
    aktivdir,
    occupiedByPlayerId: aktivdir ? metnAl(node.occupiedByPlayerId, 128) : '',
    occupiedByConvoyId: aktivdir ? metnAl(node.occupiedByConvoyId, 64) : '',
    occupiedUntilMs: aktivdir ? occupiedUntilMs : 0,
  };
}

function nodeCariSpawnIleUygundur(node, p) {
  return !!node && !!p && Math.max(1, tamEdedAl(node.spawnSerial, 1)) === p.spawnSerial;
}

function hedefPayloadiniHazirla(p, node, descriptor, nowMs) {
  const remainingAmount = Math.min(
    menfiOlmayanTamEdedAl(node && node.remainingAmount, descriptor.fullAmount),
    descriptor.fullAmount,
  );
  const respawnAtMs = menfiOlmayanTamEdedAl(node && node.respawnAtMs);
  const mesgulluq = effektivMesgulluq(node, nowMs);
  return {
    targetType: 'resource',
    targetId: p.targetId,
    nodeId: descriptor.nodeId,
    resourceSystem: 'worldv2',
    stateId: descriptor.stateId,
    index: descriptor.index,
    zoneId: descriptor.zoneId,
    resourceId: descriptor.resourceId,
    level: descriptor.level,
    x: Number(node && node.x),
    y: Number(node && node.y),
    z: Number(node && node.y),
    fullAmount: descriptor.fullAmount,
    remainingAmount,
    gatherSeconds: descriptor.gatherSeconds,
    actionDurationMs: Math.max(1, descriptor.gatherSeconds * 1000),
    available: remainingAmount > 0 && respawnAtMs === 0 && !mesgulluq.aktivdir,
    occupiedByPlayerId: mesgulluq.occupiedByPlayerId,
    occupiedByConvoyId: mesgulluq.occupiedByConvoyId,
    occupiedUntilMs: mesgulluq.occupiedUntilMs,
    respawnAtMs,
    spawnSerial: p.spawnSerial,
  };
}

async function worldV2SqlNativeIstifadeEtClient(client, stateId) {
  if (!worldV2SqlMutasiyaFlagAktivdir()) return false;
  const meta = await worldV2ResursRuntimeModeAlClient(client, stateId);
  return meta.migrationReady === true && meta.runtimeMode === SQL_AUTHORITATIVE;
}

async function worldV2SqlNativeIstifadeEt(stateId) {
  if (!worldV2SqlMutasiyaFlagAktivdir()) return false;
  const meta = await worldV2ResursRuntimeModeAl(stateId);
  return meta.migrationReady === true && meta.runtimeMode === SQL_AUTHORITATIVE;
}

async function revisionArtir(client, stateId) {
  return await worldV2ResursRevisionArtirClient(client, stateId);
}

async function worldV2ResursHedefiniSqlAlClient(client, stateId, targetId, nowMs = Date.now(), forUpdate = false) {
  const sid = sidAl(stateId);
  const p = targetiParcala(targetId);
  const indi = menfiOlmayanTamEdedAl(nowMs, Date.now());
  if (!p || p.stateId !== sid) {
    return { success: false, errorCode: 'WORLDV2_RESOURCE_TARGET_INVALID', message: 'Resurs hədəfi bu Dövlətə aid deyil.' };
  }
  const node = await worldV2ResursNodeAlClient(client, sid, p.index, forUpdate);
  if (!nodeCariSpawnIleUygundur(node, p)) {
    return { success: false, errorCode: 'WORLDV2_RESOURCE_STALE_TARGET', message: 'Resurs artıq dəyişib və ya yeni koordinatda yaranıb.' };
  }
  const descriptor = worldV2ResursDescriptoruAl(sid, p.index);
  const hedef = hedefPayloadiniHazirla(p, node, descriptor, indi);
  if (hedef.remainingAmount <= 0 || hedef.respawnAtMs > 0) {
    return { success: false, errorCode: 'WORLDV2_RESOURCE_DEPLETED', message: 'Resurs tükənib və yenilənir.' };
  }
  return { success: true, hedef, node, parcalanmis: p };
}

async function worldV2ResursHedefiniSqlAl(stateId, targetId, nowMs = Date.now()) {
  const client = await proqramHovuzunuAl().connect();
  try {
    return await worldV2ResursHedefiniSqlAlClient(client, stateId, targetId, nowMs, false);
  } finally {
    client.release();
  }
}

async function worldV2ResursDaxilOlmaVeziyyetiniSqlAlClient(client, melumat) {
  const netice = await worldV2ResursHedefiniSqlAlClient(
    client, melumat.stateId, melumat.targetId, melumat.nowMs, false,
  );
  if (!netice || netice.success !== true || !netice.hedef) return netice;
  const oyuncuId = metnAl(melumat.playerId, 128);
  const konvoyId = metnAl(melumat.convoyId, 64);
  const hedef = netice.hedef;
  if (!hedef.occupiedByPlayerId || !hedef.occupiedByConvoyId) return { success: true, veziyyet: 'bos', hedef };
  if (hedef.occupiedByPlayerId === oyuncuId && hedef.occupiedByConvoyId === konvoyId) {
    return { success: true, veziyyet: 'oz_konvoyu', hedef };
  }
  if (hedef.occupiedByPlayerId === oyuncuId) return { success: true, veziyyet: 'oz_diger_konvoyu', hedef };
  return {
    success: true, veziyyet: 'basqa_oyuncu', hedef,
    defenderPlayerId: hedef.occupiedByPlayerId,
    defenderConvoyId: hedef.occupiedByConvoyId,
  };
}

async function worldV2ResursuSqlRezervEtClient(client, melumat) {
  const sid = sidAl(melumat.stateId);
  const oyuncuId = metnAl(melumat.playerId, 128);
  const konvoyId = metnAl(melumat.convoyId, 64);
  const indi = menfiOlmayanTamEdedAl(melumat.nowMs, Date.now());
  const bitir = Math.max(indi + 1, menfiOlmayanTamEdedAl(melumat.occupiedUntilMs, indi + 1));
  if (!oyuncuId || !konvoyId) {
    return { success: false, errorCode: 'WORLDV2_RESOURCE_RESERVE_INVALID', message: 'Resurs rezerv məlumatı natamamdır.' };
  }
  const yoxla = await worldV2ResursHedefiniSqlAlClient(client, sid, melumat.targetId, indi, true);
  if (!yoxla.success) return yoxla;
  const node = yoxla.node;
  const mesgulluq = effektivMesgulluq(node, indi);
  if (mesgulluq.aktivdir && (mesgulluq.occupiedByPlayerId !== oyuncuId || mesgulluq.occupiedByConvoyId !== konvoyId)) {
    return {
      success: false, errorCode: 'WORLDV2_RESOURCE_OCCUPIED', message: 'Resurs başqa konvoy tərəfindən tutulub.',
      occupiedByPlayerId: mesgulluq.occupiedByPlayerId,
      occupiedByConvoyId: mesgulluq.occupiedByConvoyId,
      occupiedUntilMs: mesgulluq.occupiedUntilMs,
    };
  }
  node.occupiedByPlayerId = oyuncuId;
  node.occupiedByConvoyId = konvoyId;
  node.occupiedUntilMs = bitir;
  await worldV2ResursNodeYazClient(client, sid, yoxla.parcalanmis.index, node);
  const runtimeRevision = await revisionArtir(client, sid);
  return {
    deyisdi: true, success: true, targetId: yoxla.parcalanmis.targetId,
    remainingAmount: yoxla.hedef.remainingAmount, occupiedUntilMs: bitir, runtimeRevision,
  };
}

async function worldV2ResursSahibliyiniSqlKocurClient(client, melumat) {
  const sid = sidAl(melumat.stateId);
  const defenderPlayerId = metnAl(melumat.gozlenilenDefenderPlayerId, 128);
  const defenderConvoyId = metnAl(melumat.gozlenilenDefenderConvoyId, 64);
  const playerId = metnAl(melumat.yeniPlayerId, 128);
  const convoyId = metnAl(melumat.yeniConvoyId, 64);
  const indi = menfiOlmayanTamEdedAl(melumat.nowMs, Date.now());
  const bitir = Math.max(indi + 1, menfiOlmayanTamEdedAl(melumat.occupiedUntilMs, indi + 1));
  if (!defenderPlayerId || !defenderConvoyId || !playerId || !convoyId) {
    return { success: false, errorCode: 'WORLDV2_RESOURCE_TRANSFER_INVALID', message: 'Resurs sahibliyi transfer məlumatı natamamdır.' };
  }
  const yoxla = await worldV2ResursHedefiniSqlAlClient(client, sid, melumat.targetId, indi, true);
  if (!yoxla.success) return yoxla;
  const mesgulluq = effektivMesgulluq(yoxla.node, indi);
  if (!mesgulluq.aktivdir || mesgulluq.occupiedByPlayerId !== defenderPlayerId || mesgulluq.occupiedByConvoyId !== defenderConvoyId) {
    return { success: false, errorCode: 'WORLDV2_RESOURCE_OWNER_CHANGED', message: 'Resursun cari işğalçısı artıq dəyişib.' };
  }
  yoxla.node.occupiedByPlayerId = playerId;
  yoxla.node.occupiedByConvoyId = convoyId;
  yoxla.node.occupiedUntilMs = bitir;
  await worldV2ResursNodeYazClient(client, sid, yoxla.parcalanmis.index, yoxla.node);
  const runtimeRevision = await revisionArtir(client, sid);
  return {
    deyisdi: true, success: true, targetId: yoxla.parcalanmis.targetId,
    remainingAmount: yoxla.hedef.remainingAmount,
    occupiedByPlayerId: playerId, occupiedByConvoyId: convoyId,
    occupiedUntilMs: bitir, runtimeRevision,
  };
}

async function worldV2ResursSqlRezerviniBuraxClient(client, melumat) {
  const sid = sidAl(melumat.stateId);
  const p = targetiParcala(melumat.targetId);
  if (!p || p.stateId !== sid) return { success: true, deyisdi: false, released: false };
  const node = await worldV2ResursNodeAlClient(client, sid, p.index, true);
  if (!nodeCariSpawnIleUygundur(node, p)) return { success: true, deyisdi: false, released: false };
  const ownerMatches = metnAl(node.occupiedByPlayerId, 128) === metnAl(melumat.playerId, 128) &&
    metnAl(node.occupiedByConvoyId, 64) === metnAl(melumat.convoyId, 64);
  if (!ownerMatches) return { success: true, deyisdi: false, released: false };
  node.occupiedByPlayerId = '';
  node.occupiedByConvoyId = '';
  node.occupiedUntilMs = 0;
  await worldV2ResursNodeYazClient(client, sid, p.index, node);
  const runtimeRevision = await revisionArtir(client, sid);
  return {
    deyisdi: true, success: true, released: true,
    releasedAtMs: menfiOlmayanTamEdedAl(melumat.nowMs, Date.now()), runtimeRevision,
  };
}

async function worldV2ResursToplamaniSqlBitirClient(client, melumat) {
  const sid = sidAl(melumat.stateId);
  const p = targetiParcala(melumat.targetId);
  const oyuncuId = metnAl(melumat.playerId, 128);
  const konvoyId = metnAl(melumat.convoyId, 64);
  const indi = menfiOlmayanTamEdedAl(melumat.nowMs, Date.now());
  if (!p || p.stateId !== sid || !oyuncuId || !konvoyId) {
    return { success: false, errorCode: 'WORLDV2_RESOURCE_GATHER_INVALID', message: 'Resurs toplama məlumatı natamamdır.' };
  }
  const node = await worldV2ResursNodeAlClient(client, sid, p.index, true);
  if (!nodeCariSpawnIleUygundur(node, p)) {
    return { success: false, errorCode: 'WORLDV2_RESOURCE_STALE_TARGET', message: 'Resurs artıq yeni spawn-a keçib.' };
  }
  const descriptor = worldV2ResursDescriptoruAl(sid, p.index);
  const ownerMatches = metnAl(node.occupiedByPlayerId, 128) === oyuncuId &&
    metnAl(node.occupiedByConvoyId, 64) === konvoyId;
  if (!ownerMatches) {
    return { success: false, errorCode: 'WORLDV2_RESOURCE_NOT_OWNED', message: 'Resurs bu konvoy tərəfindən rezerv edilməyib.' };
  }
  const remaining = Math.min(menfiOlmayanTamEdedAl(node.remainingAmount, descriptor.fullAmount), descriptor.fullAmount);
  if (remaining <= 0 || menfiOlmayanTamEdedAl(node.respawnAtMs) > 0) {
    node.occupiedByPlayerId = '';
    node.occupiedByConvoyId = '';
    node.occupiedUntilMs = 0;
    await worldV2ResursNodeYazClient(client, sid, p.index, node);
    const runtimeRevision = await revisionArtir(client, sid);
    return { deyisdi: true, success: false, errorCode: 'WORLDV2_RESOURCE_DEPLETED', message: 'Resurs artıq tükənib.', runtimeRevision };
  }
  const istenen = menfiOlmayanTamEdedAl(melumat.miqdar, remaining);
  const goturulen = Math.min(remaining, istenen > 0 ? istenen : remaining);
  node.remainingAmount = remaining - goturulen;
  node.occupiedByPlayerId = '';
  node.occupiedByConvoyId = '';
  node.occupiedUntilMs = 0;
  if (node.remainingAmount <= 0) {
    node.remainingAmount = 0;
    node.respawnAtMs = indi + descriptor.respawnSeconds * 1000;
  }
  await worldV2ResursNodeYazClient(client, sid, p.index, node);
  const runtimeRevision = await revisionArtir(client, sid);
  return {
    deyisdi: true, success: true, targetId: p.targetId, nodeId: descriptor.nodeId,
    resourceId: descriptor.resourceId, level: descriptor.level, goturulen,
    remainingAmount: node.remainingAmount, fullAmount: descriptor.fullAmount,
    respawnAtMs: menfiOlmayanTamEdedAl(node.respawnAtMs), completedAtMs: indi, runtimeRevision,
  };
}

function rawRowNode(row) {
  return row ? {
    index: tamEdedAl(row.node_index),
    spawnSerial: Math.max(1, tamEdedAl(row.spawn_serial, 1)),
    x: tamEdedAl(row.x), y: tamEdedAl(row.y),
    remainingAmount: menfiOlmayanTamEdedAl(row.remaining_amount),
    occupiedByPlayerId: metnAl(row.occupied_by_player_id, 128),
    occupiedByConvoyId: metnAl(row.occupied_by_convoy_id, 64),
    occupiedUntilMs: menfiOlmayanTamEdedAl(row.occupied_until_ms),
    respawnAtMs: menfiOlmayanTamEdedAl(row.respawn_at_ms),
    lastSpawnAtMs: menfiOlmayanTamEdedAl(row.last_spawn_at_ms),
  } : null;
}

async function worldV2TeleportSaheResurslariniSqlSilClient(client, melumat) {
  const sid = sidAl(melumat.stateId);
  const x = tamEdedAl(melumat.x, -1);
  const y = tamEdedAl(melumat.y, -1);
  if (!Number.isInteger(Number(melumat.stateId)) || Number(melumat.stateId) <= 0 ||
      x < 0 || y < 0 || x + 1 > 1200 || y + 1 > 1200) {
    throw new Error('Teleport resurs təmizləməsi üçün etibarlı 2×2 sahə tələb olunur.');
  }
  const indi = menfiOlmayanTamEdedAl(melumat.nowMs, Date.now());
  const netice = await client.query(
    `SELECT node_index, spawn_serial, x, y, remaining_amount,
            occupied_by_player_id, occupied_by_convoy_id, occupied_until_ms,
            respawn_at_ms, last_spawn_at_ms
       FROM ${RUNTIME_CEDVELI}
      WHERE state_id = $1
        AND x BETWEEN $2 AND $3
        AND y BETWEEN $4 AND $5
        AND remaining_amount > 0 AND respawn_at_ms = 0
      ORDER BY node_index
      FOR UPDATE`,
    [sid, x, x + 1, y, y + 1],
  );
  const removedResourceTargetIds = [];
  for (const row of netice.rows || []) {
    const node = rawRowNode(row);
    if (!node) continue;
    const descriptor = worldV2ResursDescriptoruAl(sid, node.index);
    removedResourceTargetIds.push(`${descriptor.nodeId}_spawn_${node.spawnSerial}`);
    node.remainingAmount = 0;
    node.respawnAtMs = indi + Math.max(1, descriptor.respawnSeconds) * 1000;
    node.occupiedByPlayerId = '';
    node.occupiedByConvoyId = '';
    node.occupiedUntilMs = 0;
    await worldV2ResursNodeYazClient(client, sid, node.index, node);
  }
  if (removedResourceTargetIds.length > 0) await revisionArtir(client, sid);
  return { deyisdi: removedResourceTargetIds.length > 0, removedResourceTargetIds };
}

function seededRng(seed) {
  let s = (Number(seed) || 1) >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function mesafeKvadrati(aX, aY, bX, bY) {
  const dx = Number(aX) - Number(bX);
  const dy = Number(aY) - Number(bY);
  return dx * dx + dy * dy;
}

function namizedZonaVeMesafeyeUygundur(x, y, zona, bases, kohneMovqe) {
  if (x < SERHED_PAYI || x > XERITE_MAX - SERHED_PAYI || y < SERHED_PAYI || y > XERITE_MAX - SERHED_PAYI) return false;
  const merkezMesafesi = Math.max(Math.abs(x - XERITE_MERKEZI), Math.abs(y - XERITE_MERKEZI));
  if (!(merkezMesafesi > zona.minimumMerkezMesafesi && merkezMesafesi <= zona.maksimumMerkezMesafesi)) return false;
  const bazaKv = BAZADAN_MIN_MESAFE * BAZADAN_MIN_MESAFE;
  for (const baza of bases || []) if (mesafeKvadrati(x, y, baza.x, baza.y) < bazaKv) return false;
  if (kohneMovqe && mesafeKvadrati(x, y, kohneMovqe.x, kohneMovqe.y) < KOHNE_MOVQEDEN_MIN_MESAFE * KOHNE_MOVQEDEN_MIN_MESAFE) return false;
  if (mesafeKvadrati(x, y, XERITE_MERKEZI, XERITE_MERKEZI) < PREZIDENT_MERKEZINDEN_MIN_MESAFE * PREZIDENT_MERKEZINDEN_MIN_MESAFE) return false;
  return true;
}

async function sqlYaxinResursVarClient(client, stateId, index, x, y) {
  const radius = Math.max(1, RESURSDAN_MIN_MESAFE);
  const netice = await client.query(
    `SELECT 1
       FROM ${RUNTIME_CEDVELI}
      WHERE state_id = $1 AND node_index <> $2
        AND remaining_amount > 0 AND respawn_at_ms = 0
        AND x BETWEEN $3 AND $4 AND y BETWEEN $5 AND $6
        AND ((x - $7) * (x - $7) + (y - $8) * (y - $8)) < $9
      LIMIT 1`,
    [stateId, index, x - radius, x + radius, y - radius, y + radius, x, y, radius * radius],
  );
  return !!(netice.rows && netice.rows.length);
}

async function sqlRespawnMovqeyiSecClient(client, stateId, index, spawnSerial, bases, kohneMovqe) {
  const zona = zonaTesviriAl(index);
  const rng = seededRng(stateId * 1000003 + index * 9176 + spawnSerial * 65537);
  for (let cehd = 0; cehd < MAKSIMUM_MOVQE_CEHDI; cehd++) {
    const x = Math.round(SERHED_PAYI + rng() * (XERITE_MAX - SERHED_PAYI * 2));
    const y = Math.round(SERHED_PAYI + rng() * (XERITE_MAX - SERHED_PAYI * 2));
    if (!namizedZonaVeMesafeyeUygundur(x, y, zona, bases, kohneMovqe)) continue;
    if (await sqlYaxinResursVarClient(client, stateId, index, x, y)) continue;
    return { x, y };
  }
  return null;
}

function bazaMovqeleriniHazirla(netice) {
  return ((netice && netice.bases) || []).map(baza => ({
    x: Number(baza && (baza.x != null ? baza.x : baza.baseX)),
    y: Number(baza && (baza.y != null ? baza.y : baza.baseZ)),
  })).filter(v => Number.isFinite(v.x) && Number.isFinite(v.y));
}

async function worldV2SqlRespawnlariYenileClient(client, stateId, nowMs = Date.now(), batchSize = RESPawn_BATCH) {
  const sid = sidAl(stateId);
  if (!await worldV2SqlNativeIstifadeEtClient(client, sid)) return { updated: 0, skipped: 'not_authoritative' };
  const indi = menfiOlmayanTamEdedAl(nowMs, Date.now());
  const limit = Math.max(1, Math.min(256, tamEdedAl(batchSize, RESPawn_BATCH)));
  const due = await client.query(
    `SELECT node_index, spawn_serial, x, y, remaining_amount,
            occupied_by_player_id, occupied_by_convoy_id, occupied_until_ms,
            respawn_at_ms, last_spawn_at_ms
       FROM ${RUNTIME_CEDVELI}
      WHERE state_id = $1 AND respawn_at_ms > 0 AND respawn_at_ms <= $2
      ORDER BY respawn_at_ms, node_index
      LIMIT $3
      FOR UPDATE SKIP LOCKED`,
    [sid, indi, limit],
  );
  if (!due.rows || due.rows.length === 0) return { updated: 0 };

  const bazalar = bazaMovqeleriniHazirla(await dovletBazalariniBirbasaPostgresdenAlClient(client, sid));
  let updated = 0;
  let delayed = 0;
  for (const row of due.rows) {
    const node = rawRowNode(row);
    if (!node) continue;
    const descriptor = worldV2ResursDescriptoruAl(sid, node.index);
    const yeniSerial = Math.max(1, node.spawnSerial + 1);
    const movqe = await sqlRespawnMovqeyiSecClient(
      client, sid, node.index, yeniSerial, bazalar, { x: node.x, y: node.y },
    );
    if (!movqe) {
      node.respawnAtMs = indi + 5000;
      await worldV2ResursNodeYazClient(client, sid, node.index, node);
      delayed++;
      continue;
    }
    node.spawnSerial = yeniSerial;
    node.x = movqe.x;
    node.y = movqe.y;
    node.remainingAmount = descriptor.fullAmount;
    node.occupiedByPlayerId = '';
    node.occupiedByConvoyId = '';
    node.occupiedUntilMs = 0;
    node.respawnAtMs = 0;
    node.lastSpawnAtMs = indi;
    await worldV2ResursNodeYazClient(client, sid, node.index, node);
    updated++;
  }
  if (updated > 0 || delayed > 0) await revisionArtir(client, sid);
  return { updated, delayed };
}

async function worldV2SqlRespawnlariYenile(stateId, nowMs = Date.now()) {
  if (!worldV2SqlMutasiyaFlagAktivdir()) return { updated: 0, skipped: 'flag_off' };
  const sid = sidAl(stateId);
  const indi = menfiOlmayanTamEdedAl(nowMs, Date.now());
  const son = sonRespawnYoxlamasi.get(sid) || 0;
  if (indi - son < RESPawn_YOXLAMA_ARALIGI_MS) return { updated: 0, skipped: 'throttled' };
  sonRespawnYoxlamasi.set(sid, indi);

  const client = await proqramHovuzunuAl().connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext($1::text), $2::integer)`,
      ['worldv2_sql_respawn_v1', sid],
    );
    const netice = await worldV2SqlRespawnlariYenileClient(client, sid, indi);
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
  TARGET_REGEX,
  targetiParcala,
  effektivMesgulluq,
  worldV2SqlNativeIstifadeEtClient,
  worldV2SqlNativeIstifadeEt,
  worldV2ResursHedefiniSqlAlClient,
  worldV2ResursHedefiniSqlAl,
  worldV2ResursDaxilOlmaVeziyyetiniSqlAlClient,
  worldV2ResursuSqlRezervEtClient,
  worldV2ResursSahibliyiniSqlKocurClient,
  worldV2ResursSqlRezerviniBuraxClient,
  worldV2ResursToplamaniSqlBitirClient,
  worldV2TeleportSaheResurslariniSqlSilClient,
  sqlRespawnMovqeyiSecClient,
  worldV2SqlRespawnlariYenileClient,
  worldV2SqlRespawnlariYenile,
};
