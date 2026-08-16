"use strict";

const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");
const {
  pvpBazaHucumCatmaMutasiyasiniIcraEt,
  pvpAktivHucumEmeliyyatiniTap
} = require("./pvp_baza_hucum_catma_xidmeti");
const {
  pvpDoyusSettlementVeRaportlariniPostgresIleIcraEt
} = require("./pvp_doyus_raport_settlement_korpu");
const {
  pvpGeriDonusuYekunlasdir,
  pvpStatusMelumatiniHazirla
} = require("./pvp_baza_live_handler");
const {
  PVP_BAZA_STATUSLARI
} = require("./pvp_baza_hedef_qaydasi");

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function gonder(k, type, data) {
  k.send(k.ws, {
    type,
    ...data,
    serverTimeUnixMs: k.nowMs()
  });
}

async function pvpBazaReportStatusMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (type !== "pvp_base_attack_status_request") return false;

  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    gonder(kontekst, "pvp_base_attack_status_result", {
      success: false,
      pvpEnabled: true,
      message: "PvP statusu üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    const state = kontekst.getOrCreatePlayerState(playerId);
    const now = kontekst.nowMs();
    const convoyId = metnAl(kontekst && kontekst.msg && kontekst.msg.convoyId, 64);
    const operationId = metnAl(kontekst && kontekst.msg && kontekst.msg.operationId, 220);

    if (!convoyId) {
      gonder(kontekst, "pvp_base_attack_status_result", {
        success: false,
        pvpEnabled: true,
        playerId,
        message: "convoyId tələb olunur."
      });
      return true;
    }

    let deyisdi = false;
    let settlement = null;

    const progress = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      state,
      async (kilidliState, trx) => {
        const arrival = await pvpBazaHucumCatmaMutasiyasiniIcraEt(
          kilidliState,
          playerId,
          { convoyId, operationId },
          trx.client,
          now
        );
        if (!arrival || arrival.success !== true) return arrival;

        const finish = pvpGeriDonusuYekunlasdir(
          kilidliState,
          convoyId,
          operationId,
          now
        );
        if (!finish.success) return finish;

        return {
          success: true,
          deyisdi: arrival.deyisdi === true || finish.deyisdi === true,
          arrival,
          finish
        };
      }
    );

    if (!progress || progress.success !== true) {
      gonder(kontekst, "pvp_base_attack_status_result", {
        success: false,
        pvpEnabled: true,
        playerId,
        blocker: progress && progress.blocker ? progress.blocker : "",
        message: progress && progress.message
          ? progress.message
          : "PvP statusu yenilənmədi."
      });
      return true;
    }

    deyisdi = progress.deyisdi === true;

    const active = pvpAktivHucumEmeliyyatiniTap(state, convoyId);
    if (
      active &&
      metnAl(active.status, 64) === PVP_BAZA_STATUSLARI.DOYUSE_HAZIR &&
      active.battleAllowed === true &&
      active.battleResolved !== true
    ) {
      const defenderId = metnAl(active.targetPlayerId || active.targetId, 128);
      if (!defenderId || defenderId === playerId) {
        throw new Error("PvP settlement üçün defender playerId düzgün deyil.");
      }

      settlement = await pvpDoyusSettlementVeRaportlariniPostgresIleIcraEt(
        { playerId, cariState: state },
        { playerId: defenderId, cariState: null },
        convoyId,
        active.operationId,
        now
      );

      deyisdi = deyisdi || !!(settlement && settlement.deyisdi === true);
    }

    const finishAfterBattle = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      state,
      async kilidliState => pvpGeriDonusuYekunlasdir(
        kilidliState,
        convoyId,
        operationId,
        now
      )
    );
    deyisdi = deyisdi || !!(finishAfterBattle && finishAfterBattle.deyisdi === true);

    const info = pvpStatusMelumatiniHazirla(
      state,
      convoyId,
      operationId,
      now,
      { settlement }
    );

    if (settlement && settlement.reports) {
      info.reports = {
        attackerReportId: settlement.reports.attackerReport
          ? settlement.reports.attackerReport.reportId
          : "",
        defenderReportId: settlement.reports.defenderReport
          ? settlement.reports.defenderReport.reportId
          : ""
      };
    }

    gonder(kontekst, "pvp_base_attack_status_result", {
      success: true,
      pvpEnabled: true,
      playerId,
      info,
      payloadJson: JSON.stringify(info)
    });

    if (deyisdi) {
      gonder(kontekst, "state", {
        playerId,
        payloadJson: JSON.stringify(kontekst.makeClientState(state))
      });
    }
  }
  catch (xeta) {
    console.error("[PVP_BAZA_REPORT_STATUS]", xeta);
    gonder(kontekst, "pvp_base_attack_status_result", {
      success: false,
      pvpEnabled: true,
      playerId,
      message: "PvP döyüşü və raportları serverdə atomik şəkildə tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  pvpBazaReportStatusMesajiniEmalEt
};
