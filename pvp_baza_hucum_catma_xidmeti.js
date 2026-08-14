"use strict";

const {
  stateTeminEt
} = require("./konvoy_emeliyyat_sistemi");
const {
  pvpHucumCatmaVeziyyetiniHazirla
} = require("./pvp_hucum_emeliyyat_sistemi");
const {
  PVP_BAZA_STATUSLARI
} = require("./pvp_baza_hedef_qaydasi");
const {
  dovletBazasiniBirbasaAlClient
} = require("./dovlet_baza_kataloqu_postgres");
const {
  dovletYerdeyismeKilidiniAlClient
} = require("./baza_yerdeyisme_dovlet_kilidi_postgres");

function metnAl(v, max = 128) {
  return typeof v === "string"
    ? v.trim().slice(0, max).toLowerCase()
    : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n)
    ? Math.max(0, Math.trunc(n))
    : 0;
}

function kopyala(v) {
  return v == null
    ? null
    : JSON.parse(JSON.stringify(v));
}

function pvpBazaHucumCatmaPayloadiniAl(msg) {
  return {
    convoyId: metnAl(msg && msg.convoyId, 64),
    operationId: metnAl(msg && msg.operationId, 220)
  };
}

function pvpAktivHucumEmeliyyatiniTap(state, convoyId) {
  const id = metnAl(convoyId, 64);
  if (!id) return null;

  const emeliyyatlar = stateTeminEt(state);
  const operation = emeliyyatlar.activeByConvoy[id];

  if (!operation || typeof operation !== "object") {
    return null;
  }

  if (metnAl(operation.targetType, 32) !== "player_base") {
    return null;
  }

  return operation;
}

function pvpCatmaNeticesiniEmeliyyataTetbiqEt(
  operation,
  catmaNeticesi,
  nowMs = Date.now()
) {
  if (!operation || typeof operation !== "object") {
    return {
      success: false,
      deyisdi: false,
      message: "PvP çatma nəticəsi üçün əməliyyat yoxdur."
    };
  }

  if (!catmaNeticesi || catmaNeticesi.success !== true) {
    return {
      success: false,
      deyisdi: false,
      message: catmaNeticesi && catmaNeticesi.message
        ? catmaNeticesi.message
        : "PvP çatma nəticəsi düzgün deyil."
    };
  }

  if (catmaNeticesi.arrived !== true) {
    return {
      success: true,
      deyisdi: false,
      operation: kopyala(operation),
      arrival: kopyala(catmaNeticesi)
    };
  }

  const indi = tamEded(nowMs) || Date.now();
  const yeniStatus = metnAl(catmaNeticesi.nextStatus, 64);

  if (yeniStatus === PVP_BAZA_STATUSLARI.TERK_EDILMIS_HEDEFDE_KAMP) {
    const sebeb = metnAl(
      catmaNeticesi.reason || "target_relocated",
      64
    );

    operation.status = PVP_BAZA_STATUSLARI.TERK_EDILMIS_HEDEFDE_KAMP;
    operation.battleAllowed = false;
    operation.abandonedTarget = true;
    operation.campReason = sebeb || "target_relocated";
    operation.arrivalResolvedAtMs = indi;
    operation.targetStillPresentAtArrival = false;
    operation.defenderEscapedByRelocation = true;
    operation.result = {
      type: "pvp_arrival",
      outcome: "camp",
      reason: operation.campReason,
      targetStillPresent: false,
      battleAllowed: false,
      resolvedAtMs: indi
    };

    return {
      success: true,
      deyisdi: true,
      operation: kopyala(operation),
      arrival: kopyala(catmaNeticesi)
    };
  }

  if (yeniStatus === PVP_BAZA_STATUSLARI.DOYUSE_HAZIR) {
    operation.status = PVP_BAZA_STATUSLARI.DOYUSE_HAZIR;
    operation.battleAllowed = true;
    operation.abandonedTarget = false;
    operation.campReason = "";
    operation.arrivalResolvedAtMs = indi;
    operation.targetStillPresentAtArrival = true;
    operation.defenderEscapedByRelocation = false;
    operation.result = null;

    return {
      success: true,
      deyisdi: true,
      operation: kopyala(operation),
      arrival: kopyala(catmaNeticesi)
    };
  }

  return {
    success: false,
    deyisdi: false,
    message: "PvP çatma nəticəsində naməlum növbəti status alındı."
  };
}

async function pvpBazaHucumCatmaMutasiyasiniIcraEt(
  state,
  playerId,
  msg,
  client,
  nowMs = Date.now(),
  asililiqlar = null
) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return {
      success: false,
      deyisdi: false,
      message: "PvP çatma üçün oyunçu state-i yoxdur."
    };
  }

  const oyuncuId = metnAl(playerId || state.playerId, 128);
  if (!oyuncuId) {
    return {
      success: false,
      deyisdi: false,
      message: "PvP çatma üçün playerId yoxdur."
    };
  }

  if (!client || typeof client.query !== "function") {
    return {
      success: false,
      deyisdi: false,
      message: "PvP çatma üçün PostgreSQL transaction client-i yoxdur."
    };
  }

  const payload = pvpBazaHucumCatmaPayloadiniAl(msg);
  if (!payload.convoyId) {
    return {
      success: false,
      deyisdi: false,
      message: "PvP çatma üçün convoyId tələb olunur."
    };
  }

  const operation = pvpAktivHucumEmeliyyatiniTap(
    state,
    payload.convoyId
  );

  if (!operation) {
    return {
      success: false,
      deyisdi: false,
      message: "Aktiv PvP baza hücumu tapılmadı."
    };
  }

  const operationPlayerId = metnAl(operation.playerId, 128);
  if (operationPlayerId && operationPlayerId !== oyuncuId) {
    return {
      success: false,
      deyisdi: false,
      message: "PvP əməliyyatı başqa oyunçuya məxsusdur."
    };
  }

  const operationId = metnAl(operation.operationId, 220);
  if (payload.operationId && operationId !== payload.operationId) {
    return {
      success: false,
      deyisdi: false,
      blocker: "operation_mismatch",
      message: "PvP əməliyyat ID-si cari konvoy əməliyyatı ilə uyğun deyil."
    };
  }

  const status = metnAl(operation.status, 64);

  if (
    status === PVP_BAZA_STATUSLARI.DOYUSE_HAZIR ||
    status === PVP_BAZA_STATUSLARI.TERK_EDILMIS_HEDEFDE_KAMP
  ) {
    return {
      success: true,
      deyisdi: false,
      alreadyResolved: true,
      operation: kopyala(operation),
      arrival: {
        success: true,
        arrived: true,
        remainingMs: 0,
        nextStatus: status,
        battleAllowed: operation.battleAllowed === true,
        campRequired: status === PVP_BAZA_STATUSLARI.TERK_EDILMIS_HEDEFDE_KAMP,
        targetStillPresent: operation.targetStillPresentAtArrival === true
      }
    };
  }

  if (status !== PVP_BAZA_STATUSLARI.YOLDA) {
    return {
      success: false,
      deyisdi: false,
      message: "PvP hücum əməliyyatı çatma üçün uyğun statusda deyil."
    };
  }

  // Çatma vaxtından əvvəl DB-də hədəf baza oxunmur və Dövlət lock alınmır.
  const ilkinCatma = pvpHucumCatmaVeziyyetiniHazirla(
    operation,
    null,
    nowMs
  );

  if (!ilkinCatma || ilkinCatma.success !== true) {
    return {
      success: false,
      deyisdi: false,
      message: ilkinCatma && ilkinCatma.message
        ? ilkinCatma.message
        : "PvP çatma vaxtı hesablana bilmədi."
    };
  }

  if (ilkinCatma.arrived !== true) {
    return {
      success: true,
      deyisdi: false,
      operation: kopyala(operation),
      arrival: kopyala(ilkinCatma)
    };
  }

  const stateId = Math.max(
    1,
    tamEded(
      operation.stateId ||
      (operation.targetSnapshot && operation.targetSnapshot.stateId)
    ) || 1
  );
  const targetPlayerId = metnAl(
    operation.targetPlayerId ||
    (operation.targetSnapshot && operation.targetSnapshot.targetPlayerId),
    128
  );

  if (!targetPlayerId) {
    return {
      success: false,
      deyisdi: false,
      message: "PvP əməliyyatında hədəf playerId yoxdur."
    };
  }

  const dovletKilidiAl = asililiqlar && typeof asililiqlar.dovletKilidiAl === "function"
    ? asililiqlar.dovletKilidiAl
    : dovletYerdeyismeKilidiniAlClient;
  const hedefBazaAl = asililiqlar && typeof asililiqlar.hedefBazaAl === "function"
    ? asililiqlar.hedefBazaAl
    : dovletBazasiniBirbasaAlClient;

  // Eyni transaction client-i üzərində Dövlət lock commit/rollback-a qədər qalır.
  // Teleport da eyni lock key-dən istifadə etdiyi üçün fresh target snapshot oxusu
  // teleportun snapshot yazısı ilə paralel keçə bilməz.
  await dovletKilidiAl(client, stateId);

  const cariHedefBaza = await hedefBazaAl(
    client,
    stateId,
    targetPlayerId
  );

  const yekunCatma = pvpHucumCatmaVeziyyetiniHazirla(
    operation,
    cariHedefBaza,
    nowMs
  );

  return pvpCatmaNeticesiniEmeliyyataTetbiqEt(
    operation,
    yekunCatma,
    nowMs
  );
}

module.exports = {
  pvpBazaHucumCatmaPayloadiniAl,
  pvpAktivHucumEmeliyyatiniTap,
  pvpCatmaNeticesiniEmeliyyataTetbiqEt,
  pvpBazaHucumCatmaMutasiyasiniIcraEt
};
