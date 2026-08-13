"use strict";

const esas = require("./doyus_sistemi");
const { konvoyStateTeminEt } = require("./konvoy_sistemi");

function konvoyQehremanIdleriAl(state) {
  const konvoylar = konvoyStateTeminEt(state);
  const konvoy = konvoylar.items.find(x =>
    x && x.konvoyId === "konvoy_1" && x.aciqdir === true
  );

  return konvoy && Array.isArray(konvoy.qehremanIdleri)
    ? [...konvoy.qehremanIdleri]
    : [];
}

function melumat(state, nowMs = Date.now()) {
  const info = esas.doyusMelumatiniHazirla(state, nowMs);
  const tutorial = state && state.doyus && state.doyus.tutorial;
  const snapshot = tutorial && Array.isArray(tutorial.heroIds) && tutorial.heroIds.length > 0
    ? [...tutorial.heroIds]
    : konvoyQehremanIdleriAl(state);

  return {
    ...info,
    convoyId: "konvoy_1",
    heroIds: snapshot,
    heroId: snapshot[0] || "",
    canStart: info.canStart === true && konvoyQehremanIdleriAl(state).length > 0
  };
}

function basla(state, nowMs = Date.now()) {
  const heroIds = konvoyQehremanIdleriAl(state);

  if (heroIds.length === 0) {
    return {
      success: false,
      message: "Konvoy 1-ə ən azı bir Döyüş qəhrəmanı yerləşdirilməlidir.",
      info: melumat(state, nowMs)
    };
  }

  const netice = esas.tutorialDoyusunaBasla(state, nowMs);

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
