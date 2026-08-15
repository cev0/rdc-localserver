"use strict";

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

function telimBinasiIdUygundur(buildingId) {
  const id = metnAl(buildingId, 128);
  return id === "fighter_camp" ||
    id === "shooter_camp" ||
    id === "vehicle_factory";
}

function trainingSpeedPctAl(state) {
  const raw = Number(
    state &&
    state.technology &&
    state.technology.stats &&
    state.technology.stats.trainingSpeedPct
  );

  return Number.isFinite(raw)
    ? Math.max(0, raw)
    : 0;
}

function telimMuddetiniHesabla(state, count) {
  const say = tamEded(count);
  if (say <= 0) return 0;

  const xamMuddetMs = say * 5000;
  const suretFaizi = trainingSpeedPctAl(state);

  if (suretFaizi <= 0) {
    return xamMuddetMs;
  }

  return Math.max(
    1000,
    Math.round(xamMuddetMs * (100 / (100 + suretFaizi)))
  );
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

function movcudTrainingQueuesAl(state) {
  const queues =
    state &&
    state.army &&
    state.army.trainingQueues;

  return queues && typeof queues === "object" && !Array.isArray(queues)
    ? queues
    : null;
}

function qosunTelimleriniYekunlasdir(state, nowMs = Date.now()) {
  const queues = movcudTrainingQueuesAl(state);

  if (!queues) {
    return {
      success: true,
      deyisdi: false,
      tamamlananlar: []
    };
  }

  const indi = tamEded(nowMs) || Date.now();
  const tamamlananlar = [];
  let army = null;

  for (const buildingInstanceId of Object.keys(queues)) {
    const queue = queues[buildingInstanceId];
    if (!queue || typeof queue !== "object") continue;

    const finishTimeMs = tamEded(queue.finishTimeMs);
    if (finishTimeMs <= 0 || indi < finishTimeMs) continue;

    const unitId = metnAl(queue.unitId, 128);
    const count = tamEded(queue.count);

    // Etibarsız köhnə queue serveri sonsuz busy vəziyyətində saxlamasın.
    // Qoşun vermədən queue silinir və state düzəldilir.
    if (!unitId || count <= 0) {
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

    if (!army) {
      army = armyStateTeminEt(state);
    }

    army.troops[unitId] = tamEded(army.troops[unitId]) + count;
    delete army.trainingQueues[buildingInstanceId];

    tamamlananlar.push({
      buildingInstanceId: metnAl(buildingInstanceId, 128, false),
      unitId,
      count,
      finishTimeMs,
      etibarsiz: false
    });
  }

  if (tamamlananlar.length > 0) {
    state.serverTimeUnixMs = indi;
  }

  return {
    success: true,
    deyisdi: tamamlananlar.length > 0,
    tamamlananlar: kopyala(tamamlananlar)
  };
}

function qosunTeliminiBaslat(
  state,
  buildingInstanceId,
  unitId,
  rawCount,
  nowMs = Date.now()
) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return {
      success: false,
      deyisdi: false,
      message: "Qoşun təlimi üçün oyunçu state-i yoxdur."
    };
  }

  const binaInstanceId = metnAl(buildingInstanceId, 128, false);
  const birlikId = metnAl(unitId, 128);
  const count = tamEded(rawCount);

  if (!binaInstanceId) {
    return {
      success: false,
      deyisdi: false,
      message: "Missing buildingInstanceId"
    };
  }

  if (!birlikId) {
    return {
      success: false,
      deyisdi: false,
      message: "Missing unitId"
    };
  }

  if (count <= 0) {
    return {
      success: false,
      deyisdi: false,
      message: "Invalid count"
    };
  }

  const building = Array.isArray(state.buildings)
    ? state.buildings.find(
        bina => bina && bina.instanceId === binaInstanceId
      )
    : null;

  if (!building) {
    return {
      success: false,
      deyisdi: false,
      message: "Building not found"
    };
  }

  if (!telimBinasiIdUygundur(building.buildingId)) {
    return {
      success: false,
      deyisdi: false,
      message: "This building cannot train units"
    };
  }

  if (building.isCompleted !== true) {
    return {
      success: false,
      deyisdi: false,
      message: "Building is not completed"
    };
  }

  const queues = movcudTrainingQueuesAl(state);
  if (queues && queues[binaInstanceId]) {
    return {
      success: false,
      deyisdi: false,
      message: "Training queue already busy"
    };
  }

  const indi = tamEded(nowMs) || Date.now();
  const durationMs = telimMuddetiniHesabla(state, count);
  const army = armyStateTeminEt(state);

  const queueEntry = {
    buildingInstanceId: binaInstanceId,
    unitId: birlikId,
    count,
    startTimeMs: indi,
    finishTimeMs: indi + durationMs
  };

  army.trainingQueues[binaInstanceId] = queueEntry;
  state.serverTimeUnixMs = indi;

  return {
    success: true,
    deyisdi: true,
    queue: kopyala(queueEntry),
    durationMs
  };
}

module.exports = {
  telimBinasiIdUygundur,
  trainingSpeedPctAl,
  telimMuddetiniHesabla,
  qosunTelimleriniYekunlasdir,
  qosunTeliminiBaslat,
  armyStateTeminEt
};
