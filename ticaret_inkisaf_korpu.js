"use strict";

const {
  INKISAF_EFFEKT_NOVU,
  binaUcunInkIsafModifikatorlariniHesabla
} = require("./qehreman_inkisaf_sistemi");

function reqemAl(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function menfiOlmayanFaiz(v) {
  return Math.max(0, reqemAl(v));
}

function ticaretBinasininInkIsafModifikatorlariniHesabla(state, buildingInstanceId) {
  const hesab = binaUcunInkIsafModifikatorlariniHesabla(state, buildingInstanceId);
  const totals = hesab && hesab.totals && typeof hesab.totals === "object"
    ? hesab.totals
    : {};

  const cargoCapacityPercent = menfiOlmayanFaiz(
    totals[INKISAF_EFFEKT_NOVU.TICARET_YUK_FAIZ]
  );
  const tradePricePercent = menfiOlmayanFaiz(
    totals[INKISAF_EFFEKT_NOVU.TICARET_QIYMET_FAIZ]
  );

  const effects = Array.isArray(hesab && hesab.effects)
    ? hesab.effects.filter(effect =>
        effect && (
          effect.type === INKISAF_EFFEKT_NOVU.TICARET_YUK_FAIZ ||
          effect.type === INKISAF_EFFEKT_NOVU.TICARET_QIYMET_FAIZ
        )
      )
    : [];

  return {
    buildingInstanceId: hesab && hesab.buildingInstanceId
      ? hesab.buildingInstanceId
      : String(buildingInstanceId || "").trim().toLowerCase(),
    buildingId: hesab && hesab.buildingId ? hesab.buildingId : "",
    cargoCapacityPercent,
    tradePricePercent,
    effects
  };
}

function ticaretYukTutumunuHesabla(baseCapacity, cargoCapacityPercent) {
  const base = Math.max(0, Math.trunc(reqemAl(baseCapacity)));
  const pct = menfiOlmayanFaiz(cargoCapacityPercent);
  return Math.max(0, Math.floor(base * (100 + pct) / 100));
}

module.exports = {
  ticaretBinasininInkIsafModifikatorlariniHesabla,
  ticaretYukTutumunuHesabla
};
