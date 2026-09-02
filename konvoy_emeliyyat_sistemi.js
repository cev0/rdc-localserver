"use strict";

const {
  nodeMelumatiniAl,
  toplamaniBaslat,
  bitmisToplamalariPendingEt,
  pendingMukafatiAl
} = require("./xerite_resurs_toplama_sistemi");
const { dusmenDescriptor } = require("./xerite_dusmen_sistemi");
const {
  DOYUS_NETICE_GOZLEME_MS,
  doyusaBasla,
  doyusuNeticelendir
} = require("./xerite_dusmen_doyus_sistemi");
const {
  resursMovqeyiAl,
  dusmenMovqeyiAl
} = require("./xerite_movqe_sistemi");
const {
  raportYarat,
  raportuTap
} = require("./doyus_raport_sistemi");
const { raportResursMukafatiniAl } = require("./doyus_raport_mukafat_sistemi");
const { itkiPlaniniHazirla } = require("./doyus_itki_sistemi");
const {
  serverItkiPlaniniTetbiqEt,
  yungulYaralilariBerpaEt
} = require("./doyus_xestexana_korpu");
const {
  konvoyYolaHazirliginiYoxla
} = require("./konvoy_yola_hazirliq_sistemi");

const DEFAULT_KONVOY_HEREKET_MS_XANA = 1000;

const STATUS = Object.freeze({
  BOS: "idle",
  YOLDA: "marching",
  DOYUS: "battle",
  TOPLAMA: "gathering",
  GERI: "returning"
});

function metnAl(v, max = 220) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function stateTeminEt(state) {
  if (!state.konvoyEmeliyyatlari || typeof state.konvoyEmeliyyatlari !== "object" || Array.isArray(state.konvoyEmeliyyatlari)) {
    state.konvoyEmeliyyatlari = { version: 3, activeByConvoy: {}, history: [] };
  }
  state.konvoyEmeliyyatlari.version = 3;
  if (!state.konvoyEmeliyyatlari.activeByConvoy || typeof state.konvoyEmeliyyatlari.activeByConvoy !== "object") {
    state.konvoyEmeliyyatlari.activeByConvoy = {};
  }
  if (!Array.isArray(state.konvoyEmeliyyatlari.history)) state.konvoyEmeliyyatlari.history = [];
  return state.konvoyEmeliyyatlari;
}

function hereketKonfiqiniAl() {
  const envRaw = Number(process.env.KONVOY_HEREKET_MS_XANA);
  const envConfigured = Number.isFinite(envRaw) && envRaw > 0;
  return {
    msPerMapUnit: envConfigured ? Math.trunc(envRaw) : DEFAULT_KONVOY_HEREKET_MS_XANA,
    source: envConfigured ? "env" : "server_default",
    envConfigured
  };
}

function hereketMsPerXana() {
  return hereketKonfiqiniAl().msPerMapUnit;
}

function mesafeHesabla(ax, az, bx, bz) {
  const dx = Number(bx) - Number(ax);
  const dz = Number(bz) - Number(az);
  return Math.sqrt((dx * dx) + (dz * dz));
}

function hereketMuddetiniHesabla(ax, az, bx, bz) {
  const msPerXana = hereketMsPerXana();
  return Math.max(1, Math.ceil(mesafeHesabla(ax, az, bx, bz) * msPerXana));
}

function emeliyyatOnbaxisiniHazirla(
  state,
  convoyId,
  targetType,
  targetId,
  secimler = null
) {
  const id = metnAl(convoyId, 64);
  const sorquHedefTipi = metnAl(targetType, 32);
  const sorquHedefId = metnAl(targetId, 220);

  if (!id) {
    return { success: false, message: "Konvoy ID yoxdur." };
  }

  if (sorquHedefTipi !== "resource" && sorquHedefTipi !== "enemy") {
    return { success: false, message: "Konvoy hədəfinin tipi yanlışdır." };
  }

  if (!sorquHedefId) {
    return { success: false, message: "Konvoy hədəfinin ID-si yoxdur." };
  }

  const hedefOverride = secimler && secimler.hedefOverride;
  let hedef = null;

  if (hedefOverride && typeof hedefOverride === "object") {
    const overrideHedefTipi = metnAl(
      hedefOverride.targetType || sorquHedefTipi,
      32
    );
    const overrideHedefId = metnAl(hedefOverride.targetId, 220);
    const hedefX = Number(hedefOverride.x);
    const hedefZ = Number(hedefOverride.z);

    if (overrideHedefTipi !== sorquHedefTipi ||
        overrideHedefId !== sorquHedefId ||
        !Number.isFinite(hedefX) ||
        !Number.isFinite(hedefZ)) {
      return { success: false, message: "Konvoy hədəfinin önbaxış məlumatı etibarsızdır." };
    }

    hedef = {
      targetType: overrideHedefTipi,
      targetId: overrideHedefId,
      stateId: tamEded(hedefOverride.stateId),
      x: hedefX,
      z: hedefZ,
      zoneId: metnAl(hedefOverride.zoneId, 64),
      level: tamEded(hedefOverride.level)
    };
  }
  else {
    hedef = hedefMelumatiniAl(state, sorquHedefTipi, sorquHedefId);
  }

  if (!hedef) {
    return { success: false, message: "Konvoy hədəfi tapılmadı." };
  }

  const hereket = hereketKonfiqiniAl();
  const baza = bazaMovqeyiAl(state);
  const distanceMapUnits = mesafeHesabla(baza.x, baza.z, hedef.x, hedef.z);
  const travelDurationMs = hereketMuddetiniHesabla(
    baza.x,
    baza.z,
    hedef.x,
    hedef.z
  );

  return {
    success: true,
    preview: {
      convoyId: id,
      targetType: hedef.targetType,
      targetId: hedef.targetId,
      stateId: hedef.stateId,
      fromX: baza.x,
      fromZ: baza.z,
      targetX: hedef.x,
      targetZ: hedef.z,
      distanceMapUnits,
      travelDurationMs,
      movementMsPerMapUnit: hereket.msPerMapUnit,
      movementSource: hereket.source
    }
  };
}

function dovletIdAl(state) {
  return Math.max(1, tamEded(state && state.worldPlacement && state.worldPlacement.stateId) || 1);
}

function bazaMovqeyiAl(state) {
  return {
    x: Number(state && state.worldPlacement && state.worldPlacement.baseX) || 0,
    z: Number(state && state.worldPlacement && state.worldPlacement.baseZ) || 0
  };
}

function hedefMelumatiniAl(state, targetType, targetId) {
  const stateId = dovletIdAl(state);
  const tip = metnAl(targetType, 32);
  const id = metnAl(targetId, 128);

  if (tip === "resource") {
    const descriptor = nodeMelumatiniAl(stateId, id);
    if (!descriptor) return null;
    const movqe = resursMovqeyiAl(stateId, descriptor.index);
    return {
      targetType: "resource",
      targetId: descriptor.nodeId,
      stateId,
      x: movqe ? movqe.x : 0,
      z: movqe ? movqe.z : 0,
      zoneId: movqe ? movqe.zoneId : descriptor.zoneId,
      level: descriptor.level,
      actionDurationMs: Math.max(1, tamEded(descriptor.gatherSeconds) * 1000),
      descriptor
    };
  }

  if (tip === "enemy") {
    const match = id.match(/^state_(\d+)_enemy_(\d+)$/);
    if (!match || Number(match[1]) !== stateId) return null;
    const index = Number(match[2]);
    const descriptor = dusmenDescriptor(stateId, index);
    if (!descriptor) return null;
    const movqe = dusmenMovqeyiAl(stateId, index);
    return {
      targetType: "enemy",
      targetId: descriptor.enemyId,
      stateId,
      x: movqe ? movqe.x : 0,
      z: movqe ? movqe.z : 0,
      zoneId: movqe ? movqe.zoneId : descriptor.zoneId,
      level: descriptor.level,
      actionDurationMs: Math.max(1, tamEded(DOYUS_NETICE_GOZLEME_MS) || 5000),
      descriptor
    };
  }

  return null;
}

function legacyMesgulluqVar(state, convoyId) {
  const id = metnAl(convoyId, 64);
  const gather = state && state.xeriteToplama && state.xeriteToplama.activeByConvoy;
  if (gather && gather[id]) return true;
  const battle = state && state.worldEnemyBattle && state.worldEnemyBattle.activeByConvoy;
  if (battle && battle[id]) return true;
  return false;
}

function emeliyyatiBaslat(state, playerId, convoyId, targetType, targetId, nowMs = Date.now()) {
  const emeliyyatlar = stateTeminEt(state);
  const id = metnAl(convoyId, 64);

  if (!id) return { success: false, message: "Konvoy ID yoxdur." };
  if (emeliyyatlar.activeByConvoy[id]) return { success: false, message: "Konvoy artıq əməliyyatdadır." };
  if (legacyMesgulluqVar(state, id)) return { success: false, message: "Konvoy artıq xəritə tapşırığındadır." };

  const hedef = hedefMelumatiniAl(state, targetType, targetId);
  if (!hedef) return { success: false, message: "Konvoy hədəfi tapılmadı." };

  const hazirliq = konvoyYolaHazirliginiYoxla(state, id, hedef.targetType);
  if (!hazirliq || hazirliq.success !== true) {
    return {
      success: false,
      message: hazirliq && hazirliq.message
        ? hazirliq.message
        : "Konvoy xəritəyə göndərilməyə hazır deyil.",
      readinessCode: hazirliq && hazirliq.code ? hazirliq.code : "convoy_not_ready",
      readiness: hazirliq || null
    };
  }

  const hereket = hereketKonfiqiniAl();
  const baza = bazaMovqeyiAl(state);
  const travelDurationMs = hereketMuddetiniHesabla(baza.x, baza.z, hedef.x, hedef.z);
  const start = tamEded(nowMs) || Date.now();
  const arrivalAtMs = start + travelDurationMs;
  const plannedActionEndsAtMs = arrivalAtMs + tamEded(hedef.actionDurationMs);
  const plannedReturnEndsAtMs = plannedActionEndsAtMs + travelDurationMs;

  const operation = {
    operationId: `${id}:${start}:${metnAl(playerId, 128)}`,
    convoyId: id,
    playerId: metnAl(playerId, 128),
    targetType: hedef.targetType,
    targetId: hedef.targetId,
    stateId: hedef.stateId,
    fromX: baza.x,
    fromZ: baza.z,
    targetX: hedef.x,
    targetZ: hedef.z,
    zoneId: hedef.zoneId,
    targetLevel: hedef.level,
    startedAtMs: start,
    arrivalAtMs,
    actionEndsAtMs: 0,
    returnStartedAtMs: 0,
    returnEndsAtMs: 0,
    travelDurationMs,
    plannedActionDurationMs: tamEded(hedef.actionDurationMs),
    plannedActionEndsAtMs,
    plannedReturnEndsAtMs,
    movementMsPerMapUnit: hereket.msPerMapUnit,
    movementSource: hereket.source,
    dispatchReadiness: {
      troopCount: hazirliq.troopCount,
      tutum: hazirliq.tutum,
      siraTutumu: hazirliq.siraTutumu,
      heroIds: Array.isArray(hazirliq.heroIds) ? [...hazirliq.heroIds] : []
    },
    status: STATUS.YOLDA,
    reportId: "",
    gatherRewardId: "",
    lightWoundedFormation: [],
    result: null,
    failureReason: ""
  };

  emeliyyatlar.activeByConvoy[id] = operation;
  return { success: true, operation: { ...operation } };
}

function geriQayitmagaBasla(operation, baslamaMs, result) {
  operation.status = STATUS.GERI;
  operation.result = result || null;
  operation.returnStartedAtMs = tamEded(baslamaMs) || Date.now();
  operation.returnEndsAtMs = operation.returnStartedAtMs + tamEded(operation.travelDurationMs);
}

function toplamaMukafatiniBazayaCatdir(state, operation) {
  const rewardId = metnAl(operation && operation.gatherRewardId, 220);
  if (!rewardId) return null;

  const result = pendingMukafatiAl(state, rewardId);
  const delivery = {
    success: result && result.success === true,
    rewardId,
    message: result && result.message ? result.message : "",
    reward: result && result.reward ? { ...result.reward } : null,
    newAmount: result ? result.newAmount : undefined,
    deliveryPending: !(result && result.success === true)
  };

  if (!operation.result || typeof operation.result !== "object") operation.result = {};
  operation.result.delivery = delivery;
  return delivery;
}

async function emeliyyatlariYenile(state, playerId, nowMs = Date.now()) {
  const emeliyyatlar = stateTeminEt(state);
  const now = tamEded(nowMs) || Date.now();
  let changed = false;

  for (const [convoyId, operation] of Object.entries(emeliyyatlar.activeByConvoy)) {
    if (!operation || typeof operation !== "object") {
      delete emeliyyatlar.activeByConvoy[convoyId];
      changed = true;
      continue;
    }

    if (operation.status === STATUS.YOLDA && now >= tamEded(operation.arrivalAtMs)) {
      const arrivalTime = tamEded(operation.arrivalAtMs) || now;

      if (operation.targetType === "resource") {
        const result = await toplamaniBaslat(state, playerId, convoyId, operation.targetId, arrivalTime);
        if (result && result.success === true) {
          operation.status = STATUS.TOPLAMA;
          operation.actionEndsAtMs = tamEded(result.mission && result.mission.endsAtMs);
          operation.gatherRewardId = result.mission
            ? `${metnAl(result.mission.nodeId, 128)}:${tamEded(result.mission.startedAtMs)}`
            : "";
        }
        else {
          operation.failureReason = result && result.message ? result.message : "Resurs toplama başlaya bilmədi.";
          geriQayitmagaBasla(operation, arrivalTime, { success: false, message: operation.failureReason });
        }
        changed = true;
      }
      else if (operation.targetType === "enemy") {
        const result = doyusaBasla(state, playerId, convoyId, operation.targetId, arrivalTime);
        if (result && result.success === true) {
          operation.status = STATUS.DOYUS;
          operation.actionEndsAtMs = tamEded(result.mission && result.mission.resolveAtMs);
        }
        else {
          operation.failureReason = result && result.message ? result.message : "Döyüş başlaya bilmədi.";
          geriQayitmagaBasla(operation, arrivalTime, { success: false, message: operation.failureReason });
        }
        changed = true;
      }
    }

    if (operation.status === STATUS.TOPLAMA && now >= tamEded(operation.actionEndsAtMs)) {
      const gatherFinishedAt = tamEded(operation.actionEndsAtMs) || now;
      const completed = bitmisToplamalariPendingEt(state, gatherFinishedAt);
      const reward = Array.isArray(completed)
        ? completed.find(x => x && metnAl(x.convoyId, 64) === metnAl(convoyId, 64)) || null
        : null;

      if (!operation.gatherRewardId && reward) {
        operation.gatherRewardId = metnAl(reward.rewardId, 220);
      }

      geriQayitmagaBasla(operation, gatherFinishedAt, {
        success: true,
        type: "gather",
        rewardId: operation.gatherRewardId,
        reward,
        deliveryPending: !!operation.gatherRewardId
      });
      changed = true;
    }

    if (operation.status === STATUS.DOYUS && now >= tamEded(operation.actionEndsAtMs)) {
      const battleFinishedAt = tamEded(operation.actionEndsAtMs) || now;
      const battleState = state && state.worldEnemyBattle && state.worldEnemyBattle.activeByConvoy;
      const missionSnapshot = battleState && battleState[convoyId]
        ? JSON.parse(JSON.stringify(battleState[convoyId]))
        : null;

      const result = await doyusuNeticelendir(state, playerId, convoyId, battleFinishedAt);
      let report = null;
      let casualty = null;

      if (result && result.success === true && missionSnapshot) {
        report = raportYarat(state, {
          battleId: result.battleId || missionSnapshot.battleId,
          stateId: missionSnapshot.stateId,
          enemyId: result.enemyId || missionSnapshot.enemyId,
          enemyType: result.enemyType || missionSnapshot.enemyType,
          enemyLevel: result.enemyLevel || missionSnapshot.enemyLevel,
          victory: result.victory === true,
          invalidated: result.invalidated === true,
          playerPower: result.playerPower || missionSnapshot.playerPower,
          enemyPower: result.enemyPower || missionSnapshot.enemyPower,
          heroIds: missionSnapshot.heroIds || [],
          sentTroops: missionSnapshot.troopSnapshot || {},
          sentFormation: missionSnapshot.formationSnapshot || [],
          reward: result.reward || {},
          lootAlreadyApplied: false,
          completedAtMs: result.completedAtMs || battleFinishedAt
        }, battleFinishedAt);

        operation.reportId = report && report.reportId ? report.reportId : "";

        if (result.invalidated !== true) {
          const casualtyPlan = itkiPlaniniHazirla(
            missionSnapshot.formationSnapshot || [],
            result.playerPower || missionSnapshot.playerPower,
            result.enemyPower || missionSnapshot.enemyPower,
            result.victory === true
          );

          casualty = serverItkiPlaniniTetbiqEt(
            state,
            convoyId,
            missionSnapshot.formationSnapshot || [],
            casualtyPlan,
            report
          );

          if (!casualty || casualty.success !== true) {
            throw new Error(casualty && casualty.message ? casualty.message : "Döyüş itkisi tətbiq edilə bilmədi.");
          }

          operation.lightWoundedFormation = casualty.lightWoundedFormation.map(x => ({ ...x }));
        }
      }

      geriQayitmagaBasla(operation, battleFinishedAt, {
        ...(result || { success: false, message: "Döyüş nəticəsi alınmadı." }),
        reportId: operation.reportId,
        casualtySummary: casualty ? {
          sentCount: casualty.sentCount,
          totalLoss: casualty.totalLoss,
          heavyWounded: casualty.heavyWoundedFormation.reduce((c, x) => c + tamEded(x.count), 0),
          lightWounded: casualty.lightWoundedFormation.reduce((c, x) => c + tamEded(x.count), 0),
          dead: casualty.deadFormation.reduce((c, x) => c + tamEded(x.count), 0)
        } : null
      });
      changed = true;
    }

    if (operation.status === STATUS.GERI && now >= tamEded(operation.returnEndsAtMs)) {
      const returnFinishedAt = tamEded(operation.returnEndsAtMs) || now;
      let recovery = null;
      let gatherDelivery = null;
      let battleRewardDelivery = null;

      if (Array.isArray(operation.lightWoundedFormation) && operation.lightWoundedFormation.length > 0) {
        const report = operation.reportId ? raportuTap(state, operation.reportId) : null;
        recovery = yungulYaralilariBerpaEt(
          state,
          convoyId,
          operation.lightWoundedFormation,
          report,
          returnFinishedAt
        );
        operation.lightWoundedFormation = [];
      }

      if (operation.targetType === "resource" && operation.gatherRewardId) {
        gatherDelivery = toplamaMukafatiniBazayaCatdir(state, operation);
      }

      if (operation.targetType === "enemy" && operation.reportId) {
        battleRewardDelivery = raportResursMukafatiniAl(
          state,
          operation.reportId,
          returnFinishedAt
        );
      }

      const historyItem = {
        ...operation,
        status: STATUS.BOS,
        lightWoundedRecovery: recovery,
        gatherDelivery,
        battleRewardDelivery,
        finishedAtMs: returnFinishedAt
      };
      emeliyyatlar.history.push(historyItem);
      emeliyyatlar.history = emeliyyatlar.history.slice(-30);
      delete emeliyyatlar.activeByConvoy[convoyId];
      changed = true;
    }
  }

  return { changed };
}

function emeliyyatMelumatiniHazirla(state, nowMs = Date.now()) {
  const emeliyyatlar = stateTeminEt(state);
  const now = tamEded(nowMs) || Date.now();
  const hereket = hereketKonfiqiniAl();

  return {
    version: 3,
    movementConfigured: true,
    movementMsPerMapUnit: hereket.msPerMapUnit,
    movementSource: hereket.source,
    movementEnvConfigured: hereket.envConfigured,
    active: Object.values(emeliyyatlar.activeByConvoy).map(x => ({
      ...x,
      remainingMs: x.status === STATUS.YOLDA
        ? Math.max(0, tamEded(x.arrivalAtMs) - now)
        : x.status === STATUS.GERI
          ? Math.max(0, tamEded(x.returnEndsAtMs) - now)
          : Math.max(0, tamEded(x.actionEndsAtMs) - now)
    })),
    history: emeliyyatlar.history.slice(-10).map(x => ({ ...x }))
  };
}

module.exports = {
  DEFAULT_KONVOY_HEREKET_MS_XANA,
  STATUS,
  stateTeminEt,
  hereketKonfiqiniAl,
  hereketMsPerXana,
  hereketMuddetiniHesabla,
  emeliyyatOnbaxisiniHazirla,
  emeliyyatiBaslat,
  emeliyyatlariYenile,
  emeliyyatMelumatiniHazirla
};
