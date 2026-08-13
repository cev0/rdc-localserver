"use strict";

const crypto = require("crypto");

const {
  qehremaniTap
} = require("./qehreman_kataloqu");

const {
  RECRUIT_REWARD_NOVU,
  EXP_MUKAFATLARI,
  recruitBanneriniTap,
  butunRecruitBannerleriniAl
} = require("./qehreman_recruit_qaydalari");

function menfiOlmayanTamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say)
    ? Math.max(0, Math.trunc(say))
    : 0;
}

function utcGunAcari(nowMs = Date.now()) {
  const tarix = new Date(Number(nowMs) || Date.now());
  const il = tarix.getUTCFullYear();
  const ay = String(tarix.getUTCMonth() + 1).padStart(2, "0");
  const gun = String(tarix.getUTCDate()).padStart(2, "0");
  return `${il}${ay}${gun}`;
}

function qehremanRecruitStateTeminEt(state, nowMs = Date.now()) {
  if (!state || typeof state !== "object") {
    throw new Error("Qəhrəman recruit üçün oyunçu state-i yoxdur.");
  }

  if (!Array.isArray(state.heroes)) {
    state.heroes = [];
  }

  if (
    !state.heroRecruit ||
    typeof state.heroRecruit !== "object" ||
    Array.isArray(state.heroRecruit)
  ) {
    state.heroRecruit = {};
  }

  const recruit = state.heroRecruit;
  recruit.version = 1;

  if (!recruit.tickets || typeof recruit.tickets !== "object") {
    recruit.tickets = {};
  }

  recruit.tickets.normal = menfiOlmayanTamEded(recruit.tickets.normal);
  recruit.tickets.advanced = menfiOlmayanTamEded(recruit.tickets.advanced);
  recruit.tickets.super = menfiOlmayanTamEded(recruit.tickets.super);

  if (!recruit.expItems || typeof recruit.expItems !== "object") {
    recruit.expItems = {};
  }

  for (const rewardId of Object.keys(EXP_MUKAFATLARI)) {
    recruit.expItems[rewardId] = menfiOlmayanTamEded(
      recruit.expItems[rewardId]
    );
  }

  if (!recruit.dailyFree || typeof recruit.dailyFree !== "object") {
    recruit.dailyFree = {};
  }

  const gunAcari = utcGunAcari(nowMs);

  if (recruit.dailyFree.utcDateKey !== gunAcari) {
    recruit.dailyFree.utcDateKey = gunAcari;
    recruit.dailyFree.usedByBanner = {};
  }

  if (
    !recruit.dailyFree.usedByBanner ||
    typeof recruit.dailyFree.usedByBanner !== "object"
  ) {
    recruit.dailyFree.usedByBanner = {};
  }

  for (const banner of butunRecruitBannerleriniAl()) {
    recruit.dailyFree.usedByBanner[banner.bannerId] = menfiOlmayanTamEded(
      recruit.dailyFree.usedByBanner[banner.bannerId]
    );
  }

  if (!recruit.stats || typeof recruit.stats !== "object") {
    recruit.stats = {};
  }

  recruit.stats.totalDraws = menfiOlmayanTamEded(recruit.stats.totalDraws);
  recruit.stats.firstHeroGuaranteedUsed =
    recruit.stats.firstHeroGuaranteedUsed === true;

  for (const hero of state.heroes) {
    if (!hero || typeof hero !== "object") continue;

    hero.heroId = String(hero.heroId || "").trim().toLowerCase();
    hero.level = Math.max(1, menfiOlmayanTamEded(hero.level) || 1);
    hero.exp = menfiOlmayanTamEded(hero.exp);
    hero.duplicateCopies = menfiOlmayanTamEded(hero.duplicateCopies);
  }

  return recruit;
}

function pulsuzDrawQaligi(state, banner, nowMs = Date.now()) {
  const recruit = qehremanRecruitStateTeminEt(state, nowMs);
  const istifade = menfiOlmayanTamEded(
    recruit.dailyFree.usedByBanner[banner.bannerId]
  );

  return Math.max(
    0,
    menfiOlmayanTamEded(banner.dailyFreeDrawCount) - istifade
  );
}

function ticketSayiniAl(recruit, ticketType) {
  return menfiOlmayanTamEded(
    recruit.tickets && recruit.tickets[ticketType]
  );
}

function recruitMelumatiniHazirla(state, nowMs = Date.now()) {
  const recruit = qehremanRecruitStateTeminEt(state, nowMs);

  const banners = butunRecruitBannerleriniAl().map(banner => ({
    ...banner,
    freeDrawsRemaining: pulsuzDrawQaligi(state, banner, nowMs),
    ticketBalance: ticketSayiniAl(recruit, banner.ticketType)
  }));

  const expItems = Object.values(EXP_MUKAFATLARI).map(mukafat => ({
    rewardId: mukafat.rewardId,
    displayName: mukafat.displayName,
    expValuePerItem: mukafat.expValuePerItem,
    count: menfiOlmayanTamEded(recruit.expItems[mukafat.rewardId])
  }));

  return {
    utcDateKey: recruit.dailyFree.utcDateKey,
    tickets: {
      normal: recruit.tickets.normal,
      advanced: recruit.tickets.advanced,
      super: recruit.tickets.super
    },
    banners,
    heroes: state.heroes.map(hero => ({ ...hero })),
    expItems,
    totalDraws: recruit.stats.totalDraws
  };
}

function cekilişNamizedleriniAl(banner, yalnizQehreman = false, minimumRarity = null) {
  const netice = [];

  for (const entry of banner.pool || []) {
    if (!entry || menfiOlmayanTamEded(entry.weight) <= 0) continue;

    if (entry.rewardKind === RECRUIT_REWARD_NOVU.QEHRAMAN) {
      const qehreman = qehremaniTap(entry.heroId);
      if (!qehreman) continue;

      if (
        minimumRarity !== null &&
        qehreman.rarity < minimumRarity
      ) {
        continue;
      }

      netice.push(entry);
      continue;
    }

    if (yalnizQehreman || minimumRarity !== null) {
      continue;
    }

    if (
      entry.rewardKind === RECRUIT_REWARD_NOVU.QEHRAMAN_EXP &&
      EXP_MUKAFATLARI[entry.rewardId]
    ) {
      netice.push(entry);
    }
  }

  return netice;
}

function cekilişEt(namizedler) {
  let umumiCeki = 0;

  for (const entry of namizedler) {
    umumiCeki += menfiOlmayanTamEded(entry.weight);
  }

  if (umumiCeki <= 0) {
    throw new Error("Recruit pool boşdur.");
  }

  let secim = crypto.randomInt(umumiCeki);

  for (const entry of namizedler) {
    secim -= menfiOlmayanTamEded(entry.weight);
    if (secim < 0) return entry;
  }

  return namizedler[namizedler.length - 1];
}

function entryNeticesiniHazirla(entry) {
  if (entry.rewardKind === RECRUIT_REWARD_NOVU.QEHRAMAN) {
    const qehreman = qehremaniTap(entry.heroId);
    if (!qehreman) {
      throw new Error(`Recruit hero tapılmadı: ${entry.heroId}`);
    }

    return {
      rewardKind: RECRUIT_REWARD_NOVU.QEHRAMAN,
      rewardKindCode: 0,
      rewardId: qehreman.heroId,
      rewardDisplayName: qehreman.displayName,
      rewardCount: 1,
      heroId: qehreman.heroId,
      heroName: qehreman.displayName,
      rarity: qehreman.rarity,
      wasDuplicate: false,
      duplicateCopiesAfter: 0,
      expValuePerItem: 0
    };
  }

  const exp = EXP_MUKAFATLARI[entry.rewardId];
  if (!exp) {
    throw new Error(`Recruit EXP reward tapılmadı: ${entry.rewardId}`);
  }

  return {
    rewardKind: RECRUIT_REWARD_NOVU.QEHRAMAN_EXP,
    rewardKindCode: 1,
    rewardId: exp.rewardId,
    rewardDisplayName: exp.displayName,
    rewardCount: exp.count,
    heroId: "",
    heroName: "",
    rarity: 0,
    wasDuplicate: false,
    duplicateCopiesAfter: 0,
    expValuePerItem: exp.expValuePerItem
  };
}

function neticeleriStateEElaveEt(state, neticeler, nowMs = Date.now()) {
  const recruit = qehremanRecruitStateTeminEt(state, nowMs);

  for (const netice of neticeler) {
    if (netice.rewardKind === RECRUIT_REWARD_NOVU.QEHRAMAN) {
      const definition = qehremaniTap(netice.heroId);
      if (!definition) continue;

      const movcud = state.heroes.find(
        hero => hero && hero.heroId === definition.heroId
      );

      if (movcud) {
        movcud.duplicateCopies =
          menfiOlmayanTamEded(movcud.duplicateCopies) + 1;

        netice.wasDuplicate = true;
        netice.duplicateCopiesAfter = movcud.duplicateCopies;
      }
      else {
        state.heroes.push({
          heroId: definition.heroId,
          level: definition.startingLevel,
          exp: 0,
          duplicateCopies: 0,
          obtainedAtMs: Number(nowMs) || Date.now()
        });

        netice.wasDuplicate = false;
        netice.duplicateCopiesAfter = 0;
      }

      continue;
    }

    if (netice.rewardKind === RECRUIT_REWARD_NOVU.QEHRAMAN_EXP) {
      recruit.expItems[netice.rewardId] =
        menfiOlmayanTamEded(recruit.expItems[netice.rewardId]) +
        menfiOlmayanTamEded(netice.rewardCount);
    }
  }
}

function odenisiHazirla(state, banner, drawCount, nowMs = Date.now()) {
  const recruit = qehremanRecruitStateTeminEt(state, nowMs);

  if (drawCount === 1 && pulsuzDrawQaligi(state, banner, nowMs) > 0) {
    return {
      ok: true,
      usedFreeDraw: true,
      ticketCost: 0
    };
  }

  const cost = drawCount === 1
    ? banner.singleTicketCost
    : banner.multiTicketCost;

  const balans = ticketSayiniAl(recruit, banner.ticketType);

  if (balans < cost) {
    return {
      ok: false,
      usedFreeDraw: false,
      ticketCost: cost,
      message: `Kifayət qədər ${banner.ticketType} recruit bileti yoxdur.`
    };
  }

  return {
    ok: true,
    usedFreeDraw: false,
    ticketCost: cost
  };
}

function odenisiTetbiqEt(state, banner, odenis, nowMs = Date.now()) {
  const recruit = qehremanRecruitStateTeminEt(state, nowMs);

  if (odenis.usedFreeDraw) {
    recruit.dailyFree.usedByBanner[banner.bannerId] =
      menfiOlmayanTamEded(
        recruit.dailyFree.usedByBanner[banner.bannerId]
      ) + 1;
    return;
  }

  recruit.tickets[banner.ticketType] =
    Math.max(
      0,
      ticketSayiniAl(recruit, banner.ticketType) -
      menfiOlmayanTamEded(odenis.ticketCost)
    );
}

function recruitEt(state, bannerId, drawCount, nowMs = Date.now()) {
  const banner = recruitBanneriniTap(bannerId);

  if (!banner) {
    return {
      success: false,
      message: "Recruit banner tapılmadı.",
      entries: []
    };
  }

  const gozlenilenDrawCount = drawCount === 1
    ? 1
    : banner.multiDrawCount;

  if (drawCount !== gozlenilenDrawCount) {
    return {
      success: false,
      message: "Recruit draw sayı etibarsızdır.",
      entries: []
    };
  }

  const recruit = qehremanRecruitStateTeminEt(state, nowMs);
  const odenis = odenisiHazirla(state, banner, drawCount, nowMs);

  if (!odenis.ok) {
    return {
      success: false,
      message: odenis.message || "Recruit ödənişi mümkün deyil.",
      entries: []
    };
  }

  const neticeler = [];

  for (let i = 0; i < drawCount; i++) {
    const ilkQehremanZemaneti =
      recruit.stats.firstHeroGuaranteedUsed !== true &&
      recruit.stats.totalDraws === 0 &&
      i === 0;

    const namizedler = cekilişNamizedleriniAl(
      banner,
      ilkQehremanZemaneti,
      null
    );

    neticeler.push(
      entryNeticesiniHazirla(
        cekilişEt(namizedler)
      )
    );
  }

  if (
    drawCount > 1 &&
    banner.guaranteeMinRarityOnMultiDraw
  ) {
    const zemanetVar = neticeler.some(netice =>
      netice.rewardKind === RECRUIT_REWARD_NOVU.QEHRAMAN &&
      netice.rarity >= banner.guaranteedMinimumRarity
    );

    if (!zemanetVar) {
      const zemanetNamizedleri = cekilişNamizedleriniAl(
        banner,
        true,
        banner.guaranteedMinimumRarity
      );

      if (zemanetNamizedleri.length > 0) {
        neticeler[neticeler.length - 1] =
          entryNeticesiniHazirla(
            cekilişEt(zemanetNamizedleri)
          );
      }
    }
  }

  odenisiTetbiqEt(state, banner, odenis, nowMs);
  neticeleriStateEElaveEt(state, neticeler, nowMs);

  recruit.stats.totalDraws += drawCount;

  if (neticeler.some(x => x.rewardKind === RECRUIT_REWARD_NOVU.QEHRAMAN)) {
    recruit.stats.firstHeroGuaranteedUsed = true;
  }

  return {
    success: true,
    message: "Recruit uğurla tamamlandı.",
    bannerId: banner.bannerId,
    usedFreeDraw: odenis.usedFreeDraw,
    ticketCost: odenis.ticketCost,
    drawCount,
    entries: neticeler,
    recruitInfo: recruitMelumatiniHazirla(state, nowMs)
  };
}

module.exports = {
  utcGunAcari,
  qehremanRecruitStateTeminEt,
  recruitMelumatiniHazirla,
  recruitEt
};
