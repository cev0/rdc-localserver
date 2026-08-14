"use strict";

const XERITE = Object.freeze({
  width: 1024,
  height: 1024,
  centerX: 512,
  centerZ: 512,
  innerRadius: 140,
  middleRadius: 280,
  outerRadius: 460
});

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function seededRng(seed) {
  let s = (Number(seed) || 1) >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function halqadanNoqteSec(rng, minRadius, maxRadius) {
  const angle = rng() * Math.PI * 2;
  const radius = minRadius + rng() * Math.max(0, maxRadius - minRadius);
  return {
    x: clamp(Math.round(XERITE.centerX + Math.cos(angle) * radius), 0, XERITE.width - 1),
    z: clamp(Math.round(XERITE.centerZ + Math.sin(angle) * radius), 0, XERITE.height - 1)
  };
}

function resursHalqasi(index) {
  if (index <= 10) {
    return { zoneId: "outer", min: XERITE.middleRadius + 20, max: XERITE.outerRadius - 10, presidentCenter: false };
  }
  if (index <= 15) {
    return { zoneId: "middle", min: XERITE.innerRadius + 20, max: XERITE.middleRadius - 10, presidentCenter: false };
  }
  if (index < 18) {
    return { zoneId: "inner_green", min: 70, max: XERITE.innerRadius - 15, presidentCenter: false };
  }
  return { zoneId: "inner_green", min: 25, max: Math.min(70, XERITE.innerRadius - 20), presidentCenter: true };
}

function resursMovqeyiAl(stateId, index) {
  const sid = Math.max(1, tamEded(stateId) || 1);
  const hedef = Math.max(1, Math.min(18, tamEded(index) || 1));
  const rng = seededRng(sid * 7919);
  let netice = null;

  for (let i = 1; i <= hedef; i++) {
    const ring = resursHalqasi(i);
    const point = halqadanNoqteSec(rng, ring.min, ring.max);

    // server.js Dövlət generatorunda Lv10 mərkəz resursu istisna olmaqla
    // hər resursun level seçimi də eyni RNG-dən bir dəyər istifadə edir.
    if (i < 18) rng();

    netice = {
      x: point.x,
      z: point.z,
      zoneId: ring.zoneId,
      presidentCenter: ring.presidentCenter === true
    };
  }

  return netice;
}

function dusmenHalqasi(index) {
  if (index <= 10) {
    return { zoneId: "outer", min: XERITE.middleRadius + 15, max: XERITE.outerRadius - 10 };
  }
  if (index <= 15) {
    return { zoneId: "middle", min: XERITE.innerRadius + 15, max: XERITE.middleRadius - 10 };
  }
  return { zoneId: "inner_green", min: 20, max: XERITE.innerRadius - 15 };
}

function dusmenMovqeyiAl(stateId, index) {
  const sid = Math.max(1, tamEded(stateId) || 1);
  const hedef = Math.max(1, Math.min(17, tamEded(index) || 1));

  // Yeni enemy_scout/small_enemy sistemi legacy infected generatorundan ayrıdır.
  // Ayrı seed istifadə olunur ki, obyekt koordinatları deploy/restart zamanı sabit qalsın.
  const rng = seededRng(sid * 130363);
  let netice = null;

  for (let i = 1; i <= hedef; i++) {
    const ring = dusmenHalqasi(i);
    const point = halqadanNoqteSec(rng, ring.min, ring.max);
    netice = {
      x: point.x,
      z: point.z,
      zoneId: ring.zoneId
    };
  }

  return netice;
}

module.exports = {
  XERITE,
  resursMovqeyiAl,
  dusmenMovqeyiAl
};
