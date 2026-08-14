"use strict";

const {
  dusmenSiyahisiniAl,
  dusmenMelumatiniAl
} = require("./xerite_dusmen_sistemi");
const { dusmenMovqeyiAl } = require("./xerite_movqe_sistemi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const MESAJLAR = new Set([
  "world_enemy_info_request",
  "world_enemy_detail_request"
]);

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

  const resultType = type.replace(/_request$/, "_result");
  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    gonder(kontekst, resultType, {
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
    const nowMs = kontekst.nowMs();

    if (type === "world_enemy_detail_request") {
      const enemyId = metnAl(kontekst.msg && kontekst.msg.enemyId, 128);
      const enemy = await dusmenMelumatiniAl(stateId, enemyId, nowMs);

      if (!enemy) {
        gonder(kontekst, resultType, {
          success: false,
          playerId,
          message: "Düşmən tapılmadı."
        });
        return true;
      }

      const movqe = dusmenMovqeyiAl(stateId, enemy.index) || {};
      const info = {
        ...enemy,
        x: Number(movqe.x) || 0,
        z: Number(movqe.z) || 0,
        zoneId: movqe.zoneId || enemy.zoneId,
        recommendedPower: Math.max(0, Math.trunc(Number(enemy.power) || 0)),
        possibleReward: enemy.reward ? { ...enemy.reward } : {},
        attackable: enemy.available === true,
        respawnRemainingMs: enemy.available === true
          ? 0
          : Math.max(0, Number(enemy.respawnAtMs || 0) - nowMs)
      };

      gonder(kontekst, resultType, {
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info)
      });
      return true;
    }

    const info = await dusmenSiyahisiniAl(stateId, nowMs);
    gonder(kontekst, resultType, {
      success: true,
      playerId,
      info,
      payloadJson: JSON.stringify(info)
    });
  }
  catch (xeta) {
    console.error("[WORLD_ENEMY]", xeta);
    gonder(kontekst, resultType, {
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
