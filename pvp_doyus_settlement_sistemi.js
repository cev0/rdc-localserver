"use strict";

const { pvpMudafieciSnapshotiniHazirla } = require("./pvp_doyus_snapshot_sistemi");
const { pvpDoyusuHesabla } = require("./pvp_doyus_resolver");
const { serverItkiPlaniniTetbiqEt, yungulYaralilariBerpaEt } = require("./doyus_xestexana_korpu");
const { ikiOyuncuStateMutasiyasiniPostgresIleIcraEt } = require("./iki_oyuncu_state_mutasiya_postgres");
const { stateTeminEt } = require("./konvoy_emeliyyat_sistemi");
const { PVP_BAZA_STATUSLARI } = require("./pvp_baza_hedef_qaydasi");
const { legacyQosunIdSiniCanonicalEt } = require("./qosun_doyus_stat_sistemi");

function metnAl(v, max = 128) { return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : ""; }
function tamEded(v) { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0; }
function kopyala(v) { return v == null ? null : JSON.parse(JSON.stringify(v)); }
function canonicalId(v) { return legacyQosunIdSiniCanonicalEt(v) || metnAl(v, 128); }
function konvoylariAl(state) { return Array.isArray(state && state.konvoylar && state.konvoylar.items) ? state.konvoylar.items : []; }
function konvoyuTap(state, convoyId) { const id = metnAl(convoyId, 64); return konvoylariAl(state).find(x => metnAl(x && x.konvoyId, 64) === id) || null; }
function formasiyaAl(konvoy) {
  return Array.isArray(konvoy && konvoy.formasiya && konvoy.formasiya.siralar)
    ? konvoy.formasiya.siralar.map(x => ({ siraId: metnAl(x && x.siraId, 32), unitId: metnAl(x && x.unitId, 128), count: tamEded(x && x.count) }))
      .filter(x => x.siraId && x.unitId && x.count > 0)
    : [];
}
function cemQosun(rows, canonical = false) {
  const out = {};
  for (const row of Array.isArray(rows) ? rows : []) {
    const rawId = metnAl(row && row.unitId, 128);
    const unitId = canonical ? canonicalId(rawId) : rawId;
    const count = tamEded(row && row.count);
    if (!unitId || count <= 0) continue;
    out[unitId] = tamEded(out[unitId]) + count;
  }
  return out;
}
function snapshotQosunlariniCanonicalEt(raw) {
  const out = {};
  for (const [rawId, rawCount] of Object.entries(raw && typeof raw === "object" ? raw : {})) {
    const unitId = canonicalId(rawId);
    const count = tamEded(rawCount);
    if (!unitId || count <= 0) continue;
    out[unitId] = tamEded(out[unitId]) + count;
  }
  return out;
}
function obyektBeraberdir(a, b) {
  const norm = x => Object.entries(x || {}).filter(([, v]) => tamEded(v) > 0).map(([k, v]) => [k, tamEded(v)]).sort((m, n) => m[0].localeCompare(n[0]));
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

function tutumaGoreBol(total, capacities) {
  const hedef = tamEded(total);
  const cap = (Array.isArray(capacities) ? capacities : []).map(tamEded);
  const result = cap.map(() => 0);
  const totalCap = cap.reduce((a, b) => a + b, 0);
  if (hedef <= 0) return result;
  if (hedef > totalCap || totalCap <= 0) throw new Error("PvP itki bölgüsü mövcud qoşun sayını aşır.");
  const exact = cap.map(x => hedef * x / totalCap);
  exact.forEach((x, i) => { result[i] = Math.min(cap[i], Math.floor(x)); });
  let qalan = hedef - result.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, f: x - Math.floor(x) })).sort((a, b) => b.f - a.f || a.i - b.i);
  while (qalan > 0) {
    let changed = false;
    for (const x of order) {
      if (qalan <= 0) break;
      if (result[x.i] >= cap[x.i]) continue;
      result[x.i] += 1;
      qalan -= 1;
      changed = true;
    }
    if (!changed) break;
  }
  if (qalan !== 0) throw new Error("PvP itki bölgüsü tamamlana bilmədi.");
  return result;
}

function mudafiePlaniniKonvoylaraBol(state, defenderSnapshot, rawPlan) {
  const convoyIds = Array.isArray(defenderSnapshot && defenderSnapshot.defenseConvoyIds)
    ? defenderSnapshot.defenseConvoyIds.map(x => metnAl(x, 64)).filter(Boolean).sort()
    : [];
  const sources = [];
  for (const convoyId of convoyIds) {
    const konvoy = konvoyuTap(state, convoyId);
    if (!konvoy) throw new Error(`Müdafiə konvoyu tapılmadı: ${convoyId}`);
    formasiyaAl(konvoy).forEach((row, rowIndex) => sources.push({ convoyId, rowIndex, ...row, canonicalUnitId: canonicalId(row.unitId) }));
  }
  if (!obyektBeraberdir(cemQosun(sources, true), snapshotQosunlariniCanonicalEt(defenderSnapshot && defenderSnapshot.troops))) {
    throw new Error("Müdafiə konvoylarının cari qoşunları kilidlənmiş defender snapshot-a uyğun deyil.");
  }

  const output = new Map(convoyIds.map(id => [id, []]));
  for (const raw of Array.isArray(rawPlan && rawPlan.siralar) ? rawPlan.siralar : []) {
    const planUnitId = canonicalId(raw && raw.unitId);
    const totalLoss = tamEded(raw && raw.itki);
    const heavyTotal = tamEded(raw && raw.agirYaraliNamized);
    const lightTotal = tamEded(raw && raw.yungulYarali);
    const deadTotal = tamEded(raw && raw.birbasaOlu);
    if (!planUnitId || totalLoss <= 0) continue;
    if (heavyTotal + lightTotal + deadTotal !== totalLoss) throw new Error("Defender casualty plan bölünməsi uyğun deyil.");
    const unitSources = sources.filter(x => x.canonicalUnitId === planUnitId);
    if (unitSources.length <= 0) throw new Error(`Defender casualty üçün unit tapılmadı: ${planUnitId}`);
    const losses = tutumaGoreBol(totalLoss, unitSources.map(x => x.count));
    const heavy = tutumaGoreBol(heavyTotal, losses);
    const lightCaps = losses.map((x, i) => x - heavy[i]);
    const light = tutumaGoreBol(lightTotal, lightCaps);
    const dead = losses.map((x, i) => x - heavy[i] - light[i]);
    if (dead.reduce((a, b) => a + b, 0) !== deadTotal) throw new Error("Defender birbaşa ölüm bölgüsü uyğun deyil.");
    unitSources.forEach((source, i) => {
      if (losses[i] <= 0) return;
      output.get(source.convoyId).push({ siraId: source.siraId, unitId: source.unitId, itki: losses[i], agirYaraliNamized: heavy[i], yungulYarali: light[i], birbasaOlu: dead[i] });
    });
  }
  return convoyIds.map(convoyId => ({
    convoyId,
    sentFormation: formasiyaAl(konvoyuTap(state, convoyId)),
    casualtyPlan: { version: 1, policyId: rawPlan && rawPlan.policyId ? rawPlan.policyId : "normal", siralar: output.get(convoyId) || [] }
  }));
}

function summary(result) {
  const say = rows => (Array.isArray(rows) ? rows : []).reduce((c, x) => c + tamEded(x && x.count), 0);
  return result ? { sentCount: tamEded(result.sentCount), totalLoss: tamEded(result.totalLoss), heavyWounded: say(result.heavyWoundedFormation), lightWounded: say(result.lightWoundedFormation), dead: say(result.deadFormation) } : null;
}
function attackerOperationTap(state, convoyId) { return stateTeminEt(state).activeByConvoy[metnAl(convoyId, 64)] || null; }

function pvpDoyusunuIkiStateUzerindeTetbiqEt(attackerState, defenderState, convoyId, operationId = "", nowMs = Date.now()) {
  const attackerId = metnAl(attackerState && attackerState.playerId, 128);
  const defenderId = metnAl(defenderState && defenderState.playerId, 128);
  const id = metnAl(convoyId, 64);
  const now = tamEded(nowMs) || Date.now();
  if (!attackerId || !defenderId || attackerId === defenderId) throw new Error("PvP settlement üçün iki fərqli oyunçu state-i tələb olunur.");
  if (!id) throw new Error("PvP settlement üçün convoyId tələb olunur.");
  const operation = attackerOperationTap(attackerState, id);
  if (!operation) throw new Error("Settlement üçün aktiv PvP əməliyyatı tapılmadı.");
  const opId = metnAl(operation.operationId, 220);
  const requestedOpId = metnAl(operationId, 220);
  if (requestedOpId && requestedOpId !== opId) throw new Error("PvP operationId uyğun deyil.");
  if (metnAl(operation.targetPlayerId || operation.targetId, 128) !== defenderId) throw new Error("PvP əməliyyatının defender playerId-si uyğun deyil.");
  if (operation.battleResolved === true) return { success: true, deyisdi: false, alreadyResolved: true, operation: kopyala(operation), deyisenPlayerIdleri: [] };
  if (metnAl(operation.status, 64) !== PVP_BAZA_STATUSLARI.DOYUSE_HAZIR || operation.battleAllowed !== true) throw new Error("PvP əməliyyatı döyüş settlement-i üçün hazır deyil.");

  const attackerSnapshot = operation.attackerCombatSnapshot;
  if (!attackerSnapshot || attackerSnapshot.locked !== true) throw new Error("PvP hücumçu combat snapshot-u yoxdur və ya kilidlənməyib.");
  const defenderSnapshotResult = pvpMudafieciSnapshotiniHazirla(defenderState, defenderId, now);
  if (!defenderSnapshotResult || defenderSnapshotResult.success !== true) throw new Error(defenderSnapshotResult && defenderSnapshotResult.message ? defenderSnapshotResult.message : "Defender snapshot hazırlana bilmədi.");
  const defenderSnapshot = defenderSnapshotResult.snapshot;
  const combat = pvpDoyusuHesabla(attackerSnapshot, defenderSnapshot, now);
  if (!combat || combat.success !== true) throw new Error(combat && combat.message ? combat.message : "PvP resolver nəticə qaytarmadı.");

  const attackerCasualty = serverItkiPlaniniTetbiqEt(attackerState, id, attackerSnapshot.formation || [], combat.attackerCasualtyPlan, null);
  if (!attackerCasualty || attackerCasualty.success !== true) throw new Error(attackerCasualty && attackerCasualty.message ? attackerCasualty.message : "Hücumçu itkisi tətbiq edilə bilmədi.");

  const defenderApplications = [];
  for (const plan of mudafiePlaniniKonvoylaraBol(defenderState, defenderSnapshot, combat.defenderCasualtyPlan)) {
    const applied = serverItkiPlaniniTetbiqEt(defenderState, plan.convoyId, plan.sentFormation, plan.casualtyPlan, null);
    if (!applied || applied.success !== true) throw new Error(applied && applied.message ? applied.message : `Müdafiəçi itkisi tətbiq edilə bilmədi: ${plan.convoyId}`);
    const recovery = yungulYaralilariBerpaEt(defenderState, plan.convoyId, applied.lightWoundedFormation, null, now);
    if (!recovery || recovery.success !== true) throw new Error(`Müdafiəçi yüngül yaralıları bərpa edilə bilmədi: ${plan.convoyId}`);
    defenderApplications.push({ convoyId: plan.convoyId, casualty: kopyala(applied), lightWoundedRecovery: kopyala(recovery) });
  }

  operation.defenderCombatSnapshot = kopyala(defenderSnapshot);
  operation.battleResolved = true;
  operation.battleAllowed = false;
  operation.battleResolvedAtMs = now;
  operation.status = PVP_BAZA_STATUSLARI.GERI;
  operation.returnStartedAtMs = now;
  operation.returnEndsAtMs = now + Math.max(1, tamEded(operation.travelDurationMs));
  operation.lightWoundedFormation = attackerCasualty.lightWoundedFormation.map(x => ({ ...x }));
  operation.result = {
    type: "pvp_battle", resolverId: combat.resolverId, winnerSide: combat.winnerSide,
    attackerVictory: combat.attackerVictory === true, defenderVictory: combat.defenderVictory === true,
    attackerPower: combat.attackerPower, defenderPower: combat.defenderPower, resolvedAtMs: now,
    attackerCasualtySummary: summary(attackerCasualty),
    defenderCasualtySummary: { sentCount: tamEded(combat.defenderCasualtyPlan && combat.defenderCasualtyPlan.sentCount), totalLoss: tamEded(combat.defenderCasualtyPlan && combat.defenderCasualtyPlan.totalLoss), convoyCount: defenderApplications.length },
    defenderConvoyIds: Array.isArray(defenderSnapshot.defenseConvoyIds) ? defenderSnapshot.defenseConvoyIds.slice() : []
  };
  return { success: true, deyisdi: true, alreadyResolved: false, combat: kopyala(combat), attackerCasualty: kopyala(attackerCasualty), defenderApplications, operation: kopyala(operation), deyisenPlayerIdleri: [attackerId, defenderId] };
}

async function pvpDoyusSettlementiniPostgresIleIcraEt(attacker, defender, convoyId, operationId = "", nowMs = Date.now(), secimler = null) {
  const runner = secimler && typeof secimler.ikiOyuncuMutasiya === "function" ? secimler.ikiOyuncuMutasiya : ikiOyuncuStateMutasiyasiniPostgresIleIcraEt;
  const runnerSecimleri = secimler && secimler.runnerSecimleri ? secimler.runnerSecimleri : null;
  return await runner(attacker, defender, async stateler => {
    const attackerId = metnAl(attacker && attacker.playerId, 128);
    const defenderId = metnAl(defender && defender.playerId, 128);
    return pvpDoyusunuIkiStateUzerindeTetbiqEt(stateler[attackerId], stateler[defenderId], convoyId, operationId, nowMs);
  }, runnerSecimleri);
}

module.exports = { tutumaGoreBol, mudafiePlaniniKonvoylaraBol, pvpDoyusunuIkiStateUzerindeTetbiqEt, pvpDoyusSettlementiniPostgresIleIcraEt };
