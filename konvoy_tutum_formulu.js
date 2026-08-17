"use strict";

const {
  KONVOY_BARRACK_TUTUM_CEDVELI,
  KONVOY_BARRACK_IDLERI,
  KONVOY_SIRA_SAYI,
  LEGACY_FALLBACK_TUTUM,
  barrackTutumunuAl
} = require("./konvoy_tutum_qaydalari");

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function siyahiEnv(ad) {
  return String(process.env[ad] || "")
    .split(",")
    .map(x => metnAl(x, 128))
    .filter(Boolean);
}

function cedvelEnv(ad) {
  const raw = String(process.env[ad] || "").trim();
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(tamEded).filter(x => x > 0) : [];
  }
  catch (_) {
    return [];
  }
}

function legacyTutumLeveliniAl() {
  return 0;
}

function legacyTutumuAl() {
  return LEGACY_FALLBACK_TUTUM;
}

function konvoyIndexiniAl(konvoyId) {
  const match = /^konvoy_(\d+)$/.exec(metnAl(konvoyId, 64));
  return match ? Math.max(1, tamEded(match[1])) : 1;
}

function binaKonfiqiniAl() {
  const envIdler = siyahiEnv("KONVOY_BINASI_IDLERI");
  const envCedvel = cedvelEnv("KONVOY_BINASI_TUTUM_CEDVELI");

  return {
    binaIdleri: envIdler.length > 0 ? envIdler : [...KONVOY_BARRACK_IDLERI],
    tutumCedveli:
      envCedvel.length > 0
        ? envCedvel
        : [...KONVOY_BARRACK_TUTUM_CEDVELI],
    source:
      envIdler.length > 0 || envCedvel.length > 0
        ? "env_override"
        : "verified_barracks_default"
  };
}

function cedveldenSeviyeDeyeriniAl(cedvel, level) {
  const seviye = Math.max(0, tamEded(level));
  if (seviye <= 0 || !Array.isArray(cedvel) || cedvel.length === 0) return 0;
  const index = Math.min(seviye, cedvel.length) - 1;
  return tamEded(cedvel[index]);
}

function completedBarracklariAl(state, binaIdleri) {
  const buildings = Array.isArray(state && state.buildings) ? state.buildings : [];
  const idSirasi = new Map(binaIdleri.map((id, index) => [metnAl(id), index]));

  return buildings
    .filter(bina => {
      if (!bina || bina.isCompleted !== true) return false;
      return idSirasi.has(metnAl(bina.buildingId, 128));
    })
    .map((bina, originalIndex) => ({
      bina,
      buildingId: metnAl(bina.buildingId, 128),
      level: Math.max(1, tamEded(bina.level) || 1),
      instanceId: metnAl(bina.instanceId, 128),
      idOrder: idSirasi.get(metnAl(bina.buildingId, 128)),
      originalIndex
    }))
    .sort((a, b) => {
      if (a.idOrder !== b.idOrder) return a.idOrder - b.idOrder;
      if (a.instanceId !== b.instanceId) return a.instanceId.localeCompare(b.instanceId);
      return a.originalIndex - b.originalIndex;
    });
}

function konvoyaAidBarrackiAl(state, konvoyId, binaIdleri) {
  const index = konvoyIndexiniAl(konvoyId);
  const completed = completedBarracklariAl(state, binaIdleri);
  const preferredId = binaIdleri[index - 1] || "";

  // Normal yeni state: convoy_1 -> barrack_1, convoy_2 -> barrack_2.
  if (preferredId) {
    const exact = completed.find(x => x.buildingId === preferredId);
    if (exact) return exact;
  }

  // Köhnə snapshot-larda eyni barrack ID-si ilə birdən çox persistent instance
  // ola bilər. Migration compatibility üçün tamamlanmış kamp sırasını istifadə et.
  return completed[index - 1] || null;
}

function konvoyTutumHesabiniAl(state, konvoyId) {
  const cfg = binaKonfiqiniAl();
  const barrack = konvoyaAidBarrackiAl(state, konvoyId, cfg.binaIdleri);

  const buildingLevel = barrack ? barrack.level : 0;
  const esasBinaTutumu = barrack
    ? cedveldenSeviyeDeyeriniAl(cfg.tutumCedveli, buildingLevel)
    : 0;

  const formulaActive = !!barrack && esasBinaTutumu > 0;
  const yekunTutum = formulaActive ? esasBinaTutumu : legacyTutumuAl();
  const siraTutumu = Math.floor(yekunTutum / KONVOY_SIRA_SAYI);

  return {
    formulaVersion: 4,
    formulaConfigured: true,
    formulaActive,
    source: formulaActive ? "barracks_level" : "legacy_5000_fallback",
    configSource: cfg.source,
    pendingReason: formulaActive ? "" : "completed_convoy_barracks_not_found",
    buildingId: barrack ? barrack.buildingId : "",
    buildingInstanceId: barrack ? barrack.instanceId : "",
    buildingLevel,
    esasBinaTutumu,
    siraSayi: KONVOY_SIRA_SAYI,
    siraTutumu,
    // Qəhrəman Skill 1 / Skill 6 dəqiq progression-u və sıra üzrə hero assignment
    // tam təsdiqlənməyənədək canlı tutuma əlavə edilmir.
    qehremanBonuslariAktiv: false,
    qehremanLevelBonusu: 0,
    skill1EsasBonusu: 0,
    skill6LiderlikBonusu: 0,
    yekunTutum,
    legacyFallbackTutum: legacyTutumuAl(),
    legacyFallbackLevel: 0,
    legacyCapacityTechnologyDisabled: true,
    qehremanlar: []
  };
}

module.exports = {
  legacyTutumLeveliniAl,
  legacyTutumuAl,
  konvoyIndexiniAl,
  konvoyaAidBarrackiAl,
  konvoyTutumHesabiniAl
};
