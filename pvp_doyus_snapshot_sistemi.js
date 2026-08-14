"use strict";

const {
  qosunGucunuHesabla
} = require("./xerite_dusmen_doyus_sistemi");

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

function kopyala(deyer) {
  return deyer == null
    ? null
    : JSON.parse(JSON.stringify(deyer));
}

function qosunObyektiniTemizle(raw) {
  const temiz = {};

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return temiz;
  }

  for (const [rawUnitId, rawSay] of Object.entries(raw)) {
    const unitId = metnAl(rawUnitId, 128);
    const say = musbetTamEded(rawSay);

    if (!unitId || say <= 0) continue;
    temiz[unitId] = say;
  }

  return temiz;
}

function qosunSayiniHesabla(qosunlar) {
  return Object.values(qosunObyektiniTemizle(qosunlar))
    .reduce((cem, say) => cem + say, 0);
}

function konvoySiyahisiniAl(state) {
  return Array.isArray(state && state.konvoylar && state.konvoylar.items)
    ? state.konvoylar.items
    : [];
}

function konvoyuTap(state, convoyId) {
  const id = metnAl(convoyId, 64);

  return konvoySiyahisiniAl(state)
    .find(konvoy => metnAl(konvoy && konvoy.konvoyId, 64) === id) || null;
}

function qosundanDeterministikFormasiyaHazirla(qosunlar, siraPrefiksi) {
  return Object.entries(qosunObyektiniTemizle(qosunlar))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([unitId, count], index) => ({
      siraId: `${siraPrefiksi}_${index + 1}`,
      unitId,
      count
    }));
}

function konvoyFormasiyaSnapshotiniAl(konvoy) {
  const siralar = Array.isArray(
    konvoy &&
    konvoy.formasiya &&
    konvoy.formasiya.siralar
  )
    ? konvoy.formasiya.siralar
    : [];

  const temiz = siralar
    .map(sira => ({
      siraId: metnAl(sira && sira.siraId, 32),
      unitId: metnAl(sira && sira.unitId, 128),
      count: musbetTamEded(sira && sira.count)
    }))
    .filter(sira => sira.siraId && sira.unitId && sira.count > 0);

  if (temiz.length > 0) {
    return temiz;
  }

  return qosundanDeterministikFormasiyaHazirla(
    konvoy && konvoy.qosunlar,
    "sira"
  );
}

function aktivKonvoyIdSetiniAl(state) {
  const aktiv = new Set();

  const vahidEmeliyyatlar =
    state &&
    state.konvoyEmeliyyatlari &&
    state.konvoyEmeliyyatlari.activeByConvoy;

  if (
    vahidEmeliyyatlar &&
    typeof vahidEmeliyyatlar === "object" &&
    !Array.isArray(vahidEmeliyyatlar)
  ) {
    for (const [rawConvoyId, emeliyyat] of Object.entries(vahidEmeliyyatlar)) {
      const convoyId = metnAl(rawConvoyId, 64);
      const status = metnAl(emeliyyat && emeliyyat.status, 64);

      if (!convoyId) continue;
      if (!status || status === "idle") continue;
      aktiv.add(convoyId);
    }
  }

  const legacyToplama =
    state &&
    state.xeriteToplama &&
    state.xeriteToplama.activeByConvoy;

  if (
    legacyToplama &&
    typeof legacyToplama === "object" &&
    !Array.isArray(legacyToplama)
  ) {
    for (const rawConvoyId of Object.keys(legacyToplama)) {
      const convoyId = metnAl(rawConvoyId, 64);
      if (convoyId) aktiv.add(convoyId);
    }
  }

  const legacyDoyus =
    state &&
    state.worldEnemyBattle &&
    state.worldEnemyBattle.activeByConvoy;

  if (
    legacyDoyus &&
    typeof legacyDoyus === "object" &&
    !Array.isArray(legacyDoyus)
  ) {
    for (const rawConvoyId of Object.keys(legacyDoyus)) {
      const convoyId = metnAl(rawConvoyId, 64);
      if (convoyId) aktiv.add(convoyId);
    }
  }

  return aktiv;
}

function aktivKonvoyQosunlariniAl(state) {
  const aktivIdler = aktivKonvoyIdSetiniAl(state);
  const cem = {};

  for (const konvoy of konvoySiyahisiniAl(state)) {
    const convoyId = metnAl(konvoy && konvoy.konvoyId, 64);
    if (!convoyId || !aktivIdler.has(convoyId)) continue;

    for (const [unitId, say] of Object.entries(
      qosunObyektiniTemizle(konvoy && konvoy.qosunlar)
    )) {
      cem[unitId] = (cem[unitId] || 0) + say;
    }
  }

  return cem;
}

function aktivKonvoyQehremanIdSetiniAl(state) {
  const aktivIdler = aktivKonvoyIdSetiniAl(state);
  const qehremanlar = new Set();

  for (const konvoy of konvoySiyahisiniAl(state)) {
    const convoyId = metnAl(konvoy && konvoy.konvoyId, 64);
    if (!convoyId || !aktivIdler.has(convoyId)) continue;

    for (const rawHeroId of Array.isArray(konvoy && konvoy.qehremanIdleri)
      ? konvoy.qehremanIdleri
      : []) {
      const heroId = metnAl(rawHeroId, 128);
      if (heroId) qehremanlar.add(heroId);
    }
  }

  return qehremanlar;
}

function mudafieQosunlariniHazirla(state) {
  const ordu = qosunObyektiniTemizle(
    state && state.army && state.army.troops
  );
  const seferde = aktivKonvoyQosunlariniAl(state);
  const mudafie = {};

  for (const [unitId, umumiSay] of Object.entries(ordu)) {
    const seferdeSay = musbetTamEded(seferde[unitId]);
    const bazadaQalan = Math.max(0, umumiSay - seferdeSay);

    if (bazadaQalan > 0) {
      mudafie[unitId] = bazadaQalan;
    }
  }

  return mudafie;
}

function mudafieQehremanIdleriniHazirla(state) {
  const seferde = aktivKonvoyQehremanIdSetiniAl(state);
  const netice = [];
  const gorulen = new Set();

  for (const qehreman of Array.isArray(state && state.heroes) ? state.heroes : []) {
    const heroId = metnAl(qehreman && qehreman.heroId, 128);

    if (!heroId || gorulen.has(heroId) || seferde.has(heroId)) {
      continue;
    }

    gorulen.add(heroId);
    netice.push(heroId);
  }

  return netice;
}

function pvpDoyusSnapshotQaydasiniHazirla() {
  return {
    version: 1,
    attackerSnapshotLockedAtAttackStart: true,
    defenderSnapshotLockedAtArrival: true,
    activeConvoyTroopsExcludedFromBaseDefense: true,
    activeConvoyHeroesExcludedFromBaseDefense: true,
    idleConvoyAssignmentsRemainAtBase: true,
    troopPowerUsesCurrentPvePowerFormula: true,
    heroPowerApplied: false,
    combatResolverEnabled: false,
    rewardRulesConfigured: false,
    casualtyMutationConfigured: false
  };
}

function pvpHucumcuSnapshotiniHazirla(state, convoyId, nowMs = Date.now()) {
  const id = metnAl(convoyId, 64);
  const konvoy = konvoyuTap(state, id);

  if (!konvoy || konvoy.aciqdir !== true) {
    return {
      success: false,
      message: "PvP hücum snapshot-u üçün açıq konvoy tapılmadı."
    };
  }

  const qosunlar = qosunObyektiniTemizle(konvoy.qosunlar);
  const troopCount = qosunSayiniHesabla(qosunlar);

  if (troopCount <= 0) {
    return {
      success: false,
      message: "PvP hücum snapshot-u üçün konvoyda qoşun yoxdur."
    };
  }

  const heroIds = Array.isArray(konvoy.qehremanIdleri)
    ? konvoy.qehremanIdleri
        .map(heroId => metnAl(heroId, 128))
        .filter(Boolean)
    : [];

  return {
    success: true,
    snapshot: {
      version: 1,
      side: "attacker",
      convoyId: id,
      troops: qosunlar,
      formation: konvoyFormasiyaSnapshotiniAl(konvoy),
      heroIds,
      troopCount,
      troopPower: qosunGucunuHesabla(qosunlar),
      heroPowerApplied: false,
      snapshottedAtMs: musbetTamEded(nowMs) || Date.now(),
      locked: true
    }
  };
}

function pvpMudafieciSnapshotiniHazirla(state, playerId, nowMs = Date.now()) {
  if (!state || typeof state !== "object") {
    return {
      success: false,
      message: "PvP müdafiə snapshot-u üçün oyunçu state-i yoxdur."
    };
  }

  const qosunlar = mudafieQosunlariniHazirla(state);
  const heroIds = mudafieQehremanIdleriniHazirla(state);
  const troopCount = qosunSayiniHesabla(qosunlar);

  return {
    success: true,
    snapshot: {
      version: 1,
      side: "defender",
      playerId: metnAl(playerId || state.playerId, 128),
      troops: qosunlar,
      formation: qosundanDeterministikFormasiyaHazirla(
        qosunlar,
        "mudafie"
      ),
      heroIds,
      troopCount,
      troopPower: qosunGucunuHesabla(qosunlar),
      heroPowerApplied: false,
      activeConvoyIds: Array.from(aktivKonvoyIdSetiniAl(state)).sort(),
      snapshottedAtMs: musbetTamEded(nowMs) || Date.now(),
      locked: true
    }
  };
}

module.exports = {
  qosunObyektiniTemizle,
  qosunSayiniHesabla,
  aktivKonvoyIdSetiniAl,
  aktivKonvoyQosunlariniAl,
  mudafieQosunlariniHazirla,
  mudafieQehremanIdleriniHazirla,
  pvpDoyusSnapshotQaydasiniHazirla,
  pvpHucumcuSnapshotiniHazirla,
  pvpMudafieciSnapshotiniHazirla,
  kopyala
};
