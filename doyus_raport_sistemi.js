"use strict";

const crypto = require("crypto");
const { dusmenMovqeyiAl } = require("./xerite_movqe_sistemi");

const RESURS_MUKAFAT_IDLERI = Object.freeze([
  "food",
  "water",
  "wood",
  "iron",
  "fuel",
  "money"
]);

function metnAl(v, max = 200) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function rewardResurslariVar(reward) {
  if (!reward || typeof reward !== "object") return false;
  return RESURS_MUKAFAT_IDLERI.some(id => tamEded(reward[id]) > 0);
}

function legacyRaportuYenile(report) {
  if (!report || typeof report !== "object") return report;

  const legacyClaimed = report.lootAlreadyApplied === true;
  if (typeof report.resourceRewardClaimed !== "boolean") {
    report.resourceRewardClaimed = legacyClaimed;
  }

  if (typeof report.resourceRewardClaimPending !== "boolean") {
    report.resourceRewardClaimPending =
      report.victory === true &&
      report.invalidated !== true &&
      rewardResurslariVar(report.reward) &&
      report.resourceRewardClaimed !== true;
  }

  if (!Number.isFinite(Number(report.resourceRewardClaimedAtMs))) {
    report.resourceRewardClaimedAtMs = report.resourceRewardClaimed === true
      ? tamEded(report.createdAtMs)
      : 0;
  }

  if (!Array.isArray(report.resourceRewardsClaimed)) {
    report.resourceRewardsClaimed = [];
  }

  if (typeof report.resourceRewardLastError !== "string") {
    report.resourceRewardLastError = "";
  }

  if (report.resourceRewardClaimed === true) {
    report.resourceRewardClaimPending = false;
    report.lootAlreadyApplied = true;
  }

  report.reportVersion = Math.max(3, tamEded(report.reportVersion) || 1);
  return report;
}

function raportStateTeminEt(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Döyüş raportu üçün oyunçu state-i yoxdur.");
  }
  if (!state.doyusRaportlari || typeof state.doyusRaportlari !== "object" || Array.isArray(state.doyusRaportlari)) {
    state.doyusRaportlari = { version: 3, items: [] };
  }
  state.doyusRaportlari.version = 3;
  if (!Array.isArray(state.doyusRaportlari.items)) state.doyusRaportlari.items = [];
  state.doyusRaportlari.items.forEach(legacyRaportuYenile);
  return state.doyusRaportlari;
}

function raportIdYarat(nowMs) {
  return `battle_${tamEded(nowMs) || Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function enemyIndexiniAl(enemyId) {
  const match = metnAl(enemyId, 128).match(/^state_(\d+)_enemy_(\d+)$/);
  return match ? Math.max(0, tamEded(match[2])) : 0;
}

function formasiyaKopyala(raw) {
  return Array.isArray(raw)
    ? raw.map(x => ({
        siraId: metnAl(x && x.siraId, 32),
        unitId: metnAl(x && x.unitId, 128),
        count: tamEded(x && x.count)
      }))
    : [];
}

function boshCasualtySummary(sentFormation) {
  const sent = formasiyaKopyala(sentFormation).reduce((cem, x) => cem + x.count, 0);
  return {
    sent,
    totalLoss: 0,
    directDead: 0,
    hospitalOverflowDead: 0,
    deadTotal: 0,
    heavyWounded: 0,
    lightWounded: 0,
    survived: sent,
    lightWoundedPendingReturn: 0,
    finalActiveAfterReturn: sent
  };
}

function raportYarat(state, melumat, nowMs = Date.now()) {
  const raportlar = raportStateTeminEt(state);
  const battleId = metnAl(melumat && melumat.battleId, 220);
  if (battleId) {
    const movcud = raportlar.items.find(x => x && metnAl(x.battleId, 220) === battleId);
    if (movcud) return legacyRaportuYenile(movcud);
  }

  const stateId = Math.max(1, tamEded(melumat && melumat.stateId) || 1);
  const enemyId = metnAl(melumat && melumat.enemyId, 128);
  const enemyIndex = enemyIndexiniAl(enemyId);
  const movqe = enemyIndex > 0 ? dusmenMovqeyiAl(stateId, enemyIndex) : null;
  const sentTroops = kopyala(melumat && melumat.sentTroops) || {};
  const sentFormation = formasiyaKopyala(melumat && melumat.sentFormation);
  const reward = kopyala(melumat && melumat.reward) || {};
  const heroExp = tamEded(reward.heroExp);
  const victory = melumat && melumat.victory === true;
  const invalidated = melumat && melumat.invalidated === true;
  const lootAlreadyApplied = melumat && melumat.lootAlreadyApplied === true;
  const createdAtMs = tamEded(melumat && melumat.completedAtMs) || tamEded(nowMs) || Date.now();
  const hasResourceReward = rewardResurslariVar(reward);

  const raport = {
    reportVersion: 3,
    reportId: raportIdYarat(nowMs),
    battleId: battleId || "",
    category: "battle",
    battleType: "pve",
    stateId,
    x: movqe ? tamEded(movqe.x) : 0,
    z: movqe ? tamEded(movqe.z) : 0,
    enemyId,
    enemyType: metnAl(melumat && melumat.enemyType, 64),
    enemyLevel: tamEded(melumat && melumat.enemyLevel),
    result: victory ? "win" : "loss",
    victory,
    invalidated,
    playerPower: tamEded(melumat && melumat.playerPower),
    enemyPower: tamEded(melumat && melumat.enemyPower),
    powerBreakdown: {
      troopPower: tamEded(melumat && melumat.playerPower),
      heroPower: 0,
      skillPower: 0,
      totalPower: tamEded(melumat && melumat.playerPower),
      heroPowerPending: true,
      skillPowerPending: true
    },
    heroIds: Array.isArray(melumat && melumat.heroIds)
      ? melumat.heroIds.map(x => metnAl(x, 128)).filter(Boolean)
      : [],
    sentTroops,
    sentFormation,
    casualtyVersion: 2,
    casualtyPlan: null,
    casualtySummary: boshCasualtySummary(sentFormation),
    lostTroops: {},
    woundedTroops: {},
    heavyWoundedTroops: {},
    lightWoundedTroops: {},
    directDeadTroops: {},
    hospitalOverflowDeadTroops: {},
    deadTroops: {},
    survivedTroops: kopyala(sentTroops) || {},
    returnedTroops: kopyala(sentTroops) || {},
    lostFormation: [],
    woundedFormation: [],
    heavyWoundedFormation: [],
    lightWoundedFormation: [],
    directDeadFormation: [],
    hospitalOverflowDeadFormation: [],
    deadFormation: [],
    survivedFormation: formasiyaKopyala(sentFormation),
    returnedFormation: formasiyaKopyala(sentFormation),
    hospital: null,
    lossCalculationPending: true,
    hospitalResolutionPending: true,
    lightWoundedRecoveryPending: false,
    lightWoundedRecoveredAtMs: 0,
    reward,
    heroExp,
    heroExpDistributionPending: heroExp > 0,
    resourceRewardClaimed: lootAlreadyApplied,
    resourceRewardClaimPending: victory && !invalidated && hasResourceReward && !lootAlreadyApplied,
    resourceRewardClaimedAtMs: lootAlreadyApplied ? createdAtMs : 0,
    resourceRewardsClaimed: [],
    resourceRewardLastError: "",
    lootAlreadyApplied,
    createdAtMs,
    isRead: false,
    isSaved: false,
    readAtMs: 0,
    savedAtMs: 0
  };

  raportlar.items.push(raport);
  if (raportlar.items.length > 100) {
    const saved = raportlar.items.filter(x => x && x.isSaved === true);
    const adi = raportlar.items
      .filter(x => x && x.isSaved !== true)
      .sort((a, b) => tamEded(b.createdAtMs) - tamEded(a.createdAtMs))
      .slice(0, Math.max(0, 100 - saved.length));
    raportlar.items = [...saved, ...adi]
      .sort((a, b) => tamEded(a.createdAtMs) - tamEded(b.createdAtMs));
  }
  return raport;
}

function raportuTap(state, reportId) {
  const id = metnAl(reportId, 220);
  const report = raportStateTeminEt(state).items.find(x => x && metnAl(x.reportId, 220) === id) || null;
  return legacyRaportuYenile(report);
}

function raportSiyahisiniHazirla(state) {
  return raportStateTeminEt(state).items
    .slice()
    .sort((a, b) => tamEded(b.createdAtMs) - tamEded(a.createdAtMs))
    .map(x => ({
      reportId: x.reportId,
      category: x.category,
      battleType: x.battleType || "pve",
      stateId: x.stateId,
      x: x.x,
      z: x.z,
      enemyId: x.enemyId,
      enemyType: x.enemyType,
      enemyLevel: x.enemyLevel,
      result: x.result,
      victory: x.victory === true,
      playerPower: tamEded(x.playerPower),
      enemyPower: tamEded(x.enemyPower),
      createdAtMs: x.createdAtMs,
      isRead: x.isRead === true,
      isSaved: x.isSaved === true,
      heroExp: tamEded(x.heroExp),
      heroExpDistributionPending: x.heroExpDistributionPending === true,
      reward: kopyala(x.reward) || {},
      resourceRewardClaimed: x.resourceRewardClaimed === true,
      resourceRewardClaimPending: x.resourceRewardClaimPending === true,
      resourceRewardClaimedAtMs: tamEded(x.resourceRewardClaimedAtMs),
      resourceRewardLastError: x.resourceRewardLastError || "",
      casualtySummary: kopyala(x.casualtySummary) || {},
      lossCalculationPending: x.lossCalculationPending === true,
      hospitalResolutionPending: x.hospitalResolutionPending === true,
      lightWoundedRecoveryPending: x.lightWoundedRecoveryPending === true
    }));
}

function raportDetaliHazirla(state, reportId) {
  const raport = raportuTap(state, reportId);
  return raport ? kopyala(raport) : null;
}

function raportuOxunmusEt(state, reportId, nowMs = Date.now()) {
  const raport = raportuTap(state, reportId);
  if (!raport) return { success: false, message: "Döyüş raportu tapılmadı." };
  raport.isRead = true;
  if (!tamEded(raport.readAtMs)) raport.readAtMs = tamEded(nowMs) || Date.now();
  return { success: true, report: kopyala(raport) };
}

function raportuSaxla(state, reportId, saxla, nowMs = Date.now()) {
  const raport = raportuTap(state, reportId);
  if (!raport) return { success: false, message: "Döyüş raportu tapılmadı." };
  raport.isSaved = saxla === true;
  raport.savedAtMs = raport.isSaved ? (tamEded(nowMs) || Date.now()) : 0;
  return { success: true, report: kopyala(raport) };
}

function raportuSil(state, reportId) {
  const id = metnAl(reportId, 220);
  const raportlar = raportStateTeminEt(state);
  const index = raportlar.items.findIndex(x => x && metnAl(x.reportId, 220) === id);
  if (index < 0) return { success: false, message: "Döyüş raportu tapılmadı." };

  const report = legacyRaportuYenile(raportlar.items[index]);
  if (report && report.resourceRewardClaimPending === true) {
    return {
      success: false,
      message: "Alınmamış döyüş resurs mükafatı olan raport silinə bilməz."
    };
  }

  const [silinen] = raportlar.items.splice(index, 1);
  return { success: true, reportId: id, deleted: kopyala(silinen) };
}

module.exports = {
  raportStateTeminEt,
  raportYarat,
  raportuTap,
  raportSiyahisiniHazirla,
  raportDetaliHazirla,
  raportuOxunmusEt,
  raportuSaxla,
  raportuSil
};
