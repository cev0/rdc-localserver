"use strict";

const {
  dovletBazasiniAl,
  dovletBazalariniAl
} = require("./dovlet_baza_kataloqu_postgres");
const {
  PVP_KAMP_STATUSU,
  dovletAktivKonvoylariniAl
} = require("./dovlet_konvoy_runtime_postgres");
const { konvoyMelumatiniHazirla } = require("./konvoy_sistemi");
const { formasiyaMelumatiniHazirla } = require("./konvoy_formasiya_sistemi");
const {
  PVP_BAZA_STATUSLARI,
  pvpYerdeyismeQaydasiniHazirla,
  pvpBazaHedefSnapshotiniHazirla,
  pvpBazaHedefVeziyyetiniYoxla
} = require("./pvp_baza_hedef_qaydasi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const MESAJLAR = new Set([
  "pvp_base_attack_preview_request",
  "pvp_incoming_attacks_request"
]);

function metnAl(v, max = 128) {
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
    commanderName: publicMetnAl(baza && baza.commanderName, 64),
    allianceName: publicMetnAl(baza && baza.allianceName, 80),
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

function cariBazaFallback(state, playerId, stateId) {
  const wp = state && state.worldPlacement;
  if (!wp) return null;

  return {
    playerId: metnAl(playerId, 128),
    stateId,
    x: Number(wp.baseX) || 0,
    z: Number(wp.baseZ) || 0,
    baseX: Number(wp.baseX) || 0,
    baseZ: Number(wp.baseZ) || 0,
    commanderName: publicMetnAl(state && state.oyuncuAdi, 64),
    allianceName: publicMetnAl(state && state.ittifaqAdi, 80)
  };
}

async function autentifikasiyaVeStateHazirla(kontekst, resultType) {
  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      pvpEnabled: false,
      message: "PvP məlumatı üçün autentifikasiya tələb olunur."
    });
    return null;
  }

  if (!oyuncuStateBerpaOlunub(playerId)) {
    await oyunStateIniBerpaEt(kontekst, playerId);
  }

  const state = kontekst.getOrCreatePlayerState(playerId);
  return {
    playerId,
    state,
    stateId: stateIdAl(state)
  };
}

async function incomingHucumlariHazirla(kontekst, hazir) {
  const { playerId, state, stateId } = hazir;
  const nowMs = kontekst.nowMs();

  const [konvoyNeticesi, bazaNeticesi] = await Promise.all([
    dovletAktivKonvoylariniAl(stateId, nowMs),
    dovletBazalariniAl(stateId, nowMs)
  ]);

  const bazalar = Array.isArray(bazaNeticesi && bazaNeticesi.bases)
    ? bazaNeticesi.bases
    : [];
  const bazaMap = new Map(
    bazalar.map(x => [metnAl(x && x.playerId, 128), x])
  );
  const cariBaza = bazaMap.get(playerId) || cariBazaFallback(state, playerId, stateId);
  const items = [];

  for (const raw of Array.isArray(konvoyNeticesi && konvoyNeticesi.items)
    ? konvoyNeticesi.items
    : []) {
    const targetType = metnAl(raw && raw.targetType, 32);
    const targetPlayerId = metnAl(raw && raw.targetPlayerId, 128);
    const status = metnAl(raw && raw.status, 64);

    if (targetType !== "player_base") continue;
    if (targetPlayerId !== playerId) continue;
    if (status === PVP_KAMP_STATUSU || status === "returning" || status === "idle") continue;

    const attackerPlayerId = metnAl(raw && raw.playerId, 128);
    if (!attackerPlayerId || attackerPlayerId === playerId) continue;

    const targetSnapshot = {
      version: 1,
      targetPlayerId: playerId,
      stateId,
      targetX: Number(raw && raw.targetX) || 0,
      targetZ: Number(raw && raw.targetZ) || 0,
      snappedAtMs: tamEded(raw && raw.startedAtMs),
      coordinatesLocked: true
    };
    const targetState = pvpBazaHedefVeziyyetiniYoxla(targetSnapshot, cariBaza);
    const attackerBase = bazaMap.get(attackerPlayerId) || null;
    const arrivalAtMs = tamEded(raw && raw.arrivalAtMs);
    const remainingMs = arrivalAtMs > 0
      ? Math.max(0, arrivalAtMs - nowMs)
      : 0;

    items.push({
      attackId: publicMetnAl(raw && raw.publicId, 220),
      attackerPlayerId,
      attackerCommanderName: publicMetnAl(attackerBase && attackerBase.commanderName, 64),
      attackerAllianceName: publicMetnAl(attackerBase && attackerBase.allianceName, 80),
      attackerPublicPower: Number.isFinite(Number(attackerBase && attackerBase.publicPower))
        ? Math.max(0, Math.trunc(Number(attackerBase.publicPower)))
        : null,
      convoyId: metnAl(raw && raw.convoyId, 64),
      stateId,
      status,
      startedAtMs: tamEded(raw && raw.startedAtMs),
      arrivalAtMs,
      remainingMs,
      lockedTargetX: targetSnapshot.targetX,
      lockedTargetZ: targetSnapshot.targetZ,
      currentBaseX: cariBaza ? Number(cariBaza.x != null ? cariBaza.x : cariBaza.baseX) || 0 : 0,
      currentBaseZ: cariBaza ? Number(cariBaza.z != null ? cariBaza.z : cariBaza.baseZ) || 0 : 0,
      targetStillAtLockedCoordinates: targetState.targetStillPresent === true,
      defenderAlreadyEscaped: targetState.defenderEscapedByRelocation === true,
      relocationEscapeAvailable: targetState.targetStillPresent === true && remainingMs > 0,
      expectedArrivalOutcome: targetState.campRequired === true
        ? PVP_KAMP_STATUSU
        : PVP_BAZA_STATUSLARI.DOYUSE_HAZIR,
      followsRelocatedBase: false
    });
  }

  items.sort((a, b) => a.arrivalAtMs - b.arrivalAtMs);

  const info = {
    version: 1,
    pvpEnabled: false,
    stateId,
    incomingCount: items.length,
    relocationRule: pvpYerdeyismeQaydasiniHazirla(),
    items
  };

  gonder(kontekst, "pvp_incoming_attacks_result", {
    success: true,
    playerId,
    pvpEnabled: false,
    info,
    payloadJson: JSON.stringify(info)
  });

  return true;
}

async function hucumPreviewHazirla(kontekst, hazir) {
  const { playerId, state, stateId } = hazir;
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
    version: 3,
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

  return true;
}

async function pvpBazaPreviewMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!MESAJLAR.has(type)) return false;

  const resultType = type === "pvp_incoming_attacks_request"
    ? "pvp_incoming_attacks_result"
    : "pvp_base_attack_preview_result";

  try {
    const hazir = await autentifikasiyaVeStateHazirla(kontekst, resultType);
    if (!hazir) return true;

    if (type === "pvp_incoming_attacks_request") {
      return await incomingHucumlariHazirla(kontekst, hazir);
    }

    return await hucumPreviewHazirla(kontekst, hazir);
  }
  catch (xeta) {
    console.error("[PVP_BAZA_PREVIEW]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId: metnAl(
        kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
        128
      ),
      pvpEnabled: false,
      canAttack: false,
      message: type === "pvp_incoming_attacks_request"
        ? "Gələn PvP hücumları alına bilmədi."
        : "PvP baza preview hazırlana bilmədi."
    });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  pvpBazaPreviewMesajiniEmalEt
};
