'use strict';

const {
  proqramHovuzunuAl,
} = require('./verilenler_bazasi');

const {
  resursLevelMelumatiniAl,
} = require('./xerite_resurs_qaydalari');

const HADISE_NOVU = 'dovlet_worldv2_resurs_runtime_v2';

// Yalnız ilk 600 node-un köhnə deterministik bölgüsünü qoruyan legacy sabitdir.
// Maksimum resurs sayı deyil.
const RESURS_SAYI = 600;
const LEGACY_RESURS_SAYI = 600;
const DEFAULT_AKTIV_RESURS_SAYI = 3000;
const LIMITSIZ_ZONE_DOVRU = 100;

const COL_SON_INDEX = 300;
const ORTA_SON_INDEX = 490;
const DAXILI_SON_INDEX = 590;

const XERITE_MIN = 0;
const XERITE_MAX = 1200;
const XERITE_MERKEZI = 600;
const SERHED_PAYI = 42;
const COL_ZONA_MAKSIMUM_MERKEZ_MESAFESI = XERITE_MERKEZI - SERHED_PAYI;

const BAZADAN_MIN_MESAFE = 18;
// 16 çox seyrək idi və xəritənin fiziki tutumunu tez doldururdu.
// 7 vahid 4.2 ölçülü mobil sprite-lar üçün kifayət qədər təhlükəsiz aralıq saxlayır.
const RESURSDAN_MIN_MESAFE = 7;
const KOHNE_MOVQEDEN_MIN_MESAFE = 50;
const PREZIDENT_MERKEZINDEN_MIN_MESAFE = 35;
const MAKSIMUM_MOVQE_CEHDI = 180;
const MOVQE_XANASI = RESURSDAN_MIN_MESAFE;

const RESURS_NOVLERI = Object.freeze([
  'food',
  'water',
  'wood',
  'iron',
  'fuel',
]);

const yaddaKilidi = new Map();

function tamEdedAl(deyer, fallback = 0) {
  const reqem = Number(deyer);
  return Number.isFinite(reqem) ? Math.trunc(reqem) : fallback;
}

function menfiOlmayanTamEdedAl(deyer, fallback = 0) {
  return Math.max(0, tamEdedAl(deyer, fallback));
}

function musbetTamEdedAl(deyer, fallback = 0) {
  const reqem = tamEdedAl(deyer, fallback);
  return reqem > 0 ? reqem : fallback;
}

function sidAl(stateId) {
  return Math.max(1, tamEdedAl(stateId, 1));
}

function kopyala(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function stateAcar(stateId) {
  return `__dovlet_worldv2_resurs_${sidAl(stateId)}__`;
}

function worldV2ProvisionEdilmisResursSayiniAl() {
  return musbetTamEdedAl(
    process.env.WORLDV2_RESOURCE_ACTIVE_COUNT,
    DEFAULT_AKTIV_RESURS_SAYI,
  );
}

function worldV2AktivResursSayiniAl(istenilenSay = 0) {
  // Inspector müsbət say göndəribsə onu birbaşa qəbul edirik.
  // Statik maksimum yoxdur; real limit yalnız xəritənin fiziki yerləşdirmə tutumudur.
  const istenilen = musbetTamEdedAl(istenilenSay, 0);
  return istenilen > 0
    ? istenilen
    : worldV2ProvisionEdilmisResursSayiniAl();
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

function merkezeKvadratMesafe(x, y) {
  return Math.max(
    Math.abs(Number(x) - XERITE_MERKEZI),
    Math.abs(Number(y) - XERITE_MERKEZI),
  );
}

function zonaObyekti(zoneId) {
  switch (zoneId) {
    case 'outer':
      return {
        zoneId: 'outer',
        minimumMerkezMesafesi: 445,
        maksimumMerkezMesafesi: COL_ZONA_MAKSIMUM_MERKEZ_MESAFESI,
        minimumLevel: 3,
        maksimumLevel: 6,
        presidentCenter: false,
      };

    case 'middle':
      return {
        zoneId: 'middle',
        minimumMerkezMesafesi: 270,
        maksimumMerkezMesafesi: 445,
        minimumLevel: 5,
        maksimumLevel: 8,
        presidentCenter: false,
      };

    case 'inner_green':
      return {
        zoneId: 'inner_green',
        minimumMerkezMesafesi: 115,
        maksimumMerkezMesafesi: 270,
        minimumLevel: 8,
        maksimumLevel: 9,
        presidentCenter: false,
      };

    default:
      return {
        zoneId: 'president_center',
        minimumMerkezMesafesi: PREZIDENT_MERKEZINDEN_MIN_MESAFE,
        maksimumMerkezMesafesi: 115,
        minimumLevel: 10,
        maksimumLevel: 10,
        presidentCenter: true,
      };
  }
}

function zonaTesviriAl(index) {
  const i = Math.max(1, tamEdedAl(index, 1));

  if (i <= LEGACY_RESURS_SAYI) {
    if (i <= COL_SON_INDEX) return zonaObyekti('outer');
    if (i <= ORTA_SON_INDEX) return zonaObyekti('middle');
    if (i <= DAXILI_SON_INDEX) return zonaObyekti('inner_green');
    return zonaObyekti('president_center');
  }

  const dovrIndex = ((i - LEGACY_RESURS_SAYI - 1) % LIMITSIZ_ZONE_DOVRU) + 1;
  if (dovrIndex <= 50) return zonaObyekti('outer');
  if (dovrIndex <= 82) return zonaObyekti('middle');
  if (dovrIndex <= 98) return zonaObyekti('inner_green');
  return zonaObyekti('president_center');
}

function worldV2ResursDescriptoruAl(stateId, index) {
  const sid = sidAl(stateId);
  const i = Math.max(1, tamEdedAl(index, 1));
  const zona = zonaTesviriAl(i);
  const rng = seededRng(sid * 104729 + i * 8191);
  const levelAraligi = Math.max(0, zona.maksimumLevel - zona.minimumLevel);
  const level = zona.minimumLevel + Math.floor(rng() * (levelAraligi + 1));
  const balans = resursLevelMelumatiniAl(level);

  return {
    nodeId: `state_${sid}_worldv2_resource_${i}`,
    stateId: sid,
    index: i,
    zoneId: zona.zoneId,
    resourceId: RESURS_NOVLERI[(i - 1) % RESURS_NOVLERI.length],
    level,
    fullAmount: menfiOlmayanTamEdedAl(balans.amount),
    gatherSeconds: menfiOlmayanTamEdedAl(balans.gatherSeconds),
    respawnSeconds: menfiOlmayanTamEdedAl(balans.respawnSeconds),
    presidentCenter: zona.presidentCenter === true,
  };
}

function koordinatZonayaUyğundur(x, y, zona) {
  const px = Number(x);
  const py = Number(y);

  if (!Number.isFinite(px) || !Number.isFinite(py)) return false;
  if (px < SERHED_PAYI || px > XERITE_MAX - SERHED_PAYI) return false;
  if (py < SERHED_PAYI || py > XERITE_MAX - SERHED_PAYI) return false;

  const merkezMesafesi = merkezeKvadratMesafe(px, py);
  return merkezMesafesi > zona.minimumMerkezMesafesi &&
    merkezMesafesi <= zona.maksimumMerkezMesafesi;
}

function bazaMovqeleriniHazirla(bases) {
  if (!Array.isArray(bases)) return [];

  return bases
    .map(baza => ({
      x: Number(baza && (baza.x != null ? baza.x : baza.baseX)),
      y: Number(baza && (baza.y != null ? baza.y : baza.baseZ)),
    }))
    .filter(movqe => Number.isFinite(movqe.x) && Number.isFinite(movqe.y));
}

function xanaAcari(x, y) {
  return `${Math.floor(Number(x) / MOVQE_XANASI)}:${Math.floor(Number(y) / MOVQE_XANASI)}`;
}

function spatialIndexYarat() {
  return new Map();
}

function spatialIndexeElaveEt(index, movqe) {
  if (!index || !movqe || !Number.isFinite(Number(movqe.x)) || !Number.isFinite(Number(movqe.y))) {
    return;
  }

  const acar = xanaAcari(movqe.x, movqe.y);
  let siyahi = index.get(acar);
  if (!siyahi) {
    siyahi = [];
    index.set(acar, siyahi);
  }
  siyahi.push(movqe);
}

function yaxinResursMovqeleriniAl(index, x, y) {
  if (!index) return [];

  const cx = Math.floor(Number(x) / MOVQE_XANASI);
  const cy = Math.floor(Number(y) / MOVQE_XANASI);
  const netice = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const siyahi = index.get(`${cx + dx}:${cy + dy}`);
      if (Array.isArray(siyahi)) netice.push(...siyahi);
    }
  }

  return netice;
}

function movqeTehlukesizdir({
  x,
  y,
  zona,
  bazaMovqeleri,
  spatialIndex,
  kohneMovqe,
}) {
  if (!koordinatZonayaUyğundur(x, y, zona)) return false;

  const bazaMinKv = BAZADAN_MIN_MESAFE * BAZADAN_MIN_MESAFE;
  for (const baza of bazaMovqeleri || []) {
    if (mesafeKvadrati(x, y, baza.x, baza.y) < bazaMinKv) return false;
  }

  const resursMinKv = RESURSDAN_MIN_MESAFE * RESURSDAN_MIN_MESAFE;
  for (const movqe of yaxinResursMovqeleriniAl(spatialIndex, x, y)) {
    if (mesafeKvadrati(x, y, movqe.x, movqe.y) < resursMinKv) return false;
  }

  if (kohneMovqe && Number.isFinite(Number(kohneMovqe.x)) && Number.isFinite(Number(kohneMovqe.y))) {
    const kohneMinKv = KOHNE_MOVQEDEN_MIN_MESAFE * KOHNE_MOVQEDEN_MIN_MESAFE;
    if (mesafeKvadrati(x, y, kohneMovqe.x, kohneMovqe.y) < kohneMinKv) return false;
  }

  if (mesafeKvadrati(x, y, XERITE_MERKEZI, XERITE_MERKEZI) <
      PREZIDENT_MERKEZINDEN_MIN_MESAFE * PREZIDENT_MERKEZINDEN_MIN_MESAFE) {
    return false;
  }

  return true;
}

function worldV2ResursMovqeyiSec({
  stateId,
  index,
  spawnSerial,
  bases = [],
  spatialIndex = null,
  kohneMovqe = null,
}) {
  const sid = sidAl(stateId);
  const i = Math.max(1, tamEdedAl(index, 1));
  const serial = Math.max(1, tamEdedAl(spawnSerial, 1));
  const zona = zonaTesviriAl(i);
  const bazaMovqeleri = bazaMovqeleriniHazirla(bases);
  const rng = seededRng(sid * 1000003 + i * 9176 + serial * 65537);

  for (let cehd = 0; cehd < MAKSIMUM_MOVQE_CEHDI; cehd++) {
    const x = Math.round(SERHED_PAYI + rng() * (XERITE_MAX - SERHED_PAYI * 2));
    const y = Math.round(SERHED_PAYI + rng() * (XERITE_MAX - SERHED_PAYI * 2));

    if (movqeTehlukesizdir({
      x,
      y,
      zona,
      bazaMovqeleri,
      spatialIndex,
      kohneMovqe,
    })) {
      return { x, y };
    }
  }

  return null;
}

function bosRuntime(stateId) {
  return {
    version: 4,
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

  runtime.version = 4;
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

async function postgresDovletKilidiniAl(client, stateId) {
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
    [acar, HADISE_NOVU, JSON.stringify({ version: 4, runtime: kopyala(runtime) })],
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

async function yerliKilidIleIcraEt(stateId, emeliyyat) {
  const acar = stateAcar(stateId);
  const onceki = yaddaKilidi.get(acar) || Promise.resolve();
  let cavab;

  const yeni = onceki.then(async () => {
    cavab = await emeliyyat();
  });

  yaddaKilidi.set(acar, yeni.catch(() => {}));
  await yeni;
  return cavab;
}

async function runtimeEmeliyyati(stateId, emeliyyat) {
  const sid = sidAl(stateId);

  return yerliKilidIleIcraEt(sid, async () => {
    const client = await proqramHovuzunuAl().connect();

    try {
      await client.query('BEGIN');
      await postgresDovletKilidiniAl(client, sid);
      const runtime = await runtimeOxuClient(client, sid);
      const cavab = await emeliyyat(runtime, sid);
      if (cavab && cavab.deyisdi === true) {
        await runtimeYazClient(client, sid, runtime);
      }
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
  });
}

function nodePayloadHazirla(node, descriptor, nowMs = Date.now()) {
  const remainingAmount = Math.min(
    menfiOlmayanTamEdedAl(node.remainingAmount, descriptor.fullAmount),
    descriptor.fullAmount,
  );
  const spawnSerial = Math.max(1, tamEdedAl(node.spawnSerial, 1));
  const occupiedUntilMs = menfiOlmayanTamEdedAl(node.occupiedUntilMs);
  const mesguldur = !!(
    typeof node.occupiedByPlayerId === 'string' && node.occupiedByPlayerId &&
    typeof node.occupiedByConvoyId === 'string' && node.occupiedByConvoyId &&
    occupiedUntilMs > nowMs
  );

  return {
    targetType: 'resource',
    targetId: `${descriptor.nodeId}_spawn_${spawnSerial}`,
    nodeId: descriptor.nodeId,
    stateId: descriptor.stateId,
    index: descriptor.index,
    zoneId: descriptor.zoneId,
    resourceId: descriptor.resourceId,
    level: descriptor.level,
    x: Number(node.x),
    y: Number(node.y),
    fullAmount: descriptor.fullAmount,
    remainingAmount,
    gatherSeconds: descriptor.gatherSeconds,
    available: remainingAmount > 0 && menfiOlmayanTamEdedAl(node.respawnAtMs) === 0 && !mesguldur,
    occupiedByPlayerId: mesguldur ? node.occupiedByPlayerId : '',
    occupiedByConvoyId: mesguldur ? node.occupiedByConvoyId : '',
    occupiedUntilMs: mesguldur ? occupiedUntilMs : 0,
    respawnAtMs: menfiOlmayanTamEdedAl(node.respawnAtMs),
    presidentCenter: descriptor.presidentCenter === true,
    spawnSerial,
  };
}

function yeniSpawnQur(runtime, descriptor, bases, nowMs, spatialIndex, kohneNode = null) {
  const spawnSerial = Math.max(1, menfiOlmayanTamEdedAl(kohneNode && kohneNode.spawnSerial) + 1);
  const movqe = worldV2ResursMovqeyiSec({
    stateId: descriptor.stateId,
    index: descriptor.index,
    spawnSerial,
    bases,
    spatialIndex,
    kohneMovqe: kohneNode && Number.isFinite(Number(kohneNode.x)) && Number.isFinite(Number(kohneNode.y))
      ? { x: Number(kohneNode.x), y: Number(kohneNode.y) }
      : null,
  });

  if (!movqe) return null;

  return {
    spawnSerial,
    x: movqe.x,
    y: movqe.y,
    remainingAmount: descriptor.fullAmount,
    occupiedByPlayerId: '',
    occupiedByConvoyId: '',
    occupiedUntilMs: 0,
    respawnAtMs: 0,
    lastSpawnAtMs: menfiOlmayanTamEdedAl(nowMs, Date.now()),
  };
}

async function worldV2ResurslariniAl(stateId, bases = [], nowMs = Date.now(), istenilenSay = 0) {
  const sid = sidAl(stateId);
  const indi = menfiOlmayanTamEdedAl(nowMs, Date.now());
  const aktivSay = worldV2AktivResursSayiniAl(istenilenSay);

  const netice = await runtimeEmeliyyati(sid, async runtime => {
    let deyisdi = false;
    let fizikiTutumDoldu = false;
    let ugursuzSpawnSayi = 0;
    const spatialIndex = spatialIndexYarat();

    for (let i = 1; i <= aktivSay; i++) {
      const descriptor = worldV2ResursDescriptoruAl(sid, i);
      const zona = zonaTesviriAl(i);
      let node = runtime.nodes[descriptor.nodeId];

      if (node && typeof node === 'object' && !Array.isArray(node)) {
        const qalan = Math.min(
          menfiOlmayanTamEdedAl(node.remainingAmount, descriptor.fullAmount),
          descriptor.fullAmount,
        );
        node.remainingAmount = qalan;
        const respawnAtMs = menfiOlmayanTamEdedAl(node.respawnAtMs);
        const canlidir = qalan > 0 && respawnAtMs === 0;

        if (canlidir) {
          const movqeNormaldir = koordinatZonayaUyğundur(node.x, node.y, zona) &&
            movqeTehlukesizdir({
              x: Number(node.x),
              y: Number(node.y),
              zona,
              bazaMovqeleri: bazaMovqeleriniHazirla(bases),
              spatialIndex,
              kohneMovqe: null,
            });

          if (movqeNormaldir) {
            if (menfiOlmayanTamEdedAl(node.occupiedUntilMs) <= indi &&
                (node.occupiedByPlayerId || node.occupiedByConvoyId || node.occupiedUntilMs)) {
              node.occupiedByPlayerId = '';
              node.occupiedByConvoyId = '';
              node.occupiedUntilMs = 0;
              deyisdi = true;
            }

            spatialIndexeElaveEt(spatialIndex, {
              x: Number(node.x),
              y: Number(node.y),
              nodeId: descriptor.nodeId,
            });
            ugursuzSpawnSayi = 0;
            continue;
          }

          const yeni = yeniSpawnQur(runtime, descriptor, bases, indi, spatialIndex, node);
          if (yeni) {
            runtime.nodes[descriptor.nodeId] = yeni;
            spatialIndexeElaveEt(spatialIndex, { x: yeni.x, y: yeni.y, nodeId: descriptor.nodeId });
            deyisdi = true;
            ugursuzSpawnSayi = 0;
            continue;
          }

          fizikiTutumDoldu = true;
          ugursuzSpawnSayi++;
          continue;
        }

        if (qalan <= 0 && respawnAtMs <= 0) {
          node.respawnAtMs = indi + descriptor.respawnSeconds * 1000;
          node.occupiedByPlayerId = '';
          node.occupiedByConvoyId = '';
          node.occupiedUntilMs = 0;
          deyisdi = true;
          continue;
        }

        if (qalan <= 0 && indi >= respawnAtMs) {
          const yeni = yeniSpawnQur(runtime, descriptor, bases, indi, spatialIndex, node);
          if (yeni) {
            runtime.nodes[descriptor.nodeId] = yeni;
            spatialIndexeElaveEt(spatialIndex, { x: yeni.x, y: yeni.y, nodeId: descriptor.nodeId });
            deyisdi = true;
            ugursuzSpawnSayi = 0;
          }
          else {
            fizikiTutumDoldu = true;
            ugursuzSpawnSayi++;
          }
          continue;
        }

        continue;
      }

      const yeni = yeniSpawnQur(runtime, descriptor, bases, indi, spatialIndex, null);
      if (yeni) {
        runtime.nodes[descriptor.nodeId] = yeni;
        spatialIndexeElaveEt(spatialIndex, { x: yeni.x, y: yeni.y, nodeId: descriptor.nodeId });
        deyisdi = true;
        ugursuzSpawnSayi = 0;
      }
      else {
        fizikiTutumDoldu = true;
        ugursuzSpawnSayi++;
      }

      // Bütün zonalarda ardıcıl olaraq yer tapılmırsa boşuna minlərlə cəhd etmə.
      if (ugursuzSpawnSayi >= LIMITSIZ_ZONE_DOVRU * 2) {
        break;
      }
    }

    const resources = [];
    for (let i = 1; i <= aktivSay; i++) {
      const descriptor = worldV2ResursDescriptoruAl(sid, i);
      const node = runtime.nodes[descriptor.nodeId];
      if (!node) continue;

      const payload = nodePayloadHazirla(node, descriptor, indi);
      if (payload.remainingAmount <= 0 || payload.respawnAtMs > 0) continue;
      resources.push(payload);
    }

    return {
      deyisdi,
      success: true,
      stateId: sid,
      requestedResourceCount: musbetTamEdedAl(istenilenSay, 0),
      provisionedResourceCount: worldV2ProvisionEdilmisResursSayiniAl(),
      activeResourceCount: resources.length,
      physicalCapacityReached: fizikiTutumDoldu,
      resources,
    };
  });

  return netice && Array.isArray(netice.resources)
    ? {
        stateId: sid,
        requestedResourceCount: netice.requestedResourceCount,
        provisionedResourceCount: netice.provisionedResourceCount,
        activeResourceCount: netice.activeResourceCount,
        physicalCapacityReached: netice.physicalCapacityReached === true,
        resources: netice.resources,
      }
    : {
        stateId: sid,
        requestedResourceCount: musbetTamEdedAl(istenilenSay, 0),
        provisionedResourceCount: worldV2ProvisionEdilmisResursSayiniAl(),
        activeResourceCount: 0,
        physicalCapacityReached: false,
        resources: [],
      };
}

function targetIddenIndexAl(targetId) {
  const match = String(targetId || '').trim().toLowerCase()
    .match(/^state_(\d+)_worldv2_resource_(\d+)_spawn_(\d+)$/);
  if (!match) return null;

  const stateId = musbetTamEdedAl(match[1], 0);
  const index = musbetTamEdedAl(match[2], 0);
  const spawnSerial = musbetTamEdedAl(match[3], 0);

  return stateId && index && spawnSerial
    ? { stateId, index, spawnSerial }
    : null;
}

async function worldV2ResursMiqdariniAzalt({
  stateId,
  targetId,
  miqdar,
  nowMs = Date.now(),
}) {
  const sid = sidAl(stateId);
  const hedefId = typeof targetId === 'string' ? targetId.trim().toLowerCase() : '';
  const azalma = Math.max(0, tamEdedAl(miqdar));
  const indi = menfiOlmayanTamEdedAl(nowMs, Date.now());
  const parca = targetIddenIndexAl(hedefId);

  if (!parca || parca.stateId !== sid || azalma <= 0) {
    return { success: false, message: 'Resurs targetId və miqdar tələb olunur.' };
  }

  return runtimeEmeliyyati(sid, async runtime => {
    const descriptor = worldV2ResursDescriptoruAl(sid, parca.index);
    const node = runtime.nodes[descriptor.nodeId];

    if (!node || Math.max(1, tamEdedAl(node.spawnSerial, 1)) !== parca.spawnSerial) {
      return { deyisdi: false, success: false, message: 'Resurs artıq dəyişib və ya tapılmadı.' };
    }

    const remaining = menfiOlmayanTamEdedAl(node.remainingAmount, descriptor.fullAmount);
    const respawnAtMs = menfiOlmayanTamEdedAl(node.respawnAtMs);

    if (remaining <= 0 || respawnAtMs > 0) {
      return {
        deyisdi: false,
        success: false,
        message: 'Resurs artıq tükənib və yenilənir.',
      };
    }

    const goturulen = Math.min(remaining, azalma);
    node.remainingAmount = remaining - goturulen;

    if (node.remainingAmount <= 0) {
      node.remainingAmount = 0;
      node.respawnAtMs = indi + descriptor.respawnSeconds * 1000;
      node.occupiedByPlayerId = '';
      node.occupiedByConvoyId = '';
      node.occupiedUntilMs = 0;
    }

    return {
      deyisdi: true,
      success: true,
      targetId: hedefId,
      nodeId: descriptor.nodeId,
      goturulen,
      remainingAmount: node.remainingAmount,
      respawnAtMs: menfiOlmayanTamEdedAl(node.respawnAtMs),
    };
  });
}

module.exports = {
  HADISE_NOVU,
  RESURS_SAYI,
  LEGACY_RESURS_SAYI,
  DEFAULT_AKTIV_RESURS_SAYI,
  LIMITSIZ_ZONE_DOVRU,
  COL_SON_INDEX,
  ORTA_SON_INDEX,
  DAXILI_SON_INDEX,
  RESURS_NOVLERI,
  XERITE_MIN,
  XERITE_MAX,
  XERITE_MERKEZI,
  SERHED_PAYI,
  COL_ZONA_MAKSIMUM_MERKEZ_MESAFESI,
  BAZADAN_MIN_MESAFE,
  RESURSDAN_MIN_MESAFE,
  KOHNE_MOVQEDEN_MIN_MESAFE,
  PREZIDENT_MERKEZINDEN_MIN_MESAFE,
  worldV2ProvisionEdilmisResursSayiniAl,
  worldV2AktivResursSayiniAl,
  zonaTesviriAl,
  worldV2ResursDescriptoruAl,
  worldV2ResursMovqeyiSec,
  worldV2ResurslariniAl,
  worldV2ResursMiqdariniAzalt,
};
