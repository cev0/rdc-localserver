"use strict";

const {
  doyusMelumatiniHazirla,
  doyusaBasla,
  doyusuNeticelendir
} = require("./xerite_dusmen_doyus_sistemi");
const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
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

    const evvelkiBattle = JSON.parse(JSON.stringify(state.worldEnemyBattle || {}));
    const evvelkiResources = JSON.parse(JSON.stringify(state.resources || {}));
    const convoyId = metnAl(kontekst.msg && kontekst.msg.convoyId, 64);

    let result;
    if (type === "world_enemy_battle_start_request") {
      result = doyusaBasla(
        state,
        playerId,
        convoyId,
        metnAl(kontekst.msg && kontekst.msg.enemyId, 128),
        nowMs
      );
    }
    else {
      result = await doyusuNeticelendir(
        state,
        playerId,
        convoyId,
        nowMs
      );
    }

    if (!result || result.success !== true) {
      state.worldEnemyBattle = evvelkiBattle;
      state.resources = evvelkiResources;
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        message: result && result.message ? result.message : "Düşmən döyüşü tamamlanmadı.",
        remainingMs: result && result.remainingMs ? result.remainingMs : 0
      });
      return true;
    }

    try {
      await oyunStateIniYaddaSaxla(playerId, state);
    }
    catch (xeta) {
      state.worldEnemyBattle = evvelkiBattle;
      state.resources = evvelkiResources;
      throw xeta;
    }

    gonder(kontekst, resultType, {
      success: true,
      playerId,
      ...result,
      info: doyusMelumatiniHazirla(state, nowMs),
      payloadJson: JSON.stringify(result)
    });
  }
  catch (xeta) {
    console.error("[WORLD_ENEMY_BATTLE]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Düşmən döyüşü əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  xeriteDusmenDoyusMesajiniEmalEt
};
