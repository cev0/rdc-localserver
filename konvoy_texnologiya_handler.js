"use strict";

const {
  KONVOY_TEXNOLOGIYA_BALANSI
} = require("./konvoy_qaydalari");
const {
  requestIdAl,
  tekrarNeticesiniTap,
  ugurluNeticeniQeydEt
} = require("./server_sorqu_idempotentliyi");
const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const BALANSLAR = Object.values(KONVOY_TEXNOLOGIYA_BALANSI);
const BALANS_XERITESI = new Map(BALANSLAR.map(x => [x.techId, x]));
const oyuncuKilidleri = new Map();

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : "";
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

async function oyuncuKilidiIleIcraEt(playerId, emeliyyat) {
  const evvelki = oyuncuKilidleri.get(playerId) || Promise.resolve();
  let kilidiAc;
  const cari = new Promise(resolve => {
    kilidiAc = resolve;
  });

  oyuncuKilidleri.set(playerId, cari);
  await evvelki;

  try {
    return await emeliyyat();
  }
  finally {
    kilidiAc();
    if (oyuncuKilidleri.get(playerId) === cari) {
      oyuncuKilidleri.delete(playerId);
    }
  }
}

function binaLeveliniAl(state, buildingId, yolTelebi = false) {
  let maksimum = 0;

  for (const bina of Array.isArray(state && state.buildings) ? state.buildings : []) {
    if (!bina || bina.isCompleted !== true) continue;
    if (metnAl(bina.buildingId, 128) !== buildingId) continue;
    if (yolTelebi && bina.hasRoadAccess === false) continue;

    maksimum = Math.max(
      maksimum,
      Math.max(1, Math.trunc(Number(bina.level) || 1))
    );
  }

  return maksimum;
}

function resourceStateTeminEt(state) {
  if (!state.resources || typeof state.resources !== "object") {
    state.resources = {};
  }

  for (const id of ["wood", "iron", "fuel", "money"]) {
    if (!Number.isFinite(Number(state.resources[id]))) {
      state.resources[id] = 0;
    }
  }
}

function technologyStateTeminEt(state) {
  if (!state.technology || typeof state.technology !== "object") {
    state.technology = {};
  }
  if (!state.technology.levels || typeof state.technology.levels !== "object") {
    state.technology.levels = {};
  }
  if (!("currentResearch" in state.technology)) {
    state.technology.currentResearch = null;
  }
}

function melumatiHazirla(state, balans) {
  technologyStateTeminEt(state);
  resourceStateTeminEt(state);

  const hqLevel = binaLeveliniAl(state, "hq");
  const instituteLevel = binaLeveliniAl(state, "institute", true);
  const tamamlanib = Number(state.technology.levels[balans.techId]) > 0;
  const dependenciesReady = balans.requiredTechIds.every(
    id => Number(state.technology.levels[id]) > 0
  );

  return {
    techId: balans.techId,
    displayName: balans.displayName,
    completed: tamamlanib,
    requiredHqLevel: balans.requiredHqLevel,
    currentHqLevel: hqLevel,
    requiredInstituteLevel: balans.requiredInstituteLevel,
    currentInstituteLevel: instituteLevel,
    requiredTechIds: [...balans.requiredTechIds],
    dependenciesReady,
    researchTimeSeconds: balans.researchTimeSeconds,
    cost: balans.cost.map(x => ({ ...x })),
    canResearch:
      !tamamlanib &&
      !state.technology.currentResearch &&
      hqLevel >= balans.requiredHqLevel &&
      instituteLevel >= balans.requiredInstituteLevel &&
      dependenciesReady
  };
}

function baslayaBiler(state, balans) {
  const info = melumatiHazirla(state, balans);

  if (info.completed) return { ok: false, message: "Texnologiya artıq tamamlanıb.", info };
  if (state.technology.currentResearch) return { ok: false, message: "Başqa araşdırma artıq davam edir.", info };
  if (info.currentHqLevel < info.requiredHqLevel) return { ok: false, message: `HQ Level ${info.requiredHqLevel} tələb olunur.`, info };
  if (info.currentInstituteLevel < info.requiredInstituteLevel) return { ok: false, message: `Institute Level ${info.requiredInstituteLevel} tələb olunur.`, info };
  if (!info.dependenciesReady) return { ok: false, message: "Əvvəlki konvoy texnologiyası tamamlanmalıdır.", info };

  for (const item of balans.cost) {
    const varOlan = Math.max(0, Number(state.resources[item.type]) || 0);
    if (varOlan < item.amount) {
      return { ok: false, message: `${item.type} kifayət etmir.`, info };
    }
  }

  return { ok: true, info };
}

function researchBaslat(state, balans, nowMs) {
  const yoxlama = baslayaBiler(state, balans);
  if (!yoxlama.ok) return yoxlama;

  for (const item of balans.cost) {
    state.resources[item.type] = Math.max(
      0,
      (Number(state.resources[item.type]) || 0) - item.amount
    );
  }

  const baslangic = Number(nowMs) || Date.now();
  const durationMs = balans.researchTimeSeconds * 1000;

  state.technology.currentResearch = {
    techId: balans.techId,
    targetLevel: 1,
    startedAtMs: baslangic,
    durationMs,
    endsAtMs: baslangic + durationMs,
    instituteInstanceId: null
  };

  return {
    ok: true,
    research: { ...state.technology.currentResearch },
    info: melumatiHazirla(state, balans)
  };
}

function ugursuzStartCavabi(kontekst, playerId, techId, requestId, message, info = null) {
  kontekst.send(kontekst.ws, {
    type: "technology_research_result",
    success: false,
    playerId,
    techId,
    requestId,
    idempotentReplay: false,
    message,
    info,
    serverTimeUnixMs: kontekst.nowMs()
  });
}

async function konvoyTexnologiyaMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  const techId = metnAl(kontekst && kontekst.msg && kontekst.msg.techId, 128);

  const infoIsteyi = type === "convoy_technology_info_request";
  const startIsteyi = type === "technology_research_start" && BALANS_XERITESI.has(techId);
  if (!infoIsteyi && !startIsteyi) return false;

  const playerId = metnAl(kontekst.ws && kontekst.ws._authedPlayerId, 128);
  if (!playerId) {
    kontekst.send(kontekst.ws, {
      type: infoIsteyi ? "convoy_technology_info_result" : "technology_research_result",
      success: false,
      message: "Autentifikasiya tələb olunur.",
      serverTimeUnixMs: kontekst.nowMs()
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);

    if (infoIsteyi) {
      const technologies = BALANSLAR.map(x => melumatiHazirla(state, x));
      kontekst.send(kontekst.ws, {
        type: "convoy_technology_info_result",
        success: true,
        playerId,
        technologies,
        payloadJson: JSON.stringify(technologies),
        serverTimeUnixMs: kontekst.nowMs()
      });
      return true;
    }

    await oyuncuKilidiIleIcraEt(playerId, async () => {
      const kilidliState = kontekst.getOrCreatePlayerState(playerId);
      const balans = BALANS_XERITESI.get(techId);
      const requestId = requestIdAl(kontekst.msg && kontekst.msg.requestId);
      const requestPayload = { techId };

      const tekrar = tekrarNeticesiniTap(
        kilidliState,
        "konvoy_texnologiya_arasdirma_baslat",
        requestId,
        requestPayload
      );

      if (tekrar.conflict) {
        ugursuzStartCavabi(
          kontekst,
          playerId,
          techId,
          requestId,
          tekrar.message || "requestId ziddiyyəti yarandı."
        );
        return;
      }

      if (tekrar.replay) {
        const replay = tekrar.result && typeof tekrar.result === "object"
          ? tekrar.result
          : {};
        kontekst.send(kontekst.ws, {
          type: "technology_research_started",
          success: true,
          playerId,
          techId,
          requestId,
          idempotentReplay: true,
          research: replay.research || null,
          info: replay.info || null,
          payloadJson: JSON.stringify(replay.research || null),
          serverTimeUnixMs: kontekst.nowMs()
        });
        return;
      }

      const evvelki = kopyala({
        resources: kilidliState.resources || {},
        technology: kilidliState.technology || {},
        serverSorquIdempotentliyi: kilidliState.serverSorquIdempotentliyi || null
      });

      const nowMs = kontekst.nowMs();
      const netice = researchBaslat(kilidliState, balans, nowMs);

      if (!netice.ok) {
        ugursuzStartCavabi(
          kontekst,
          playerId,
          techId,
          requestId,
          netice.message,
          netice.info
        );
        return;
      }

      const cavab = {
        research: kopyala(netice.research),
        info: kopyala(netice.info)
      };

      ugurluNeticeniQeydEt(
        kilidliState,
        "konvoy_texnologiya_arasdirma_baslat",
        requestId,
        requestPayload,
        cavab,
        nowMs
      );

      try {
        await oyunStateIniYaddaSaxla(playerId, kilidliState);
      }
      catch (xeta) {
        kilidliState.resources = evvelki.resources;
        kilidliState.technology = evvelki.technology;
        kilidliState.serverSorquIdempotentliyi = evvelki.serverSorquIdempotentliyi;
        throw xeta;
      }

      kontekst.send(kontekst.ws, {
        type: "technology_research_started",
        success: true,
        playerId,
        techId,
        requestId,
        idempotentReplay: false,
        research: cavab.research,
        info: cavab.info,
        payloadJson: JSON.stringify(cavab.research),
        serverTimeUnixMs: kontekst.nowMs()
      });
    });
  }
  catch (xeta) {
    console.error("[KONVOY_TECH]", xeta);
    kontekst.send(kontekst.ws, {
      type: infoIsteyi ? "convoy_technology_info_result" : "technology_research_result",
      success: false,
      playerId,
      techId,
      requestId: requestIdAl(kontekst.msg && kontekst.msg.requestId),
      idempotentReplay: false,
      message: "Konvoy texnologiyası əməliyyatı tamamlanmadı.",
      serverTimeUnixMs: kontekst.nowMs()
    });
  }

  return true;
}

module.exports = {
  konvoyTexnologiyaMesajiniEmalEt
};
