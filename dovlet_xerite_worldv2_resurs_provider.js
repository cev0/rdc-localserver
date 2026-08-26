'use strict';

const {
  proqramHovuzunuAl,
} = require('./verilenler_bazasi');

const {
  resursLevelMelumatiniAl,
} = require('./xerite_resurs_qaydalari');

const HADISE_NOVU = 'dovlet_worldv2_resurs_runtime_v2';
const RESURS_SAYI = 600;
const COL_SON_INDEX = 300;
const ORTA_SON_INDEX = 490;
const DAXILI_SON_INDEX = 590;
const XERITE_MIN = 0;
const XERITE_MAX = 1200;
const XERITE_MERKEZI = 600;
const SERHED_PAYI = 24;
const BAZADAN_MIN_MESAFE = 18;
const RESURSDAN_MIN_MESAFE = 16;
const KOHNE_MOVQEDEN_MIN_MESAFE = 50;
const PREZIDENT_MERKEZINDEN_MIN_MESAFE = 35;
const MAKSIMUM_MOVQE_CEHDI = 900;
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

function kopyala(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function stateAcar(stateId) {
  return `__dovlet_worldv2_resurs_${sidAl(stateId)}__`;
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

function zonaTesviriAl(index) {
  const i = Math.max(1, Math.min(RESURS_SAYI, tamEdedAl(index, 1)));

  if (i <= COL_SON_INDEX) {
    return {
      zoneId: 'outer',
      minimumMerkezMesafesi: 445,
      maksimumMerkezMesafesi: 576,
      minimumLevel: 3,
      maksimumLevel: 6,
      presidentCenter: false,
    };
  }

  if (i <= ORTA_SON_INDEX) {
    return {
      zoneId: 'middle',
      minimumMerkezMesafesi: 270,
      maksimumMerkezMesafesi: 445,
      minimumLevel: 5,
      maksimumLevel: 8,
      presidentCenter: false,
    };
  }

  if (i <= DAXILI_SON_INDEX) {
    return {
      zoneId: 'inner_green',
      minimumMerkezMesafesi: 115,
      maksimumMerkezMesafesi: 270,
      minimumLevel: 8,
      maksimumLevel: 9,
      presidentCenter: false,
    };
  }

  return {
    zoneId: 'president_center',
    minimumMerkezMesafesi: PREZIDENT_MERKEZINDEN_MIN_MESAFE,
    maksimumMerkezMesafesi: 115,
    minimumLevel: 10,
    maksimumLevel: 10,
    presidentCenter: true,
  };
}

function worldV2ResursDescriptoruAl(stateId, index) {
  const sid = sidAl(stateId);
  const i = Math.max(1, Math.min(RESURS_SAYI, tamEdedAl(index, 1)));
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

function movqeTehlukesizdir({
  x,
  y,
  zona,
  bazaMovqeleri,
  digerMovqeler,
  kohneMovqe,
}) {
  if (!koordinatZonayaUyğundur(x, y, zona)) return false;

  const bazaMinKv = BAZADAN_MIN_MESAFE * BAZADAN_MIN_MESAFE;
  for (const baza of bazaMovqeleri || []) {
    if (mesafeKvadrati(x, y, baza.x, baza.y) < bazaMinKv) return false;
  }

  const resursMinKv = RESURSDAN_MIN_MESAFE * RESURSDAN_MIN_MESAFE;
  for (const movqe of digerMovqeler || []) {
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
  digerMovqeler = [],
  kohneMovqe = null,
}) {
  const sid = sidAl(stateId);
  const i = Math.max(1, Math.min(RESURS_SAYI, tamEdedAl(index, 1)));
  const serial = Math.max(1, tamEdedAl(spawnSerial, 1));
  const zona = zonaTesviriAl(i);
  const bazaMovqeleri = bazaMovqeleriniHazirla(bases);
  const rng = seededRng(
    sid * 1000003 +
    i * 9176 +
    serial * 65537,
  );

  for (let cehd = 0; cehd < MAKSIMUM_MOVQE_CEHDI; cehd++) {
    const x = Math.round(SERHED_PAYI + rng() * (XERITE_MAX - SERHED_PAYI * 2));
    const y = Math.round(SERHED_PAYI + rng() * (XERITE_MAX - SERHED_PAYI * 2));

    if (movqeTehlukesizdir({
      x,
      y,
      zona,
      bazaMovqeleri,
      digerMovqeler,
      kohneMovqe,
    })) {
      return { x, y };
    }
  }

  const baslangic = SERHED_PAYI + ((sid * 31 + i * 17 + serial * 13) % 19);
  for (let y = baslangic; y <= XERITE_MAX - SERHED_PAYI; y += 7) {
    for (let x = baslangic; x <= XERITE_MAX - SERHED_PAYI; x += 7) {
      if (movqeTehlukesizdir({
        x,
        y,
        zona,
        bazaMovqeleri,
        digerMovqeler,
        kohneMovqe,
      })) {
        return { x, y };
      }
    }
  }

  throw new Error(`Dövlət #${sid} üçün WorldV2 resurs mövqeyi tapılmadı.`);
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
      }
      throw xeta;
    }
    finally {
      client.release();
    }
  });
}

function nodePayloadHazirla(node, descriptor) {
  const remainingAmount = menfiOlmayanTamEdedAl(node.remainingAmount, descriptor.fullAmount);
  const spawnSerial = Math.max(1, tamEdedAl(node.spawnSerial, 1));

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
    available: remainingAmount > 0 && menfiOlmayanTamEdedAl(node.respawnAtMs) === 0,
    occupiedByPlayerId: typeof node.occupiedByPlayerId === 'string' ? node.occupiedByPlayerId : '',
    occupiedByConvoyId: typeof node.occupiedByConvoyId === 'string' ? node.occupiedByConvoyId : '',
    occupiedUntilMs: menfiOlmayanTamEdedAl(node.occupiedUntilMs),
    respawnAtMs: menfiOlmayanTamEdedAl(node.respawnAtMs),
    presidentCenter: descriptor.presidentCenter === true,
    spawnSerial,
  };
}

function yeniSpawnQur(runtime, descriptor, bases, nowMs, kohneNode = null) {
  const movqeler = Object.values(runtime.nodes || {})
    .filter(node => node && node !== kohneNode && Number.isFinite(Number(node.x)) && Number.isFinite(Number(node.y)))
    .map(node => ({ x: Number(node.x), y: Number(node.y) }));

  const spawnSerial = Math.max(1, menfiOlmayanTamEdedAl(kohneNode && kohneNode.spawnSerial) + 1);
  const movqe = worldV2ResursMovqeyiSec({
    stateId: descriptor.stateId,
    index: descriptor.index,
    spawnSerial,
    bases,
    digerMovqeler: movqeler,
    kohneMovqe: kohneNode && Number.isFinite(Number(kohneNode.x)) && Number.isFinite(Number(kohneNode.y))
      ? { x: Number(kohneNode.x), y: Number(kohneNode.y) }
      : null,
  });

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

async function worldV2ResurslariniAl(stateId, bases = [], nowMs = Date.now()) {
  const sid = sidAl(stateId);
  const indi = menfiOlmayanTamEdedAl(nowMs, Date.now());

  const netice = await runtimeEmeliyyati(sid, async runtime => {
    let deyisdi = false;

    for (let i = 1; i <= RESURS_SAYI; i++) {
      const descriptor = worldV2ResursDescriptoruAl(sid, i);
      const zona = zonaTesviriAl(i);
      let node = runtime.nodes[descriptor.nodeId];

      if (!node || typeof node !== 'object' || Array.isArray(node)) {
        node = yeniSpawnQur(runtime, descriptor, bases, indi, null);
        runtime.nodes[descriptor.nodeId] = node;
        deyisdi = true;
        continue;
      }

      // Əvvəlki test saylarından qalan node yeni 600-lük zona bölgüsünə
      // uyğun deyilsə authoritative yeni koordinata köçürülür.
      if (!koordinatZonayaUyğundur(node.x, node.y, zona)) {
        runtime.nodes[descriptor.nodeId] = yeniSpawnQur(
          runtime,
          descriptor,
          bases,
          indi,
          node,
        );
        deyisdi = true;
        continue;
      }

      const remainingAmount = menfiOlmayanTamEdedAl(node.remainingAmount, descriptor.fullAmount);
      node.remainingAmount = Math.min(remainingAmount, descriptor.fullAmount);

      if (node.remainingAmount > 0) continue;

      const respawnAtMs = menfiOlmayanTamEdedAl(node.respawnAtMs);
      if (respawnAtMs <= 0) {
        node.respawnAtMs = indi + descriptor.respawnSeconds * 1000;
        node.occupiedByPlayerId = '';
        node.occupiedByConvoyId = '';
        node.occupiedUntilMs = 0;
        deyisdi = true;
        continue;
      }

      if (indi >= respawnAtMs) {
        runtime.nodes[descriptor.nodeId] = yeniSpawnQur(
          runtime,
          descriptor,
          bases,
          indi,
          node,
        );
        deyisdi = true;
      }
    }

    const resources = [];
    for (let i = 1; i <= RESURS_SAYI; i++) {
      const descriptor = worldV2ResursDescriptoruAl(sid, i);
      const node = runtime.nodes[descriptor.nodeId];
      if (!node) continue;

      const payload = nodePayloadHazirla(node, descriptor);
      if (payload.remainingAmount <= 0 || payload.respawnAtMs > 0) continue;
      resources.push(payload);
    }

    return {
      deyisdi,
      success: true,
      stateId: sid,
      resources,
    };
  });

  return netice && Array.isArray(netice.resources)
    ? { stateId: sid, resources: netice.resources }
    : { stateId: sid, resources: [] };
}

async function worldV2ResursMiqdariniAzalt({
  stateId,
  targetId,
  miqdar,
  nowMs = Date.now(),
}) {
  const sid = sidAl(stateId);
  const hedefId = typeof targetId === 'string' ? targetId.trim() : '';
  const azalma = Math.max(0, tamEdedAl(miqdar));
  const indi = menfiOlmayanTamEdedAl(nowMs, Date.now());

  if (!hedefId || azalma <= 0) {
    return { success: false, message: 'Resurs targetId və miqdar tələb olunur.' };
  }

  return runtimeEmeliyyati(sid, async runtime => {
    for (let i = 1; i <= RESURS_SAYI; i++) {
      const descriptor = worldV2ResursDescriptoruAl(sid, i);
      const node = runtime.nodes[descriptor.nodeId];
      if (!node) continue;

      const cariTargetId = `${descriptor.nodeId}_spawn_${Math.max(1, tamEdedAl(node.spawnSerial, 1))}`;
      if (cariTargetId !== hedefId) continue;

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
    }

    return {
      deyisdi: false,
      success: false,
      message: 'Resurs artıq dəyişib və ya tapılmadı.',
    };
  });
}

module.exports = {
  HADISE_NOVU,
  RESURS_SAYI,
  COL_SON_INDEX,
  ORTA_SON_INDEX,
  DAXILI_SON_INDEX,
  RESURS_NOVLERI,
  XERITE_MIN,
  XERITE_MAX,
  XERITE_MERKEZI,
  SERHED_PAYI,
  BAZADAN_MIN_MESAFE,
  RESURSDAN_MIN_MESAFE,
  KOHNE_MOVQEDEN_MIN_MESAFE,
  PREZIDENT_MERKEZINDEN_MIN_MESAFE,
  zonaTesviriAl,
  worldV2ResursDescriptoruAl,
  worldV2ResursMovqeyiSec,
  worldV2ResurslariniAl,
  worldV2ResursMiqdariniAzalt,
};
