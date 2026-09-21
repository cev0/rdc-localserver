"use strict";

const assert = require("assert");
const {
  RuntimeCommandRouter
} = require("./runtime_command_router");
const {
  lastShelterItemCommandleriniQeydEt
} = require("./runtime_last_shelter_item_commands");

(async () => {
  const state = {
    lastShelterGoldWallet:{
      gold:1000,
      paidGold:0
    }
  };

  const router =
    new RuntimeCommandRouter({
      mutationExecutor:
        async (_playerId, action) =>
          await action(),
      authoritativeMutationExecutor:
        async (_playerId, action) =>
          await action(),
      idempotencyExecutor:
        async ({ execute }) =>
          await execute()
    });

  lastShelterItemCommandleriniQeydEt(
    router,
    {
      getOrCreatePlayerState:
        () => state
    }
  );

  assert.strictEqual(
    router.has("item.buy"),
    true
  );

  const sent = [];
  const ws = {
    _authedPlayerId:"p1"
  };

  const handled =
    await router.dispatch({
      type:"item.buy",
      msg:{
        type:"item.buy",
        playerId:"p1",
        itemId:"200200",
        num:2,
        batch:0
      },
      ws,
      nowMs:() => 123456,
      send:(_ws,payload) =>
        sent.push(payload)
    });

  assert.strictEqual(handled,true);
  assert.strictEqual(sent.length,1);
  assert.strictEqual(sent[0].type,"item.buy");
  assert.strictEqual(sent[0].playerId,"p1");
  assert.strictEqual(sent[0].serverTimeUnixMs,123456);
  assert.strictEqual(sent[0].costGold,300);
  assert.strictEqual(sent[0].remainGold,700);
  assert.strictEqual(sent[0].item.itemId,"200200");
  assert.strictEqual(sent[0].item.count,3);
  assert.deepStrictEqual(
    state.lastShelterGoldWallet,
    {gold:700,paidGold:0}
  );

  const mismatch = [];
  await router.dispatch({
    type:"item.buy",
    msg:{
      type:"item.buy",
      playerId:"p2",
      itemId:"200200",
      num:1
    },
    ws,
    nowMs:() => 123457,
    send:(_ws,payload) =>
      mismatch.push(payload)
  });

  assert.strictEqual(
    mismatch[0].code,
    "PLAYER_ID_MISMATCH"
  );

  console.log(
    "PASS: item.buy is registered as a PostgreSQL-authoritative authenticated mutation."
  );
})().catch(error => {
  console.error(error);
  process.exit(1);
});
