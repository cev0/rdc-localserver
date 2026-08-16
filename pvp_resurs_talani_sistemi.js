"use strict";

const { konvoyTutumHesabiniAl } = require("./konvoy_tutum_formulu");

const DEFAULT_LOOTABLE_RESOURCE_IDS = Object.freeze([
  "food",
  "water",
  "wood",
  "iron",
  "fuel",
  "electricity"
]);

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function konvoyuTap(state, convoyId) {
  const id = metnAl(convoyId, 64);
  const items = state && state.konvoylar && Array.isArray(state.konvoylar.items)
    ? state.konvoylar.items
    : [];
  return items.find(x => x && metnAl(x.konvoyId, 64) === id) || null;
}

function sagQalanQosunSayiniAl(konvoy) {
  const siralar = konvoy && konvoy.formasiya && Array.isArray(konvoy.formasiya.siralar)
    ? konvoy.formasiya.siralar
    : [];
  return siralar.reduce((cem, row) => cem + tamEded(row && row.count), 0);
}

function envQorumaCedveliniAl() {
  const raw = String(process.env.PVP_RESOURCE_PROTECTION_JSON || "").trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out = {};
    for (const [key, value] of Object.entries(parsed)) {
      const id = metnAl(key, 64);
      if (id) out[id] = tamEded(value);
    }
    return out;
  }
  catch (_) {
    return {};
  }
}

function stateQorumaCedveliniAl(state) {
  const namizedler = [
    state && state.pvpResourceProtection && state.pvpResourceProtection.byResource,
    state && state.resourceProtection && state.resourceProtection.byResource
  ];
  for (const raw of namizedler) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const out = {};
    for (const [key, value] of Object.entries(raw)) {
      const id = metnAl(key, 64);
      if (id) out[id] = tamEded(value);
    }
    return out;
  }
  return {};
}

function qorumaCedveliniAl(state) {
  const env = envQorumaCedveliniAl();
  const local = stateQorumaCedveliniAl(state);
  return {
    configured: Object.keys(local).length > 0 || Object.keys(env).length > 0,
    byResource: { ...env, ...local }
  };
}

function lootableResourceIds() {
  const env = String(process.env.PVP_PLUNDER_RESOURCE_IDS || "")
    .split(",")
    .map(x => metnAl(x, 64))
    .filter(Boolean);
  return env.length > 0 ? Array.from(new Set(env)) : [...DEFAULT_LOOTABLE_RESOURCE_IDS];
}

function tutumaGoreResursBol(availableByResource, capacity, resourceIds) {
  const cap = tamEded(capacity);
  const ids = Array.isArray(resourceIds) ? resourceIds : [];
  const available = ids.map(id => tamEded(availableByResource && availableByResource[id]));
  const totalAvailable = available.reduce((a, b) => a + b, 0);
  const target = Math.min(cap, totalAvailable);
  const result = Object.fromEntries(ids.map(id => [id, 0]));
  if (target <= 0 || totalAvailable <= 0) return result;

  const exact = available.map(x => target * x / totalAvailable);
  let assigned = 0;
  exact.forEach((x, i) => {
    const value = Math.min(available[i], Math.floor(x));
    result[ids[i]] = value;
    assigned += value;
  });

  let qalan = target - assigned;
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  while (qalan > 0) {
    let changed = false;
    for (const item of order) {
      if (qalan <= 0) break;
      const id = ids[item.i];
      if (result[id] >= available[item.i]) continue;
      result[id] += 1;
      qalan -= 1;
      changed = true;
    }
    if (!changed) break;
  }
  return result;
}

function pvpResursTalaniTetbiqEt(attackerState, defenderState, convoyId, nowMs = Date.now()) {
  if (!attackerState || !defenderState) {
    throw new Error("PvP resurs talanı üçün iki oyunçu state-i tələb olunur.");
  }

  const konvoy = konvoyuTap(attackerState, convoyId);
  if (!konvoy) throw new Error("PvP resurs talanı üçün hücumçu konvoyu tapılmadı.");

  const sagQalanQosunSayi = sagQalanQosunSayiniAl(konvoy);
  const tutumHesabi = konvoyTutumHesabiniAl(attackerState, convoyId);
  const dasimaTutumu = sagQalanQosunSayi > 0 ? tamEded(tutumHesabi && tutumHesabi.yekunTutum) : 0;
  const ids = lootableResourceIds();
  const protection = qorumaCedveliniAl(defenderState);

  if (!defenderState.resources || typeof defenderState.resources !== "object") defenderState.resources = {};
  if (!attackerState.resources || typeof attackerState.resources !== "object") attackerState.resources = {};

  const before = {};
  const attackerBefore = {};
  const protectedByResource = {};
  const unprotectedByResource = {};
  for (const id of ids) {
    const amount = tamEded(defenderState.resources[id]);
    const protectedAmount = Math.min(amount, tamEded(protection.byResource[id]));
    before[id] = amount;
    attackerBefore[id] = tamEded(attackerState.resources[id]);
    protectedByResource[id] = protectedAmount;
    unprotectedByResource[id] = Math.max(0, amount - protectedAmount);
  }

  const stolenByResource = tutumaGoreResursBol(unprotectedByResource, dasimaTutumu, ids);

  let stolenTotal = 0;
  for (const id of ids) {
    const stolen = tamEded(stolenByResource[id]);
    if (stolen <= 0) continue;
    defenderState.resources[id] = Math.max(0, tamEded(defenderState.resources[id]) - stolen);
    attackerState.resources[id] = tamEded(attackerState.resources[id]) + stolen;
    stolenTotal += stolen;
  }

  const operation = attackerState && attackerState.konvoyEmeliyyatlari && attackerState.konvoyEmeliyyatlari.activeByConvoy
    ? attackerState.konvoyEmeliyyatlari.activeByConvoy[metnAl(convoyId, 64)]
    : null;

  if (operation && typeof operation === "object") {
    // UI/raport üçün konvoyun götürdüyü yük ayrıca saxlanılır. Resursun ownership-i
    // isə iki oyunçulu PostgreSQL transaction daxilində dərhal hücumçuya keçirilir;
    // buna görə sonradan geri dönüşdə ikinci dəfə resource credit edilməməlidir.
    operation.carriedResources = kopyala(stolenByResource);
    operation.plunderCapacity = dasimaTutumu;
    operation.plunderAssignedAtMs = tamEded(nowMs) || Date.now();
    operation.resourcesCreditedAtSettlement = true;
  }

  return {
    success: true,
    version: 1,
    policyId: "pvp_resource_plunder_v1",
    convoyId: metnAl(convoyId, 64),
    survivingTroopCount: sagQalanQosunSayi,
    carryingCapacity: dasimaTutumu,
    capacityFormula: kopyala(tutumHesabi),
    protectionConfigured: protection.configured,
    lootableResourceIds: ids,
    defenderBefore: before,
    attackerBefore,
    protectedByResource,
    unprotectedByResource,
    stolenByResource,
    stolenTotal,
    attackerOwnership: "account_resources_atomic",
    resourcesCreditedAtSettlement: true,
    defenderAfter: Object.fromEntries(ids.map(id => [id, tamEded(defenderState.resources[id])])),
    attackerAfter: Object.fromEntries(ids.map(id => [id, tamEded(attackerState.resources[id])]))
  };
}

function pvpDasinanResurslariBazayaTeslimEt(state, operation) {
  if (!state || !operation || typeof operation !== "object") {
    return { success: false, deyisdi: false, message: "PvP daşınan resurs teslimi üçün məlumat yoxdur." };
  }

  if (operation.resourcesCreditedAtSettlement === true) {
    return {
      success: true,
      deyisdi: false,
      alreadyCredited: true,
      deliveredTotal: Object.values(operation.carriedResources || {}).reduce((c, x) => c + tamEded(x), 0),
      deliveredByResource: kopyala(operation.carriedResources || {})
    };
  }

  const carried = operation.carriedResources;
  if (!carried || typeof carried !== "object" || Array.isArray(carried)) {
    return { success: true, deyisdi: false, deliveredTotal: 0, deliveredByResource: {} };
  }

  if (!state.resources || typeof state.resources !== "object") state.resources = {};
  const deliveredByResource = {};
  let deliveredTotal = 0;

  for (const [rawId, rawAmount] of Object.entries(carried)) {
    const id = metnAl(rawId, 64);
    const amount = tamEded(rawAmount);
    if (!id || amount <= 0) continue;
    state.resources[id] = tamEded(state.resources[id]) + amount;
    deliveredByResource[id] = amount;
    deliveredTotal += amount;
  }

  operation.deliveredResources = kopyala(deliveredByResource);
  operation.deliveredResourcesTotal = deliveredTotal;
  operation.carriedResources = {};

  return {
    success: true,
    deyisdi: deliveredTotal > 0,
    deliveredTotal,
    deliveredByResource
  };
}

module.exports = {
  DEFAULT_LOOTABLE_RESOURCE_IDS,
  lootableResourceIds,
  qorumaCedveliniAl,
  sagQalanQosunSayiniAl,
  tutumaGoreResursBol,
  pvpResursTalaniTetbiqEt,
  pvpDasinanResurslariBazayaTeslimEt
};
