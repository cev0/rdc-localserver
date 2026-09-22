"use strict";

const assert = require("assert");
const { RuntimeCommandRouter } = require("./runtime_command_router");
const {
  heroSnapshotHazirla,
  generalListSnapshotAl,
  generalSnapshotAl,
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

  const generalList = generalListSnapshotAl(state);
  assert.strictEqual(generalList.length, 1);
  assert.strictEqual(generalList[0].generalId, "240020");
  generalList[0].level = 66;
  assert.strictEqual(generalListSnapshotAl(state)[0].level, 1);

  const starterUuid = second.generals[0].uuid;
  const directGeneral = generalSnapshotAl(state, starterUuid);
  assert.strictEqual(directGeneral.generalId, "240020");
  directGeneral.level = 77;
  assert.strictEqual(generalSnapshotAl(state, starterUuid).level, 1);
  assert.strictEqual(generalSnapshotAl(state, "missing"), null);

  const router = new RuntimeCommandRouter();
  lastShelterHeroCommandleriniQeydEt(router, {
    getOrCreatePlayerState: () => state
  });
  assert(router.has("hero.info"));
  assert(router.has("hero.get"));
  assert(router.has("hero.general.list"));
  assert(router.has("hero.general.get"));

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

  await router.dispatch({
    ws,
    msg: { type: "hero.general.list", playerId: "p1" },
    send: (_ws, payload) => sent.push(payload),
    nowMs: () => 123458
  });
  assert.strictEqual(sent[4].type, "hero.general.list");
  assert.strictEqual(sent[4].generals.length, 1);
  assert.strictEqual(sent[4].generals[0].generalId, "240020");
  assert.strictEqual(sent[4].serverTimeUnixMs, 123458);
  sent[4].generals[0].level = 88;
  assert.strictEqual(generalListSnapshotAl(state)[0].level, 1);

  await router.dispatch({
    ws,
    msg: { type: "hero.general.get", playerId: "p1", uuid: starterUuid },
    send: (_ws, payload) => sent.push(payload),
    nowMs: () => 123458
  });
  assert.strictEqual(sent[5].type, "hero.general.get");
  assert.strictEqual(sent[5].general.generalId, "240020");
  assert.strictEqual(sent[5].general.uuid, starterUuid);
  sent[5].general.level = 88;
  assert.strictEqual(generalSnapshotAl(state, starterUuid).level, 1);

  await router.dispatch({
    ws,
    msg: { type: "hero.general.get", playerId: "p1", uuid: "missing" },
    send: (_ws, payload) => sent.push(payload)
  });
  assert.strictEqual(sent[6].type, "error");
  assert.strictEqual(sent[6].code, "HERO_GENERAL_NOT_FOUND");

  console.log("runtime_last_shelter_hero_commands_testi: OK");
})().catch(err => {
  console.error(err);
  process.exit(1);
});
