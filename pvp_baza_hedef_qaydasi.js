"use strict";

const PVP_BAZA_STATUSLARI = Object.freeze({
  YOLDA: "marching_to_player_base",
  DOYUSE_HAZIR: "ready_for_pvp_battle",
  TERK_EDILMIS_HEDEFDE_KAMP: "camping_at_abandoned_target",
  GERI: "returning",
  BOS: "idle"
});

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function reqemAl(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pvpYerdeyismeQaydasiniHazirla() {
  return {
    version: 1,
    targetCoordinatesLockedAtAttackStart: true,
    followsRelocatedBase: false,
    defenderCanEscapeByBaseRelocation: true,
    relocatedTargetOutcome: PVP_BAZA_STATUSLARI.TERK_EDILMIS_HEDEFDE_KAMP,
    campUsesOriginalTargetCoordinates: true,
    campDurationConfigured: false,
    campReturnRuleConfigured: false
  };
}

function pvpBazaHedefSnapshotiniHazirla(baza, nowMs = Date.now()) {
  if (!baza || typeof baza !== "object") {
    return { success: false, message: "PvP hədəf bazası yoxdur." };
  }

  const targetPlayerId = metnAl(baza.playerId, 128);
  const stateId = Math.max(1, tamEded(baza.stateId) || 1);
  const targetX = reqemAl(baza.x != null ? baza.x : baza.baseX);
  const targetZ = reqemAl(baza.z != null ? baza.z : baza.baseZ);

  if (!targetPlayerId || targetX === null || targetZ === null) {
    return { success: false, message: "PvP hədəf bazasının koordinatları tam deyil." };
  }

  return {
    success: true,
    snapshot: {
      version: 1,
      targetPlayerId,
      stateId,
      targetX,
      targetZ,
      targetHqLevel: tamEded(baza.hqLevel),
      snappedAtMs: tamEded(nowMs) || Date.now(),
      coordinatesLocked: true
    }
  };
}

function pvpBazaHedefVeziyyetiniYoxla(targetSnapshot, cariBaza) {
  const snapshot = targetSnapshot && typeof targetSnapshot === "object"
    ? targetSnapshot
    : null;

  if (!snapshot) {
    return {
      success: false,
      message: "PvP hədəf snapshot-u yoxdur."
    };
  }

  const snapshotPlayerId = metnAl(snapshot.targetPlayerId, 128);
  const snapshotStateId = Math.max(1, tamEded(snapshot.stateId) || 1);
  const snapshotX = reqemAl(snapshot.targetX);
  const snapshotZ = reqemAl(snapshot.targetZ);

  const currentPlayerId = metnAl(cariBaza && cariBaza.playerId, 128);
  const currentStateId = Math.max(1, tamEded(cariBaza && cariBaza.stateId) || 1);
  const currentX = reqemAl(cariBaza && (cariBaza.x != null ? cariBaza.x : cariBaza.baseX));
  const currentZ = reqemAl(cariBaza && (cariBaza.z != null ? cariBaza.z : cariBaza.baseZ));

  const samePlayer = !!snapshotPlayerId && snapshotPlayerId === currentPlayerId;
  const sameState = samePlayer && snapshotStateId === currentStateId;
  const sameCoordinates =
    sameState &&
    snapshotX !== null &&
    snapshotZ !== null &&
    currentX !== null &&
    currentZ !== null &&
    snapshotX === currentX &&
    snapshotZ === currentZ;

  if (sameCoordinates) {
    return {
      success: true,
      targetStillPresent: true,
      defenderEscapedByRelocation: false,
      nextStatus: PVP_BAZA_STATUSLARI.DOYUSE_HAZIR,
      battleAllowed: true,
      campRequired: false,
      targetX: snapshotX,
      targetZ: snapshotZ
    };
  }

  return {
    success: true,
    targetStillPresent: false,
    defenderEscapedByRelocation: true,
    nextStatus: PVP_BAZA_STATUSLARI.TERK_EDILMIS_HEDEFDE_KAMP,
    battleAllowed: false,
    campRequired: true,
    campX: snapshotX,
    campZ: snapshotZ,
    reason: cariBaza ? "target_relocated" : "target_base_not_present",
    followsRelocatedBase: false
  };
}

module.exports = {
  PVP_BAZA_STATUSLARI,
  pvpYerdeyismeQaydasiniHazirla,
  pvpBazaHedefSnapshotiniHazirla,
  pvpBazaHedefVeziyyetiniYoxla
};
