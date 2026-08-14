"use strict";

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : "";
}

function aktivToplamaTap(state, konvoyId, nowMs = Date.now()) {
  const id = metnAl(konvoyId, 64);
  const activeByConvoy =
    state &&
    state.xeriteToplama &&
    state.xeriteToplama.activeByConvoy;

  if (!id || !activeByConvoy || typeof activeByConvoy !== "object") {
    return null;
  }

  const mission = activeByConvoy[id];
  if (!mission || typeof mission !== "object") {
    return null;
  }

  const endsAtMs = Math.max(0, Number(mission.endsAtMs) || 0);
  if (endsAtMs > 0 && Number(nowMs) >= endsAtMs) {
    return null;
  }

  return mission;
}

function aktivXeriteDoyusuTap(state, konvoyId) {
  const id = metnAl(konvoyId, 64);
  const activeByConvoy =
    state &&
    state.worldEnemyBattle &&
    state.worldEnemyBattle.activeByConvoy;

  if (!id || !activeByConvoy || typeof activeByConvoy !== "object") {
    return null;
  }

  const mission = activeByConvoy[id];
  return mission && typeof mission === "object"
    ? mission
    : null;
}

function konvoyMesguldur(state, konvoyId, nowMs = Date.now()) {
  const toplama = aktivToplamaTap(state, konvoyId, nowMs);

  if (toplama) {
    return {
      mesguldur: true,
      sebeb: "resource_gathering",
      message: "Konvoy xəritədə resurs topladığı üçün tərkibi dəyişdirilə bilməz.",
      mission: { ...toplama }
    };
  }

  const xeriteDoyusu = aktivXeriteDoyusuTap(state, konvoyId);
  if (xeriteDoyusu) {
    return {
      mesguldur: true,
      sebeb: "world_enemy_battle",
      message: "Konvoy xəritədə düşmən döyüşündə olduğu üçün tərkibi dəyişdirilə bilməz.",
      mission: { ...xeriteDoyusu }
    };
  }

  const tutorial = state && state.doyus && state.doyus.tutorial;
  if (
    tutorial &&
    typeof tutorial === "object" &&
    metnAl(tutorial.convoyId, 64) === metnAl(konvoyId, 64) &&
    tutorial.status &&
    tutorial.status !== "completed" &&
    tutorial.status !== "tamamlandi"
  ) {
    return {
      mesguldur: true,
      sebeb: "battle",
      message: "Konvoy döyüş tapşırığında olduğu üçün tərkibi dəyişdirilə bilməz.",
      mission: null
    };
  }

  return {
    mesguldur: false,
    sebeb: "",
    message: "",
    mission: null
  };
}

module.exports = {
  aktivToplamaTap,
  aktivXeriteDoyusuTap,
  konvoyMesguldur
};
