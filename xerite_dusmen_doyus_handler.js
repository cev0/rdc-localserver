"use strict";

const { doyusMelumatiniHazirla } = require("./xerite_dusmen_doyus_sistemi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const MESAJLAR = new Set([
  "world_enemy_battle_info_request",
  "world_enemy_battle_start_request",
  "world_enemy_battle_resolve_request"
]);

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function gonder(kontekst, type, data) {
  kontekst.send(kontekst.ws, {
    type,
    ...data,
    serverTimeUnixMs: kontekst.nowMs()
  });
}

async function xeriteDusmenDoyusMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!MESAJLAR.has(type)) return false;

  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );
  const resultType = type.replace(/_request$/, "_result");

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      message: "Düşmən döyüşü üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);
    const nowMs = kontekst.nowMs();

    if (type === "world_enemy_battle_info_request") {
      const info = doyusMelumatiniHazirla(state, nowMs);
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info)
      });
      return true;
    }

    gonder(kontekst, resultType, {
      success: false,
      playerId,
      legacyEndpointDisabled: true,
      requiredEndpoint: "convoy_operation_start_request",
      message: "Birbaşa world battle start/resolve deaktivdir. Döyüş yalnız server-authoritative konvoy əməliyyatı ilə başladılmalıdır."
    });
    return true;
  }
  catch (xeta) {
    console.error("[WORLD_ENEMY_BATTLE]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Düşmən döyüşü məlumatı alına bilmədi."
    });
    return true;
  }
}

module.exports = {
  MESAJLAR,
  xeriteDusmenDoyusMesajiniEmalEt
};
