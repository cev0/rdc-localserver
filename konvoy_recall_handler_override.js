"use strict";

// WorldV2 manual convoy recall is kept on a short, authoritative path.
// The generic convoy handler also updates the shared/public convoy projection
// inside the player transaction. Under state-wide projection lock contention
// that secondary write can delay the recall ACK long enough for Unity to time out.
//
// Recall now commits the authoritative player state first, sends the result,
// then refreshes the public convoy projection asynchronously. A later info request
// also repairs the projection, so the command response never depends on that cache.

require("./konvoy_emeliyyat_worldv2_override");

const handler = require("./konvoy_emeliyyat_handler");
const sistem = require("./konvoy_emeliyyat_sistemi");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt,
} = require("./oyun_state_mutasiya_postgres");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub,
} = require("./oyun_state_daimilik_korpu");
const {
  requestIdAl,
  tekrarNeticesiniTap,
  ugurluNeticeniQeydEt,
} = require("./server_sorqu_idempotentliyi");
const {
  oyuncuKonvoylariniSinxronEt,
} = require("./dovlet_konvoy_runtime_postgres");
const {
  runtimeDynamicMapRefreshGonder,
} = require("./runtime_world_map_sync");

const RECALL_REQUEST = "convoy_operation_recall_request";
const RECALL_RESULT = "convoy_operation_recall_result";
const IDEMPOTENCY_TYPE = "konvoy_emeliyyat_geri_cagir";

const esasHandler = handler.konvoyEmeliyyatMesajiniEmalEt;
if (typeof esasHandler !== "function") {
  throw new Error("Konvoy əməliyyat handler-i tapılmadı.");
}

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function dovletIdAl(state) {
  return Math.max(
    1,
    Math.trunc(Number(state && state.worldPlacement && state.worldPlacement.stateId) || 1),
  );
}

function aktivEmeliyyatlariAl(state) {
  const active = state &&
    state.konvoyEmeliyyatlari &&
    state.konvoyEmeliyyatlari.activeByConvoy;

  return active && typeof active === "object" && !Array.isArray(active)
    ? active
    : {};
}

function cavabGonder(kontekst, melumat) {
  kontekst.send(kontekst.ws, {
    type: RECALL_RESULT,
    ...melumat,
    serverTimeUnixMs: typeof kontekst.nowMs === "function"
      ? kontekst.nowMs()
      : Date.now(),
  });
}

async function recallMutasiyasiniIcraEt(
  state,
  playerId,
  msg,
  nowMs,
  client,
) {
  const requestId = requestIdAl(msg && msg.requestId);
  const convoyId = metnAl(msg && msg.convoyId, 64);
  const requestPayload = { convoyId };

  if (!requestId) {
    return {
      success: false,
      deyisdi: false,
      requestId: "",
      errorCode: "CONVOY_RECALL_REQUEST_ID_REQUIRED",
      message: "Konvoy geri çağırma requestId-si yoxdur.",
      info: sistem.emeliyyatMelumatiniHazirla(state, nowMs),
    };
  }

  if (!convoyId) {
    return {
      success: false,
      deyisdi: false,
      requestId,
      errorCode: "CONVOY_RECALL_INVALID",
      message: "Konvoy ID yoxdur.",
      info: sistem.emeliyyatMelumatiniHazirla(state, nowMs),
    };
  }

  // Before applying the command, advance any server-authoritative phase that
  // has already elapsed. This uses the same PostgreSQL transaction client.
  const yenileme = await sistem.emeliyyatlariYenile(
    state,
    playerId,
    nowMs,
    { client },
  );
  const yenilemeDeyisdi = !!(yenileme && yenileme.changed === true);

  const tekrar = tekrarNeticesiniTap(
    state,
    IDEMPOTENCY_TYPE,
    requestId,
    requestPayload,
  );

  if (tekrar.conflict) {
    return {
      success: false,
      deyisdi: yenilemeDeyisdi,
      requestId,
      idempotentReplay: false,
      errorCode: "CONVOY_RECALL_REQUEST_CONFLICT",
      message: tekrar.message || "requestId ziddiyyəti yarandı.",
      info: sistem.emeliyyatMelumatiniHazirla(state, nowMs),
    };
  }

  if (tekrar.replay) {
    const replay = tekrar.result && typeof tekrar.result === "object"
      ? kopyala(tekrar.result)
      : {};

    return {
      success: true,
      deyisdi: yenilemeDeyisdi,
      requestId,
      idempotentReplay: true,
      operation: replay.operation || null,
      info: sistem.emeliyyatMelumatiniHazirla(state, nowMs),
      message: replay.message || "Konvoy artıq geri çağırılıb.",
    };
  }

  const result = await sistem.emeliyyatiGeriCagir(
    state,
    playerId,
    convoyId,
    nowMs,
    { client },
  );

  if (!result || result.success !== true) {
    return {
      success: false,
      deyisdi: yenilemeDeyisdi,
      requestId,
      idempotentReplay: false,
      errorCode: result && result.errorCode
        ? result.errorCode
        : "CONVOY_RECALL_FAILED",
      message: result && result.message
        ? result.message
        : "Konvoy geri çağırıla bilmədi.",
      info: sistem.emeliyyatMelumatiniHazirla(state, nowMs),
    };
  }

  const info = sistem.emeliyyatMelumatiniHazirla(state, nowMs);
  const cavab = {
    operation: kopyala(result.operation),
    info: kopyala(info),
    message: result.message || "Konvoy bazaya geri çağırıldı.",
  };

  ugurluNeticeniQeydEt(
    state,
    IDEMPOTENCY_TYPE,
    requestId,
    requestPayload,
    cavab,
    nowMs,
  );

  return {
    success: true,
    deyisdi: true,
    requestId,
    idempotentReplay: false,
    operation: cavab.operation,
    info: cavab.info,
    message: cavab.message,
  };
}

function publicProyeksiyaniArxaPlandaYenile(
  state,
  playerId,
  nowMs,
  runtimeBus,
) {
  const stateId = dovletIdAl(state);
  const active = kopyala(aktivEmeliyyatlariAl(state)) || {};

  Promise.resolve(
    oyuncuKonvoylariniSinxronEt(
      stateId,
      playerId,
      active,
      nowMs,
    ),
  )
    .then(async netice => {
      if (
        netice &&
        netice.success === true
      ) {
        await runtimeDynamicMapRefreshGonder(
          runtimeBus,
          stateId,
          "convoy_operation_recall_request",
          () => nowMs,
        );
      }
    })
    .catch(xeta => {
      console.error("[KONVOY_RECALL_PUBLIC_SYNC]", xeta);
    });
}

handler.konvoyEmeliyyatMesajiniEmalEt = async function(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (type !== RECALL_REQUEST) {
    return await esasHandler(kontekst);
  }

  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128,
  );

  const requestId = requestIdAl(kontekst && kontekst.msg && kontekst.msg.requestId);

  if (!playerId) {
    cavabGonder(kontekst, {
      success: false,
      requestId,
      errorCode: "CONVOY_RECALL_AUTH_REQUIRED",
      message: "Konvoy geri çağırma üçün autentifikasiya tələb olunur.",
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const canliState = kontekst.getOrCreatePlayerState(playerId);
    const nowMs = typeof kontekst.nowMs === "function"
      ? kontekst.nowMs()
      : Date.now();

    const netice = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      canliState,
      async (kilidliState, transaction) => {
        return await recallMutasiyasiniIcraEt(
          kilidliState,
          playerId,
          kontekst.msg,
          nowMs,
          transaction && transaction.client,
        );
      },
    );

    // ACK is sent immediately after the authoritative player transaction commits.
    // Public convoy projection is deliberately not on the critical response path.
    cavabGonder(kontekst, {
      success: !!(netice && netice.success === true),
      playerId,
      requestId: netice && netice.requestId ? netice.requestId : requestId,
      idempotentReplay: !!(netice && netice.idempotentReplay === true),
      errorCode: netice && netice.errorCode ? netice.errorCode : undefined,
      message: netice && netice.message ? netice.message : "",
      operation: netice && netice.operation ? netice.operation : null,
      info: netice && netice.info
        ? netice.info
        : sistem.emeliyyatMelumatiniHazirla(canliState, nowMs),
    });

    if (netice && netice.deyisdi === true) {
      publicProyeksiyaniArxaPlandaYenile(
        canliState,
        playerId,
        nowMs,
        kontekst.runtimeBus,
      );
    }
  }
  catch (xeta) {
    console.error("[KONVOY_RECALL_FAST_PATH]", xeta);
    cavabGonder(kontekst, {
      success: false,
      playerId,
      requestId,
      errorCode: "CONVOY_RECALL_SERVER_ERROR",
      message: "Konvoy geri çağırma əməliyyatı serverdə tamamlanmadı.",
    });
  }

  return true;
};

module.exports = handler;
