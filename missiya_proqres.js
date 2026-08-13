"use strict";

const {
  missiyaIdNormallasdir,
  butunMissiyalariAl,
  evvelkiMissiyaniTap,
  novbetiMissiyaniTap
} = require("./missiya_kataloqu");

function metnNormallasdir(deyer) {
  return String(deyer || "").trim().toLowerCase();
}

function musbetTamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say)
    ? Math.max(0, Math.trunc(say))
    : 0;
}

function missiyaStateTeminEt(state) {
  if (!state || typeof state !== "object") return null;

  if (!state.missions || typeof state.missions !== "object" || Array.isArray(state.missions)) {
    state.missions = {};
  }

  if (!Array.isArray(state.missions.claimedRewardIds)) {
    state.missions.claimedRewardIds = [];
  }

  state.missions.claimedRewardIds = Array.from(new Set(
    state.missions.claimedRewardIds
      .map(missiyaIdNormallasdir)
      .filter(Boolean)
  ));

  if (!state.missions.eventCounters || typeof state.missions.eventCounters !== "object" || Array.isArray(state.missions.eventCounters)) {
    state.missions.eventCounters = {};
  }

  state.missions.version = 1;
  return state.missions;
}

function serverHadisesiniQeydEt(state, hadiseId, miqdar = 1) {
  const missiyalar = missiyaStateTeminEt(state);
  const acar = metnNormallasdir(hadiseId);
  if (!missiyalar || !acar) return 0;

  const cari = musbetTamEded(missiyalar.eventCounters[acar]);
  const artim = Math.max(1, musbetTamEded(miqdar));
  missiyalar.eventCounters[acar] = cari + artim;
  return missiyalar.eventCounters[acar];
}

function serverHadiseSayiniAl(state, hadiseId) {
  const missiyalar = missiyaStateTeminEt(state);
  const acar = metnNormallasdir(hadiseId);
  if (!missiyalar || !acar) return 0;
  return musbetTamEded(missiyalar.eventCounters[acar]);
}

function tamamlanmisBinalariAl(state) {
  return state && Array.isArray(state.buildings)
    ? state.buildings.filter(bina => bina && bina.isCompleted === true)
    : [];
}

function qoshunSayiniAl(state) {
  const troops = state && state.army && state.army.troops;
  if (!troops || typeof troops !== "object") return 0;

  return Object.values(troops).reduce(
    (cem, deyer) => cem + musbetTamEded(deyer),
    0
  );
}

function qehremanSiyahisiniAl(state) {
  if (!state || typeof state !== "object") return [];

  const namizedler = [
    state.qehremanlar,
    state.heroes,
    state.heroInventory
  ];

  for (const namized of namizedler) {
    if (Array.isArray(namized)) return namized.filter(Boolean);
  }

  for (const namized of [...namizedler, state.hero]) {
    if (!namized || typeof namized !== "object") continue;

    for (const siyahi of [namized.items, namized.owned, namized.heroes, namized.qehremanlar]) {
      if (Array.isArray(siyahi)) return siyahi.filter(Boolean);
    }
  }

  return [];
}

function bazaGenislenmeSayiniAl(state) {
  if (!state || typeof state !== "object") return 0;

  let say = 0;

  if (state.map && Array.isArray(state.map.unlockedBlocks)) {
    say = Math.max(say, Math.max(0, state.map.unlockedBlocks.length - 1));
  }

  if (state.map && typeof state.map === "object") {
    const minX = Number(state.map.unlockedMinX);
    const maxX = Number(state.map.unlockedMaxX);
    const minZ = Number(state.map.unlockedMinZ);
    const maxZ = Number(state.map.unlockedMaxZ);

    if (
      (Number.isFinite(minX) && minX < 0) ||
      (Number.isFinite(maxX) && maxX > 7) ||
      (Number.isFinite(minZ) && minZ < 0) ||
      (Number.isFinite(maxZ) && maxZ > 7)
    ) {
      say = Math.max(say, 1);
    }
  }

  return Math.max(say, serverHadiseSayiniAl(state, "baza_sahesi_acildi"));
}

function missiyaProqresiniHesabla(state, missiya) {
  if (!state || !missiya) return 0;

  const binalar = tamamlanmisBinalariAl(state);

  switch (missiya.type) {
    case "hq_exists":
      return binalar.some(bina => metnNormallasdir(bina.buildingId) === "hq") ? 1 : 0;

    case "completed_building_group_count": {
      const hedefler = new Set(
        (Array.isArray(missiya.targetIds) ? missiya.targetIds : [])
          .map(metnNormallasdir)
          .filter(Boolean)
      );
      return binalar.filter(bina => hedefler.has(metnNormallasdir(bina.buildingId))).length;
    }

    case "completed_nonstarter_building_count":
      return binalar.filter(bina => {
        const id = metnNormallasdir(bina.buildingId);
        return id && id !== "hq" && id !== "road";
      }).length;

    case "building_level_at_least": {
      const hedefId = metnNormallasdir(missiya.targetId);
      const seviye = Math.max(1, musbetTamEded(missiya.requiredLevel));
      return binalar.some(bina =>
        metnNormallasdir(bina.buildingId) === hedefId &&
        Math.max(1, musbetTamEded(bina.level)) >= seviye
      ) ? 1 : 0;
    }

    case "base_expansion_count":
      return bazaGenislenmeSayiniAl(state);

    case "total_troop_count":
      return qoshunSayiniAl(state);

    case "hero_count":
      return qehremanSiyahisiniAl(state).length;

    case "hero_max_level": {
      const seviye = Math.max(1, musbetTamEded(missiya.requiredLevel));
      return qehremanSiyahisiniAl(state).some(qehreman =>
        Math.max(1, musbetTamEded(qehreman.level ?? qehreman.seviye)) >= seviye
      ) ? 1 : 0;
    }

    case "server_event_count":
      return serverHadiseSayiniAl(state, missiya.eventId);

    default:
      return 0;
  }
}

function mukafatAlinib(state, missiyaId) {
  const missiyalar = missiyaStateTeminEt(state);
  return !!missiyalar && missiyalar.claimedRewardIds.includes(
    missiyaIdNormallasdir(missiyaId)
  );
}

function missiyaKilidlidir(state, missiya) {
  if (!missiya) return true;
  const evvelki = evvelkiMissiyaniTap(missiya.missionId);
  return !!evvelki && !mukafatAlinib(state, evvelki.missionId);
}

function missiyaStatusunuAl(state, missiya) {
  if (!missiya) return "kilidli";
  if (mukafatAlinib(state, missiya.missionId)) return "mukafat_alindi";
  if (missiyaKilidlidir(state, missiya)) return "kilidli";

  const teleb = Math.max(1, musbetTamEded(missiya.requiredCount));
  return missiyaProqresiniHesabla(state, missiya) >= teleb
    ? "tamamlandi"
    : "aktiv";
}

function missiyaGorunusunuHazirla(state, missiya) {
  if (!missiya) return null;

  const teleb = Math.max(1, musbetTamEded(missiya.requiredCount));
  const xamProqres = missiyaProqresiniHesabla(state, missiya);
  const status = missiyaStatusunuAl(state, missiya);
  const novbeti = novbetiMissiyaniTap(missiya.missionId);

  return {
    missionId: missiya.missionId,
    order: missiya.order,
    chapterId: missiya.chapterId,
    title: missiya.title,
    description: missiya.description,
    progress: Math.min(xamProqres, teleb),
    requiredCount: teleb,
    status,
    locked: status === "kilidli",
    completed: status === "tamamlandi" || status === "mukafat_alindi",
    rewardClaimed: status === "mukafat_alindi",
    rewards: Array.isArray(missiya.rewards)
      ? missiya.rewards.map(mukafat => ({ ...mukafat }))
      : [],
    nextMissionId: novbeti ? novbeti.missionId : ""
  };
}

function aktivMissiyaniTap(state) {
  for (const missiya of butunMissiyalariAl()) {
    const status = missiyaStatusunuAl(state, missiya);
    if (status === "aktiv" || status === "tamamlandi") return missiya;
  }
  return null;
}

module.exports = {
  missiyaStateTeminEt,
  serverHadisesiniQeydEt,
  serverHadiseSayiniAl,
  missiyaProqresiniHesabla,
  mukafatAlinib,
  missiyaKilidlidir,
  missiyaStatusunuAl,
  missiyaGorunusunuHazirla,
  aktivMissiyaniTap
};
