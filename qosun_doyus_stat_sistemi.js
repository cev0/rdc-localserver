"use strict";

const {
  qosunMelumatiniAl
} = require("./qosun_kataloqu");

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : "";
}

function musbetTamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say)
    ? Math.max(0, Math.trunc(say))
    : 0;
}

function musbetEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say)
    ? Math.max(0, say)
    : 0;
}

function yuvarlaqla(deyer, reqem = 4) {
  const say = musbetEded(deyer);
  const faktor = Math.pow(10, reqem);
  return Math.round((say + Number.EPSILON) * faktor) / faktor;
}

function legacyQosunIdSiniCanonicalEt(rawUnitId) {
  const id = metnAl(rawUnitId, 128);
  if (!id) return "";

  if (qosunMelumatiniAl(id)) {
    return id;
  }

  const match = id.match(/^(fighter|warrior|shooter|vehicle)_lv(\d+)$/);
  if (!match) return "";

  const tier = Math.max(1, Math.min(10, musbetTamEded(match[2]) || 1));
  const classId = match[1] === "fighter" ? "warrior" : match[1];
  const canonicalId = `${classId}_t${tier}`;

  return qosunMelumatiniAl(canonicalId)
    ? canonicalId
    : "";
}

function qosunDoyusMelumatiniAl(rawUnitId) {
  const canonicalUnitId = legacyQosunIdSiniCanonicalEt(rawUnitId);
  if (!canonicalUnitId) return null;

  const unit = qosunMelumatiniAl(canonicalUnitId);
  if (!unit) return null;

  return {
    unitId: unit.unitId,
    classId: unit.classId,
    tier: unit.tier,
    displayNameAz: unit.displayNameAz,
    attackSpeed: musbetEded(unit.stats && unit.stats.attackSpeed),
    defense: musbetEded(unit.stats && unit.stats.defense),
    hp: musbetEded(unit.stats && unit.stats.hp),
    battlePower: musbetEded(unit.stats && unit.stats.battlePower),
    marchSpeed: musbetEded(unit.stats && unit.stats.marchSpeed),
    loadCapacity: musbetEded(unit.stats && unit.stats.loadCapacity)
  };
}

function birQosununGucunuAl(unitId) {
  const unit = qosunDoyusMelumatiniAl(unitId);
  return unit ? unit.battlePower : 0;
}

function qosunSnapshotiniCanonicalEt(snapshot) {
  const canonical = {};
  const namelumUnitIdleri = [];

  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { troops: canonical, unknownUnitIds: namelumUnitIdleri };
  }

  for (const [rawUnitId, rawCount] of Object.entries(snapshot)) {
    const count = musbetTamEded(rawCount);
    if (count <= 0) continue;

    const canonicalUnitId = legacyQosunIdSiniCanonicalEt(rawUnitId);
    if (!canonicalUnitId) {
      const id = metnAl(rawUnitId, 128);
      if (id && !namelumUnitIdleri.includes(id)) namelumUnitIdleri.push(id);
      continue;
    }

    canonical[canonicalUnitId] =
      (canonical[canonicalUnitId] || 0) + count;
  }

  return {
    troops: canonical,
    unknownUnitIds: namelumUnitIdleri.sort()
  };
}

function qosunDoyusStatlariniHesabla(snapshot) {
  const canonical = qosunSnapshotiniCanonicalEt(snapshot);
  const perUnit = [];
  const classes = {};
  let totalTroops = 0;
  let totalAttack = 0;
  let totalDefense = 0;
  let totalHp = 0;
  let totalBattlePower = 0;

  for (const [unitId, count] of Object.entries(canonical.troops)) {
    const unit = qosunDoyusMelumatiniAl(unitId);
    if (!unit || count <= 0) continue;

    const row = {
      unitId,
      classId: unit.classId,
      tier: unit.tier,
      displayNameAz: unit.displayNameAz,
      count,
      attack: yuvarlaqla(unit.attackSpeed * count),
      defense: yuvarlaqla(unit.defense * count),
      hp: yuvarlaqla(unit.hp * count),
      battlePower: yuvarlaqla(unit.battlePower * count)
    };

    perUnit.push(row);
    totalTroops += count;
    totalAttack += row.attack;
    totalDefense += row.defense;
    totalHp += row.hp;
    totalBattlePower += row.battlePower;

    if (!classes[unit.classId]) {
      classes[unit.classId] = {
        classId: unit.classId,
        troopCount: 0,
        attack: 0,
        defense: 0,
        hp: 0,
        battlePower: 0
      };
    }

    const sinif = classes[unit.classId];
    sinif.troopCount += count;
    sinif.attack = yuvarlaqla(sinif.attack + row.attack);
    sinif.defense = yuvarlaqla(sinif.defense + row.defense);
    sinif.hp = yuvarlaqla(sinif.hp + row.hp);
    sinif.battlePower = yuvarlaqla(sinif.battlePower + row.battlePower);
  }

  perUnit.sort((a, b) => a.unitId.localeCompare(b.unitId));

  return {
    totalTroops,
    totalAttack: yuvarlaqla(totalAttack),
    totalDefense: yuvarlaqla(totalDefense),
    totalHp: yuvarlaqla(totalHp),
    totalBattlePower: yuvarlaqla(totalBattlePower),
    classes,
    perUnit,
    canonicalTroops: { ...canonical.troops },
    unknownUnitIds: [...canonical.unknownUnitIds]
  };
}

function qosunGucunuHesabla(snapshot) {
  return qosunDoyusStatlariniHesabla(snapshot).totalBattlePower;
}

module.exports = {
  legacyQosunIdSiniCanonicalEt,
  qosunDoyusMelumatiniAl,
  birQosununGucunuAl,
  qosunSnapshotiniCanonicalEt,
  qosunDoyusStatlariniHesabla,
  qosunGucunuHesabla
};
