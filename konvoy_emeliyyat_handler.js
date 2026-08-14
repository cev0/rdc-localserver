"use strict";

const {
  emeliyyatiBaslat,
  emeliyyatlariYenile,
  emeliyyatMelumatiniHazirla
} = require("./konvoy_emeliyyat_sistemi");
const {
  oyuncuKonvoylariniSinxronEt
} = require("./dovlet_konvoy_runtime_postgres");
const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const MESAJLAR = new Set([
  "convoy_operation_info_request",
  "convoy_operation_start_request"
]);

function metnAl(v, max = 220) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function gonder(k, type, data) {
  k.send(k.ws, {
    type,
    ...data,
    serverTimeUnixMs: k.nowMs()
  });
}

function dovletIdAl(state) {
  return Math.max(
    1,
    Math.trunc(Number(state && state.worldPlacement && state.worldPlacement.stateId) || 1)
  );
}

async function sharedKonvoylariSinxronEtTehlukesiz(state, playerId, nowMs) {
  try {
    const active = state && state.konvoyEmeliyyatlari && state.konvoyEmeliyyatlari.activeByConvoy;
    await oyuncuKonvoylariniSinxronEt(
      dovletIdAl(state),
      playerId,
      active && typeof active === "object" ? active : {},
      nowMs
    );
    return true;
  }
  catch (xeta) {
    console.error("[KONVOY_SHARED_RUNTIME_SYNC]", xeta);
    return false;
  }
}

function stateRollbackEt(state, evvelki) {
  state.konvoyEmeliyyatlari = evvelki.konvoyEmeliyyatlari;
  state.xeriteToplama = evvelki.xeriteToplama;
  state.worldEnemyBattle = evvelki.worldEnemyBattle;
  state.doyusRaportlari = evvelki.doyusRaportlari;
  state.resources = evvelki.resources;
  state.army = evvelki.army;
  state.konvoylar = evvelki.konvoylar;
  state.xestexana = evvelki.xestexana;
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

    const state = kontekst.getOrCreatePlayerState(playerId);
    const nowMs = kontekst.nowMs();
    const evvelki = JSON.parse(JSON.stringify({
      konvoyEmeliyyatlari: state.konvoyEmeliyyatlari || null,
      xeriteToplama: state.xeriteToplama || null,
      worldEnemyBattle: state.worldEnemyBattle || null,
      doyusRaportlari: state.doyusRaportlari || null,
      resources: state.resources || null,
      army: state.army || null,
      konvoylar: state.konvoylar || null,
      xestexana: state.xestexana || null
    }));

    const yenileme = await emeliyyatlariYenile(state, playerId, nowMs);

    if (type === "convoy_operation_info_request") {
      if (yenileme.changed) {
        try {
          await oyunStateIniYaddaSaxla(playerId, state);
        }
        catch (xeta) {
          stateRollbackEt(state, evvelki);
          throw xeta;
        }
      }

      await sharedKonvoylariSinxronEtTehlukesiz(state, playerId, nowMs);

      const info = emeliyyatMelumatiniHazirla(state, nowMs);
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info)
      });
      return true;
    }

    const result = emeliyyatiBaslat(
      state,
      playerId,
      metnAl(kontekst.msg && kontekst.msg.convoyId, 64),
      metnAl(kontekst.msg && kontekst.msg.targetType, 32),
      metnAl(kontekst.msg && kontekst.msg.targetId, 128),
      nowMs
    );

    if (!result || result.success !== true) {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        message: result && result.message ? result.message : "Konvoy əməliyyatı başlaya bilmədi.",
        movementConfigured: result && result.movementConfigured === false ? false : undefined,
        info: emeliyyatMelumatiniHazirla(state, nowMs)
      });
      return true;
    }

    try {
      await oyunStateIniYaddaSaxla(playerId, state);
    }
    catch (xeta) {
      stateRollbackEt(state, evvelki);
      throw xeta;
    }

    await sharedKonvoylariSinxronEtTehlukesiz(state, playerId, nowMs);

    const info = emeliyyatMelumatiniHazirla(state, nowMs);
    gonder(kontekst, resultType, {
      success: true,
      playerId,
      operation: result.operation,
      info,
      payloadJson: JSON.stringify({ operation: result.operation, info })
    });
  }
  catch (xeta) {
    console.error("[KONVOY_EMELIYYAT]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Konvoy əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  konvoyEmeliyyatMesajiniEmalEt
};
