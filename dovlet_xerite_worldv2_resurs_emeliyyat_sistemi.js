'use strict';

const {
  proqramHovuzunuAl,
} = require('./verilenler_bazasi');

const {
  HADISE_NOVU,
  RESURS_SAYI,
  worldV2ResursDescriptoruAl,
} = require('./dovlet_xerite_worldv2_resurs_provider');

const WORLDV2_RESURS_TARGET_REGEX = /^state_(\d+)_worldv2_resource_(\d+)_spawn_(\d+)$/;

function metnAl(deyer, maksimum = 220) {
  return typeof deyer === 'string'
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : '';
}

function tamEdedAl(deyer, fallback = 0) {
  const reqem = Number(deyer);
  return Number.isFinite(reqem)
    ? Math.trunc(reqem)
    : fallback;
}

function menfiOlmayanTamEdedAl(deyer, fallback = 0) {
  return Math.max(0, tamEdedAl(deyer, fallback));
}

function sidAl(stateId) {
  return Math.max(1, tamEdedAl(stateId, 1));
}

function kopyala(deyer) {
  return deyer == null ? deyer : JSON.parse(JSON.stringify(deyer));
}

function stateAcar(stateId) {
  return `__dovlet_worldv2_resurs_${sidAl(stateId)}__`;
}

function worldV2ResursTargetIdDirmi(targetId) {
  return WORLDV2_RESURS_TARGET_REGEX.test(metnAl(targetId, 220));
}

function worldV2ResursTargetiniParcala(targetId) {
  const id = metnAl(targetId, 220);
  const match = id.match(WORLDV2_RESURS_TARGET_REGEX);
  if (!match) return null;

  const stateId = tamEdedAl(match[1]);
  const index = tamEdedAl(match[2]);
  const spawnSerial = tamEdedAl(match[3]);

  if (stateId <= 0 || index <= 0 || index > RESURS_SAYI || spawnSerial <= 0) {
    return null;
  }

  return {
    targetId: id,
    stateId,
    index,
    spawnSerial,
    nodeId: `state_${stateId}_worldv2_resource_${index}`,
  };
}

function bosRuntime(stateId) {
  return {
    version: 2,
    stateId: sidAl(stateId),
    nodes: {},
  };
}

function runtimeNeticesiniHazirla(stateId, netice) {
  const sid = sidAl(stateId);
  const detallar = netice && netice.rows && netice.rows[0] && netice.rows[0].detallar;
  const runtime = detallar && typeof detallar === 'object' && detallar.runtime
    ? kopyala(detallar.runtime)
    : bosRuntime(sid);

  runtime.version = 2;
  runtime.stateId = sid;
  if (!runtime.nodes || typeof runtime.nodes !== 'object' || Array.isArray(runtime.nodes)) {
    runtime.nodes = {};
  }

  return runtime;
}

async function runtimeOxuClient(client, stateId) {
  const sid = sidAl(stateId);
  const netice = await client.query(
    `SELECT detallar
       FROM hesab_audit_jurnali
      WHERE oyuncu_id = $1 AND hadise_novu = $2
      ORDER BY id DESC
      LIMIT 1`,
    [stateAcar(sid), HADISE_NOVU],
  );

  return runtimeNeticesiniHazirla(sid, netice);
}

async function postgresDovletResursKilidiniAl(client, stateId) {
  await client.query(
    `SELECT pg_advisory_xact_lock(hashtext($1::text), $2::integer)`,
    [HADISE_NOVU, sidAl(stateId)],
  );
}

async function runtimeYazClient(client, stateId, runtime) {
  const acar = stateAcar(stateId);

  await client.query(
    `INSERT INTO hesab_audit_jurnali (hesab_id, oyuncu_id, hadise_novu, detallar)
     VALUES (NULL, $1, $2, $3::jsonb)`,
    [acar, HADISE_NOVU, JSON.stringify({ version: 2, runtime: kopyala(runtime) })],
  );

  await client.query(
    `DELETE FROM hesab_audit_jurnali
      WHERE id IN (
        SELECT id FROM hesab_audit_jurnali
         WHERE oyuncu_id = $1 AND hadise_novu = $2
         ORDER BY id DESC OFFSET 3
      )`,
    [acar, HADISE_NOVU],
  );
}

async function runtimeEmeliyyatiClient(client, stateId, emeliyyat) {
  if (!client || typeof client.query !== 'function') {
    throw new Error('WorldV2 resurs əməliyyatı üçün PostgreSQL client tələb olunur.');
  }

  const sid = sidAl(stateId);
  await postgresDovletResursKilidiniAl(client, sid);
  const runtime = await runtimeOxuClient(client, sid);
  const cavab = await emeliyyat(runtime, sid);

  if (cavab && cavab.deyisdi === true) {
    await runtimeYazClient(client, sid, runtime);
  }

  return cavab;
}

async function ozTransactionIleIcraEt(stateId, emeliyyat) {
  const client = await proqramHovuzunuAl().connect();

  try {
    await client.query('BEGIN');
    const cavab = await runtimeEmeliyyatiClient(client, stateId, emeliyyat);
    await client.query('COMMIT');
    return cavab;
  }
  catch (xeta) {
    try {
      await client.query('ROLLBACK');
    }
    catch (_) {
      // Əsas xəta saxlanılır.
    }
    throw xeta;
  }
  finally {
    client.release();
  }
}

function nodeCariSpawnIleUyğundur(node, parcalanmis) {
  if (!node || typeof node !== 'object' || Array.isArray(node) || !parcalanmis) {
    return false;
  }

  return Math.max(1, tamEdedAl(node.spawnSerial, 1)) === parcalanmis.spawnSerial;
}

function effektivMesgulluq(node, nowMs) {
  const occupiedUntilMs = menfiOlmayanTamEdedAl(node && node.occupiedUntilMs);
  const aktivdir = !!(
    node &&
    metnAl(node.occupiedByPlayerId, 128) &&
    metnAl(node.occupiedByConvoyId, 64) &&
    occupiedUntilMs > nowMs
  );

  return {
    aktivdir,
    occupiedByPlayerId: aktivdir ? metnAl(node.occupiedByPlayerId, 128) : '',
    occupiedByConvoyId: aktivdir ? metnAl(node.occupiedByConvoyId, 64) : '',
    occupiedUntilMs: aktivdir ? occupiedUntilMs : 0,
  };
}

function hedefPayloadiniHazirla(parcalanmis, node, descriptor, nowMs) {
  const remainingAmount = Math.min(
    menfiOlmayanTamEdedAl(node && node.remainingAmount, descriptor.fullAmount),
    descriptor.fullAmount,
  );
  const respawnAtMs = menfiOlmayanTamEdedAl(node && node.respawnAtMs);
  const mesgulluq = effektivMesgulluq(node, nowMs);

  return {
    targetType: 'resource',
    targetId: parcalanmis.targetId,
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
    spawnSerial: parcalanmis.spawnSerial,
  };
}

async function worldV2ResursHedefiniAlClient(client, stateId, targetId, nowMs = Date.now()) {
  const sid = sidAl(stateId);
  const parcalanmis = worldV2ResursTargetiniParcala(targetId);
  const indi = menfiOlmayanTamEdedAl(nowMs, Date.now());

  if (!parcalanmis || parcalanmis.stateId !== sid) {
    return { success: false, errorCode: 'WORLDV2_RESOURCE_TARGET_INVALID', message: 'Resurs hədəfi bu Dövlətə aid deyil.' };
  }

  return runtimeEmeliyyatiClient(client, sid, async runtime => {
    const descriptor = worldV2ResursDescriptoruAl(sid, parcalanmis.index);
    const node = runtime.nodes && runtime.nodes[parcalanmis.nodeId];

    if (!nodeCariSpawnIleUyğundur(node, parcalanmis)) {
      return { deyisdi: false, success: false, errorCode: 'WORLDV2_RESOURCE_STALE_TARGET', message: 'Resurs artıq dəyişib və ya yeni koordinatda yaranıb.' };
    }

    const hedef = hedefPayloadiniHazirla(parcalanmis, node, descriptor, indi);
    if (hedef.remainingAmount <= 0 || hedef.respawnAtMs > 0) {
      return { deyisdi: false, success: false, errorCode: 'WORLDV2_RESOURCE_DEPLETED', message: 'Resurs tükənib və yenilənir.' };
    }

    return { deyisdi: false, success: true, hedef };
  });
}

async function worldV2ResursHedefiniAl(stateId, targetId, nowMs = Date.now()) {
  return ozTransactionIleIcraEt(stateId, async runtime => {
    const sid = sidAl(stateId);
    const parcalanmis = worldV2ResursTargetiniParcala(targetId);
    const indi = menfiOlmayanTamEdedAl(nowMs, Date.now());

    if (!parcalanmis || parcalanmis.stateId !== sid) {
      return { deyisdi: false, success: false, errorCode: 'WORLDV2_RESOURCE_TARGET_INVALID', message: 'Resurs hədəfi bu Dövlətə aid deyil.' };
    }

    const descriptor = worldV2ResursDescriptoruAl(sid, parcalanmis.index);
    const node = runtime.nodes && runtime.nodes[parcalanmis.nodeId];
    if (!nodeCariSpawnIleUyğundur(node, parcalanmis)) {
      return { deyisdi: false, success: false, errorCode: 'WORLDV2_RESOURCE_STALE_TARGET', message: 'Resurs artıq dəyişib və ya yeni koordinatda yaranıb.' };
    }

    const hedef = hedefPayloadiniHazirla(parcalanmis, node, descriptor, indi);
    if (hedef.remainingAmount <= 0 || hedef.respawnAtMs > 0) {
      return { deyisdi: false, success: false, errorCode: 'WORLDV2_RESOURCE_DEPLETED', message: 'Resurs tükənib və yenilənir.' };
    }

    return { deyisdi: false, success: true, hedef };
  });
}

async function worldV2ResursuRezervEtClient(client, {
  stateId,
  targetId,
  playerId,
  convoyId,
  occupiedUntilMs,
  nowMs = Date.now(),
}) {
  const sid = sidAl(stateId);
  const parcalanmis = worldV2ResursTargetiniParcala(targetId);
  const oyuncuId = metnAl(playerId, 128);
  const konvoyId = metnAl(convoyId, 64);
  const indi = menfiOlmayanTamEdedAl(nowMs, Date.now());
  const bitir = Math.max(indi + 1, menfiOlmayanTamEdedAl(occupiedUntilMs, indi + 1));

  if (!parcalanmis || parcalanmis.stateId !== sid || !oyuncuId || !konvoyId) {
    return { success: false, errorCode: 'WORLDV2_RESOURCE_RESERVE_INVALID', message: 'Resurs rezerv məlumatı natamamdır.' };
  }

  return runtimeEmeliyyatiClient(client, sid, async runtime => {
    const descriptor = worldV2ResursDescriptoruAl(sid, parcalanmis.index);
    const node = runtime.nodes && runtime.nodes[parcalanmis.nodeId];

    if (!nodeCariSpawnIleUyğundur(node, parcalanmis)) {
      return { deyisdi: false, success: false, errorCode: 'WORLDV2_RESOURCE_STALE_TARGET', message: 'Resurs artıq yeni spawn-a keçib.' };
    }

    const remainingAmount = Math.min(
      menfiOlmayanTamEdedAl(node.remainingAmount, descriptor.fullAmount),
      descriptor.fullAmount,
    );
    if (remainingAmount <= 0 || menfiOlmayanTamEdedAl(node.respawnAtMs) > 0) {
      return { deyisdi: false, success: false, errorCode: 'WORLDV2_RESOURCE_DEPLETED', message: 'Resurs tükənib və yenilənir.' };
    }

    const mesgulluq = effektivMesgulluq(node, indi);
    if (mesgulluq.aktivdir &&
        (mesgulluq.occupiedByPlayerId !== oyuncuId || mesgulluq.occupiedByConvoyId !== konvoyId)) {
      return { deyisdi: false, success: false, errorCode: 'WORLDV2_RESOURCE_OCCUPIED', message: 'Resurs başqa konvoy tərəfindən tutulub.' };
    }

    node.occupiedByPlayerId = oyuncuId;
    node.occupiedByConvoyId = konvoyId;
    node.occupiedUntilMs = bitir;

    return {
      deyisdi: true,
      success: true,
      targetId: parcalanmis.targetId,
      remainingAmount,
      occupiedUntilMs: bitir,
    };
  });
}

async function worldV2ResursRezerviniBuraxClient(client, {
  stateId,
  targetId,
  playerId,
  convoyId,
  nowMs = Date.now(),
}) {
  const sid = sidAl(stateId);
  const parcalanmis = worldV2ResursTargetiniParcala(targetId);
  const oyuncuId = metnAl(playerId, 128);
  const konvoyId = metnAl(convoyId, 64);

  if (!parcalanmis || parcalanmis.stateId !== sid) {
    return { success: true, deyisdi: false, released: false };
  }

  return runtimeEmeliyyatiClient(client, sid, async runtime => {
    const node = runtime.nodes && runtime.nodes[parcalanmis.nodeId];
    if (!nodeCariSpawnIleUyğundur(node, parcalanmis)) {
      return { deyisdi: false, success: true, released: false };
    }

    const ownerMatches =
      metnAl(node.occupiedByPlayerId, 128) === oyuncuId &&
      metnAl(node.occupiedByConvoyId, 64) === konvoyId;

    if (!ownerMatches) {
      return { deyisdi: false, success: true, released: false };
    }

    node.occupiedByPlayerId = '';
    node.occupiedByConvoyId = '';
    node.occupiedUntilMs = 0;

    return {
      deyisdi: true,
      success: true,
      released: true,
      releasedAtMs: menfiOlmayanTamEdedAl(nowMs, Date.now()),
    };
  });
}

async function worldV2ResursToplamaniBitirClient(client, {
  stateId,
  targetId,
  playerId,
  convoyId,
  miqdar,
  nowMs = Date.now(),
}) {
  const sid = sidAl(stateId);
  const parcalanmis = worldV2ResursTargetiniParcala(targetId);
  const oyuncuId = metnAl(playerId, 128);
  const konvoyId = metnAl(convoyId, 64);
  const indi = menfiOlmayanTamEdedAl(nowMs, Date.now());

  if (!parcalanmis || parcalanmis.stateId !== sid || !oyuncuId || !konvoyId) {
    return { success: false, errorCode: 'WORLDV2_RESOURCE_GATHER_INVALID', message: 'Resurs toplama məlumatı natamamdır.' };
  }

  return runtimeEmeliyyatiClient(client, sid, async runtime => {
    const descriptor = worldV2ResursDescriptoruAl(sid, parcalanmis.index);
    const node = runtime.nodes && runtime.nodes[parcalanmis.nodeId];

    if (!nodeCariSpawnIleUyğundur(node, parcalanmis)) {
      return { deyisdi: false, success: false, errorCode: 'WORLDV2_RESOURCE_STALE_TARGET', message: 'Resurs artıq yeni spawn-a keçib.' };
    }

    const ownerMatches =
      metnAl(node.occupiedByPlayerId, 128) === oyuncuId &&
      metnAl(node.occupiedByConvoyId, 64) === konvoyId;

    if (!ownerMatches) {
      return { deyisdi: false, success: false, errorCode: 'WORLDV2_RESOURCE_NOT_OWNED', message: 'Resurs bu konvoy tərəfindən rezerv edilməyib.' };
    }

    const remaining = Math.min(
      menfiOlmayanTamEdedAl(node.remainingAmount, descriptor.fullAmount),
      descriptor.fullAmount,
    );
    if (remaining <= 0 || menfiOlmayanTamEdedAl(node.respawnAtMs) > 0) {
      node.occupiedByPlayerId = '';
      node.occupiedByConvoyId = '';
      node.occupiedUntilMs = 0;
      return { deyisdi: true, success: false, errorCode: 'WORLDV2_RESOURCE_DEPLETED', message: 'Resurs artıq tükənib.' };
    }

    const istenen = menfiOlmayanTamEdedAl(miqdar, remaining);
    const goturulen = Math.min(remaining, istenen > 0 ? istenen : remaining);
    node.remainingAmount = remaining - goturulen;
    node.occupiedByPlayerId = '';
    node.occupiedByConvoyId = '';
    node.occupiedUntilMs = 0;

    if (node.remainingAmount <= 0) {
      node.remainingAmount = 0;
      node.respawnAtMs = indi + descriptor.respawnSeconds * 1000;
    }

    return {
      deyisdi: true,
      success: true,
      targetId: parcalanmis.targetId,
      nodeId: descriptor.nodeId,
      resourceId: descriptor.resourceId,
      level: descriptor.level,
      goturulen,
      remainingAmount: node.remainingAmount,
      fullAmount: descriptor.fullAmount,
      respawnAtMs: menfiOlmayanTamEdedAl(node.respawnAtMs),
      completedAtMs: indi,
    };
  });
}

module.exports = {
  WORLDV2_RESURS_TARGET_REGEX,
  worldV2ResursTargetIdDirmi,
  worldV2ResursTargetiniParcala,
  runtimeEmeliyyatiClient,
  worldV2ResursHedefiniAlClient,
  worldV2ResursHedefiniAl,
  worldV2ResursuRezervEtClient,
  worldV2ResursRezerviniBuraxClient,
  worldV2ResursToplamaniBitirClient,
};
