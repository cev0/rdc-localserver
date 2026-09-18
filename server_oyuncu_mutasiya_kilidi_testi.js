"use strict";

const assert = require("assert");

const previousRedisUrl = process.env.REDIS_URL;
const previousRedisRequired = process.env.REDIS_REQUIRED;

delete process.env.REDIS_URL;
delete process.env.REDIS_REQUIRED;

const {
  oyuncuMutasiyaKilidiIleIcraEt,
  oyuncuMutasiyaNovbesiVar
} = require("./server_oyuncu_mutasiya_kilidi");

function gozle(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const sira = [];

  const birinci =
    oyuncuMutasiyaKilidiIleIcraEt(
      "player-1",
      async () => {
        sira.push("a-start");
        assert.strictEqual(
          oyuncuMutasiyaNovbesiVar("player-1"),
          true
        );

        await gozle(30);
        sira.push("a-end");
      }
    );

  const ikinci =
    oyuncuMutasiyaKilidiIleIcraEt(
      "player-1",
      async () => {
        sira.push("b-start");
        await gozle(5);
        sira.push("b-end");
      }
    );

  await Promise.all([birinci, ikinci]);

  assert.deepStrictEqual(
    sira,
    [
      "a-start",
      "a-end",
      "b-start",
      "b-end"
    ]
  );

  assert.strictEqual(
    oyuncuMutasiyaNovbesiVar("player-1"),
    false
  );

  console.log(
    "PASS: player mutation lock keeps local ordering without Redis."
  );
})()
  .finally(() => {
    if (previousRedisUrl == null) {
      delete process.env.REDIS_URL;
    }
    else {
      process.env.REDIS_URL = previousRedisUrl;
    }

    if (previousRedisRequired == null) {
      delete process.env.REDIS_REQUIRED;
    }
    else {
      process.env.REDIS_REQUIRED = previousRedisRequired;
    }
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
