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
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

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
      const kilidliState = kontekst.getOrCreatePlayerState(playerId);
      const requestId = requestIdAl(kontekst.msg && kontekst.msg.requestId);
      const requestPayload = {
        birlikler: birlikPayloadiniHazirla(birlikler)
      };

      const tekrar = tekrarNeticesiniTap(
        kilidliState,
        "xestexana_sagaltma",
        requestId,
        requestPayload
      );

      if (tekrar.conflict) {
        gonder(kontekst, resultType, {
          success: false,
          playerId,
          requestId,
          idempotentReplay: false,
          message: tekrar.message || "requestId ziddiyyəti yarandı."
        });
        return;
      }

      if (tekrar.replay) {
        const replayResult = tekrar.result && typeof tekrar.result === "object"
          ? tekrar.result
          : {};
        gonder(kontekst, resultType, {
          success: true,
          playerId,
          requestId,
          idempotentReplay: true,
          ...replayResult,
          payloadJson: JSON.stringify(replayResult)
        });
        return;
      }

      const evvelki = kopyala({
        xestexana: kilidliState.xestexana || null,
        resources: kilidliState.resources || null,
        army: kilidliState.army || null,
        serverSorquIdempotentliyi: kilidliState.serverSorquIdempotentliyi || null
      });

      const nowMs = kontekst.nowMs();
      const result = yaralilariSagalt(kilidliState, birlikler, nowMs);

      if (!result || result.success !== true) {
        kilidliState.xestexana = evvelki.xestexana;
        kilidliState.resources = evvelki.resources;
        kilidliState.army = evvelki.army;
        kilidliState.serverSorquIdempotentliyi = evvelki.serverSorquIdempotentliyi;
        gonder(kontekst, resultType, {
          success: false,
          playerId,
          requestId,
          idempotentReplay: false,
          message: result && result.message ? result.message : "Sağaltma mümkün deyil.",
          preview: result && result.preview ? result.preview : undefined
        });
        return;
      }

      ugurluNeticeniQeydEt(
        kilidliState,
        "xestexana_sagaltma",
        requestId,
        requestPayload,
        result,
        nowMs
      );

      try {
        await oyunStateIniYaddaSaxla(playerId, kilidliState);
      }
      catch (xeta) {
        kilidliState.xestexana = evvelki.xestexana;
        kilidliState.resources = evvelki.resources;
        kilidliState.army = evvelki.army;
        kilidliState.serverSorquIdempotentliyi = evvelki.serverSorquIdempotentliyi;
        throw xeta;
      }

      gonder(kontekst, resultType, {
        success: true,
        playerId,
        requestId,
        idempotentReplay: false,
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
  xestexanaMesajiniEmalEt
};
