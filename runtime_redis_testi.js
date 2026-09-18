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

function scoreUyqundur(
  score,
  min,
  max
) {
  const lower =
    String(min) === "-inf"
      ? -Infinity
      : Number(min);

  const upper =
    String(max) === "+inf"
      ? Infinity
      : Number(max);

  return score >= lower &&
    score <= upper;
}

class FakeRedisClient extends EventEmitter {
  constructor(shared, role = "command") {
    super();
    this.shared = shared;
    this.role = role;
    this.isReady = false;
    this.isOpen = false;
    this.subscriptions = [];
  }

  duplicate() {
    return new FakeRedisClient(
      this.shared,
      "subscriber"
    );
  }

  async connect() {
    this.isOpen = true;
    this.isReady = true;
    this.emit("ready");
  }

  async subscribe(channel, handler) {
    let handlers =
      this.shared.channels.get(
        channel
      );

    if (!handlers) {
      handlers = new Set();
      this.shared.channels.set(
        channel,
        handlers
      );
    }

    handlers.add(handler);

    this.subscriptions.push({
      channel,
      handler
    });

    return handlers.size;
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

  _zset(key) {
    let zset =
      this.shared.zsets.get(
        key
      );

    if (!zset) {
      zset = new Map();
      this.shared.zsets.set(
        key,
        zset
      );
    }

    return zset;
  }

  async zAdd(key, members) {
    const zset =
      this._zset(key);

    for (
      const item of
      Array.isArray(members)
        ? members
        : []
    ) {
      zset.set(
        item.value,
        Number(item.score)
      );
    }

    return zset.size;
  }

  async zRem(key, member) {
    const zset =
      this.shared.zsets.get(
        key
      );

    if (!zset) {
      return 0;
    }

    return zset.delete(member)
      ? 1
      : 0;
  }

  async zRemRangeByScore(
    key,
    min,
    max
  ) {
    const zset =
      this.shared.zsets.get(
        key
      );

    if (!zset) {
      return 0;
    }

    let count = 0;

    for (
      const [member, score] of
      zset
    ) {
      if (
        scoreUyqundur(
          score,
          min,
          max
        )
      ) {
        zset.delete(member);
        count += 1;
      }
    }

    return count;
  }

  async zRangeByScore(
    key,
    min,
    max
  ) {
    const zset =
      this.shared.zsets.get(
        key
      );

    if (!zset) {
      return [];
    }

    return Array
      .from(zset.entries())
      .filter(
        ([, score]) =>
          scoreUyqundur(
            score,
            min,
            max
          )
      )
      .sort(
        (a, b) =>
          a[1] - b[1]
      )
      .map(
        ([member]) =>
          member
      );
  }

  async expire() {
    return 1;
  }

  async publish(channel, raw) {
    this.shared.published.push({
      channel,
      raw
    });

    const handlers =
      this.shared.channels.get(
        channel
      );

    if (!handlers) {
      return 0;
    }

    for (const handler of handlers) {
      await handler(raw);
    }

    return handlers.size;
  }

  multi() {
    const client = this;
    const operations = [];

    const transaction = {
      set(...args) {
        operations.push(
          () => client.set(...args)
        );
        return transaction;
      },

      zAdd(...args) {
        operations.push(
          () => client.zAdd(...args)
        );
        return transaction;
      },

      zRemRangeByScore(...args) {
        operations.push(
          () =>
            client.zRemRangeByScore(
              ...args
            )
        );
        return transaction;
      },

      expire(...args) {
        operations.push(
          () => client.expire(...args)
        );
        return transaction;
      },

      async exec() {
        const results = [];

        for (
          const operation of
          operations
        ) {
          results.push(
            await operation()
          );
        }

        return results;
      }
    };

    return transaction;
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
    for (
      const item of
      this.subscriptions
    ) {
      const handlers =
        this.shared.channels.get(
          item.channel
        );

      if (handlers) {
        handlers.delete(
          item.handler
        );

        if (
          handlers.size === 0
        ) {
          this.shared.channels.delete(
            item.channel
          );
        }
      }
    }

    this.subscriptions = [];
    this.isReady = false;
    this.isOpen = false;
    this.emit("end");
  }
}

function sharedRedisYarat() {
  return {
    kv: new Map(),
    zsets: new Map(),
    channels: new Map(),
    published: []
  };
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

    const disabledBus =
      new RuntimeRedisBus({
        redisUrl: "",
        namespace:
          "rdc:test",
        instanceId:
          "instance-disabled"
      });

    assert.strictEqual(
      disabledBus.enabled,
      false
    );

    assert.strictEqual(
      disabledBus.presenceKey("p1"),
      "rdc:test:presence:p1"
    );

    assert.strictEqual(
      disabledBus.presenceInstancesKey(
        "p1"
      ),
      "rdc:test:presence-v2:p1"
    );

    assert.strictEqual(
      await disabledBus.start(),
      false
    );

    const requiredBus =
      new RuntimeRedisBus({
        redisUrl: "",
        namespace:
          "rdc:test",
        instanceId:
          "instance-required",
        required: "true"
      });

    await assert.rejects(
      () => requiredBus.start(),
      /REDIS_URL/
    );

    await disabledBus.close();

    const shared =
      sharedRedisYarat();

    const receivedA = [];
    const receivedB = [];

    const commandA =
      new FakeRedisClient(
        shared
      );

    const commandB =
      new FakeRedisClient(
        shared
      );

    const busA =
      new RuntimeRedisBus({
        redisUrl:
          "redis://fake",
        namespace:
          "rdc:test-live",
        instanceId:
          "instance-a",
        required: true,
        presenceRefreshMs:
          10000,
        clientFactory:
          () => commandA,
        onDirectMessage:
          async message =>
            receivedA.push(
              message
            )
      });

    const busB =
      new RuntimeRedisBus({
        redisUrl:
          "redis://fake",
        namespace:
          "rdc:test-live",
        instanceId:
          "instance-b",
        required: true,
        presenceRefreshMs:
          10000,
        clientFactory:
          () => commandB,
        onDirectMessage:
          async message =>
            receivedB.push(
              message
            )
      });

    assert.strictEqual(
      await busA.start(),
      true
    );

    assert.strictEqual(
      await busB.start(),
      true
    );

    assert.strictEqual(
      await busA.registerLocalPlayer(
        "p1"
      ),
      true
    );

    assert.strictEqual(
      await busB.registerLocalPlayer(
        "p1"
      ),
      true
    );

    const p1Presence =
      shared.zsets.get(
        "rdc:test-live:presence-v2:p1"
      );

    assert.ok(p1Presence);

    assert.deepStrictEqual(
      Array
        .from(
          p1Presence.keys()
        )
        .sort(),
      [
        "instance-a",
        "instance-b"
      ]
    );

    assert.strictEqual(
      await busA.publishToPlayer(
        "p1",
        {
          type:
            "cross_instance_state"
        }
      ),
      true
    );

    assert.strictEqual(
      receivedA.length,
      0,
      "Publisher öz instance kanalına eyni payload-u qaytarmamalıdır."
    );

    assert.strictEqual(
      receivedB.length,
      1
    );

    assert.strictEqual(
      receivedB[0].payload.type,
      "cross_instance_state"
    );

    assert.strictEqual(
      receivedB[0].sourceInstanceId,
      "instance-a"
    );

    /*
     * Rolling deploy compatibility:
     * v2 presence olmayan köhnə instance legacy key vasitəsilə tapılır.
     */
    shared.kv.set(
      "rdc:test-live:presence:legacy-player",
      "legacy-instance"
    );

    await busA.publishToPlayer(
      "legacy-player",
      {
        type:
          "legacy_route"
      }
    );

    assert.ok(
      shared.published.some(
        item =>
          item.channel ===
            "rdc:test-live:instance:legacy-instance"
      )
    );

    assert.strictEqual(
      await busB.unregisterLocalPlayer(
        "p1"
      ),
      true
    );

    assert.deepStrictEqual(
      Array.from(
        shared.zsets
          .get(
            "rdc:test-live:presence-v2:p1"
          )
          .keys()
      ),
      [
        "instance-a"
      ]
    );

    commandA.isReady = false;
    commandA.emit(
      "reconnecting"
    );

    assert.strictEqual(
      busA.ready,
      false
    );

    assert.strictEqual(
      await busA.registerLocalPlayer(
        "p2"
      ),
      false
    );

    shared.zsets.delete(
      "rdc:test-live:presence-v2:p1"
    );

    shared.zsets.delete(
      "rdc:test-live:presence-v2:p2"
    );

    commandA.isReady = true;
    commandA.emit("ready");

    await gozleBirTick();

    assert.strictEqual(
      busA.ready,
      true
    );

    assert.deepStrictEqual(
      Array.from(
        shared.zsets
          .get(
            "rdc:test-live:presence-v2:p1"
          )
          .keys()
      ),
      [
        "instance-a"
      ]
    );

    assert.deepStrictEqual(
      Array.from(
        shared.zsets
          .get(
            "rdc:test-live:presence-v2:p2"
          )
          .keys()
      ),
      [
        "instance-a"
      ]
    );

    assert.deepStrictEqual(
      busA.snapshot(),
      {
        enabled: true,
        required: true,
        ready: true,
        instanceId:
          "instance-a",
        localPlayers: 2,
        presenceMode:
          "multi-instance-v2"
      }
    );

    await busA.close();

    const remainingP1 =
      shared.zsets.get(
        "rdc:test-live:presence-v2:p1"
      );

    assert.ok(
      !remainingP1 ||
      !remainingP1.has(
        "instance-a"
      ),
      "Graceful shutdown öz presence üzvlərini dərhal silməlidir."
    );

    await busB.close();

    console.log(
      "PASS: Redis runtime bus supports rolling-compatible multi-instance presence, fan-out routing and reconnect cleanup."
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
