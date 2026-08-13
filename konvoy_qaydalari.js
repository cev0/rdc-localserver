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

const KONVOY_TEXNOLOGIYA_BALANSI = Object.freeze({
  IKINCI_QEHRAMAN_YERI: Object.freeze({
    techId: KONVOY_TEXNOLOGIYA_ACARLARI.IKINCI_QEHRAMAN_YERI,
    displayName: "Konvoy Qəhrəman Yeri II",
    requiredHqLevel: 3,
    requiredInstituteLevel: 2,
    researchTimeSeconds: 10 * 60,
    requiredTechIds: Object.freeze([]),
    cost: Object.freeze([
      Object.freeze({ type: "wood", amount: 500 }),
      Object.freeze({ type: "iron", amount: 200 }),
      Object.freeze({ type: "money", amount: 400 })
    ])
  }),

  IKINCI_KONVOY: Object.freeze({
    techId: KONVOY_TEXNOLOGIYA_ACARLARI.IKINCI_KONVOY,
    displayName: "İkinci Konvoy",
    requiredHqLevel: 5,
    requiredInstituteLevel: 4,
    researchTimeSeconds: 30 * 60,
    requiredTechIds: Object.freeze([
      KONVOY_TEXNOLOGIYA_ACARLARI.IKINCI_QEHRAMAN_YERI
    ]),
    cost: Object.freeze([
      Object.freeze({ type: "wood", amount: 1500 }),
      Object.freeze({ type: "iron", amount: 700 }),
      Object.freeze({ type: "fuel", amount: 250 }),
      Object.freeze({ type: "money", amount: 1200 })
    ])
  }),

  UCUNCU_QEHRAMAN_YERI: Object.freeze({
    techId: KONVOY_TEXNOLOGIYA_ACARLARI.UCUNCU_QEHRAMAN_YERI,
    displayName: "Konvoy Qəhrəman Yeri III",
    requiredHqLevel: 6,
    requiredInstituteLevel: 6,
    researchTimeSeconds: 60 * 60,
    requiredTechIds: Object.freeze([
      KONVOY_TEXNOLOGIYA_ACARLARI.IKINCI_KONVOY
    ]),
    cost: Object.freeze([
      Object.freeze({ type: "wood", amount: 3000 }),
      Object.freeze({ type: "iron", amount: 1400 }),
      Object.freeze({ type: "fuel", amount: 600 }),
      Object.freeze({ type: "money", amount: 2500 })
    ])
  })
});

module.exports = {
  KONVOY_QAYDALARI,
  KONVOY_TEXNOLOGIYA_ACARLARI,
  KONVOY_TEXNOLOGIYA_BALANSI
};
