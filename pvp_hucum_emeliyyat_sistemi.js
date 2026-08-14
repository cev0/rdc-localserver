"use strict";

const {
  hereketMuddetiniHesabla
} = require("./konvoy_emeliyyat_sistemi");
const {
  PVP_BAZA_STATUSLARI,
  pvpBazaHedefSnapshotiniHazirla,
  pvpBazaHedefVeziyyetiniYoxla
} = require("./pvp_baza_hedef_qaydasi");
const {
  pvpHucumcuSnapshotiniHazirla
} = require("./pvp_doyus_snapshot_sistemi");

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : "";
}

function musbetTamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say)
    ? Math.max(0, Math.trunc(say))
    : 0;
}

function reqemAl(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say) ? say : null;
}

function kopyala(deyer) {
  return deyer == null
    ? null
    : JSON.parse(JSON.stringify(deyer));
}

function dovletIdAl(state) {
  return Math.max(
    1,
    musbetTamEded(
      state && state.worldPlacement && state.worldPlacement.stateId
    ) || 1
  );
}

function bazaMovqeyiniAl(state) {
  const worldPlacement = state && state.worldPlacement;
  if (!worldPlacement || typeof worldPlacement !== "object") {
    return null;
  }

  const x = reqemAl(worldPlacement.baseX);
  const z = reqemAl(worldPlacement.baseZ);

  if (x === null || z === null) {
    return null;
  }

  return { x, z };
}

function hedefBazaPlayerIdAl(baza) {
  return metnAl(baza && baza.playerId, 128);
}

function hedefBazaDovletIdAl(baza) {
  return Math.max(
    1,
    musbetTamEded(baza && baza.stateId) || 1
  );
}

function pvpHucumEmeliyyatQaydasiniHazirla() {
  return {
    version: 1,
    endpointEnabled: false,
    combatResolverEnabled: false,
    targetType: "player_base",
    targetCoordinatesLockedAtAttackStart: true,
    attackerCombatSnapshotLockedAtAttackStart: true,
    defenderCombatSnapshotLockedAtArrival: true,
    followsRelocatedBase: false,
    relocatedTargetOutcome: PVP_BAZA_STATUSLARI.TERK_EDILMIS_HEDEFDE_KAMP,
    presentTargetOutcome: PVP_BAZA_STATUSLARI.DOYUSE_HAZIR
  };
}

function pvpHucumEmeliyyatiniHazirla(
  state,
  playerId,
  convoyId,
  hedefBaza,
  nowMs = Date.now()
) {
  if (!state || typeof state !== "object") {
    return {
      success: false,
      message: "PvP hücum əməliyyatı üçün oyunçu state-i yoxdur."
    };
  }

  const hucumcuPlayerId = metnAl(playerId || state.playerId, 128);
  const konvoyId = metnAl(convoyId, 64);
  const hedefPlayerId = hedefBazaPlayerIdAl(hedefBaza);

  if (!hucumcuPlayerId) {
    return {
      success: false,
      message: "PvP hücum əməliyyatı üçün hücumçu playerId yoxdur."
    };
  }

  if (!konvoyId) {
    return {
      success: false,
      message: "PvP hücum əməliyyatı üçün konvoy ID yoxdur."
    };
  }

  if (!hedefPlayerId) {
    return {
      success: false,
      message: "PvP hücum əməliyyatı üçün hədəf baza yoxdur."
    };
  }

  if (hucumcuPlayerId === hedefPlayerId) {
    return {
      success: false,
      message: "Oyunçu öz bazasına PvP hücumu başlada bilməz."
    };
  }

  const hucumcuStateId = dovletIdAl(state);
  const hedefStateId = hedefBazaDovletIdAl(hedefBaza);

  if (hucumcuStateId !== hedefStateId) {
    return {
      success: false,
      message: "PvP hücumu yalnız eyni Dövlət daxilində başlada bilər."
    };
  }

  const bazaMovqeyi = bazaMovqeyiniAl(state);
  if (!bazaMovqeyi) {
    return {
      success: false,
      message: "Hücumçu bazasının koordinatları yoxdur."
    };
  }

  const hedefSnapshotNeticesi = pvpBazaHedefSnapshotiniHazirla(
    hedefBaza,
    nowMs
  );

  if (!hedefSnapshotNeticesi.success) {
    return hedefSnapshotNeticesi;
  }

  const hucumcuSnapshotNeticesi = pvpHucumcuSnapshotiniHazirla(
    state,
    konvoyId,
    nowMs
  );

  if (!hucumcuSnapshotNeticesi.success) {
    return hucumcuSnapshotNeticesi;
  }

  const hedefSnapshot = hedefSnapshotNeticesi.snapshot;
  const baslamaMs = musbetTamEded(nowMs) || Date.now();
  const hereketMuddetiMs = hereketMuddetiniHesabla(
    bazaMovqeyi.x,
    bazaMovqeyi.z,
    hedefSnapshot.targetX,
    hedefSnapshot.targetZ
  );
  const catmaMs = baslamaMs + hereketMuddetiMs;

  const operation = {
    version: 1,
    operationId: `pvp:${hucumcuPlayerId}:${konvoyId}:${baslamaMs}`,
    playerId: hucumcuPlayerId,
    convoyId: konvoyId,
    targetType: "player_base",
    targetId: hedefPlayerId,
    targetPlayerId: hedefPlayerId,
    stateId: hucumcuStateId,
    fromX: bazaMovqeyi.x,
    fromZ: bazaMovqeyi.z,
    targetX: hedefSnapshot.targetX,
    targetZ: hedefSnapshot.targetZ,
    targetSnapshot: kopyala(hedefSnapshot),
    attackerCombatSnapshot: kopyala(hucumcuSnapshotNeticesi.snapshot),
    startedAtMs: baslamaMs,
    arrivalAtMs: catmaMs,
    travelDurationMs: hereketMuddetiMs,
    status: PVP_BAZA_STATUSLARI.YOLDA,
    battleAllowed: false,
    battleResolved: false,
    abandonedTarget: false,
    campReason: "",
    returnStartedAtMs: 0,
    returnEndsAtMs: 0,
    result: null
  };

  return {
    success: true,
    operation,
    rule: pvpHucumEmeliyyatQaydasiniHazirla()
  };
}

function pvpHucumCatmaVeziyyetiniHazirla(
  operation,
  cariHedefBaza,
  nowMs = Date.now()
) {
  if (!operation || typeof operation !== "object") {
    return {
      success: false,
      message: "PvP hücum əməliyyatı yoxdur."
    };
  }

  if (metnAl(operation.targetType, 32) !== "player_base") {
    return {
      success: false,
      message: "Əməliyyat PvP oyunçu bazası hücumu deyil."
    };
  }

  const targetSnapshot = operation.targetSnapshot;
  if (!targetSnapshot || typeof targetSnapshot !== "object") {
    return {
      success: false,
      message: "PvP əməliyyatında kilidlənmiş hədəf snapshot-u yoxdur."
    };
  }

  const indi = musbetTamEded(nowMs) || Date.now();
  const arrivalAtMs = musbetTamEded(operation.arrivalAtMs);

  if (arrivalAtMs <= 0) {
    return {
      success: false,
      message: "PvP əməliyyatının çatma vaxtı yoxdur."
    };
  }

  if (indi < arrivalAtMs) {
    return {
      success: true,
      arrived: false,
      remainingMs: Math.max(0, arrivalAtMs - indi),
      nextStatus: PVP_BAZA_STATUSLARI.YOLDA,
      battleAllowed: false,
      campRequired: false,
      targetStillPresent: null
    };
  }

  const hedefVeziyyeti = pvpBazaHedefVeziyyetiniYoxla(
    targetSnapshot,
    cariHedefBaza
  );

  if (!hedefVeziyyeti.success) {
    return hedefVeziyyeti;
  }

  if (hedefVeziyyeti.campRequired === true) {
    return {
      success: true,
      arrived: true,
      remainingMs: 0,
      nextStatus: PVP_BAZA_STATUSLARI.TERK_EDILMIS_HEDEFDE_KAMP,
      battleAllowed: false,
      campRequired: true,
      targetStillPresent: false,
      defenderEscapedByRelocation: true,
      campX: hedefVeziyyeti.campX,
      campZ: hedefVeziyyeti.campZ,
      reason: hedefVeziyyeti.reason || "target_relocated",
      followsRelocatedBase: false
    };
  }

  return {
    success: true,
    arrived: true,
    remainingMs: 0,
    nextStatus: PVP_BAZA_STATUSLARI.DOYUSE_HAZIR,
    battleAllowed: true,
    campRequired: false,
    targetStillPresent: true,
    defenderEscapedByRelocation: false,
    targetX: hedefVeziyyeti.targetX,
    targetZ: hedefVeziyyeti.targetZ,
    followsRelocatedBase: false
  };
}

module.exports = {
  pvpHucumEmeliyyatQaydasiniHazirla,
  pvpHucumEmeliyyatiniHazirla,
  pvpHucumCatmaVeziyyetiniHazirla
};
