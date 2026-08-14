"use strict";

// Bu fayl production runtime-a qoşulmur.
// Sadəcə modulun yüklənə bildiyini və əsas public API-nin mövcud olduğunu
// lokal/CI smoke testdə yoxlamaq üçündür.

const modul = require("./pvp_doyus_snapshot_sistemi");

const gozlenilenFunksiyalar = [
  "aktivKonvoyIdSetiniAl",
  "aktivKonvoyQosunlariniAl",
  "mudafieQosunlariniHazirla",
  "mudafieQehremanIdleriniHazirla",
  "pvpDoyusSnapshotQaydasiniHazirla",
  "pvpHucumcuSnapshotiniHazirla",
  "pvpMudafieciSnapshotiniHazirla"
];

for (const ad of gozlenilenFunksiyalar) {
  if (typeof modul[ad] !== "function") {
    throw new Error(`PvP snapshot API funksiyası tapılmadı: ${ad}`);
  }
}

console.log("[PVP_DOYUS_SNAPSHOT_SMOKE] OK");
