"use strict";

const { qosunDoyusMelumatiniAl } = require("./qosun_doyus_stat_sistemi");

const SIRA_SIRASI = Object.freeze(["sira_1", "sira_2", "sira_3"]);

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function musbetEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function yuvarlaqla(v, reqem = 4) {
  const faktor = Math.pow(10, reqem);
  return Math.round((musbetEded(v) + Number.EPSILON) * faktor) / faktor;
}

function formasiyaSiralariniHazirla(rawFormation) {
  const byId = new Map();

  for (const raw of Array.isArray(rawFormation) ? rawFormation : []) {
    const siraId = metnAl(raw && raw.siraId, 32);
    const unitId = metnAl(raw && raw.unitId, 128);
    const count = tamEded(raw && raw.count);
    if (!SIRA_SIRASI.includes(siraId) || !unitId || count <= 0 || byId.has(siraId)) continue;

    const unit = qosunDoyusMelumatiniAl(unitId);
    if (!unit) continue;

    byId.set(siraId, {
      siraId,
      unitId: unit.unitId,
      classId: unit.classId,
      tier: unit.tier,
      displayNameAz: unit.displayNameAz,
      count,
      attack: yuvarlaqla(unit.attackSpeed * count),
      defense: yuvarlaqla(unit.defense * count),
      hp: yuvarlaqla(unit.hp * count),
      battlePower: yuvarlaqla(unit.battlePower * count)
    });
  }

  return SIRA_SIRASI.map(siraId => byId.get(siraId)).filter(Boolean);
}

function merheleliDoyusuHesabla(rawFormation, enemyPower, aggregatePlayerPower = 0) {
  const rows = formasiyaSiralariniHazirla(rawFormation);
  const enemy = musbetEded(enemyPower);
  const rowTotalPower = yuvarlaqla(rows.reduce((cem, x) => cem + x.battlePower, 0));
  const aggregate = musbetEded(aggregatePlayerPower);
  const playerPower = rowTotalPower > 0 ? rowTotalPower : aggregate;
  const victory = playerPower >= enemy;

  if (rows.length === 0) {
    return {
      version: 1,
      resolverId: "staged_front_to_back_power_v1",
      mode: "aggregate_fallback",
      balanceRule: "victory_threshold_unchanged",
      victory,
      playerPower: yuvarlaqla(playerPower),
      enemyPower: yuvarlaqla(enemy),
      enemyPowerRemaining: yuvarlaqla(Math.max(0, enemy - playerPower)),
      decisiveRowId: "",
      frontlineSequence: [],
      engagements: []
    };
  }

  let remaining = enemy;
  let cumulative = 0;
  let decisiveRowId = "";
  const engagements = [];

  for (const row of rows) {
    if (remaining <= 0) break;

    const before = remaining;
    const applied = Math.min(before, row.battlePower);
    remaining = Math.max(0, before - row.battlePower);
    cumulative += row.battlePower;

    const engagement = {
      sequence: engagements.length + 1,
      siraId: row.siraId,
      unitId: row.unitId,
      classId: row.classId,
      tier: row.tier,
      count: row.count,
      rowAttack: row.attack,
      rowDefense: row.defense,
      rowHp: row.hp,
      rowBattlePower: row.battlePower,
      enemyPowerBefore: yuvarlaqla(before),
      effectivePowerApplied: yuvarlaqla(applied),
      enemyPowerAfter: yuvarlaqla(remaining),
      cumulativePlayerPower: yuvarlaqla(cumulative),
      becameDecisive: before > 0 && remaining <= 0
    };

    if (engagement.becameDecisive) decisiveRowId = row.siraId;
    engagements.push(engagement);
  }

  return {
    version: 1,
    resolverId: "staged_front_to_back_power_v1",
    mode: "three_row_staged",
    balanceRule: "victory_threshold_unchanged",
    victory,
    playerPower: yuvarlaqla(playerPower),
    enemyPower: yuvarlaqla(enemy),
    enemyPowerRemaining: yuvarlaqla(remaining),
    decisiveRowId,
    frontlineSequence: engagements.map(x => x.siraId),
    engagements
  };
}

module.exports = {
  SIRA_SIRASI,
  formasiyaSiralariniHazirla,
  merheleliDoyusuHesabla
};
