"use strict";

const assert = require("assert");
const { RuntimeCommandRouter } = require("./runtime_command_router");
const {
  heroSnapshotHazirla,
  lastShelterHeroCommandleriniQeydEt
} = require("./runtime_last_shelter_hero_commands");

(async () => {
  const state = {};
  const first = heroSnapshotHazirla(state);
  assert(first);
  assert.strictEqual(first.templates.length, 21);
  assert.strictEqual(first.templates[0].id, "240030");
  assert.strictEqual(first.templates[first.templates.length - 1].id, "240050");
  assert.strictEqual(first.generals.length, 1);
  assert.strictEqual(first.generals[0].generalId, "240020");
  assert.strictEqual(first.config.onlineDurationRecruitHero, "240041");

  first.templates[0].id = "tampered";
  first.generals[0].level = 99;
  first.config.flags.newHeroSwitch = 0;
  const second = heroSnapshotHazirla(state);
  assert.strictEqual(second.templates[0].id, "240030");
  assert.strictEqual(second.generals[0].level, 1);
  assert.strictEqual(second.config.flags.newHeroSwitch, 1);

  const router = new RuntimeCommandRouter();
  lastShelterHeroCommandleriniQeydEt(router, {
    getOrCreatePlayerState: () => state
  });
  assert(router.has("hero.info"));
  assert(router.has("hero.get"));

  const sent = [];
  const ws = { playerId: "p1", _authedPlayerId: "p1" };
  await router.dispatch({
    ws,
    msg: { type: "hero.info", playerId: "p1" },
    send: (_ws, payload) => sent.push(payload),
    nowMs: () => 123456
  });
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0].type, "hero.info");
  assert.strictEqual(sent[0].playerId, "p1");
  assert.strictEqual(sent[0].serverTimeUnixMs, 123456);
  assert.strictEqual(sent[0].hero.templates.length, 21);

  await router.dispatch({
    ws,
    msg: { type: "hero.get", playerId: "p1", heroId: "240041" },
    send: (_ws, payload) => sent.push(payload),
    nowMs: () => 123457
  });
  assert.strictEqual(sent[1].type, "hero.get");
  assert.strictEqual(sent[1].hero.id, "240041");
  assert.strictEqual(sent[1].hero.composeItemId, "206011");
  assert.strictEqual(sent[1].hero.composeCount, 6000);
  assert.strictEqual(sent[1].serverTimeUnixMs, 123457);

  sent[1].hero.id = "tampered";
  await router.dispatch({
    ws,
    msg: { type: "hero.get", playerId: "p1", heroId: "240041" },
    send: (_ws, payload) => sent.push(payload)
  });
  assert.strictEqual(sent[2].hero.id, "240041");

  await router.dispatch({
    ws,
    msg: { type: "hero.get", playerId: "p1", heroId: "999999" },
    send: (_ws, payload) => sent.push(payload)
  });
  assert.strictEqual(sent[3].type, "error");
  assert.strictEqual(sent[3].code, "HERO_NOT_FOUND");
  assert.strictEqual(sent[3].heroId, "999999");

  console.log("runtime_last_shelter_hero_commands_testi: OK");
})().catch(err => {
  console.error(err);
  process.exit(1);
});
