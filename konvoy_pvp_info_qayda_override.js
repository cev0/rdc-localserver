"use strict";

const esas = require("./konvoy_emeliyyat_sistemi");
const {
  PVP_BAZA_STATUSLARI
} = require("./pvp_baza_hedef_qaydasi");

const esasEmeliyyatMelumatiniHazirla = esas.emeliyyatMelumatiniHazirla;

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function pvpKonvoyInfoQaydasiniTetbiqEt(info, nowMs = Date.now()) {
  if (!info || typeof info !== "object") {
    return info;
  }

  const now = tamEded(nowMs) || Date.now();

  for (const operation of Array.isArray(info.active) ? info.active : []) {
    if (!operation || typeof operation !== "object") continue;

    if (operation.status === PVP_BAZA_STATUSLARI.YOLDA) {
      operation.remainingMs = Math.max(
        0,
        tamEded(operation.arrivalAtMs) - now
      );
      continue;
    }

    if (
      operation.status === PVP_BAZA_STATUSLARI.DOYUSE_HAZIR ||
      operation.status === PVP_BAZA_STATUSLARI.TERK_EDILMIS_HEDEFDE_KAMP
    ) {
      operation.remainingMs = 0;
    }
  }

  return info;
}

function emeliyyatMelumatiniHazirla(state, nowMs = Date.now()) {
  const info = esasEmeliyyatMelumatiniHazirla(state, nowMs);
  return pvpKonvoyInfoQaydasiniTetbiqEt(info, nowMs);
}

if (typeof esasEmeliyyatMelumatiniHazirla !== "function") {
  throw new Error("Konvoy əməliyyat info funksiyası tapılmadı.");
}

// konvoy_emeliyyat_handler.js bu moduldan SONRA require olunmalıdır ki
// destructuring zamanı düzəldilmiş funksiyanı götürsün.
esas.emeliyyatMelumatiniHazirla = emeliyyatMelumatiniHazirla;

module.exports = {
  pvpKonvoyInfoQaydasiniTetbiqEt,
  emeliyyatMelumatiniHazirla
};
