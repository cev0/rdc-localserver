"use strict";

const esas = require("./doyus_sistemi");
const { konvoyStateTeminEt } = require("./konvoy_sistemi");
const {
  konvoyQosunStateTeminEt,
  konvoyTutumunuAl,
  qosunSayiniHesabla
} = require("./konvoy_qosun_sistemi");

function konvoyuTap(state) {
  const konvoylar = konvoyStateTeminEt(state);
  return konvoylar.items.find(x =>
    x && x.konvoyId === "konvoy_1" && x.aciqdir === true
  ) || null;
}

function konvoyQehremanIdleriAl(state) {
  const konvoy = konvoyuTap(state);
  return konvoy && Array.isArray(konvoy.qehremanIdleri)
    ? [...konvoy.qehremanIdleri]
    : [];
}

function konvoyQosunlariniAl(state) {
  konvoyQosunStateTeminEt(state);
  const konvoy = konvoyuTap(state);
  return konvoy && konvoy.qosunlar && typeof konvoy.qosunlar === "object"
    ? { ...konvoy.qosunlar }
    : {};
}

function melumat(state, nowMs = Date.now()) {
  const info = esas.doyusMelumatiniHazirla(state, nowMs);
  const tutorial = state && state.doyus && state.doyus.tutorial;
  const heroIds = tutorial && Array.isArray(tutorial.heroIds) && tutorial.heroIds.length > 0
    ? [...tutorial.heroIds]
    : konvoyQehremanIdleriAl(state);
  const convoyTroops = tutorial && tutorial.troopSnapshot
    ? { ...tutorial.troopSnapshot }
    : konvoyQosunlariniAl(state);
  const convoyTroopCount = qosunSayiniHesabla(convoyTroops);

  return {
    ...info,
    convoyId: "konvoy_1",
    heroIds,
    heroId: heroIds[0] || "",
    convoyTroops,
    convoyTroopCount,
    convoyCapacity: konvoyTutumunuAl(state),
    availableTroopCount: convoyTroopCount,
    canStart:
      info.canStart === true &&
      heroIds.length > 0 &&
      convoyTroopCount > 0
  };
}

function basla(state, nowMs = Date.now()) {
  const heroIds = konvoyQehremanIdleriAl(state);
  const convoyTroops = konvoyQosunlariniAl(state);
  const convoyTroopCount = qosunSayiniHesabla(convoyTroops);

  if (heroIds.length === 0) {
    return {
      success: false,
      message: "Konvoy 1-ə ən azı bir Döyüş qəhrəmanı yerləşdirilməlidir.",
      info: melumat(state, nowMs)
    };
  }

  if (convoyTroopCount <= 0) {
    return {
      success: false,
      message: "Konvoy 1-ə döyüş üçün qoşun yerləşdirilməlidir.",
      info: melumat(state, nowMs)
    };
  }

  if (!state.army || typeof state.army !== "object") {
    return {
      success: false,
      message: "Ordu state-i tapılmadı.",
      info: melumat(state, nowMs)
    };
  }

  const evvelkiQosunlar = state.army.troops;
  let netice;

  try {
    state.army.troops = { ...convoyTroops };
    netice = esas.tutorialDoyusunaBasla(state, nowMs);
  }
  finally {
    state.army.troops = evvelkiQosunlar;
  }

  if (netice && netice.success === true && state.doyus && state.doyus.tutorial) {
    state.doyus.tutorial.convoyId = "konvoy_1";
    state.doyus.tutorial.heroIds = [...heroIds];
    state.doyus.tutorial.heroId = heroIds[0];
    netice.info = melumat(state, nowMs);
  }

  return netice;
}

function neticelendir(state, nowMs = Date.now()) {
  const netice = esas.tutorialDoyusunuNeticelendir(state, nowMs);
  if (netice && netice.info) netice.info = melumat(state, nowMs);
  return netice;
}

module.exports = {
  doyusMelumatiniHazirla: melumat,
  tutorialDoyusunaBasla: basla,
  tutorialDoyusunuNeticelendir: neticelendir
};
