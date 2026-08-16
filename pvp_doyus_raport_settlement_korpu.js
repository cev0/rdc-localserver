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

  return await runner(attacker, defender, async stateler => {
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

    // Şəhər zərəri yalnız real hücumçu qələbəsində tətbiq olunur və casualty/report
    // ilə eyni iki-oyunçulu PostgreSQL transaction daxilində qalır.
    let cityImpact = null;
    if (settlement.combat && settlement.combat.attackerVictory === true) {
      cityImpact = qalibPvpHucumunuTetbiqEt(defenderState, nowMs);
      settlement.cityImpact = cityImpact;
      if (settlement.operation && settlement.operation.result) {
        settlement.operation.result.cityImpact = JSON.parse(JSON.stringify(cityImpact));
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
