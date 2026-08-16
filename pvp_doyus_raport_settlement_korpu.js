"use strict";

const {
  pvpDoyusunuIkiStateUzerindeTetbiqEt
} = require("./pvp_doyus_settlement_sistemi");
const {
  ikiOyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./iki_oyuncu_state_mutasiya_postgres");
const {
  pvpIkiTerefRaportlariniYarat
} = require("./pvp_doyus_raport_sistemi");
const {
  qalibPvpHucumunuTetbiqEt
} = require("./pvp_seher_davamliliq_sistemi");
const {
  zeroingiTetbiqEt
} = require("./pvp_zeroing_yerdeyisme_sistemi");

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

async function pvpDoyusSettlementVeRaportlariniPostgresIleIcraEt(
  attacker,
  defender,
  convoyId,
  operationId = "",
  nowMs = Date.now(),
  secimler = null
) {
  const runner = secimler && typeof secimler.ikiOyuncuMutasiya === "function"
    ? secimler.ikiOyuncuMutasiya
    : ikiOyuncuStateMutasiyasiniPostgresIleIcraEt;
  const runnerSecimleri = secimler && secimler.runnerSecimleri
    ? secimler.runnerSecimleri
    : null;

  return await runner(attacker, defender, async (stateler, trx) => {
    const attackerId = metnAl(attacker && attacker.playerId, 128);
    const defenderId = metnAl(defender && defender.playerId, 128);
    const attackerState = stateler[attackerId];
    const defenderState = stateler[defenderId];

    const settlement = pvpDoyusunuIkiStateUzerindeTetbiqEt(
      attackerState,
      defenderState,
      convoyId,
      operationId,
      nowMs
    );

    if (!settlement || settlement.success !== true) return settlement;
    if (settlement.alreadyResolved === true) return settlement;

    let cityImpact = null;
    let zeroingRelocation = null;
    if (settlement.combat && settlement.combat.attackerVictory === true) {
      cityImpact = qalibPvpHucumunuTetbiqEt(defenderState, nowMs);
      settlement.cityImpact = cityImpact;

      if (cityImpact.zeroed === true) {
        zeroingRelocation = await zeroingiTetbiqEt(
          defenderState,
          defenderId,
          trx && trx.client,
          nowMs
        );
        settlement.zeroingRelocation = zeroingRelocation;
      }

      if (settlement.operation && settlement.operation.result) {
        settlement.operation.result.cityImpact = JSON.parse(JSON.stringify(cityImpact));
        settlement.operation.result.zeroingRelocation = zeroingRelocation
          ? JSON.parse(JSON.stringify(zeroingRelocation))
          : null;
      }
    }

    const reports = pvpIkiTerefRaportlariniYarat(
      attackerState,
      defenderState,
      settlement,
      nowMs
    );

    if (!reports || reports.success !== true) {
      throw new Error("PvP döyüş raportları atomik settlement daxilində yaradıla bilmədi.");
    }

    settlement.reports = reports;
    settlement.deyisdi = true;
    settlement.deyisenPlayerIdleri = [attackerId, defenderId];

    if (settlement.operation && settlement.operation.result) {
      settlement.operation.result.attackerReportId = reports.attackerReport
        ? reports.attackerReport.reportId
        : "";
      settlement.operation.result.defenderReportId = reports.defenderReport
        ? reports.defenderReport.reportId
        : "";
    }

    return settlement;
  }, runnerSecimleri);
}

module.exports = {
  pvpDoyusSettlementVeRaportlariniPostgresIleIcraEt
};
