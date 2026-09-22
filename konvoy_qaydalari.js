"use strict";

// ============================================================
// KONVOY QAYDALARI
// ------------------------------------------------------------
// Progression:
// 1 Hero -> 2 Hero -> 2-ci Konvoy -> 3 Hero
//
// Balans ayrıca data kimi saxlanılır ki, sonradan server
// mexanikasına toxunmadan rəqəmləri dəyişmək mümkün olsun.
// ============================================================

const KONVOY_QAYDALARI = Object.freeze({
  baslangicKonvoySayi: 1,
  maksimumKonvoySayi: 2,
  baslangicQehremanYeri: 1,
  maksimumQehremanYeri: 3
});

const KONVOY_TEXNOLOGIYA_ACARLARI = Object.freeze({
  IKINCI_QEHRAMAN_YERI: "konvoy_qehreman_yeri_2",
  UCUNCU_QEHRAMAN_YERI: "konvoy_qehreman_yeri_3",
  IKINCI_KONVOY: "ikinci_konvoy"
});

module.exports = {
  KONVOY_QAYDALARI,
  KONVOY_TEXNOLOGIYA_ACARLARI
};
