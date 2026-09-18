"use strict";

const {
  pvpDoyusunuIkiStateUzerindeTetbiqEt
} = require("./pvp_doyus_settlement_sistemi");
const {
  worldStateIkiOyuncuMutasiyasiniPostgresIleIcraEt
} = require("./world_state_iki_oyuncu_mutasiya_postgres");
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
const {
  PVP_BAZA_STATUSLARI
} = require("./pvp_baza_hedef_qaydasi");
const {
  stateTeminEt
} = require("./konvoy_emeliyyat_sistemi");

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n)
    ? Math.max(0, Math.trunc(n))
    : 0;
}

function reqemAl(v) {
  const n = Number(v);
  return Number.isFinite(n)
    ? n
    : null;
}

function kopyala(v) {
  return v == null
    ? null
    : JSON.parse(JSON.stringify(v));
}

function settlementdenEvvelHedefiYoxla(
  attackerState,
  defenderState,
  convoyId,
  defenderId,
  operationId = ""
) {
  const id =
    metnAl(
      convoyId,
      64
    );

  const emeliyyatlar =
    stateTeminEt(
      attackerState
    );

  const operation =
    emeliyyatlar &&
    emeliyyatlar.activeByConvoy
      ? emeliyyatlar.activeByConvoy[id]
      : null;

  if (
    !operation ||
    typeof operation !== "object"
  ) {
    return {
      yoxlanmalidir: false,
      present: null,
      operation: null
    };
  }

  const requestedOperationId =
    metnAl(
      operationId,
      220
    );

  const currentOperationId =
    metnAl(
      operation.operationId,
      220
    );

  const operationDefenderId =
    metnAl(
      operation.targetPlayerId ||
      operation.targetId,
      128
    );

  const status =
    metnAl(
      operation.status,
      64
    );

  if (
    operation.battleResolved === true ||
    status !==
      PVP_BAZA_STATUSLARI.DOYUSE_HAZIR ||
    operation.battleAllowed !== true ||
    (
      requestedOperationId &&
      requestedOperationId !==
        currentOperationId
    ) ||
    (
      operationDefenderId &&
      operationDefenderId !==
        metnAl(
          defenderId,
          128
        )
    )
  ) {
    return {
      yoxlanmalidir: false,
      present: null,
      operation
    };
  }

  const targetSnapshot =
    operation.targetSnapshot &&
    typeof operation.targetSnapshot ===
      "object"
      ? operation.targetSnapshot
      : null;

  const expectedStateId =
    Math.max(
      1,
      tamEded(
        operation.stateId ||
        (
          targetSnapshot &&
          targetSnapshot.stateId
        )
      ) || 1
    );

  const expectedX =
    reqemAl(
      targetSnapshot &&
      targetSnapshot.targetX != null
        ? targetSnapshot.targetX
        : operation.targetX
    );

  const expectedZ =
    reqemAl(
      targetSnapshot &&
      targetSnapshot.targetZ != null
        ? targetSnapshot.targetZ
        : operation.targetZ
    );

  if (
    expectedX === null ||
    expectedZ === null
  ) {
    throw new Error(
      "PvP settlement üçün kilidlənmiş hədəf koordinatları yoxdur."
    );
  }

  const placement =
    defenderState &&
    defenderState.worldPlacement;

  const actualStateId =
    Math.max(
      0,
      tamEded(
        placement &&
        placement.stateId
      )
    );

  const actualX =
    reqemAl(
      placement &&
      placement.baseX
    );

  const actualZ =
    reqemAl(
      placement &&
      placement.baseZ
    );

  const present =
    actualStateId ===
      expectedStateId &&
    actualX !== null &&
    actualZ !== null &&
    actualX ===
      expectedX &&
    actualZ ===
      expectedZ;

  return {
    yoxlanmalidir: true,
    present,
    operation,
    expectedStateId,
    expectedX,
    expectedZ,
    actualStateId,
    actualX,
    actualZ
  };
}

function relokasiyaKampiniTetbiqEt(
  operation,
  nowMs = Date.now()
) {
  if (
    !operation ||
    typeof operation !== "object"
  ) {
    throw new Error(
      "PvP relocation kampı üçün operation yoxdur."
    );
  }

  const now =
    tamEded(
      nowMs
    ) ||
    Date.now();

  operation.status =
    PVP_BAZA_STATUSLARI
      .TERK_EDILMIS_HEDEFDE_KAMP;

  operation.battleAllowed =
    false;

  operation.abandonedTarget =
    true;

  operation.campReason =
    "target_relocated_before_settlement";

  operation.targetStillPresentAtSettlement =
    false;

  operation.defenderEscapedByRelocation =
    true;

  operation.settlementRevalidatedAtMs =
    now;

  operation.result = {
    type:
      "pvp_arrival",
    outcome:
      "camp",
    reason:
      operation.campReason,
    targetStillPresent:
      false,
    battleAllowed:
      false,
    revalidatedAtSettlement:
      true,
    resolvedAtMs:
      now
  };

  return {
    success: true,
    deyisdi: true,
    battleSkipped: true,
    reason:
      operation.campReason,
    operation:
      kopyala(
        operation
      )
  };
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
    : worldStateIkiOyuncuMutasiyasiniPostgresIleIcraEt;
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

    /*
     * Arrival transaction ilə battle settlement iki ayrı COMMIT-dirsə,
     * aradakı çox kiçik pəncərədə defender teleport edə bilər.
     * Shared-world State lock burada yenidən tutulduğu üçün battle-dan
     * dərhal əvvəl authoritative defender mövqeyi bir daha yoxlanılır.
     * Last Shelter tipli "relocated target is not followed" qaydası belə
     * race şəraitində də qorunur.
     */
    const targetCheck =
      settlementdenEvvelHedefiYoxla(
        attackerState,
        defenderState,
        convoyId,
        lockedDefenderId,
        operationId
      );

    if (
      targetCheck.yoxlanmalidir &&
      targetCheck.present !== true
    ) {
      const camp =
        relokasiyaKampiniTetbiqEt(
          targetCheck.operation,
          nowMs
        );

      camp.deyisenPlayerIdleri = [
        attackerId
      ];

      return camp;
    }

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
          nowMs,
          {
            worldStateLockHeld:
              !!(trx && trx.worldStateLockHeld),
            worldStateId:
              trx && trx.worldStateId
          }
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
  settlementdenEvvelHedefiYoxla,
  relokasiyaKampiniTetbiqEt,
  pvpDoyusSettlementVeRaportlariniPostgresIleIcraEt
};
