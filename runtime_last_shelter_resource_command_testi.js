"use strict";

const assert = require("assert");
const {
  lastShelterResourceCommandiniQeydEt
} = require("./runtime_last_shelter_resource_command");

class FakeRouter {
  constructor() {
    this.routes = new Map();
  }

  register(type, handler, options) {
    this.routes.set(
      String(type).toLowerCase(),
      { handler, options }
    );
    return this;
  }
}

(async () => {
  const state = {
    resources: {
      chips: 0,
      electricity: 500,
      water: 700,
      food: 1000,
      stone: 1500,
      diamond: 0,
      money: 1200,
      iron: 800,
      silver: 500,
      wood: 1500,
      fuel: 999
    },
    lastShelterResourceRuntime: {
      regTime: 1789659007819,
      people: 74,
      changePeople: 0,
      maxPeople: 107
    }
  };

  const router = new FakeRouter();

  lastShelterResourceCommandiniQeydEt(
    router,
    {
      getOrCreatePlayerState:
        () => state
    }
  );

  assert.strictEqual(
    router.routes.has(
      "synuserresource"
    ),
    true
  );

  assert.deepStrictEqual(
    router.routes.get(
      "synuserresource"
    ).options,
    {
      authRequired: true,
      mutation: false
    }
  );

  const sent = [];
  const ws = {
    _authedPlayerId: "p1"
  };

  await router.routes
    .get("synuserresource")
    .handler({
      ws,
      msg: {
        playerId: "p1"
      },
      send:
        (_socket, payload) =>
          sent.push(payload),
      nowMs:
        () => 1789659018642
    });

  assert.strictEqual(
    sent[0].type,
    "SynUserResource"
  );
  assert.deepStrictEqual(
    sent[0].payload,
    {
      chip: 0,
      electricity: 500,
      water: 700,
      people: 74,
      food: 1000,
      stone: 1500,
      diamond: 0,
      regTime: 1789659007819,
      changePeople: 0,
      money: 1200,
      iron: 800,
      silver: 500,
      wood: 1500,
      maxPeople: 107,
      db_timezone_offset:
        1789659018
    }
  );
  assert.deepStrictEqual(
    JSON.parse(
      sent[0].payloadJson
    ),
    sent[0].payload
  );
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(
      sent[0].payload,
      "fuel"
    ),
    false
  );

  sent.length = 0;

  await router.routes
    .get("synuserresource")
    .handler({
      ws,
      msg: {
        playerId: "other"
      },
      send:
        (_socket, payload) =>
          sent.push(payload),
      nowMs: () => 1
    });

  assert.strictEqual(
    sent[0].code,
    "PLAYER_ID_MISMATCH"
  );

  console.log(
    "PASS: SynUserResource exposes the verified flat Last Shelter resource envelope."
  );
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
