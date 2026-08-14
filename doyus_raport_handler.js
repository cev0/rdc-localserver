"use strict";

const {
  raportSiyahisiniHazirla,
  raportDetaliHazirla,
  raportuOxunmusEt,
  raportuSaxla,
  raportuSil
} = require("./doyus_raport_sistemi");
const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const MESAJLAR = new Set([
  "battle_report_list_request",
  "battle_report_detail_request",
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

    const evvelki = JSON.parse(JSON.stringify(state.doyusRaportlari || null));
    let result;

    if (type === "battle_report_mark_read_request") {
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
      state.doyusRaportlari = evvelki;
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        message: result && result.message ? result.message : "Raport əməliyyatı tamamlanmadı."
      });
      return true;
    }

    try {
      await oyunStateIniYaddaSaxla(playerId, state);
    }
    catch (xeta) {
      state.doyusRaportlari = evvelki;
      throw xeta;
    }

    gonder(kontekst, resultType, {
      success: true,
      playerId,
      ...result,
      items: raportSiyahisiniHazirla(state),
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
