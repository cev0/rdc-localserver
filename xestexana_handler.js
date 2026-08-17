"use strict";

const {
  xestexanaMelumatiniHazirla,
  sagaltmaPreviewHazirla,
  yaralilariSagalt
} = require("./xestexana_sistemi");
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
  "xestexana_info_request",
  "xestexana_sagaltma_preview_request",
  "xestexana_sagaltma_request"
]);

const oyuncuKilidleri = new Map();

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
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

function birlikPayloadiniHazirla(rawBirlikler) {
  return (Array.isArray(rawBirlikler) ? rawBirlikler : [])
    .map(x => ({
      siraId: metnAl(x && x.siraId, 32),
      unitId: metnAl(x && x.unitId, 128),
      count: tamEded(x && x.count)
    }))
    .filter(x => x.unitId && x.count > 0)
    .sort((a, b) => {
      const ka = `${a.unitId}|${a.siraId}|${a.count}`;
      const kb = `${b.unitId}|${b.siraId}|${b.count}`;
      return ka.localeCompare(kb);
    });
}

function saheniYedekle(state, acar) {
  return {
    varIdi: Object.prototype.hasOwnProperty.call(state, acar),
    deyer: kopyala(state[acar])
  };
}

function saheniBerpaEt(state, acar, yedek) {
  if (yedek && yedek.varIdi) {
    state[acar] = kopyala(yedek.deyer);
  }
  else {
    delete state[acar];
  }
}

function xestexanaMutationYedeyiniAl(state) {
  return {
    xestexana: saheniYedekle(state, "xestexana"),
    resources: saheniYedekle(state, "resources"),
    army: saheniYedekle(state, "army"),
    serverSorquIdempotentliyi: saheniYedekle(
      state,
      "serverSorquIdempotentliyi"
    )
  };
}

function xestexanaMutationRollbackEt(state, evvelki) {
  saheniBerpaEt(state, "xestexana", evvelki && evvelki.xestexana);
  saheniBerpaEt(state, "resources", evvelki && evvelki.resources);
  saheniBerpaEt(state, "army", evvelki && evvelki.army);
  saheniBerpaEt(
    state,
    "serverSorquIdempotentliyi",
    evvelki && evvelki.serverSorquIdempotentliyi
  );
}

function xestexanaSagaltmaMutasiyasiniTetbiqEt(
  state,
  rawBirlikler,
  rawRequestId,
  nowMs = Date.now()
) {
  const birlikler = Array.isArray(rawBirlikler)
    ? rawBirlikler
    : [];
  const requestId = requestIdAl(rawRequestId);
  const requestPayload = {
    birlikler: birlikPayloadiniHazirla(birlikler)
  };

  const tekrar = tekrarNeticesiniTap(
    state,
    "xestexana_sagaltma",
    requestId,
    requestPayload
  );

  if (tekrar.conflict) {
    return {
      success: false,
      deyisdi: false,
      requestId,
      idempotentReplay: false,
      message: tekrar.message || "requestId ziddiyyəti yarandı."
    };
  }

  if (tekrar.replay) {
    const replayResult = tekrar.result && typeof tekrar.result === "object"
      ? kopyala(tekrar.result)
      : {};

    return {
      success: true,
      deyisdi: false,
      requestId,
      idempotentReplay: true,
      result: replayResult
    };
  }

  const evvelki = xestexanaMutationYedeyiniAl(state);
  const result = yaralilariSagalt(state, birlikler, nowMs);

  if (!result || result.success !== true) {
    xestexanaMutationRollbackEt(state, evvelki);

    return {
      success: false,
      deyisdi: false,
      requestId,
      idempotentReplay: false,
      message: result && result.message
        ? result.message
        : "Sağaltma mümkün deyil.",
      preview: result && result.preview
        ? kopyala(result.preview)
        : undefined
    };
  }

  ugurluNeticeniQeydEt(
    state,
    "xestexana_sagaltma",
    requestId,
    requestPayload,
    result,
    nowMs
  );

  return {
    success: true,
    deyisdi: true,
    requestId,
    idempotentReplay: false,
    result: kopyala(result)
  };
}

async function xestexanaMesajiniEmalEt(kontekst) {
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
      message: "Xəstəxana əməliyyatı üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);

    if (type === "xestexana_info_request") {
      const info = xestexanaMelumatiniHazirla(state);
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info)
      });
      return true;
    }

    const birlikler = Array.isArray(kontekst.msg && kontekst.msg.birlikler)
      ? kontekst.msg.birlikler
      : [];

    if (type === "xestexana_sagaltma_preview_request") {
      const preview = sagaltmaPreviewHazirla(state, birlikler);
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        preview,
        payloadJson: JSON.stringify(preview)
      });
      return true;
    }

    await oyuncuKilidiIleIcraEt(playerId, async () => {
      const canliState = kontekst.getOrCreatePlayerState(playerId);
      const mutasiyaNeticesi = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
        playerId,
        canliState,
        async kilidliState => {
          return xestexanaSagaltmaMutasiyasiniTetbiqEt(
            kilidliState,
            birlikler,
            kontekst.msg && kontekst.msg.requestId,
            kontekst.nowMs()
          );
        }
      );

      if (!mutasiyaNeticesi || mutasiyaNeticesi.success !== true) {
        gonder(kontekst, resultType, {
          success: false,
          playerId,
          requestId: mutasiyaNeticesi && mutasiyaNeticesi.requestId
            ? mutasiyaNeticesi.requestId
            : requestIdAl(kontekst.msg && kontekst.msg.requestId),
          idempotentReplay: false,
          message: mutasiyaNeticesi && mutasiyaNeticesi.message
            ? mutasiyaNeticesi.message
            : "Sağaltma mümkün deyil.",
          preview: mutasiyaNeticesi && mutasiyaNeticesi.preview
            ? mutasiyaNeticesi.preview
            : undefined
        });
        return;
      }

      const result = mutasiyaNeticesi.result && typeof mutasiyaNeticesi.result === "object"
        ? mutasiyaNeticesi.result
        : {};

      gonder(kontekst, resultType, {
        success: true,
        playerId,
        requestId: mutasiyaNeticesi.requestId,
        idempotentReplay: mutasiyaNeticesi.idempotentReplay === true,
        ...result,
        payloadJson: JSON.stringify(result)
      });
    });
  }
  catch (xeta) {
    console.error("[XESTEXANA]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      requestId: requestIdAl(kontekst.msg && kontekst.msg.requestId),
      idempotentReplay: false,
      message: "Xəstəxana əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  birlikPayloadiniHazirla,
  xestexanaSagaltmaMutasiyasiniTetbiqEt,
  xestexanaMesajiniEmalEt
};
