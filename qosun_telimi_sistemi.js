"use strict";

const {
  qosunMelumatiniAl,
  binaSinifiniAl,
  qosunKilidiniYoxla,
  telimXerciniHesabla: kataloqTelimXerciniHesabla,
  telimMuddetiniHesabla: kataloqTelimMuddetiniHesabla,
  kataloquClientUcunHazirla
} = require("./qosun_kataloqu");

const LEGACY_UNIT_ALIASES = Object.freeze({
  fighter_lv1: "warrior_t1",
  fighter_lv2: "warrior_t2",
  fighter_lv3: "warrior_t3",
  fighter_lv4: "warrior_t4",
  fighter_lv5: "warrior_t5",
  fighter_lv6: "warrior_t6",
  fighter_lv7: "warrior_t7",
  fighter_lv8: "warrior_t8",
  fighter_lv9: "warrior_t9",
  fighter_lv10: "warrior_t10",
  shooter_lv1: "shooter_t1",
  shooter_lv2: "shooter_t2",
  shooter_lv3: "shooter_t3",
  shooter_lv4: "shooter_t4",
  shooter_lv5: "shooter_t5",
  shooter_lv6: "shooter_t6",
  shooter_lv7: "shooter_t7",
  shooter_lv8: "shooter_t8",
  shooter_lv9: "shooter_t9",
  shooter_lv10: "shooter_t10",
  vehicle_lv1: "vehicle_t1",
  vehicle_lv2: "vehicle_t2",
  vehicle_lv3: "vehicle_t3",
  vehicle_lv4: "vehicle_t4",
  vehicle_lv5: "vehicle_t5",
  vehicle_lv6: "vehicle_t6",
  vehicle_lv7: "vehicle_t7",
  vehicle_lv8: "vehicle_t8",
  vehicle_lv9: "vehicle_t9",
  vehicle_lv10: "vehicle_t10"
});

function metnAl(deyer, maksimum = 128, kicikHerf = true) {
  if (typeof deyer !== "string") return "";
  const temiz = deyer.trim().slice(0, maksimum);
  return kicikHerf ? temiz.toLowerCase() : temiz;
}

function tamEded(deyer) {
  const n = Number(deyer);
  return Number.isFinite(n)
    ? Math.max(0, Math.trunc(n))
    : 0;
}

function kopyala(deyer) {
  return deyer == null
    ? null
    : JSON.parse(JSON.stringify(deyer));
}

function canonicalUnitIdAl(unitId) {
  const id = metnAl(unitId, 128);
  return LEGACY_UNIT_ALIASES[id] || id;
}

function telimBinasiIdUygundur(buildingId) {
  return !!binaSinifiniAl(buildingId);
}

function armyStateTeminEt(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new Error("Qoşun təlimi üçün oyunçu state-i yoxdur.");
  }

  if (!state.army || typeof state.army !== "object" || Array.isArray(state.army)) {
    state.army = {};
  }

  if (!state.army.troops || typeof state.army.troops !== "object" || Array.isArray(state.army.troops)) {
    state.army.troops = {};
  }

  if (
    !state.army.trainingQueues ||
    typeof state.army.trainingQueues !== "object" ||
    Array.isArray(state.army.trainingQueues)
  ) {
    state.army.trainingQueues = {};
  }

  return state.army;
}

function resourcesStateTeminEt(state) {
  if (!state.resources || typeof state.resources !== "object" || Array.isArray(state.resources)) {
    state.resources = {};
  }

  for (const id of ["food", "wood", "iron", "fuel", "water", "electricity", "money", "chips"]) {
    const raw = Number(state.resources[id]);
    state.resources[id] = Number.isFinite(raw) ? Math.max(0, raw) : 0;
  }

  return state.resources;
}

function movcudTrainingQueuesAl(state) {
  const queues = state && state.army && state.army.trainingQueues;
  return queues && typeof queues === "object" && !Array.isArray(queues)
    ? queues
    : null;
}

function trainingSpeedPctAl(state, unitId = "warrior_t1") {
  const id = canonicalUnitIdAl(unitId);
  const hesab = kataloqTelimMuddetiniHesabla(state, id, 1);
  return hesab ? hesab.speedPct : 0;
}

function telimMuddetiniHesabla(state, unitIdOrCount, rawCount) {
  // Köhnə unit tests və köhnə lokal çağırışlar üçün yalnız helper səviyyəsində
  // 5 saniyəlik fallback saxlanılır. Real training start həmişə kataloqdan keçir.
  if (rawCount === undefined && Number.isFinite(Number(unitIdOrCount))) {
    const say = tamEded(unitIdOrCount);
    if (say <= 0) return 0;
    const raw = say * 5000;
    const stats = state && state.technology && state.technology.stats;
    const speedPct = Math.max(0, Number(stats && stats.trainingSpeedPct) || 0);
    return speedPct > 0
      ? Math.max(1000, Math.round(raw * (100 / (100 + speedPct))))
      : raw;
  }

  const id = canonicalUnitIdAl(unitIdOrCount);
  const hesab = kataloqTelimMuddetiniHesabla(state, id, rawCount);
  return hesab ? hesab.finalDurationMs : 0;
}

function xercCatir(state, finalCost) {
  const resources = resourcesStateTeminEt(state);

  for (const item of Array.isArray(finalCost) ? finalCost : []) {
    const type = metnAl(item && item.type, 64);
    const need = tamEded(item && item.amount);
    const have = Math.max(0, Number(resources[type]) || 0);

    if (!type || need <= 0) continue;
    if (have < need) {
      return {
        success: false,
        resourceId: type,
        need,
        have,
        missing: need - have
      };
    }
  }

  return { success: true };
}

function xercCix(state, finalCost) {
  const resources = resourcesStateTeminEt(state);
  for (const item of Array.isArray(finalCost) ? finalCost : []) {
    const type = metnAl(item && item.type, 64);
    const amount = tamEded(item && item.amount);
    if (!type || amount <= 0) continue;
    resources[type] = Math.max(0, (Number(resources[type]) || 0) - amount);
  }
}

function binaTap(state, buildingInstanceId) {
  const id = metnAl(buildingInstanceId, 128, false);
  if (!id || !Array.isArray(state && state.buildings)) return null;
  return state.buildings.find(x => x && x.instanceId === id) || null;
}

function qosunTelimOnBaxisiniHazirla(state, buildingInstanceId, unitId, rawCount) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return { success: false, message: "Qoşun təlimi üçün oyunçu state-i yoxdur." };
  }

  const binaInstanceId = metnAl(buildingInstanceId, 128, false);
  const canonicalUnitId = canonicalUnitIdAl(unitId);
  const count = tamEded(rawCount);

  if (!binaInstanceId) return { success: false, reason: "missing_building_instance_id", message: "buildingInstanceId boşdur." };
  if (!canonicalUnitId) return { success: false, reason: "missing_unit_id", message: "unitId boşdur." };
  if (count <= 0) return { success: false, reason: "invalid_count", message: "Qoşun sayı 0-dan böyük olmalıdır." };
  if (count > 1000000000) return { success: false, reason: "count_too_large", message: "Qoşun sayı server təhlükəsizlik limitini keçir." };

  const building = binaTap(state, binaInstanceId);
  if (!building) return { success: false, reason: "building_not_found", message: "Qoşun binası tapılmadı." };
  if (!telimBinasiIdUygundur(building.buildingId)) {
    return { success: false, reason: "invalid_training_building", message: "Bu bina qoşun hazırlaya bilməz." };
  }

  const unlock = qosunKilidiniYoxla(state, building, canonicalUnitId);
  if (!unlock || unlock.success !== true) {
    return {
      success: false,
      reason: unlock && unlock.reason ? unlock.reason : "unit_locked",
      message: unlock && unlock.message ? unlock.message : "Qoşun hələ açılmayıb.",
      requiredBuildingLevel: unlock && unlock.requiredBuildingLevel,
      currentBuildingLevel: unlock && unlock.currentBuildingLevel,
      requiredResearchId: unlock && unlock.requiredResearchId
    };
  }

  const queues = movcudTrainingQueuesAl(state);
  if (queues && queues[binaInstanceId]) {
    return {
      success: false,
      reason: "training_queue_busy",
      message: "Bu binada artıq aktiv qoşun hazırlığı var.",
      activeQueue: kopyala(queues[binaInstanceId])
    };
  }

  const costInfo = kataloqTelimXerciniHesabla(state, canonicalUnitId, count);
  const timeInfo = kataloqTelimMuddetiniHesabla(state, canonicalUnitId, count);
  if (!costInfo || !timeInfo) {
    return { success: false, reason: "catalog_calculation_failed", message: "Qoşun kataloq hesabı yaradıla bilmədi." };
  }

  const resourceCheck = xercCatir(state, costInfo.finalCost);
  const unit = qosunMelumatiniAl(canonicalUnitId);

  return {
    success: resourceCheck.success === true,
    reason: resourceCheck.success === true ? "" : "not_enough_resources",
    message: resourceCheck.success === true
      ? ""
      : `${resourceCheck.resourceId} kifayət etmir. Lazımdır: ${resourceCheck.need}, mövcuddur: ${resourceCheck.have}.`,
    buildingInstanceId: binaInstanceId,
    buildingId: metnAl(building.buildingId, 128),
    buildingLevel: Math.max(1, tamEded(building.level) || 1),
    unit: unit ? {
      unitId: unit.unitId,
      classId: unit.classId,
      displayNameAz: unit.displayNameAz,
      tier: unit.tier,
      requiredBuildingLevel: unit.requiredBuildingLevel,
      requiredResearchId: unit.requiredResearchId
    } : null,
    count,
    costInfo,
    timeInfo,
    resourceCheck
  };
}

function qosunTelimleriniYekunlasdir(state, nowMs = Date.now()) {
  const queues = movcudTrainingQueuesAl(state);

  if (!queues) {
    return { success: true, deyisdi: false, tamamlananlar: [] };
  }

  const indi = tamEded(nowMs) || Date.now();
  const tamamlananlar = [];
  let army = null;

  for (const buildingInstanceId of Object.keys(queues)) {
    const queue = queues[buildingInstanceId];
    if (!queue || typeof queue !== "object") continue;

    const finishTimeMs = tamEded(queue.finishTimeMs);
    if (finishTimeMs <= 0 || indi < finishTimeMs) continue;

    const unitId = canonicalUnitIdAl(queue.unitId);
    const count = tamEded(queue.count);
    const unit = qosunMelumatiniAl(unitId);

    // Köhnə/saxta etibarsız queue serveri sonsuz busy vəziyyətində saxlamasın.
    // Kataloqda olmayan qoşun heç vaxt orduya verilmir.
    if (!unit || count <= 0) {
      delete queues[buildingInstanceId];
      tamamlananlar.push({
        buildingInstanceId: metnAl(buildingInstanceId, 128, false),
        unitId,
        count: 0,
        finishTimeMs,
        etibarsiz: true
      });
      continue;
    }

    if (!army) army = armyStateTeminEt(state);

    army.troops[unit.unitId] = tamEded(army.troops[unit.unitId]) + count;
    delete army.trainingQueues[buildingInstanceId];

    tamamlananlar.push({
      buildingInstanceId: metnAl(buildingInstanceId, 128, false),
      unitId: unit.unitId,
      classId: unit.classId,
      tier: unit.tier,
      displayNameAz: unit.displayNameAz,
      count,
      finishTimeMs,
      etibarsiz: false
    });
  }

  if (tamamlananlar.length > 0) state.serverTimeUnixMs = indi;

  return {
    success: true,
    deyisdi: tamamlananlar.length > 0,
    tamamlananlar: kopyala(tamamlananlar)
  };
}

function qosunTeliminiBaslat(state, buildingInstanceId, unitId, rawCount, nowMs = Date.now()) {
  const preview = qosunTelimOnBaxisiniHazirla(
    state,
    buildingInstanceId,
    unitId,
    rawCount
  );

  if (!preview || preview.success !== true) {
    return {
      success: false,
      deyisdi: false,
      reason: preview && preview.reason,
      message: preview && preview.message ? preview.message : "Qoşun təlimi başlatmaq mümkün olmadı.",
      preview: preview ? kopyala(preview) : null
    };
  }

  const indi = tamEded(nowMs) || Date.now();
  const army = armyStateTeminEt(state);
  const unit = qosunMelumatiniAl(preview.unit.unitId);

  // Bütün validasiyalar keçdikdən sonra resurs çıxılır. Client qiymət və vaxt göndərmir.
  xercCix(state, preview.costInfo.finalCost);

  const queueEntry = {
    buildingInstanceId: preview.buildingInstanceId,
    buildingId: preview.buildingId,
    buildingLevelAtStart: preview.buildingLevel,
    unitId: unit.unitId,
    classId: unit.classId,
    tier: unit.tier,
    displayNameAz: unit.displayNameAz,
    count: preview.count,
    baseCost: kopyala(preview.costInfo.baseCost),
    paidCost: kopyala(preview.costInfo.finalCost),
    trainingCostReductionPct: preview.costInfo.reductionPct,
    baseTrainingSecondsPerUnit: preview.timeInfo.baseTrainingSecondsPerUnit,
    baseDurationMs: preview.timeInfo.baseDurationMs,
    trainingSpeedPct: preview.timeInfo.speedPct,
    durationMs: preview.timeInfo.finalDurationMs,
    startTimeMs: indi,
    finishTimeMs: indi + preview.timeInfo.finalDurationMs
  };

  army.trainingQueues[preview.buildingInstanceId] = queueEntry;
  state.serverTimeUnixMs = indi;

  return {
    success: true,
    deyisdi: true,
    queue: kopyala(queueEntry),
    durationMs: queueEntry.durationMs,
    paidCost: kopyala(queueEntry.paidCost),
    preview: kopyala(preview)
  };
}

function qosunTelimStatusunuHazirla(state, nowMs = Date.now()) {
  const completion = qosunTelimleriniYekunlasdir(state, nowMs);
  const army = armyStateTeminEt(state);
  const indi = tamEded(nowMs) || Date.now();

  const queues = Object.values(army.trainingQueues || {}).map(queue => ({
    ...kopyala(queue),
    remainingMs: Math.max(0, tamEded(queue.finishTimeMs) - indi),
    completedByTime: tamEded(queue.finishTimeMs) > 0 && indi >= tamEded(queue.finishTimeMs)
  }));

  return {
    success: true,
    deyisdi: completion.deyisdi === true,
    tamamlananlar: completion.tamamlananlar || [],
    activeQueues: queues,
    serverTimeUnixMs: indi
  };
}

function qosunKataloquClientUcunHazirla() {
  return kataloquClientUcunHazirla();
}

module.exports = {
  LEGACY_UNIT_ALIASES,
  canonicalUnitIdAl,
  telimBinasiIdUygundur,
  trainingSpeedPctAl,
  telimMuddetiniHesabla,
  qosunTelimOnBaxisiniHazirla,
  qosunTelimleriniYekunlasdir,
  qosunTeliminiBaslat,
  qosunTelimStatusunuHazirla,
  qosunKataloquClientUcunHazirla,
  armyStateTeminEt
};
