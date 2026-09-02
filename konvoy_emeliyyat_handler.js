"use strict";

require("./konvoy_emeliyyat_worldv2_override");

const {
  emeliyyatiBaslat,
  emeliyyatiGeriCagir,
  emeliyyatlariYenile,
  emeliyyatMelumatiniHazirla,
  emeliyyatOnbaxisiniHazirla
} = require("./konvoy_emeliyyat_sistemi");
const {
  worldV2ResursTargetIdDirmi,
  worldV2ResursHedefiniAlClient
} = require("./dovlet_xerite_worldv2_resurs_emeliyyat_sistemi");
const {
  oyuncuKonvoylariniSinxronEtClient
} = require("./dovlet_konvoy_runtime_postgres");
const {
  requestIdAl,
  tekrarNeticesiniTap,
  ugurluNeticeniQeydEt
} = require("./server_sorqu_idempotentliyi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

const MESAJLAR = new Set([
  "convoy_operation_info_request",
  "convoy_operation_preview_request",
  "convoy_operation_start_request",
  "convoy_operation_recall_request"
]);

const STATE_YEDEK_SAHELERI = Object.freeze([
  "konvoyEmeliyyatlari",
  "xeriteToplama",
  "worldEnemyBattle",
  "doyusRaportlari",
  "resources",
  "army",
  "konvoylar",
  "xestexana",
  "serverSorquIdempotentliyi"
]);

const oyuncuKilidleri = new Map();

function metnAl(v, max = 220) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function gonder(k, type, data) {
  k.send(k.ws, {
    type,
    ...data,
    serverTimeUnixMs: k.nowMs()
  });
}

async function oyuncuKilidiIleIcraEt(playerId, emeliyyat) {
  const evvelki = oyuncuKilidleri.get(playerId) || Promise.resolve();
  let kilidiAc;
  const cari = new Promise(resolve => {
    kilidiAc = resolve;
  });

  oyuncuKilidleri.set(playerId, cari);
  await evvelki;

  try {
    return await emeliyyat();
  }
  finally {
    kilidiAc();
    if (oyuncuKilidleri.get(playerId) === cari) {
      oyuncuKilidleri.delete(playerId);
    }
  }
}

function dovletIdAl(state) {
  return Math.max(
    1,
    Math.trunc(Number(state && state.worldPlacement && state.worldPlacement.stateId) || 1)
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

async function sharedKonvoylariTransactiondaSinxronEt(
  client,
  state,
  playerId,
  nowMs
) {
  const netice = await oyuncuKonvoylariniSinxronEtClient(
    client,
    dovletIdAl(state),
    playerId,
    aktivEmeliyyatlariAl(state),
    nowMs
  );

  if (!netice || netice.success !== true) {
    throw new Error(
      netice && netice.message
        ? netice.message
        : "Shared convoy runtime transaction daxilində sinxron edilə bilmədi."
    );
  }

  return netice;
}

function stateYedeyiniAl(state) {
  const yedek = {};

  for (const sahe of STATE_YEDEK_SAHELERI) {
    const varIdi = Object.prototype.hasOwnProperty.call(state, sahe);
    yedek[sahe] = {
      varIdi,
      deyer: varIdi ? kopyala(state[sahe]) : undefined
    };
  }

  return yedek;
}

function stateRollbackEt(state, evvelki) {
  for (const sahe of STATE_YEDEK_SAHELERI) {
    const item = evvelki && evvelki[sahe];
    if (item && item.varIdi) {
      state[sahe] = kopyala(item.deyer);
    }
    else {
      delete state[sahe];
    }
  }
}

function startPayloadiniAl(msg) {
  return {
    convoyId: metnAl(msg && msg.convoyId, 64),
    targetType: metnAl(msg && msg.targetType, 32),
    targetId: metnAl(msg && msg.targetId, 220)
  };
}

function geriCagirPayloadiniAl(msg) {
  return {
    convoyId: metnAl(msg && msg.convoyId, 64)
  };
}

async function worldV2HedefOverrideAl(state, requestPayload, nowMs, client) {
  if (!requestPayload ||
      requestPayload.targetType !== "resource" ||
      !worldV2ResursTargetIdDirmi(requestPayload.targetId)) {
    return { success: true, hedefOverride: null };
  }

  if (!client || typeof client.query !== "function") {
    return {
      success: false,
      errorCode: "WORLDV2_RESOURCE_TRANSACTION_REQUIRED",
      message: "WorldV2 resurs əməliyyatı üçün server transaction-u yoxdur."
    };
  }

  const netice = await worldV2ResursHedefiniAlClient(
    client,
    dovletIdAl(state),
    requestPayload.targetId,
    nowMs
  );

  if (!netice || netice.success !== true || !netice.hedef) {
    return {
      success: false,
      errorCode: netice && netice.errorCode
        ? netice.errorCode
        : "WORLDV2_RESOURCE_NOT_FOUND",
      message: netice && netice.message
        ? netice.message
        : "WorldV2 resurs hədəfi tapılmadı."
    };
  }

  if (netice.hedef.available === false &&
      netice.hedef.occupiedByPlayerId &&
      netice.hedef.occupiedByConvoyId) {
    return {
      success: false,
      errorCode: "WORLDV2_RESOURCE_OCCUPIED",
      message: "Resurs hazırda başqa konvoy tərəfindən tutulub."
    };
  }

  return {
    success: true,
    hedefOverride: netice.hedef
  };
}

async function geriCagirmaMutasiyasiniTetbiqEt(
  state,
  playerId,
  msg,
  nowMs,
  client,
  yenilemeDeyisdi
) {
  const requestId = requestIdAl(msg && msg.requestId);
  const requestPayload = geriCagirPayloadiniAl(msg);
  const tekrar = tekrarNeticesiniTap(
    state,
    "konvoy_emeliyyat_geri_cagir",
    requestId,
    requestPayload
  );

  if (tekrar.conflict) {
    return {
      success: false,
      deyisdi: yenilemeDeyisdi,
      requestId,
      idempotentReplay: false,
      message: tekrar.message || "requestId ziddiyyəti yarandı.",
      info: emeliyyatMelumatiniHazirla(state, nowMs)
    };
  }

  if (tekrar.replay) {
    await sharedKonvoylariTransactiondaSinxronEt(
      client,
      state,
      playerId,
      nowMs
    );

    const replay = tekrar.result && typeof tekrar.result === "object"
      ? kopyala(tekrar.result)
      : {};

    return {
      success: true,
      deyisdi: yenilemeDeyisdi,
      requestId,
      idempotentReplay: true,
      operation: replay.operation || null,
      info: replay.info || emeliyyatMelumatiniHazirla(state, nowMs),
      payloadJson: JSON.stringify(replay),
      message: replay.message || "Konvoy artıq geri çağırılıb."
    };
  }

  const geriCagirmadanEvvel = stateYedeyiniAl(state);
  const result = await emeliyyatiGeriCagir(
    state,
    playerId,
    requestPayload.convoyId,
    nowMs,
    { client }
  );

  if (!result || result.success !== true) {
    stateRollbackEt(state, geriCagirmadanEvvel);

    if (yenilemeDeyisdi) {
      await sharedKonvoylariTransactiondaSinxronEt(
        client,
        state,
        playerId,
        nowMs
      );
    }

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
      info: emeliyyatMelumatiniHazirla(state, nowMs)
    };
  }

  const info = emeliyyatMelumatiniHazirla(state, nowMs);
  const cavab = {
    operation: kopyala(result.operation),
    info: kopyala(info),
    message: result.message || "Konvoy bazaya geri çağırıldı."
  };

  ugurluNeticeniQeydEt(
    state,
    "konvoy_emeliyyat_geri_cagir",
    requestId,
    requestPayload,
    cavab,
    nowMs
  );

  await sharedKonvoylariTransactiondaSinxronEt(
    client,
    state,
    playerId,
    nowMs
  );

  return {
    success: true,
    deyisdi: true,
    requestId,
    idempotentReplay: false,
    operation: cavab.operation,
    info: cavab.info,
    message: cavab.message,
    payloadJson: JSON.stringify(cavab)
  };
}

async function konvoyEmeliyyatMutasiyasiniTetbiqEt(
  state,
  playerId,
  type,
  msg,
  nowMs,
  client
) {
  const yenileme = await emeliyyatlariYenile(
    state,
    playerId,
    nowMs,
    { client }
  );
  const yenilemeDeyisdi = !!(yenileme && yenileme.changed === true);

  if (type === "convoy_operation_info_request") {
    await sharedKonvoylariTransactiondaSinxronEt(
      client,
      state,
      playerId,
      nowMs
    );

    const info = emeliyyatMelumatiniHazirla(state, nowMs);
    return {
      success: true,
      deyisdi: yenilemeDeyisdi,
      info,
      payloadJson: JSON.stringify(info)
    };
  }

  if (type === "convoy_operation_preview_request") {
    const requestId = requestIdAl(msg && msg.requestId);
    const requestPayload = startPayloadiniAl(msg);
    const worldV2Hedef = await worldV2HedefOverrideAl(
      state,
      requestPayload,
      nowMs,
      client
    );

    if (!worldV2Hedef || worldV2Hedef.success !== true) {
      if (yenilemeDeyisdi) {
        await sharedKonvoylariTransactiondaSinxronEt(
          client,
          state,
          playerId,
          nowMs
        );
      }

      return {
        success: false,
        deyisdi: yenilemeDeyisdi,
        requestId,
        errorCode: worldV2Hedef && worldV2Hedef.errorCode
          ? worldV2Hedef.errorCode
          : undefined,
        message: worldV2Hedef && worldV2Hedef.message
          ? worldV2Hedef.message
          : "Konvoy yürüş vaxtı hesablana bilmədi."
      };
    }

    const result = emeliyyatOnbaxisiniHazirla(
      state,
      requestPayload.convoyId,
      requestPayload.targetType,
      requestPayload.targetId,
      worldV2Hedef.hedefOverride
        ? { hedefOverride: worldV2Hedef.hedefOverride }
        : null
    );

    if (!result || result.success !== true || !result.preview) {
      if (yenilemeDeyisdi) {
        await sharedKonvoylariTransactiondaSinxronEt(
          client,
          state,
          playerId,
          nowMs
        );
      }

      return {
        success: false,
        deyisdi: yenilemeDeyisdi,
        requestId,
        message: result && result.message
          ? result.message
          : "Konvoy yürüş vaxtı hesablana bilmədi."
      };
    }

    if (yenilemeDeyisdi) {
      await sharedKonvoylariTransactiondaSinxronEt(
        client,
        state,
        playerId,
        nowMs
      );
    }

    return {
      success: true,
      deyisdi: yenilemeDeyisdi,
      requestId,
      preview: result.preview,
      payloadJson: JSON.stringify(result.preview)
    };
  }

  if (type === "convoy_operation_recall_request") {
    return geriCagirmaMutasiyasiniTetbiqEt(
      state,
      playerId,
      msg,
      nowMs,
      client,
      yenilemeDeyisdi
    );
  }

  const requestId = requestIdAl(msg && msg.requestId);
  const requestPayload = startPayloadiniAl(msg);
  const tekrar = tekrarNeticesiniTap(
    state,
    "konvoy_emeliyyat_baslat",
    requestId,
    requestPayload
  );

  if (tekrar.conflict) {
    if (yenilemeDeyisdi) {
      await sharedKonvoylariTransactiondaSinxronEt(
        client,
        state,
        playerId,
        nowMs
      );
    }

    return {
      success: false,
      deyisdi: yenilemeDeyisdi,
      requestId,
      idempotentReplay: false,
      message: tekrar.message || "requestId ziddiyyəti yarandı.",
      info: emeliyyatMelumatiniHazirla(state, nowMs)
    };
  }

  if (tekrar.replay) {
    await sharedKonvoylariTransactiondaSinxronEt(
      client,
      state,
      playerId,
      nowMs
    );

    const replay = tekrar.result && typeof tekrar.result === "object"
      ? kopyala(tekrar.result)
      : {};

    return {
      success: true,
      deyisdi: yenilemeDeyisdi,
      requestId,
      idempotentReplay: true,
      operation: replay.operation || null,
      info: replay.info || emeliyyatMelumatiniHazirla(state, nowMs),
      payloadJson: JSON.stringify(replay)
    };
  }

  const startdanEvvel = stateYedeyiniAl(state);

  const worldV2Hedef = await worldV2HedefOverrideAl(
    state,
    requestPayload,
    nowMs,
    client
  );

  if (!worldV2Hedef || worldV2Hedef.success !== true) {
    stateRollbackEt(state, startdanEvvel);

    if (yenilemeDeyisdi) {
      await sharedKonvoylariTransactiondaSinxronEt(
        client,
        state,
        playerId,
        nowMs
      );
    }

    return {
      success: false,
      deyisdi: yenilemeDeyisdi,
      requestId,
      idempotentReplay: false,
      errorCode: worldV2Hedef && worldV2Hedef.errorCode
        ? worldV2Hedef.errorCode
        : undefined,
      message: worldV2Hedef && worldV2Hedef.message
        ? worldV2Hedef.message
        : "WorldV2 resurs hədəfi tapılmadı.",
      info: emeliyyatMelumatiniHazirla(state, nowMs)
    };
  }

  const result = emeliyyatiBaslat(
    state,
    playerId,
    requestPayload.convoyId,
    requestPayload.targetType,
    requestPayload.targetId,
    nowMs,
    worldV2Hedef.hedefOverride
      ? { hedefOverride: worldV2Hedef.hedefOverride }
      : null
  );

  if (!result || result.success !== true) {
    stateRollbackEt(state, startdanEvvel);

    if (yenilemeDeyisdi) {
      await sharedKonvoylariTransactiondaSinxronEt(
        client,
        state,
        playerId,
        nowMs
      );
    }

    return {
      success: false,
      deyisdi: yenilemeDeyisdi,
      requestId,
      idempotentReplay: false,
      message: result && result.message
        ? result.message
        : "Konvoy əməliyyatı başlaya bilmədi.",
      readinessCode: result && result.readinessCode
        ? result.readinessCode
        : undefined,
      readiness: result && result.readiness
        ? kopyala(result.readiness)
        : undefined,
      movementConfigured: result && result.movementConfigured === false
        ? false
        : undefined,
      info: emeliyyatMelumatiniHazirla(state, nowMs)
    };
  }

  const info = emeliyyatMelumatiniHazirla(state, nowMs);
  const cavab = {
    operation: kopyala(result.operation),
    info: kopyala(info)
  };

  ugurluNeticeniQeydEt(
    state,
    "konvoy_emeliyyat_baslat",
    requestId,
    requestPayload,
    cavab,
    nowMs
  );

  await sharedKonvoylariTransactiondaSinxronEt(
    client,
    state,
    playerId,
    nowMs
  );

  return {
    success: true,
    deyisdi: true,
    requestId,
    idempotentReplay: false,
    operation: cavab.operation,
    info: cavab.info,
    payloadJson: JSON.stringify(cavab)
  };
}

async function konvoyEmeliyyatMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!MESAJLAR.has(type)) return false;

  const resultType = type.replace(/_request$/, "_result");
  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      message: "Konvoy əməliyyatı üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    await oyuncuKilidiIleIcraEt(playerId, async () => {
      const canliState = kontekst.getOrCreatePlayerState(playerId);
      const nowMs = kontekst.nowMs();

      const netice = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
        playerId,
        canliState,
        async (kilidliState, transaction) => {
          return konvoyEmeliyyatMutasiyasiniTetbiqEt(
            kilidliState,
            playerId,
            type,
            kontekst.msg,
            nowMs,
            transaction && transaction.client
          );
        }
      );

      if (type === "convoy_operation_info_request") {
        const info = netice && netice.info
          ? netice.info
          : emeliyyatMelumatiniHazirla(canliState, nowMs);

        gonder(kontekst, resultType, {
          success: true,
          playerId,
          info,
          payloadJson: netice && netice.payloadJson
            ? netice.payloadJson
            : JSON.stringify(info)
        });
        return;
      }

      if (type === "convoy_operation_preview_request" &&
          netice && netice.success === true && netice.preview) {
        gonder(kontekst, resultType, {
          success: true,
          playerId,
          requestId: netice.requestId || "",
          preview: netice.preview,
          payloadJson: netice.payloadJson || JSON.stringify(netice.preview)
        });
        return;
      }

      if (!netice || netice.success !== true) {
        gonder(kontekst, resultType, {
          success: false,
          playerId,
          requestId: netice && netice.requestId
            ? netice.requestId
            : requestIdAl(kontekst.msg && kontekst.msg.requestId),
          idempotentReplay: false,
          errorCode: netice && netice.errorCode
            ? netice.errorCode
            : undefined,
          message: netice && netice.message
            ? netice.message
            : (type === "convoy_operation_recall_request"
                ? "Konvoy geri çağırıla bilmədi."
                : type === "convoy_operation_preview_request"
                  ? "Konvoy yürüş vaxtı hesablana bilmədi."
                  : "Konvoy əməliyyatı başlaya bilmədi."),
          readinessCode: netice && netice.readinessCode
            ? netice.readinessCode
            : undefined,
          readiness: netice && netice.readiness
            ? netice.readiness
            : undefined,
          movementConfigured: netice && netice.movementConfigured === false
            ? false
            : undefined,
          info: netice && netice.info
            ? netice.info
            : emeliyyatMelumatiniHazirla(canliState, nowMs)
        });
        return;
      }

      const info = netice.info || emeliyyatMelumatiniHazirla(canliState, nowMs);
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        requestId: netice.requestId || "",
        idempotentReplay: netice.idempotentReplay === true,
        message: netice.message || "",
        operation: netice.operation || null,
        info,
        payloadJson: netice.payloadJson || JSON.stringify({
          operation: netice.operation || null,
          info,
          message: netice.message || ""
        })
      });
    });
  }
  catch (xeta) {
    console.error("[KONVOY_EMELIYYAT]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      requestId: requestIdAl(kontekst.msg && kontekst.msg.requestId),
      idempotentReplay: false,
      message: type === "convoy_operation_recall_request"
        ? "Konvoy geri çağırma əməliyyatı tamamlanmadı."
        : type === "convoy_operation_preview_request"
          ? "Konvoy yürüş vaxtının hesablanması tamamlanmadı."
          : "Konvoy əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  STATE_YEDEK_SAHELERI,
  startPayloadiniAl,
  geriCagirPayloadiniAl,
  stateYedeyiniAl,
  stateRollbackEt,
  worldV2HedefOverrideAl,
  konvoyEmeliyyatMutasiyasiniTetbiqEt,
  konvoyEmeliyyatMesajiniEmalEt
};
