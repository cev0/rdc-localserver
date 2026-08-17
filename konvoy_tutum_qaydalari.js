"use strict";

// Köhnə 5000 -> 7500 -> ... texnologiya modeli yalnız köhnə snapshot / client
// compatibility üçündür. Yeni gameplay tutum mənbəyi Əsgər Kampıdır (barrack).
const KONVOY_TUTUM_TEXNOLOGIYA_ID = "konvoy_qosun_tutumu";

const KONVOY_TUTUM_BALANSI = Object.freeze([
  Object.freeze({ level: 0, capacity: 5000 }),
  Object.freeze({ level: 1, capacity: 7500 }),
  Object.freeze({ level: 2, capacity: 10000 }),
  Object.freeze({ level: 3, capacity: 15000 }),
  Object.freeze({ level: 4, capacity: 20000 })
]);

// Last Shelter referansı + istifadəçinin canlı oyun ekranı ilə təsdiqlənmiş
// Əsgər Kampı Lv1-Lv25 ümumi yürüş/konvoy tutumu.
// Bütün dəyərlər 3 sıraya qalıqsız bölünür.
const KONVOY_BARRACK_TUTUM_CEDVELI = Object.freeze([
  1200,
  1350,
  1500,
  2100,
  3000,
  4500,
  6000,
  9000,
  10500,
  13500,
  16800,
  19800,
  22800,
  27000,
  31500,
  36000,
  40500,
  45000,
  51000,
  57000,
  63000,
  69000,
  73500,
  78000,
  82500
]);

// Unity-də artıq mövcud olan hərbi barrack tier-ləri.
// convoy_1 ilk kampı, convoy_2 ikinci kampı istifadə edir.
// barrack_3 gələcək üçün compatibility saxlanılır.
const KONVOY_BARRACK_IDLERI = Object.freeze([
  "barrack_1",
  "barrack_2",
  "barrack_3"
]);

const KONVOY_SIRA_SAYI = 3;
const LEGACY_FALLBACK_TUTUM = 5000;

function tutumLevelMelumatiniAl(level) {
  const temiz = Math.max(0, Math.min(4, Math.trunc(Number(level) || 0)));
  return KONVOY_TUTUM_BALANSI[temiz] || KONVOY_TUTUM_BALANSI[0];
}

function barrackTutumunuAl(level) {
  const temiz = Math.max(0, Math.trunc(Number(level) || 0));
  if (temiz <= 0) return 0;
  const index = Math.min(temiz, KONVOY_BARRACK_TUTUM_CEDVELI.length) - 1;
  return KONVOY_BARRACK_TUTUM_CEDVELI[index];
}

function barrackSiraTutumunuAl(level) {
  return Math.floor(barrackTutumunuAl(level) / KONVOY_SIRA_SAYI);
}

module.exports = {
  KONVOY_TUTUM_TEXNOLOGIYA_ID,
  KONVOY_TUTUM_BALANSI,
  KONVOY_BARRACK_TUTUM_CEDVELI,
  KONVOY_BARRACK_IDLERI,
  KONVOY_SIRA_SAYI,
  LEGACY_FALLBACK_TUTUM,
  tutumLevelMelumatiniAl,
  barrackTutumunuAl,
  barrackSiraTutumunuAl
};
