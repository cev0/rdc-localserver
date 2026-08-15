"use strict";

const {
  raportSiyahisiniHazirla,
  raportDetaliHazirla,
  raportuOxunmusEt,
  raportuSaxla,
  raportuSil
} = require("./doyus_raport_sistemi");
const {
  raportResursMukafatiPreview,
  raportResursMukafatiniAl
} = require("./doyus_raport_mukafat_sistemi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

const MESAJLAR = new Set([
  "battle_report_list_request",
  "battle_report_detail_request",
  "battle_report_reward_preview_request",
  "battle_report_claim_reward_request",
  "battle_report_mark_read_request",
  "battle_report_save_request",
  "battle_report_delete_request"
]);

function metnAl(v, max = 220) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function gonder(k, type, data) {
  k.send(k.ws, {
    type,
    ...data,
    serverTimeUnixMs: k.nowMs()
  });
}

function kopyala(v) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return JSON.parse(JSON.stringify(v));
}

function saheniYedekle(state, acar) {
  return {
    varIdi: Object.prototype.hasOwnProperty.call(state, acar),
    deyer: kopyala(state[acar])
  };
}

function saheniBerpaEt(state, acar, yedek) {
  if (yedek && yedek.varIdi) {
    state[acar] = kopyala(yedek.deyer);
  }
  else {
    delete state[acar];
  }
}

function raportMutasiyaYedeyiniAl(state) {
  return {
    doyusRaportlari: saheniYedekle(state, "doyusRaportlari"),
    resources: saheniYedekle(state, "resources")
  };
}

function raportMutasiyaYedeyiniBerpaEt(state, yedek) {
  if (!state || !yedek) return;
  saheniBerpaEt(state, "doyusRaportlari", yedek.doyusRaportlari);
  saheniBerpaEt(state, "resources", yedek.resources);
}

function raportMutasiyaImzasi(state) {
  return JSON.stringify({
    doyusRaportlari: state && state.doyusRaportlari,
    resources: state && state.resources
  });
}

function readStateKopyasi(state) {
  return kopyala(state) || {};
}

function raportReadNeticesiniHazirla(state, reportId) {
  const readState = readStateKopyasi(state);
  const items = raportSiyahisiniHazirla(readState);

  return {
    items,
    report: reportId ? raportDetaliHazirla(readState, reportId) : null,
    unreadCount: items.filter(x => x && x.isRead !== true).length,
    pendingRewardCount: items.filter(
      x => x && x.resourceRewardClaimPending === true
    ).length
  };
}

function doyusRaportMutasiyasiniTetbiqEt(
  state,
  type,
  msg,
  nowMs = Date.now()
) {
  const reportId = metnAl(msg && msg.reportId, 220);
  const yedek = raportMutasiyaYedeyiniAl(state);
  const evvelkiImza = raportMutasiyaImzasi(state);
  let result;

  try {
    if (type === "battle_report_claim_reward_request") {
      result = raportResursMukafatiniAl(state, reportId, nowMs);
    }
    else if (type === "battle_report_mark_read_request") {
      result = raportuOxunmusEt(state, reportId, nowMs);
    }
    else if (type === "battle_report_save_request") {
      result = raportuSaxla(
        state,
        reportId,
        msg && msg.isSaved === true,
        nowMs
      );
    }
    else if (type === "battle_report_delete_request") {
      result = raportuSil(state, reportId);
    }
    else {
      return {
        success: false,
        deyisdi: false,
        message: "Naməlum döyüş raportu mutation sorğusu."
      };
    }
  }
  catch (xeta) {
    raportMutasiyaYedeyiniBerpaEt(state, yedek);
    return {
      success: false,
      deyisdi: false,
      message: "Raport əməliyyatı hesablana bilmədi.",
      daxiliXeta: xeta && xeta.message ? xeta.message : String(xeta)
    };
  }

  if (!result || result.success !== true) {
    raportMutasiyaYedeyiniBerpaEt(state, yedek);
    return {
      success: false,
      deyisdi: false,
      result: result && typeof result === "object" ? kopyala(result) : null,
      message: result && result.message
        ? result.message
        : "Raport əməliyyatı tamamlanmadı."
    };
  }

  const deyisdi = evvelkiImza !== raportMutasiyaImzasi(state);

  return {
    success: true,
    deyisdi,
    result: kopyala(result)
  };
}

async function doyusRaportMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!MESAJLAR.has(type)) return false;

  const resultType = type.replace(/_request$/, "_result");
  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      message: "Döyüş raportları üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);

    // Read sorğuları legacy raport normalizasiyasına görə state-i dəyişə bilər.
    // Ona görə bütün read-lər clone üzərində hesablanır və authoritative RAM-a toxunmur.
    if (type === "battle_report_list_request") {
      const read = raportReadNeticesiniHazirla(state, "");
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        items: read.items,
        unreadCount: read.unreadCount,
        pendingRewardCount: read.pendingRewardCount,
        payloadJson: JSON.stringify(read.items)
      });
      return true;
    }

    const reportId = metnAl(kontekst.msg && kontekst.msg.reportId, 220);

    if (type === "battle_report_detail_request") {
      const report = raportDetaliHazirla(readStateKopyasi(state), reportId);
      gonder(kontekst, resultType, {
        success: !!report,
        playerId,
        report,
        message: report ? "" : "Döyüş raportu tapılmadı.",
        payloadJson: JSON.stringify(report)
      });
      return true;
    }

    if (type === "battle_report_reward_preview_request") {
      const preview = raportResursMukafatiPreview(
        readStateKopyasi(state),
        reportId,
        kontekst.nowMs()
      );
      gonder(kontekst, resultType, {
        success: preview && preview.success === true,
        playerId,
        preview,
        message: preview && preview.message ? preview.message : "",
        payloadJson: JSON.stringify(preview)
      });
      return true;
    }

    const mutasiyaNeticesi = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      state,
      async kilidliState => {
        return doyusRaportMutasiyasiniTetbiqEt(
          kilidliState,
          type,
          kontekst.msg,
          kontekst.nowMs()
        );
      }
    );

    if (mutasiyaNeticesi && mutasiyaNeticesi.daxiliXeta) {
      console.error("[DOYUS_RAPORT] Mutation hesablanma xətası:", {
        playerId,
        message: mutasiyaNeticesi.daxiliXeta
      });
    }

    if (!mutasiyaNeticesi || mutasiyaNeticesi.success !== true) {
      const result = mutasiyaNeticesi && mutasiyaNeticesi.result
        ? mutasiyaNeticesi.result
        : {};

      gonder(kontekst, resultType, {
        success: false,
        playerId,
        ...result,
        message: mutasiyaNeticesi && mutasiyaNeticesi.message
          ? mutasiyaNeticesi.message
          : (result.message || "Raport əməliyyatı tamamlanmadı.")
      });
      return true;
    }

    const result = mutasiyaNeticesi.result || {};
    const read = raportReadNeticesiniHazirla(state, reportId);

    gonder(kontekst, resultType, {
      success: true,
      playerId,
      ...result,
      report: read.report,
      items: read.items,
      unreadCount: read.unreadCount,
      pendingRewardCount: read.pendingRewardCount,
      payloadJson: JSON.stringify(result)
    });
  }
  catch (xeta) {
    console.error("[DOYUS_RAPORT]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Döyüş raportu əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  doyusRaportMutasiyasiniTetbiqEt,
  doyusRaportMesajiniEmalEt
};
