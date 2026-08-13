"use strict";

const esas = require("./qehreman_recruit_qaydalari");
const { QEHRAMAN_NADIRLIK } = require("./qehreman_kataloqu");

function hero(heroId, weight) {
  return Object.freeze({
    rewardKind: esas.RECRUIT_REWARD_NOVU.QEHRAMAN,
    heroId,
    weight
  });
}

function exp(rewardId, weight) {
  return Object.freeze({
    rewardKind: esas.RECRUIT_REWARD_NOVU.QEHRAMAN_EXP,
    rewardId,
    weight
  });
}

const BANNERLER = Object.freeze({
  banner_normal: Object.freeze({
    bannerId: "banner_normal",
    displayName: "Göy Recruitment",
    rarity: QEHRAMAN_NADIRLIK.GOY,
    ticketType: esas.TICKET_NOVU.NORMAL,
    singleTicketCost: 1,
    multiDrawCount: 10,
    multiTicketCost: 10,
    dailyFreeDrawCount: 1,
    guaranteeMinRarityOnMultiDraw: false,
    guaranteedMinimumRarity: QEHRAMAN_NADIRLIK.GOY,
    pool: Object.freeze([
      hero("war_master", 80),
      exp("hero_exp_kicik", 30),
      exp("hero_exp_orta", 10)
    ])
  }),

  banner_advanced: Object.freeze({
    bannerId: "banner_advanced",
    displayName: "Bənövşəyi Recruitment",
    rarity: QEHRAMAN_NADIRLIK.BENOVSEYI,
    ticketType: esas.TICKET_NOVU.ADVANCED,
    singleTicketCost: 1,
    multiDrawCount: 10,
    multiTicketCost: 10,
    dailyFreeDrawCount: 1,
    guaranteeMinRarityOnMultiDraw: false,
    guaranteedMinimumRarity: QEHRAMAN_NADIRLIK.BENOVSEYI,
    pool: Object.freeze([
      hero("iron_maiden", 80),
      exp("hero_exp_kicik", 15),
      exp("hero_exp_orta", 15),
      exp("hero_exp_boyuk", 5)
    ])
  }),

  banner_super: Object.freeze({
    bannerId: "banner_super",
    displayName: "Narıncı Recruitment",
    rarity: QEHRAMAN_NADIRLIK.NARINCI,
    ticketType: esas.TICKET_NOVU.SUPER,
    singleTicketCost: 1,
    multiDrawCount: 10,
    multiTicketCost: 10,
    dailyFreeDrawCount: 1,
    guaranteeMinRarityOnMultiDraw: true,
    guaranteedMinimumRarity: QEHRAMAN_NADIRLIK.NARINCI,
    pool: Object.freeze([
      hero("feroman", 40),
      hero("qiz", 40),
      hero("qiz2", 40),
      exp("hero_exp_orta", 10),
      exp("hero_exp_boyuk", 10)
    ])
  })
});

function bannerIdNormallasdir(deyer) {
  return typeof deyer === "string" ? deyer.trim().toLowerCase() : "";
}

function recruitBanneriniTap(bannerId) {
  return BANNERLER[bannerIdNormallasdir(bannerId)] || null;
}

function butunRecruitBannerleriniAl() {
  return Object.values(BANNERLER).map(banner => ({
    bannerId: banner.bannerId,
    displayName: banner.displayName,
    rarity: banner.rarity,
    ticketType: banner.ticketType,
    singleTicketCost: banner.singleTicketCost,
    multiDrawCount: banner.multiDrawCount,
    multiTicketCost: banner.multiTicketCost,
    dailyFreeDrawCount: banner.dailyFreeDrawCount,
    guaranteeMinRarityOnMultiDraw: banner.guaranteeMinRarityOnMultiDraw,
    guaranteedMinimumRarity: banner.guaranteedMinimumRarity
  }));
}

// qehreman_recruit_sistemi.js bu modulu bundan sonra require etdikdə
// düzəldilmiş funksiyaları götürəcək.
esas.recruitBanneriniTap = recruitBanneriniTap;
esas.butunRecruitBannerleriniAl = butunRecruitBannerleriniAl;
esas.RECRUIT_BANNERLERI_V2 = BANNERLER;

module.exports = {
  BANNERLER,
  recruitBanneriniTap,
  butunRecruitBannerleriniAl
};
