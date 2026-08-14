"use strict";

const {
  nodeMelumatiniAl,
  toplamaniBaslat,
  bitmisToplamalariPendingEt
} = require("./xerite_resurs_toplama_sistemi");
const { dusmenDescriptor } = require("./xerite_dusmen_sistemi");
const {
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
const { itkiPlaniniHazirla } = require("./doyus_itki_sistemi");
const {
  serverItkiPlaniniTetbiqEt,
  yungulYaralilariBerpaEt
} = require("./doyus_xestexana_korpu");

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
    state.konvoyEmeliyyatlari = { version: 2, activeByConvoy: {}, history: [] };
  }
  state.konvoyEmeliyyatlari.version = 2;
  if (!state.konvoyEmeliyyatlari.activeByConvoy || typeof state.konvoyEmeliyyatlari.activeByConvoy !== "object") {
    state.konvoyEmeliyyatlari.activeByConvoy = {};
  }
  if (!Array.isArray(state.konvoyEmeliyyatlari.history)) state.konvoyEmeliyyatlari.history = [];
  return state.konvoyEmeliyyatlari;
}

function hereketMsPerXana() {
  const n = Number(process.env.KONVOY_HEREKET_MS_XANA);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

function mesafeHesabla(ax, az, bx, bz) {
  const dx = Number(bx) - Number(ax);
  const dz = Number(bz) - Number(az);
  return Math.sqrt((dx * dx) + (dz * dz));
}

function hereketMuddetiniHesabla(ax, az, bx, bz) {
  const msPerXana = hereketMsPerXana();
  if (msPerXana <= 0) return 0;
  return Math.max(1, Math.ceil(mesafeHesabla(ax, az, bx, bz) * msPerXana));
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

  const msPerXana = hereketMsPerXana();
  if (msPerXana <= 0) {
    return {
      success: false,
      message: "Konvoy hərəkət balansı hələ serverdə konfiqurasiya edilməyib.",
      movementConfigured: false
    };
  }

  const hedef = hedefMelumatiniAl(state, targetType, targetId);
  if (!hedef) return { success: false, message: "Konvoy hədəfi tapılmadı." };

  const baza = bazaMovqeyiAl(state);
  const travelDurationMs = hereketMuddetiniHesabla(baza.x, baza.z, hedef.x, hedef.z);
  const start = tamEded(nowMs) || Date.now();

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
    arrivalAtMs: start + travelDurationMs,
    actionEndsAtMs: 0,
    returnStartedAtMs: 0,
    returnEndsAtMs: 0,
    travelDurationMs,
    status: STATUS.YOLDA,
    reportId: "",
    lightWoundedFormation: [],
    result: null,
    failureReason: ""
  };

  emeliyyatlar.activeByConvoy[id] = operation;
  return { success: true, operation: { ...operation } };
}

function geriQayitmagaBasla(operation, nowMs, result) {
  operation.status = STATUS.GERI;
  operation.result = result || null;
  operation.returnStartedAtMs = tamEded(nowMs) || Date.now();
  operation.returnEndsAtMs = operation.returnStartedAtMs + tamEded(operation.travelDurationMs);
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
      if (operation.targetType === "resource") {
        const result = await toplamaniBaslat(state, playerId, convoyId, operation.targetId, now);
        if (result && result.success === true) {
          operation.status = STATUS.TOPLAMA;
          operation.actionEndsAtMs = tamEded(result.mission && result.mission.endsAtMs);
        }
        else {
          operation.failureReason = result && result.message ? result.message : "Resurs toplama başlaya bilmədi.";
          geriQayitmagaBasla(operation, now, { success: false, message: operation.failureReason });
        }
        changed = true;
      }
      else if (operation.targetType === "enemy") {
        const result = doyusaBasla(state, playerId, convoyId, operation.targetId, now);
        if (result && result.success === true) {
          operation.status = STATUS.DOYUS;
          operation.actionEndsAtMs = tamEded(result.mission && result.mission.resolveAtMs);
        }
        else {
          operation.failureReason = result && result.message ? result.message : "Döyüş başlaya bilmədi.";
          geriQayitmagaBasla(operation, now, { success: false, message: operation.failureReason });
        }
        changed = true;
      }
    }

    if (operation.status === STATUS.TOPLAMA && now >= tamEded(operation.actionEndsAtMs)) {
      const completed = bitmisToplamalariPendingEt(state, now);
      const reward = Array.isArray(completed)
        ? completed.find(x => x && metnAl(x.convoyId, 64) === metnAl(convoyId, 64)) || null
        : null;
      geriQayitmagaBasla(operation, now, {
        success: true,
        type: "gather",
        rewardId: reward ? reward.rewardId : "",
        reward
      });
      changed = true;
    }

    if (operation.status === STATUS.DOYUS && now >= tamEded(operation.actionEndsAtMs)) {
      const battleState = state && state.worldEnemyBattle && state.worldEnemyBattle.activeByConvoy;
      const missionSnapshot = battleState && battleState[convoyId]
        ? JSON.parse(JSON.stringify(battleState[convoyId]))
        : null;

      const result = await doyusuNeticelendir(state, playerId, convoyId, now);
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
          lootAlreadyApplied: result.victory === true,
          completedAtMs: result.completedAtMs || now
        }, now);

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

      geriQayitmagaBasla(operation, now, {
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
      let recovery = null;
      if (Array.isArray(operation.lightWoundedFormation) && operation.lightWoundedFormation.length > 0) {
        const report = operation.reportId ? raportuTap(state, operation.reportId) : null;
        recovery = yungulYaralilariBerpaEt(
          state,
          convoyId,
          operation.lightWoundedFormation,
          report,
          now
        );
        operation.lightWoundedFormation = [];
      }

      const historyItem = {
        ...operation,
        status: STATUS.BOS,
        lightWoundedRecovery: recovery,
        finishedAtMs: now
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

  return {
    version: 2,
    movementConfigured: hereketMsPerXana() > 0,
    movementMsPerMapUnit: hereketMsPerXana(),
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
  STATUS,
  stateTeminEt,
  hereketMsPerXana,
  hereketMuddetiniHesabla,
  emeliyyatiBaslat,
  emeliyyatlariYenile,
  emeliyyatMelumatiniHazirla
};
