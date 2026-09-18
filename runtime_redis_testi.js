"use strict";

const assert = require("assert");
const {
  EventEmitter
} = require("events");
const {
  RuntimeRedisBus,
  bayraqAktivdir
} = require("./runtime_redis");

function gozleBirTick() {
  return new Promise(resolve => setImmediate(resolve));
}

class FakeRedisClient extends EventEmitter {
  constructor(shared, role = "command") {
    super();
    this.shared = shared;
    this.role = role;
    this.isReady = false;
    this.isOpen = false;
    this.subscription = null;
  }

  duplicate() {
    const sub =
      new FakeRedisClient(
        this.shared,
        "subscriber"
      );

    this.shared.subscriber = sub;
    return sub;
  }

  async connect() {
    this.isOpen = true;
    this.isReady = true;
    this.emit("ready");
  }

  async subscribe(channel, handler) {
    this.subscription = {
      channel,
      handler
    };
    return 1;
  }

  async set(key, value) {
    this.shared.kv.set(
      key,
      value
    );
    return "OK";
  }

  async get(key) {
    return this.shared.kv.has(key)
      ? this.shared.kv.get(key)
      : null;
  }

  async publish(channel, raw) {
    this.shared.published.push({
      channel,
      raw
    });
    return 1;
  }

  multi() {
    const client = this;
    const operations = [];

    return {
      set(key, value) {
        operations.push([
          key,
          value
        ]);
        return this;
      },

      async exec() {
        for (const [key, value] of operations) {
          client.shared.kv.set(
            key,
            value
          );
        }

        return operations.map(
          () => "OK"
        );
      }
    };
  }

  async eval(_script, options = {}) {
    const key =
      options.keys &&
      options.keys[0];

    const expected =
      options.arguments &&
      options.arguments[0];

    if (
      key &&
      this.shared.kv.get(key) ===
        expected
    ) {
      this.shared.kv.delete(key);
      return 1;
    }

    return 0;
  }

  async quit() {
    this.isReady = false;
    this.isOpen = false;
    this.emit("end");
  }
}

(async () => {
  const previousRedisUrl =
    process.env.REDIS_URL;

  delete process.env.REDIS_URL;

  try {
    assert.strictEqual(
      bayraqAktivdir("true"),
      true
    );

    assert.strictEqual(
      bayraqAktivdir("yes"),
      true
    );

    assert.strictEqual(
      bayraqAktivdir("0"),
      false
    );

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

    const requiredBus =
      new RuntimeRedisBus({
        redisUrl: "",
        namespace: "rdc:test",
        instanceId:
          "instance-required",
        required: "true"
      });

    await assert.rejects(
      () => requiredBus.start(),
      /REDIS_URL/
    );

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

    const shared = {
      kv: new Map(),
      published: [],
      subscriber: null
    };

    const command =
      new FakeRedisClient(
        shared
      );

    const direct = [];

    const liveBus =
      new RuntimeRedisBus({
        redisUrl:
          "redis://fake",
        namespace:
          "rdc:test-live",
        instanceId:
          "instance-a",
        required:
          true,
        presenceRefreshMs:
          10000,
        clientFactory:
          () => command,
        onDirectMessage:
          async (message) => {
            direct.push(message);
          }
      });

    assert.strictEqual(
      await liveBus.start(),
      true
    );

    assert.strictEqual(
      liveBus.ready,
      true
    );

    assert.deepStrictEqual(
      liveBus.snapshot(),
      {
        enabled: true,
        required: true,
        ready: true,
        instanceId:
          "instance-a",
        localPlayers: 0
      }
    );

    assert.strictEqual(
      await liveBus.registerLocalPlayer(
        "p1"
      ),
      true
    );

    assert.strictEqual(
      shared.kv.get(
        "rdc:test-live:presence:p1"
      ),
      "instance-a"
    );

    shared.kv.set(
      "rdc:test-live:presence:p2",
      "instance-b"
    );

    assert.strictEqual(
      await liveBus.publishToPlayer(
        "p2",
        {
          type:
            "remote_ping"
        }
      ),
      true
    );

    assert.strictEqual(
      shared.published.length,
      1
    );

    assert.strictEqual(
      shared.published[0].channel,
      "rdc:test-live:instance:instance-b"
    );

    const envelope =
      JSON.parse(
        shared.published[0].raw
      );

    assert.strictEqual(
      envelope.playerId,
      "p2"
    );

    assert.strictEqual(
      envelope.sourceInstanceId,
      "instance-a"
    );

    assert.ok(
      shared.subscriber &&
      shared.subscriber.subscription
    );

    await shared.subscriber
      .subscription
      .handler(
        JSON.stringify({
          version: 1,
          sourceInstanceId:
            "instance-b",
          playerId:
            "p1",
          payload: {
            type:
              "remote_delivery"
          }
        })
      );

    assert.strictEqual(
      direct.length,
      1
    );

    assert.strictEqual(
      direct[0].payload.type,
      "remote_delivery"
    );

    command.isReady = false;
    command.emit(
      "reconnecting"
    );

    assert.strictEqual(
      liveBus.ready,
      false
    );

    assert.strictEqual(
      await liveBus.registerLocalPlayer(
        "p3"
      ),
      false
    );

    shared.kv.delete(
      "rdc:test-live:presence:p1"
    );

    shared.kv.delete(
      "rdc:test-live:presence:p3"
    );

    command.isReady = true;
    command.emit("ready");

    await gozleBirTick();

    assert.strictEqual(
      liveBus.ready,
      true
    );

    assert.strictEqual(
      shared.kv.get(
        "rdc:test-live:presence:p1"
      ),
      "instance-a"
    );

    assert.strictEqual(
      shared.kv.get(
        "rdc:test-live:presence:p3"
      ),
      "instance-a"
    );

    await liveBus.close();

    assert.strictEqual(
      liveBus.ready,
      false
    );

    assert.strictEqual(
      liveBus.started,
      false
    );

    console.log(
      "PASS: Redis runtime bus disabled, required, routing and reconnect-presence contracts."
    );
  }
  finally {
    if (previousRedisUrl == null) {
      delete process.env.REDIS_URL;
    }
    else {
      process.env.REDIS_URL =
        previousRedisUrl;
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
