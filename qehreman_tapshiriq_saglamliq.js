"use strict";

const { qehremaniTap } = require("./qehreman_kataloqu");
const {
  inkisafKonfiqurasiyasiniAl,
  binaUyğundur
} = require("./qehreman_inkisaf_sistemi");

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().toLowerCase().slice(0, max) : "";
}

function sahibdir(state, heroId) {
  const id = metnAl(heroId);
  return Array.isArray(state && state.heroes) && state.heroes.some(x => metnAl(x && x.heroId) === id);
}

function tamamlanmisBinaTap(state, instanceId) {
  const id = metnAl(instanceId);
  return Array.isArray(state && state.buildings)
    ? state.buildings.find(x => x && metnAl(x.instanceId) === id && x.isCompleted === true) || null
    : null;
}

function konvoydadir(state, heroId) {
  const id = metnAl(heroId);
  return !!(state && state.konvoylar && Array.isArray(state.konvoylar.items) &&
    state.konvoylar.items.some(k => Array.isArray(k && k.qehremanIdleri) && k.qehremanIdleri.some(x => metnAl(x) === id)));
}

function legacyTapshiriqdadir(t, heroId) {
  const id = metnAl(heroId);
  if (t && t.technology && metnAl(t.technology.heroId) === id) return true;
  return !!(t && Array.isArray(t.resources) && t.resources.some(x => x && metnAl(x.heroId) === id));
}

function inkisafTapshiriqlariniBarisdir(state, tapshiriqlar) {
  const t = tapshiriqlar && typeof tapshiriqlar === "object" ? tapshiriqlar : {};
  const raw = Array.isArray(t.development) ? t.development : [];
  const temiz = [];
  const heroIds = new Set();
  const binaIds = new Set();
  const silinenler = [];

  for (const assignment of raw) {
    const heroId = metnAl(assignment && assignment.heroId);
    const buildingInstanceId = metnAl(assignment && assignment.buildingInstanceId);
    let sebeb = "";

    const definition = heroId ? qehremaniTap(heroId) : null;
    const inkisaf = heroId ? inkisafKonfiqurasiyasiniAl(heroId) : null;
    const bina = buildingInstanceId ? tamamlanmisBinaTap(state, buildingInstanceId) : null;

    if (!heroId || !buildingInstanceId) sebeb = "natamam_teyinat";
    else if (!definition || !inkisaf) sebeb = "inkisaf_konfiqurasiyasi_yoxdur";
    else if (!sahibdir(state, heroId)) sebeb = "qehreman_oyuncuya_mexsus_deyil";
    else if (legacyTapshiriqdadir(t, heroId) || konvoydadir(state, heroId)) sebeb = "qehreman_basqa_tapshiriqdadir";
    else if (!bina || !binaUyğundur(inkisaf, bina)) sebeb = "uygun_tamamlanmis_bina_yoxdur";
    else if (heroIds.has(heroId)) sebeb = "qehreman_tekrar_teyin_edilib";
    else if (binaIds.has(buildingInstanceId)) sebeb = "binaya_tekrar_teyinat_var";

    if (sebeb) {
      silinenler.push({ heroId, buildingInstanceId, sebeb });
      continue;
    }

    heroIds.add(heroId);
    binaIds.add(buildingInstanceId);
    temiz.push({
      heroId,
      buildingInstanceId,
      buildingId: metnAl(bina.buildingId),
      field: metnAl(inkisaf.field || inkisaf.sahesi, 64)
    });
  }

  t.development = temiz;
  return {
    deyisdi: temiz.length !== raw.length || temiz.some((x, i) => {
      const y = raw[i] || {};
      return metnAl(y.heroId) !== x.heroId ||
        metnAl(y.buildingInstanceId) !== x.buildingInstanceId ||
        metnAl(y.buildingId) !== x.buildingId ||
        metnAl(y.field, 64) !== x.field;
    }),
    development: temiz.map(x => ({ ...x })),
    silinenler
  };
}

module.exports = {
  inkisafTapshiriqlariniBarisdir
};
