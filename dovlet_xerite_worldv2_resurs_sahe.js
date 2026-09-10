'use strict';

// V5: koordinatlar yalnız serverdən gəlir. Kamera sorğusu yeni yerləşmə yaratmır;
// yalnız Dövlət üzrə sabit kataloqun məhdud düzbucaqlısını qaytarır.
const { proqramHovuzunuAl } = require('./verilenler_bazasi');
const { HADISE_NOVU, worldV2ResurslariniAl } = require('./dovlet_xerite_worldv2_resurs_provider');

const DEFAULT_SIX_RESURS_SAYI = 80000;
const MAKSIMUM_SAHE_ENI = 128;
const MAKSIMUM_SAHE_SAYI = 4096;
const SAHE_XANASI = 16;
const MAKSIMUM_KESHLENEN_DOVLET = 4;

function saheSorqusunuOxu(msg) {
  if (!msg || msg.resourceView !== true) return null;
  if (msg.resourceVisualOnly !== true) throw new Error('resourceView vizual sorğu olmalıdır.');
  const adlar = ['resourceViewMinX', 'resourceViewMinY', 'resourceViewMaxX', 'resourceViewMaxY'];
  const a = adlar.map(ad => msg[ad]);
  if (!a.every(n => Number.isInteger(n) && n >= 0 && n <= 1200) ||
      a[2] < a[0] || a[3] < a[1] || a[2] - a[0] > MAKSIMUM_SAHE_ENI ||
      a[3] - a[1] > MAKSIMUM_SAHE_ENI ||
      !Number.isInteger(msg.resourceViewRequestId) || msg.resourceViewRequestId <= 0) {
    throw new Error('WorldV2 görünən sahə 0..1200 daxilində, ən çox 128×128 olmalıdır.');
  }
  return { minX: a[0], minY: a[1], maxX: a[2], maxY: a[3], requestId: msg.resourceViewRequestId };
}

function sixResursSayiniAl() {
  const n = Number(process.env.WORLDV2_RESOURCE_DENSE_COUNT);
  return Number.isInteger(n) && n >= 600 && n <= 100000 ? n : DEFAULT_SIX_RESURS_SAYI;
}

function kompaktKeshYarat(netice, teleb) {
  const cells = new Map();
  let say = 0;
  for (const r of netice.resources || []) {
    if (!r || r.remainingAmount <= 0 || r.respawnAtMs > 0) continue;
    const code = ['food', 'water', 'wood', 'iron', 'fuel'].indexOf(r.resourceId);
    if (code < 0) continue;
    const key = Math.floor(r.x / SAHE_XANASI) * 128 + Math.floor(r.y / SAHE_XANASI);
    if (!cells.has(key)) cells.set(key, []);
    // Full gameplay obyektləri və uzun ID sətirləri cache-də saxlanılmır.
    cells.get(key).push([r.index, code, r.level, r.x, r.y, r.spawnSerial]);
    say++;
  }
  return {
    cells, say, teleb, revision: String(netice.runtimeRevision || ''),
    nextRespawnAtMs: Number(netice.nextRespawnAtMs) || 0,
    physicalCapacityReached: netice.physicalCapacityReached === true,
  };
}

function keshiSaheyeKes(kesh, sahe) {
  const v = { say: 0, i: [], r: [], l: [], x: [], y: [], s: [] };
  const entries = [];
  for (let cx = Math.floor(sahe.minX / SAHE_XANASI); cx <= Math.floor(sahe.maxX / SAHE_XANASI); cx++) {
    for (let cy = Math.floor(sahe.minY / SAHE_XANASI); cy <= Math.floor(sahe.maxY / SAHE_XANASI); cy++) {
      for (const r of kesh.cells.get(cx * 128 + cy) || []) {
        if (r[3] >= sahe.minX && r[3] <= sahe.maxX && r[4] >= sahe.minY && r[4] <= sahe.maxY) entries.push(r);
      }
    }
  }
  // Normal 2 koordinat aralığında 128×128 sahə bu limiti keçmir.
  // Korlanmış / köhnə sıx kataloq olsa da cavab ölçüsü məhduddur.
  const cx = (sahe.minX + sahe.maxX) * 0.5;
  const cy = (sahe.minY + sahe.maxY) * 0.5;
  entries.sort((a, b) => ((a[3]-cx)**2 + (a[4]-cy)**2) - ((b[3]-cx)**2 + (b[4]-cy)**2) || a[0]-b[0]);
  for (const r of entries.slice(0, MAKSIMUM_SAHE_SAYI)) {
    v.i.push(r[0]); v.r.push(r[1]); v.l.push(r[2]); v.x.push(r[3]); v.y.push(r[4]); v.s.push(r[5]);
  }
  v.say = v.i.length;
  return {
    resources: [], vizual: v,
    activeResourceCount: kesh.say,
    provisionedResourceCount: kesh.teleb,
    physicalCapacityReached: kesh.physicalCapacityReached,
    resourceViewTruncated: entries.length > MAKSIMUM_SAHE_SAYI,
    resourceViewMinX: sahe.minX, resourceViewMinY: sahe.minY,
    resourceViewMaxX: sahe.maxX, resourceViewMaxY: sahe.maxY,
  };
}

async function auditRevisionAl(stateId) {
  const result = await proqramHovuzunuAl().query(
    `SELECT id FROM hesab_audit_jurnali
      WHERE oyuncu_id = $1 AND hadise_novu = $2 ORDER BY id DESC LIMIT 1`,
    [`__dovlet_worldv2_resurs_${stateId}__`, HADISE_NOVU]);
  return String(result.rows && result.rows[0] && result.rows[0].id || '');
}

function resursSaheXidmetiYarat({ provider = worldV2ResurslariniAl, revisionAl = auditRevisionAl } = {}) {
  const keshlər = new Map();
  const davamEdenler = new Map();
  return async function saheAl(stateId, bases, nowMs, sahe) {
    const teleb = sixResursSayiniAl();
    let kesh = keshlər.get(stateId);
    const revision = await revisionAl(stateId);
    if (!kesh || !revision || kesh.revision !== revision || kesh.teleb !== teleb ||
        (kesh.nextRespawnAtMs > 0 && nowMs >= kesh.nextRespawnAtMs)) {
      let promise = davamEdenler.get(stateId);
      if (!promise) {
        promise = (async () => {
          const netice = await provider(stateId, bases, nowMs, teleb, { butunMovcudlar: true });
          const yeni = kompaktKeshYarat(netice, teleb);
          keshlər.delete(stateId);
          keshlər.set(stateId, yeni);
          while (keshlər.size > MAKSIMUM_KESHLENEN_DOVLET) keshlər.delete(keshlər.keys().next().value);
          return yeni;
        })();
        davamEdenler.set(stateId, promise);
      }
      try { kesh = await promise; }
      finally { if (davamEdenler.get(stateId) === promise) davamEdenler.delete(stateId); }
    } else {
      keshlər.delete(stateId);
      keshlər.set(stateId, kesh);
    }
    return keshiSaheyeKes(kesh, sahe);
  };
}

const worldV2ResursSahesiniAl = resursSaheXidmetiYarat();
module.exports = { DEFAULT_SIX_RESURS_SAYI, MAKSIMUM_SAHE_ENI, saheSorqusunuOxu,
  sixResursSayiniAl, kompaktKeshYarat, keshiSaheyeKes, resursSaheXidmetiYarat, worldV2ResursSahesiniAl };
