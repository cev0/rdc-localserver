"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  legacyToplamaMutasiyasiniTetbiqEt
} = require("./xerite_resurs_toplama_handler");

function kopyala(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function pendingRewardHazirla(overrides = null) {
  return {
    rewardId: "state_1_resource_1:1000",
    convoyId: "konvoy_1",
    nodeId: "state_1_resource_1",
    resourceId: "food",
    amount: 25,
    completedAtMs: 5000,
    ...((overrides && typeof overrides === "object") ? overrides : {})
  };
}

function stateHazirla() {
  return {
    playerId: "oyuncu_a",
    resources: {
      food: 10
    },
    resourceCaps: {
      food: 100
    },
    xeriteToplama: {
      version: 1,
      activeByConvoy: {},
      pendingRewards: []
    },
    konvoyEmeliyyatlari: {
      version: 3,
      activeByConvoy: {},
      history: []
    }
  };
}

(async function testleriIcraEt() {
  {
    const state = stateHazirla();
    state.xeriteToplama.activeByConvoy.konvoy_1 = {
      convoyId: "konvoy_1",
      nodeId: "state_1_resource_1",
      stateId: 1,
      resourceId: "food",
      amount: 25,
      level: 3,
      startedAtMs: 1000,
      endsAtMs: 5000,
      status: "gathering"
    };

    const netice = await legacyToplamaMutasiyasiniTetbiqEt(
      state,
      "oyuncu_a",
      "convoy_gather_status_request",
      {},
      6000
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.deyisdi, true);
    assert.strictEqual(state.xeriteToplama.activeByConvoy.konvoy_1, undefined);
    assert.strictEqual(state.xeriteToplama.pendingRewards.length, 1);
    assert.strictEqual(
      state.xeriteToplama.pendingRewards[0].rewardId,
      "state_1_resource_1:1000"
    );
    assert.strictEqual(netice.info.pendingRewards.length, 1);
  }

  {
    const state = stateHazirla();

    const evvelki = kopyala(state);
    const netice = await legacyToplamaMutasiyasiniTetbiqEt(
      state,
      "oyuncu_a",
      "convoy_gather_status_request",
      {},
      6000
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.deyisdi, false);
    assert.deepStrictEqual(state, evvelki);
  }

  {
    const state = stateHazirla();
    state.xeriteToplama.pendingRewards.push(pendingRewardHazirla());

    const netice = await legacyToplamaMutasiyasiniTetbiqEt(
      state,
      "oyuncu_a",
      "convoy_gather_claim_request",
      { rewardId: "state_1_resource_1:1000" },
      7000
    );

    assert.strictEqual(netice.success, true);
    assert.strictEqual(netice.deyisdi, true);
    assert.strictEqual(netice.result.reward.amount, 25);
    assert.strictEqual(netice.result.newAmount, 35);
    assert.strictEqual(state.resources.food, 35);
    assert.strictEqual(state.xeriteToplama.pendingRewards.length, 0);
  }

  {
    const state = stateHazirla();
    state.resources.food = 90;
    state.resourceCaps.food = 100;
    state.xeriteToplama.pendingRewards.push(
      pendingRewardHazirla({ amount: 25 })
    );

    const evvelki = kopyala(state);

    const netice = await legacyToplamaMutasiyasiniTetbiqEt(
      state,
      "oyuncu_a",
      "convoy_gather_claim_request",
      { rewardId: "state_1_resource_1:1000" },
      7000
    );

    assert.strictEqual(netice.success, false);
    assert.strictEqual(netice.deyisdi, false);
    assert.ok(netice.message.includes("Anbarda"));
    assert.deepStrictEqual(
      state,
      evvelki,
      "Anbar cap failure resurs və pending reward state-ni dəyişməməlidir."
    );
  }

  {
    const state = stateHazirla();
    state.xeriteToplama.pendingRewards.push(pendingRewardHazirla());
    state.konvoyEmeliyyatlari.activeByConvoy.konvoy_1 = {
      convoyId: "konvoy_1",
      status: "returning",
      returnEndsAtMs: 10000
    };

    const evvelki = kopyala(state);

    const netice = await legacyToplamaMutasiyasiniTetbiqEt(
      state,
      "oyuncu_a",
      "convoy_gather_claim_request",
      { rewardId: "state_1_resource_1:1000" },
      7000
    );

    assert.strictEqual(netice.success, false);
    assert.strictEqual(netice.deyisdi, false);
    assert.strictEqual(netice.convoyStatus, "returning");
    assert.strictEqual(netice.returnEndsAtMs, 10000);
    assert.deepStrictEqual(state, evvelki);
  }

  {
    const state = stateHazirla();
    state.xeriteToplama.activeByConvoy.konvoy_1 = {
      convoyId: "konvoy_1",
      nodeId: "state_1_resource_1",
      stateId: 1,
      resourceId: "food",
      amount: 25,
      level: 3,
      startedAtMs: 1000,
      endsAtMs: 5000,
      status: "gathering"
    };
    state.konvoyEmeliyyatlari.activeByConvoy.konvoy_1 = {
      convoyId: "konvoy_1",
      status: "returning",
      returnEndsAtMs: 10000
    };

    const netice = await legacyToplamaMutasiyasiniTetbiqEt(
      state,
      "oyuncu_a",
      "convoy_gather_claim_request",
      { rewardId: "state_1_resource_1:1000" },
      7000
    );

    assert.strictEqual(netice.success, false);
    assert.strictEqual(netice.deyisdi, true);
    assert.strictEqual(netice.convoyStatus, "returning");
    assert.strictEqual(state.xeriteToplama.activeByConvoy.konvoy_1, undefined);
    assert.strictEqual(state.xeriteToplama.pendingRewards.length, 1);
    assert.strictEqual(state.resources.food, 10);
  }

  {
    const kod = fs.readFileSync(
      path.join(__dirname, "xerite_resurs_toplama_handler.js"),
      "utf8"
    );

    assert.ok(
      kod.includes("oyuncuStateMutasiyasiniPostgresIleIcraEt"),
      "Resource gather mutation-ları PostgreSQL player lock istifadə etməlidir."
    );
    assert.ok(
      !kod.includes("oyunStateIniYaddaSaxla"),
      "Legacy gather handler köhnə full-state save yolunu istifadə etməməlidir."
    );

    const infoIndex = kod.indexOf('if (type === "map_resource_info_request")');
    const detailIndex = kod.indexOf('if (type === "map_resource_detail_request")');
    const pgMutationIndex = kod.indexOf("oyuncuStateMutasiyasiniPostgresIleIcraEt(", infoIndex);

    assert.ok(infoIndex >= 0);
    assert.ok(detailIndex > infoIndex);
    assert.ok(pgMutationIndex > detailIndex);
  }

  console.log("[XERITE_RESURS_TOPLAMA_PG_MUTASIYA_TEST] OK");
})().catch(xeta => {
  console.error("[XERITE_RESURS_TOPLAMA_PG_MUTASIYA_TEST] XETA", xeta);
  process.exitCode = 1;
});
