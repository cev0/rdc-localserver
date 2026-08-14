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
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

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
  return v == null ? null : JSON.parse(JSON.stringify(v));
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

    if (type === "battle_report_list_request") {
      const items = raportSiyahisiniHazirla(state);
      gonder(kontekst, resultType, {
        success: true,
        playerId,
        items,
        unreadCount: items.filter(x => x && x.isRead !== true).length,
        pendingRewardCount: items.filter(x => x && x.resourceRewardClaimPending === true).length,
        payloadJson: JSON.stringify(items)
      });
      return true;
    }

    const reportId = metnAl(kontekst.msg && kontekst.msg.reportId, 220);

    if (type === "battle_report_detail_request") {
      const report = raportDetaliHazirla(state, reportId);
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
      const preview = raportResursMukafatiPreview(state, reportId);
      gonder(kontekst, resultType, {
        success: preview && preview.success === true,
        playerId,
        preview,
        message: preview && preview.message ? preview.message : "",
        payloadJson: JSON.stringify(preview)
      });
      return true;
    }

    const evvelkiRaportlar = kopyala(state.doyusRaportlari || null);
    const evvelkiResources = kopyala(state.resources || null);
    let result;

    if (type === "battle_report_claim_reward_request") {
      result = raportResursMukafatiniAl(state, reportId, kontekst.nowMs());
    }
    else if (type === "battle_report_mark_read_request") {
      result = raportuOxunmusEt(state, reportId, kontekst.nowMs());
    }
    else if (type === "battle_report_save_request") {
      result = raportuSaxla(
        state,
        reportId,
        kontekst.msg && kontekst.msg.isSaved === true,
        kontekst.nowMs()
      );
    }
    else {
      result = raportuSil(state, reportId);
    }

    if (!result || result.success !== true) {
      state.doyusRaportlari = evvelkiRaportlar;
      state.resources = evvelkiResources;
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        ...((result && typeof result === "object") ? result : {}),
        message: result && result.message ? result.message : "Raport əməliyyatı tamamlanmadı."
      });
      return true;
    }

    try {
      await oyunStateIniYaddaSaxla(playerId, state);
    }
    catch (xeta) {
      state.doyusRaportlari = evvelkiRaportlar;
      state.resources = evvelkiResources;
      throw xeta;
    }

    const items = raportSiyahisiniHazirla(state);
    gonder(kontekst, resultType, {
      success: true,
      playerId,
      ...result,
      report: raportDetaliHazirla(state, reportId),
      items,
      unreadCount: items.filter(x => x && x.isRead !== true).length,
      pendingRewardCount: items.filter(x => x && x.resourceRewardClaimPending === true).length,
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
  doyusRaportMesajiniEmalEt
};
