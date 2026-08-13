"use strict";

// ============================================================
// KONVOY QAYDALARI
// ------------------------------------------------------------
// Başlanğıcda 1 konvoy və 1 qəhrəman yeri açıqdır.
// Texnologiya ilə 2-ci və 3-cü qəhrəman yeri, daha sonra 2-ci konvoy açılır.
// Buradakı texnologiya ID-ləri server üçün stabil texniki açarlardır.
// Research xərcləri və unlock şərtləri ayrıca balans datasında veriləcək.
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
