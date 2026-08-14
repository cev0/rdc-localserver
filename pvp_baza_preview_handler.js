"use strict";

const { dovletBazasiniAl } = require("./dovlet_baza_kataloqu_postgres");
const { konvoyMelumatiniHazirla } = require("./konvoy_sistemi");
const { formasiyaMelumatiniHazirla } = require("./konvoy_formasiya_sistemi");
const {
  pvpYerdeyismeQaydasiniHazirla,
  pvpBazaHedefSnapshotiniHazirla
} = require("./pvp_baza_hedef_qaydasi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
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

function konvoyMesguldur(state, convoyId) {
  const id = metnAl(convoyId, 64);
  if (!id) return false;

  const aktiv = state &&
    state.konvoyEmeliyyatlari &&
    state.konvoyEmeliyyatlari.activeByConvoy;

  if (aktiv && aktiv[id]) return true;

  const gather = state &&
    state.xeriteToplama &&
    state.xeriteToplama.activeByConvoy;

  if (gather && gather[id]) return true;

  const battle = state &&
    state.worldEnemyBattle &&
    state.worldEnemyBattle.activeByConvoy;

  return !!(battle && battle[id]);
}

function qosunSayiniAl(formasiyaItem) {
  let say = 0;
  for (const sira of Array.isArray(formasiyaItem && formasiyaItem.siralar)
    ? formasiyaItem.siralar
    : []) {
    say += tamEded(sira && sira.count);
  }
  return say;
}

function konvoyPreviewlariniHazirla(state) {
  const konvoyInfo = konvoyMelumatiniHazirla(state);
  const formasiyaInfo = formasiyaMelumatiniHazirla(state);
  const formasiyaMap = new Map(
    (formasiyaInfo.items || []).map(item => [metnAl(item && item.konvoyId, 64), item])
  );

  return (konvoyInfo.items || []).map(item => {
    const convoyId = metnAl(item && item.konvoyId, 64);
    const formasiya = formasiyaMap.get(convoyId) || null;
    const troopCount = qosunSayiniAl(formasiya);
    const heroCount = Array.isArray(item && item.qehremanIdleri)
      ? item.qehremanIdleri.length
      : 0;
    const busy = konvoyMesguldur(state, convoyId);
    const open = item && item.aciqdir === true;

    let readinessReason = "ready_for_future_pvp";
    if (!open) readinessReason = "convoy_locked";
    else if (busy) readinessReason = "convoy_busy";
    else if (troopCount <= 0) readinessReason = "convoy_has_no_troops";

    return {
      convoyId,
      open,
      busy,
      troopCount,
      heroCount,
      rows: formasiya && Array.isArray(formasiya.siralar)
        ? formasiya.siralar.map(x => ({
            siraId: metnAl(x && x.siraId, 32),
            unitId: metnAl(x && x.unitId, 128),
            count: tamEded(x && x.count)
          }))
        : [],
      readyForFuturePvp: open && !busy && troopCount > 0,
      readinessReason
    };
  });
}

function targetPreviewHazirla(baza, requesterId) {
  const targetPlayerId = metnAl(baza && baza.playerId, 128);
  const isSelf = targetPlayerId === metnAl(requesterId, 128);

  return {
    playerId: targetPlayerId,
    stateId: Math.max(1, tamEded(baza && baza.stateId) || 1),
    x: Number(baza && baza.x) || 0,
    z: Number(baza && baza.z) || 0,
    zoneId: metnAl(baza && baza.zoneId, 64),
    hqLevel: tamEded(baza && baza.hqLevel),
    completedBuildingCount: tamEded(baza && baza.completedBuildingCount),
    publicPower: Number.isFinite(Number(baza && baza.publicPower))
      ? Math.max(0, Math.trunc(Number(baza.publicPower)))
      : null,
    isSelf
  };
}

async function pvpBazaPreviewMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (type !== "pvp_base_attack_preview_request") return false;

  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    gonder(kontekst, "pvp_base_attack_preview_result", {
      success: false,
      pvpEnabled: false,
      canAttack: false,
      message: "PvP preview üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);
    const stateId = stateIdAl(state);
    const targetPlayerId = metnAl(
      kontekst && kontekst.msg && kontekst.msg.targetPlayerId,
      128
    );
    const selectedConvoyId = metnAl(
      kontekst && kontekst.msg && kontekst.msg.convoyId,
      64
    );

    if (!targetPlayerId) {
      gonder(kontekst, "pvp_base_attack_preview_result", {
        success: false,
        playerId,
        pvpEnabled: false,
        canAttack: false,
        message: "targetPlayerId tələb olunur."
      });
      return true;
    }

    const baza = await dovletBazasiniAl(
      stateId,
      targetPlayerId,
      kontekst.nowMs()
    );

    if (!baza) {
      gonder(kontekst, "pvp_base_attack_preview_result", {
        success: false,
        playerId,
        targetPlayerId,
        pvpEnabled: false,
        canAttack: false,
        message: "Hədəf baza cari Dövlətdə tapılmadı."
      });
      return true;
    }

    const target = targetPreviewHazirla(baza, playerId);
    const targetSnapshotNeticesi = pvpBazaHedefSnapshotiniHazirla(
      baza,
      kontekst.nowMs()
    );
    const convoys = konvoyPreviewlariniHazirla(state);
    const selectedConvoy = selectedConvoyId
      ? convoys.find(x => x.convoyId === selectedConvoyId) || null
      : null;

    const blockers = [];

    if (target.isSelf) {
      blockers.push({ code: "self_base", message: "Öz bazana hücum etmək olmaz." });
    }

    if (selectedConvoyId && !selectedConvoy) {
      blockers.push({ code: "convoy_not_found", message: "Seçilmiş konvoy tapılmadı." });
    }
    else if (selectedConvoy) {
      if (!selectedConvoy.open) {
        blockers.push({ code: "convoy_locked", message: "Seçilmiş konvoy açıq deyil." });
      }
      if (selectedConvoy.busy) {
        blockers.push({ code: "convoy_busy", message: "Seçilmiş konvoy hazırda məşğuldur." });
      }
      if (selectedConvoy.troopCount <= 0) {
        blockers.push({ code: "convoy_has_no_troops", message: "Seçilmiş konvoyda əsgər yoxdur." });
      }
    }

    blockers.push({
      code: "pvp_not_enabled",
      message: "PvP döyüş resolveri hələ aktiv deyil."
    });

    const preview = {
      version: 2,
      pvpEnabled: false,
      canAttack: false,
      target,
      targetSnapshotPreview: targetSnapshotNeticesi.success === true
        ? targetSnapshotNeticesi.snapshot
        : null,
      relocationRule: pvpYerdeyismeQaydasiniHazirla(),
      selectedConvoyId,
      selectedConvoy,
      convoys,
      blockers,
      hiddenByDesign: [
        "exactResources",
        "exactTroops",
        "hospitalState",
        "heroRoster",
        "accountData"
      ]
    };

    gonder(kontekst, "pvp_base_attack_preview_result", {
      success: true,
      playerId,
      targetPlayerId,
      pvpEnabled: false,
      canAttack: false,
      preview,
      payloadJson: JSON.stringify(preview)
    });
  }
  catch (xeta) {
    console.error("[PVP_BAZA_PREVIEW]", xeta);
    gonder(kontekst, "pvp_base_attack_preview_result", {
      success: false,
      playerId,
      pvpEnabled: false,
      canAttack: false,
      message: "PvP baza preview hazırlana bilmədi."
    });
  }

  return true;
}

module.exports = {
  pvpBazaPreviewMesajiniEmalEt
};
