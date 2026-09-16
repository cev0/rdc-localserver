'use strict';

// V7: SQL viewport aktivdirsə və row-runtime legacy audit revision-la tam freshdirsə
// kamera yalnız görünən sahəni SQL-dən oxuyur. SQL-authoritative rejimdə viewport
// oxusundan əvvəl throttled row-level respawn lifecycle işləyir.
const { proqramHovuzunuAl } = require('./verilenler_bazasi');
const {
  HADISE_NOVU,
  worldV2ResurslariniAl,
  worldV2ResursDescriptoruAl,
} = require('./dovlet_xerite_worldv2_resurs_provider');
const {
  worldV2ResursSahesiniSqlDenAlClient,
} = require('./dovlet_xerite_worldv2_resurs_runtime_postgres');
const {
  worldV2SqlRespawnlariYenile,
} = require('./dovlet_xerite_worldv2_resurs_sql_native');

const DEFAULT_SIX_RESURS_SAYI = 80000;
const MAKSIMUM_SAHE_ENI = 128;
const MAKSIMUM_SAHE_SAYI = 4096;
const SAHE_XANASI = 16;
const MAKSIMUM_KESHLENEN_DOVLET = 4;
const YAVAS_KESH_XEBERDARLIQ_MS = 250;
const SQL_XETA_SAKITLIK_MS = 30000;

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

function sqlViewportAktivdir() {
  const deyer = String(process.env.WORLDV2_RESOURCE_SQL_VIEWPORT || '').trim().toLowerCase();
  return deyer === '1' || deyer === 'true' || deyer === 'on' || deyer === 'yes';
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

  let secilen = entries;
  if (entries.length > MAKSIMUM_SAHE_SAYI) {
    const cx = (sahe.minX + sahe.maxX) * 0.5;
    const cy = (sahe.minY + sahe.maxY) * 0.5;
    entries.sort((a, b) => ((a[3]-cx)**2 + (a[4]-cy)**2) - ((b[3]-cx)**2 + (b[4]-cy)**2) || a[0]-b[0]);
    secilen = entries.slice(0, MAKSIMUM_SAHE_SAYI);
  }

  for (const r of secilen) {
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

async function sqlFreshnessMetaAl(stateId, teleb) {
  const sid = Math.max(1, Math.trunc(Number(stateId) || 1));
  const result = await proqramHovuzunuAl().query(
    `SELECT s.provisioned_count, s.physical_capacity_reached, s.revision,
            s.legacy_audit_id,
            (
              SELECT id::text
                FROM hesab_audit_jurnali
               WHERE oyuncu_id = $2 AND hadise_novu = $3
               ORDER BY id DESC LIMIT 1
            ) AS current_audit_id
       FROM dovlet_worldv2_resurs_state s
      WHERE s.state_id = $1`,
    [sid, `__dovlet_worldv2_resurs_${sid}__`, HADISE_NOVU],
  );
  const row = result.rows && result.rows[0];
  if (!row) return null;
  const provisionedCount = Math.max(0, Math.trunc(Number(row.provisioned_count) || 0));
  const legacyAuditId = row.legacy_audit_id == null ? '' : String(row.legacy_audit_id);
  const currentAuditId = row.current_audit_id == null ? '' : String(row.current_audit_id);
  const physicalCapacityReached = row.physical_capacity_reached === true;
  return {
    stateId: sid,
    revision: String(row.revision == null ? '0' : row.revision),
    provisionedCount,
    physicalCapacityReached,
    legacyAuditId,
    currentAuditId,
    fresh: !!legacyAuditId && legacyAuditId === currentAuditId,
    coverageOk: provisionedCount >= teleb || physicalCapacityReached,
  };
}

async function sqlSaheAl(stateId, sahe, nowMs = Date.now()) {
  await worldV2SqlRespawnlariYenile(stateId, nowMs);
  return worldV2ResursSahesiniSqlDenAlClient(
    proqramHovuzunuAl(), stateId, sahe, MAKSIMUM_SAHE_SAYI,
  );
}

function sqlNeticesiniHazirla(sqlNetice, meta, teleb, sahe, descriptorAl = worldV2ResursDescriptoruAl) {
  const v = { say: 0, i: [], r: [], l: [], x: [], y: [], s: [] };
  for (const node of (sqlNetice && sqlNetice.nodes) || []) {
    if (!node || !Number.isInteger(Number(node.index))) continue;
    const descriptor = descriptorAl(meta.stateId, Number(node.index));
    if (!descriptor) continue;
    const code = ['food', 'water', 'wood', 'iron', 'fuel'].indexOf(descriptor.resourceId);
    if (code < 0) continue;
    v.i.push(Number(node.index));
    v.r.push(code);
    v.l.push(Number(descriptor.level));
    v.x.push(Number(node.x));
    v.y.push(Number(node.y));
    v.s.push(Math.max(1, Math.trunc(Number(node.spawnSerial) || 1)));
  }
  v.say = v.i.length;
  return {
    resources: [],
    vizual: v,
    activeResourceCount: meta.provisionedCount,
    provisionedResourceCount: teleb,
    physicalCapacityReached: meta.physicalCapacityReached === true,
    resourceViewTruncated: sqlNetice && sqlNetice.truncated === true,
    resourceViewMinX: sahe.minX, resourceViewMinY: sahe.minY,
    resourceViewMaxX: sahe.maxX, resourceViewMaxY: sahe.maxY,
  };
}

function resursSaheXidmetiYarat({
  provider = worldV2ResurslariniAl,
  revisionAl = auditRevisionAl,
  sqlAktivdir = sqlViewportAktivdir,
  sqlMetaAl = sqlFreshnessMetaAl,
  sqlViewAl = sqlSaheAl,
  descriptorAl = worldV2ResursDescriptoruAl,
} = {}) {
  const keshlər = new Map();
  const davamEdenler = new Map();
  const revisionDavamEdenler = new Map();
  const sqlMetaDavamEdenler = new Map();
  let sqlSakitlikBitirMs = 0;
  let sqlSonXetaLogMs = 0;

  async function ortaqRevisionAl(stateId) {
    let promise = revisionDavamEdenler.get(stateId);
    if (!promise) {
      promise = Promise.resolve().then(() => revisionAl(stateId));
      revisionDavamEdenler.set(stateId, promise);
    }
    try { return await promise; }
    finally { if (revisionDavamEdenler.get(stateId) === promise) revisionDavamEdenler.delete(stateId); }
  }

  async function ortaqSqlMetaAl(stateId, teleb) {
    const acar = `${stateId}:${teleb}`;
    let promise = sqlMetaDavamEdenler.get(acar);
    if (!promise) {
      promise = Promise.resolve().then(() => sqlMetaAl(stateId, teleb));
      sqlMetaDavamEdenler.set(acar, promise);
    }
    try { return await promise; }
    finally { if (sqlMetaDavamEdenler.get(acar) === promise) sqlMetaDavamEdenler.delete(acar); }
  }

  return async function saheAl(stateId, bases, nowMs, sahe) {
    const teleb = sixResursSayiniAl();

    if (sqlAktivdir() && Date.now() >= sqlSakitlikBitirMs) {
      try {
        const meta = await ortaqSqlMetaAl(stateId, teleb);
        if (meta && meta.fresh === true && meta.coverageOk === true) {
          const sqlNetice = await sqlViewAl(stateId, sahe, nowMs);
          return sqlNeticesiniHazirla(sqlNetice, meta, teleb, sahe, descriptorAl);
        }
      } catch (xeta) {
        sqlSakitlikBitirMs = Date.now() + SQL_XETA_SAKITLIK_MS;
        if (Date.now() - sqlSonXetaLogMs >= SQL_XETA_SAKITLIK_MS) {
          sqlSonXetaLogMs = Date.now();
          console.warn('[WORLDV2 SQL VIEWPORT] SQL fast-path söndürüldü, legacy fallback işləyir:',
            xeta && xeta.message ? String(xeta.message).slice(0, 220) : 'naməlum xəta');
        }
      }
    }

    let kesh = keshlər.get(stateId);
    const telebDeyisib = !!kesh && kesh.teleb !== teleb;
    const respawnVaxtidir = !!kesh && kesh.nextRespawnAtMs > 0 && nowMs >= kesh.nextRespawnAtMs;
    let revision = '';
    let revisionDeyisib = false;
    if (kesh && !telebDeyisib && !respawnVaxtidir) {
      revision = await ortaqRevisionAl(stateId);
      revisionDeyisib = !revision || kesh.revision !== revision;
    }

    if (!kesh || telebDeyisib || respawnVaxtidir || revisionDeyisib) {
      let promise = davamEdenler.get(stateId);
      if (!promise) {
        promise = (async () => {
          const baslangic = Date.now();
          const netice = await provider(stateId, bases, nowMs, teleb, { butunMovcudlar: true });
          const yeni = kompaktKeshYarat(netice, teleb);
          keshlər.delete(stateId);
          keshlər.set(stateId, yeni);
          while (keshlər.size > MAKSIMUM_KESHLENEN_DOVLET) keshlər.delete(keshlər.keys().next().value);

          const muddet = Date.now() - baslangic;
          if (muddet >= YAVAS_KESH_XEBERDARLIQ_MS) {
            console.warn('[WORLDV2 SAHE PERF] Kataloq keshinin qurulması yavaşdır:',
              `state=${stateId}`, `ms=${muddet}`, `active=${yeni.say}`, `target=${teleb}`);
          }
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
module.exports = {
  DEFAULT_SIX_RESURS_SAYI,
  MAKSIMUM_SAHE_ENI,
  MAKSIMUM_SAHE_SAYI,
  saheSorqusunuOxu,
  sixResursSayiniAl,
  sqlViewportAktivdir,
  kompaktKeshYarat,
  keshiSaheyeKes,
  sqlFreshnessMetaAl,
  sqlNeticesiniHazirla,
  resursSaheXidmetiYarat,
  worldV2ResursSahesiniAl,
};
