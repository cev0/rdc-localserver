"use strict";

const { dusmenSiyahisiniAl } = require("./xerite_dusmen_sistemi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const MESAJLAR = new Set(["world_enemy_info_request"]);

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function gonder(kontekst, type, melumat) {
  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: kontekst.nowMs()
  });
}

async function xeriteDusmenMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!MESAJLAR.has(type)) return false;

  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    gonder(kontekst, "world_enemy_info_result", {
      success: false,
      message: "Düşmən xəritəsi üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);
    const stateId = Math.max(
      1,
      Math.trunc(Number(state && state.worldPlacement && state.worldPlacement.stateId) || 1)
    );
    const info = await dusmenSiyahisiniAl(stateId, kontekst.nowMs());

    gonder(kontekst, "world_enemy_info_result", {
      success: true,
      playerId,
      info,
      payloadJson: JSON.stringify(info)
    });
  }
  catch (xeta) {
    console.error("[WORLD_ENEMY]", xeta);
    gonder(kontekst, "world_enemy_info_result", {
      success: false,
      playerId,
      message: "Düşmən xəritəsi məlumatı alınmadı."
    });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  xeriteDusmenMesajiniEmalEt
};
