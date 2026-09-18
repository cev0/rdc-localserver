"use strict";

const crypto = require("crypto");

const DEFAULT_PRESENCE_TTL_SECONDS = 90;
const DEFAULT_PRESENCE_REFRESH_MS = 30000;

function metnAl(value, fallback = "") {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

function instanceIdYarat() {
  return (
    metnAl(process.env.KOYEB_INSTANCE_ID) ||
    metnAl(process.env.INSTANCE_ID) ||
    (typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString("hex"))
  );
}

class RuntimeRedisBus {
  constructor(options = {}) {
    this.redisUrl =
      metnAl(options.redisUrl) ||
      metnAl(process.env.REDIS_URL);

    this.namespace =
      metnAl(options.namespace) ||
      metnAl(process.env.REDIS_NAMESPACE, "rdc:v2");

    this.instanceId =
      metnAl(options.instanceId) ||
      instanceIdYarat();

    this.presenceTtlSeconds =
      Math.max(
        30,
        Number(
          options.presenceTtlSeconds ||
          process.env.REDIS_PRESENCE_TTL_SECONDS ||
          DEFAULT_PRESENCE_TTL_SECONDS
        ) || DEFAULT_PRESENCE_TTL_SECONDS
      );

    this.presenceRefreshMs =
      Math.max(
        10000,
        Number(
          options.presenceRefreshMs ||
          process.env.REDIS_PRESENCE_REFRESH_MS ||
          DEFAULT_PRESENCE_REFRESH_MS
        ) || DEFAULT_PRESENCE_REFRESH_MS
      );

    this.required =
      String(
        options.required ??
        process.env.REDIS_REQUIRED ??
        ""
      ).trim() === "1";

    this.onDirectMessage =
      typeof options.onDirectMessage === "function"
        ? options.onDirectMessage
        : null;

    this.commandClient = null;
    this.subscriber = null;
    this.ready = false;
    this.started = false;
    this.localPlayers = new Set();
    this.refreshTimer = null;
  }

  get enabled() {
    return !!this.redisUrl;
  }

  presenceKey(playerId) {
    return `${this.namespace}:presence:${playerId}`;
  }

  instanceChannel(instanceId = this.instanceId) {
    return `${this.namespace}:instance:${instanceId}`;
  }

  async start() {
    if (this.started) {
      return this.ready;
    }

    this.started = true;

    if (!this.enabled) {
      console.log(
        "[REDIS] REDIS_URL yoxdur. Single-instance rejimi davam edir."
      );
      return false;
    }

    try {
      const { createClient } = require("@redis/client");

      this.commandClient = createClient({
        url: this.redisUrl
      });

      this.commandClient.on("error", (error) => {
        console.error(
          "[REDIS] command client error:",
          error && error.message ? error.message : error
        );
      });

      await this.commandClient.connect();

      this.subscriber = this.commandClient.duplicate();

      this.subscriber.on("error", (error) => {
        console.error(
          "[REDIS] subscriber error:",
          error && error.message ? error.message : error
        );
      });

      await this.subscriber.connect();

      await this.subscriber.subscribe(
        this.instanceChannel(),
        async (raw) => {
          await this._directMesajiEmalEt(raw);
        }
      );

      this.ready = true;

      // Startup davam ederken socket auth olubsa localPlayers artiq dolu ola biler.
      // Redis hazir olan kimi ilk presence yazisini gecikdirmeden et.
      await this._butunPresenceYenile();
      this._presenceRefreshBaslat();

      console.log(
        "[REDIS] Runtime bus hazirdir. instance=" +
        this.instanceId
      );

      return true;
    }
    catch (error) {
      this.ready = false;

      console.error(
        "[REDIS] Runtime bus baslamadi:",
        error && error.message ? error.message : error
      );

      if (this.required) {
        throw error;
      }

      return false;
    }
  }

  async registerLocalPlayer(playerId) {
    const id = metnAl(playerId);
    if (!id) return false;

    this.localPlayers.add(id);

    if (!this.ready) {
      return false;
    }

    await this._presenceYenile(id);
    return true;
  }

  async unregisterLocalPlayer(playerId) {
    const id = metnAl(playerId);
    if (!id) return false;

    this.localPlayers.delete(id);

    if (!this.ready) {
      return false;
    }

    const script =
      "if redis.call('GET', KEYS[1]) == ARGV[1] " +
      "then return redis.call('DEL', KEYS[1]) " +
      "else return 0 end";

    await this.commandClient.eval(script, {
      keys: [this.presenceKey(id)],
      arguments: [this.instanceId]
    });

    return true;
  }

  async publishToPlayer(playerId, payload) {
    const id = metnAl(playerId);
    if (!id || !this.ready) {
      return false;
    }

    const targetInstanceId =
      await this.commandClient.get(
        this.presenceKey(id)
      );

    if (!targetInstanceId) {
      return false;
    }

    if (targetInstanceId === this.instanceId) {
      return false;
    }

    const envelope = {
      version: 1,
      sourceInstanceId: this.instanceId,
      playerId: id,
      payload
    };

    const subscriberCount =
      await this.commandClient.publish(
        this.instanceChannel(targetInstanceId),
        JSON.stringify(envelope)
      );

    return Number(subscriberCount) > 0;
  }

  async close() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    const localIds = Array.from(this.localPlayers);

    // Presence acarlarini Redis baglanmazdan ve ready false olmadan sil.
    for (const playerId of localIds) {
      try {
        await this.unregisterLocalPlayer(playerId);
      }
      catch (_) {
      }
    }

    this.localPlayers.clear();
    this.ready = false;

    if (this.subscriber) {
      try {
        if (this.subscriber.isOpen) {
          await this.subscriber.quit();
        }
      }
      catch (_) {
      }
      this.subscriber = null;
    }

    if (this.commandClient) {
      try {
        if (this.commandClient.isOpen) {
          await this.commandClient.quit();
        }
      }
      catch (_) {
      }
      this.commandClient = null;
    }
  }

  async _presenceYenile(playerId) {
    if (!this.ready || !this.commandClient) {
      return false;
    }

    await this.commandClient.set(
      this.presenceKey(playerId),
      this.instanceId,
      {
        EX: this.presenceTtlSeconds
      }
    );

    return true;
  }

  _presenceRefreshBaslat() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      this._butunPresenceYenile().catch((error) => {
        console.error(
          "[REDIS] presence refresh error:",
          error && error.message ? error.message : error
        );
      });
    }, this.presenceRefreshMs);

    if (
      this.refreshTimer &&
      typeof this.refreshTimer.unref === "function"
    ) {
      this.refreshTimer.unref();
    }
  }

  async _butunPresenceYenile() {
    if (
      !this.ready ||
      !this.commandClient ||
      this.localPlayers.size === 0
    ) {
      return;
    }

    const transaction =
      this.commandClient.multi();

    for (const playerId of this.localPlayers) {
      transaction.set(
        this.presenceKey(playerId),
        this.instanceId,
        {
          EX: this.presenceTtlSeconds
        }
      );
    }

    await transaction.exec();
  }

  async _directMesajiEmalEt(raw) {
    if (!raw || !this.onDirectMessage) {
      return;
    }

    let envelope;

    try {
      envelope = JSON.parse(raw);
    }
    catch (_) {
      return;
    }

    if (
      !envelope ||
      envelope.version !== 1 ||
      !metnAl(envelope.playerId) ||
      !envelope.payload ||
      typeof envelope.payload !== "object"
    ) {
      return;
    }

    try {
      await this.onDirectMessage({
        playerId: envelope.playerId,
        payload: envelope.payload,
        sourceInstanceId: envelope.sourceInstanceId || ""
      });
    }
    catch (error) {
      console.error(
        "[REDIS] direct message handler error:",
        error && error.message ? error.message : error
      );
    }
  }
}

function createRuntimeRedisBus(options) {
  return new RuntimeRedisBus(options);
}

module.exports = {
  RuntimeRedisBus,
  createRuntimeRedisBus
};
