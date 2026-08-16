"use strict";

const {
  qosunTelimOnBaxisiniHazirla,
  qosunTelimleriniYekunlasdir,
  qosunTeliminiBaslat,
  qosunTelimStatusunuHazirla,
  qosunKataloquClientUcunHazirla
} = require("./qosun_telimi_sistemi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

const MESAJLAR = new Set([
  "troop_catalog_request",
  "troop_training_preview_request",
  "troop_training_status_request",
  "train_unit_request"
]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : "";
}

function gonder(kontekst, type, melumat) {
  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: kontekst.nowMs()
  });
}

function qosunTelimiMutasiyasiniTetbiqEt(state, msg, nowMs = Date.now(), emeliyyat = "train") {
  const yekunlasma = qosunTelimleriniYekunlasdir(state, nowMs);

  if (emeliyyat === "status") {
    const status = qosunTelimStatusunuHazirla(state, nowMs);
    return {
      success: true,
      deyisdi: !!(yekunlasma.deyisdi || status.deyisdi),
      status,
      tamamlananlar: yekunlasma.tamamlananlar || []
    };
  }

  if (emeliyyat === "preview") {
    const preview = qosunTelimOnBaxisiniHazirla(
      state,
      msg && msg.buildingInstanceId,
      msg && msg.unitId,
      msg && msg.count
    );

    return {
      success: !!(preview && preview.success === true),
      deyisdi: yekunlasma.deyisdi === true,
      message: preview && preview.message ? preview.message : "",
      reason: preview && preview.reason ? preview.reason : "",
      preview,
      tamamlananlar: yekunlasma.tamamlananlar || []
    };
  }

  const start = qosunTeliminiBaslat(
    state,
    msg && msg.buildingInstanceId,
    msg && msg.unitId,
    msg && msg.count,
    nowMs
  );

  if (!start || start.success !== true) {
    return {
      success: false,
      deyisdi: yekunlasma.deyisdi === true,
      reason: start && start.reason ? start.reason : "training_start_failed",
      message: start && start.message
        ? start.message
        : "Qoşun hazırlığı başlatmaq mümkün olmadı.",
      preview: start && start.preview ? start.preview : null,
      tamamlananlar: yekunlasma.tamamlananlar || []
    };
  }

  return {
    success: true,
    deyisdi: true,
    queue: start.queue,
    durationMs: start.durationMs,
    paidCost: start.paidCost,
    preview: start.preview,
    tamamlananlar: yekunlasma.tamamlananlar || []
  };
}

async function qosunTelimiMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!MESAJLAR.has(type)) return false;

  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    gonder(kontekst, "error", {
      message: "Qoşun sistemi üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const canliState = kontekst.getOrCreatePlayerState(playerId);
    const now = kontekst.nowMs();

    if (type === "troop_catalog_request") {
      const catalog = qosunKataloquClientUcunHazirla();
      gonder(kontekst, "troop_catalog_result", {
        success: true,
        playerId,
        catalog,
        payloadJson: JSON.stringify(catalog)
      });
      return true;
    }

    const emeliyyat = type === "troop_training_status_request"
      ? "status"
      : type === "troop_training_preview_request"
        ? "preview"
        : "train";

    const netice = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      canliState,
      async kilidliState => qosunTelimiMutasiyasiniTetbiqEt(
        kilidliState,
        kontekst.msg,
        now,
        emeliyyat
      )
    );

    if (type === "troop_training_status_request") {
      gonder(kontekst, "troop_training_status_result", {
        success: !!(netice && netice.success === true),
        playerId,
        status: netice && netice.status ? netice.status : null,
        payloadJson: JSON.stringify(netice && netice.status ? netice.status : {})
      });

      if (netice && netice.deyisdi === true) {
        gonder(kontekst, "state", {
          playerId,
          payloadJson: JSON.stringify(kontekst.makeClientState(canliState))
        });
      }
      return true;
    }

    if (type === "troop_training_preview_request") {
      gonder(kontekst, "troop_training_preview_result", {
        success: !!(netice && netice.success === true),
        playerId,
        reason: netice && netice.reason ? netice.reason : "",
        message: netice && netice.message ? netice.message : "",
        preview: netice && netice.preview ? netice.preview : null,
        payloadJson: JSON.stringify(netice && netice.preview ? netice.preview : {})
      });

      if (netice && netice.deyisdi === true) {
        gonder(kontekst, "state", {
          playerId,
          payloadJson: JSON.stringify(kontekst.makeClientState(canliState))
        });
      }
      return true;
    }

    if (!netice || netice.success !== true) {
      gonder(kontekst, "error", {
        reason: netice && netice.reason ? netice.reason : "training_start_failed",
        message: netice && netice.message
          ? netice.message
          : "Qoşun hazırlığı başlatmaq mümkün olmadı.",
        preview: netice && netice.preview ? netice.preview : null
      });

      if (netice && netice.deyisdi === true) {
        gonder(kontekst, "state", {
          playerId,
          payloadJson: JSON.stringify(kontekst.makeClientState(canliState))
        });
      }
      return true;
    }

    console.log("[TRAIN_STARTED_PG]", {
      playerId,
      queue: netice.queue,
      paidCost: netice.paidCost,
      tamamlananSayi: Array.isArray(netice.tamamlananlar)
        ? netice.tamamlananlar.length
        : 0
    });

    gonder(kontekst, "train_started", {
      success: true,
      playerId,
      queue: netice.queue,
      durationMs: netice.durationMs,
      paidCost: netice.paidCost,
      payloadJson: JSON.stringify(netice.queue || {})
    });

    gonder(kontekst, "state", {
      playerId,
      payloadJson: JSON.stringify(kontekst.makeClientState(canliState))
    });
  }
  catch (xeta) {
    console.error("[QOSUN_TELIMI]", xeta);
    gonder(kontekst, "error", {
      message: "Qoşun əməliyyatı serverdə tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  qosunTelimiMutasiyasiniTetbiqEt,
  qosunTelimiMesajiniEmalEt
};
