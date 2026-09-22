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

  console.log("runtime_last_shelter_hero_commands_testi: OK");
})().catch(err => {
  console.error(err);
  process.exit(1);
});
