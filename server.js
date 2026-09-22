"use strict";

// ============================================================
// RDC LOCAL WS SERVER
// ------------------------------------------------------------
// Bu server Unity layihəsi üçün lokal WebSocket backend-dir.
//
// Hazır sistemlər:
// 1) Player state yaratmaq
// 2) HQ + starter road layout
// 3) Build request
// 4) Upgrade request
// 5) Move request
// 6) Builder / construction timer
// 7) Resource production
// 8) State update push
// ============================================================

const http = require("http");
const WebSocket = require("ws");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  hesabYaratVeBagla,
  emailTesdiqKoduHazirla,
  emailTesdiqKodunuYoxla
} = require("./hesab_yaddasi_postgres");

const {
  tesdiqKoduEmailiGonder
} = require("./email_gonderici");

const {
  hesabLoginMesajiniEmalEt
} = require("./hesab_login_handler");

const {
  sifreSifirlamaMesajiniEmalEt
} = require("./sifre_sifirlama_handler");

const {
  runtimeDeployConfiginiAl,
  runtimeDeployConfiginiYoxla,
  runtimeDeployPublicMelumatiniAl
} = require("./runtime_deploy_config");

const {
  lastShelterServerBaslangicResurslariniAl
} = require("./last_shelter_baslangic_resurslari");

const {
  lastShelterResourceRuntimeDefaultHazirla,
  lastShelterResourceRuntimeTeminEt,
  lastShelterResourcePayloadHazirla
} = require("./last_shelter_resource_runtime");

const {
  verifiedScienceResearchDeadlineAtMs,
  verifiedScienceResearchYekunlasdir
} = require("./last_shelter_science_runtime_adapteri");

const {
  starterGeneralHazirla,
  lastShelterHeroRuntimeTeminEt
} = require("./last_shelter_hero_reference");

const {
  troopTransferRuntimeDefaultHazirla
} = require("./last_shelter_troop_transfer_reference");

const {
  lastShelterWorldRuntimeDefaultHazirla,
  lastShelterWorldRuntimeTeminEt
} = require("./last_shelter_world_battlefield_reference");

const {
  lastShelterAllianceRuntimeDefaultHazirla,
  lastShelterAllianceRuntimeTeminEt
} = require("./last_shelter_alliance_runtime_contract");

const {
  starterCityRuntimeHazirla,
  lastShelterCityRuntimeTeminEt
} = require("./last_shelter_starter_city_reference");

const {
  lastShelterEngagementRuntimeDefaultHazirla,
  lastShelterEngagementRuntimeTeminEt
} = require("./last_shelter_engagement_reward_reference");

const {
  lastShelterGoldWalletDefaultHazirla,
  lastShelterGoldWalletTeminEt
} = require("./last_shelter_gold_wallet");

const {
  truckRuntimeDefaultHazirla,
  lastShelterTruckRuntimeTeminEt
} = require("./last_shelter_truck_convoy_reference");

const {
  lastShelterMissionRuntimeDefaultHazirla,
  lastShelterMissionRuntimeTeminEt
} = require("./last_shelter_task_reference");

const {
  lastShelterAuxiliaryRuntimeDefaultHazirla,
  lastShelterAuxiliaryRuntimeTeminEt
} = require("./last_shelter_auxiliary_runtime_reference");

const {
  sevenDaysRuntimeDefaultHazirla,
  lastShelterSevenDaysRuntimeTeminEt
} = require("./last_shelter_seven_days_reference");

const {
  lastShelterStarterAccountRuntimeDefaultHazirla,
  lastShelterStarterAccountRuntimeTeminEt
} = require("./last_shelter_starter_account_reference");

const {
  fortRuntimeDefaultHazirla,
  fortRuntimeTeminEt
} = require("./last_shelter_fort_troop_reference");

const {
  lastShelterMissileRuntimeDefaultHazirla,
  lastShelterMissileRuntimeTeminEt
} = require("./last_shelter_missile_runtime");

const {
  tutorialRuntimeDefaultHazirla,
  tutorialRuntimeTeminEt
} = require("./last_shelter_tutorial_reference");

const {
  lastShelterRepayRuntimeTeminEt
} = require("./last_shelter_repay_reference");

const {
  lastShelterVipStoreStateHazirla,
  lastShelterVipStoreStateTeminEt
} = require("./last_shelter_vip_store_runtime");

const {
  freshInitEnvelopeRuntimeDefaultHazirla,
  freshInitEnvelopeRuntimeTeminEt
} = require("./last_shelter_fresh_init_envelope_reference");

const {
  verifiedLastShelterBuildingLevelDataAl,
  verifiedLastShelterBuildingMaxLevelAl,
  verifiedLastShelterBuildingLevelStatusAl
} = require("./last_shelter_building_runtime_overlay");

// ============================================================
// TEMP BUILDING LEVEL DATA
// ------------------------------------------------------------
// Bu rəqəmlər hələlik müvəqqətidir.
// Məqsəd:
// - level-based server arxitekturasını oturtmaq
// - sonradan balansı rahat dəyişmək
// ============================================================

// Legacy hardcoded building balance removed: Last Shelter XML/external definitions are authoritative.


// Legacy synthetic technology balance definitions removed; Last Shelter science catalog is authoritative.

function normalizeBuildingId(id) {
  return String(id || "").trim().toLowerCase();
}

function normalizeResourceKey(type) {
  return String(type || "").trim().toLowerCase();
}

// Legacy technology bootstrap removed; Last Shelter state.science is authoritative.

function getAdjustedBuildDurationMs(state, baseBuildTimeSeconds) {
  const rawMs = Math.max(0, Math.round((Number(baseBuildTimeSeconds) || 0) * 1000));
  const technologySpeedPct = 0;

  if (rawMs <= 0) return rawMs;

  const { stateUcunTikintiMuddetiniHesabla } = require("./tikinti_inkisaf_korpu");
  const netice = stateUcunTikintiMuddetiniHesabla(
    state,
    rawMs,
    technologySpeedPct
  );

  if (!netice || Number(netice.totalSpeedPct) <= 0) return rawMs;
  return Math.max(1000, Math.round(Number(netice.effectiveDurationMs) || rawMs));
}

function ensureResourcesObject(state) {
  if (!state.resources) {
    state.resources = {
      food: 0,
      water: 0,
      wood: 0,
      stone: 0,
      iron: 0,
      silver: 0,
      fuel: 0,
      electricity: 0,
      money: 0,
      chips: 0
    };
  }

  const keys = [
    "food",
    "water",
    "wood",
    "stone",
    "iron",
    "silver",
    "fuel",
    "electricity",
    "diamond",
    "money",
    "chips"
  ];

  for (const key of keys) {
    if (typeof state.resources[key] !== "number") {
      state.resources[key] = 0;
    }
  }
}


// ============================================================
// OYUNCU PROFİLİ
// ------------------------------------------------------------
// Oyunçu adı və ittifaq adı server-authoritative saxlanılır.
// Köhnə state-lərdə bu sahələr yoxdursa avtomatik yaradılır.
// ============================================================

function oyuncuProfiliniTeminEt(state) {
  if (!state || typeof state !== "object") {
    return;
  }

  if (
    typeof state.oyuncuAdi !== "string" ||
    !state.oyuncuAdi.trim()
  ) {
    state.oyuncuAdi = "Komandir";
  } else {
    state.oyuncuAdi = state.oyuncuAdi.trim();
  }

  if (typeof state.ittifaqAdi !== "string") {
    state.ittifaqAdi = "";
  } else {
    state.ittifaqAdi = state.ittifaqAdi.trim();
  }
}


// ============================================================
// OYUNCU STATUSU
// ------------------------------------------------------------
// Almaz, VIP səviyyəsi və oyunçu gücü serverdə saxlanılır.
// Köhnə oyunçu state-lərində bu sahə yoxdursa avtomatik yaradılır.
// ============================================================

function oyuncuStatusunuTeminEt(state) {
  if (!state || typeof state !== "object") return;

  if (
    !state.oyuncuStatusu ||
    typeof state.oyuncuStatusu !== "object" ||
    Array.isArray(state.oyuncuStatusu)
  ) {
    state.oyuncuStatusu = {
      almaz: 0,
      vipSeviyesi: 0,
      oyuncuGucu: 0
    };
  }

  const almaz = Number(state.oyuncuStatusu.almaz);
  const vipSeviyesi = Number(state.oyuncuStatusu.vipSeviyesi);
  const oyuncuGucu = Number(state.oyuncuStatusu.oyuncuGucu);

  state.oyuncuStatusu.almaz = Number.isFinite(almaz)
    ? Math.max(0, Math.trunc(almaz))
    : 0;

  state.oyuncuStatusu.vipSeviyesi = Number.isFinite(vipSeviyesi)
    ? Math.max(0, Math.trunc(vipSeviyesi))
    : 0;

  state.oyuncuStatusu.oyuncuGucu = Number.isFinite(oyuncuGucu)
    ? Math.max(0, Math.trunc(oyuncuGucu))
    : 0;
}


// ============================================================
// OYUNÇU GÜC MƏLUMATLARINI HAZIRLA
// ============================================================

function oyuncuGucMelumatlariniTeminEt(state) {
  if (!state || typeof state !== "object") {
    return;
  }

  if (
    !state.gucMelumatlari ||
    typeof state.gucMelumatlari !== "object" ||
    Array.isArray(state.gucMelumatlari)
  ) {
    state.gucMelumatlari = {
      umumiGuc: 0,
      binaGucu: 0,
      qosunGucu: 0,
      qehremanGucu: 0
    };
  }

  const saheler = [
    "umumiGuc",
    "binaGucu",
    "qosunGucu",
    "qehremanGucu"
  ];

  for (const sahe of saheler) {
    const deyer =
      Number(state.gucMelumatlari[sahe]);

    state.gucMelumatlari[sahe] =
      Number.isFinite(deyer)
        ? Math.max(0, Math.trunc(deyer))
        : 0;
  }
}




function doyusStatistikasiniTeminEt(state) {
  if (!state || typeof state !== "object") {
    return;
  }

  if (
    !state.doyusStatistikasi ||
    typeof state.doyusStatistikasi !== "object" ||
    Array.isArray(state.doyusStatistikasi)
  ) {
    state.doyusStatistikasi = {
      umumiDoyusler: 0,
      qazanilanDoyusler: 0,
      mehvedilenDusmenBirlikleri: 0,
      itirilenOzBirlikleri: 0,
      sagaldilanBirlikler: 0,
      mehvedilenZombiler: 0
    };
  }

  const saheler = [
    "umumiDoyusler",
    "qazanilanDoyusler",
    "mehvedilenDusmenBirlikleri",
    "itirilenOzBirlikleri",
    "sagaldilanBirlikler",
    "mehvedilenZombiler"
  ];

  for (const sahe of saheler) {
    const deyer =
      Number(state.doyusStatistikasi[sahe]);

    state.doyusStatistikasi[sahe] =
      Number.isFinite(deyer)
        ? Math.max(0, Math.trunc(deyer))
        : 0;
  }
}

// ============================================================
// BAZA MƏLUMATLARI
// Server-authoritative
// ============================================================

function bazaMelumatlariniTeminEt(state) {
  if (!state || typeof state !== "object") {
    return;
  }

  if (
    !state.bazaMelumatlari ||
    typeof state.bazaMelumatlari !== "object" ||
    Array.isArray(state.bazaMelumatlari)
  ) {
state.bazaMelumatlari = {
  umumiTikintiMasinlari: 0,
  umumiZirehliMasinlar: 0,
  umumiQosunSayi: 0,

  yaraliBirlikler: 0,
  hospitalTutumu: 0,

  toplanisLimiti: 1,
  komekTutumu: 1
};
  }

const saheler = [
  "umumiTikintiMasinlari",
  "umumiZirehliMasinlar",
  "umumiQosunSayi",

  "yaraliBirlikler",
  "hospitalTutumu",

  "toplanisLimiti",
  "komekTutumu"
];

  for (const sahe of saheler) {
    const deyer =
      Number(state.bazaMelumatlari[sahe]);

    state.bazaMelumatlari[sahe] =
      Number.isFinite(deyer)
        ? Math.max(0, Math.trunc(deyer))
        : 0;
  }
}


// ============================================================
// TAMAMLANMIŞ BİNANIN ƏN YÜKSƏK LEVELİNİ TAP
// ============================================================

function tamamlanmisBinaMaksimumLeveliniTap(
  state,
  axtarilanBinaId
) {
  if (
    !state ||
    !Array.isArray(state.buildings)
  ) {
    return 0;
  }

  const hedefId =
    String(axtarilanBinaId || "")
      .trim()
      .toLowerCase();

  if (!hedefId) {
    return 0;
  }

  let maksimumLevel = 0;

  for (const building of state.buildings) {
    if (!building) {
      continue;
    }

    if (!building.isCompleted) {
      continue;
    }

    const binaId =
      String(building.buildingId || "")
        .trim()
        .toLowerCase();

    if (binaId !== hedefId) {
      continue;
    }

    const level =
      Math.max(
        1,
        Math.trunc(
          Number(building.level) || 1
        )
      );

    maksimumLevel =
      Math.max(
        maksimumLevel,
        level
      );
  }

  return maksimumLevel;
}

// ============================================================
// HOSPİTAL TUTUMU
// ------------------------------------------------------------
// Hər tamamlanmış Hospital:
// Level 1 = 2.000
// Level 2 = 4.000
// Level 3 = 6.000
// ...
//
// Birdən çox Hospital varsa hamısının tutumu toplanır.
// ============================================================

function hospitalTutumunuHesabla(state) {
  if (
    !state ||
    !Array.isArray(state.buildings)
  ) {
    return 0;
  }

  let umumiTutum = 0;

  for (const building of state.buildings) {
    if (!building) {
      continue;
    }

    if (!building.isCompleted) {
      continue;
    }

    const binaId =
      String(building.buildingId || "")
        .trim()
        .toLowerCase();

    if (binaId !== "hospital") {
      continue;
    }

    const level =
      Math.max(
        1,
        Math.trunc(
          Number(building.level) || 1
        )
      );

    const buHospitalTutumu =
      2000 * level;

    umumiTutum +=
      buHospitalTutumu;
  }

  return Math.max(
    0,
    Math.trunc(umumiTutum)
  );
}


// ============================================================
// TOPLANIŞ LİMİTİ
// Command Center əsasında
// ============================================================

function toplanisLimitiniHesabla(state) {
  const commandCenterLevel =
    tamamlanmisBinaMaksimumLeveliniTap(
      state,
      "command_center"
    );

  // Command Center yoxdursa baza limit.
  if (commandCenterLevel <= 0) {
    return 1;
  }

  // İlkin balans:
  // Lv.1 = 1
  // Lv.2 = 2
  // Lv.3 = 3
  // Lv.4 = 4
  // Lv.5+ = maksimum 5
  return Math.min(
    5,
    Math.max(
      1,
      commandCenterLevel
    )
  );
}


// ============================================================
// İTTİFAQ KÖMƏK TUTUMU
// Embassy əsasında
// ============================================================

function komekTutumunuHesabla(state) {
  const embassyLevel =
    tamamlanmisBinaMaksimumLeveliniTap(
      state,
      "embassy"
    );

  // Embassy yoxdursa başlanğıc limit.
  if (embassyLevel <= 0) {
    return 1;
  }

  // İlkin balans:
  // Embassy yoxdur = 1
  // Lv.1 = 2
  // Lv.2 = 3
  // Lv.3 = 4
  // ...
  // Maksimum = 30
  return Math.min(
    30,
    1 + embassyLevel
  );
}



// ============================================================
// ÜMUMİ ZİREHLİ MAŞIN SAYI
// vehicle_lv1 ... vehicle_lv10
// ============================================================

function umumiZirehliMasinSayiniHesabla(state) {
  if (
    !state ||
    !state.army ||
    !state.army.troops ||
    typeof state.army.troops !== "object"
  ) {
    return 0;
  }

  const troops =
    state.army.troops;

  let umumiSay = 0;

  for (let level = 1; level <= 10; level++) {
    const unitId =
      "vehicle_lv" + level;

    const say =
      Math.max(
        0,
        Math.trunc(
          Number(troops[unitId]) || 0
        )
      );

    umumiSay += say;
  }

  return umumiSay;
}


// ============================================================
// ÜMUMİ QOŞUN SAYI
// Fighter + Shooter + Vehicle
// ============================================================

function umumiQosunSayiniHesabla(state) {
  if (
    !state ||
    !state.army ||
    !state.army.troops ||
    typeof state.army.troops !== "object"
  ) {
    return 0;
  }

  const troops =
    state.army.troops;

  let umumiSay = 0;

  for (
    const [unitId, rawCount]
    of Object.entries(troops)
  ) {
    const id =
      String(unitId || "")
        .trim()
        .toLowerCase();

    const uygunQosundur =
      /^(fighter|shooter|vehicle)_lv([1-9]|10)$/
        .test(id);

    if (!uygunQosundur) {
      continue;
    }

    const say =
      Math.max(
        0,
        Math.trunc(
          Number(rawCount) || 0
        )
      );

    umumiSay += say;
  }

  return umumiSay;
}


// ============================================================
// BAZA MƏLUMATLARINI YENİLƏ
// ============================================================

function bazaMelumatlariniYenile(state) {
  if (!state || typeof state !== "object") {
    return;
  }

  bazaMelumatlariniTeminEt(state);


  // ========================================================
  // ÜMUMİ TİKİNTİ MAŞINLARI
  // ========================================================

  let umumiTikintiMasinlari = 0;

  if (
    state.builders &&
    typeof state.builders === "object"
  ) {
    const maxBuilders =
      Number(state.builders.maxBuilders);

    if (Number.isFinite(maxBuilders)) {
      umumiTikintiMasinlari =
        Math.max(
          0,
          Math.trunc(maxBuilders)
        );
    }
  }


  // ========================================================
  // ZİREHLİ MAŞINLAR
  // ========================================================

  const umumiZirehliMasinlar =
    umumiZirehliMasinSayiniHesabla(
      state
    );


  // ========================================================
  // BÜTÜN QOŞUNLAR
  // ========================================================

  const umumiQosunSayi =
    umumiQosunSayiniHesabla(
      state
    );


  // ========================================================
  // HOSPİTAL
  // ========================================================

  const hospitalTutumu =
    hospitalTutumunuHesabla(
      state
    );

  const yaraliBirlikler =
    Math.max(
      0,
      Math.trunc(
        Number(
          state.bazaMelumatlari
            .yaraliBirlikler
        ) || 0
      )
    );


  // ========================================================
  // TOPLANIŞ LİMİTİ
  // ========================================================

  const toplanisLimiti =
    toplanisLimitiniHesabla(
      state
    );


  // ========================================================
  // KÖMƏK TUTUMU
  // ========================================================

  const komekTutumu =
    komekTutumunuHesabla(
      state
    );


  // ========================================================
  // STATE-Ə YAZ
  // ========================================================

  state.bazaMelumatlari
    .umumiTikintiMasinlari =
      umumiTikintiMasinlari;

  state.bazaMelumatlari
    .umumiZirehliMasinlar =
      umumiZirehliMasinlar;

  state.bazaMelumatlari
    .umumiQosunSayi =
      umumiQosunSayi;

  state.bazaMelumatlari
    .yaraliBirlikler =
      yaraliBirlikler;

  state.bazaMelumatlari
    .hospitalTutumu =
      hospitalTutumu;

  state.bazaMelumatlari
    .toplanisLimiti =
      toplanisLimiti;

  state.bazaMelumatlari
    .komekTutumu =
      komekTutumu;
}
function oyuncuStatistikasiniTeminEt(state) {
  if (!state || typeof state !== "object") {
    return;
  }

  if (
    !state.oyuncuStatistikasi ||
    typeof state.oyuncuStatistikasi !== "object" ||
    Array.isArray(state.oyuncuStatistikasi)
  ) {
    state.oyuncuStatistikasi = {
      mehvedilenDusmen: 0,
      qazanilanDoyus: 0,
      meglubiyyetSayi: 0,
      toplanmisResurs: 0
    };
  }

  const saheler = [
    "mehvedilenDusmen",
    "qazanilanDoyus",
    "meglubiyyetSayi",
    "toplanmisResurs"
  ];

  for (const sahe of saheler) {
    const deyer =
      Number(state.oyuncuStatistikasi[sahe]);

    state.oyuncuStatistikasi[sahe] =
      Number.isFinite(deyer)
        ? Math.max(0, Math.trunc(deyer))
        : 0;
  }
}


// ============================================================
// BİNA ID TƏMİZLƏMƏ
// ============================================================

function gucUcunBinaIdNormallasdir(buildingId) {
  return String(buildingId || "")
    .trim()
    .toLowerCase();
}


// ============================================================
// BİR BİNANIN GÜCÜ
// ============================================================

function birBinaninGucunuHesabla(building) {
  if (!building) {
    return 0;
  }

  // Tikintisi tamamlanmamış bina güc vermir.
  if (!building.isCompleted) {
    return 0;
  }

  const binaId =
    gucUcunBinaIdNormallasdir(
      building.buildingId
    );

  if (!binaId) {
    return 0;
  }

  // Yol güc vermir.
  if (binaId === "road") {
    return 0;
  }

  const level =
    Math.max(
      1,
      Math.trunc(
        Number(building.level) || 1
      )
    );

  let levelBasiGuc = 100;

  switch (binaId) {
    case "hq":
      levelBasiGuc = 500;
      break;

    case "command_center":
      levelBasiGuc = 250;
      break;

    case "fighter_camp":
      levelBasiGuc = 200;
      break;

    case "shooter_camp":
      levelBasiGuc = 200;
      break;

    case "vehicle_factory":
      levelBasiGuc = 300;
      break;

    case "bunker":
      levelBasiGuc = 250;
      break;

    case "heroes_hall":
      levelBasiGuc = 200;
      break;

    default:
      levelBasiGuc = 100;
      break;
  }

  return levelBasiGuc * level;
}


// ============================================================
// OYUNÇUNUN BÜTÜN BİNA GÜCÜ
// ============================================================

function binaGucunuHesabla(state) {
  if (
    !state ||
    !Array.isArray(state.buildings)
  ) {
    return 0;
  }

  let umumiBinaGucu = 0;

  for (const building of state.buildings) {
    umumiBinaGucu +=
      birBinaninGucunuHesabla(building);
  }

  return Math.max(
    0,
    Math.trunc(umumiBinaGucu)
  );
}


// ============================================================
// BİR QOŞUN VAHİDİNİN GÜCÜ
// ============================================================

function birQosununGucunuAl(unitId) {
  const id =
    String(unitId || "")
      .trim()
      .toLowerCase();

  const netice =
    id.match(
      /^(fighter|shooter|vehicle)_lv(\d+)$/
    );

  if (!netice) {
    return 0;
  }

  const qosunNovu =
    netice[1];

  const level =
    Math.max(
      1,
      Math.min(
        10,
        Math.trunc(
          Number(netice[2]) || 1
        )
      )
    );

  let esasGuc = 0;

  switch (qosunNovu) {
    case "fighter":
      esasGuc = 5;
      break;

    case "shooter":
      esasGuc = 6;
      break;

    case "vehicle":
      esasGuc = 20;
      break;

    default:
      esasGuc = 0;
      break;
  }

  return esasGuc * level;
}


// ============================================================
// OYUNÇUNUN BÜTÜN QOŞUN GÜCÜ
// ============================================================

function qosunGucunuHesabla(state) {
  if (
    !state ||
    !state.army ||
    !state.army.troops ||
    typeof state.army.troops !== "object"
  ) {
    return 0;
  }

  const troops =
    state.army.troops;

  let umumiQosunGucu = 0;

  for (
    const [unitId, rawCount]
    of Object.entries(troops)
  ) {
    const say =
      Math.max(
        0,
        Math.trunc(
          Number(rawCount) || 0
        )
      );

    if (say <= 0) {
      continue;
    }

    const birEdedGuc =
      birQosununGucunuAl(unitId);

    umumiQosunGucu +=
      birEdedGuc * say;
  }

  return Math.max(
    0,
    Math.trunc(umumiQosunGucu)
  );
}


// ============================================================
// QƏHRƏMAN GÜCÜ
// Hələlik 0.
// Hero sistemi server state-ə tam qoşulanda genişləndirəcəyik.
// ============================================================

function qehremanGucunuHesabla(state) {
  return 0;
}


// ============================================================
// OYUNÇUNUN ÜMUMİ GÜCÜNÜ YENİLƏ
// ============================================================

function oyuncuGucunuYenile(state) {
  if (!state || typeof state !== "object") {
    return;
  }

  oyuncuStatusunuTeminEt(state);
  oyuncuGucMelumatlariniTeminEt(state);

  const binaGucu =
    binaGucunuHesabla(state);

  const qosunGucu =
    qosunGucunuHesabla(state);

  const qehremanGucu =
    qehremanGucunuHesabla(state);

  const umumiGuc =
    Math.max(
      0,
      binaGucu +
      qosunGucu +
      qehremanGucu
    );

  state.gucMelumatlari.binaGucu =
    binaGucu;

  state.gucMelumatlari.qosunGucu =
    qosunGucu;

  state.gucMelumatlari.qehremanGucu =
    qehremanGucu;

  state.gucMelumatlari.umumiGuc =
    umumiGuc;

  // Köhnə UI və PlayerStateCache qırılmasın.
  state.oyuncuStatusu.oyuncuGucu =
    umumiGuc;
}



// ============================================================
// OYUNÇU GÜC SİSTEMİ
// Server-authoritative
// ============================================================

function oyuncuGucMelumatlariniTeminEt(state) {
  if (!state || typeof state !== "object") {
    return;
  }

  if (
    !state.gucMelumatlari ||
    typeof state.gucMelumatlari !== "object" ||
    Array.isArray(state.gucMelumatlari)
  ) {
    state.gucMelumatlari = {
      umumiGuc: 0,
      binaGucu: 0,
      qosunGucu: 0,
      qehremanGucu: 0
    };
  }

  const saheler = [
    "umumiGuc",
    "binaGucu",
    "qosunGucu",
    "qehremanGucu"
  ];

  for (const sahe of saheler) {
    const deyer =
      Number(state.gucMelumatlari[sahe]);

    state.gucMelumatlari[sahe] =
      Number.isFinite(deyer)
        ? Math.max(0, Math.trunc(deyer))
        : 0;
  }
}


// ============================================================
// BİNA ID NORMALİZASİYASI
// ============================================================

function gucUcunBinaIdNormallasdir(buildingId) {
  return String(buildingId || "")
    .trim()
    .toLowerCase();
}


// ============================================================
// BİR BİNANIN GÜCÜ
// ============================================================

function birBinaninGucunuHesabla(building) {
  if (!building) {
    return 0;
  }

  // Tikintisi tamamlanmayıbsa güc vermir.
  if (!building.isCompleted) {
    return 0;
  }

  const binaId =
    gucUcunBinaIdNormallasdir(
      building.buildingId
    );

  if (!binaId) {
    return 0;
  }

  // Yol oyunçu gücünü artırmır.
  if (binaId === "road") {
    return 0;
  }

  const level =
    Math.max(
      1,
      Math.trunc(
        Number(building.level) || 1
      )
    );

  let levelBasiGuc = 100;

  switch (binaId) {
    case "hq":
      levelBasiGuc = 500;
      break;

    case "command_center":
      levelBasiGuc = 250;
      break;

    case "fighter_camp":
      levelBasiGuc = 200;
      break;

    case "shooter_camp":
      levelBasiGuc = 200;
      break;

    case "vehicle_factory":
      levelBasiGuc = 300;
      break;

    case "bunker":
      levelBasiGuc = 250;
      break;

    case "heroes_hall":
      levelBasiGuc = 200;
      break;

    default:
      levelBasiGuc = 100;
      break;
  }

  return levelBasiGuc * level;
}


// ============================================================
// BÜTÜN BİNALARIN GÜCÜ
// ============================================================

function binaGucunuHesabla(state) {
  if (
    !state ||
    !Array.isArray(state.buildings)
  ) {
    return 0;
  }

  let umumiBinaGucu = 0;

  for (const building of state.buildings) {
    umumiBinaGucu +=
      birBinaninGucunuHesabla(building);
  }

  return Math.max(
    0,
    Math.trunc(umumiBinaGucu)
  );
}


// ============================================================
// BİR QOŞUN VAHİDİNİN GÜCÜ
// ============================================================

function birQosununGucunuAl(unitId) {
  const id =
    String(unitId || "")
      .trim()
      .toLowerCase();

  const netice =
    id.match(
      /^(fighter|shooter|vehicle)_lv(\d+)$/
    );

  if (!netice) {
    return 0;
  }

  const qosunNovu =
    netice[1];

  const level =
    Math.max(
      1,
      Math.min(
        10,
        Math.trunc(
          Number(netice[2]) || 1
        )
      )
    );

  let esasGuc = 0;

  switch (qosunNovu) {
    case "fighter":
      esasGuc = 5;
      break;

    case "shooter":
      esasGuc = 6;
      break;

    case "vehicle":
      esasGuc = 20;
      break;

    default:
      esasGuc = 0;
      break;
  }

  return esasGuc * level;
}


// ============================================================
// BÜTÜN QOŞUNLARIN GÜCÜ
// ============================================================

function qosunGucunuHesabla(state) {
  if (
    !state ||
    !state.army ||
    !state.army.troops ||
    typeof state.army.troops !== "object"
  ) {
    return 0;
  }

  const troops =
    state.army.troops;

  let umumiQosunGucu = 0;

  for (
    const [unitId, rawCount]
    of Object.entries(troops)
  ) {
    const say =
      Math.max(
        0,
        Math.trunc(
          Number(rawCount) || 0
        )
      );

    if (say <= 0) {
      continue;
    }

    const birEdedGuc =
      birQosununGucunuAl(unitId);

    umumiQosunGucu +=
      birEdedGuc * say;
  }

  return Math.max(
    0,
    Math.trunc(umumiQosunGucu)
  );
}


// ============================================================
// QƏHRƏMAN GÜCÜ
// Hero sistemi server state-ə tam qoşulanda genişləndiriləcək.
// ============================================================

function qehremanGucunuHesabla(state) {
  return 0;
}


// ============================================================
// OYUNÇUNUN BÜTÜN GÜCÜNÜ YENİLƏ
// ============================================================

function oyuncuGucunuYenile(state) {
  if (!state || typeof state !== "object") {
    return;
  }

  oyuncuStatusunuTeminEt(state);
  oyuncuGucMelumatlariniTeminEt(state);

  const binaGucu =
    binaGucunuHesabla(state);

  const qosunGucu =
    qosunGucunuHesabla(state);

  const qehremanGucu =
    qehremanGucunuHesabla(state);

  const umumiGuc =
    Math.max(
      0,
      binaGucu +
      qosunGucu +
      qehremanGucu
    );

  state.gucMelumatlari.binaGucu =
    binaGucu;

  state.gucMelumatlari.qosunGucu =
    qosunGucu;

  state.gucMelumatlari.qehremanGucu =
    qehremanGucu;

  state.gucMelumatlari.umumiGuc =
    umumiGuc;

  // Köhnə sistemlərlə compatibility.
  state.oyuncuStatusu.oyuncuGucu =
    umumiGuc;
}


function getBaseResourceCaps() {
  return {
    food: 100000,
    water: 100000,
    wood: 100000,
    stone: 100000,
    iron: 100000,
    silver: 100000,
    fuel: 100000,
    electricity: 100000,
    money: 100000,
    chips: 100000
  };
}

function ensureResourceCapsObject(state) {
  if (!state.resourceCaps || typeof state.resourceCaps !== "object") {
    state.resourceCaps = getBaseResourceCaps();
  }

  const baseCaps = getBaseResourceCaps();
  for (const key of Object.keys(baseCaps)) {
    if (typeof state.resourceCaps[key] !== "number") {
      state.resourceCaps[key] = baseCaps[key];
    }
  }
}

function getStorageRule(buildingId, buildingLevel) {
  const id = normalizeBuildingId(buildingId);
  const level = Math.max(1, Number(buildingLevel) || 1);
  const meta = getDefinitionMeta(id);
  const levelData = getLevelData(id, level);

  if (meta && meta.providesStorage && meta.storageResource) {
    const capacityBonus = Math.max(0, Number(levelData.storageCapacityBonus) || 0);
    if (capacityBonus > 0) {
      return {
        resourceType: meta.storageResource,
        capacityBonus
      };
    }
  }

  function bonusByLevel(level1, level2, level3, level4) {
    if (level <= 1) return level1;
    if (level === 2) return level2;
    if (level === 3) return level3;
    return level4;
  }

  switch (id) {
    case "granary_1":
      return { resourceType: "food", capacityBonus: bonusByLevel(5000, 7000, 9000, 12000) };
    case "granary_2":
      return { resourceType: "food", capacityBonus: bonusByLevel(9000, 12000, 16000, 21000) };
    case "granary_3":
      return { resourceType: "food", capacityBonus: bonusByLevel(14000, 18000, 23000, 30000) };

    case "water_tank_1":
      return { resourceType: "water", capacityBonus: bonusByLevel(5000, 7000, 9000, 12000) };
    case "water_tank_2":
      return { resourceType: "water", capacityBonus: bonusByLevel(9000, 12000, 16000, 21000) };
    case "water_tank_3":
      return { resourceType: "water", capacityBonus: bonusByLevel(14000, 18000, 23000, 30000) };

    case "lumber_warehouse_1":
      return { resourceType: "wood", capacityBonus: bonusByLevel(5000, 7000, 9000, 12000) };
    case "lumber_warehouse_2":
      return { resourceType: "wood", capacityBonus: bonusByLevel(9000, 12000, 16000, 21000) };
    case "lumber_warehouse_3":
      return { resourceType: "wood", capacityBonus: bonusByLevel(14000, 18000, 23000, 30000) };

    case "iron_warehouse_1":
      return { resourceType: "iron", capacityBonus: bonusByLevel(5000, 7000, 9000, 12000) };
    case "iron_warehouse_2":
      return { resourceType: "iron", capacityBonus: bonusByLevel(9000, 12000, 16000, 21000) };
    case "iron_warehouse_3":
      return { resourceType: "iron", capacityBonus: bonusByLevel(14000, 18000, 23000, 30000) };

    case "oil_storage_tank_1":
      return { resourceType: "fuel", capacityBonus: bonusByLevel(5000, 7000, 9000, 12000) };
    case "oil_storage_tank_2":
      return { resourceType: "fuel", capacityBonus: bonusByLevel(9000, 12000, 16000, 21000) };
    case "oil_storage_tank_3":
      return { resourceType: "fuel", capacityBonus: bonusByLevel(14000, 18000, 23000, 30000) };

    case "power_storage_facility_1":
      return { resourceType: "electricity", capacityBonus: bonusByLevel(5000, 7000, 9000, 12000) };
    case "power_storage_facility_2":
      return { resourceType: "electricity", capacityBonus: bonusByLevel(9000, 12000, 16000, 21000) };
    case "power_storage_facility_3":
      return { resourceType: "electricity", capacityBonus: bonusByLevel(14000, 18000, 23000, 30000) };

    default:
      return null;
  }
}

function calculateResourceCaps(state) {
  const caps = getBaseResourceCaps();

  if (!state || !Array.isArray(state.buildings)) {
    return caps;
  }

  for (const building of state.buildings) {
    if (!building || !building.isCompleted) continue;

    const rule = getStorageRule(building.buildingId, building.level);
    if (!rule) continue;

    const key = normalizeResourceKey(rule.resourceType);
    const bonus = Math.max(0, Number(rule.capacityBonus) || 0);
    if (!bonus) continue;

    if (typeof caps[key] !== "number") {
      caps[key] = 0;
    }

    caps[key] += bonus;
  }

  return caps;
}

function clampResourcesToCaps(state) {
  if (!state) return;

  ensureResourcesObject(state);
  ensureResourceCapsObject(state);

  for (const [key, cap] of Object.entries(state.resourceCaps)) {
    if (typeof state.resources[key] !== "number") continue;
    if (typeof cap !== "number") continue;
    if (state.resources[key] > cap) {
      state.resources[key] = cap;
    }
  }
}

function refreshResourceCaps(state) {
  if (!state) return;

  ensureResourcesObject(state);
  state.resourceCaps = calculateResourceCaps(state);
  ensureResourceCapsObject(state);
  clampResourcesToCaps(state);
}


function getBaseSpecialStats() {
  return {
    populationCap: 0,
    moneyPerTickBonus: 0,
    chipsPerTickBonus: 0,
    electricityPerTickBonus: 0
  };
}

function ensureSpecialStatsObject(state) {
  if (!state || typeof state !== "object") return;

  if (!state.specialStats || typeof state.specialStats !== "object") {
    state.specialStats = getBaseSpecialStats();
  }

  const base = getBaseSpecialStats();
  for (const key of Object.keys(base)) {
    if (typeof state.specialStats[key] !== "number") {
      state.specialStats[key] = base[key];
    }
  }
}

function getSpecialEffectRule(buildingId, buildingLevel) {
  const id = normalizeBuildingId(buildingId);
  const level = Math.max(1, Number(buildingLevel) || 1);
  const meta = getDefinitionMeta(id);
  const levelData = getLevelData(id, level);

  if (meta && meta.specialEffectType) {
    const specialEffectValue = Math.max(0, Number(levelData.specialEffectValue) || 0);
    if (specialEffectValue > 0) {
      return {
        effectType: meta.specialEffectType,
        value: specialEffectValue
      };
    }
  }

  function amountByLevel(level1, level2, level3, level4) {
    if (level <= 1) return level1;
    if (level === 2) return level2;
    if (level === 3) return level3;
    return level4;
  }

  switch (id) {
    case "house":
      return { effectType: "population_cap", value: amountByLevel(5, 10, 15, 20) };

    case "bank":
      return { effectType: "money_per_tick", value: amountByLevel(5, 8, 12, 16) };

    case "commercial_hub":
      return { effectType: "money_per_tick", value: amountByLevel(8, 12, 18, 26) };

    case "chip_plant":
      return { effectType: "chips_per_tick", value: amountByLevel(1, 2, 3, 5) };

    case "power_plant":
      return { effectType: "electricity_per_tick", value: amountByLevel(8, 14, 22, 32) };

    default:
      return null;
  }
}

function calculateSpecialStats(state) {
  const stats = getBaseSpecialStats();

  if (!state || !Array.isArray(state.buildings)) {
    return stats;
  }

  for (const building of state.buildings) {
    if (!building || !building.isCompleted) continue;
    if (building.hasRoadAccess === false) continue;

    const rule = getSpecialEffectRule(building.buildingId, building.level);
    if (!rule) continue;

    const amount = Math.max(0, Number(rule.value) || 0);
    if (amount <= 0) continue;

    switch (rule.effectType) {
      case "population_cap":
        stats.populationCap += amount;
        break;

      case "money_per_tick":
        stats.moneyPerTickBonus += amount;
        break;

      case "chips_per_tick":
        stats.chipsPerTickBonus += amount;
        break;

      case "electricity_per_tick":
        stats.electricityPerTickBonus += amount;
        break;

      default:
        break;
    }
  }

  return stats;
}
function refreshSpecialStats(state) {
  if (!state || typeof state !== "object") return;

  ensureSpecialStatsObject(state);

  state.specialStats = calculateSpecialStats(state);

  ensureSpecialStatsObject(state);

  if (!state.population || typeof state.population !== "object") {
    state.population = {
      current: 0,
      cap: state.specialStats.populationCap
    };
  } else {
    if (typeof state.population.current !== "number") {
      state.population.current = 0;
    }

    state.population.cap = Math.max(
      0,
      Number(state.specialStats.populationCap) || 0
    );

    if (state.population.current > state.population.cap) {
      state.population.current = state.population.cap;
    }
  }

  console.log("[EHALI_YENILENDI]", {
    playerId: state.playerId,
    cariEhali: state.population.current,
    maksimumEhali: state.population.cap,
    populationCap: state.specialStats.populationCap
  });
}

function cloneCostArray(cost) {
  if (!Array.isArray(cost)) return [];
  return cost.map(item => ({
    type: normalizeResourceKey(item.type),
    amount: Math.max(0, Number(item.amount) || 0)
  }));
}

// Legacy hardcoded building metadata removed; building_definitions.json is the active metadata source.

let EXTERNAL_BUILDING_DEFINITION_META = {};
let EXTERNAL_BUILDING_LEVEL_CONFIG = {};

function normalizePlacementModeValue(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (raw === "resourceslot" || raw === "resource_slot") {
    return "resource_slot";
  }

  return "normal";
}

function normalizeRequiredSlotTypeValue(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw || raw === "none") return null;
  if (raw === "wood") return "wood";
  if (raw === "iron") return "iron";
  if (raw === "fuel") return "fuel";
  if (raw === "water") return "water";
  if (raw === "food") return "food";

  return null;
}

function normalizeProducedResourceValue(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw || raw === "none") return null;
  if (raw === "food") return "food";
  if (raw === "water") return "water";
  if (raw === "wood") return "wood";
  if (raw === "iron") return "iron";
  if (raw === "fuel") return "fuel";
  if (raw === "electricity") return "electricity";
  if (raw === "money") return "money";
  if (raw === "chips" || raw === "chip") return "chips";

  return null;
}


function normalizeSpecialEffectTypeValue(value) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw || raw === "none") return null;
  if (raw === "populationcap" || raw === "population_cap" || raw === "population") return "population_cap";
  if (raw === "moneypertick" || raw === "money_per_tick" || raw === "money") return "money_per_tick";
  if (raw === "chipspertick" || raw === "chips_per_tick" || raw === "chips") return "chips_per_tick";
  if (raw === "electricitypertick" || raw === "electricity_per_tick" || raw === "electricity") return "electricity_per_tick";

  return null;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (raw === "true") return true;
    if (raw === "false") return false;
  }
  return fallback;
}

function normalizeUnlockCountStepList(rawSteps) {
  if (!Array.isArray(rawSteps)) return [];

  return rawSteps
    .map(step => ({
      requiredMainBuildingLevel: Math.max(1, Number(step?.requiredMainBuildingLevel) || 1),
      allowedPlacedCount: Math.max(0, Number(step?.allowedPlacedCount) || 0)
    }))
    .filter(step => step.allowedPlacedCount > 0)
    .sort((a, b) => {
      if (a.requiredMainBuildingLevel !== b.requiredMainBuildingLevel) {
        return a.requiredMainBuildingLevel - b.requiredMainBuildingLevel;
      }
      return a.allowedPlacedCount - b.allowedPlacedCount;
    });
}

function coerceDefinitionList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.definitions)) return payload.definitions;
  if (payload && Array.isArray(payload.buildings)) return payload.buildings;
  return null;
}

function createMetaFromDefinition(definition) {
  const id = normalizeBuildingId(definition.id);
  if (!id) return null;

  const explicitMaxLevel = Number(definition.maxLevel);
  const levelsLength = Array.isArray(definition.levels) ? definition.levels.length : 0;

  return {
    sizeX: Math.max(1, Number(definition.sizeX) || 1),
    sizeZ: Math.max(1, Number(definition.sizeZ) || 1),
    isRoad: normalizeBoolean(definition.isRoad, false),
    requiresRoad: normalizeBoolean(definition.requiresRoad, true),
    placementMode: normalizePlacementModeValue(definition.placementMode),
    requiredSlotType: normalizeRequiredSlotTypeValue(definition.requiredResourceSlot),
    multiBuild: normalizeBoolean(definition.multiBuild, false),
    maxPlacedCount: Math.max(0, Number(definition.maxPlacedCount) || 0),
    builderSlotsRequired: Math.max(1, Number(definition.builderSlotsRequired) || 1),
    maxLevel: Math.max(1, explicitMaxLevel || levelsLength || 1),
    requiredMainBuildingLevel: Math.max(0, Number(definition.requiredMainBuildingLevel) || 0),
    requiredDepotLevel: Math.max(0, Number(definition.requiredDepotLevel) || 0),
    requiredBuildingId: normalizeBuildingId(definition.requiredBuildingId || ""),
    requiredBuildingLevel: Math.max(0, Number(definition.requiredBuildingLevel) || 0),
    producesResource: normalizeBoolean(definition.producesResource, false),
    producedResource: normalizeProducedResourceValue(definition.producedResource),
    providesStorage: normalizeBoolean(definition.providesStorage, false),
    storageResource: normalizeProducedResourceValue(definition.storageResource),
    specialEffectType: normalizeSpecialEffectTypeValue(definition.specialEffectType),
    unlockCountByMainBuildingLevel: normalizeUnlockCountStepList(definition.unlockCountByMainBuildingLevel)
  };
}

function createLevelConfigFromDefinition(definition) {
  const id = normalizeBuildingId(definition.id);
  if (!id) return null;
  if (!Array.isArray(definition.levels) || definition.levels.length === 0) return null;

  const sortedLevels = [...definition.levels]
    .map((level, index) => ({
      level: Math.max(1, Number(level.level) || (index + 1)),
      buildTimeSeconds: Math.max(0, Number(level.buildTimeSeconds) || 0),
      productionPerTick: Math.max(0, Number(level.productionPerTick) || 0),
      storageCapacityBonus: Math.max(0, Number(level.storageCapacityBonus) || 0),
      specialEffectValue: Math.max(0, Number(level.specialEffectValue) || 0),
      cost: cloneCostArray(level.cost)
    }))
    .sort((a, b) => a.level - b.level);

  return {
    levels: sortedLevels.map(level => ({
      buildTimeSeconds: level.buildTimeSeconds,
      productionPerTick: level.productionPerTick,
      storageCapacityBonus: level.storageCapacityBonus,
      specialEffectValue: level.specialEffectValue,
      cost: level.cost
    }))
  };
}

function getDefinitionFileCandidates() {
  const cwd = process.cwd();
  const dir = __dirname;

  return Array.from(new Set([
    path.join(cwd, "building_definitions.json"),
    path.join(cwd, "building_definitions_export.json"),
    path.join(cwd, "BuildingDefinitions.json"),
    path.join(dir, "building_definitions.json"),
    path.join(dir, "building_definitions_export.json"),
    path.join(dir, "BuildingDefinitions.json")
  ]));
}

function loadExternalBuildingDefinitions() {
  const candidates = getDefinitionFileCandidates();

  for (const filePath of candidates) {
    try {
      if (!fs.existsSync(filePath)) continue;

      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      const definitions = coerceDefinitionList(parsed);

      if (!definitions || definitions.length === 0) {
        console.log("[BUILDING_DEFINITIONS] File found but no definitions array:", filePath);
        continue;
      }

      const nextMeta = {};
      const nextLevelConfig = {};

      for (const definition of definitions) {
        const meta = createMetaFromDefinition(definition);
        if (!meta) continue;

        const id = normalizeBuildingId(definition.id);
        nextMeta[id] = meta;

        const verifiedLastShelterMaxLevel =
          verifiedLastShelterBuildingMaxLevelAl(
            id
          );

        if (
          verifiedLastShelterMaxLevel <= 0
        ) {
          const levelConfig =
            createLevelConfigFromDefinition(
              definition
            );

          if (levelConfig) {
            nextLevelConfig[id] =
              levelConfig;
          }
        }
      }

      EXTERNAL_BUILDING_DEFINITION_META = nextMeta;
      EXTERNAL_BUILDING_LEVEL_CONFIG = nextLevelConfig;

      console.log("[BUILDING_DEFINITIONS] Loaded:", {
        filePath,
        definitionCount: Object.keys(nextMeta).length,
        levelConfigCount: Object.keys(nextLevelConfig).length
      });
      return;
    } catch (error) {
      console.error("[BUILDING_DEFINITIONS] Failed to load file:", filePath, error);
    }
  }

  EXTERNAL_BUILDING_DEFINITION_META = {};
  EXTERNAL_BUILDING_LEVEL_CONFIG = {};
  console.log("[BUILDING_DEFINITIONS] External building definitions file not found.");
}

function getDefinitionMeta(buildingId) {
  const id = normalizeBuildingId(buildingId);

  return EXTERNAL_BUILDING_DEFINITION_META[id] || null;
}

function getPreviousTierBuildingId(buildingId) {
  const id = normalizeBuildingId(buildingId);
  const match = id.match(/^(.*)_(\d+)$/);

  if (!match) return "";
  const prefix = match[1];
  const tier = Number(match[2]) || 0;

  if (tier <= 1) return "";

  return normalizeBuildingId(`${prefix}_${tier - 1}`);
}

function resolveUnlockRequiredBuildingId(buildingId, meta) {
  const selfId = normalizeBuildingId(buildingId);
  const rawRequired = normalizeBuildingId(meta?.requiredBuildingId || "");

  if (rawRequired && rawRequired !== selfId) {
    return rawRequired;
  }

  const previousTierId = getPreviousTierBuildingId(selfId);
  if (previousTierId) {
    return previousTierId;
  }

  return "";
}

function getUnlockRuleForBuilding(buildingId) {
  const id = normalizeBuildingId(buildingId);
  const meta = getDefinitionMeta(id) || {};

  const rule = {
    requiredMainBuildingLevel: Math.max(0, Number(meta.requiredMainBuildingLevel) || 0),
    requiredDepotLevel: 0,
    requiredBuildingId: resolveUnlockRequiredBuildingId(id, meta),
    requiredBuildingLevel: Math.max(0, Number(meta.requiredBuildingLevel) || 0)
  };

  if (id === "road") {
    rule.requiredMainBuildingLevel = 0;
    rule.requiredDepotLevel = 0;
    rule.requiredBuildingId = "";
    rule.requiredBuildingLevel = 0;
  }

  return rule;
}

function getHighestCompletedBuildingLevel(state, buildingId) {
  const id = normalizeBuildingId(buildingId);

  if (!state || !Array.isArray(state.buildings)) return 0;

  let highestLevel = 0;

  for (const building of state.buildings) {
    if (!building) continue;
    if (normalizeBuildingId(building.buildingId) !== id) continue;
    if (!building.isCompleted) continue;

    highestLevel = Math.max(highestLevel, Math.max(1, Number(building.level) || 1));
  }

  return highestLevel;
}

function getHighestExistingBuildingLevel(state, buildingId) {
  const id = normalizeBuildingId(buildingId);

  if (!state || !Array.isArray(state.buildings)) return 0;

  let highestLevel = 0;

  for (const building of state.buildings) {
    if (!building) continue;
    if (normalizeBuildingId(building.buildingId) !== id) continue;

    highestLevel = Math.max(highestLevel, Math.max(1, Number(building.level) || 1));
  }

  return highestLevel;
}

function checkUnlockRequirements(state, buildingId) {
  const id = normalizeBuildingId(buildingId);
  const rule = getUnlockRuleForBuilding(id);

  if (!rule) {
    return { ok: true };
  }

  if (rule.requiredMainBuildingLevel > 0) {
    const hqLevel = getHighestExistingBuildingLevel(state, "hq");
    if (hqLevel < rule.requiredMainBuildingLevel) {
      return {
        ok: false,
        message: `HQ level ${rule.requiredMainBuildingLevel} required`
      };
    }
  }

  if (rule.requiredBuildingId) {
    const requiredLevel = Math.max(1, Number(rule.requiredBuildingLevel) || 1);
    const requiredId = normalizeBuildingId(rule.requiredBuildingId);
    const currentLevel =
      requiredId === "hq"
        ? getHighestExistingBuildingLevel(state, "hq")
        : getHighestCompletedBuildingLevel(state, requiredId);

    if (currentLevel < requiredLevel) {
      return {
        ok: false,
        message: `${requiredId} level ${requiredLevel} required`
      };
    }
  }

  return { ok: true };
}

loadExternalBuildingDefinitions();

function getMaxPlacedCountForBuilding(buildingId) {
  const id = normalizeBuildingId(buildingId);
  const meta = getDefinitionMeta(id);

  if (meta) {
    if (meta.multiBuild) {
      const raw = Number(meta.maxPlacedCount) || 0;
      return raw <= 0 ? Number.POSITIVE_INFINITY : raw;
    }

    const raw = Number(meta.maxPlacedCount) || 1;
    return Math.max(1, raw);
  }

  return 1;
}

function getAllowedPlacedCountForBuilding(state, buildingId) {
  const id = normalizeBuildingId(buildingId);
  const meta = getDefinitionMeta(id) || {};
  const absoluteMax = getMaxPlacedCountForBuilding(id);

  if (!Number.isFinite(absoluteMax)) {
    return absoluteMax;
  }

  const steps = Array.isArray(meta.unlockCountByMainBuildingLevel)
    ? meta.unlockCountByMainBuildingLevel
    : [];

  if (steps.length === 0) {
    return absoluteMax;
  }

  const hqLevel = getHighestExistingBuildingLevel(state, "hq");
  let allowed = 0;

  for (const step of steps) {
    const reqLevel = Math.max(1, Number(step.requiredMainBuildingLevel) || 1);
    const stepAllowed = Math.max(0, Number(step.allowedPlacedCount) || 0);

    if (hqLevel >= reqLevel) {
      allowed = Math.max(allowed, stepAllowed);
    }
  }

  return Math.min(absoluteMax, allowed);
}

function getBuilderSlotsRequiredForBuilding(buildingId) {
  const id = normalizeBuildingId(buildingId);
  const meta = getDefinitionMeta(id);

  if (meta && Number.isFinite(Number(meta.builderSlotsRequired))) {
    return Math.max(1, Number(meta.builderSlotsRequired) || 1);
  }

  return 1;
}

function countPlacedBuildingsOfType(state, buildingId) {
  const id = normalizeBuildingId(buildingId);
  if (!state || !Array.isArray(state.buildings)) return 0;

  return state.buildings.filter(
    (b) => b && normalizeBuildingId(b.buildingId) === id
  ).length;
}

function getNextUnlockCountRequirement(state, buildingId) {
  const id = normalizeBuildingId(buildingId);
  const meta = getDefinitionMeta(id) || {};
  const steps = Array.isArray(meta.unlockCountByMainBuildingLevel)
    ? meta.unlockCountByMainBuildingLevel
    : [];

  if (steps.length === 0) return null;

  const hqLevel = getHighestExistingBuildingLevel(state, "hq");
  for (const step of steps) {
    const reqLevel = Math.max(1, Number(step.requiredMainBuildingLevel) || 1);
    if (hqLevel < reqLevel) {
      return {
        requiredMainBuildingLevel: reqLevel,
        allowedPlacedCount: Math.max(0, Number(step.allowedPlacedCount) || 0)
      };
    }
  }

  return null;
}

function getLevelData(buildingId, targetLevel) {
  const id = normalizeBuildingId(buildingId);
  const level = Math.max(1, Number(targetLevel) || 1);

  const verifiedLastShelterLevel =
    verifiedLastShelterBuildingLevelDataAl(
      id,
      level
    );

  if (verifiedLastShelterLevel) {
    return {
      ...verifiedLastShelterLevel,
      cost:
        cloneCostArray(
          verifiedLastShelterLevel.cost
        )
    };
  }

  const verifiedCoverage =
    verifiedLastShelterBuildingLevelStatusAl(
      id,
      level
    );

  if (
    verifiedCoverage.mapped &&
    verifiedCoverage.withinDeclaredMax &&
    !verifiedCoverage.verified
  ) {
    return {
      source:
        "last_shelter_verified_level_gap",
      unavailable:true,
      buildingId:id,
      buildingTypeId:
        verifiedCoverage.buildingTypeId,
      targetLevel:level,
      maxLevelFromXml:
        verifiedCoverage.maxLevel,
      buildTimeSeconds:0,
      productionPerTick:0,
      storageCapacityBonus:0,
      specialEffectValue:0,
      cost:[]
    };
  }

  const cfg = EXTERNAL_BUILDING_LEVEL_CONFIG[id];
  if (cfg && Array.isArray(cfg.levels) && cfg.levels.length > 0) {
    const index = level - 1;

if (index >= 0 && index < cfg.levels.length) {
  return {
    buildTimeSeconds: Math.max(
      0,
      Number(cfg.levels[index].buildTimeSeconds) || 0
    ),

    productionPerTick: Math.max(
      0,
      Number(cfg.levels[index].productionPerTick) || 0
    ),

    storageCapacityBonus: Math.max(
      0,
      Number(cfg.levels[index].storageCapacityBonus) || 0
    ),

    specialEffectValue: Math.max(
      0,
      Number(cfg.levels[index].specialEffectValue) || 0
    ),

    cost: cloneCostArray(cfg.levels[index].cost)
  };
}

  }

  return null;
}

function getMaxLevelForBuilding(buildingId) {
  const id = normalizeBuildingId(buildingId);

  const verifiedLastShelterMaxLevel =
    verifiedLastShelterBuildingMaxLevelAl(
      id
    );

  if (
    verifiedLastShelterMaxLevel >
    0
  ) {
    return verifiedLastShelterMaxLevel;
  }

  const meta = getDefinitionMeta(id);

  if (meta && Number.isFinite(meta.maxLevel)) {
    return Math.max(1, Number(meta.maxLevel) || 1);
  }

  const cfg = EXTERNAL_BUILDING_LEVEL_CONFIG[id];
  if (cfg && Array.isArray(cfg.levels) && cfg.levels.length > 0) {
    return cfg.levels.length;
  }

  // Unknown/unverified building types must not receive an invented level cap.
  return 0;
}

function hasEnoughResources(state, costArray) {
  ensureResourcesObject(state);

  for (const item of costArray || []) {
    const key = normalizeResourceKey(item.type);
    const need = Math.max(0, Number(item.amount) || 0);
    const have = Number(state.resources[key]) || 0;

    if (have < need) {
      return {
        ok: false,
        resource: key,
        need,
        have
      };
    }
  }

  return { ok: true };
}

function spendResources(state, costArray) {
  ensureResourcesObject(state);

  for (const item of costArray || []) {
    const key = normalizeResourceKey(item.type);
    const amount = Math.max(0, Number(item.amount) || 0);
    state.resources[key] = Math.max(0, (Number(state.resources[key]) || 0) - amount);
  }
}

function isGarageBuildingId(buildingId) {
  const id = normalizeBuildingId(buildingId);
  return id === "garage" || id.startsWith("garage_");
}

function isUpgradeDisabledBuildingId(buildingId) {
  const id = normalizeBuildingId(buildingId);

  if (id === "command_center") {
    return true;
  }

  return getMaxLevelForBuilding(id) <= 1;
}

function getCompletedGarageCount(state) {
  if (!state || !Array.isArray(state.buildings)) return 0;

  let count = 0;
  for (const building of state.buildings) {
    if (!building) continue;
    if (!isGarageBuildingId(building.buildingId)) continue;
    if (!building.isCompleted) continue;
    count++;
  }

  return count;
}

function refreshBuilderCapacity(state) {
  if (!state) return;

  if (!state.builders || typeof state.builders !== "object") {
    state.builders = {};
  }

  if (!Array.isArray(state.builders.jobs)) {
    state.builders.jobs = [];
  }

  const baseBuilders = 1;
  const completedGarageCount = getCompletedGarageCount(state);
  const maxBuilders = baseBuilders + completedGarageCount;

  let busyBuilders = 0;
  for (const job of state.builders.jobs) {
    if (!job || job.isCompleted) continue;

    const slots = Math.max(
      1,
      Number(job.builderSlotsRequired) || getBuilderSlotsRequiredForBuilding(job.buildingId)
    );

    busyBuilders += slots;
  }

  const freeBuilders = Math.max(0, maxBuilders - busyBuilders);

  state.builders.baseBuilders = baseBuilders;
  state.builders.completedGarageCount = completedGarageCount;
  state.builders.maxBuilders = maxBuilders;
  state.builders.busyBuilders = busyBuilders;
  state.builders.freeBuilders = freeBuilders;
}

function hasUnfinishedBuildingOfSameType(state, buildingId) {
  if (!state || !Array.isArray(state.buildings)) return false;

  const normalizedId = normalizeBuildingId(buildingId);

  for (const building of state.buildings) {
    if (!building) continue;
    if (normalizeBuildingId(building.buildingId) !== normalizedId) continue;
    if (building.isCompleted) continue;
    return true;
  }

  return false;
}

const PORT = process.env.PORT || 3001;

const runtimeDeployConfig =
  runtimeDeployConfiginiYoxla(
    runtimeDeployConfiginiAl()
  );

const runtimeDeployPublicInfo =
  runtimeDeployPublicMelumatiniAl(
    runtimeDeployConfig
  );

const {
  players,
  connections
} = require("./runtime_registry");
const {
  createRuntimeRedisBus
} = require("./runtime_redis");
const {
  runtimeYayiminiYereldeGonder
} = require("./mesajlasma_handler");
const {
  dinamikLayerRuntimeMelumatiniHazirla
} = require("./dovlet_xerite_layer_handler");
const {
  runtimeOxu:
    dovletKonvoyRuntimeOxu
} = require("./dovlet_konvoy_runtime_postgres");
const {
  RuntimeDeadlineScheduler
} = require("./runtime_deadline_scheduler");
const {
  authoritativeDeadlineProcessorYarat
} = require("./runtime_deadline_authoritative");
const {
  DEFAULT_PRODUCTION_TICK_MS,
  ensureProductionClock,
  consumeProductionTicks
} = require("./runtime_production_clock");
const {
  RuntimeCommandRouter
} = require("./runtime_command_router");
const {
  coreReadCommandleriniQeydEt
} = require("./runtime_core_read_commands");
const {
  authCommandiniQeydEt
} = require("./runtime_auth_command");
const {
  gameplayMutationCommandleriniQeydEt
} = require("./runtime_gameplay_mutation_commands");
const {
  buildCommandleriniQeydEt
} = require("./runtime_build_commands");
const {
  mapMutationCommandleriniQeydEt
} = require("./runtime_map_mutation_commands");
const {
  accountCommandleriniQeydEt
} = require("./runtime_account_commands");
const {
  lastShelterItemCommandleriniQeydEt
} = require("./runtime_last_shelter_item_commands");

const {
  lastShelterTutorialCommandiniQeydEt
} = require("./runtime_last_shelter_tutorial_command");
const {
  lastShelterWorldCupCommandleriniQeydEt
} = require("./runtime_last_shelter_worldcup_commands");

const {
  lastShelterResourceCommandiniQeydEt
} = require("./runtime_last_shelter_resource_command");

const {
  lastShelterEconomyReferenceCommandleriniQeydEt
} = require("./runtime_last_shelter_economy_reference_commands");
const {
  lastShelterEngagementCommandleriniQeydEt
} = require("./runtime_last_shelter_engagement_commands");
const {
  lastShelterMissionCommandleriniQeydEt
} = require("./runtime_last_shelter_mission_commands");
const {
  lastShelterBuildingReferenceCommandleriniQeydEt
} = require("./runtime_last_shelter_building_reference_commands");
const {
  lastShelterQueueScienceCommandleriniQeydEt
} = require("./runtime_last_shelter_queue_science_commands");
const {
  lastShelterTroopReferenceCommandleriniQeydEt
} = require("./runtime_last_shelter_troop_reference_commands");
const {
  lastShelterInitPayloadHazirla,
  lastShelterInitCommandiniQeydEt
} = require("./runtime_last_shelter_init_command");
const {
  requestIdAl,
  correlatedSendYarat
} = require("./runtime_protocol_envelope");
const {
  RuntimeWebSocketGuard,
  websocketRuntimeConfigFromEnv
} = require("./runtime_ws_guard");
const {
  stateIdempotencyExecutorYarat
} = require("./runtime_request_idempotency");
const {
  occupyStateCenterPostgresClient
} = require("./world_state_center_postgres");
const {
  postgresAuthoritativeMutationExecutorYarat
} = require("./runtime_pg_authoritative_mutation");
const {
  runtimeStateSyncControllerYarat
} = require("./runtime_state_sync");
const {
  runtimeWorldMapSyncControllerYarat
} = require("./runtime_world_map_sync");
const {
  worldStateOyuncuMutasiyasiniPostgresIleIcraEt
} = require("./world_state_mutasiya_postgres");
const {
  worldStateMetadatalariniAl,
  worldStatePlayerSaylariniAl
} = require("./world_state_assignment_postgres");
const {
  dovletBazalariniAl,
  dovletBazalariniBirbasaPostgresdenAlClient,
  dovletBazaKeshiniTemizle
} = require("./dovlet_baza_kataloqu_postgres");
const {
  oyuncuMutasiyaKilidiIleIcraEt
} = require("./server_oyuncu_mutasiya_kilidi");
const {
  pvpZeroingRecallDeadlineAtMs,
  pvpZeroingPendingRecalliniBerpaEt
} = require("./pvp_zeroing_recall_deadline");
const {
  pvpZeroingKonvoyRecalliniPostCommitIcraEt
} = require("./pvp_zeroing_konvoy_recall_postcommit");

const STATE_CENTER_UNLOCK_DELAY_MS = 30 * 24 * 60 * 60 * 1000;
const STATE_NEW_PLAYER_SOFT_CAP = 200;

const STATE_LOCAL_MAP_CONFIG = {
  width: 1024,
  height: 1024,
  centerX: 512,
  centerZ: 512,
  innerZoneRadius: 140,
  middleZoneRadius: 280,
  outerZoneRadius: 460,
  newPlayerSpawnMinRadius: 330,
  newPlayerSpawnMaxRadius: 460,
  minBaseDistance: 18,
  maxSpawnAttempts: 200
};


const STATE_WORLD_OBJECT_CONFIG = {
  resourceSitesPerState: 18,
  infectedSitesPerState: 12,
  neutralCitiesPerState: 6
};

function createSeededRng(seed) {
  let s = (Number(seed) || 1) >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pickRandomPointInRing(rng, centerX, centerZ, minRadius, maxRadius, width, height) {
  const angle = rng() * Math.PI * 2;
  const radius = minRadius + (rng() * Math.max(0, (maxRadius - minRadius)));

  const x = Math.round(centerX + Math.cos(angle) * radius);
  const z = Math.round(centerZ + Math.sin(angle) * radius);

  return {
    x: clampNumber(x, 0, Math.max(0, width - 1)),
    z: clampNumber(z, 0, Math.max(0, height - 1))
  };
}

function createStateWorldObjects(stateId, localMap) {
  const width = Number(localMap?.width) || STATE_LOCAL_MAP_CONFIG.width;
  const height = Number(localMap?.height) || STATE_LOCAL_MAP_CONFIG.height;
  const centerX = Number(localMap?.centerX) || STATE_LOCAL_MAP_CONFIG.centerX;
  const centerZ = Number(localMap?.centerZ) || STATE_LOCAL_MAP_CONFIG.centerZ;
  const innerRadius = Number(localMap?.innerZoneRadius) || STATE_LOCAL_MAP_CONFIG.innerZoneRadius;
  const middleRadius = Number(localMap?.middleZoneRadius) || STATE_LOCAL_MAP_CONFIG.middleZoneRadius;
  const outerRadius = Number(localMap?.outerZoneRadius) || STATE_LOCAL_MAP_CONFIG.outerZoneRadius;

  const rng = createSeededRng((Number(stateId) || 1) * 7919);

  const resourceTypes = ["food", "water", "wood", "iron", "fuel"];
  const resources = [];
  const infected = [];
  const neutralCities = [];

  for (let i = 0; i < STATE_WORLD_OBJECT_CONFIG.resourceSitesPerState; i++) {
    const ring = i < 10
      ? { min: middleRadius + 20, max: outerRadius - 10, zone: "outer" }
      : i < 15
        ? { min: innerRadius + 20, max: middleRadius - 10, zone: "middle" }
        : { min: 25, max: innerRadius - 15, zone: "inner_green" };

    const point = pickRandomPointInRing(rng, centerX, centerZ, ring.min, ring.max, width, height);

    resources.push({
      id: `state_${stateId}_resource_${i + 1}`,
      x: point.x,
      z: point.z,
      zone: ring.zone,
      resourceType: resourceTypes[i % resourceTypes.length],
      levelBand: ring.zone === "outer" ? 1 : ring.zone === "middle" ? 2 : 3
    });
  }

  for (let i = 0; i < STATE_WORLD_OBJECT_CONFIG.infectedSitesPerState; i++) {
    const ring = i < 6
      ? { min: middleRadius + 15, max: outerRadius - 10, zone: "outer" }
      : i < 10
        ? { min: innerRadius + 15, max: middleRadius - 10, zone: "middle" }
        : { min: 20, max: innerRadius - 15, zone: "inner_green" };

    const point = pickRandomPointInRing(rng, centerX, centerZ, ring.min, ring.max, width, height);

    infected.push({
      id: `state_${stateId}_infected_${i + 1}`,
      x: point.x,
      z: point.z,
      zone: ring.zone,
      levelBand: ring.zone === "outer" ? 1 : ring.zone === "middle" ? 2 : 3
    });
  }

  for (let i = 0; i < STATE_WORLD_OBJECT_CONFIG.neutralCitiesPerState; i++) {
    const ring = i < 3
      ? { min: innerRadius + 20, max: middleRadius - 20, zone: "middle" }
      : { min: 30, max: innerRadius - 20, zone: "inner_green" };

    const point = pickRandomPointInRing(rng, centerX, centerZ, ring.min, ring.max, width, height);

    neutralCities.push({
      id: `state_${stateId}_city_${i + 1}`,
      x: point.x,
      z: point.z,
      zone: ring.zone,
      levelBand: ring.zone === "middle" ? 2 : 3
    });
  }

  return {
    resources,
    infected,
    neutralCities
  };
}

const worldRuntime = {
  nextStateId: 1,
  activeStateIdForNewPlayers: 1,
  states: {}
};

// ============================================================
// BASIC HELPERS
// ============================================================

function nowMs() {
  return Date.now();
}

function safeJsonParse(text) {
  try {
    return [JSON.parse(text), null];
  } catch (e) {
    return [null, e];
  }
}

const websocketRuntimeConfig =
  websocketRuntimeConfigFromEnv(
    process.env
  );

const websocketGuard =
  new RuntimeWebSocketGuard(
    websocketRuntimeConfig
  );

function send(ws, obj) {
  return websocketGuard.sendJson(
    ws,
    obj
  );
}

const runtimeStateSync =
  runtimeStateSyncControllerYarat({
    getOrCreatePlayerState,
    updateServerTime,
    withPlayerLock:
      oyuncuMutasiyaKilidiIleIcraEt,
    hasLocalPlayer:
      playerId =>
        connections.has(
          playerId
        ),
    schedulePlayerDeadline,
    pushStateToPlayerConnections
  });

connections.configureLastLocalDisconnectHandler(
  playerId =>
    runtimeStateSync
      .markStale(
        playerId
      )
);

const runtimeWorldMapSync =
  runtimeWorldMapSyncControllerYarat({
    getWorldStateRuntime,
    clearBaseCache:
      dovletBazaKeshiniTemizle,
    pushStateLocalMap:
      pushStateLocalMapToStatePlayersAuthoritative,
    pushWorldMap:
      async () => {
        await pushWorldMapToAllAuthedPlayers();
      },
    pushDynamicMap:
      pushStateDynamicMapToStatePlayers,
    nowMs
  });

const runtimeBus = createRuntimeRedisBus({
  onDirectMessage:
    async (message) => {
      const stateSyncHandled =
        await runtimeStateSync
          .handleDirect(
            message
          );

      if (stateSyncHandled) {
        return;
      }

      connections.deliverLocal(
        message.playerId,
        message.payload,
        send
      );
    },

  onBroadcastMessage:
    async (message) => {
      const worldMapHandled =
        await runtimeWorldMapSync
          .handleBroadcast(
            message
          );

      if (worldMapHandled) {
        return;
      }

      runtimeYayiminiYereldeGonder(
        message,
        {
          connections,
          send,
          getOrCreatePlayerState
        }
      );
    }
});

connections.configureRemotePublisher(
  (playerId, payload) =>
    runtimeBus.publishToPlayer(playerId, payload)
);

const authoritativeDeadlineProcessor =
  authoritativeDeadlineProcessorYarat({
    getPlayerState:
      playerId =>
        players.get(
          playerId
        ),
    withPlayerLock:
      oyuncuMutasiyaKilidiIleIcraEt,
    settlePlayerTimeline,
    nowMs,
    publishInvalidation:
      (playerId, metadata) =>
        runtimeStateSync
          .publishInvalidation(
            runtimeBus,
            playerId,
            metadata
          )
  });

const deadlineScheduler = new RuntimeDeadlineScheduler({
  now: nowMs,
  onDue: processPlayerDeadline
});

function updateServerTime(state) {
  state.serverTimeUnixMs = nowMs();
}

function makeStateDisplayName(stateId) {
  return "State#" + stateId;
}

function getDistanceSquared(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz;
}

function createWorldStateRuntime(
  stateId,
  metadata = null
) {
  const info =
    metadata &&
    typeof metadata === "object"
      ? metadata
      : {};

  const createdAtMs =
    Math.max(
      0,
      Number(
        info.createdAtMs
      ) || nowMs()
    );

  const centerUnlockAtMs =
    Math.max(
      createdAtMs,
      Number(
        info.centerUnlockAtMs
      ) ||
      (
        createdAtMs +
        STATE_CENTER_UNLOCK_DELAY_MS
      )
    );

  const localMap = {
    width: STATE_LOCAL_MAP_CONFIG.width,
    height: STATE_LOCAL_MAP_CONFIG.height,
    centerX: STATE_LOCAL_MAP_CONFIG.centerX,
    centerZ: STATE_LOCAL_MAP_CONFIG.centerZ,
    innerZoneRadius: STATE_LOCAL_MAP_CONFIG.innerZoneRadius,
    middleZoneRadius: STATE_LOCAL_MAP_CONFIG.middleZoneRadius,
    outerZoneRadius: STATE_LOCAL_MAP_CONFIG.outerZoneRadius
  };

  return {
    stateId,
    displayName:
      (
        typeof info.displayName ===
          "string" &&
        info.displayName.trim()
      )
        ? info.displayName.trim()
        : makeStateDisplayName(
            stateId
          ),
    createdAtMs,
    centerUnlockAtMs,
    presidentPlayerId:
      info.presidentPlayerId ||
      null,
    presidentAllianceId:
      info.presidentAllianceId ||
      null,
    activeForNewPlayers: false,
    isOpen:
      info.isOpen !== false,
    playerIds: [],
    localMap,
    worldObjects: createStateWorldObjects(stateId, localMap),
    centerBuilding: {
      x: localMap.centerX,
      z: localMap.centerZ,
      unlockAtMs: centerUnlockAtMs,
      isUnlocked: false,
      occupiedByPlayerId:
        info.presidentPlayerId ||
        null,
      occupiedByAllianceId:
        info.presidentAllianceId ||
        null,
      occupiedAtMs:
        Math.max(
          0,
          Number(
            info.occupiedAtMs
          ) || 0
        )
    }
  };
}

function worldRuntimeMetadatalariniTetbiqEt(
  metadataList
) {
  const list =
    Array.isArray(
      metadataList
    )
      ? metadataList
      : [];

  if (
    !worldRuntime.states ||
    typeof worldRuntime.states !==
      "object"
  ) {
    worldRuntime.states = {};
  }

  let maxStateId = 0;
  let activeStateId = 0;

  for (const metadata of list) {
    const stateId =
      Number(
        metadata &&
        metadata.stateId
      );

    if (
      !Number.isInteger(
        stateId
      ) ||
      stateId <= 0
    ) {
      continue;
    }

    maxStateId =
      Math.max(
        maxStateId,
        stateId
      );

    if (
      metadata.isOpen !== false
    ) {
      activeStateId =
        Math.max(
          activeStateId,
          stateId
        );
    }

    const existing =
      worldRuntime.states[
        String(stateId)
      ];

    const runtime =
      createWorldStateRuntime(
        stateId,
        metadata
      );

    runtime.revision =
      Math.max(
        0,
        Number(
          metadata &&
          metadata.revision
        ) || 0
      );

    if (
      existing &&
      Array.isArray(
        existing.playerIds
      )
    ) {
      runtime.playerIds =
        Array.from(
          new Set(
            existing.playerIds
              .filter(Boolean)
          )
        );
    }

    worldRuntime.states[
      String(stateId)
    ] = runtime;
  }

  if (maxStateId > 0) {
    worldRuntime.nextStateId =
      Math.max(
        worldRuntime.nextStateId,
        maxStateId + 1
      );
  }

  if (activeStateId > 0) {
    worldRuntime
      .activeStateIdForNewPlayers =
        activeStateId;
  }

  if (list.length > 0) {
    refreshWorldRuntimeFlags();
  }

  return list.length;
}

function worldStateRuntimeiniPlacementdenTeminEt(
  placement
) {
  const stateId =
    Number(
      placement &&
      placement.stateId
    );

  if (
    !Number.isInteger(stateId) ||
    stateId <= 0
  ) {
    return null;
  }

  let runtime =
    worldRuntime.states[
      String(stateId)
    ];

  const metadata = {
    stateId,
    displayName:
      placement.stateName ||
      makeStateDisplayName(
        stateId
      ),
    createdAtMs:
      Number(
        placement.stateCreatedAtMs
      ) || 0,
    centerUnlockAtMs:
      Number(
        placement.centerUnlockAtMs
      ) || 0,
    isOpen: true
  };

  if (!runtime) {
    runtime =
      createWorldStateRuntime(
        stateId,
        metadata
      );

    worldRuntime.states[
      String(stateId)
    ] = runtime;
  }
  else {
    if (
      metadata.createdAtMs > 0
    ) {
      runtime.createdAtMs =
        metadata.createdAtMs;
    }

    if (
      metadata.centerUnlockAtMs > 0
    ) {
      runtime.centerUnlockAtMs =
        metadata.centerUnlockAtMs;

      if (
        runtime.centerBuilding
      ) {
        runtime.centerBuilding
          .unlockAtMs =
            metadata
              .centerUnlockAtMs;
      }
    }

    if (
      metadata.displayName
    ) {
      runtime.displayName =
        metadata.displayName;
    }
  }

  worldRuntime.nextStateId =
    Math.max(
      worldRuntime.nextStateId,
      stateId + 1
    );

  const currentMax =
    Math.max(
      0,
      ...Object.values(
        worldRuntime.states
      )
        .filter(
          item =>
            item &&
            item.isOpen !== false
        )
        .map(
          item =>
            Number(
              item.stateId
            ) || 0
        )
    );

  if (
    stateId >= currentMax
  ) {
    worldRuntime
      .activeStateIdForNewPlayers =
        stateId;
  }

  refreshWorldRuntimeFlags();

  return runtime;
}

function ensureWorldRuntime() {
  if (!worldRuntime.states || typeof worldRuntime.states !== "object") {
    worldRuntime.states = {};
  }

  if (!Number.isInteger(worldRuntime.nextStateId) || worldRuntime.nextStateId < 1) {
    worldRuntime.nextStateId = 1;
  }

  if (Object.keys(worldRuntime.states).length === 0) {
    const firstState = createWorldStateRuntime(worldRuntime.nextStateId++);
    worldRuntime.states[String(firstState.stateId)] = firstState;
    worldRuntime.activeStateIdForNewPlayers = firstState.stateId;
  }

  if (!worldRuntime.states[String(worldRuntime.activeStateIdForNewPlayers)]) {
    const sortedStates = Object.values(worldRuntime.states).sort((a, b) => a.stateId - b.stateId);
    worldRuntime.activeStateIdForNewPlayers = sortedStates.length > 0 ? sortedStates[sortedStates.length - 1].stateId : 1;
  }

  refreshWorldRuntimeFlags();
}

function refreshWorldRuntimeFlags() {
  const now = nowMs();

  for (const stateRuntime of Object.values(worldRuntime.states)) {
    if (!stateRuntime) continue;

    if (!Array.isArray(stateRuntime.playerIds)) {
      stateRuntime.playerIds = [];
    }

    stateRuntime.playerIds = Array.from(new Set(stateRuntime.playerIds.filter(Boolean)));
    stateRuntime.activeForNewPlayers = stateRuntime.stateId === worldRuntime.activeStateIdForNewPlayers;

    if (typeof stateRuntime.isOpen !== "boolean") {
      stateRuntime.isOpen = true;
    }

    if (!stateRuntime.worldObjects || typeof stateRuntime.worldObjects !== "object") {
      stateRuntime.worldObjects = createStateWorldObjects(stateRuntime.stateId, stateRuntime.localMap);
    }

    if (!stateRuntime.centerBuilding || typeof stateRuntime.centerBuilding !== "object") {
      stateRuntime.centerBuilding = {
        x: Number(stateRuntime.localMap?.centerX) || STATE_LOCAL_MAP_CONFIG.centerX,
        z: Number(stateRuntime.localMap?.centerZ) || STATE_LOCAL_MAP_CONFIG.centerZ,
        unlockAtMs: Number(stateRuntime.centerUnlockAtMs) || (now + STATE_CENTER_UNLOCK_DELAY_MS),
        isUnlocked: false,
        occupiedByPlayerId: null,
        occupiedByAllianceId: null,
        occupiedAtMs: 0
      };
    }

    if (typeof stateRuntime.centerBuilding.occupiedAtMs !== "number") {
      stateRuntime.centerBuilding.occupiedAtMs = 0;
    }

    stateRuntime.centerBuilding.isUnlocked = now >= (Number(stateRuntime.centerUnlockAtMs) || 0);

    if (stateRuntime.centerBuilding.occupiedByPlayerId) {
      stateRuntime.presidentPlayerId = stateRuntime.centerBuilding.occupiedByPlayerId;
    }
    if (stateRuntime.centerBuilding.occupiedByAllianceId) {
      stateRuntime.presidentAllianceId = stateRuntime.centerBuilding.occupiedByAllianceId;
    }
  }
}

function getWorldStateRuntime(stateId) {
  ensureWorldRuntime();
  return worldRuntime.states[String(stateId)] || null;
}

function getWorldStatePlayerCount(stateRuntime) {
  if (!stateRuntime || !Array.isArray(stateRuntime.playerIds)) return 0;
  return stateRuntime.playerIds.length;
}

function openNextWorldState() {
  ensureWorldRuntime();

  const newState = createWorldStateRuntime(worldRuntime.nextStateId++);
  worldRuntime.states[String(newState.stateId)] = newState;
  worldRuntime.activeStateIdForNewPlayers = newState.stateId;
  refreshWorldRuntimeFlags();

  console.log("[WORLD_STATE_OPENED]", {
    stateId: newState.stateId,
    createdAtMs: newState.createdAtMs,
    centerUnlockAtMs: newState.centerUnlockAtMs
  });

  return newState;
}

function getOrCreateActiveWorldStateForNewPlayers() {
  ensureWorldRuntime();

  let activeState =
    getWorldStateRuntime(
      worldRuntime
        .activeStateIdForNewPlayers
    );

  if (!activeState) {
    activeState =
      openNextWorldState();
  }

  /*
   * Soft-cap əsasında yeni State açmaq artıq local RAM authority deyil.
   * Bu funksiya yalnız snapshot olmayan oyunçu üçün provisional placement verir;
   * real State seçimi world_state_assignment_postgres.js daxilində global lock
   * altında aparılır.
   */
  return activeState;
}

function registerPlayerInWorldState(playerId, stateRuntime) {
  if (!playerId || !stateRuntime) return;

  /*
   * Authoritative restore oyunçunu başqa State-ə keçiribsə provisional/local
   * registry üzvlüyünü köhnə State-dən çıxarırıq.
   */
  for (
    const otherRuntime of
    Object.values(
      worldRuntime.states || {}
    )
  ) {
    if (
      !otherRuntime ||
      !Array.isArray(
        otherRuntime.playerIds
      )
    ) {
      continue;
    }

    otherRuntime.playerIds =
      otherRuntime.playerIds
        .filter(
          id =>
            id !== playerId
        );
  }

  if (!Array.isArray(stateRuntime.playerIds)) {
    stateRuntime.playerIds = [];
  }

  if (!stateRuntime.playerIds.includes(playerId)) {
    stateRuntime.playerIds.push(playerId);
  }
}

function isSpawnPositionFarEnough(stateRuntime, baseX, baseZ) {
  const minDistanceSq = STATE_LOCAL_MAP_CONFIG.minBaseDistance * STATE_LOCAL_MAP_CONFIG.minBaseDistance;

  if (!stateRuntime || !Array.isArray(stateRuntime.playerIds)) return true;

  for (const otherPlayerId of stateRuntime.playerIds) {
    const otherState = players.get(otherPlayerId);
    if (!otherState || !otherState.worldPlacement) continue;

    const otherX = Number(otherState.worldPlacement.baseX);
    const otherZ = Number(otherState.worldPlacement.baseZ);

    if (!Number.isFinite(otherX) || !Number.isFinite(otherZ)) continue;

    if (getDistanceSquared(baseX, baseZ, otherX, otherZ) < minDistanceSq) {
      return false;
    }
  }

  return true;
}

function pickRandomSpawnForState(stateRuntime) {
  const centerX = Number(stateRuntime?.localMap?.centerX) || STATE_LOCAL_MAP_CONFIG.centerX;
  const centerZ = Number(stateRuntime?.localMap?.centerZ) || STATE_LOCAL_MAP_CONFIG.centerZ;
  const width = Number(stateRuntime?.localMap?.width) || STATE_LOCAL_MAP_CONFIG.width;
  const height = Number(stateRuntime?.localMap?.height) || STATE_LOCAL_MAP_CONFIG.height;

  for (let attempt = 0; attempt < STATE_LOCAL_MAP_CONFIG.maxSpawnAttempts; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const radius =
      STATE_LOCAL_MAP_CONFIG.newPlayerSpawnMinRadius +
      Math.random() * (STATE_LOCAL_MAP_CONFIG.newPlayerSpawnMaxRadius - STATE_LOCAL_MAP_CONFIG.newPlayerSpawnMinRadius);

    const baseX = Math.round(centerX + Math.cos(angle) * radius);
    const baseZ = Math.round(centerZ + Math.sin(angle) * radius);

    if (baseX < 0 || baseX >= width) continue;
    if (baseZ < 0 || baseZ >= height) continue;
    if (!isSpawnPositionFarEnough(stateRuntime, baseX, baseZ)) continue;

    return {
      baseX,
      baseZ,
      spawnZone: "outer"
    };
  }

  const fallbackOffset = getWorldStatePlayerCount(stateRuntime) * STATE_LOCAL_MAP_CONFIG.minBaseDistance;

  return {
    baseX: Math.max(0, Math.min(width - 1, centerX - STATE_LOCAL_MAP_CONFIG.newPlayerSpawnMinRadius + fallbackOffset)),
    baseZ: Math.max(0, Math.min(height - 1, centerZ + STATE_LOCAL_MAP_CONFIG.newPlayerSpawnMinRadius)),
    spawnZone: "outer"
  };
}

function makeWorldStateSnapshotForClient(stateRuntime) {
  if (!stateRuntime) return null;

  return {
    stateId: stateRuntime.stateId,
    displayName: stateRuntime.displayName,
    createdAtMs: stateRuntime.createdAtMs,
    centerUnlockAtMs: stateRuntime.centerUnlockAtMs,
    presidentPlayerId: stateRuntime.presidentPlayerId || null,
    presidentAllianceId: stateRuntime.presidentAllianceId || null,
    isOpen: stateRuntime.isOpen !== false,
    activeForNewPlayers: !!stateRuntime.activeForNewPlayers,
    isActiveForNewPlayers: !!stateRuntime.activeForNewPlayers,
    centerUnlocked: !!stateRuntime.centerBuilding?.isUnlocked,
    playerCount: getWorldStatePlayerCount(stateRuntime),
    localMap: {
      width: Number(stateRuntime.localMap?.width) || STATE_LOCAL_MAP_CONFIG.width,
      height: Number(stateRuntime.localMap?.height) || STATE_LOCAL_MAP_CONFIG.height,
      centerX: Number(stateRuntime.localMap?.centerX) || STATE_LOCAL_MAP_CONFIG.centerX,
      centerZ: Number(stateRuntime.localMap?.centerZ) || STATE_LOCAL_MAP_CONFIG.centerZ,
      innerZoneRadius: Number(stateRuntime.localMap?.innerZoneRadius) || STATE_LOCAL_MAP_CONFIG.innerZoneRadius,
      middleZoneRadius: Number(stateRuntime.localMap?.middleZoneRadius) || STATE_LOCAL_MAP_CONFIG.middleZoneRadius,
      outerZoneRadius: Number(stateRuntime.localMap?.outerZoneRadius) || STATE_LOCAL_MAP_CONFIG.outerZoneRadius
    },
    centerBuilding: {
      x: Number(stateRuntime.centerBuilding?.x) || STATE_LOCAL_MAP_CONFIG.centerX,
      z: Number(stateRuntime.centerBuilding?.z) || STATE_LOCAL_MAP_CONFIG.centerZ,
      unlockAtMs: Number(stateRuntime.centerBuilding?.unlockAtMs) || Number(stateRuntime.centerUnlockAtMs) || 0,
      isUnlocked: !!stateRuntime.centerBuilding?.isUnlocked,
      occupiedByPlayerId: stateRuntime.centerBuilding?.occupiedByPlayerId || null,
      occupiedByAllianceId: stateRuntime.centerBuilding?.occupiedByAllianceId || null,
      occupiedAtMs: Number(stateRuntime.centerBuilding?.occupiedAtMs) || 0
    },
    worldObjectSummary: {
      resourceSiteCount: Array.isArray(stateRuntime.worldObjects?.resources) ? stateRuntime.worldObjects.resources.length : 0,
      infectedSiteCount: Array.isArray(stateRuntime.worldObjects?.infected) ? stateRuntime.worldObjects.infected.length : 0,
      neutralCityCount: Array.isArray(stateRuntime.worldObjects?.neutralCities) ? stateRuntime.worldObjects.neutralCities.length : 0
    }
  };
}

function buildWorldMapPayloadForClient() {
  ensureWorldRuntime();

  const states = Object.values(worldRuntime.states)
    .sort((a, b) => a.stateId - b.stateId)
    .map(makeWorldStateSnapshotForClient);

  return {
    activeStateIdForNewPlayers: worldRuntime.activeStateIdForNewPlayers,
    stateCount: states.length,
    states
  };
}

async function buildWorldMapPayloadForClientAuthoritative() {
  const [
    metadata,
    counts
  ] =
    await Promise.all([
      worldStateMetadatalariniAl(),
      worldStatePlayerSaylariniAl()
    ]);

  worldRuntimeMetadatalariniTetbiqEt(
    metadata
  );

  if (
    !Array.isArray(metadata) ||
    metadata.length === 0
  ) {
    const emptyPayload =
      buildWorldMapPayloadForClient();

    emptyPayload.states =
      emptyPayload.states.map(
        state => ({
          ...state,
          playerCount: 0
        })
      );

    emptyPayload.authority =
      "postgres_empty_bootstrap";

    return emptyPayload;
  }

  const states =
    metadata
      .map(item => {
        const runtime =
          getWorldStateRuntime(
            item.stateId
          );

        const snapshot =
          makeWorldStateSnapshotForClient(
            runtime
          );

        if (!snapshot) {
          return null;
        }

        snapshot.playerCount =
          counts.get(
            item.stateId
          ) ||
          0;

        return snapshot;
      })
      .filter(Boolean);

  return {
    activeStateIdForNewPlayers:
      worldRuntime
        .activeStateIdForNewPlayers,
    stateCount:
      states.length,
    states,
    authority:
      "postgres_snapshot"
  };
}

function applyWorldPlacementToPlayerState(state, stateRuntime, spawnInfo) {
  if (!state || !stateRuntime || !spawnInfo) return;

  const existingPlacement =
    state.worldPlacement &&
    typeof state.worldPlacement ===
      "object"
      ? state.worldPlacement
      : {};

  state.worldPlacement = {
    ...existingPlacement,
    stateId: stateRuntime.stateId,
    stateName: stateRuntime.displayName,
    baseX: spawnInfo.baseX,
    baseZ: spawnInfo.baseZ,
    spawnZone:
      spawnInfo.spawnZone ||
      existingPlacement.spawnZone ||
      "outer",
    stateCreatedAtMs:
      stateRuntime.createdAtMs,
    centerUnlockAtMs:
      stateRuntime.centerUnlockAtMs,
    centerBuildingX:
      Number(
        stateRuntime.centerBuilding?.x
      ) ||
      STATE_LOCAL_MAP_CONFIG.centerX,
    centerBuildingZ:
      Number(
        stateRuntime.centerBuilding?.z
      ) ||
      STATE_LOCAL_MAP_CONFIG.centerZ
  };

  state.worldMap = {
    ...(
      state.worldMap &&
      typeof state.worldMap ===
        "object"
        ? state.worldMap
        : {}
    ),
    activeStateIdForNewPlayers:
      worldRuntime
        .activeStateIdForNewPlayers,
    currentStateId:
      stateRuntime.stateId,
    currentStateSnapshot:
      makeWorldStateSnapshotForClient(
        stateRuntime
      )
  };
}

function canTeleportBaseInsideState(stateRuntime, playerId, targetBaseX, targetBaseZ) {
  if (!stateRuntime) {
    return { ok: false, message: "World state not found" };
  }

  if (!Number.isInteger(targetBaseX) || !Number.isInteger(targetBaseZ)) {
    return { ok: false, message: "Invalid base coordinates" };
  }

  const width = Number(stateRuntime.localMap?.width) || STATE_LOCAL_MAP_CONFIG.width;
  const height = Number(stateRuntime.localMap?.height) || STATE_LOCAL_MAP_CONFIG.height;

  if (targetBaseX < 0 || targetBaseX >= width || targetBaseZ < 0 || targetBaseZ >= height) {
    return { ok: false, message: "Target base coordinates are outside the state map" };
  }

  const centerX = Number(stateRuntime.centerBuilding?.x) || Number(stateRuntime.localMap?.centerX) || STATE_LOCAL_MAP_CONFIG.centerX;
  const centerZ = Number(stateRuntime.centerBuilding?.z) || Number(stateRuntime.localMap?.centerZ) || STATE_LOCAL_MAP_CONFIG.centerZ;

  if (targetBaseX === centerX && targetBaseZ === centerZ) {
    return { ok: false, message: "Cannot teleport onto the state center" };
  }

  const minDistanceSq = STATE_LOCAL_MAP_CONFIG.minBaseDistance * STATE_LOCAL_MAP_CONFIG.minBaseDistance;

  for (const otherPlayerId of stateRuntime.playerIds || []) {
    if (!otherPlayerId || otherPlayerId === playerId) continue;

    const otherState = players.get(otherPlayerId);
    if (!otherState || !otherState.worldPlacement) continue;

    const otherX = Number(otherState.worldPlacement.baseX);
    const otherZ = Number(otherState.worldPlacement.baseZ);

    if (!Number.isFinite(otherX) || !Number.isFinite(otherZ)) continue;

    if (getDistanceSquared(targetBaseX, targetBaseZ, otherX, otherZ) < minDistanceSq) {
      return {
        ok: false,
        message: "Target location is too close to another base"
      };
    }
  }

  return { ok: true };
}

function applyPlayerBaseTeleportInsideState(
  state,
  playerId,
  targetBaseX,
  targetBaseZ
) {
  if (!state || !state.worldPlacement) {
    return {
      ok: false,
      message:
        "Player world placement not found"
    };
  }

  const stateId =
    Number(
      state.worldPlacement.stateId
    );

  if (
    !Number.isInteger(stateId) ||
    stateId <= 0
  ) {
    return {
      ok: false,
      message:
        "Player stateId is invalid"
    };
  }

  const stateRuntime =
    getWorldStateRuntime(
      stateId
    );

  if (!stateRuntime) {
    return {
      ok: false,
      message:
        "World state not found"
    };
  }

  const currentBaseX =
    Number(
      state.worldPlacement.baseX
    );

  const currentBaseZ =
    Number(
      state.worldPlacement.baseZ
    );

  const centerX =
    Number(
      stateRuntime.localMap
        ?.centerX
    ) ||
    STATE_LOCAL_MAP_CONFIG.centerX;

  const centerZ =
    Number(
      stateRuntime.localMap
        ?.centerZ
    ) ||
    STATE_LOCAL_MAP_CONFIG.centerZ;

  if (
    currentBaseX === targetBaseX &&
    currentBaseZ === targetBaseZ
  ) {
    return {
      ok: true,
      ignored: true,
      stateId,
      baseX: currentBaseX,
      baseZ: currentBaseZ,
      zone:
        getZoneNameForDistance(
          Math.round(
            Math.sqrt(
              getDistanceSquared(
                currentBaseX,
                currentBaseZ,
                centerX,
                centerZ
              )
            )
          )
        )
    };
  }

  const distance =
    Math.round(
      Math.sqrt(
        getDistanceSquared(
          targetBaseX,
          targetBaseZ,
          centerX,
          centerZ
        )
      )
    );

  const zone =
    getZoneNameForDistance(
      distance
    );

  state.worldPlacement.baseX =
    targetBaseX;

  state.worldPlacement.baseZ =
    targetBaseZ;

  state.worldPlacement.lastTeleportAtMs =
    nowMs();

  state.worldPlacement.currentZone =
    zone;

  if (
    !state.worldMap ||
    typeof state.worldMap !==
      "object"
  ) {
    state.worldMap = {};
  }

  state.worldMap.activeStateIdForNewPlayers =
    worldRuntime.activeStateIdForNewPlayers;

  state.worldMap.currentStateId =
    stateId;

  state.worldMap.currentStateSnapshot =
    makeWorldStateSnapshotForClient(
      stateRuntime
    );

  updateServerTime(state);

  return {
    ok: true,
    ignored: false,
    stateId,
    baseX: targetBaseX,
    baseZ: targetBaseZ,
    zone,
    teleportedAtMs:
      Number(
        state.worldPlacement
          .lastTeleportAtMs
      ) || 0
  };
}

function teleportPlayerBaseInsideState(
  state,
  playerId,
  targetBaseX,
  targetBaseZ
) {
  if (!state || !state.worldPlacement) {
    return {
      ok: false,
      message:
        "Player world placement not found"
    };
  }

  const stateId =
    Number(
      state.worldPlacement.stateId
    );

  if (
    !Number.isInteger(stateId) ||
    stateId <= 0
  ) {
    return {
      ok: false,
      message:
        "Player stateId is invalid"
    };
  }

  const stateRuntime =
    getWorldStateRuntime(
      stateId
    );

  if (!stateRuntime) {
    return {
      ok: false,
      message:
        "World state not found"
    };
  }

  const check =
    canTeleportBaseInsideState(
      stateRuntime,
      playerId,
      targetBaseX,
      targetBaseZ
    );

  if (!check.ok) {
    return check;
  }

  return applyPlayerBaseTeleportInsideState(
    state,
    playerId,
    targetBaseX,
    targetBaseZ
  );
}

function ensurePlayerWorldPlacement(state, playerId) {
  ensureWorldRuntime();

  let stateRuntime = null;
  let spawnInfo = null;

  if (
    state &&
    state.worldPlacement &&
    Number.isInteger(
      Number(
        state.worldPlacement.stateId
      )
    )
  ) {
    const placementStateId =
      Number(
        state.worldPlacement.stateId
      );

    stateRuntime =
      worldRuntime.states[
        String(
          placementStateId
        )
      ] ||
      worldStateRuntimeiniPlacementdenTeminEt(
        state.worldPlacement
      );

    if (stateRuntime) {
      spawnInfo = {
        baseX:
          Number(
            state.worldPlacement.baseX
          ),
        baseZ:
          Number(
            state.worldPlacement.baseZ
          ),
        spawnZone:
          state.worldPlacement.spawnZone ||
          "outer"
      };
    }
  }

  if (!stateRuntime) {
    stateRuntime = getOrCreateActiveWorldStateForNewPlayers();
  }

  if (!spawnInfo || !Number.isFinite(spawnInfo.baseX) || !Number.isFinite(spawnInfo.baseZ)) {
    spawnInfo = pickRandomSpawnForState(stateRuntime);
  }

  registerPlayerInWorldState(
    playerId,
    stateRuntime
  );

  applyWorldPlacementToPlayerState(
    state,
    stateRuntime,
    spawnInfo
  );
}




function occupyStateCenter(stateRuntime, playerId, allianceId = null) {
  if (!stateRuntime || !playerId) {
    return { ok: false, message: "Invalid occupation request" };
  }

  refreshWorldRuntimeFlags();

  if (!stateRuntime.centerBuilding || !stateRuntime.centerBuilding.isUnlocked) {
    return { ok: false, message: "State center is not unlocked yet" };
  }

  if (!Array.isArray(stateRuntime.playerIds) || !stateRuntime.playerIds.includes(playerId)) {
    return { ok: false, message: "Player does not belong to this state" };
  }

  stateRuntime.centerBuilding.occupiedByPlayerId = playerId;
  stateRuntime.centerBuilding.occupiedByAllianceId = allianceId || null;
  stateRuntime.centerBuilding.occupiedAtMs = nowMs();
  stateRuntime.presidentPlayerId = playerId;
  stateRuntime.presidentAllianceId = allianceId || null;

  return {
    ok: true,
    stateId: stateRuntime.stateId,
    occupiedByPlayerId: playerId,
    occupiedByAllianceId: allianceId || null,
    occupiedAtMs: stateRuntime.centerBuilding.occupiedAtMs
  };
}

function getZoneNameForDistance(distance) {
  const d = Math.max(0, Number(distance) || 0);

  if (d <= STATE_LOCAL_MAP_CONFIG.innerZoneRadius) return "inner_green";
  if (d <= STATE_LOCAL_MAP_CONFIG.middleZoneRadius) return "middle";
  return "outer";
}

function buildStateLocalMapPayload(stateId, requestingPlayerId = null) {
  ensureWorldRuntime();

  const stateRuntime = getWorldStateRuntime(stateId);
  if (!stateRuntime) {
    return null;
  }

  refreshWorldRuntimeFlags();

  const centerX = Number(stateRuntime.localMap?.centerX) || STATE_LOCAL_MAP_CONFIG.centerX;
  const centerZ = Number(stateRuntime.localMap?.centerZ) || STATE_LOCAL_MAP_CONFIG.centerZ;

  const bases = [];

  if (Array.isArray(stateRuntime.playerIds)) {
    for (const playerId of stateRuntime.playerIds) {
      const playerState = players.get(playerId);
      if (!playerState || !playerState.worldPlacement) continue;

      const baseX = Number(playerState.worldPlacement.baseX);
      const baseZ = Number(playerState.worldPlacement.baseZ);

      if (!Number.isFinite(baseX) || !Number.isFinite(baseZ)) continue;

      const distance = Math.round(Math.sqrt(getDistanceSquared(baseX, baseZ, centerX, centerZ)));

      bases.push({
        playerId,
        stateId: Number(playerState.worldPlacement.stateId) || stateRuntime.stateId,
        baseX,
        baseZ,
        zone: getZoneNameForDistance(distance),
        spawnZone: playerState.worldPlacement.spawnZone || "outer",
        isSelf: requestingPlayerId ? playerId === requestingPlayerId : false
      });
    }
  }

  return {
    stateId: stateRuntime.stateId,
    displayName: stateRuntime.displayName,
    playerCount: bases.length,
    requestingPlayerId: requestingPlayerId || null,
    localMap: {
      width: Number(stateRuntime.localMap?.width) || STATE_LOCAL_MAP_CONFIG.width,
      height: Number(stateRuntime.localMap?.height) || STATE_LOCAL_MAP_CONFIG.height,
      centerX,
      centerZ,
      innerZoneRadius: Number(stateRuntime.localMap?.innerZoneRadius) || STATE_LOCAL_MAP_CONFIG.innerZoneRadius,
      middleZoneRadius: Number(stateRuntime.localMap?.middleZoneRadius) || STATE_LOCAL_MAP_CONFIG.middleZoneRadius,
      outerZoneRadius: Number(stateRuntime.localMap?.outerZoneRadius) || STATE_LOCAL_MAP_CONFIG.outerZoneRadius
    },
    centerBuilding: {
      x: Number(stateRuntime.centerBuilding?.x) || centerX,
      z: Number(stateRuntime.centerBuilding?.z) || centerZ,
      unlockAtMs: Number(stateRuntime.centerBuilding?.unlockAtMs) || Number(stateRuntime.centerUnlockAtMs) || 0,
      isUnlocked: !!stateRuntime.centerBuilding?.isUnlocked,
      occupiedByPlayerId: stateRuntime.centerBuilding?.occupiedByPlayerId || null,
      occupiedByAllianceId: stateRuntime.centerBuilding?.occupiedByAllianceId || null,
      occupiedAtMs: Number(stateRuntime.centerBuilding?.occupiedAtMs) || 0
    },
    worldObjects: {
      resources: Array.isArray(stateRuntime.worldObjects?.resources) ? stateRuntime.worldObjects.resources : [],
      infected: Array.isArray(stateRuntime.worldObjects?.infected) ? stateRuntime.worldObjects.infected : [],
      neutralCities: Array.isArray(stateRuntime.worldObjects?.neutralCities) ? stateRuntime.worldObjects.neutralCities : []
    },
    zones: {
      outer: {
        minRadius: Number(stateRuntime.localMap?.middleZoneRadius) || STATE_LOCAL_MAP_CONFIG.middleZoneRadius,
        maxRadius: Number(stateRuntime.localMap?.outerZoneRadius) || STATE_LOCAL_MAP_CONFIG.outerZoneRadius
      },
      middle: {
        minRadius: Number(stateRuntime.localMap?.innerZoneRadius) || STATE_LOCAL_MAP_CONFIG.innerZoneRadius,
        maxRadius: Number(stateRuntime.localMap?.middleZoneRadius) || STATE_LOCAL_MAP_CONFIG.middleZoneRadius
      },
      inner_green: {
        minRadius: 0,
        maxRadius: Number(stateRuntime.localMap?.innerZoneRadius) || STATE_LOCAL_MAP_CONFIG.innerZoneRadius
      }
    },
    bases
  };
}

async function sendStateLocalMapToPlayer(ws, playerId) {
  if (!ws || ws.readyState !== WebSocket.OPEN || !playerId) {
    return false;
  }

  const state = players.get(playerId);
  if (!state || !state.worldPlacement) {
    return false;
  }

  const stateId = Number(state.worldPlacement.stateId);
  if (!Number.isInteger(stateId) || stateId <= 0) {
    return false;
  }

  const payload =
    await buildStateLocalMapPayloadAuthoritative(
      stateId,
      playerId
    );

  if (!payload) {
    return false;
  }

  send(ws, {
    type: "state_local_map",
    playerId,
    serverTimeUnixMs: nowMs(),
    payloadJson: JSON.stringify(payload)
  });

  return true;
}


async function sendWorldMapToPlayer(ws, playerId) {
  if (!ws || ws.readyState !== WebSocket.OPEN || !playerId) {
    return false;
  }

  const payload =
    await buildWorldMapPayloadForClientAuthoritative();

  if (!payload) {
    return false;
  }

  send(ws, {
    type: "world_map",
    playerId,
    serverTimeUnixMs: nowMs(),
    payloadJson: JSON.stringify(payload)
  });

  return true;
}

function stateLocalMapBazalariniAuthoritativeHazirla(
  rawBases,
  requestingPlayerId = null
) {
  return (
    Array.isArray(rawBases)
      ? rawBases
      : []
  ).map(item => ({
    ...item,
    zone:
      item && item.zoneId
        ? item.zoneId
        : "outer",
    spawnZone:
      item && item.zoneId
        ? item.zoneId
        : "outer",
    isSelf:
      !!(
        requestingPlayerId &&
        item &&
        item.playerId ===
          requestingPlayerId
      )
  }));
}

async function buildStateLocalMapPayloadAuthoritative(
  stateId,
  requestingPlayerId = null,
  bazaPaketi = null
) {
  const sid =
    Number(stateId);

  if (
    !Number.isInteger(sid) ||
    sid <= 0
  ) {
    return null;
  }

  const payload =
    buildStateLocalMapPayload(
      sid,
      requestingPlayerId
    );

  if (!payload) {
    return null;
  }

  try {
    const paket =
      bazaPaketi ||
      await dovletBazalariniAl(
        sid,
        nowMs()
      );

    const bases =
      stateLocalMapBazalariniAuthoritativeHazirla(
        paket &&
        paket.bases,
        requestingPlayerId
      );

    payload.bases =
      bases;

    payload.playerCount =
      bases.length;

    payload.authority =
      "postgres_snapshot";

    return payload;
  }
  catch (error) {
    console.error(
      "[STATE_LOCAL_MAP] PostgreSQL base catalog unavailable:",
      {
        stateId: sid,
        message:
          error && error.message
            ? error.message
            : String(error)
      }
    );

    // PostgreSQL authoritative rejimdə köhnə local RAM baza siyahısını
    // client-ə düzgün xəritə kimi təqdim etmirik. Caller null-u error/skip
    // kimi idarə edir və növbəti uğurlu read authoritative snapshot qaytarır.
    return null;
  }
}

async function pushStateLocalMapToStatePlayersAuthoritative(
  stateId
) {
  const sid =
    Number(stateId);

  if (
    !Number.isInteger(sid) ||
    sid <= 0
  ) {
    return 0;
  }

  let bazaPaketi = null;

  try {
    bazaPaketi =
      await dovletBazalariniAl(
        sid,
        nowMs()
      );
  }
  catch (error) {
    console.error(
      "[STATE_LOCAL_MAP] Authoritative catalog read failed:",
      {
        stateId: sid,
        message:
          error && error.message
            ? error.message
            : String(error)
      }
    );

    // Bir PostgreSQL xətasını hər local socket üçün yenidən sorğuya
    // çevirmirik; stale RAM xəritəsi də broadcast edilmir.
    return 0;
  }

  let sentCount = 0;

  for (const ws of wss.clients) {
    if (
      !ws ||
      ws.readyState !==
        WebSocket.OPEN
    ) {
      continue;
    }

    const playerId =
      ws._authedPlayerId;

    if (!playerId) {
      continue;
    }

    const playerState =
      players.get(
        playerId
      );

    if (
      !playerState ||
      !playerState.worldPlacement ||
      Number(
        playerState
          .worldPlacement
          .stateId
      ) !== sid
    ) {
      continue;
    }

    const payload =
      await buildStateLocalMapPayloadAuthoritative(
        sid,
        playerId,
        bazaPaketi
      );

    if (!payload) {
      continue;
    }

    send(ws, {
      type:
        "state_local_map",
      playerId,
      serverTimeUnixMs:
        nowMs(),
      payloadJson:
        JSON.stringify(
          payload
        )
    });

    sentCount += 1;
  }

  return sentCount;
}

async function pushStateDynamicMapToStatePlayers(
  stateId
) {
  const sid =
    Number(stateId);

  if (
    !Number.isInteger(sid) ||
    sid <= 0
  ) {
    return 0;
  }

  let runtime;

  try {
    runtime =
      await dovletKonvoyRuntimeOxu(
        sid
      );
  }
  catch (error) {
    console.error(
      "[STATE_DYNAMIC_MAP] Runtime read failed:",
      {
        stateId: sid,
        message:
          error && error.message
            ? error.message
            : String(error)
      }
    );

    return 0;
  }

  const currentNow =
    nowMs();

  let sentCount = 0;

  for (const ws of wss.clients) {
    if (
      !ws ||
      ws.readyState !==
        WebSocket.OPEN
    ) {
      continue;
    }

    const playerId =
      ws._authedPlayerId;

    if (!playerId) {
      continue;
    }

    const playerState =
      players.get(
        playerId
      );

    if (
      !playerState ||
      !playerState.worldPlacement ||
      Number(
        playerState
          .worldPlacement
          .stateId
      ) !== sid
    ) {
      continue;
    }

    const info =
      dinamikLayerRuntimeMelumatiniHazirla(
        runtime,
        sid,
        playerId,
        currentNow
      );

    send(ws, {
      type:
        "state_map_dynamic_result",
      playerId,
      success: true,
      serverTimeUnixMs:
        currentNow,
      info,
      payloadJson:
        JSON.stringify(
          info
        )
    });

    sentCount += 1;
  }

  return sentCount;
}

async function pushWorldMapToAllAuthedPlayers() {
  const worldMap =
    await buildWorldMapPayloadForClientAuthoritative();

  if (!worldMap) {
    return 0;
  }

  const payload =
    JSON.stringify(
      worldMap
    );

  let sentCount = 0;

  for (const ws of wss.clients) {
    if (!ws || ws.readyState !== WebSocket.OPEN) continue;
    if (!ws._authedPlayerId) continue;

    send(ws, {
      type: "world_map",
      playerId: ws._authedPlayerId,
      serverTimeUnixMs: nowMs(),
      payloadJson: payload
    });

    sentCount += 1;
  }

  return sentCount;
}

function makeClientState(state) {
  if (!state || typeof state !== "object") {
    return null;
  }

  // Oyunçu profil məlumatlarını yoxla.
  oyuncuProfiliniTeminEt(state);

  // Oyunçu status sahəsini yoxla.
  oyuncuStatusunuTeminEt(state);

   // OYUNÇU GÜCÜNÜ HESABLA
  oyuncuGucunuYenile(state);
  doyusStatistikasiniTeminEt(state);

  oyuncuStatistikasiniTeminEt(state);
bazaMelumatlariniYenile(state);
  // Missiya mükafatı state-ni yoxla.
  // Resurs tutumlarını yenidən hesabla.
  refreshResourceCaps(state);

  // Əhali və digər xüsusi bina bonuslarını yenidən hesabla.
  refreshSpecialStats(state);

  // Texnologiya məlumatlarını yoxla və yenilə.
  // Last Shelter economy runtimelarini kohne state snapshot-lari ucun de
  // eyni muqavileye normallasdir.
  lastShelterRepayRuntimeTeminEt(state);
  lastShelterVipStoreStateTeminEt(state);

  // State client-e cixmazdan evvel resurs istehsalini cari vaxta qeder
  // bir defe hesabla. Her 5 saniye butun player-leri scan etmeye ehtiyac yoxdur.
  processProductionForState(state, nowMs());

  const clientState = JSON.parse(JSON.stringify(state));

  // Server-authoritative runtime metadatasi client-e cixmir.
  delete clientState.productionRuntime;
  delete clientState.serverRequestIdempotency;

  if (
    clientState.army &&
    clientState.army.trainingQueues &&
    !Array.isArray(clientState.army.trainingQueues)
  ) {
    clientState.army.trainingQueues = Object.values(clientState.army.trainingQueues);
  }

  return clientState;
}

async function pushStateToPlayerConnections(playerId, state) {
  refreshResourceCaps(state);
  refreshSpecialStats(state);
  const clientState = makeClientState(state);
  const sockets = [];

  connections.forEachSocket(playerId, (client) => {
    if (!client || client.readyState !== WebSocket.OPEN) return;

    sockets.push(client);

    send(client, {
      type: "state",
      playerId: playerId,
      serverTimeUnixMs: nowMs(),
      payloadJson: JSON.stringify(clientState)
    });
  });

  if (sockets.length === 0) {
    return 0;
  }

  const stateId =
    Number(
      state &&
      state.worldPlacement &&
      state.worldPlacement.stateId
    );

  let localMapPayload = null;

  if (
    Number.isInteger(stateId) &&
    stateId > 0
  ) {
    localMapPayload =
      await buildStateLocalMapPayloadAuthoritative(
        stateId,
        playerId
      );
  }

  const worldMapPayload =
    await buildWorldMapPayloadForClientAuthoritative();

  for (const client of sockets) {
    if (
      localMapPayload &&
      client &&
      client.readyState === WebSocket.OPEN
    ) {
      send(client, {
        type: "state_local_map",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson:
          JSON.stringify(
            localMapPayload
          )
      });
    }

    if (
      worldMapPayload &&
      client &&
      client.readyState === WebSocket.OPEN
    ) {
      send(client, {
        type: "world_map",
        playerId,
        serverTimeUnixMs: nowMs(),
        payloadJson:
          JSON.stringify(
            worldMapPayload
          )
      });
    }
  }

  return sockets.length;
}



//////////////////////////////////////////////////////////////////////
// ============================================================
// DEFAULT PLAYER STATE
// ------------------------------------------------------------
// Layout:
// R R R R R
// R H H H R
// R H H H R
// R H H H R
// R R R R R
//
// H = HQ (3x3)
// R = Road (1x1, fixed)
// ============================================================

function createStarterRoadRing(playerId, hqX, hqZ, hqSizeX, hqSizeZ) {
  const roads = [];

  const minRoadX = hqX - 1;
  const maxRoadX = hqX + hqSizeX;
  const minRoadZ = hqZ - 1;
  const maxRoadZ = hqZ + hqSizeZ;

  roads.push({ instanceId: "road_tl_" + playerId, buildingId: "road", x: minRoadX,     z: maxRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_t1_" + playerId, buildingId: "road", x: minRoadX + 1, z: maxRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_t2_" + playerId, buildingId: "road", x: minRoadX + 2, z: maxRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_t3_" + playerId, buildingId: "road", x: minRoadX + 3, z: maxRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_tr_" + playerId, buildingId: "road", x: maxRoadX,     z: maxRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });

  roads.push({ instanceId: "road_bl_" + playerId, buildingId: "road", x: minRoadX,     z: minRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_b1_" + playerId, buildingId: "road", x: minRoadX + 1, z: minRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_b2_" + playerId, buildingId: "road", x: minRoadX + 2, z: minRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_b3_" + playerId, buildingId: "road", x: minRoadX + 3, z: minRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_br_" + playerId, buildingId: "road", x: maxRoadX,     z: minRoadZ, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });

  roads.push({ instanceId: "road_l1_" + playerId, buildingId: "road", x: minRoadX, z: hqZ,     level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_l2_" + playerId, buildingId: "road", x: minRoadX, z: hqZ + 1, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_l3_" + playerId, buildingId: "road", x: minRoadX, z: hqZ + 2, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });

  roads.push({ instanceId: "road_r1_" + playerId, buildingId: "road", x: maxRoadX, z: hqZ,     level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_r2_" + playerId, buildingId: "road", x: maxRoadX, z: hqZ + 1, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });
  roads.push({ instanceId: "road_r3_" + playerId, buildingId: "road", x: maxRoadX, z: hqZ + 2, level: 1, isCompleted: true, buildFinishTimeMs: 0, isFixed: true, hasRoadAccess: true });

  return roads;
}

function createStarterLayout(playerId) {
  // Start block artıq 8x8-dir: 0..7
  const baseWidth = 8;
  const baseHeight = 8;

  // HQ 3x3 qalır
  const hqSizeX = 3;
  const hqSizeZ = 3;

  // 3x3 HQ + ətraf 1-cell road ring = 5x5 yer tutur
  // 8x8 block içinə rahat sığması üçün HQ-nu (2,2)-dən başlayırıq.
  // Bu halda road ring 1..5 aralığında qalır.
  const hqX = 3;
  const hqZ = 2;

  const hq = {
    instanceId: "hq_" + playerId,
    buildingId: "hq",
    x: hqX,
    z: hqZ,
    level: 1,
    isCompleted: true,
    buildFinishTimeMs: 0,
    isFixed: true,
    hasRoadAccess: true
  };

  console.log("[SERVER_STARTER_HQ]", {
    playerId,
    x: hq.x,
    z: hq.z,
    hqSizeX,
    hqSizeZ,
    baseWidth,
    baseHeight
  });

  const roads = createStarterRoadRing(playerId, hqX, hqZ, hqSizeX, hqSizeZ);

  return {
    hq,
    roads
  };
}

function makeDefaultState(playerId) {
  const starterLayout = createStarterLayout(playerId);

  return {
    playerId: playerId,

    // Server-authoritative profil məlumatları
    oyuncuAdi: "Komandir",
    ittifaqAdi: "",

    serverTimeUnixMs: nowMs(),

    // Server-only, PostgreSQL snapshot-da saxlanilan lazy istehsal saatı.
    productionRuntime: {
      tickMs: DEFAULT_PRODUCTION_TICK_MS,
      lastSettledAtMs: nowMs()
    },

    // Last Shelter client resource envelope metadata. regTime is persisted;
    // population/cap fields are updated by verified population rules as those
    // rules are migrated. They are not inferred from RDC placeholders.
    lastShelterResourceRuntime:
      lastShelterResourceRuntimeDefaultHazirla(
        nowMs()
      ),

    // Verified Last Shelter hero/general state is kept separate from the
    // legacy RDC hero model until all recruit/skill handlers are migrated.
    lastShelterHeroRuntime: {
      generals: [
        starterGeneralHazirla()
      ]
    },

    // Verified four-tree troop transfer progression from the reference init.
    troopTransferRuntime:
      troopTransferRuntimeDefaultHazirla(),

    lastShelterWorldRuntime:
      lastShelterWorldRuntimeDefaultHazirla(),

    lastShelterAllianceRuntime:
      lastShelterAllianceRuntimeDefaultHazirla(),

    // Numeric Last Shelter city/building snapshot is persisted in parallel
    // with the legacy RDC map/building engine until that engine is fully
    // replaced by verified numeric building rules.
    lastShelterCityRuntime:
      starterCityRuntimeHazirla(),

    lastShelterEngagementRuntime:
      lastShelterEngagementRuntimeDefaultHazirla(),

    // Last Shelter UserProfile keeps free and paid gold as separate balances.
    // item.buy consumes free gold first, then paid gold.
    lastShelterGoldWallet:
      lastShelterGoldWalletDefaultHazirla(),

    lastShelterTruckRuntime:
      truckRuntimeDefaultHazirla(
        ""
      ),

    // Verified 205-row Last Shelter task/chapter state. The synthetic RDC
    // M001..M020 mission subsystem has been removed; unresolved raw task
    // reward/progress semantics remain reference-gated.
    lastShelterMissionRuntime:
      lastShelterMissionRuntimeDefaultHazirla(),

    lastShelterAuxiliaryRuntime:
      lastShelterAuxiliaryRuntimeDefaultHazirla(),

    lastShelterSevenDaysRuntime:
      sevenDaysRuntimeDefaultHazirla(
        nowMs()
      ),

    lastShelterStarterAccountRuntime:
      lastShelterStarterAccountRuntimeDefaultHazirla(),

    lastShelterFortRuntime:
      fortRuntimeDefaultHazirla(),

    lastShelterMissileRuntime:
      lastShelterMissileRuntimeDefaultHazirla(),

    lastShelterTutorialRuntime:
      tutorialRuntimeDefaultHazirla(),

    lastShelterVipStore:
      lastShelterVipStoreStateHazirla(),

    lastShelterFreshInitEnvelopeRuntime:
      freshInitEnvelopeRuntimeDefaultHazirla(),

    resources:
      lastShelterServerBaslangicResurslariniAl(),

    oyuncuStatusu: {
      almaz: 0,
      vipSeviyesi: 0,
      oyuncuGucu: 0
    },

    gucMelumatlari: {
  umumiGuc: 0,
  binaGucu: 0,
  qosunGucu: 0,
  qehremanGucu: 0
},
    doyusStatistikasi: {
  umumiDoyusler: 0,
  qazanilanDoyusler: 0,
  mehvedilenDusmenBirlikleri: 0,
  itirilenOzBirlikleri: 0,
  sagaldilanBirlikler: 0,
  mehvedilenZombiler: 0
},
bazaMelumatlari: {
  umumiTikintiMasinlari: 0,
  umumiZirehliMasinlar: 0,
  umumiQosunSayi: 0,

  yaraliBirlikler: 0,
  hospitalTutumu: 0,

  toplanisLimiti: 1,
  komekTutumu: 1
},
    oyuncuStatistikasi: {
  mehvedilenDusmen: 0,
  qazanilanDoyus: 0,
  meglubiyyetSayi: 0,
  toplanmisResurs: 0
},

    resourceCaps: getBaseResourceCaps(),
    specialStats: getBaseSpecialStats(),
    population: {
      current: 0,
      cap: getBaseSpecialStats().populationCap
    },

    worldPlacement: null,

    worldMap: {
      activeStateIdForNewPlayers: 1,
      currentStateId: 1,
      currentStateSnapshot: null
    },

    map: {
      // Hələlik ümumi map ölçüsünü saxlayırıq ki digər sistemlər qırılmasın
      fullWidth: 40,
      fullHeight: 40,

      // Start block artıq 8x8-dir
      unlockedMinX: 0,
      unlockedMaxX: 7,
      unlockedMinZ: 0,
      unlockedMaxZ: 7,

      // Başlanğıcda yalnız bir block açıqdır
      unlockedBlocks: ["0,0"]
    },

    buildings: [
      starterLayout.hq,
      ...starterLayout.roads
    ],

    inventory: [],

    builders: {
      baseBuilders: 1,
      completedGarageCount: 0,
      maxBuilders: 1,
      busyBuilders: 0,
      freeBuilders: 1,
      jobs: []
    }
  };
}


function getOrCreatePlayerState(playerId) {
  if (!players.has(playerId)) {
    const newState = makeDefaultState(playerId);

    oyuncuProfiliniTeminEt(newState);
    ensureMapState(newState);
    ensurePlayerWorldPlacement(newState, playerId);
    refreshRoadAccessForBuildings(newState);
    refreshBuilderCapacity(newState);
    refreshResourceCaps(newState);
    refreshSpecialStats(newState);
    players.set(playerId, newState);
  }

  const state = players.get(playerId);

  // Köhnə oyunçu state-lərini yeni profil/status strukturları ilə tamamlayır.
  oyuncuProfiliniTeminEt(state);
  oyuncuStatusunuTeminEt(state);
  lastShelterResourceRuntimeTeminEt(
    state,
    nowMs()
  );
  lastShelterHeroRuntimeTeminEt(
    state
  );

  if (!Array.isArray(state.troopTransferRuntime)) {
    state.troopTransferRuntime =
      troopTransferRuntimeDefaultHazirla();
  }

  lastShelterWorldRuntimeTeminEt(
    state
  );
  lastShelterAllianceRuntimeTeminEt(
    state
  );
  lastShelterCityRuntimeTeminEt(
    state
  );
  lastShelterEngagementRuntimeTeminEt(
    state
  );
  lastShelterGoldWalletTeminEt(
    state
  );
  lastShelterTruckRuntimeTeminEt(
    state
  );
  lastShelterMissionRuntimeTeminEt(
    state
  );
  lastShelterAuxiliaryRuntimeTeminEt(
    state
  );
  lastShelterRepayRuntimeTeminEt(
    state
  );
  lastShelterVipStoreStateTeminEt(
    state
  );

  if (
    !state.lastShelterFreshInitEnvelopeRuntime ||
    typeof state.lastShelterFreshInitEnvelopeRuntime !== "object" ||
    Array.isArray(state.lastShelterFreshInitEnvelopeRuntime)
  ) {
    state.lastShelterFreshInitEnvelopeRuntime =
      freshInitEnvelopeRuntimeDefaultHazirla();
  }
  freshInitEnvelopeRuntimeTeminEt(
    state.lastShelterFreshInitEnvelopeRuntime
  );

  lastShelterSevenDaysRuntimeTeminEt(
    state,
    nowMs()
  );
  lastShelterStarterAccountRuntimeTeminEt(
    state
  );
  fortRuntimeTeminEt(
    state
  );
  lastShelterMissileRuntimeTeminEt(
    state
  );
  tutorialRuntimeTeminEt(
    state
  );

  ensureMapState(state);
  ensurePlayerWorldPlacement(state, playerId);
  refreshRoadAccessForBuildings(state);
  refreshBuilderCapacity(state);
  refreshResourceCaps(state);
  refreshSpecialStats(state);
  ensureProductionClock(
    state,
    nowMs(),
    DEFAULT_PRODUCTION_TICK_MS
  );

  // Snapshot-dan qayıdan oyunçuda keçmiş build/research/training deadline-ları
  // ola bilər. Sadəcə production-u "indi"yə gətirmək düzgün olmazdı:
  // əvvəl event vaxtlarına qədər istehsal, sonra event, sonra yeni rate ilə
  // qalan vaxt hesablanmalıdır.
  settlePlayerTimeline(
    state,
    playerId,
    nowMs()
  );

  schedulePlayerDeadline(
    playerId,
    state
  );

  return state;
}

// ============================================================
// BUILD / UPGRADE / PRODUCTION RULES
// ============================================================

function hasFreeBuilder(state, buildingId) {
  refreshBuilderCapacity(state);

  if (!state || !state.builders) return false;
  if (!Array.isArray(state.builders.jobs)) return false;

  const requiredSlots = Math.max(
    1,
    Number(getBuilderSlotsRequiredForBuilding(buildingId)) || 1
  );

  return (Number(state.builders.freeBuilders) || 0) >= requiredSlots;
}

function makeRoadKey(x, z) {
  return `${x},${z}`;
}

function getOrthogonalNeighbors(x, z) {
  return [
    { x: x,     z: z + 1 },
    { x: x + 1, z: z     },
    { x: x,     z: z - 1 },
    { x: x - 1, z: z     }
  ];
}

function rebuildBlockedCellCache(state) {
  const blocked = new Set();

  if (!state) {
    return blocked;
  }

  // --------------------------------------------------------
  // BİNALAR
  // Road path üçün road-un özü blok sayılmır,
  // amma digər binalar blok sayılır.
  // --------------------------------------------------------
  if (Array.isArray(state.buildings)) {
    for (const b of state.buildings) {
      if (!b) continue;

      const id = normalizeBuildingId(b.buildingId);
      if (id === "road") continue;

      const rules = getBuildingRules(b.buildingId);
      if (!rules) continue;

      for (let dx = 0; dx < rules.sizeX; dx++) {
        for (let dz = 0; dz < rules.sizeZ; dz++) {
          blocked.add(makeRoadKey(b.x + dx, b.z + dz));
        }
      }
    }
  }

  // --------------------------------------------------------
  // RESOURCE NODE MƏRKƏZLƏRİ
  // Yol node-un özündən keçməsin
  // --------------------------------------------------------
  if (Array.isArray(state.resourceNodes)) {
    for (const node of state.resourceNodes) {
      if (!node) continue;
      blocked.add(makeRoadKey(node.x, node.z));
    }
  }

  // --------------------------------------------------------
  // BÜTÜN RESOURCE SLOTLAR
  // Boş slot olsa belə road onun üstündən keçməsin
  // --------------------------------------------------------
  if (Array.isArray(state.resourceSlots)) {
    for (const slot of state.resourceSlots) {
      if (!slot) continue;
      blocked.add(makeRoadKey(slot.x, slot.z));
    }
  }

  state.cachedBlockedCells = blocked;
  return blocked;
}

function getBlockedCellKeys(state, options = {}) {
  if (!state.cachedBlockedCells) {
    rebuildBlockedCellCache(state);
  }

  const ignoreBuildingInstanceId = options.ignoreBuildingInstanceId || null;

  if (!ignoreBuildingInstanceId) {
    return state.cachedBlockedCells;
  }

  const blocked = new Set(state.cachedBlockedCells);

  for (const b of state.buildings) {
    if (!b) continue;
    if (b.instanceId !== ignoreBuildingInstanceId) continue;

    const rules = getBuildingRules(b.buildingId);
    if (!rules) continue;

    for (let dx = 0; dx < rules.sizeX; dx++) {
      for (let dz = 0; dz < rules.sizeZ; dz++) {
        blocked.delete(makeRoadKey(b.x + dx, b.z + dz));
      }
    }
  }

  return blocked;
}

function getConnectedRoadStartCells(state) {
  const connectedRoadKeys = getConnectedRoadKeys(state);
  const starts = [];

  for (const key of connectedRoadKeys) {
    const parts = key.split(",");
    starts.push({
      x: parseInt(parts[0], 10),
      z: parseInt(parts[1], 10)
    });
  }

  return starts;
}

function isWalkableCell(state, x, z, blockedKeys) {
  if (!isCellInsideUnlockedBlocks(state, x, z))
    return false;

  const key = makeRoadKey(x, z);
  return !blockedKeys.has(key);
}


/////////////////////////////////////////////////////////////////////


function debugConnectRoadPreparation(state, buildingInstanceId) {
  if (!state || !Array.isArray(state.buildings)) {
    return null;
  }

  const building = state.buildings.find(
    (b) => b && b.instanceId === buildingInstanceId
  );

  if (!building) {
    return null;
  }

  const startCells = getConnectedRoadStartCells(state);
const rawTargetCells = getBuildingPerimeterTargetCells(building);

const targetCells = rawTargetCells.filter(c =>
  isCellInsideUnlockedBlocks(state, c.x, c.z) &&
  !isReservedResourceCell(state, c.x, c.z)
);

  const blockedKeys = getBlockedCellKeys(state, {
    ignoreBuildingInstanceId: null
  });

  console.log("[ROAD_DEBUG]", {
    unlockedBlocks: state.map?.unlockedBlocks,
    startCellsCount: startCells.length,
    rawTargetCellsCount: rawTargetCells.length,
    targetCellsCount: targetCells.length
  });

  return {
    startCells,
    targetCells,
    blockedCount: blockedKeys.size
  };
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

function findRoadPathAStar(state, buildingInstanceId) {
  const prep = debugConnectRoadPreparation(state, buildingInstanceId);
  if (!prep) return null;

  const { startCells, targetCells } = prep;
  const blockedKeys = getBlockedCellKeys(state);

  if (!Array.isArray(startCells) || startCells.length === 0) return null;
  if (!Array.isArray(targetCells) || targetCells.length === 0) return null;

  const validTargetCells = targetCells.filter(c =>
    isCellInsideUnlockedBlocks(state, c.x, c.z)
  );

  if (validTargetCells.length === 0) return null;

  const targetKeySet = new Set(
    validTargetCells.map((c) => makeRoadKey(c.x, c.z))
  );

  const cameFrom = new Map();
  const gScore = new Map();
  const visited = new Set();
  const openHeap = [];

  function compareNodes(a, b) {
    if (a.f !== b.f) return a.f - b.f;
    return a.h - b.h;
  }

  function heapPush(node) {
    openHeap.push(node);

    let index = openHeap.length - 1;

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);

      if (compareNodes(openHeap[index], openHeap[parentIndex]) >= 0)
        break;

      const tmp = openHeap[index];
      openHeap[index] = openHeap[parentIndex];
      openHeap[parentIndex] = tmp;

      index = parentIndex;
    }
  }

  function heapPop() {
    if (openHeap.length === 0) return null;

    const best = openHeap[0];
    const last = openHeap.pop();

    if (openHeap.length > 0 && last) {
      openHeap[0] = last;

      let index = 0;

      while (true) {
        const left = index * 2 + 1;
        const right = index * 2 + 2;
        let smallest = index;

        if (
          left < openHeap.length &&
          compareNodes(openHeap[left], openHeap[smallest]) < 0
        ) {
          smallest = left;
        }

        if (
          right < openHeap.length &&
          compareNodes(openHeap[right], openHeap[smallest]) < 0
        ) {
          smallest = right;
        }

        if (smallest === index)
          break;

        const tmp = openHeap[index];
        openHeap[index] = openHeap[smallest];
        openHeap[smallest] = tmp;

        index = smallest;
      }
    }

    return best;
  }

  for (const start of startCells) {
    const startKey = makeRoadKey(start.x, start.z);
    gScore.set(startKey, 0);

    let bestH = Infinity;
    for (const t of validTargetCells) {
      const h = manhattan(start, t);
      if (h < bestH) bestH = h;
    }

    heapPush({
      x: start.x,
      z: start.z,
      g: 0,
      h: bestH,
      f: bestH
    });
  }

  while (openHeap.length > 0) {
    const current = heapPop();
    if (!current) break;

    const currentKey = makeRoadKey(current.x, current.z);

    if (visited.has(currentKey)) continue;
    visited.add(currentKey);

    if (targetKeySet.has(currentKey)) {
      const path = [];
      let traceKey = currentKey;

      while (traceKey) {
        const parts = traceKey.split(",");
        path.push({
          x: parseInt(parts[0], 10),
          z: parseInt(parts[1], 10)
        });

        traceKey = cameFrom.get(traceKey) || null;
      }

      path.reverse();
      return path;
    }

    const neighbors = getOrthogonalNeighbors(current.x, current.z);

    for (const n of neighbors) {
      const neighborKey = makeRoadKey(n.x, n.z);

      if (visited.has(neighborKey)) continue;

      const isTarget = targetKeySet.has(neighborKey);
      const walkable = isWalkableCell(state, n.x, n.z, blockedKeys);

      if (!walkable && !isTarget) continue;

      const tentativeG = current.g + 1;
      const knownG = gScore.has(neighborKey) ? gScore.get(neighborKey) : Infinity;

      if (tentativeG >= knownG) continue;

      cameFrom.set(neighborKey, currentKey);
      gScore.set(neighborKey, tentativeG);

      let bestH = Infinity;
      for (const t of validTargetCells) {
        const h = manhattan(n, t);
        if (h < bestH) bestH = h;
      }

      heapPush({
        x: n.x,
        z: n.z,
        g: tentativeG,
        h: bestH,
        f: tentativeG + bestH
      });
    }
  }

  return null;
}

function createRoadsAlongPath(state, path) {
  if (!state || !Array.isArray(state.buildings)) return [];
  if (!Array.isArray(path) || path.length === 0) return [];

  const created = [];
  const occupiedRoadKeys = new Set();

  for (const b of state.buildings) {
    if (!b) continue;
    if (normalizeBuildingId(b.buildingId) !== "road") continue;

    occupiedRoadKeys.add(makeRoadKey(b.x, b.z));
  }

  for (const cell of path) {
    const key = makeRoadKey(cell.x, cell.z);

    if (occupiedRoadKeys.has(key)) continue;

    const road = {
      instanceId: crypto.randomBytes(8).toString("hex"),
      buildingId: "road",
      x: cell.x,
      z: cell.z,
      level: 1,
      isCompleted: true,
      buildFinishTimeMs: 0,
      isFixed: false,
      hasRoadAccess: true
    };

    state.buildings.push(road);
    occupiedRoadKeys.add(key);
    created.push(road);
  }

  updateServerTime(state);
  return created;
}

function getProductionRule(buildingId, buildingLevel) {
  const id = normalizeBuildingId(buildingId);
  const level = Math.max(1, Number(buildingLevel) || 1);
  const meta = getDefinitionMeta(id);
  const levelData = getLevelData(id, level);

  if (meta && meta.producesResource && meta.producedResource) {
    const amountPerTick = Math.max(0, Number(levelData.productionPerTick) || 0);
    if (amountPerTick > 0) {
      return {
        resourceType: meta.producedResource,
        amountPerTick
      };
    }
  }

  function amountByLevel(level1, level2, level3) {
    if (level <= 1) return level1;
    if (level === 2) return level2;
    return level3;
  }

  switch (id) {
    case "testbuilding":
      return {
        resourceType: "food",
        amountPerTick: amountByLevel(5, 8, 12)
      };

    case "farm":
    case "food":
      return {
        resourceType: "food",
        amountPerTick: amountByLevel(10, 16, 24)
      };

    case "water_treatment_plant":
    case "water":
      return {
        resourceType: "water",
        amountPerTick: amountByLevel(8, 14, 20)
      };

    case "lumber_mill":
    case "wood":
    case "sawmill":
      return {
        resourceType: "wood",
        amountPerTick: amountByLevel(12, 20, 30)
      };

    case "refinery":
    case "iron":
      return {
        resourceType: "iron",
        amountPerTick: amountByLevel(8, 14, 22)
      };

    case "oil_well":
    case "fuel":
      return {
        resourceType: "fuel",
        amountPerTick: amountByLevel(6, 10, 16)
      };

    case "power_plant":
    case "powerplant":
      return {
        resourceType: "electricity",
        amountPerTick: amountByLevel(5, 9, 14)
      };

    case "bank":
    case "commercial_hub":
    case "money":
      return {
        resourceType: "money",
        amountPerTick: amountByLevel(10, 18, 28)
      };

    case "chip_plant":
    case "chip_factory":
    case "chips":
      return {
        resourceType: "chips",
        amountPerTick: amountByLevel(2, 4, 7)
      };

    default:
      return null;
  }
}

function processProductionForState(
  state,
  targetTimeMs = nowMs()
) {
  if (!state || !Array.isArray(state.buildings)) {
    return false;
  }

  const clock = consumeProductionTicks(
    state,
    targetTimeMs,
    DEFAULT_PRODUCTION_TICK_MS
  );

  const tickCount =
    Math.max(0, Number(clock.ticks) || 0);

  if (tickCount <= 0) {
    return false;
  }

  ensureResourcesObject(state);
  refreshResourceCaps(state);
  refreshSpecialStats(state);
  let changed = false;

  for (const building of state.buildings) {
    if (!building) continue;

    // Yalnız tamamlanmış bina istehsal edir.
    if (!building.isCompleted) continue;

    // Yoldan ayrılmış bina istehsal etməsin.
    if (building.hasRoadAccess === false) continue;

    const level =
      Math.max(1, Number(building.level) || 1);

    const rule =
      getProductionRule(
        building.buildingId,
        level
      );

    if (!rule) continue;

    const key = rule.resourceType;

    if (
      typeof state.resources[key] !==
      "number"
    ) {
      continue;
    }

    const baseAmount =
      Math.max(
        0,
        Number(rule.amountPerTick) || 0
      );

    const technologyProductionPct = 0;

    const {
      stateUcunBinaIstehsaliniHesabla
    } = require("./resurs_inkisaf_korpu");

    const productionCalculation =
      stateUcunBinaIstehsaliniHesabla(
        state,
        building.instanceId,
        baseAmount,
        technologyProductionPct
      );

    const perTick =
      Math.max(
        0,
        Number(
          productionCalculation.finalAmount
        ) || 0
      );

    if (perTick <= 0) continue;

    const totalAdd =
      perTick * tickCount;

    const cap =
      typeof state.resourceCaps?.[key] ===
      "number"
        ? state.resourceCaps[key]
        : Number.POSITIVE_INFINITY;

    const before =
      Number(state.resources[key]) || 0;

    const after =
      Math.min(
        cap,
        before + totalAdd
      );

    if (after !== before) {
      state.resources[key] = after;
      changed = true;
    }
  }

  const specialTickBonuses = [
    {
      key: "money",
      amount: Math.max(
        0,
        Number(
          state.specialStats?.moneyPerTickBonus
        ) || 0
      )
    },
    {
      key: "chips",
      amount: Math.max(
        0,
        Number(
          state.specialStats?.chipsPerTickBonus
        ) || 0
      )
    },
    {
      key: "electricity",
      amount: Math.max(
        0,
        Number(
          state.specialStats
            ?.electricityPerTickBonus
        ) || 0
      )
    }
  ];

  for (const bonus of specialTickBonuses) {
    if (bonus.amount <= 0) continue;

    if (
      typeof state.resources[bonus.key] !==
      "number"
    ) {
      continue;
    }

    const cap =
      typeof state.resourceCaps?.[bonus.key] ===
      "number"
        ? state.resourceCaps[bonus.key]
        : Number.POSITIVE_INFINITY;

    const before =
      Number(state.resources[bonus.key]) || 0;

    const after =
      Math.min(
        cap,
        before + bonus.amount * tickCount
      );

    if (after !== before) {
      state.resources[bonus.key] = after;
      changed = true;
    }
  }

  // Clock həmişə irəli gedir, hətta anbar dolu olsa belə.
  // Beləliklə cap açıldıqdan sonra keçmiş dolu vaxt yenidən hesablanmır.
  if (changed) {
    updateServerTime(state);
  }

  return changed;
}

// ============================================================
// BUILDING RULES
// ============================================================

function getBuildingRules(buildingId) {
  const id = normalizeBuildingId(buildingId);
  const meta = getDefinitionMeta(id);

  if (meta) {
    return {
      sizeX: Math.max(1, Number(meta.sizeX) || 1),
      sizeZ: Math.max(1, Number(meta.sizeZ) || 1),
      isRoad: !!meta.isRoad,
      requiresRoad: !!meta.requiresRoad,
      placementMode: meta.placementMode === "resource_slot" ? "resource_slot" : "normal",
      requiredSlotType: meta.requiredSlotType ? normalizeResourceKey(meta.requiredSlotType) : null
    };
  }

  switch (id) {
    case "water":
      return {
        sizeX: 1,
        sizeZ: 1,
        isRoad: false,
        requiresRoad: true,
        placementMode: "resource_slot",
        requiredSlotType: "water"
      };

    case "wood":
    case "sawmill":
      return {
        sizeX: 1,
        sizeZ: 1,
        isRoad: false,
        requiresRoad: true,
        placementMode: "resource_slot",
        requiredSlotType: "wood"
      };

    case "iron":
      return {
        sizeX: 1,
        sizeZ: 1,
        isRoad: false,
        requiresRoad: true,
        placementMode: "resource_slot",
        requiredSlotType: "iron"
      };

    case "fuel":
      return {
        sizeX: 1,
        sizeZ: 1,
        isRoad: false,
        requiresRoad: true,
        placementMode: "resource_slot",
        requiredSlotType: "fuel"
      };

    case "food":
      return {
        sizeX: 1,
        sizeZ: 1,
        isRoad: false,
        requiresRoad: true,
        placementMode: "resource_slot",
        requiredSlotType: "food"
      };

    default:
      return {
        sizeX: 1,
        sizeZ: 1,
        isRoad: false,
        requiresRoad: true,
        placementMode: "normal",
        requiredSlotType: null
      };
  }
}


///////////////////////////////////////////////////


// ============================================================
// ROAD NETWORK HELPERS
// ============================================================

const buildingPerimeterOffsetCache = new Map();

function getPerimeterOffsets(sizeX, sizeZ) {
  const cacheKey = `${sizeX}x${sizeZ}`;

  if (buildingPerimeterOffsetCache.has(cacheKey)) {
    return buildingPerimeterOffsetCache.get(cacheKey);
  }

  const offsets = [];

  for (let dz = 0; dz < sizeZ; dz++) offsets.push({ dx: -1, dz: dz });
  for (let dz = 0; dz < sizeZ; dz++) offsets.push({ dx: sizeX, dz: dz });
  for (let dx = 0; dx < sizeX; dx++) offsets.push({ dx: dx, dz: -1 });
  for (let dx = 0; dx < sizeX; dx++) offsets.push({ dx: dx, dz: sizeZ });

  buildingPerimeterOffsetCache.set(cacheKey, offsets);
  return offsets;
}

function getBuildingPerimeterTargetCells(building) {
  const result = [];

  if (!building) return result;

  const rules = getBuildingRules(building.buildingId);
  if (!rules) return result;

  const offsets = getPerimeterOffsets(rules.sizeX, rules.sizeZ);

  for (const o of offsets) {
    result.push({
      x: building.x + o.dx,
      z: building.z + o.dz
    });
  }

  return result;
}

function getConnectedRoadKeys(state) {
  const connected = new Set();

  if (!state || !Array.isArray(state.buildings))
    return connected;

  const roadMap = new Map();

  for (const b of state.buildings) {
    if (!b) continue;
    if (normalizeBuildingId(b.buildingId) !== "road") continue;

    const key = makeRoadKey(b.x, b.z);
    roadMap.set(key, b);
  }

  const queue = [];

  for (const b of state.buildings) {
    if (!b) continue;
    if (normalizeBuildingId(b.buildingId) !== "road") continue;
    if (!b.isFixed) continue;

    const key = makeRoadKey(b.x, b.z);

    connected.add(key);
    queue.push({ x: b.x, z: b.z });
  }

  if (queue.length === 0)
    return connected;

  while (queue.length > 0) {
    const current = queue.shift();
    const neighbors = getOrthogonalNeighbors(current.x, current.z);

    for (const n of neighbors) {
      const key = makeRoadKey(n.x, n.z);

      if (!roadMap.has(key)) continue;
      if (connected.has(key)) continue;

      connected.add(key);
      queue.push({ x: n.x, z: n.z });
    }
  }

  return connected;
}

function refreshRoadAccessForBuildings(state) {
  if (!state || !Array.isArray(state.buildings)) return;

  for (const b of state.buildings) {
    if (!b) continue;

    const id = normalizeBuildingId(b.buildingId);

    if (id === "hq") {
      b.hasRoadAccess = true;
      continue;
    }

    if (id === "road") {
      b.hasRoadAccess = true;
      continue;
    }

    b.hasRoadAccess = hasAdjacentConnectedRoad(state, b.buildingId, b.x, b.z);

    console.log(
      "[ROAD_ACCESS]",
      b.buildingId,
      "at",
      b.x,
      b.z,
      "=>",
      b.hasRoadAccess
    );
  }
}

function rectanglesOverlap(ax, az, aw, ah, bx, bz, bw, bh) {
  return (
    ax < bx + bw &&
    ax + aw > bx &&
    az < bz + bh &&
    az + ah > bz
  );
}

// ============================================================
// MAP / RESOURCE SLOT HELPERS
// ============================================================

function isInsideUnlockedArea(state, x, z, sizeX, sizeZ) {
  if (!state.map) return true;

  const minX = state.map.unlockedMinX;
  const maxX = state.map.unlockedMaxX;
  const minZ = state.map.unlockedMinZ;
  const maxZ = state.map.unlockedMaxZ;

  const insideX = x >= minX && x + sizeX - 1 <= maxX;
  const insideZ = z >= minZ && z + sizeZ - 1 <= maxZ;

  return insideX && insideZ;
}

// ============================================================
// RESOURCE NODE / SLOT SYSTEM
// ------------------------------------------------------------
// QAYDA:
// 1 resource node = 4 buildable slots
//
// Node-lar həm başlanğıc açıq sahədə,
// həm də gələcəkdə açılacaq locked block-larda ola bilər.
// ============================================================

function getBlockKeyFromCell(x, z, blockSize = 20) {
  const blockX = Math.floor(x / blockSize);
  const blockZ = Math.floor(z / blockSize);
  return `${blockX},${blockZ}`;
}

function makeResourceSlot(slotId, type, x, z, nodeId) {
  return {
    id: slotId,
    type: String(type || "").trim().toLowerCase(),
    x: x,
    z: z,
    nodeId: nodeId,
    blockKey: getBlockKeyFromCell(x, z),
    occupied: false,
    occupiedByInstanceId: null
  };
}

function createResourceNodeCluster(nodeId, type, nodeX, nodeZ, slotCells) {
  const normalizedType = String(type || "").trim().toLowerCase();

  const slots = slotCells.map((cell, index) =>
    makeResourceSlot(
      `${nodeId}_slot_${index + 1}`,
      normalizedType,
      cell.x,
      cell.z,
      nodeId
    )
  );

  return {
    id: nodeId,
    type: normalizedType,
    x: nodeX,
    z: nodeZ,
    blockKey: getBlockKeyFromCell(nodeX, nodeZ),
    slots: slots
  };
}

function createDefaultResourceNodes() {
  return [
    // ========================================================
    // WATER
    // ========================================================
    createResourceNodeCluster(
      "water_node_a",
      "water",
      1, 12,
      [
        { x: 1, z: 13 }, // top
        { x: 0, z: 12 }, // left
        { x: 2, z: 12 }, // right
        { x: 1, z: 11 }  // bottom
      ]
    ),

    createResourceNodeCluster(
      "water_node_b",
      "water",
      4, 21,
      [
        { x: 4, z: 22 }, // top
        { x: 3, z: 21 }, // left
        { x: 5, z: 21 }, // right
        { x: 4, z: 20 }  // bottom
      ]
    ),

    // ========================================================
    // FUEL
    // ========================================================
    createResourceNodeCluster(
      "fuel_node_a",
      "fuel",
      6, 9,
      [
        { x: 6, z: 10 }, // top
        { x: 5, z: 9 },  // left
        { x: 7, z: 9 },  // right
        { x: 6, z: 8 }   // bottom
      ]
    ),

    createResourceNodeCluster(
      "fuel_node_b",
      "fuel",
      13, 5,
      [
        { x: 13, z: 6 }, // top
        { x: 12, z: 5 }, // left
        { x: 14, z: 5 }, // right
        { x: 13, z: 4 }  // bottom
      ]
    ),

    // ========================================================
    // IRON
    // ========================================================
    createResourceNodeCluster(
      "iron_node_a",
      "iron",
      -3, -3,
      [
        { x: -3, z: -2 }, // top
        { x: -4, z: -3 }, // left
        { x: -2, z: -3 }, // right
        { x: -3, z: -4 }  // bottom
      ]
    ),

    createResourceNodeCluster(
      "iron_node_b",
      "iron",
      4, -5,
      [
        { x: 4, z: -4 }, // top
        { x: 3, z: -5 }, // left
        { x: 5, z: -5 }, // right
        { x: 4, z: -6 }  // bottom
      ]
    ),

    // ========================================================
    // WOOD
    // ========================================================
    createResourceNodeCluster(
      "wood_node_a",
      "wood",
      -7, 14,
      [
        { x: -7, z: 15 }, // top
        { x: -8, z: 14 }, // left
        { x: -6, z: 14 }, // right
        { x: -7, z: 13 }  // bottom
      ]
    ),

    createResourceNodeCluster(
      "wood_node_b",
      "wood",
      -15, 22,
      [
        { x: -15, z: 23 }, // top
        { x: -16, z: 22 }, // left
        { x: -14, z: 22 }, // right
        { x: -15, z: 21 }  // bottom
      ]
    ),

    // ========================================================
    // FOOD
    // ========================================================
    createResourceNodeCluster(
      "food_node_a",
      "food",
      -3, 10,
      [
        { x: -3, z: 11 }, // top
        { x: -4, z: 10 }, // left
        { x: -2, z: 10 }, // right
        { x: -3, z: 9 }   // bottom
      ]
    ),

    createResourceNodeCluster(
      "food_node_b",
      "food",
      -20, 20,
      [
        { x: -20, z: 21 }, // top
        { x: -21, z: 20 }, // left
        { x: -19, z: 20 }, // right
        { x: -20, z: 19 }  // bottom
      ]
    )
  ];
}

function createDefaultResourceSlots(resourceNodes = null) {
  const nodes = Array.isArray(resourceNodes) ? resourceNodes : createDefaultResourceNodes();
  const slots = [];

  for (const node of nodes) {
    if (!node || !Array.isArray(node.slots)) continue;

    for (const slot of node.slots) {
      slots.push({
        id: slot.id,
        type: slot.type,
        x: slot.x,
        z: slot.z,
        nodeId: slot.nodeId,
        blockKey: slot.blockKey,
        occupied: false,
        occupiedByInstanceId: null
      });
    }
  }

  return slots;
}






function getResourceSlotsInArea(state, x, z, sizeX, sizeZ) {
  if (!state || !Array.isArray(state.resourceSlots)) return [];

  const result = [];

  for (const slot of state.resourceSlots) {
    if (!slot) continue;

    const insideX = slot.x >= x && slot.x < x + sizeX;
    const insideZ = slot.z >= z && slot.z < z + sizeZ;

    if (insideX && insideZ) {
      result.push(slot);
    }
  }

  return result;
}

function syncResourceSlotOccupancy(state) {
  if (!state || !Array.isArray(state.resourceSlots)) return;

  // əvvəl hamısını boşalt
  for (const slot of state.resourceSlots) {
    if (!slot) continue;
    slot.occupied = false;
    slot.occupiedByInstanceId = null;
  }

  if (!Array.isArray(state.buildings)) return;

  // sonra resource-slot binalarına görə yenidən doldur
  for (const building of state.buildings) {
    if (!building) continue;

    const rules = getBuildingRules(building.buildingId);
    if (!rules) continue;

    if (rules.placementMode !== "resource_slot")
      continue;

    // hazırda resource bina 1x1 qəbul edilir
    const slot = getResourceSlotAt(state, building.x, building.z);
    if (!slot) continue;

    slot.occupied = true;
    slot.occupiedByInstanceId = building.instanceId || null;
  }
}

function ensureMapState(state) {
  if (!state.map) state.map = {};

  // Start block artıq 8x8-dir
  if (typeof state.map.unlockedMinX !== "number") state.map.unlockedMinX = 0;
  if (typeof state.map.unlockedMaxX !== "number") state.map.unlockedMaxX = 7;
  if (typeof state.map.unlockedMinZ !== "number") state.map.unlockedMinZ = 0;
  if (typeof state.map.unlockedMaxZ !== "number") state.map.unlockedMaxZ = 7;

  if (!Array.isArray(state.map.unlockedBlocks) || state.map.unlockedBlocks.length === 0) {
    state.map.unlockedBlocks = ["0,0"];
  }

  // Spiral start state
  if (!state.map.spiral) {
    state.map.spiral = {
      currentX: 0,
      currentZ: 0,
      direction: "top",
      legLength: 1,
      stepsTakenOnLeg: 0,
      legsCompletedAtCurrentLength: 0
    };
  }

  // ----------------------------------------------------------
  // RESOURCE NODES
  // ----------------------------------------------------------
  if (!Array.isArray(state.resourceNodes) || state.resourceNodes.length === 0) {
    state.resourceNodes = createDefaultResourceNodes();
  }

  // resourceSlots hər dəfə node-lardan yenidən qurulur
  state.resourceSlots = createDefaultResourceSlots(state.resourceNodes);

  // slot occupancy bina state-ə görə hesablanır
  syncResourceSlotOccupancy(state);
}

function makeBlockKey(blockX, blockZ) {
  return `${blockX},${blockZ}`;
}

function parseBlockKey(key) {
  const parts = String(key).split(",");
  return {
    x: parseInt(parts[0], 10),
    z: parseInt(parts[1], 10)
  };
}

function isCellInsideUnlockedBlocks(state, x, z) {
  ensureMapState(state);

  const blockSize = 8;
  const blockX = Math.floor(x / blockSize);
  const blockZ = Math.floor(z / blockSize);

  const key = blockX + "," + blockZ;
  return state.map.unlockedBlocks.includes(key);
}

function nextDirectionCounterClockwise(dir) {
  switch (dir) {
    case "right": return "top";
    case "top": return "left";
    case "left": return "bottom";
    case "bottom": return "right";
    default: return "right";
  }
}

function expandUnlockedArea(state, direction, blockSizeX = 8, blockSizeZ = 8) {
  ensureMapState(state);

  const spiral = state.map.spiral;
  const unlockedSet = new Set(state.map.unlockedBlocks);

  if (direction !== spiral.direction) {
    console.log("[EXPAND_WARN] direction mismatch", {
      clientDirection: direction,
      serverDirection: spiral.direction
    });
  }

  let nextX = spiral.currentX;
  let nextZ = spiral.currentZ;

  switch (spiral.direction) {
    case "right":
      nextX += 1;
      break;

    case "top":
      nextZ += 1;
      break;

    case "left":
      nextX -= 1;
      break;

    case "bottom":
      nextZ -= 1;
      break;

    default:
      return false;
  }

  unlockedSet.add(makeBlockKey(nextX, nextZ));
  state.map.unlockedBlocks = Array.from(unlockedSet);

  spiral.currentX = nextX;
  spiral.currentZ = nextZ;
  spiral.stepsTakenOnLeg += 1;

  if (spiral.stepsTakenOnLeg >= spiral.legLength) {
    spiral.stepsTakenOnLeg = 0;
    spiral.direction = nextDirectionCounterClockwise(spiral.direction);
    spiral.legsCompletedAtCurrentLength += 1;

    if (spiral.legsCompletedAtCurrentLength >= 2) {
      spiral.legsCompletedAtCurrentLength = 0;
      spiral.legLength += 1;
    }
  }

  let minBlockX = Infinity;
  let maxBlockX = -Infinity;
  let minBlockZ = Infinity;
  let maxBlockZ = -Infinity;

  for (const key of state.map.unlockedBlocks) {
    const { x: bx, z: bz } = parseBlockKey(key);

    if (bx < minBlockX) minBlockX = bx;
    if (bx > maxBlockX) maxBlockX = bx;
    if (bz < minBlockZ) minBlockZ = bz;
    if (bz > maxBlockZ) maxBlockZ = bz;
  }

  state.map.unlockedMinX = minBlockX * blockSizeX;
  state.map.unlockedMaxX = ((maxBlockX + 1) * blockSizeX) - 1;
  state.map.unlockedMinZ = minBlockZ * blockSizeZ;
  state.map.unlockedMaxZ = ((maxBlockZ + 1) * blockSizeZ) - 1;

  return true;
}

function getResourceSlotAt(state, x, z) {
  if (!state || !Array.isArray(state.resourceSlots)) return null;

  for (const slot of state.resourceSlots) {
    if (!slot) continue;
    if (slot.x === x && slot.z === z) {
      return slot;
    }
  }

  return null;
}


function isReservedResourceCell(state, x, z) {
  if (state && Array.isArray(state.resourceNodes)) {
    for (const node of state.resourceNodes) {
      if (!node) continue;
      if (node.x === x && node.z === z) {
        return true;
      }
    }
  }

  if (state && Array.isArray(state.resourceSlots)) {
    for (const slot of state.resourceSlots) {
      if (!slot) continue;
      if (slot.x === x && slot.z === z) {
        return true;
      }
    }
  }

  return false;
}

//////////////////////////////////////////////////////





function canPlaceBuilding(state, buildingId, x, z) {
  const rules = getBuildingRules(buildingId);

  if (!rules) {
    console.log("[CAN_PLACE] FAIL => rules not found", { buildingId });
    return false;
  }

  if (!state || !Array.isArray(state.buildings)) {
    console.log("[CAN_PLACE] FAIL => invalid state/buildings", { buildingId, x, z });
    return false;
  }

  const inside = isInsideUnlockedArea(state, x, z, rules.sizeX, rules.sizeZ);
  if (!inside) {
    console.log("[CAN_PLACE] FAIL => outside unlocked area", { buildingId, x, z });
    return false;
  }

  // --------------------------------------------------------
  // RESOURCE SLOT CHECK
  // --------------------------------------------------------
  const overlappedSlots = getResourceSlotsInArea(state, x, z, rules.sizeX, rules.sizeZ);
  const slotAtOrigin = getResourceSlotAt(state, x, z);

  console.log("[CAN_PLACE_DEBUG]", {
    buildingId,
    x,
    z,
    rules,
    slotAtOrigin,
    overlappedSlots
  });

  // Resource bina yalnız uyğun boş slot üzərində qurula bilər
  if (rules.placementMode === "resource_slot") {
    if (!slotAtOrigin) {
      console.log("[CAN_PLACE] FAIL => resource building not on slot", { buildingId, x, z });
      return false;
    }

    if (slotAtOrigin.type !== rules.requiredSlotType) {
      console.log("[CAN_PLACE] FAIL => wrong slot type", {
        buildingId,
        x,
        z,
        expected: rules.requiredSlotType,
        actual: slotAtOrigin.type
      });
      return false;
    }

    if (slotAtOrigin.occupied) {
      console.log("[CAN_PLACE] FAIL => slot already occupied", {
        buildingId,
        x,
        z,
        slotId: slotAtOrigin.id,
        occupiedBy: slotAtOrigin.occupiedByInstanceId
      });
      return false;
    }

    // hazırkı resource binalar 1x1-dir
    if (rules.sizeX !== 1 || rules.sizeZ !== 1) {
      console.log("[CAN_PLACE] FAIL => resource building must be 1x1 for current slot system", {
        buildingId,
        sizeX: rules.sizeX,
        sizeZ: rules.sizeZ
      });
      return false;
    }
  }

  // Normal bina heç bir resource slot-un üstünə düşə bilməz
  if (rules.placementMode === "normal") {
    if (overlappedSlots.length > 0) {
      console.log("[CAN_PLACE] FAIL => normal building overlaps resource slot", {
        buildingId,
        x,
        z,
        overlappedSlots: overlappedSlots.map(s => s.id)
      });
      return false;
    }
  }

  // --------------------------------------------------------
  // OVERLAP CHECK
  // --------------------------------------------------------
  for (const other of state.buildings) {
    if (!other) continue;

    const otherRules = getBuildingRules(other.buildingId);
    if (!otherRules) continue;

    const overlap = rectanglesOverlap(
      x, z, rules.sizeX, rules.sizeZ,
      other.x, other.z, otherRules.sizeX, otherRules.sizeZ
    );

    if (overlap) {
      console.log("[CAN_PLACE] FAIL => overlap", {
        placing: { buildingId, x, z },
        blockedBy: { buildingId: other.buildingId, instanceId: other.instanceId }
      });
      return false;
    }
  }

  console.log("[CAN_PLACE] OK", { buildingId, x, z });
  return true;
}

function hasAdjacentConnectedRoad(state, buildingId, x, z) {
  const rules = getBuildingRules(buildingId);
  console.log("[ROAD_CHECK_SIZE]", buildingId, rules.sizeX, rules.sizeZ);

  if (!rules.requiresRoad) return true;
  if (!state || !Array.isArray(state.buildings)) return false;

  const sizeX = rules.sizeX;
  const sizeZ = rules.sizeZ;
  const connectedRoadKeys = getConnectedRoadKeys(state);

  for (const other of state.buildings) {
    if (!other) continue;

    const otherRules = getBuildingRules(other.buildingId);
    if (!otherRules.isRoad) continue;

    const roadKey = makeRoadKey(other.x, other.z);

    if (!connectedRoadKeys.has(roadKey)) continue;

    const roadX = other.x;
    const roadZ = other.z;

    const leftEdge = x - 1;
    const rightEdge = x + sizeX;
    const bottomEdge = z - 1;
    const topEdge = z + sizeZ;

    const touchesLeft =
      roadX === leftEdge &&
      roadZ >= z &&
      roadZ < z + sizeZ;

    const touchesRight =
      roadX === rightEdge &&
      roadZ >= z &&
      roadZ < z + sizeZ;

    const touchesBottom =
      roadZ === bottomEdge &&
      roadX >= x &&
      roadX < x + sizeX;

    const touchesTop =
      roadZ === topEdge &&
      roadX >= x &&
      roadX < x + sizeX;

    if (touchesLeft || touchesRight || touchesBottom || touchesTop) {
      return true;
    }
  }

  return false;
}

function canMoveBuilding(state, movingBuilding, newX, newZ) {
  if (!state || !movingBuilding || !Array.isArray(state.buildings)) return false;

  const movingRules = getBuildingRules(movingBuilding.buildingId);

  for (const other of state.buildings) {
    if (!other) continue;
    if (other.instanceId === movingBuilding.instanceId) continue;

    const otherRules = getBuildingRules(other.buildingId);

    const overlap = rectanglesOverlap(
      newX, newZ, movingRules.sizeX, movingRules.sizeZ,
      other.x, other.z, otherRules.sizeX, otherRules.sizeZ
    );

    if (overlap) return false;
  }

  return true;
}

function canMoveThisBuilding(building) {
  if (!building) return false;
  if (building.isFixed) return false;
  return true;
}

function removeRoadAtCell(state, x, z) {
  if (!state || !Array.isArray(state.buildings))
    return { ok: false, message: "Player state not found." };

  const index = state.buildings.findIndex(
    (b) =>
      b &&
      String(b.buildingId || "").trim().toLowerCase() === "road" &&
      Number(b.x) === Number(x) &&
      Number(b.z) === Number(z)
  );

  if (index < 0)
    return { ok: false, message: "Road not found at target cell." };

  const road = state.buildings[index];
  if (road.isFixed)
    return { ok: false, message: "This road cannot be deleted." };

  state.buildings.splice(index, 1);
  updateServerTime(state);
  syncResourceSlotOccupancy(state);
  refreshRoadAccessForBuildings(state);
  refreshBuilderCapacity(state);

  return { ok: true, removed: road };
}

// ============================================================
// PLACE BUILDING WITHOUT STARTING CONSTRUCTION
// ============================================================

function placeBuildingWithoutStarting(state, buildingId, x, z) {
  const instanceId = crypto.randomBytes(8).toString("hex");
  const id = normalizeBuildingId(buildingId);

  const isInstantCompleted = (id === "road" || isGarageBuildingId(id));

  const building = {
    instanceId: instanceId,
    buildingId: buildingId,
    x: x,
    z: z,
    level: 1,
    isCompleted: isInstantCompleted,
    buildFinishTimeMs: 0,
    isFixed: false,
    hasRoadAccess: true
  };

  state.buildings.push(building);
  updateServerTime(state);

  return building;
}

// ============================================================
// JOB CREATION / COMPLETION
// ============================================================

function createUpgradeJob(state, building) {
  const now = nowMs();

  const currentLevel = Math.max(1, Number(building.level) || 1);
  const maxLevel = getMaxLevelForBuilding(building.buildingId);

  if (currentLevel >= maxLevel) {
    return null;
  }

  const targetLevel = currentLevel + 1;
  const levelData = getLevelData(building.buildingId, targetLevel);

  if (
    !levelData ||
    levelData.unavailable === true
  ) {
    return null;
  }

  const durationMs = getAdjustedBuildDurationMs(
    state,
    Number(levelData.buildTimeSeconds) || 0
  );

  const jobId = crypto.randomBytes(8).toString("hex");

  building.isCompleted = false;
  building.buildFinishTimeMs = now + durationMs;

  const job = {
    jobId: jobId,
    kind: "upgrade",
    buildingInstanceId: building.instanceId,
    buildingId: building.buildingId,
    x: building.x,
    z: building.z,
    currentLevel: currentLevel,
    targetLevel: targetLevel,
    startedAtMs: now,
    durationMs: durationMs,
    endsAtMs: now + durationMs,
    isCompleted: false,
    builderSlotsRequired: getBuilderSlotsRequiredForBuilding(building.buildingId)
  };

  state.builders.jobs.push(job);
  updateServerTime(state);

  return job;
}

function completeFinishedJobsForState(
  state,
  atTimeMs = nowMs()
) {
  if (!state || !state.builders || !Array.isArray(state.builders.jobs)) return false;
  if (!Array.isArray(state.buildings)) return false;
  const now =
    Math.max(0, Number(atTimeMs) || nowMs());

  let changed = false;

  for (const job of state.builders.jobs) {
    if (!job) continue;
    if (job.isCompleted) continue;
    if (now < job.endsAtMs) continue;

    job.isCompleted = true;
    changed = true;

    const building = state.buildings.find(
      (b) => b && b.instanceId === job.buildingInstanceId
    );

    if (building) {
      if (job.kind === "build") {
        building.level = Math.max(1, Number(job.targetLevel) || 1);
      }

      if (job.kind === "upgrade") {
        building.level = Math.max(1, Number(job.targetLevel) || 1);
      }

      building.isCompleted = true;
      building.buildFinishTimeMs = 0;
    }
  }

  state.builders.jobs = state.builders.jobs.filter(job => job && !job.isCompleted);

if (changed) {
  updateServerTime(state);

  // Binaların yol bağlantısını yenilə.
  refreshRoadAccessForBuildings(state);

  // Tikinti işçisi sayını yenilə.
  refreshBuilderCapacity(state);

  // Anbar tutumlarını yenilə.
  refreshResourceCaps(state);

  // Əhali və xüsusi bina bonuslarını yenilə.
  refreshSpecialStats(state);

  // Texnologiya bonuslarını yenilə.
}

  return changed;
}

function nextPlayerDeadlineAtMs(state) {
  if (!state || typeof state !== "object") {
    return null;
  }

  let next = Number.POSITIVE_INFINITY;

  const zeroingRecallDueAt =
    pvpZeroingRecallDeadlineAtMs(
      state,
      nowMs()
    );

  if (
    Number.isFinite(
      Number(zeroingRecallDueAt)
    ) &&
    Number(zeroingRecallDueAt) > 0
  ) {
    next = Math.min(
      next,
      Number(zeroingRecallDueAt)
    );
  }

  const lastShelterScienceEndsAt =
    verifiedScienceResearchDeadlineAtMs(
      state
    );

  if (
    Number.isFinite(
      Number(
        lastShelterScienceEndsAt
      )
    ) &&
    Number(
      lastShelterScienceEndsAt
    ) > 0
  ) {
    next = Math.min(
      next,
      Number(
        lastShelterScienceEndsAt
      )
    );
  }

  const jobs =
    state.builders &&
    Array.isArray(state.builders.jobs)
      ? state.builders.jobs
      : [];

  for (const job of jobs) {
    if (!job || job.isCompleted) continue;

    const endsAt = Number(job.endsAtMs);
    if (Number.isFinite(endsAt) && endsAt > 0) {
      next = Math.min(next, endsAt);
    }
  }

  const queues =
    state.army &&
    state.army.trainingQueues &&
    typeof state.army.trainingQueues === "object"
      ? state.army.trainingQueues
      : null;

  if (queues) {
    for (const queue of Object.values(queues)) {
      if (!queue) continue;

      const finishAt = Number(queue.finishTimeMs);
      if (
        Number.isFinite(finishAt) &&
        finishAt > 0
      ) {
        next = Math.min(next, finishAt);
      }
    }
  }

  return Number.isFinite(next)
    ? next
    : null;
}

function schedulePlayerDeadline(playerId, state) {
  const nextDueAt =
    nextPlayerDeadlineAtMs(state);

  if (nextDueAt == null) {
    deadlineScheduler.cancel(playerId);
    return null;
  }

  deadlineScheduler.schedule(
    playerId,
    nextDueAt
  );

  return nextDueAt;
}

function processTrainingQueuesForState(
  state,
  playerId,
  atTimeMs = nowMs()
) {
  if (
    !state ||
    !state.army ||
    !state.army.trainingQueues ||
    typeof state.army.trainingQueues !== "object"
  ) {
    return false;
  }

  if (!state.army.troops) {
    state.army.troops = {};
  }

  const now =
    Math.max(0, Number(atTimeMs) || nowMs());

  let changed = false;

  for (
    const buildingInstanceId of
    Object.keys(state.army.trainingQueues)
  ) {
    const queue =
      state.army.trainingQueues[
        buildingInstanceId
      ];

    if (!queue) continue;
    if (now < Number(queue.finishTimeMs || 0)) {
      continue;
    }

    const unitId = queue.unitId;
    const count =
      Math.max(0, Number(queue.count) || 0);

    if (
      typeof state.army.troops[unitId] !==
      "number"
    ) {
      state.army.troops[unitId] = 0;
    }

    state.army.troops[unitId] += count;

    delete state.army.trainingQueues[
      buildingInstanceId
    ];

    changed = true;

    console.log("[TRAIN_FINISHED]", {
      playerId,
      buildingInstanceId,
      unitId,
      added: count,
      newTotal: state.army.troops[unitId]
    });
  }

  if (changed) {
    updateServerTime(state);
  }

  return changed;
}

function settlePlayerTimeline(
  state,
  playerId,
  targetTimeMs = nowMs()
) {
  if (!state) {
    return {
      stateChanged: false,
      builderChanged: false,
      nextDueAtMs: null
    };
  }

  const targetNow =
    Math.max(
      0,
      Number(targetTimeMs) || nowMs()
    );

  let stateChanged = false;
  let builderChangedAny = false;
  // Korlanmis state sonsuz loop yaratmasin.
  let guard = 0;

  while (guard < 1000) {
    guard += 1;

    const nextDueAt =
      nextPlayerDeadlineAtMs(state);

    if (
      nextDueAt == null ||
      nextDueAt > targetNow
    ) {
      break;
    }

    // Deadline-dan bir millisaniye evvele qeder kohne istehsal rate-i.
    if (
      processProductionForState(
        state,
        Math.max(0, nextDueAt - 1)
      )
    ) {
      stateChanged = true;
    }

    const completedLastShelterScience =
      verifiedScienceResearchYekunlasdir(
        state,
        nextDueAt
      );

    const builderChanged =
      completeFinishedJobsForState(
        state,
        nextDueAt
      );

    const trainingChanged =
      processTrainingQueuesForState(
        state,
        playerId,
        nextDueAt
      );

    const eventChanged =
      completedLastShelterScience.length > 0 ||
      builderChanged ||
      trainingChanged;

    if (!eventChanged) {
      console.warn(
        "[DEADLINE_SCHEDULER] Due deadline state-i deyismedi:",
        {
          playerId,
          nextDueAt
        }
      );
      break;
    }

    if (builderChanged) {
      builderChangedAny = true;
    }

    stateChanged = true;

    // Production tick event vaxtina tam dusurse yeni state/rate ile hesablanir.
    if (
      processProductionForState(
        state,
        nextDueAt
      )
    ) {
      stateChanged = true;
    }
  }

  if (guard >= 1000) {
    console.error(
      "[DEADLINE_SCHEDULER] Guard limit catdi:",
      playerId
    );
  }

  // Son event-den cari vaxta qeder qalan production tick-leri.
  if (
    processProductionForState(
      state,
      targetNow
    )
  ) {
    stateChanged = true;
  }

  return {
    stateChanged,
    builderChanged:
      builderChangedAny,
    nextDueAtMs:
      nextPlayerDeadlineAtMs(state)
  };
}

async function processPlayerDeadline(playerId) {
  let state =
    players.get(
      playerId
    );

  if (!state) {
    return null;
  }

  try {
    const zeroingRecall =
      await pvpZeroingPendingRecalliniBerpaEt({
        state,
        playerId,
        nowMs:
          nowMs(),
        recallFn:
          pvpZeroingKonvoyRecalliniPostCommitIcraEt,
        refreshFn:
          async id => {
            runtimeStateSync
              .markStale(
                id
              );

            return await runtimeStateSync
              .ensureFresh(
                id,
                {
                  force: true,
                  push: true
                }
              );
          }
      });

    if (
      zeroingRecall &&
      zeroingRecall.handled === true
    ) {
      state =
        players.get(
          playerId
        );

      if (!state) {
        return null;
      }
    }
  }
  catch (error) {
    console.error(
      "[PVP_ZEROING_DEADLINE_RECALL] Pending recall retry failed:",
      {
        playerId,
        message:
          error && error.message
            ? error.message
            : String(error)
      }
    );

    return nowMs() + 1000;
  }

  let netice;

  try {
    netice =
      await authoritativeDeadlineProcessor(
        playerId
      );
  }
  catch (error) {
    console.error(
      "[DEADLINE_SCHEDULER] Authoritative commit failed:",
      {
        playerId,
        message:
          error && error.message
            ? error.message
            : String(error)
      }
    );

    // Transient Redis/PostgreSQL problemi deadline-i birdəfəlik itirməsin.
    return nowMs() + 1000;
  }

  if (!netice) {
    return null;
  }

  state =
    players.get(
      playerId
    );

  if (!state) {
    return null;
  }

  if (netice.stateChanged) {
    await pushStateToPlayerConnections(
      playerId,
      state
    );
  }

  if (netice.builderChanged) {
    console.log(
      "[SERVER] Build completed for player:",
      playerId
    );
  }

  return netice.nextDueAtMs;
}



////////////////////////////////////////


// ============================================================
// COMMAND ROUTER
// ------------------------------------------------------------
// WebSocket command-lari modular handler-lere route olunur.
// server.js daxilinde legacy gameplay switch artiq yoxdur.
// ============================================================

const runtimeIdempotencyExecutor =
  stateIdempotencyExecutorYarat({
    getPlayerState:
      getOrCreatePlayerState,
    nowMs
  });

const postgresAuthoritativeMutationExecutor =
  postgresAuthoritativeMutationExecutorYarat({
    getOrCreatePlayerState,
    prepareLockedState:
      async (
        state,
        playerId
      ) => {
        settlePlayerTimeline(
          state,
          playerId,
          nowMs()
        );
      },
    afterCommit:
      async (
        playerId,
        state,
        metadata
      ) => {
        schedulePlayerDeadline(
          playerId,
          state
        );

        if (
          metadata &&
          metadata.changed === true
        ) {
          await runtimeStateSync
            .publishInvalidation(
              runtimeBus,
              playerId,
              {
                type:
                  metadata.type ||
                  "state_commit",
                committedAtMs:
                  nowMs()
              }
            );
        }
      }
  });

const runtimeAuthoritativeMutationExecutor =
  async (
    playerId,
    action,
    metadata
  ) =>
    await oyuncuMutasiyaKilidiIleIcraEt(
      playerId,
      async () =>
        await postgresAuthoritativeMutationExecutor(
          playerId,
          action,
          metadata
        )
    );

const worldStatePostgresAuthoritativeMutationExecutor =
  postgresAuthoritativeMutationExecutorYarat({
    getOrCreatePlayerState,
    transactionExecutor:
      worldStateOyuncuMutasiyasiniPostgresIleIcraEt,
    prepareLockedState:
      async (
        state,
        playerId
      ) => {
        settlePlayerTimeline(
          state,
          playerId,
          nowMs()
        );
      },
    afterCommit:
      async (
        playerId,
        state,
        metadata
      ) => {
        schedulePlayerDeadline(
          playerId,
          state
        );

        if (
          metadata &&
          metadata.changed === true
        ) {
          await runtimeStateSync
            .publishInvalidation(
              runtimeBus,
              playerId,
              {
                type:
                  metadata.type ||
                  "state_commit",
                committedAtMs:
                  nowMs()
              }
            );
        }
      }
  });

const runtimeWorldStateAuthoritativeMutationExecutor =
  async (
    playerId,
    action,
    metadata
  ) =>
    await oyuncuMutasiyaKilidiIleIcraEt(
      playerId,
      async () =>
        await worldStatePostgresAuthoritativeMutationExecutor(
          playerId,
          action,
          metadata
        )
    );

const runtimeCommandRouter =
  new RuntimeCommandRouter({
    name: "gameplay",
    mutationExecutor:
      oyuncuMutasiyaKilidiIleIcraEt,
    authoritativeMutationExecutor:
      runtimeAuthoritativeMutationExecutor,
    worldStateAuthoritativeMutationExecutor:
      runtimeWorldStateAuthoritativeMutationExecutor,
    idempotencyExecutor:
      runtimeIdempotencyExecutor
  });

coreReadCommandleriniQeydEt(
  runtimeCommandRouter,
  {
    getOrCreatePlayerState,
    ensureFreshPlayerState:
      playerId =>
        runtimeStateSync
          .ensureFresh(
            playerId
          ),
    updateServerTime,
    makeClientState,
    buildStateLocalMapPayloadAuthoritative,
    buildWorldMapPayloadForClientAuthoritative
  }
);

authCommandiniQeydEt(
  runtimeCommandRouter,
  {
    connections,
    runtimeBus,
    getOrCreatePlayerState,
    ensureFreshPlayerState:
      playerId =>
        runtimeStateSync
          .ensureFresh(
            playerId
          ),
    updateServerTime,
    schedulePlayerDeadline,
    makeClientState,
    makeLastShelterResourcePayload:
      (state, atTimeMs) =>
        lastShelterResourcePayloadHazirla(
          state,
          atTimeMs
        ),
    makeLastShelterInitPayload:
      (state, playerId) =>
        lastShelterInitPayloadHazirla(
          state,
          playerId
        ),
    sendStateLocalMapToPlayer,
    sendWorldMapToPlayer
  }
);

gameplayMutationCommandleriniQeydEt(
  runtimeCommandRouter,
  {
    getOrCreatePlayerState,
    normalizeBuildingId,
    updateServerTime,
    schedulePlayerDeadline,
    makeClientState,
    hasFreeBuilder,
    isGarageBuildingId,
    getLevelData,
    hasEnoughResources,
    spendResources,
    getBuilderSlotsRequiredForBuilding,
    refreshBuilderCapacity,
    isUpgradeDisabledBuildingId,
    getMaxLevelForBuilding,
    createUpgradeJob
  }
);

buildCommandleriniQeydEt(
  runtimeCommandRouter,
  {
    getOrCreatePlayerState,
    normalizeBuildingId,
    removeRoadAtCell,
    checkUnlockRequirements,
    countPlacedBuildingsOfType,
    getMaxPlacedCountForBuilding,
    getAllowedPlacedCountForBuilding,
    getNextUnlockCountRequirement,
    hasUnfinishedBuildingOfSameType,
    canPlaceBuilding,
    isGarageBuildingId,
    getLevelData,
    hasEnoughResources,
    spendResources,
    placeBuildingWithoutStarting,
    syncResourceSlotOccupancy,
    refreshRoadAccessForBuildings,
    refreshBuilderCapacity,
    makeClientState,
    sendStateLocalMapToPlayer,
    sendWorldMapToPlayer
  }
);

mapMutationCommandleriniQeydEt(
  runtimeCommandRouter,
  {
    getOrCreatePlayerState,
    ensureMapState,
    expandUnlockedArea,
    updateServerTime,
    makeClientState,
    normalizeBuildingId,
    refreshRoadAccessForBuildings,
    findRoadPathAStar,
    createRoadsAlongPath,
    pushStateToPlayerConnections,
    teleportPlayerBaseInsideState,
    applyPlayerBaseTeleportInsideState,
    pushStateLocalMapToStatePlayers:
      pushStateLocalMapToStatePlayersAuthoritative,
    publishStateMapRefresh:
      (stateId, reason) =>
        runtimeWorldMapSync
          .publishBaseRefresh(
            runtimeBus,
            stateId,
            reason
          ),
    publishCenterUpdate:
      (stateId, result) =>
        runtimeWorldMapSync
          .publishCenterUpdate(
            runtimeBus,
            stateId,
            result
          ),
    canMoveThisBuilding,
    canMoveBuilding,
    syncResourceSlotOccupancy,
    getWorldStateRuntime,
    dovletBazalariniBirbasaPostgresdenAlClient,
    dovletBazaKeshiniTemizle,
    occupyStateCenterPostgresClient,
    pushWorldMapToAllAuthedPlayers
  }
);

accountCommandleriniQeydEt(
  runtimeCommandRouter,
  {
    hesabYaratVeBagla,
    emailTesdiqKoduHazirla,
    tesdiqKoduEmailiGonder,
    emailTesdiqKodunuYoxla,
    getOrCreatePlayerState,
    oyuncuProfiliniTeminEt,
    updateServerTime,
    pushStateToPlayerConnections
  }
);

lastShelterItemCommandleriniQeydEt(
  runtimeCommandRouter,
  {
    getOrCreatePlayerState
  }
);

lastShelterTutorialCommandiniQeydEt(
  runtimeCommandRouter,
  {
    getOrCreatePlayerState
  }
);

lastShelterWorldCupCommandleriniQeydEt(
  runtimeCommandRouter
);

lastShelterResourceCommandiniQeydEt(
  runtimeCommandRouter,
  {
    getOrCreatePlayerState
  }
);

lastShelterEconomyReferenceCommandleriniQeydEt(
  runtimeCommandRouter,
  {
    getOrCreatePlayerState
  }
);

lastShelterEngagementCommandleriniQeydEt(
  runtimeCommandRouter,
  {
    getOrCreatePlayerState
  }
);

lastShelterMissionCommandleriniQeydEt(
  runtimeCommandRouter,
  {
    getOrCreatePlayerState
  }
);

lastShelterBuildingReferenceCommandleriniQeydEt(
  runtimeCommandRouter
);

lastShelterQueueScienceCommandleriniQeydEt(
  runtimeCommandRouter,
  {
    getOrCreatePlayerState
  }
);

lastShelterTroopReferenceCommandleriniQeydEt(
  runtimeCommandRouter
);

lastShelterInitCommandiniQeydEt(
  runtimeCommandRouter,
  {
    getOrCreatePlayerState,
    ensureFreshPlayerState:
      playerId =>
        runtimeStateSync
          .ensureFresh(
            playerId
          ),
    updateServerTime
  }
);


// ============================================================
// HTTP SERVER
// ============================================================

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    const redisHealthy =
      !runtimeBus.required ||
      (runtimeBus.enabled && runtimeBus.ready);

    const statusCode =
      redisHealthy ? 200 : 503;

    res.writeHead(statusCode, {
      "Content-Type": "application/json"
    });

    res.end(JSON.stringify({
      ok: redisHealthy,
      time: nowMs(),
      deployment:
        runtimeDeployPublicInfo,
      redis:
        runtimeBus.snapshot(),
      websocket: {
        connections:
          typeof wss !== "undefined"
            ? wss.clients.size
            : 0,
        ...websocketGuard.snapshot()
      }
    }));

    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("RDC WS server is running");
});

const wss = new WebSocket.Server({
  server,
  maxPayload:
    websocketRuntimeConfig.maxPayloadBytes,
  perMessageDeflate: false
});

const stopWebSocketHeartbeat =
  websocketGuard.startHeartbeat(
    wss
  );

// ============================================================
// WS CONNECTIONS
// ============================================================

wss.on("connection", (ws, req) => {
  const ip = req.socket.remoteAddress;

  ws._clientId = crypto.randomBytes(6).toString("hex");
  ws._authedPlayerId = null;

  websocketGuard.attach(
    ws,
    nowMs()
  );

  console.log("WS connected:", ip);

  send(ws, {
    type: "hello",
    serverTimeUnixMs: nowMs()
  });

  ws.on("message", async (data) => {
    const inboundCheck =
      websocketGuard.acceptInbound(
        ws,
        data,
        nowMs()
      );

    if (!inboundCheck.ok) {
      send(ws, {
        type: "error",
        code: inboundCheck.code,
        message: inboundCheck.message
      });

      try {
        ws.close(
          inboundCheck.closeCode,
          inboundCheck.code
        );
      }
      catch (_) {
      }

      return;
    }

    const text = data.toString();
    const [msg, err] = safeJsonParse(text);

    if (err) {
      send(ws, {
        type: "error",
        code: "INVALID_JSON",
        message: "Invalid JSON"
      });
      return;
    }

    console.log("[SERVER PARSED TYPE]", msg.type);

    const type = msg.type;
    const requestId =
      requestIdAl(msg);

    const cavabGonder =
      correlatedSendYarat(
        send,
        requestId
      );

    const hesabLoginEmalOlundu =
    await hesabLoginMesajiniEmalEt({
      type,
      msg,
      ws,
      send: cavabGonder,
      nowMs,
      connections,
      runtimeBus,
      getOrCreatePlayerState,
      ensureFreshPlayerState:
        playerId =>
          runtimeStateSync
            .ensureFresh(
              playerId
            ),
      updateServerTime,
      makeClientState,
      sendStateLocalMapToPlayer,
      sendWorldMapToPlayer
    });

  if (hesabLoginEmalOlundu) {
    return;
  }

  const sifreSifirlamaEmalOlundu =
    await sifreSifirlamaMesajiniEmalEt({
      type,
      msg,
      ws,
      send: cavabGonder,
      nowMs
    });

  if (sifreSifirlamaEmalOlundu) {
    return;
  }

  const runtimeCommandEmalOlundu =
    await runtimeCommandRouter.dispatch({
      type,
      msg,
      ws,
      send: cavabGonder,
      nowMs
    });

  if (runtimeCommandEmalOlundu) {
    return;
  }

  cavabGonder(ws, {
    type: "error",
    code: "UNKNOWN_COMMAND",
    message: "Unknown type"
  });
  });

  ws.on("close", () => {
    const playerId = ws._authedPlayerId;
    if (playerId) {
      connections.deleteIfCurrent(playerId, ws);

      if (!connections.has(playerId)) {
        runtimeBus.unregisterLocalPlayer(playerId).catch((error) => {
          console.error(
            "[REDIS] Presence unregister error:",
            error && error.message ? error.message : error
          );
        });
      }
    }

    console.log("WS closed");
  });
});



// ============================================================
// RUNTIME SCHEDULING
// ------------------------------------------------------------
// Construction / research / training artıq bütün player-ləri
// hər saniyə scan etmir. RuntimeDeadlineScheduler yalnız aktiv
// deadline olan player-ləri vaxtı çatanda oyadır.
//
// Resource production 5 saniyəlik iqtisadiyyat semantikasını saxlayır,
// amma artıq global scan yoxdur: elapsed-time/lazy settlement işləyir.
// ============================================================

// City production is lazy/elapsed-time based; global player scan yoxdur.

// ============================================================
// SERVER START
// ============================================================

async function runtimeServeriniBaslat() {
  try {
    const metadata =
      await worldStateMetadatalariniAl();

    worldRuntimeMetadatalariniTetbiqEt(
      metadata
    );

    console.log(
      "[WORLD_STATE_RUNTIME] PostgreSQL metadata yükləndi:",
      {
        stateCount:
          metadata.length,
        activeStateIdForNewPlayers:
          worldRuntime
            .activeStateIdForNewPlayers
      }
    );
  }
  catch (error) {
    console.error(
      "[WORLD_STATE_RUNTIME] Startup metadata load failed:",
      error &&
      error.message
        ? error.message
        : error
    );

    // Multi-instance State allocation local RAM fallback-a düşməməlidir.
    setImmediate(
      () => process.exit(1)
    );

    return false;
  }

  try {
    await runtimeBus.start();
  }
  catch (error) {
    console.error(
      "[REDIS] Startup error:",
      error && error.message ? error.message : error
    );

    if (runtimeBus.required) {
      // Multi-instance production required Redis olmadan trafik qəbul etmir.
      setImmediate(
        () => process.exit(1)
      );
      return false;
    }
  }

  server.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        "Server started on " + PORT
      );
    }
  );

  return true;
}

let gracefulShutdownBaslayib = false;

async function gracefulShutdown(signal) {
  if (gracefulShutdownBaslayib) {
    return;
  }

  gracefulShutdownBaslayib = true;

  console.log("[SERVER] Graceful shutdown:", signal);

  deadlineScheduler.stop();
  stopWebSocketHeartbeat();

  try {
    await runtimeBus.close();
  }
  catch (error) {
    console.error(
      "[REDIS] Shutdown error:",
      error && error.message ? error.message : error
    );
  }

  try {
    wss.clients.forEach((client) => {
      try {
        if (client.readyState === WebSocket.OPEN) {
          client.close(1001, "server_shutdown");
        }
      }
      catch (_) {
      }
    });
  }
  catch (_) {
  }

  server.close(() => {
    process.exit(0);
  });

  const forcedExit = setTimeout(() => {
    process.exit(1);
  }, 8000);

  if (typeof forcedExit.unref === "function") {
    forcedExit.unref();
  }
}

process.once(
  "SIGTERM",
  () => void gracefulShutdown("SIGTERM")
);

process.once(
  "SIGINT",
  () => void gracefulShutdown("SIGINT")
);

void runtimeServeriniBaslat();
