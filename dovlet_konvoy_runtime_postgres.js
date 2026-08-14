"use strict";

const { sorguEt } = require("./verilenler_bazasi");

const HADISE_NOVU = "dovlet_konvoy_runtime_v1";
const yaddaKilidi = new Map();

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function metnAl(v, max = 220) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function reqemAl(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function stateAcar(stateId) {
  const id = Math.max(1, tamEded(stateId) || 1);
  return `__dovlet_konvoy_${id}__`;
}

function bosRuntime(stateId) {
  return {
    version: 1,
    stateId: Math.max(1, tamEded(stateId) || 1),
    items: {}
  };
}

async function runtimeOxu(stateId) {
  const sid = Math.max(1, tamEded(stateId) || 1);
  const netice = await sorguEt(
    `SELECT detallar
       FROM hesab_audit_jurnali
      WHERE oyuncu_id = $1 AND hadise_novu = $2
      ORDER BY id DESC
      LIMIT 1`,
    [stateAcar(sid), HADISE_NOVU]
  );

  const detallar = netice.rows && netice.rows[0] && netice.rows[0].detallar;
  const runtime = detallar && typeof detallar === "object" && detallar.runtime
    ? kopyala(detallar.runtime)
    : bosRuntime(sid);

  if (!runtime.items || typeof runtime.items !== "object" || Array.isArray(runtime.items)) {
    runtime.items = {};
  }
  runtime.version = 1;
  runtime.stateId = sid;
  return runtime;
}

async function runtimeYazDaxili(stateId, runtime) {
  const acar = stateAcar(stateId);
  await sorguEt(
    `INSERT INTO hesab_audit_jurnali (hesab_id, oyuncu_id, hadise_novu, detallar)
     VALUES (NULL, $1, $2, $3::jsonb)`,
    [acar, HADISE_NOVU, JSON.stringify({ version: 1, runtime: kopyala(runtime) })]
  );

  await sorguEt(
    `DELETE FROM hesab_audit_jurnali
      WHERE id IN (
        SELECT id FROM hesab_audit_jurnali
         WHERE oyuncu_id = $1 AND hadise_novu = $2
         ORDER BY id DESC OFFSET 3
      )`,
    [acar, HADISE_NOVU]
  );
}

async function runtimeEmeliyyati(stateId, emeliyyat) {
  const sid = Math.max(1, tamEded(stateId) || 1);
  const acar = stateAcar(sid);
  const onceki = yaddaKilidi.get(acar) || Promise.resolve();
  let cavab;

  const yeni = onceki.then(async () => {
    const runtime = await runtimeOxu(sid);
    cavab = await emeliyyat(runtime);
    if (cavab && cavab.deyisdi === true) {
      await runtimeYazDaxili(sid, runtime);
    }
  });

  yaddaKilidi.set(acar, yeni.catch(() => {}));
  await yeni;
  return cavab;
}

function publicAcar(playerId, convoyId) {
  return `${metnAl(playerId, 128)}:${metnAl(convoyId, 64)}`;
}

function publicSnapshotHazirla(stateId, playerId, operation, nowMs = Date.now()) {
  const op = operation && typeof operation === "object" ? operation : {};
  const sid = Math.max(1, tamEded(stateId) || tamEded(op.stateId) || 1);
  const pid = metnAl(playerId || op.playerId, 128);
  const convoyId = metnAl(op.convoyId, 64);
  if (!pid || !convoyId) return null;

  return {
    publicId: publicAcar(pid, convoyId),
    playerId: pid,
    convoyId,
    stateId: sid,
    targetType: metnAl(op.targetType, 32),
    targetId: metnAl(op.targetId, 128),
    targetLevel: tamEded(op.targetLevel),
    zoneId: metnAl(op.zoneId, 64),
    fromX: reqemAl(op.fromX),
    fromZ: reqemAl(op.fromZ),
    targetX: reqemAl(op.targetX),
    targetZ: reqemAl(op.targetZ),
    startedAtMs: tamEded(op.startedAtMs),
    arrivalAtMs: tamEded(op.arrivalAtMs),
    actionEndsAtMs: tamEded(op.actionEndsAtMs),
    returnStartedAtMs: tamEded(op.returnStartedAtMs),
    returnEndsAtMs: tamEded(op.returnEndsAtMs),
    plannedActionEndsAtMs: tamEded(op.plannedActionEndsAtMs),
    plannedReturnEndsAtMs: tamEded(op.plannedReturnEndsAtMs),
    travelDurationMs: tamEded(op.travelDurationMs),
    status: metnAl(op.status, 32) || "marching",
    reportId: metnAl(op.reportId, 220),
    updatedAtMs: tamEded(nowMs) || Date.now()
  };
}

function muqayiseUcunJson(v) {
  const clone = kopyala(v) || {};
  for (const item of Object.values(clone)) {
    if (item && typeof item === "object") delete item.updatedAtMs;
  }
  return JSON.stringify(clone);
}

async function oyuncuKonvoylariniSinxronEt(stateId, playerId, activeOperations, nowMs = Date.now()) {
  const sid = Math.max(1, tamEded(stateId) || 1);
  const pid = metnAl(playerId, 128);
  if (!pid) return { success: false, message: "Shared convoy runtime üçün playerId yoxdur." };

  const snapshots = Object.values(activeOperations && typeof activeOperations === "object" ? activeOperations : {})
    .map(op => publicSnapshotHazirla(sid, pid, op, nowMs))
    .filter(Boolean);

  return runtimeEmeliyyati(sid, async runtime => {
    const evvelki = {};
    for (const [key, item] of Object.entries(runtime.items || {})) {
      if (item && metnAl(item.playerId, 128) === pid) evvelki[key] = item;
    }

    const yeni = {};
    for (const item of snapshots) yeni[item.publicId] = item;

    if (muqayiseUcunJson(evvelki) === muqayiseUcunJson(yeni)) {
      return { deyisdi: false, success: true, count: snapshots.length };
    }

    for (const [key, item] of Object.entries(runtime.items || {})) {
      if (item && metnAl(item.playerId, 128) === pid) delete runtime.items[key];
    }
    for (const item of snapshots) runtime.items[item.publicId] = item;

    return { deyisdi: true, success: true, count: snapshots.length };
  });
}

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

function lerp(a, b, t) {
  return Number(a || 0) + ((Number(b || 0) - Number(a || 0)) * clamp01(t));
}

function publicVeziyyetiHesabla(raw, nowMs = Date.now()) {
  const item = raw && typeof raw === "object" ? raw : {};
  const now = tamEded(nowMs) || Date.now();
  const start = tamEded(item.startedAtMs);
  const arrival = tamEded(item.arrivalAtMs);
  const plannedActionEnd = tamEded(item.plannedActionEndsAtMs) || tamEded(item.actionEndsAtMs);
  const actualReturnStart = tamEded(item.returnStartedAtMs);
  const actualReturnEnd = tamEded(item.returnEndsAtMs);
  const plannedReturnEnd = tamEded(item.plannedReturnEndsAtMs);
  const returnStart = actualReturnStart || plannedActionEnd;
  const returnEnd = actualReturnEnd || plannedReturnEnd;

  let status = metnAl(item.status, 32) || "marching";
  if (returnEnd > 0 && now >= returnEnd) status = "idle";
  else if (arrival > 0 && now < arrival) status = "marching";
  else if (plannedActionEnd > 0 && now < plannedActionEnd) {
    status = metnAl(item.targetType, 32) === "resource" ? "gathering" : "battle";
  }
  else if (returnEnd > 0 && now < returnEnd) status = "returning";

  let x = reqemAl(item.fromX);
  let z = reqemAl(item.fromZ);
  let progress01 = 0;

  if (status === "marching") {
    const muddet = Math.max(1, arrival - start);
    progress01 = clamp01((now - start) / muddet);
    x = lerp(item.fromX, item.targetX, progress01);
    z = lerp(item.fromZ, item.targetZ, progress01);
  }
  else if (status === "gathering" || status === "battle") {
    x = reqemAl(item.targetX);
    z = reqemAl(item.targetZ);
    const muddet = Math.max(1, plannedActionEnd - arrival);
    progress01 = clamp01((now - arrival) / muddet);
  }
  else if (status === "returning") {
    const baslama = returnStart || now;
    const muddet = Math.max(1, returnEnd - baslama);
    progress01 = clamp01((now - baslama) / muddet);
    x = lerp(item.targetX, item.fromX, progress01);
    z = lerp(item.targetZ, item.fromZ, progress01);
  }

  return {
    ...kopyala(item),
    status,
    x,
    z,
    progress01,
    remainingMs: status === "marching"
      ? Math.max(0, arrival - now)
      : (status === "gathering" || status === "battle")
        ? Math.max(0, plannedActionEnd - now)
        : status === "returning"
          ? Math.max(0, returnEnd - now)
          : 0
  };
}

async function dovletAktivKonvoylariniAl(stateId, nowMs = Date.now()) {
  const sid = Math.max(1, tamEded(stateId) || 1);
  let items = [];

  await runtimeEmeliyyati(sid, async runtime => {
    let deyisdi = false;
    const netice = [];

    for (const [key, raw] of Object.entries(runtime.items || {})) {
      if (!raw || tamEded(raw.stateId) !== sid) {
        delete runtime.items[key];
        deyisdi = true;
        continue;
      }

      const publicItem = publicVeziyyetiHesabla(raw, nowMs);
      if (publicItem.status === "idle") {
        delete runtime.items[key];
        deyisdi = true;
        continue;
      }
      netice.push(publicItem);
    }

    items = netice;
    return { deyisdi, success: true };
  });

  return {
    version: 1,
    stateId: sid,
    items
  };
}

module.exports = {
  runtimeOxu,
  runtimeEmeliyyati,
  publicSnapshotHazirla,
  publicVeziyyetiHesabla,
  oyuncuKonvoylariniSinxronEt,
  dovletAktivKonvoylariniAl
};
