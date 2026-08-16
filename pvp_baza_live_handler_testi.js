"use strict";

const assert = require("assert");
const {
  previewCavabiniAktivEt,
  pvpCanliQaydasiniHazirla,
  pvpGeriDonusuBaslat,
  pvpGeriDonusuYekunlasdir,
  pvpStatusMelumatiniHazirla
} = require("./pvp_baza_live_handler");

function operationHazirla(status = "camping_at_abandoned_target") {
  return {
    version: 1,
    operationId: "pvp:oyuncu_a:konvoy_1:1000",
    playerId: "oyuncu_a",
    convoyId: "konvoy_1",
    targetType: "player_base",
    targetId: "oyuncu_b",
    targetPlayerId: "oyuncu_b",
    stateId: 1,
    startedAtMs: 1000,
    arrivalAtMs: 5000,
    travelDurationMs: 4000,
    status,
    battleAllowed: false,
    battleResolved: status === "returning",
    abandonedTarget: status === "camping_at_abandoned_target",
    lightWoundedFormation: [],
    returnStartedAtMs: status === "returning" ? 6000 : 0,
    returnEndsAtMs: status === "returning" ? 10000 : 0,
    result: status === "camping_at_abandoned_target"
      ? { type: "pvp_arrival", outcome: "camp" }
      : { type: "pvp_battle", winnerSide: "attacker" }
  };
}

function stateHazirla(operation = operationHazirla()) {
  return {
    playerId: "oyuncu_a",
    army: { troops: {} },
    konvoylar: {
      items: [
        {
          konvoyId: "konvoy_1",
          aciqdir: true,
          qosunlar: {},
          formasiya: { siralar: [] },
          qehremanIdleri: []
        }
      ]
    },
    konvoyEmeliyyatlari: {
      version: 3,
      activeByConvoy: operation ? { konvoy_1: operation } : {},
      history: []
    }
  };
}

(function testleriIcraEt() {
  {
    const raw = {
      type: "pvp_base_attack_preview_result",
      success: true,
      pvpEnabled: false,
      canAttack: false,
      preview: {
        pvpEnabled: false,
        selectedConvoyId: "konvoy_1",
        selectedConvoy: { convoyId: "konvoy_1", open: true, busy: false, troopCount: 10 },
        blockers: [
          { code: "pvp_not_enabled", message: "disabled" }
        ]
      }
    };

    const live = previewCavabiniAktivEt(raw);
    assert.strictEqual(live.pvpEnabled, true);
    assert.strictEqual(live.preview.pvpEnabled, true);
    assert.strictEqual(live.preview.blockers.length, 0);
    assert.strictEqual(live.preview.canAttack, true);
    assert.strictEqual(live.canAttack, true);
    assert.strictEqual(live.preview.liveRule.atomicTwoPlayerSettlementEnabled, true);
  }

  {
    const raw = {
      type: "pvp_base_attack_preview_result",
      success: true,
      pvpEnabled: false,
      preview: {
        pvpEnabled: false,
        selectedConvoyId: "",
        blockers: [{ code: "pvp_not_enabled" }]
      }
    };

    const live = previewCavabiniAktivEt(raw);
    assert.strictEqual(live.preview.canAttack, false);
    assert.ok(live.preview.blockers.some(x => x.code === "convoy_not_selected"));
  }

  {
    const rule = pvpCanliQaydasiniHazirla();
    assert.strictEqual(rule.pvpEnabled, true);
    assert.strictEqual(rule.clientCannotSubmitBattleWinner, true);
    assert.strictEqual(rule.clientCannotSubmitCasualties, true);
  }

  {
    const state = stateHazirla();
    const result = pvpGeriDonusuBaslat(
      state,
      "konvoy_1",
      "pvp:oyuncu_a:konvoy_1:1000",
      7000
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.deyisdi, true);
    assert.strictEqual(result.operation.status, "returning");
    assert.strictEqual(result.operation.returnStartedAtMs, 7000);
    assert.strictEqual(result.operation.returnEndsAtMs, 11000);
    assert.strictEqual(result.operation.result.returnReason, "manual_return_from_abandoned_target");
  }

  {
    const state = stateHazirla(operationHazirla("returning"));
    const before = pvpGeriDonusuYekunlasdir(
      state,
      "konvoy_1",
      "pvp:oyuncu_a:konvoy_1:1000",
      9000
    );
    assert.strictEqual(before.success, true);
    assert.strictEqual(before.deyisdi, false);
    assert.strictEqual(before.finished, false);
    assert.strictEqual(before.remainingMs, 1000);

    const done = pvpGeriDonusuYekunlasdir(
      state,
      "konvoy_1",
      "pvp:oyuncu_a:konvoy_1:1000",
      10000
    );
    assert.strictEqual(done.success, true);
    assert.strictEqual(done.deyisdi, true);
    assert.strictEqual(done.finished, true);
    assert.strictEqual(state.konvoyEmeliyyatlari.activeByConvoy.konvoy_1, undefined);
    assert.strictEqual(state.konvoyEmeliyyatlari.history.length, 1);
    assert.strictEqual(state.konvoyEmeliyyatlari.history[0].status, "idle");

    const info = pvpStatusMelumatiniHazirla(
      state,
      "konvoy_1",
      "pvp:oyuncu_a:konvoy_1:1000",
      10000
    );
    assert.strictEqual(info.active, false);
    assert.strictEqual(info.finished, true);
    assert.strictEqual(info.lastHistory.operationId, "pvp:oyuncu_a:konvoy_1:1000");
  }

  {
    const state = stateHazirla();
    const mismatch = pvpGeriDonusuBaslat(
      state,
      "konvoy_1",
      "pvp:basqa",
      7000
    );
    assert.strictEqual(mismatch.success, false);
    assert.strictEqual(mismatch.blocker, "operation_mismatch");
  }

  console.log("[PVP_BAZA_LIVE_HANDLER_TEST] OK");
})();
