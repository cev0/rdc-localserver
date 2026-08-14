"use strict";

const {
  PVP_KAMP_STATUSU,
  dovletAktivKonvoylariniAl
} = require("./dovlet_konvoy_runtime_postgres");
const {
  dovletBazalariniAl
} = require("./dovlet_baza_kataloqu_postgres");
const {
  pvpYerdeyismeQaydasiniHazirla
} = require("./pvp_baza_hedef_qaydasi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

function metnAl(v, max = 220) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function publicMetnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function gonder(k, type, data) {
  k.send(k.ws, {
    type,
    ...data,
    serverTimeUnixMs: k.nowMs()
  });
}

function stateIdAl(state) {
  return Math.max(
    1,
    tamEded(state && state.worldPlacement && state.worldPlacement.stateId) || 1
  );
}

async function pvpKampMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (type !== "pvp_camp_detail_request") return false;

  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    gonder(kontekst, "pvp_camp_detail_result", {
      success: false,
      pvpEnabled: false,
      message: "PvP kamp məlumatı üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);
    const stateId = stateIdAl(state);
    const campId = metnAl(kontekst && kontekst.msg && kontekst.msg.campId, 220);

    if (!campId) {
      gonder(kontekst, "pvp_camp_detail_result", {
        success: false,
        playerId,
        pvpEnabled: false,
        message: "campId tələb olunur."
      });
      return true;
    }

    const nowMs = kontekst.nowMs();
    const [konvoyNeticesi, bazaNeticesi] = await Promise.all([
      dovletAktivKonvoylariniAl(stateId, nowMs),
      dovletBazalariniAl(stateId, nowMs)
    ]);

    const camp = (konvoyNeticesi.items || []).find(item =>
      item &&
      metnAl(item.publicId, 220) === campId &&
      metnAl(item.status, 64) === PVP_KAMP_STATUSU
    ) || null;

    if (!camp) {
      gonder(kontekst, "pvp_camp_detail_result", {
        success: false,
        playerId,
        campId,
        pvpEnabled: false,
        message: "PvP kampı cari Dövlətdə tapılmadı."
      });
      return true;
    }

    const bazalar = Array.isArray(bazaNeticesi && bazaNeticesi.bases)
      ? bazaNeticesi.bases
      : [];
    const ownerPlayerId = metnAl(camp.playerId, 128);
    const targetPlayerId = metnAl(camp.targetPlayerId, 128);
    const ownerBase = bazalar.find(x => metnAl(x && x.playerId, 128) === ownerPlayerId) || null;
    const targetBase = bazalar.find(x => metnAl(x && x.playerId, 128) === targetPlayerId) || null;

    const detail = {
      version: 1,
      objectType: "pvp_camp",
      campId,
      stateId,
      ownerPlayerId,
      ownerCommanderName: publicMetnAl(ownerBase && ownerBase.commanderName, 64),
      ownerAllianceName: publicMetnAl(ownerBase && ownerBase.allianceName, 80),
      ownerPublicPower: Number.isFinite(Number(ownerBase && ownerBase.publicPower))
        ? Math.max(0, Math.trunc(Number(ownerBase.publicPower)))
        : null,
      convoyId: metnAl(camp.convoyId, 64),
      targetPlayerId,
      targetCommanderName: publicMetnAl(targetBase && targetBase.commanderName, 64),
      x: Number(camp.x) || Number(camp.targetX) || 0,
      z: Number(camp.z) || Number(camp.targetZ) || 0,
      originalTargetX: Number(camp.targetX) || 0,
      originalTargetZ: Number(camp.targetZ) || 0,
      reason: metnAl(camp.campReason, 64) || "target_relocated",
      status: PVP_KAMP_STATUSU,
      createdFromRelocationEscape: true,
      isOwnCamp: ownerPlayerId === playerId,
      isCampForMyOldBase: targetPlayerId === playerId,
      campDurationConfigured: false,
      campReturnRuleConfigured: false,
      relocationRule: pvpYerdeyismeQaydasiniHazirla(),
      hiddenByDesign: [
        "exactTroops",
        "heroRoster",
        "attackerResources",
        "accountData"
      ]
    };

    gonder(kontekst, "pvp_camp_detail_result", {
      success: true,
      playerId,
      campId,
      pvpEnabled: false,
      detail,
      payloadJson: JSON.stringify(detail)
    });
  }
  catch (xeta) {
    console.error("[PVP_KAMP]", xeta);
    gonder(kontekst, "pvp_camp_detail_result", {
      success: false,
      playerId,
      pvpEnabled: false,
      message: "PvP kamp məlumatı alına bilmədi."
    });
  }

  return true;
}

module.exports = {
  pvpKampMesajiniEmalEt
};
