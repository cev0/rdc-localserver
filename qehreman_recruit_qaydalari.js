"use strict";

const {
  QEHRAMAN_NADIRLIK,
  qehremaniTap
} = require("./qehreman_kataloqu");

// ============================================================
// RECRUIT V1 QAYDALARI
// ------------------------------------------------------------
// Unity-dəki prototype banner asset-lərində bəzi Inspector dəyərləri
// test məqsədilə 22 free draw kimi qalıb. Server layihə qərarını saxlayır:
// - Normal: gündə 3 pulsuz single draw
// - Advanced: 0
// - Super: 0
// - Single: 1 ticket
// - X10: 10 ticket
// - Super X10: minimum Purple nəticə zəmanəti
// ============================================================

const RECRUIT_REWARD_NOVU = Object.freeze({
  QEHRAMAN: "hero",
  QEHRAMAN_EXP: "hero_exp_item"
});

const TICKET_NOVU = Object.freeze({
  NORMAL: "normal",
  ADVANCED: "advanced",
  SUPER: "super"
});

const EXP_MUKAFATLARI = Object.freeze({
  hero_exp_kicik: Object.freeze({
    rewardId: "hero_exp_kicik",
    displayName: "Kiçik Qəhrəman EXP",
    expValuePerItem: 100,
    count: 1
  }),
  hero_exp_orta: Object.freeze({
    rewardId: "hero_exp_orta",
    displayName: "Orta Qəhrəman EXP",
    expValuePerItem: 500,
    count: 1
  }),
  hero_exp_boyuk: Object.freeze({
    rewardId: "hero_exp_boyuk",
    displayName: "Böyük Qəhrəman EXP",
    expValuePerItem: 1000,
    count: 1
  })
});

function heroEntry(heroId, weight) {
  if (!qehremaniTap(heroId)) {
    throw new Error(`Recruit qaydasında naməlum heroId: ${heroId}`);
  }

  return Object.freeze({
    rewardKind: RECRUIT_REWARD_NOVU.QEHRAMAN,
    heroId,
    weight
  });
}

function expEntry(rewardId, weight) {
  if (!EXP_MUKAFATLARI[rewardId]) {
    throw new Error(`Recruit qaydasında naməlum EXP rewardId: ${rewardId}`);
  }

  return Object.freeze({
    rewardKind: RECRUIT_REWARD_NOVU.QEHRAMAN_EXP,
    rewardId,
    weight
  });
}

const ORTAQ_DORD_QEHRAMAN = [
  heroEntry("war_master", 30),
  heroEntry("iron_maiden", 30),
  heroEntry("feroman", 10),
  heroEntry("doyuscu", 10)
];

const RECRUIT_BANNERLERI = Object.freeze({
  banner_normal: Object.freeze({
    bannerId: "banner_normal",
    displayName: "Normal Recruitment",
    ticketType: TICKET_NOVU.NORMAL,
    singleTicketCost: 1,
    multiDrawCount: 10,
    multiTicketCost: 10,
    dailyFreeDrawCount: 3,
    guaranteeMinRarityOnMultiDraw: false,
    guaranteedMinimumRarity: QEHRAMAN_NADIRLIK.YASIL,
    pool: Object.freeze([
      ...ORTAQ_DORD_QEHRAMAN,
      expEntry("hero_exp_kicik", 30),
      expEntry("hero_exp_orta", 10)
    ])
  }),

  banner_advanced: Object.freeze({
    bannerId: "banner_advanced",
    displayName: "Advanced Recruitment",
    ticketType: TICKET_NOVU.ADVANCED,
    singleTicketCost: 1,
    multiDrawCount: 10,
    multiTicketCost: 10,
    dailyFreeDrawCount: 0,
    guaranteeMinRarityOnMultiDraw: false,
    guaranteedMinimumRarity: QEHRAMAN_NADIRLIK.YASIL,
    pool: Object.freeze([
      ...ORTAQ_DORD_QEHRAMAN,
      expEntry("hero_exp_kicik", 15),
      expEntry("hero_exp_orta", 15),
      expEntry("hero_exp_boyuk", 5)
    ])
  }),

  banner_super: Object.freeze({
    bannerId: "banner_super",
    displayName: "Super Recruitment",
    ticketType: TICKET_NOVU.SUPER,
    singleTicketCost: 1,
    multiDrawCount: 10,
    multiTicketCost: 10,
    dailyFreeDrawCount: 0,
    guaranteeMinRarityOnMultiDraw: true,
    guaranteedMinimumRarity: QEHRAMAN_NADIRLIK.BENOVSEYI,
    pool: Object.freeze([
      ...ORTAQ_DORD_QEHRAMAN,
      heroEntry("qiz", 20),
      heroEntry("qiz2", 20),
      expEntry("hero_exp_orta", 10),
      expEntry("hero_exp_boyuk", 10)
    ])
  })
});

function bannerIdNormallasdir(deyer) {
  return typeof deyer === "string"
    ? deyer.trim().toLowerCase()
    : "";
}

function recruitBanneriniTap(bannerId) {
  return RECRUIT_BANNERLERI[bannerIdNormallasdir(bannerId)] || null;
}

function butunRecruitBannerleriniAl() {
  return Object.values(RECRUIT_BANNERLERI).map(banner => ({
    bannerId: banner.bannerId,
    displayName: banner.displayName,
    ticketType: banner.ticketType,
    singleTicketCost: banner.singleTicketCost,
    multiDrawCount: banner.multiDrawCount,
    multiTicketCost: banner.multiTicketCost,
    dailyFreeDrawCount: banner.dailyFreeDrawCount,
    guaranteeMinRarityOnMultiDraw: banner.guaranteeMinRarityOnMultiDraw,
    guaranteedMinimumRarity: banner.guaranteedMinimumRarity
  }));
}

module.exports = {
  RECRUIT_REWARD_NOVU,
  TICKET_NOVU,
  EXP_MUKAFATLARI,
  RECRUIT_BANNERLERI,
  bannerIdNormallasdir,
  recruitBanneriniTap,
  butunRecruitBannerleriniAl
};
