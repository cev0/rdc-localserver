"use strict";

const {
  doyusMelumatiniHazirla,
  doyusaBasla,
  doyusuNeticelendir
} = require("./xerite_dusmen_doyus_sistemi");
const { raportYarat } = require("./doyus_raport_sistemi");
const { hereketMsPerXana } = require("./konvoy_emeliyyat_sistemi");
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

    if (hereketMsPerXana() > 0) {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        message: "Birbaşa world battle start/resolve endpoint-i deaktivdir. convoy_operation_start_request istifadə olunmalıdır."
      });
      return true;
    }

    const evvelkiBattle = JSON.parse(JSON.stringify(state.worldEnemyBattle || {}));
    const evvelkiResources = JSON.parse(JSON.stringify(state.resources || {}));
    const evvelkiRaportlar = JSON.parse(JSON.stringify(state.doyusRaportlari || null));
    const convoyId = metnAl(kontekst.msg && kontekst.msg.convoyId, 64);
    const missionSnapshot =
      evvelkiBattle &&
      evvelkiBattle.activeByConvoy &&
      evvelkiBattle.activeByConvoy[convoyId]
        ? JSON.parse(JSON.stringify(evvelkiBattle.activeByConvoy[convoyId]))
        : null;

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
      state.doyusRaportlari = evvelkiRaportlar;
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        message: result && result.message ? result.message : "Düşmən döyüşü tamamlanmadı.",
        remainingMs: result && result.remainingMs ? result.remainingMs : 0
      });
      return true;
    }

    let report = null;
    if (type === "world_enemy_battle_resolve_request" && missionSnapshot) {
      report = raportYarat(
        state,
        {
          battleId: result.battleId || missionSnapshot.battleId,
          stateId: missionSnapshot.stateId,
          enemyId: result.enemyId || missionSnapshot.enemyId,
          enemyType: result.enemyType || missionSnapshot.enemyType,
          enemyLevel: result.enemyLevel || missionSnapshot.enemyLevel,
          victory: result.victory === true,
          invalidated: result.invalidated === true,
          playerPower: result.playerPower || missionSnapshot.playerPower,
          enemyPower: result.enemyPower || missionSnapshot.enemyPower,
          heroIds: missionSnapshot.heroIds || [],
          sentTroops: missionSnapshot.troopSnapshot || {},
          reward: result.reward || {},
          lootAlreadyApplied: result.victory === true,
          completedAtMs: result.completedAtMs || nowMs
        },
        nowMs
      );
    }

    try {
      await oyunStateIniYaddaSaxla(playerId, state);
    }
    catch (xeta) {
      state.worldEnemyBattle = evvelkiBattle;
      state.resources = evvelkiResources;
      state.doyusRaportlari = evvelkiRaportlar;
      throw xeta;
    }

    gonder(kontekst, resultType, {
      success: true,
      playerId,
      ...result,
      report,
      info: doyusMelumatiniHazirla(state, nowMs),
      payloadJson: JSON.stringify({ ...result, report })
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
