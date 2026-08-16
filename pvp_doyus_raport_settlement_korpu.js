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
const {
  pvpZeroingKonvoyRecalliniPostCommitIcraEt
} = require("./pvp_zeroing_konvoy_recall_postcommit");
const {
  pvpResursTalaniTetbiqEt
} = require("./pvp_resurs_talani_sistemi");

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
  const postCommitRecallFn = secimler && typeof secimler.postCommitRecallFn === "function"
    ? secimler.postCommitRecallFn
    : pvpZeroingKonvoyRecalliniPostCommitIcraEt;

  const defenderId = metnAl(defender && defender.playerId, 128);

  const settlement = await runner(attacker, defender, async (stateler, trx) => {
    const attackerId = metnAl(attacker && attacker.playerId, 128);
    const lockedDefenderId = metnAl(defender && defender.playerId, 128);
    const attackerState = stateler[attackerId];
    const defenderState = stateler[lockedDefenderId];

    const innerSettlement = pvpDoyusunuIkiStateUzerindeTetbiqEt(
      attackerState,
      defenderState,
      convoyId,
      operationId,
      nowMs
    );

    if (!innerSettlement || innerSettlement.success !== true) return innerSettlement;
    if (innerSettlement.alreadyResolved === true) return innerSettlement;

    let cityImpact = null;
    let zeroingRelocation = null;
    let plunder = null;
    if (innerSettlement.combat && innerSettlement.combat.attackerVictory === true) {
      // Defender resursu burada, eyni iki-oyunçulu transaction daxilində çıxılır.
      // Hücumçu tərəfdə həmin resurs birbaşa bazaya yazılmır; konvoyun
      // carriedResources sahəsinə keçir və geri dönüş tamamlananda bazaya teslim olunur.
      plunder = pvpResursTalaniTetbiqEt(
        attackerState,
        defenderState,
        convoyId,
        nowMs
      );
      innerSettlement.plunder = plunder;

      cityImpact = qalibPvpHucumunuTetbiqEt(defenderState, nowMs);
      innerSettlement.cityImpact = cityImpact;

      if (cityImpact.zeroed === true) {
        zeroingRelocation = await zeroingiTetbiqEt(
          defenderState,
          lockedDefenderId,
          trx && trx.client,
          nowMs
        );
        innerSettlement.zeroingRelocation = zeroingRelocation;
      }

      if (innerSettlement.operation && innerSettlement.operation.result) {
        innerSettlement.operation.result.plunder = plunder
          ? JSON.parse(JSON.stringify(plunder))
          : null;
        innerSettlement.operation.result.cityImpact = JSON.parse(JSON.stringify(cityImpact));
        innerSettlement.operation.result.zeroingRelocation = zeroingRelocation
          ? JSON.parse(JSON.stringify(zeroingRelocation))
          : null;
      }
    }

    const reports = pvpIkiTerefRaportlariniYarat(
      attackerState,
      defenderState,
      innerSettlement,
      nowMs
    );

    if (!reports || reports.success !== true) {
      throw new Error("PvP döyüş raportları atomik settlement daxilində yaradıla bilmədi.");
    }

    innerSettlement.reports = reports;
    innerSettlement.deyisdi = true;
    innerSettlement.deyisenPlayerIdleri = [attackerId, lockedDefenderId];

    if (innerSettlement.operation && innerSettlement.operation.result) {
      innerSettlement.operation.result.attackerReportId = reports.attackerReport
        ? reports.attackerReport.reportId
        : "";
      innerSettlement.operation.result.defenderReportId = reports.defenderReport
        ? reports.defenderReport.reportId
        : "";
    }

    return innerSettlement;
  }, runnerSecimleri);

  // Bu nöqtəyə yalnız iki-oyunçulu transaction COMMIT-dən sonra çatılır.
  // Konvoy recall gather/enemy/shared-runtime yan təsirləri yarada bildiyi üçün
  // qəsdən əsas PvP transaction daxilində icra edilmir.
  if (
    settlement &&
    settlement.success === true &&
    settlement.zeroingRelocation &&
    settlement.zeroingRelocation.zeroed === true &&
    defenderId
  ) {
    try {
      settlement.zeroingConvoyRecall = await postCommitRecallFn(defenderId, nowMs);
    }
    catch (xeta) {
      // PvP/zeroing artıq commit olub. Burada throw etmək client-ə yanlış şəkildə
      // bütün döyüş rollback olub təsiri verərdi. Pending flag snapshot-da qalır
      // və recall təhlükəsiz şəkildə retry edilə bilər.
      console.error("[PVP_ZEROING_POST_COMMIT_RECALL]", xeta);
      settlement.zeroingConvoyRecall = {
        success: false,
        retryPending: true,
        message: "Zeroing tamamlandı, konvoyların geri çağırılması təkrar yoxlanacaq."
      };
    }
  }

  return settlement;
}

module.exports = {
  pvpDoyusSettlementVeRaportlariniPostgresIleIcraEt
};
