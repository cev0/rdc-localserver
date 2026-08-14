"use strict";

const LEVEL_BALANSI = Object.freeze({
  1: { scoutPower: 8000,  campPower: 12000, rewardMoney: 80,  rewardExp: 20 },
  2: { scoutPower: 14000, campPower: 22000, rewardMoney: 130, rewardExp: 35 },
  3: { scoutPower: 22000, campPower: 34000, rewardMoney: 200, rewardExp: 55 },
  4: { scoutPower: 31000, campPower: 48000, rewardMoney: 290, rewardExp: 80 },
  5: { scoutPower: 42000, campPower: 65000, rewardMoney: 400, rewardExp: 110 },
  6: { scoutPower: 56000, campPower: 85000, rewardMoney: 550, rewardExp: 150 },
  7: { scoutPower: 72000, campPower: 108000, rewardMoney: 720, rewardExp: 195 },
  8: { scoutPower: 90000, campPower: 135000, rewardMoney: 920, rewardExp: 250 },
  9: { scoutPower: 112000, campPower: 168000, rewardMoney: 1180, rewardExp: 320 },
  10:{ scoutPower: 138000, campPower: 205000, rewardMoney: 1500, rewardExp: 400 }
});

function levelMelumatiniAl(level, enemyType) {
  const lv = Math.min(10, Math.max(1, Math.trunc(Number(level) || 1)));
  const tip = enemyType === "small_enemy" ? "small_enemy" : "enemy_scout";
  const b = LEVEL_BALANSI[lv];
  return {
    level: lv,
    enemyType: tip,
    power: tip === "small_enemy" ? b.campPower : b.scoutPower,
    reward: {
      money: tip === "small_enemy" ? Math.round(b.rewardMoney * 1.5) : b.rewardMoney,
      heroExp: tip === "small_enemy" ? Math.round(b.rewardExp * 1.5) : b.rewardExp
    },
    respawnSeconds: tip === "small_enemy" ? 6 * 60 * 60 : 3 * 60 * 60
  };
}

function zoneLevelAraligi(zoneId) {
  if (zoneId === "middle") return { min: 5, max: 8 };
  if (zoneId === "inner_green") return { min: 8, max: 10 };
  if (zoneId === "president_center") return { min: 0, max: 0 };
  return { min: 1, max: 5 };
}

module.exports = { levelMelumatiniAl, zoneLevelAraligi };
