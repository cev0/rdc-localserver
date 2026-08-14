"use strict";

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function siyahiEnv(ad) {
  return String(process.env[ad] || "")
    .split(",")
    .map(x => metnAl(x, 128))
    .filter(Boolean);
}

function jsonEnv(ad, fallback) {
  const raw = String(process.env[ad] || "").trim();
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  }
  catch (_) {
    return fallback;
  }
}

const DEFAULT_TUTUM_CEDVELI = Object.freeze([
  1000, 1500, 2200, 3000, 4000,
  5200, 6500, 8000, 10000, 12500
]);

const DEFAULT_SAGALTMA_XERCI = Object.freeze({
  food: 2,
  money: 1
});

function xestexanaKonfiqi() {
  const binaIdleri = siyahiEnv("XESTEXANA_BINASI_IDLERI");
  const tutumCedveliRaw = jsonEnv("XESTEXANA_TUTUM_CEDVELI", DEFAULT_TUTUM_CEDVELI);
  const tutumCedveli = Array.isArray(tutumCedveliRaw)
    ? tutumCedveliRaw.map(tamEded).filter(x => x > 0)
    : [...DEFAULT_TUTUM_CEDVELI];

  const sagaltmaXerciRaw = jsonEnv("XESTEXANA_SAGALTMA_XERC_BIR_ESGER", DEFAULT_SAGALTMA_XERCI);
  const sagaltmaXerci = {};
  if (sagaltmaXerciRaw && typeof sagaltmaXerciRaw === "object" && !Array.isArray(sagaltmaXerciRaw)) {
    for (const [resursId, rawMiqdar] of Object.entries(sagaltmaXerciRaw)) {
      const id = metnAl(resursId, 64);
      const miqdar = tamEded(rawMiqdar);
      if (id && miqdar > 0) sagaltmaXerci[id] = miqdar;
    }
  }

  return {
    binaIdleri,
    tutumCedveli: tutumCedveli.length > 0 ? tutumCedveli : [...DEFAULT_TUTUM_CEDVELI],
    sagaltmaXerci: Object.keys(sagaltmaXerci).length > 0 ? sagaltmaXerci : { ...DEFAULT_SAGALTMA_XERCI },
    buildingConfigured: binaIdleri.length > 0,
    healingConfigured: true
  };
}

function xestexanaStateTeminEt(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Xəstəxana üçün oyunçu state-i yoxdur.");
  }

  if (!state.xestexana || typeof state.xestexana !== "object" || Array.isArray(state.xestexana)) {
    state.xestexana = {
      version: 2,
      yaralilar: {},
      sagaltmaTarixcesi: []
    };
  }

  state.xestexana.version = 2;
  if (!state.xestexana.yaralilar || typeof state.xestexana.yaralilar !== "object" || Array.isArray(state.xestexana.yaralilar)) {
    state.xestexana.yaralilar = {};
  }
  if (!Array.isArray(state.xestexana.sagaltmaTarixcesi)) {
    state.xestexana.sagaltmaTarixcesi = [];
  }

  for (const [rawUnitId, rawSay] of Object.entries(state.xestexana.yaralilar)) {
    const unitId = metnAl(rawUnitId, 128);
    const say = tamEded(rawSay);
    if (!unitId || say <= 0) {
      delete state.xestexana.yaralilar[rawUnitId];
      continue;
    }
    if (unitId !== rawUnitId) delete state.xestexana.yaralilar[rawUnitId];
    state.xestexana.yaralilar[unitId] = say;
  }

  return state.xestexana;
}

function tamamlanmisXestexanaTap(state, binaIdleri) {
  if (!Array.isArray(state && state.buildings) || !Array.isArray(binaIdleri) || binaIdleri.length === 0) {
    return { buildingId: "", instanceId: "", level: 0 };
  }

  let netice = { buildingId: "", instanceId: "", level: 0 };
  for (const bina of state.buildings) {
    if (!bina || bina.isCompleted !== true) continue;
    const buildingId = metnAl(bina.buildingId, 128);
    if (!binaIdleri.includes(buildingId)) continue;
    const level = Math.max(1, tamEded(bina.level) || 1);
    if (level > netice.level) {
      netice = {
        buildingId,
        instanceId: metnAl(bina.instanceId, 128),
        level
      };
    }
  }
  return netice;
}

function yaraliCeminiHesabla(yaralilar) {
  return Object.values(yaralilar || {}).reduce((cem, rawSay) => cem + tamEded(rawSay), 0);
}

function xestexanaTutumHesabiniAl(state) {
  const cfg = xestexanaKonfiqi();
  const xestexana = xestexanaStateTeminEt(state);
  const bina = tamamlanmisXestexanaTap(state, cfg.binaIdleri);

  let tutum = 0;
  if (bina.level > 0) {
    const index = Math.min(bina.level, cfg.tutumCedveli.length) - 1;
    tutum = tamEded(cfg.tutumCedveli[Math.max(0, index)]);
  }

  const yaraliSayi = yaraliCeminiHesabla(xestexana.yaralilar);
  return {
    formulaVersion: 2,
    buildingConfigured: cfg.buildingConfigured,
    healingConfigured: cfg.healingConfigured,
    pendingReason: !cfg.buildingConfigured
      ? "hospital_building_id_not_configured"
      : (bina.level <= 0 ? "completed_hospital_not_found" : ""),
    buildingId: bina.buildingId,
    buildingInstanceId: bina.instanceId,
    buildingLevel: bina.level,
    tutum,
    agirYaraliSayi: yaraliSayi,
    yaraliSayi,
    bosTutum: Math.max(0, tutum - yaraliSayi),
    noHospitalMeansZeroCapacity: true
  };
}

function itkiSiyahisiniTemizle(rawBirlikler) {
  if (!Array.isArray(rawBirlikler)) return [];
  return rawBirlikler
    .map(raw => ({
      siraId: metnAl(raw && raw.siraId, 32),
      unitId: metnAl(raw && raw.unitId, 128),
      count: tamEded(raw && raw.count)
    }))
    .filter(x => x.unitId && x.count > 0);
}

function itkileriXestexanayaBol(state, rawBirlikler) {
  const xestexana = xestexanaStateTeminEt(state);
  const tutumHesabiEvvel = xestexanaTutumHesabiniAl(state);
  let bosTutum = tutumHesabiEvvel.bosTutum;
  const items = [];
  let umumiYarali = 0;
  let umumiOlu = 0;

  for (const entry of itkiSiyahisiniTemizle(rawBirlikler)) {
    const yarali = Math.min(entry.count, bosTutum);
    const olu = Math.max(0, entry.count - yarali);

    if (yarali > 0) {
      xestexana.yaralilar[entry.unitId] = tamEded(xestexana.yaralilar[entry.unitId]) + yarali;
      bosTutum -= yarali;
      umumiYarali += yarali;
    }
    umumiOlu += olu;

    items.push({
      siraId: entry.siraId,
      unitId: entry.unitId,
      agirYaraliNamized: entry.count,
      yarali,
      xestexanayaQebul: yarali,
      tutumAsimiOlum: olu
    });
  }

  return {
    success: true,
    items,
    umumiYarali,
    umumiOlu,
    umumiTutumAsimiOlum: umumiOlu,
    tutumHesabiEvvel,
    tutumHesabi: xestexanaTutumHesabiniAl(state)
  };
}

function sagaltmaXerciniHesabla(rawBirlikler) {
  const cfg = xestexanaKonfiqi();
  const birlikler = itkiSiyahisiniTemizle(rawBirlikler);
  const umumiSay = birlikler.reduce((cem, x) => cem + x.count, 0);
  const xerc = {};
  for (const [resursId, birEsgerXerci] of Object.entries(cfg.sagaltmaXerci)) {
    xerc[resursId] = tamEded(birEsgerXerci) * umumiSay;
  }
  return { healingConfigured: true, birlikler, umumiSay, xerc };
}

function resursYetir(state, xerc) {
  const resources = state && state.resources && typeof state.resources === "object" ? state.resources : {};
  for (const [resursId, rawMiqdar] of Object.entries(xerc || {})) {
    if ((Number(resources[resursId]) || 0) < tamEded(rawMiqdar)) return false;
  }
  return true;
}

function sagaltmaPreviewHazirla(state, rawBirlikler) {
  const xestexana = xestexanaStateTeminEt(state);
  const hesab = sagaltmaXerciniHesabla(rawBirlikler);
  const birlikler = hesab.birlikler.map(entry => {
    const movcudYarali = tamEded(xestexana.yaralilar[entry.unitId]);
    return {
      unitId: entry.unitId,
      requested: entry.count,
      availableWounded: movcudYarali,
      healable: Math.min(entry.count, movcudYarali)
    };
  });

  const realSay = birlikler.reduce((cem, x) => cem + x.healable, 0);
  const cfg = xestexanaKonfiqi();
  const realXerc = {};
  for (const [resursId, birEsgerXerci] of Object.entries(cfg.sagaltmaXerci)) {
    realXerc[resursId] = tamEded(birEsgerXerci) * realSay;
  }

  return {
    success: true,
    healingConfigured: true,
    birlikler,
    umumiSay: realSay,
    xerc: realXerc,
    resursYetir: resursYetir(state, realXerc),
    tutumHesabi: xestexanaTutumHesabiniAl(state)
  };
}

function yaralilariSagalt(state, rawBirlikler, nowMs = Date.now()) {
  const preview = sagaltmaPreviewHazirla(state, rawBirlikler);
  if (preview.umumiSay <= 0) {
    return { success: false, message: "Sağaldılacaq ağır yaralı əsgər yoxdur.", preview };
  }
  if (!preview.resursYetir) {
    return { success: false, message: "Sağaltma üçün kifayət qədər resurs yoxdur.", preview };
  }

  if (!state.resources || typeof state.resources !== "object") state.resources = {};
  if (!state.army || typeof state.army !== "object") state.army = {};
  if (!state.army.troops || typeof state.army.troops !== "object") state.army.troops = {};
  const xestexana = xestexanaStateTeminEt(state);

  for (const [resursId, rawMiqdar] of Object.entries(preview.xerc)) {
    state.resources[resursId] = Math.max(0, (Number(state.resources[resursId]) || 0) - tamEded(rawMiqdar));
  }

  for (const entry of preview.birlikler) {
    const say = tamEded(entry.healable);
    if (say <= 0) continue;
    xestexana.yaralilar[entry.unitId] = Math.max(0, tamEded(xestexana.yaralilar[entry.unitId]) - say);
    if (xestexana.yaralilar[entry.unitId] <= 0) delete xestexana.yaralilar[entry.unitId];
    state.army.troops[entry.unitId] = tamEded(state.army.troops[entry.unitId]) + say;
  }

  const historyItem = {
    healedAtMs: tamEded(nowMs) || Date.now(),
    birlikler: preview.birlikler
      .map(x => ({ unitId: x.unitId, count: tamEded(x.healable) }))
      .filter(x => x.count > 0),
    xerc: kopyala(preview.xerc) || {}
  };
  xestexana.sagaltmaTarixcesi.push(historyItem);
  xestexana.sagaltmaTarixcesi = xestexana.sagaltmaTarixcesi.slice(-30);

  return {
    success: true,
    healedCount: preview.umumiSay,
    xerc: preview.xerc,
    birlikler: historyItem.birlikler,
    info: xestexanaMelumatiniHazirla(state)
  };
}

function xestexanaMelumatiniHazirla(state) {
  const xestexana = xestexanaStateTeminEt(state);
  const cfg = xestexanaKonfiqi();
  const yaralilar = Object.entries(xestexana.yaralilar)
    .map(([unitId, count]) => ({ unitId, count: tamEded(count) }))
    .filter(x => x.count > 0)
    .sort((a, b) => a.unitId.localeCompare(b.unitId));

  return {
    version: 2,
    tutumHesabi: xestexanaTutumHesabiniAl(state),
    yaralilar,
    agirYaralilar: yaralilar.map(x => ({ ...x })),
    umumiYarali: yaralilar.reduce((cem, x) => cem + x.count, 0),
    umumiAgirYarali: yaralilar.reduce((cem, x) => cem + x.count, 0),
    healingConfigured: true,
    sagaltmaXerciBirEsger: { ...cfg.sagaltmaXerci },
    defaultCapacityTable: [...cfg.tutumCedveli]
  };
}

module.exports = {
  DEFAULT_TUTUM_CEDVELI,
  DEFAULT_SAGALTMA_XERCI,
  xestexanaKonfiqi,
  xestexanaStateTeminEt,
  xestexanaTutumHesabiniAl,
  itkileriXestexanayaBol,
  sagaltmaPreviewHazirla,
  yaralilariSagalt,
  xestexanaMelumatiniHazirla
};
