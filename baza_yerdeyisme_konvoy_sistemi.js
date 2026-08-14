"use strict";

const {
  STATUS,
  stateTeminEt,
  emeliyyatlariYenile
} = require("./konvoy_emeliyyat_sistemi");
const {
  toplamaniLegvEt,
  pendingMukafatiAl
} = require("./xerite_resurs_toplama_sistemi");
const {
  doyusuLegvEt
} = require("./xerite_dusmen_doyus_sistemi");
const {
  raportuTap
} = require("./doyus_raport_sistemi");
const {
  raportResursMukafatiniAl
} = require("./doyus_raport_mukafat_sistemi");
const {
  yungulYaralilariBerpaEt
} = require("./doyus_xestexana_korpu");
const {
  oyuncuKonvoylariniSinxronEt
} = require("./dovlet_konvoy_runtime_postgres");
const {
  dovletBazaKeshiniTemizle
} = require("./dovlet_baza_kataloqu_postgres");
const {
  oyunStateIniYaddaSaxla
} = require("./oyun_state_daimilik_korpu");

function metnAl(v, max = 220) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function dovletIdAl(state) {
  return Math.max(
    1,
    tamEded(state && state.worldPlacement && state.worldPlacement.stateId) || 1
  );
}

function tarixceyeElaveEt(emeliyyatlar, operation, nowMs, elave = {}) {
  const historyItem = {
    ...kopyala(operation),
    ...kopyala(elave),
    status: STATUS.BOS,
    recalledByBaseRelocation: true,
    relocationRecallAtMs: tamEded(nowMs) || Date.now(),
    finishedAtMs: tamEded(nowMs) || Date.now()
  };

  emeliyyatlar.history.push(historyItem);
  emeliyyatlar.history = emeliyyatlar.history.slice(-30);
  return historyItem;
}

function qalanLegacyDoyusuTemizle(state, convoyId, nowMs) {
  return doyusuLegvEt(state, convoyId, nowMs);
}

async function qalanLegacyToplamaniTemizle(state, playerId, convoyId, nowMs) {
  return await toplamaniLegvEt(state, playerId, convoyId, nowMs);
}

async function aktivOperationuDerhalQaytar(state, playerId, convoyId, operation, nowMs) {
  const emeliyyatlar = stateTeminEt(state);
  const evvelkiStatus = metnAl(operation && operation.status, 32);
  let gatherCancellation = null;
  let battleCancellation = null;
  let lightWoundedRecovery = null;
  let gatherDelivery = null;
  let battleRewardDelivery = null;

  if (evvelkiStatus === STATUS.TOPLAMA) {
    gatherCancellation = await qalanLegacyToplamaniTemizle(
      state,
      playerId,
      convoyId,
      nowMs
    );
  }

  if (evvelkiStatus === STATUS.DOYUS) {
    battleCancellation = qalanLegacyDoyusuTemizle(
      state,
      convoyId,
      nowMs
    );
  }

  // Returning status yalnız artıq tamamlanmış gather/battle nəticəsinə malikdir.
  // Bu halda teleport sadəcə konvoyun qayıdış vaxtını sıfırlayır və bazaya
  // çatanda normalda baş verəcək recovery/reward delivery-ni dərhal icra edir.
  if (evvelkiStatus === STATUS.GERI) {
    if (
      Array.isArray(operation.lightWoundedFormation) &&
      operation.lightWoundedFormation.length > 0
    ) {
      const report = operation.reportId
        ? raportuTap(state, operation.reportId)
        : null;

      lightWoundedRecovery = yungulYaralilariBerpaEt(
        state,
        convoyId,
        operation.lightWoundedFormation,
        report,
        nowMs
      );
      operation.lightWoundedFormation = [];
    }

    if (operation.targetType === "resource" && operation.gatherRewardId) {
      gatherDelivery = pendingMukafatiAl(
        state,
        operation.gatherRewardId
      );
    }

    if (operation.targetType === "enemy" && operation.reportId) {
      battleRewardDelivery = raportResursMukafatiniAl(
        state,
        operation.reportId,
        nowMs
      );
    }
  }

  const cancelBeforeResult =
    evvelkiStatus === STATUS.YOLDA ||
    evvelkiStatus === STATUS.TOPLAMA ||
    evvelkiStatus === STATUS.DOYUS;

  const finalResult = cancelBeforeResult
    ? {
        success: false,
        cancelled: true,
        cancellationReason: "base_relocated",
        previousTargetType: metnAl(operation && operation.targetType, 32),
        previousTargetId: metnAl(operation && operation.targetId, 128),
        rewardCreated: false,
        casualtyApplied: false
      }
    : kopyala(operation && operation.result);

  const historyItem = tarixceyeElaveEt(
    emeliyyatlar,
    operation,
    nowMs,
    {
      previousStatus: evvelkiStatus,
      result: finalResult,
      gatherCancellation,
      battleCancellation,
      lightWoundedRecovery,
      gatherDelivery,
      battleRewardDelivery,
      instantReturn: true
    }
  );

  delete emeliyyatlar.activeByConvoy[convoyId];

  return {
    convoyId,
    previousStatus: evvelkiStatus,
    instantReturn: true,
    cancelledBeforeResult: cancelBeforeResult,
    gatherCancellation,
    battleCancellation,
    lightWoundedRecovery,
    gatherDelivery,
    battleRewardDelivery,
    historyItem
  };
}

async function bazaYerdeyismeKonvoylariniGeriCagir(
  state,
  playerId,
  nowMs = Date.now()
) {
  if (!state || typeof state !== "object") {
    throw new Error("Baza yerdəyişməsi üçün oyunçu state-i yoxdur.");
  }

  const pid = metnAl(playerId, 128);
  const now = tamEded(nowMs) || Date.now();
  const stateId = dovletIdAl(state);

  // Teleport anına qədər real vaxtda artıq bitmiş gather/battle varsa əvvəlcə
  // server onu normal qaydada nəticələndirir. Oyunçu keçmişdə bitmiş döyüşdən
  // teleport etməklə geriyə dönük qaça bilməz.
  const catchUp = await emeliyyatlariYenile(state, pid, now);
  const emeliyyatlar = stateTeminEt(state);
  const recalled = [];

  for (const [convoyId, operation] of Object.entries({ ...emeliyyatlar.activeByConvoy })) {
    if (!operation || typeof operation !== "object") {
      delete emeliyyatlar.activeByConvoy[convoyId];
      continue;
    }

    recalled.push(
      await aktivOperationuDerhalQaytar(
        state,
        pid,
        convoyId,
        operation,
        now
      )
    );
  }

  // Hər hansı köhnə snapshot uyğunsuzluğunda operation state-dən kənarda
  // qalmış legacy gather/battle mission-ları da təmizlənir.
  const legacyGather = state && state.xeriteToplama && state.xeriteToplama.activeByConvoy;
  if (legacyGather && typeof legacyGather === "object") {
    for (const convoyId of Object.keys({ ...legacyGather })) {
      await qalanLegacyToplamaniTemizle(state, pid, convoyId, now);
    }
  }

  const legacyBattle = state && state.worldEnemyBattle && state.worldEnemyBattle.activeByConvoy;
  if (legacyBattle && typeof legacyBattle === "object") {
    for (const convoyId of Object.keys({ ...legacyBattle })) {
      qalanLegacyDoyusuTemizle(state, convoyId, now);
    }
  }

  // Shared State xəritəsindən oyunçunun hərəkətdə olan konvoyları dərhal silinir.
  await oyuncuKonvoylariniSinxronEt(
    stateId,
    pid,
    stateTeminEt(state).activeByConvoy,
    now
  );

  // Teleport + recall yekun state-i PostgreSQL-ə ayrıca yazılır. Bu, legacy
  // gameplay observer-in async snapshot-ı recall tamamlanmadan yazsa belə son
  // həqiqət mənbəyinin tam state olmasını təmin edir.
  await oyunStateIniYaddaSaxla(pid, state);
  dovletBazaKeshiniTemizle(stateId);

  return {
    success: true,
    playerId: pid,
    stateId,
    catchUpChanged: catchUp && catchUp.changed === true,
    recalledCount: recalled.length,
    recalled
  };
}

module.exports = {
  bazaYerdeyismeKonvoylariniGeriCagir
};
