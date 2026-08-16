"use strict";

const {
  raportStateTeminEt
} = require("./doyus_raport_sistemi");

function metnAl(v, max = 220) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function formasiyaKopyala(raw) {
  return (Array.isArray(raw) ? raw : [])
    .map(x => ({
      siraId: metnAl(x && x.siraId, 32),
      unitId: metnAl(x && x.unitId, 128),
      count: tamEded(x && x.count)
    }))
    .filter(x => x.unitId && x.count > 0);
}

function formasiyaCemle(rawLists) {
  const map = new Map();
  for (const list of Array.isArray(rawLists) ? rawLists : []) {
    for (const row of formasiyaKopyala(list)) {
      const key = `${row.siraId}|${row.unitId}`;
      const old = map.get(key) || { ...row, count: 0 };
      old.count += row.count;
      map.set(key, old);
    }
  }
  return [...map.values()];
}

function qosunObyekti(rows) {
  const out = {};
  for (const row of formasiyaKopyala(rows)) {
    out[row.unitId] = tamEded(out[row.unitId]) + row.count;
  }
  return out;
}

function casualtyNeticesiniHazirla(result) {
  const sentFormation = formasiyaKopyala(result && result.sentFormation);
  const heavyWoundedFormation = formasiyaKopyala(result && result.heavyWoundedFormation);
  const lightWoundedFormation = formasiyaKopyala(result && result.lightWoundedFormation);
  const directDeadFormation = formasiyaKopyala(result && result.directDeadFormation);
  const hospitalOverflowDeadFormation = formasiyaKopyala(result && result.hospitalOverflowDeadFormation);
  const deadFormation = formasiyaKopyala(result && result.deadFormation);
  const survivedFormation = formasiyaKopyala(result && result.survivedFormation);
  const returnedFormation = formasiyaKopyala(result && result.returnedFormation);

  const say = rows => rows.reduce((cem, x) => cem + tamEded(x.count), 0);
  const sent = tamEded(result && result.sentCount) || say(sentFormation);
  const totalLoss = tamEded(result && result.totalLoss);
  const heavyWounded = say(heavyWoundedFormation);
  const lightWounded = say(lightWoundedFormation);
  const directDead = say(directDeadFormation);
  const hospitalOverflowDead = say(hospitalOverflowDeadFormation);
  const deadTotal = say(deadFormation) || directDead + hospitalOverflowDead;
  const survived = say(survivedFormation) || Math.max(0, sent - totalLoss);

  return {
    sentFormation,
    casualtySummary: {
      sent,
      totalLoss,
      directDead,
      hospitalOverflowDead,
      deadTotal,
      heavyWounded,
      lightWounded,
      survived,
      lightWoundedPendingReturn: lightWounded,
      finalActiveAfterReturn: Math.max(0, sent - heavyWounded - deadTotal)
    },
    lostTroops: qosunObyekti(formasiyaCemle([heavyWoundedFormation, lightWoundedFormation, deadFormation])),
    woundedTroops: qosunObyekti(formasiyaCemle([heavyWoundedFormation, lightWoundedFormation])),
    heavyWoundedTroops: qosunObyekti(heavyWoundedFormation),
    lightWoundedTroops: qosunObyekti(lightWoundedFormation),
    directDeadTroops: qosunObyekti(directDeadFormation),
    hospitalOverflowDeadTroops: qosunObyekti(hospitalOverflowDeadFormation),
    deadTroops: qosunObyekti(deadFormation),
    survivedTroops: qosunObyekti(survivedFormation),
    returnedTroops: qosunObyekti(returnedFormation),
    lostFormation: formasiyaCemle([heavyWoundedFormation, lightWoundedFormation, deadFormation]),
    woundedFormation: formasiyaCemle([heavyWoundedFormation, lightWoundedFormation]),
    heavyWoundedFormation,
    lightWoundedFormation,
    directDeadFormation,
    hospitalOverflowDeadFormation,
    deadFormation,
    survivedFormation,
    returnedFormation,
    hospital: kopyala(result && result.hospital) || null
  };
}

function defenderCasualtyNeticesiniBirlesdir(applications) {
  const items = Array.isArray(applications) ? applications : [];
  const pick = key => items.map(x => x && x.casualty && x.casualty[key]);
  const sentFormation = formasiyaCemle(pick("sentFormation"));
  const heavyWoundedFormation = formasiyaCemle(pick("heavyWoundedFormation"));
  const lightWoundedFormation = formasiyaCemle(pick("lightWoundedFormation"));
  const directDeadFormation = formasiyaCemle(pick("directDeadFormation"));
  const hospitalOverflowDeadFormation = formasiyaCemle(pick("hospitalOverflowDeadFormation"));
  const deadFormation = formasiyaCemle(pick("deadFormation"));
  const survivedFormation = formasiyaCemle(pick("survivedFormation"));
  const returnedFormation = formasiyaCemle(pick("returnedFormation"));

  return casualtyNeticesiniHazirla({
    sentFormation,
    sentCount: sentFormation.reduce((c, x) => c + x.count, 0),
    totalLoss: items.reduce((c, x) => c + tamEded(x && x.casualty && x.casualty.totalLoss), 0),
    heavyWoundedFormation,
    lightWoundedFormation,
    directDeadFormation,
    hospitalOverflowDeadFormation,
    deadFormation,
    survivedFormation,
    returnedFormation,
    hospital: null
  });
}

function raportId(operationId, role) {
  const temiz = metnAl(operationId, 170).replace(/[^a-z0-9_-]+/g, "_");
  return `pvp_${temiz || "battle"}_${role}`.slice(0, 220);
}

function raportuElaveEt(state, report) {
  const raportlar = raportStateTeminEt(state);
  const movcud = raportlar.items.find(x => x && metnAl(x.reportId, 220) === metnAl(report.reportId, 220));
  if (movcud) return movcud;

  raportlar.items.push(report);
  if (raportlar.items.length > 100) {
    const saved = raportlar.items.filter(x => x && x.isSaved === true);
    const adi = raportlar.items
      .filter(x => x && x.isSaved !== true)
      .sort((a, b) => tamEded(b.createdAtMs) - tamEded(a.createdAtMs))
      .slice(0, Math.max(0, 100 - saved.length));
    raportlar.items = [...saved, ...adi]
      .sort((a, b) => tamEded(a.createdAtMs) - tamEded(b.createdAtMs));
  }
  return report;
}

function pvpReportHazirla({
  playerId,
  opponentPlayerId,
  role,
  operationId,
  stateId,
  x,
  z,
  victory,
  ownPower,
  opponentPower,
  casualty,
  ownConvoyIds,
  opponentConvoyIds,
  resolvedAtMs,
  resolverId
}) {
  const createdAtMs = tamEded(resolvedAtMs) || Date.now();
  const own = casualty || casualtyNeticesiniHazirla(null);
  const ownFormation = formasiyaKopyala(own.sentFormation);
  const ownTroops = qosunObyekti(ownFormation);

  return {
    reportVersion: 4,
    reportId: raportId(operationId, role),
    battleId: metnAl(operationId, 220),
    category: "battle",
    battleType: "pvp",
    pvpRole: role,
    playerId: metnAl(playerId, 128),
    opponentPlayerId: metnAl(opponentPlayerId, 128),
    opponentType: "player_base",
    stateId: Math.max(1, tamEded(stateId) || 1),
    x: Number(x) || 0,
    z: Number(z) || 0,
    enemyId: metnAl(opponentPlayerId, 128),
    enemyType: "player_base",
    enemyLevel: 0,
    result: victory ? "win" : "loss",
    victory: victory === true,
    invalidated: false,
    playerPower: tamEded(ownPower),
    enemyPower: tamEded(opponentPower),
    powerBreakdown: {
      troopPower: tamEded(ownPower),
      heroPower: 0,
      skillPower: 0,
      totalPower: tamEded(ownPower),
      heroPowerPending: true,
      skillPowerPending: true
    },
    resolverId: metnAl(resolverId, 128),
    heroIds: [],
    sentTroops: ownTroops,
    sentFormation: ownFormation,
    ownConvoyIds: (Array.isArray(ownConvoyIds) ? ownConvoyIds : []).map(x => metnAl(x, 64)).filter(Boolean),
    opponentConvoyIds: (Array.isArray(opponentConvoyIds) ? opponentConvoyIds : []).map(x => metnAl(x, 64)).filter(Boolean),
    casualtyVersion: 4,
    casualtyPlan: null,
    casualtySummary: kopyala(own.casualtySummary) || {},
    lostTroops: kopyala(own.lostTroops) || {},
    woundedTroops: kopyala(own.woundedTroops) || {},
    heavyWoundedTroops: kopyala(own.heavyWoundedTroops) || {},
    lightWoundedTroops: kopyala(own.lightWoundedTroops) || {},
    directDeadTroops: kopyala(own.directDeadTroops) || {},
    hospitalOverflowDeadTroops: kopyala(own.hospitalOverflowDeadTroops) || {},
    deadTroops: kopyala(own.deadTroops) || {},
    survivedTroops: kopyala(own.survivedTroops) || {},
    returnedTroops: kopyala(own.returnedTroops) || {},
    lostFormation: kopyala(own.lostFormation) || [],
    woundedFormation: kopyala(own.woundedFormation) || [],
    heavyWoundedFormation: kopyala(own.heavyWoundedFormation) || [],
    lightWoundedFormation: kopyala(own.lightWoundedFormation) || [],
    directDeadFormation: kopyala(own.directDeadFormation) || [],
    hospitalOverflowDeadFormation: kopyala(own.hospitalOverflowDeadFormation) || [],
    deadFormation: kopyala(own.deadFormation) || [],
    survivedFormation: kopyala(own.survivedFormation) || [],
    returnedFormation: kopyala(own.returnedFormation) || [],
    hospital: kopyala(own.hospital) || null,
    lossCalculationPending: false,
    hospitalResolutionPending: false,
    lightWoundedRecoveryPending: role === "attacker" && tamEded(own.casualtySummary && own.casualtySummary.lightWounded) > 0,
    lightWoundedRecoveredAtMs: role === "defender" ? createdAtMs : 0,
    reward: {},
    heroExp: 0,
    heroExpDistributionPending: false,
    resourceRewardClaimed: true,
    resourceRewardClaimPending: false,
    resourceRewardAvailableAtMs: 0,
    resourceRewardClaimedAtMs: 0,
    resourceRewardsClaimed: [],
    resourceRewardLastError: "",
    lootAlreadyApplied: true,
    createdAtMs,
    isRead: false,
    isSaved: false,
    readAtMs: 0,
    savedAtMs: 0
  };
}

function pvpIkiTerefRaportlariniYarat(attackerState, defenderState, settlement, nowMs = Date.now()) {
  if (!settlement || settlement.success !== true || settlement.alreadyResolved === true) {
    return { success: true, created: false, attackerReport: null, defenderReport: null };
  }

  const operation = settlement.operation || {};
  const combat = settlement.combat || {};
  const attackerId = metnAl(attackerState && attackerState.playerId, 128);
  const defenderId = metnAl(defenderState && defenderState.playerId, 128);
  const operationId = metnAl(operation.operationId, 220);
  if (!attackerId || !defenderId || !operationId) {
    throw new Error("PvP raportu üçün oyunçu və operation məlumatı natamamdır.");
  }

  const target = operation.targetSnapshot || {};
  const stateId = Math.max(1, tamEded(operation.stateId || target.stateId) || 1);
  const x = Number(target.targetX != null ? target.targetX : operation.targetX) || 0;
  const z = Number(target.targetZ != null ? target.targetZ : operation.targetZ) || 0;

  const attackerCasualty = casualtyNeticesiniHazirla(settlement.attackerCasualty);
  const defenderCasualty = defenderCasualtyNeticesiniBirlesdir(settlement.defenderApplications);
  const defenderConvoyIds = Array.isArray(operation.result && operation.result.defenderConvoyIds)
    ? operation.result.defenderConvoyIds
    : [];

  const attackerReport = raportuElaveEt(attackerState, pvpReportHazirla({
    playerId: attackerId,
    opponentPlayerId: defenderId,
    role: "attacker",
    operationId,
    stateId,
    x,
    z,
    victory: combat.attackerVictory === true,
    ownPower: combat.attackerPower,
    opponentPower: combat.defenderPower,
    casualty: attackerCasualty,
    ownConvoyIds: [operation.convoyId],
    opponentConvoyIds: defenderConvoyIds,
    resolvedAtMs: nowMs,
    resolverId: combat.resolverId
  }));

  const defenderReport = raportuElaveEt(defenderState, pvpReportHazirla({
    playerId: defenderId,
    opponentPlayerId: attackerId,
    role: "defender",
    operationId,
    stateId,
    x,
    z,
    victory: combat.defenderVictory === true,
    ownPower: combat.defenderPower,
    opponentPower: combat.attackerPower,
    casualty: defenderCasualty,
    ownConvoyIds: defenderConvoyIds,
    opponentConvoyIds: [operation.convoyId],
    resolvedAtMs: nowMs,
    resolverId: combat.resolverId
  }));

  operation.result = {
    ...(operation.result && typeof operation.result === "object" ? operation.result : {}),
    attackerReportId: attackerReport.reportId,
    defenderReportId: defenderReport.reportId
  };

  return {
    success: true,
    created: true,
    attackerReport: kopyala(attackerReport),
    defenderReport: kopyala(defenderReport)
  };
}

module.exports = {
  casualtyNeticesiniHazirla,
  defenderCasualtyNeticesiniBirlesdir,
  pvpReportHazirla,
  pvpIkiTerefRaportlariniYarat
};
