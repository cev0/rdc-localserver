"use strict";

const assert = require("assert");
const {
  RuntimeRedisBus
} = require("./runtime_redis");

(async () => {
  const previousRedisUrl = process.env.REDIS_URL;
  delete process.env.REDIS_URL;

  try {
    const bus = new RuntimeRedisBus({
      redisUrl: "",
      namespace: "rdc:test",
      instanceId: "instance-a"
    });

    assert.strictEqual(bus.enabled, false);
    assert.strictEqual(
      bus.presenceKey("p1"),
      "rdc:test:presence:p1"
    );
    assert.strictEqual(
      bus.instanceChannel(),
      "rdc:test:instance:instance-a"
    );

    const started = await bus.start();
    assert.strictEqual(started, false);
    assert.strictEqual(bus.ready, false);

    assert.strictEqual(
      await bus.registerLocalPlayer("p1"),
      false
    );

    assert.strictEqual(
      await bus.publishToPlayer(
        "p2",
        { type: "test" }
      ),
      false
    );

    await bus.close();

    console.log(
      "PASS: Redis runtime bus disabled-mode contract."
    );
  }
  finally {
    if (previousRedisUrl == null) {
      delete process.env.REDIS_URL;
    }
    else {
      process.env.REDIS_URL = previousRedisUrl;
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
