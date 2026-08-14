"use strict";

const {
  stateTeminEt
} = require("./konvoy_emeliyyat_sistemi");
const {
  pvpHucumEmeliyyatiniHazirla
} = require("./pvp_hucum_emeliyyat_sistemi");
const {
  dovletBazasiniBirbasaAlClient
} = require("./dovlet_baza_kataloqu_postgres");
const {
  requestIdAl,
  tekrarNeticesiniTap,
  ugurluNeticeniQeydEt
} = require("./server_sorqu_idempotentliyi");

const PVP_HUCUM_START_EMELIYYAT_TIPI = "pvp_baza_hucum_baslat";

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

function dovletIdAl(state) {
  return Math.max(
    1,
    tamEded(state && state.worldPlacement && state.worldPlacement.stateId) || 1
  );
}

function pvpBazaHucumStartPayloadiniAl(msg) {
  return {
    requestId: requestIdAl(msg && msg.requestId),
    convoyId: metnAl(msg && msg.convoyId, 64),
    targetPlayerId: metnAl(msg && msg.targetPlayerId, 128)
  };
}

function legacyKonvoyMesguldur(state, convoyId) {
  const id = metnAl(convoyId, 64);
  if (!id) return false;

  const gather = state &&
    state.xeriteToplama &&
    state.xeriteToplama.activeByConvoy;

  if (gather && gather[id]) return true;

  const battle = state &&
    state.worldEnemyBattle &&
    state.worldEnemyBattle.activeByConvoy;

  return !!(battle && battle[id]);
}

function pvpBazaHucumStartBloklayicisiniAl(state, convoyId) {
  const id = metnAl(convoyId, 64);

  if (!id) {
    return {
      code: "convoy_id_missing",
      message: "PvP hücumu üçün konvoy ID tələb olunur."
    };
  }

  const emeliyyatlar = stateTeminEt(state);

  if (emeliyyatlar.activeByConvoy[id]) {
    return {
      code: "convoy_busy",
      message: "Seçilmiş konvoy artıq əməliyyatdadır."
    };
  }

  if (legacyKonvoyMesguldur(state, id)) {
    return {
      code: "convoy_busy_legacy",
      message: "Seçilmiş konvoy artıq xəritə tapşırığındadır."
    };
  }

  return null;
}

async function pvpBazaHucumStartMutasiyasiniIcraEt(
  state,
  playerId,
  msg,
  client,
  nowMs = Date.now(),
  asılılıqlar = null
) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return {
      success: false,
      deyisdi: false,
      message: "PvP hücum start üçün oyunçu state-i yoxdur."
    };
  }

  const oyuncuId = metnAl(playerId || state.playerId, 128);
  if (!oyuncuId) {
    return {
      success: false,
      deyisdi: false,
      message: "PvP hücum start üçün playerId yoxdur."
    };
  }

  if (!client || typeof client.query !== "function") {
    return {
      success: false,
      deyisdi: false,
      message: "PvP hücum start üçün PostgreSQL transaction client-i yoxdur."
    };
  }

  const payload = pvpBazaHucumStartPayloadiniAl(msg);

  if (!payload.requestId) {
    return {
      success: false,
      deyisdi: false,
      requestId: "",
      idempotentReplay: false,
      message: "PvP hücum start üçün requestId tələb olunur."
    };
  }

  if (!payload.convoyId) {
    return {
      success: false,
      deyisdi: false,
      requestId: payload.requestId,
      idempotentReplay: false,
      message: "PvP hücum start üçün convoyId tələb olunur."
    };
  }

  if (!payload.targetPlayerId) {
    return {
      success: false,
      deyisdi: false,
      requestId: payload.requestId,
      idempotentReplay: false,
      message: "PvP hücum start üçün targetPlayerId tələb olunur."
    };
  }

  const idempotentPayload = {
    convoyId: payload.convoyId,
    targetPlayerId: payload.targetPlayerId
  };

  const tekrar = tekrarNeticesiniTap(
    state,
    PVP_HUCUM_START_EMELIYYAT_TIPI,
    payload.requestId,
    idempotentPayload
  );

  if (tekrar.conflict) {
    return {
      success: false,
      deyisdi: false,
      requestId: payload.requestId,
      idempotentReplay: false,
      message: tekrar.message || "PvP requestId ziddiyyəti yarandı."
    };
  }

  if (tekrar.replay) {
    const replay = tekrar.result && typeof tekrar.result === "object"
      ? kopyala(tekrar.result)
      : {};

    return {
      success: true,
      deyisdi: false,
      requestId: payload.requestId,
      idempotentReplay: true,
      operation: replay.operation || null,
      rule: replay.rule || null
    };
  }

  const bloklayici = pvpBazaHucumStartBloklayicisiniAl(
    state,
    payload.convoyId
  );

  if (bloklayici) {
    return {
      success: false,
      deyisdi: false,
      requestId: payload.requestId,
      idempotentReplay: false,
      blocker: bloklayici.code,
      message: bloklayici.message
    };
  }

  const hedefBazaAl = asılılıqlar && typeof asılılıqlar.hedefBazaAl === "function"
    ? asılılıqlar.hedefBazaAl
    : dovletBazasiniBirbasaAlClient;

  const hedefBaza = await hedefBazaAl(
    client,
    dovletIdAl(state),
    payload.targetPlayerId
  );

  if (!hedefBaza) {
    return {
      success: false,
      deyisdi: false,
      requestId: payload.requestId,
      idempotentReplay: false,
      message: "PvP hədəf bazası cari Dövlətdə tapılmadı."
    };
  }

  const hazirlama = pvpHucumEmeliyyatiniHazirla(
    state,
    oyuncuId,
    payload.convoyId,
    hedefBaza,
    nowMs
  );

  if (!hazirlama || hazirlama.success !== true || !hazirlama.operation) {
    return {
      success: false,
      deyisdi: false,
      requestId: payload.requestId,
      idempotentReplay: false,
      message: hazirlama && hazirlama.message
        ? hazirlama.message
        : "PvP hücum əməliyyatı hazırlana bilmədi."
    };
  }

  const emeliyyatlar = stateTeminEt(state);
  emeliyyatlar.activeByConvoy[payload.convoyId] = kopyala(hazirlama.operation);

  const saxlanacaqNetice = {
    operation: kopyala(hazirlama.operation),
    rule: kopyala(hazirlama.rule)
  };

  ugurluNeticeniQeydEt(
    state,
    PVP_HUCUM_START_EMELIYYAT_TIPI,
    payload.requestId,
    idempotentPayload,
    saxlanacaqNetice,
    nowMs
  );

  return {
    success: true,
    deyisdi: true,
    requestId: payload.requestId,
    idempotentReplay: false,
    operation: kopyala(hazirlama.operation),
    rule: kopyala(hazirlama.rule)
  };
}

module.exports = {
  PVP_HUCUM_START_EMELIYYAT_TIPI,
  pvpBazaHucumStartPayloadiniAl,
  pvpBazaHucumStartBloklayicisiniAl,
  pvpBazaHucumStartMutasiyasiniIcraEt
};
