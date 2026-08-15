"use strict";

const {
  qosunTelimleriniYekunlasdir,
  qosunTeliminiBaslat
} = require("./qosun_telimi_sistemi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

const MESAJLAR = new Set([
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

function qosunTelimiMutasiyasiniTetbiqEt(
  state,
  msg,
  nowMs = Date.now()
) {
  const yekunlasma = qosunTelimleriniYekunlasdir(
    state,
    nowMs
  );

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
      deyisdi: !!(yekunlasma && yekunlasma.deyisdi === true),
      message: start && start.message
        ? start.message
        : "Training could not be started",
      tamamlananlar: yekunlasma && Array.isArray(yekunlasma.tamamlananlar)
        ? yekunlasma.tamamlananlar
        : []
    };
  }

  return {
    success: true,
    deyisdi: true,
    queue: start.queue,
    durationMs: start.durationMs,
    tamamlananlar: yekunlasma && Array.isArray(yekunlasma.tamamlananlar)
      ? yekunlasma.tamamlananlar
      : []
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
      message: "Not authed. Send auth first."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const canliState = kontekst.getOrCreatePlayerState(playerId);
    const now = kontekst.nowMs();

    const netice = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      canliState,
      async kilidliState => {
        return qosunTelimiMutasiyasiniTetbiqEt(
          kilidliState,
          kontekst.msg,
          now
        );
      }
    );

    if (!netice || netice.success !== true) {
      gonder(kontekst, "error", {
        message: netice && netice.message
          ? netice.message
          : "Training could not be started"
      });

      // Yeni training start alınmasa belə əvvəlki queue bu request zamanı
      // tamamlanmış ola bilər. Həmin qoşun DB-yə yazılıbsa Unity də yeni state-i görsün.
      if (netice && netice.deyisdi === true) {
        gonder(kontekst, "state", {
          playerId,
          payloadJson: JSON.stringify(
            kontekst.makeClientState(canliState)
          )
        });
      }

      return true;
    }

    console.log("[TRAIN_STARTED_PG]", {
      playerId,
      queue: netice.queue,
      tamamlananSayi: Array.isArray(netice.tamamlananlar)
        ? netice.tamamlananlar.length
        : 0
    });

    gonder(kontekst, "train_started", {
      playerId,
      payloadJson: JSON.stringify(netice.queue || {})
    });

    gonder(kontekst, "state", {
      playerId,
      payloadJson: JSON.stringify(
        kontekst.makeClientState(canliState)
      )
    });
  }
  catch (xeta) {
    console.error("[QOSUN_TELIMI]", xeta);
    gonder(kontekst, "error", {
      message: "Training could not be completed on server"
    });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  qosunTelimiMutasiyasiniTetbiqEt,
  qosunTelimiMesajiniEmalEt
};
