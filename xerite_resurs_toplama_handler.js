"use strict";

const {
  resursNodeSiyahisiniAl,
  toplamaniBaslat,
  bitmisToplamalariPendingEt,
  pendingMukafatiAl,
  toplamaMelumatiniHazirla,
  nodeMelumatiniAl
} = require("./xerite_resurs_toplama_sistemi");
const {
  hereketMsPerXana,
  hereketMuddetiniHesabla
} = require("./konvoy_emeliyyat_sistemi");
const { resursMovqeyiAl } = require("./xerite_movqe_sistemi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");
const {
  resursHesabatiYarat
} = require("./resurs_hesabati_sistemi");

const MESAJLAR = new Set([
  "map_resource_info_request",
  "map_resource_detail_request",
  "convoy_gather_start_request",
  "convoy_gather_status_request",
  "convoy_gather_claim_request"
]);

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function kopyala(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return JSON.parse(JSON.stringify(v));
}

function gonder(k, type, data) {
  k.send(k.ws, { type, ...data, serverTimeUnixMs: k.nowMs() });
}

function aktivKonvoyEmeliyyati(state, convoyId) {
  const id = metnAl(convoyId, 64);
  const active = state && state.konvoyEmeliyyatlari && state.konvoyEmeliyyatlari.activeByConvoy;
  return id && active && typeof active === "object" && active[id] ? active[id] : null;
}

function dovletIdAl(state) {
  return Math.max(
    1,
    Math.trunc(Number(state && state.worldPlacement && state.worldPlacement.stateId) || 1)
  );
}

function bazaMovqeyiAl(state) {
  return {
    x: Number(state && state.worldPlacement && state.worldPlacement.baseX) || 0,
    z: Number(state && state.worldPlacement && state.worldPlacement.baseZ) || 0
  };
}

function resursToplamaYeriAdiAl(resourceId) {
  switch (metnAl(resourceId, 64)) {
    case "food":
      return "Ferma";
    case "water":
      return "Su Məntəqəsi";
    case "wood":
      return "Meşə Sahəsi";
    case "iron":
      return "Dəmir Fabrikası";
    case "fuel":
      return "Neft Quyusu";
    default:
      return "Resurs nöqtəsi";
  }
}

function toplamaMukafatindanHesabatTeminEt(state, reward, nowMs = Date.now()) {
  if (!state || !reward || typeof reward !== "object") return null;

  const rewardId = typeof reward.rewardId === "string"
    ? reward.rewardId.trim()
    : "";

  if (!rewardId) return null;

  const stateId = dovletIdAl(state);
  const descriptor = nodeMelumatiniAl(stateId, reward.nodeId);
  const movqe = descriptor
    ? resursMovqeyiAl(stateId, descriptor.index)
    : null;

  return resursHesabatiYarat(
    state,
    {
      menbeMukafatId: rewardId,
      resursNovu: reward.resourceId,
      miqdar: tamEded(reward.amount),
      toplamaYeriAdi: resursToplamaYeriAdiAl(reward.resourceId),
      toplamaYeriSeviyesi: descriptor ? tamEded(descriptor.level) : 1,
      koordinatX: movqe ? Math.trunc(Number(movqe.x) || 0) : 0,
      koordinatY: movqe ? Math.trunc(Number(movqe.z) || 0) : 0,
      yaradildiMs: tamEded(reward.completedAtMs) || tamEded(nowMs) || Date.now()
    },
    nowMs
  );
}

async function resursDetaliHazirla(state, playerId, nodeId, nowMs) {
  const stateId = dovletIdAl(state);
  const siyahi = await resursNodeSiyahisiniAl(stateId, nowMs);
  const id = metnAl(nodeId, 128);
  const node = (siyahi.items || []).find(x => x && metnAl(x.nodeId, 128) === id) || null;
  if (!node) return null;

  const movqe = resursMovqeyiAl(stateId, node.index) || {};
  const baza = bazaMovqeyiAl(state);
  const x = Number(movqe.x) || 0;
  const z = Number(movqe.z) || 0;
  const oneWayTravelMs = hereketMuddetiniHesabla(baza.x, baza.z, x, z);
  const gatherDurationMs = Math.max(0, tamEded(node.gatherSeconds) * 1000);
  const occupiedUntilMs = tamEded(node.occupiedUntilMs);
  const respawnAtMs = tamEded(node.respawnAtMs);
  const occupied = !!metnAl(node.occupiedByPlayerId, 128);
  const remainingAmount = Math.max(0, Number(node.remainingAmount) || 0);
  const available = node.available === true;

  return {
    version: 1,
    nodeId: node.nodeId,
    stateId,
    resourceId: node.resourceId,
    level: tamEded(node.level),
    zoneId: movqe.zoneId || node.zoneId,
    presidentCenter: movqe.presidentCenter === true || node.zoneId === "president_center",
    x,
    z,
    fullAmount: Math.max(0, Number(node.amount) || 0),
    remainingAmount,
    gatherSeconds: tamEded(node.gatherSeconds),
    gatherDurationMs,
    respawnSeconds: tamEded(node.respawnSeconds),
    available,
    collectable: available,
    occupied,
    occupiedByPlayerId: node.occupiedByPlayerId || "",
    occupiedByConvoyId: node.occupiedByConvoyId || "",
    occupiedBySelf: occupied && metnAl(node.occupiedByPlayerId, 128) === metnAl(playerId, 128),
    occupiedUntilMs,
    occupiedRemainingMs: occupied ? Math.max(0, occupiedUntilMs - nowMs) : 0,
    respawnAtMs,
    respawning: !available && !occupied && respawnAtMs > nowMs,
    respawnRemainingMs: respawnAtMs > nowMs ? Math.max(0, respawnAtMs - nowMs) : 0,
    possibleReward: {
      resourceId: node.resourceId,
      amount: remainingAmount
    },
    estimatedOneWayTravelMs: oneWayTravelMs,
    estimatedGatherMs: gatherDurationMs,
    estimatedReturnTravelMs: oneWayTravelMs,
    estimatedFullOperationMs: oneWayTravelMs + gatherDurationMs + oneWayTravelMs,
    operationRequest: {
      targetType: "resource",
      targetId: node.nodeId
    }
  };
}

function saheniYedekle(state, acar) {
  return {
    varIdi: Object.prototype.hasOwnProperty.call(state, acar),
    deyer: kopyala(state[acar])
  };
}

function saheniBerpaEt(state, acar, yedek) {
  if (yedek && yedek.varIdi) state[acar] = kopyala(yedek.deyer);
  else delete state[acar];
}

function legacyToplamaYedeyiniAl(state) {
  return {
    xeriteToplama: saheniYedekle(state, "xeriteToplama"),
    resources: saheniYedekle(state, "resources"),
    konvoylar: saheniYedekle(state, "konvoylar"),
    resursHesabatlari: saheniYedekle(state, "resursHesabatlari")
  };
}

function legacyToplamaYedeyiniBerpaEt(state, yedek) {
  if (!state || !yedek) return;
  saheniBerpaEt(state, "xeriteToplama", yedek.xeriteToplama);
  saheniBerpaEt(state, "resources", yedek.resources);
  saheniBerpaEt(state, "konvoylar", yedek.konvoylar);
  saheniBerpaEt(state, "resursHesabatlari", yedek.resursHesabatlari);
}

async function legacyToplamaMutasiyasiniTetbiqEt(
  state,
  playerId,
  type,
  msg,
  nowMs = Date.now()
) {
  const statusSorqusudur = type === "convoy_gather_status_request";
  const startSorqusudur = type === "convoy_gather_start_request";
  const claimSorqusudur = type === "convoy_gather_claim_request";

  if (!statusSorqusudur && !startSorqusudur && !claimSorqusudur) {
    return {
      success: false,
      deyisdi: false,
      message: "Naməlum legacy resurs toplama mutation sorğusu."
    };
  }

  const tamamlananlar = bitmisToplamalariPendingEt(state, nowMs);
  const dueDeyisdi = Array.isArray(tamamlananlar) && tamamlananlar.length > 0;

  if (dueDeyisdi) {
    for (const reward of tamamlananlar) {
      toplamaMukafatindanHesabatTeminEt(state, reward, nowMs);
    }
  }

  if (statusSorqusudur) {
    const info = toplamaMelumatiniHazirla(state, nowMs);
    return {
      success: true,
      deyisdi: dueDeyisdi,
      info: kopyala(info)
    };
  }

  if (startSorqusudur) {
    const startdanEvvel = legacyToplamaYedeyiniAl(state);
    let result;

    try {
      result = await toplamaniBaslat(
        state,
        playerId,
        metnAl(msg && msg.convoyId, 64),
        metnAl(msg && msg.nodeId, 128),
        nowMs
      );
    }
    catch (xeta) {
      legacyToplamaYedeyiniBerpaEt(state, startdanEvvel);
      return {
        success: false,
        deyisdi: dueDeyisdi,
        message: "Toplama start nəticəsi hesablana bilmədi.",
        daxiliXeta: xeta && xeta.message ? xeta.message : String(xeta)
      };
    }

    if (!result || result.success !== true) {
      legacyToplamaYedeyiniBerpaEt(state, startdanEvvel);
      return {
        success: false,
        deyisdi: dueDeyisdi,
        message: result && result.message ? result.message : "Toplama başlamadı."
      };
    }

    return {
      success: true,
      deyisdi: true,
      result: kopyala(result)
    };
  }

  const rewardId = metnAl(msg && msg.rewardId, 200);

  if (hereketMsPerXana() > 0) {
    const pending = state && state.xeriteToplama && Array.isArray(state.xeriteToplama.pendingRewards)
      ? state.xeriteToplama.pendingRewards.find(x => x && metnAl(x.rewardId, 200) === rewardId)
      : null;
    const operation = pending ? aktivKonvoyEmeliyyati(state, pending.convoyId) : null;

    if (operation && operation.status && operation.status !== "idle") {
      return {
        success: false,
        deyisdi: dueDeyisdi,
        message: "Toplama mükafatı konvoy bazaya qayıtdıqdan sonra götürülə bilər.",
        convoyStatus: operation.status,
        returnEndsAtMs: Number(operation.returnEndsAtMs) || 0,
        info: kopyala(toplamaMelumatiniHazirla(state, nowMs))
      };
    }
  }

  const claimdenEvvel = legacyToplamaYedeyiniAl(state);
  let result;

  try {
    result = pendingMukafatiAl(state, rewardId);
  }
  catch (xeta) {
    legacyToplamaYedeyiniBerpaEt(state, claimdenEvvel);
    return {
      success: false,
      deyisdi: dueDeyisdi,
      message: "Toplama mükafatı hesablana bilmədi.",
      daxiliXeta: xeta && xeta.message ? xeta.message : String(xeta),
      info: kopyala(toplamaMelumatiniHazirla(state, nowMs))
    };
  }

  if (!result || result.success !== true) {
    legacyToplamaYedeyiniBerpaEt(state, claimdenEvvel);
    return {
      success: false,
      deyisdi: dueDeyisdi,
      message: result && result.message ? result.message : "Toplama mükafatı götürülmədi.",
      reward: result && result.reward ? kopyala(result.reward) : null,
      info: kopyala(toplamaMelumatiniHazirla(state, nowMs))
    };
  }

  // Köhnə snapshot-da pending reward olub hesabat yoxdursa,
  // claim zamanı da idempotent şəkildə hesabatı təmin edirik.
  toplamaMukafatindanHesabatTeminEt(state, result.reward, nowMs);

  return {
    success: true,
    deyisdi: true,
    result: kopyala(result),
    info: kopyala(toplamaMelumatiniHazirla(state, nowMs))
  };
}

async function xeriteResursToplamaMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!MESAJLAR.has(type)) return false;

  const playerId = metnAl(kontekst && kontekst.ws && kontekst.ws._authedPlayerId, 128);
  const resultType = type.replace(/_request$/, "_result");

  if (!playerId) {
    gonder(kontekst, resultType, { success: false, message: "Autentifikasiya tələb olunur." });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);
    const nowMs = kontekst.nowMs();

    // Read-only xəritə sorğuları legacy gather state-i dəyişməməlidir.
    if (type === "map_resource_info_request") {
      const stateId = dovletIdAl(state);
      const info = await resursNodeSiyahisiniAl(stateId, nowMs);
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info)
      });
      return true;
    }

    if (type === "map_resource_detail_request") {
      const info = await resursDetaliHazirla(
        state,
        playerId,
        metnAl(kontekst.msg && kontekst.msg.nodeId, 128),
        nowMs
      );

      gonder(kontekst, resultType, {
        success: !!info,
        playerId,
        info,
        message: info ? "" : "Resurs node-u tapılmadı.",
        payloadJson: JSON.stringify(info)
      });
      return true;
    }

    if (type === "convoy_gather_start_request" && hereketMsPerXana() > 0) {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        message: "Birbaşa toplama start endpoint-i deaktivdir. convoy_operation_start_request istifadə olunmalıdır."
      });
      return true;
    }

    const mutasiyaNeticesi = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      state,
      async kilidliState => {
        return legacyToplamaMutasiyasiniTetbiqEt(
          kilidliState,
          playerId,
          type,
          kontekst.msg,
          nowMs
        );
      }
    );

    if (mutasiyaNeticesi && mutasiyaNeticesi.daxiliXeta) {
      console.error("[XERITE_RESURS_TOPLAMA] Mutation hesablanma xətası:", {
        playerId,
        message: mutasiyaNeticesi.daxiliXeta
      });
    }

    if (type === "convoy_gather_status_request") {
      const info = mutasiyaNeticesi && mutasiyaNeticesi.info
        ? mutasiyaNeticesi.info
        : toplamaMelumatiniHazirla(state, nowMs);

      gonder(kontekst, resultType, {
        success: !!(mutasiyaNeticesi && mutasiyaNeticesi.success === true),
        playerId,
        message: mutasiyaNeticesi && mutasiyaNeticesi.message
          ? mutasiyaNeticesi.message
          : "",
        info,
        payloadJson: JSON.stringify(info)
      });
      return true;
    }

    if (type === "convoy_gather_start_request") {
      if (!mutasiyaNeticesi || mutasiyaNeticesi.success !== true) {
        gonder(kontekst, resultType, {
          success: false,
          playerId,
          message: mutasiyaNeticesi && mutasiyaNeticesi.message
            ? mutasiyaNeticesi.message
            : "Toplama başlamadı."
        });
        return true;
      }

      const result = mutasiyaNeticesi.result || {};
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        ...result,
        payloadJson: JSON.stringify(result)
      });
      return true;
    }

    const result = mutasiyaNeticesi && mutasiyaNeticesi.result
      ? mutasiyaNeticesi.result
      : {};
    const info = mutasiyaNeticesi && mutasiyaNeticesi.info
      ? mutasiyaNeticesi.info
      : toplamaMelumatiniHazirla(state, nowMs);

    gonder(kontekst, resultType, {
      success: !!(mutasiyaNeticesi && mutasiyaNeticesi.success === true),
      playerId,
      message: mutasiyaNeticesi && mutasiyaNeticesi.message
        ? mutasiyaNeticesi.message
        : (result.message || ""),
      reward: result.reward || null,
      newAmount: result.newAmount,
      convoyStatus: mutasiyaNeticesi && mutasiyaNeticesi.convoyStatus,
      returnEndsAtMs: mutasiyaNeticesi && mutasiyaNeticesi.returnEndsAtMs,
      info,
      payloadJson: JSON.stringify(result)
    });
  }
  catch (xeta) {
    console.error("[XERITE_RESURS_TOPLAMA]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Xəritə resurs əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  legacyToplamaMutasiyasiniTetbiqEt,
  xeriteResursToplamaMesajiniEmalEt
};