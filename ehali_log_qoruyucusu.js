"use strict";

// [EHALI_YENILENDI] server tick-lərində eyni dəyərlərlə təkrar-təkrar
// yazılmasın. Oyunçu offline olsa belə server-authoritative timer-lər işləyə
// bilər; bu qoruyucu yalnız lazımsız log spamını kəsir, gameplay məntiqinə
// toxunmur.
const esasConsoleLog = console.log.bind(console);
const sonEhaliImzasi = new Map();

console.log = function(...args) {
  if (args[0] !== "[EHALI_YENILENDI]") {
    return esasConsoleLog(...args);
  }

  const melumat = args[1];
  if (!melumat || typeof melumat !== "object") {
    return esasConsoleLog(...args);
  }

  const playerId = String(melumat.playerId || "").trim();
  if (!playerId) {
    return esasConsoleLog(...args);
  }

  const cariEhali = Number(melumat.cariEhali) || 0;
  const maksimumEhali = Number(melumat.maksimumEhali) || 0;
  const populationCap = Number(melumat.populationCap) || 0;
  const imza = `${cariEhali}|${maksimumEhali}|${populationCap}`;

  if (sonEhaliImzasi.get(playerId) === imza) {
    return;
  }

  sonEhaliImzasi.set(playerId, imza);
  return esasConsoleLog(...args);
};
