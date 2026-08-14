"use strict";

const crypto = require("crypto");
const { dusmenMovqeyiAl } = require("./xerite_movqe_sistemi");

const SIRA_IDLERI = Object.freeze(["sira_1", "sira_2", "sira_3"]);

function metnAl(v, max = 200) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function bosSira(siraId) {
  return { siraId, unitId: "", count: 0 };
}

function siralariTemizle(rawSiralar) {
  const map = new Map();

  for (const raw of Array.isArray(rawSiralar) ? rawSiralar : []) {
    const siraId = metnAl(raw && raw.siraId, 32);
    if (!SIRA_IDLERI.includes(siraId) || map.has(siraId)) continue;

    const unitId = metnAl(raw && raw.unitId, 128);
    const count = tamEded(raw && raw.count);
    map.set(
      siraId,
      unitId && count > 0
        ? { siraId, unitId, count }
        : bosSira(siraId)
    );
  }

  return SIRA_IDLERI.map(id => map.get(id) || bosSira(id));
}

function sifirItkiSiralariniHazirla(sentRows) {
  return siralariTemizle(sentRows).map(x => ({
    siraId: x.siraId,
    unitId: x.unitId,
    count: 0
  }));
}

function raportStateTeminEt(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Döyüş raportu üçün oyunçu state-i yoxdur.");
  }

  if (!state.doyusRaportlari || typeof state.doyusRaportlari !== "object" || Array.isArray(state.doyusRaportlari)) {
    state.doyusRaportlari = { version: 2, items: [] };
  }

  state.doyusRaportlari.version = 2;
  if (!Array.isArray(state.doyusRaportlari.items)) state.doyusRaportlari.items = [];
  return state.doyusRaportlari;
}

function raportIdYarat(nowMs) {
  return `battle_${tamEded(nowMs) || Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function enemyIndexiniAl(enemyId) {
  const match = metnAl(enemyId, 128).match(/^state_(\d+)_enemy_(\d+)$/);
  return match ? Math.max(0, tamEded(match[2])) : 0;
}

function raportYarat(state, melumat, nowMs = Date.now()) {
  const raportlar = raportStateTeminEt(state);
  const battleId = metnAl(melumat && melumat.battleId, 220);

  if (battleId) {
    const movcud = raportlar.items.find(x => x && metnAl(x.battleId, 220) === battleId);
    if (movcud) return movcud;
  }

  const stateId = Math.max(1, tamEded(melumat && melumat.stateId) || 1);
  const enemyId = metnAl(melumat && melumat.enemyId, 128);
  const enemyIndex = enemyIndexiniAl(enemyId);
  const movqe = enemyIndex > 0 ? dusmenMovqeyiAl(stateId, enemyIndex) : null;
  const sentTroops = kopyala(melumat && melumat.sentTroops) || {};
  const sentRows = siralariTemizle(melumat && melumat.sentRows);
  const lostRows = sifirItkiSiralariniHazirla(sentRows);
  const returnedRows = kopyala(sentRows) || [];
  const reward = kopyala(melumat && melumat.reward) || {};
  const heroExp = tamEded(reward.heroExp);
  const victory = melumat && melumat.victory === true;

  const raport = {
    reportId: raportIdYarat(nowMs),
    battleId: battleId || "",
    category: "battle",
    stateId,
    x: movqe ? tamEded(movqe.x) : 0,
    z: movqe ? tamEded(movqe.z) : 0,
    enemyId,
    enemyType: metnAl(melumat && melumat.enemyType, 64),
    enemyLevel: tamEded(melumat && melumat.enemyLevel),
    result: victory ? "win" : "loss",
    victory,
    invalidated: melumat && melumat.invalidated === true,
    playerPower: tamEded(melumat && melumat.playerPower),
    enemyPower: tamEded(melumat && melumat.enemyPower),
    heroIds: Array.isArray(melumat && melumat.heroIds)
      ? melumat.heroIds.map(x => metnAl(x, 128)).filter(Boolean)
      : [],
    sentRows,
    lostRows,
    returnedRows,
    sentTroops,
    lostTroops: {},
    returnedTroops: kopyala(sentTroops) || {},
    lossCalculationPending: true,
    reward,
    heroExp,
    heroExpDistributionPending: heroExp > 0,
    lootAlreadyApplied: melumat && melumat.lootAlreadyApplied === true,
    createdAtMs: tamEded(melumat && melumat.completedAtMs) || tamEded(nowMs) || Date.now(),
    isRead: false,
    isSaved: false,
    readAtMs: 0,
    savedAtMs: 0
  };

  raportlar.items.push(raport);

  if (raportlar.items.length > 100) {
    const saved = raportlar.items.filter(x => x && x.isSaved === true);
    const adi = raportlar.items
      .filter(x => x && x.isSaved !== true)
      .sort((a, b) => tamEded(b.createdAtMs) - tamEded(a.createdAtMs))
      .slice(0, Math.max(0, 100 - saved.length));
    raportlar.items = [...saved, ...adi]
      .sort((a, b) => tamEded(a.createdAtMs) - tamEded(b.createdAtMs));
  }

  return raport;
}

function raportuTap(state, reportId) {
  const id = metnAl(reportId, 220);
  const raportlar = raportStateTeminEt(state);
  return raportlar.items.find(x => x && metnAl(x.reportId, 220) === id) || null;
}

function raportSiyahisiniHazirla(state) {
  return raportStateTeminEt(state).items
    .slice()
    .sort((a, b) => tamEded(b.createdAtMs) - tamEded(a.createdAtMs))
    .map(x => ({
      reportId: x.reportId,
      category: x.category,
      stateId: x.stateId,
      x: x.x,
      z: x.z,
      enemyId: x.enemyId,
      enemyType: x.enemyType,
      enemyLevel: x.enemyLevel,
      result: x.result,
      victory: x.victory === true,
      createdAtMs: x.createdAtMs,
      isRead: x.isRead === true,
      isSaved: x.isSaved === true,
      heroExp: tamEded(x.heroExp),
      reward: kopyala(x.reward) || {}
    }));
}

function raportDetaliHazirla(state, reportId) {
  const raport = raportuTap(state, reportId);
  return raport ? kopyala(raport) : null;
}

function raportuOxunmusEt(state, reportId, nowMs = Date.now()) {
  const raport = raportuTap(state, reportId);
  if (!raport) return { success: false, message: "Döyüş raportu tapılmadı." };
  raport.isRead = true;
  if (!tamEded(raport.readAtMs)) raport.readAtMs = tamEded(nowMs) || Date.now();
  return { success: true, report: kopyala(raport) };
}

function raportuSaxla(state, reportId, saxla, nowMs = Date.now()) {
  const raport = raportuTap(state, reportId);
  if (!raport) return { success: false, message: "Döyüş raportu tapılmadı." };
  raport.isSaved = saxla === true;
  raport.savedAtMs = raport.isSaved ? (tamEded(nowMs) || Date.now()) : 0;
  return { success: true, report: kopyala(raport) };
}

function raportuSil(state, reportId) {
  const id = metnAl(reportId, 220);
  const raportlar = raportStateTeminEt(state);
  const index = raportlar.items.findIndex(x => x && metnAl(x.reportId, 220) === id);
  if (index < 0) return { success: false, message: "Döyüş raportu tapılmadı." };
  const [silinen] = raportlar.items.splice(index, 1);
  return { success: true, reportId: id, deleted: kopyala(silinen) };
}

module.exports = {
  raportStateTeminEt,
  raportYarat,
  raportuTap,
  raportSiyahisiniHazirla,
  raportDetaliHazirla,
  raportuOxunmusEt,
  raportuSaxla,
  raportuSil
};
