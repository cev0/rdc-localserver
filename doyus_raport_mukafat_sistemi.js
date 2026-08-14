"use strict";

const { raportuTap } = require("./doyus_raport_sistemi");

const DESTEKLENEN_RESURSLAR = Object.freeze([
  "food",
  "water",
  "wood",
  "iron",
  "fuel",
  "money"
]);

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function raportResurslariniAl(report) {
  const reward = report && report.reward && typeof report.reward === "object"
    ? report.reward
    : {};
  const resurslar = [];

  for (const resourceId of DESTEKLENEN_RESURSLAR) {
    const amount = tamEded(reward[resourceId]);
    if (amount > 0) resurslar.push({ resourceId, amount });
  }

  return resurslar;
}

function resursTutumunuYoxla(state, resurslar) {
  const resources = state && state.resources && typeof state.resources === "object"
    ? state.resources
    : {};
  const caps = state && state.resourceCaps && typeof state.resourceCaps === "object"
    ? state.resourceCaps
    : {};

  const details = [];
  let hamisiYerlesir = true;

  for (const item of resurslar || []) {
    const cari = Math.max(0, Number(resources[item.resourceId]) || 0);
    const capRaw = Number(caps[item.resourceId]);
    const cap = Number.isFinite(capRaw) ? Math.max(0, capRaw) : Number.POSITIVE_INFINITY;
    const yerlesir = !Number.isFinite(cap) || cari + item.amount <= cap;
    if (!yerlesir) hamisiYerlesir = false;

    details.push({
      resourceId: item.resourceId,
      amount: item.amount,
      current: cari,
      cap: Number.isFinite(cap) ? cap : -1,
      fits: yerlesir,
      missingCapacity: yerlesir || !Number.isFinite(cap)
        ? 0
        : Math.max(0, (cari + item.amount) - cap)
    });
  }

  return { success: hamisiYerlesir, items: details };
}

function vaxtMelumatiniAl(report, nowMs) {
  const now = tamEded(nowMs) || Date.now();
  const availableAtMs = tamEded(report && report.resourceRewardAvailableAtMs);
  const ready = availableAtMs <= 0 || now >= availableAtMs;
  return {
    nowMs: now,
    availableAtMs,
    ready,
    remainingMs: ready ? 0 : Math.max(0, availableAtMs - now)
  };
}

function raportResursMukafatiPreview(state, reportId, nowMs = Date.now()) {
  const report = raportuTap(state, reportId);
  if (!report) {
    return { success: false, message: "Döyüş raportu tapılmadı." };
  }

  const resurslar = raportResurslariniAl(report);
  const alreadyClaimed = report.resourceRewardClaimed === true || report.lootAlreadyApplied === true;
  const eligible = report.victory === true && report.invalidated !== true && resurslar.length > 0;
  const capacity = resursTutumunuYoxla(state, resurslar);
  const vaxt = vaxtMelumatiniAl(report, nowMs);

  return {
    success: true,
    reportId: report.reportId,
    eligible,
    alreadyClaimed,
    pending: eligible && !alreadyClaimed,
    resources: resurslar,
    capacity,
    rewardReadyAtBase: vaxt.ready,
    resourceRewardAvailableAtMs: vaxt.availableAtMs,
    remainingUntilReturnMs: vaxt.remainingMs,
    canClaim: eligible && !alreadyClaimed && vaxt.ready && capacity.success,
    heroExp: tamEded(report.heroExp),
    heroExpDistributionPending: report.heroExpDistributionPending === true
  };
}

function raportResursMukafatiniAl(state, reportId, nowMs = Date.now()) {
  const report = raportuTap(state, reportId);
  if (!report) {
    return { success: false, message: "Döyüş raportu tapılmadı." };
  }

  if (report.resourceRewardClaimed === true || report.lootAlreadyApplied === true) {
    report.resourceRewardClaimed = true;
    report.resourceRewardClaimPending = false;
    report.lootAlreadyApplied = true;
    return {
      success: true,
      alreadyClaimed: true,
      reportId: report.reportId,
      rewards: kopyala(report.resourceRewardsClaimed) || [],
      message: "Döyüş resurs mükafatı artıq bazaya əlavə edilib."
    };
  }

  if (report.victory !== true || report.invalidated === true) {
    return {
      success: false,
      alreadyClaimed: false,
      reportId: report.reportId,
      message: "Bu raport üçün resurs mükafatı verilmir."
    };
  }

  const resurslar = raportResurslariniAl(report);
  if (resurslar.length <= 0) {
    report.resourceRewardClaimPending = false;
    return {
      success: true,
      alreadyClaimed: false,
      reportId: report.reportId,
      rewards: [],
      message: "Bu döyüşdə bazaya daşınacaq resurs mükafatı yoxdur."
    };
  }

  const vaxt = vaxtMelumatiniAl(report, nowMs);
  if (!vaxt.ready) {
    report.resourceRewardClaimPending = true;
    report.resourceRewardLastError = "convoy_not_returned";
    return {
      success: false,
      alreadyClaimed: false,
      pending: true,
      reportId: report.reportId,
      message: "Döyüş mükafatı konvoy bazaya qayıtdıqdan sonra alına bilər.",
      resourceRewardAvailableAtMs: vaxt.availableAtMs,
      remainingUntilReturnMs: vaxt.remainingMs,
      rewards: resurslar
    };
  }

  const capacity = resursTutumunuYoxla(state, resurslar);
  if (!capacity.success) {
    report.resourceRewardClaimPending = true;
    report.resourceRewardLastError = "storage_capacity";
    return {
      success: false,
      alreadyClaimed: false,
      pending: true,
      reportId: report.reportId,
      message: "Döyüş mükafatı üçün anbarda kifayət qədər yer yoxdur.",
      rewards: resurslar,
      capacity
    };
  }

  if (!state.resources || typeof state.resources !== "object") state.resources = {};
  for (const item of resurslar) {
    state.resources[item.resourceId] = Math.max(0, Number(state.resources[item.resourceId]) || 0) + item.amount;
  }

  const claimedAtMs = tamEded(nowMs) || Date.now();
  report.resourceRewardClaimed = true;
  report.resourceRewardClaimPending = false;
  report.resourceRewardClaimedAtMs = claimedAtMs;
  report.resourceRewardLastError = "";
  report.resourceRewardsClaimed = resurslar.map(x => ({ ...x }));
  report.lootAlreadyApplied = true;

  return {
    success: true,
    alreadyClaimed: false,
    reportId: report.reportId,
    claimedAtMs,
    rewards: resurslar.map(x => ({ ...x })),
    resources: kopyala(state.resources),
    message: "Döyüş resurs mükafatı bazaya əlavə edildi."
  };
}

module.exports = {
  DESTEKLENEN_RESURSLAR,
  raportResurslariniAl,
  raportResursMukafatiPreview,
  raportResursMukafatiniAl
};
