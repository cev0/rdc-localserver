"use strict";

const sistem = require("./konvoy_emeliyyat_sistemi");
const {
  konvoyYolaHazirliginiYoxla
} = require("./konvoy_yola_hazirliq_sistemi");
const {
  worldV2ResursTargetIdDirmi,
  worldV2ResursuRezervEtClient,
  worldV2ResursRezerviniBuraxClient,
  worldV2ResursToplamaniBitirClient
} = require("./dovlet_xerite_worldv2_resurs_emeliyyat_sistemi");

const esasEmeliyyatiBaslat = sistem.emeliyyatiBaslat;
const esasEmeliyyatlariYenile = sistem.emeliyyatlariYenile;

function metnAl(v, max = 220) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function kopyala(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function dovletIdAl(state) {
  return Math.max(
    1,
    tamEded(state && state.worldPlacement && state.worldPlacement.stateId) || 1
  );
}

function bazaMovqeyiAl(state) {
  return {
    x: Number(state && state.worldPlacement && state.worldPlacement.baseX) || 0,
    z: Number(state && state.worldPlacement && state.worldPlacement.baseZ) || 0
  };
}

function legacyMesgulluqVar(state, convoyId) {
  const id = metnAl(convoyId, 64);
  const gather = state && state.xeriteToplama && state.xeriteToplama.activeByConvoy;
  if (gather && gather[id]) return true;
  const battle = state && state.worldEnemyBattle && state.worldEnemyBattle.activeByConvoy;
  if (battle && battle[id]) return true;
  return false;
}

function toplamaStateTeminEt(state) {
  if (!state.xeriteToplama || typeof state.xeriteToplama !== "object" || Array.isArray(state.xeriteToplama)) {
    state.xeriteToplama = { version: 1, activeByConvoy: {}, pendingRewards: [] };
  }
  if (!state.xeriteToplama.activeByConvoy || typeof state.xeriteToplama.activeByConvoy !== "object") {
    state.xeriteToplama.activeByConvoy = {};
  }
  if (!Array.isArray(state.xeriteToplama.pendingRewards)) {
    state.xeriteToplama.pendingRewards = [];
  }
  return state.xeriteToplama;
}

function pendingMukafatElaveEt(state, operation, tamamlanma) {
  const toplama = toplamaStateTeminEt(state);
  const rewardId = `${metnAl(operation.targetId, 180)}:${tamEded(operation.startedAtMs)}`;
  const reward = {
    rewardId,
    convoyId: metnAl(operation.convoyId, 64),
    nodeId: metnAl(operation.targetId, 180),
    resourceId: metnAl(
      tamamlanma && tamamlanma.resourceId
        ? tamamlanma.resourceId
        : operation.resourceId,
      64
    ),
    amount: tamEded(tamamlanma && tamamlanma.goturulen),
    completedAtMs: tamEded(tamamlanma && tamamlanma.completedAtMs)
  };

  if (reward.amount <= 0 || !reward.resourceId) {
    return null;
  }

  if (!toplama.pendingRewards.some(x => x && metnAl(x.rewardId, 220) === metnAl(rewardId, 220))) {
    toplama.pendingRewards.push(reward);
  }

  return reward;
}

function yolUzerindekiCariMovqeniAl(operation, nowMs) {
  const baslama = tamEded(operation && operation.startedAtMs);
  const catma = tamEded(operation && operation.arrivalAtMs);
  const indi = tamEded(nowMs) || Date.now();

  if (catma <= baslama) {
    return {
      x: Number(operation && operation.targetX) || 0,
      z: Number(operation && operation.targetZ) || 0
    };
  }

  const faiz = Math.max(0, Math.min(1, (indi - baslama) / (catma - baslama)));
  const fromX = Number(operation && operation.fromX) || 0;
  const fromZ = Number(operation && operation.fromZ) || 0;
  const targetX = Number(operation && operation.targetX) || 0;
  const targetZ = Number(operation && operation.targetZ) || 0;

  return {
    x: fromX + (targetX - fromX) * faiz,
    z: fromZ + (targetZ - fromZ) * faiz
  };
}

function geriQayitmagaBasla(operation, baslamaMs, result, qayidisMovqeyi = null, state = null) {
  const baslama = tamEded(baslamaMs) || Date.now();
  const baza = state ? bazaMovqeyiAl(state) : {
    x: Number(operation && operation.fromX) || 0,
    z: Number(operation && operation.fromZ) || 0
  };

  const qayidis = qayidisMovqeyi && Number.isFinite(Number(qayidisMovqeyi.x)) &&
    Number.isFinite(Number(qayidisMovqeyi.z))
    ? {
        x: Number(qayidisMovqeyi.x),
        z: Number(qayidisMovqeyi.z)
      }
    : {
        x: Number(operation && operation.targetX) || 0,
        z: Number(operation && operation.targetZ) || 0
      };

  const qayidisMuddeti = sistem.hereketMuddetiniHesabla(
    qayidis.x,
    qayidis.z,
    baza.x,
    baza.z
  );

  operation.status = sistem.STATUS.GERI;
  operation.result = result || null;
  operation.returnStartedAtMs = baslama;
  operation.returnEndsAtMs = baslama + qayidisMuddeti;
  operation.travelDurationMs = qayidisMuddeti;

  // Mövcud Unity DTO-su returning zamanı target -> from interpolasiyası edir.
  // Manual geri çağırış yolda baş verərsə target cari yol mövqeyinə çəkilir.
  operation.targetX = qayidis.x;
  operation.targetZ = qayidis.z;
  operation.actionEndsAtMs = 0;
}

function worldV2HedefOverrideEtibarlidir(state, targetType, targetId, hedefOverride) {
  if (metnAl(targetType, 32) !== "resource") return false;
  if (!worldV2ResursTargetIdDirmi(targetId)) return false;
  if (!hedefOverride || typeof hedefOverride !== "object") return false;
  if (metnAl(hedefOverride.resourceSystem, 32) !== "worldv2") return false;
  if (metnAl(hedefOverride.targetId, 220) !== metnAl(targetId, 220)) return false;
  if (tamEded(hedefOverride.stateId) !== dovletIdAl(state)) return false;
  if (!Number.isFinite(Number(hedefOverride.x)) || !Number.isFinite(Number(hedefOverride.z))) return false;
  if (tamEded(hedefOverride.remainingAmount) <= 0) return false;
  return true;
}

function worldV2EmeliyyatiBaslat(
  state,
  playerId,
  convoyId,
  targetType,
  targetId,
  nowMs,
  hedefOverride
) {
  const emeliyyatlar = sistem.stateTeminEt(state);
  const id = metnAl(convoyId, 64);

  if (!id) return { success: false, message: "Konvoy ID yoxdur." };
  if (emeliyyatlar.activeByConvoy[id]) return { success: false, message: "Konvoy artıq əməliyyatdadır." };
  if (legacyMesgulluqVar(state, id)) return { success: false, message: "Konvoy artıq xəritə tapşırığındadır." };

  if (!worldV2HedefOverrideEtibarlidir(state, targetType, targetId, hedefOverride)) {
    return { success: false, message: "WorldV2 resurs hədəfi etibarsızdır və ya artıq dəyişib." };
  }

  const hazirliq = konvoyYolaHazirliginiYoxla(state, id, "resource");
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

  const hereket = sistem.hereketKonfiqiniAl();
  const baza = bazaMovqeyiAl(state);
  const hedefX = Number(hedefOverride.x);
  const hedefZ = Number(hedefOverride.z);
  const travelDurationMs = sistem.hereketMuddetiniHesabla(
    baza.x,
    baza.z,
    hedefX,
    hedefZ
  );
  const start = tamEded(nowMs) || Date.now();
  const arrivalAtMs = start + travelDurationMs;
  const actionDurationMs = Math.max(1, tamEded(hedefOverride.actionDurationMs));
  const plannedActionEndsAtMs = arrivalAtMs + actionDurationMs;
  const plannedReturnEndsAtMs = plannedActionEndsAtMs + travelDurationMs;

  const operation = {
    operationId: `${id}:${start}:${metnAl(playerId, 128)}`,
    convoyId: id,
    playerId: metnAl(playerId, 128),
    targetType: "resource",
    targetId: metnAl(hedefOverride.targetId, 220),
    resourceSystem: "worldv2",
    resourceId: metnAl(hedefOverride.resourceId, 64),
    resourceFullAmount: tamEded(hedefOverride.fullAmount),
    plannedGatherAmount: tamEded(hedefOverride.remainingAmount),
    stateId: tamEded(hedefOverride.stateId),
    fromX: baza.x,
    fromZ: baza.z,
    targetX: hedefX,
    targetZ: hedefZ,
    zoneId: metnAl(hedefOverride.zoneId, 64),
    targetLevel: tamEded(hedefOverride.level),
    startedAtMs: start,
    arrivalAtMs,
    actionEndsAtMs: 0,
    returnStartedAtMs: 0,
    returnEndsAtMs: 0,
    travelDurationMs,
    plannedActionDurationMs: actionDurationMs,
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
    status: sistem.STATUS.YOLDA,
    reportId: "",
    gatherRewardId: "",
    lightWoundedFormation: [],
    result: null,
    failureReason: ""
  };

  emeliyyatlar.activeByConvoy[id] = operation;
  return { success: true, operation: kopyala(operation) };
}

sistem.emeliyyatiBaslat = function(
  state,
  playerId,
  convoyId,
  targetType,
  targetId,
  nowMs = Date.now(),
  secimler = null
) {
  const hedefOverride = secimler && secimler.hedefOverride;
  if (worldV2ResursTargetIdDirmi(targetId)) {
    return worldV2EmeliyyatiBaslat(
      state,
      playerId,
      convoyId,
      targetType,
      targetId,
      nowMs,
      hedefOverride
    );
  }

  return esasEmeliyyatiBaslat(
    state,
    playerId,
    convoyId,
    targetType,
    targetId,
    nowMs
  );
};

sistem.emeliyyatiGeriCagir = async function(
  state,
  playerId,
  convoyId,
  nowMs = Date.now(),
  secimler = null
) {
  const emeliyyatlar = sistem.stateTeminEt(state);
  const id = metnAl(convoyId, 64);
  const now = tamEded(nowMs) || Date.now();
  const client = secimler && secimler.client;

  if (!id) {
    return { success: false, errorCode: "CONVOY_RECALL_INVALID", message: "Konvoy ID yoxdur." };
  }

  const operation = emeliyyatlar.activeByConvoy[id];
  if (!operation) {
    return { success: false, errorCode: "CONVOY_RECALL_NOT_ACTIVE", message: "Konvoy aktiv xəritə əməliyyatında deyil." };
  }

  if (metnAl(operation.resourceSystem, 32) !== "worldv2" ||
      metnAl(operation.targetType, 32) !== "resource") {
    return {
      success: false,
      errorCode: "CONVOY_RECALL_UNSUPPORTED",
      message: "Hazırda geri çağırma yalnız WorldV2 resurs konvoyları üçün aktivdir."
    };
  }

  if (operation.status === sistem.STATUS.GERI) {
    return {
      success: true,
      alreadyReturning: true,
      operation: kopyala(operation),
      message: "Konvoy artıq bazaya qayıdır."
    };
  }

  if (operation.status !== sistem.STATUS.YOLDA &&
      operation.status !== sistem.STATUS.TOPLAMA) {
    return {
      success: false,
      errorCode: "CONVOY_RECALL_STATUS_INVALID",
      message: "Konvoyun hazırkı vəziyyətində geri çağırma mümkün deyil."
    };
  }

  if (operation.status === sistem.STATUS.TOPLAMA) {
    if (!client || typeof client.query !== "function") {
      return {
        success: false,
        errorCode: "WORLDV2_RESOURCE_TRANSACTION_REQUIRED",
        message: "Resurs rezervini buraxmaq üçün server transaction-u tələb olunur."
      };
    }

    const burax = await worldV2ResursRezerviniBuraxClient(client, {
      stateId: tamEded(operation.stateId),
      targetId: operation.targetId,
      playerId,
      convoyId: id,
      nowMs: now
    });

    if (!burax || burax.success !== true) {
      return {
        success: false,
        errorCode: burax && burax.errorCode
          ? burax.errorCode
          : "WORLDV2_RESOURCE_RELEASE_FAILED",
        message: burax && burax.message
          ? burax.message
          : "Resurs rezervi buraxıla bilmədi."
      };
    }
  }

  const qayidisMovqeyi = operation.status === sistem.STATUS.YOLDA
    ? yolUzerindekiCariMovqeniAl(operation, now)
    : {
        x: Number(operation.targetX) || 0,
        z: Number(operation.targetZ) || 0
      };

  operation.gatherRewardId = "";
  operation.failureReason = "";
  operation.recalledAtMs = now;

  geriQayitmagaBasla(
    operation,
    now,
    {
      success: true,
      type: "recall",
      resourceSystem: "worldv2",
      manualRecall: true,
      collectedAmount: 0,
      deliveryPending: false
    },
    qayidisMovqeyi,
    state
  );

  return {
    success: true,
    alreadyReturning: false,
    operation: kopyala(operation),
    message: "Konvoy bazaya geri çağırıldı."
  };
};

sistem.emeliyyatlariYenile = async function(
  state,
  playerId,
  nowMs = Date.now(),
  secimler = null
) {
  const client = secimler && secimler.client;
  const emeliyyatlar = sistem.stateTeminEt(state);
  const now = tamEded(nowMs) || Date.now();
  let worldV2Deyisdi = false;

  for (const [convoyId, operation] of Object.entries(emeliyyatlar.activeByConvoy)) {
    if (!operation || metnAl(operation.resourceSystem, 32) !== "worldv2") {
      continue;
    }

    if (!client || typeof client.query !== "function") {
      operation.failureReason = "WorldV2 resurs əməliyyatı üçün transaction client yoxdur.";
      if (operation.status !== sistem.STATUS.GERI) {
        const qayidisMovqeyi = operation.status === sistem.STATUS.YOLDA
          ? yolUzerindekiCariMovqeniAl(operation, now)
          : null;

        geriQayitmagaBasla(operation, now, {
          success: false,
          message: operation.failureReason
        }, qayidisMovqeyi, state);
        worldV2Deyisdi = true;
      }
      continue;
    }

    if (operation.status === sistem.STATUS.YOLDA && now >= tamEded(operation.arrivalAtMs)) {
      const arrivalTime = tamEded(operation.arrivalAtMs) || now;
      const actionEndsAtMs = arrivalTime + Math.max(1, tamEded(operation.plannedActionDurationMs));

      const rezerv = await worldV2ResursuRezervEtClient(client, {
        stateId: tamEded(operation.stateId),
        targetId: operation.targetId,
        playerId,
        convoyId,
        occupiedUntilMs: actionEndsAtMs,
        nowMs: arrivalTime
      });

      if (rezerv && rezerv.success === true) {
        operation.status = sistem.STATUS.TOPLAMA;
        operation.actionEndsAtMs = actionEndsAtMs;
        operation.plannedGatherAmount = Math.min(
          Math.max(1, tamEded(operation.plannedGatherAmount)),
          Math.max(1, tamEded(rezerv.remainingAmount))
        );
      }
      else {
        operation.failureReason = rezerv && rezerv.message
          ? rezerv.message
          : "WorldV2 resursu rezerv edilə bilmədi.";
        geriQayitmagaBasla(operation, arrivalTime, {
          success: false,
          message: operation.failureReason,
          errorCode: rezerv && rezerv.errorCode ? rezerv.errorCode : "WORLDV2_RESOURCE_RESERVE_FAILED"
        }, null, state);
      }

      worldV2Deyisdi = true;
    }

    if (operation.status === sistem.STATUS.TOPLAMA && now >= tamEded(operation.actionEndsAtMs)) {
      const gatherFinishedAt = tamEded(operation.actionEndsAtMs) || now;
      const tamamlanma = await worldV2ResursToplamaniBitirClient(client, {
        stateId: tamEded(operation.stateId),
        targetId: operation.targetId,
        playerId,
        convoyId,
        miqdar: Math.max(1, tamEded(operation.plannedGatherAmount)),
        nowMs: gatherFinishedAt
      });

      if (tamamlanma && tamamlanma.success === true) {
        const reward = pendingMukafatElaveEt(state, operation, tamamlanma);
        operation.gatherRewardId = reward ? reward.rewardId : "";

        geriQayitmagaBasla(operation, gatherFinishedAt, {
          success: true,
          type: "gather",
          resourceSystem: "worldv2",
          rewardId: operation.gatherRewardId,
          reward: reward ? kopyala(reward) : null,
          collectedAmount: tamEded(tamamlanma.goturulen),
          remainingAmount: tamEded(tamamlanma.remainingAmount),
          respawnAtMs: tamEded(tamamlanma.respawnAtMs),
          deliveryPending: !!operation.gatherRewardId
        }, null, state);
      }
      else {
        operation.failureReason = tamamlanma && tamamlanma.message
          ? tamamlanma.message
          : "WorldV2 resurs toplaması tamamlana bilmədi.";
        geriQayitmagaBasla(operation, gatherFinishedAt, {
          success: false,
          message: operation.failureReason,
          errorCode: tamamlanma && tamamlanma.errorCode
            ? tamamlanma.errorCode
            : "WORLDV2_RESOURCE_GATHER_FAILED"
        }, null, state);
      }

      worldV2Deyisdi = true;
    }
  }

  const esasNetice = await esasEmeliyyatlariYenile(
    state,
    playerId,
    nowMs
  );

  return {
    changed: worldV2Deyisdi || !!(esasNetice && esasNetice.changed === true)
  };
};

module.exports = sistem;
