"use strict";

const {
  KONVOY_TEXNOLOGIYA_BALANSI
} = require("./konvoy_qaydalari");
const {
  texnologiyaInkIsafModifikatorunuHesabla
} = require("./texnologiya_inkisaf_korpu");
const {
  requestIdAl,
  tekrarNeticesiniTap,
  ugurluNeticeniQeydEt
} = require("./server_sorqu_idempotentliyi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

const BALANSLAR = Object.values(KONVOY_TEXNOLOGIYA_BALANSI);
const BALANS_XERITESI = new Map(BALANSLAR.map(x => [x.techId, x]));

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : "";
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
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
  const modifier = texnologiyaInkIsafModifikatorunuHesabla(
    state,
    balans.researchTimeSeconds
  );
  const durationMs = modifier.effektivMuddetSaniye * 1000;

  state.technology.currentResearch = {
    techId: balans.techId,
    targetLevel: 1,
    startedAtMs: baslangic,
    durationMs,
    endsAtMs: baslangic + durationMs,
    instituteInstanceId: modifier.instituteInstanceId,
    baseDurationSeconds: modifier.esasMuddetSaniye,
    researchSpeedPercent: modifier.tedqiqatSuretiFaiz
  };

  return {
    ok: true,
    research: { ...state.technology.currentResearch },
    developmentModifier: {
      instituteInstanceId: modifier.instituteInstanceId,
      researchSpeedPercent: modifier.tedqiqatSuretiFaiz,
      baseDurationSeconds: modifier.esasMuddetSaniye,
      effectiveDurationSeconds: modifier.effektivMuddetSaniye,
      effects: Array.isArray(modifier.effects) ? modifier.effects.map(x => ({ ...x })) : []
    },
    info: melumatiHazirla(state, balans)
  };
}

function konvoyTexnologiyaStartMutasiyasiniTetbiqEt(
  state,
  rawTechId,
  rawRequestId,
  nowMs = Date.now()
) {
  const techId =
    metnAl(
      rawTechId,
      128
    );

  const requestId =
    requestIdAl(
      rawRequestId
    );

  const balans =
    BALANS_XERITESI.get(
      techId
    );

  if (!balans) {
    return {
      success: false,
      deyisdi: false,
      idempotentReplay: false,
      techId,
      requestId,
      message:
        "Konvoy texnologiyası tapılmadı.",
      info: null
    };
  }

  const requestPayload = {
    techId
  };

  const tekrar =
    tekrarNeticesiniTap(
      state,
      "konvoy_texnologiya_arasdirma_baslat",
      requestId,
      requestPayload
    );

  if (tekrar.conflict) {
    return {
      success: false,
      deyisdi: false,
      idempotentReplay: false,
      techId,
      requestId,
      message:
        tekrar.message ||
        "requestId ziddiyyəti yarandı.",
      info: null
    };
  }

  if (tekrar.replay) {
    const replay =
      tekrar.result &&
      typeof tekrar.result ===
        "object"
        ? tekrar.result
        : {};

    return {
      success: true,
      deyisdi: false,
      idempotentReplay: true,
      techId,
      requestId,
      research:
        kopyala(
          replay.research ||
          null
        ),
      developmentModifier:
        kopyala(
          replay.developmentModifier ||
          null
        ),
      info:
        kopyala(
          replay.info ||
          null
        )
    };
  }

  const netice =
    researchBaslat(
      state,
      balans,
      nowMs
    );

  if (!netice.ok) {
    return {
      success: false,
      deyisdi: false,
      idempotentReplay: false,
      techId,
      requestId,
      message:
        netice.message,
      info:
        kopyala(
          netice.info ||
          null
        )
    };
  }

  const cavab = {
    research:
      kopyala(
        netice.research
      ),
    developmentModifier:
      kopyala(
        netice.developmentModifier
      ),
    info:
      kopyala(
        netice.info
      )
  };

  ugurluNeticeniQeydEt(
    state,
    "konvoy_texnologiya_arasdirma_baslat",
    requestId,
    requestPayload,
    cavab,
    nowMs
  );

  return {
    success: true,
    deyisdi: true,
    idempotentReplay: false,
    techId,
    requestId,
    ...cavab
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

    const canliState =
      typeof kontekst.ensureFreshPlayerState === "function"
        ? await kontekst.ensureFreshPlayerState(playerId)
        : state;

    const requestId =
      requestIdAl(
        kontekst.msg &&
        kontekst.msg.requestId
      );

    const nowMs =
      kontekst.nowMs();

    const mutasiyaNeticesi =
      await oyuncuStateMutasiyasiniPostgresIleIcraEt(
        playerId,
        canliState,
        async kilidliState =>
          konvoyTexnologiyaStartMutasiyasiniTetbiqEt(
            kilidliState,
            techId,
            requestId,
            nowMs
          )
      );

    if (
      !mutasiyaNeticesi ||
      mutasiyaNeticesi.success !== true
    ) {
      ugursuzStartCavabi(
        kontekst,
        playerId,
        techId,
        requestId,
        mutasiyaNeticesi &&
        mutasiyaNeticesi.message
          ? mutasiyaNeticesi.message
          : "Konvoy texnologiyası araşdırması başlatılmadı.",
        mutasiyaNeticesi &&
        mutasiyaNeticesi.info
          ? mutasiyaNeticesi.info
          : null
      );

      return true;
    }

    kontekst.send(kontekst.ws, {
      type: "technology_research_started",
      success: true,
      playerId,
      techId,
      requestId,
      idempotentReplay:
        mutasiyaNeticesi.idempotentReplay === true,
      research:
        mutasiyaNeticesi.research ||
        null,
      developmentModifier:
        mutasiyaNeticesi.developmentModifier ||
        null,
      info:
        mutasiyaNeticesi.info ||
        null,
      payloadJson:
        JSON.stringify(
          mutasiyaNeticesi.research ||
          null
        ),
      serverTimeUnixMs:
        kontekst.nowMs()
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
  researchBaslat,
  konvoyTexnologiyaStartMutasiyasiniTetbiqEt,
  konvoyTexnologiyaMesajiniEmalEt
};
