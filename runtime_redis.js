"use strict";

const crypto = require("crypto");

const DEFAULT_PRESENCE_TTL_SECONDS = 90;
const DEFAULT_PRESENCE_REFRESH_MS = 30000;

function metnAl(value, fallback = "") {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

function bayraqAktivdir(value) {
  return value === true ||
    ["1", "true", "yes", "on"].includes(
      String(value || "")
        .trim()
        .toLowerCase()
    );
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

    const requiredValue =
      options.required !== undefined
        ? options.required
        : process.env.REDIS_REQUIRED;

    this.required =
      bayraqAktivdir(
        requiredValue
      );

    this.clientFactory =
      typeof options.clientFactory === "function"
        ? options.clientFactory
        : null;

    this.onDirectMessage =
      typeof options.onDirectMessage === "function"
        ? options.onDirectMessage
        : null;

    this.onBroadcastMessage =
      typeof options.onBroadcastMessage === "function"
        ? options.onBroadcastMessage
        : null;

    this.commandClient = null;
    this.subscriber = null;
    this.ready = false;
    this.started = false;
    this.closing = false;
    this.subscribed = false;
    this.localPlayers = new Set();
    this.refreshTimer = null;
  }

  get enabled() {
    return !!this.redisUrl;
  }

  presenceKey(playerId) {
    // Legacy single-instance presence key rolling deploy uyğunluğu üçün saxlanılır.
    return `${this.namespace}:presence:${playerId}`;
  }

  presenceInstancesKey(playerId) {
    return `${this.namespace}:presence-v2:${playerId}`;
  }

  instanceChannel(instanceId = this.instanceId) {
    return `${this.namespace}:instance:${instanceId}`;
  }

  broadcastChannel() {
    return `${this.namespace}:broadcast:v1`;
  }

  async start() {
    if (this.started) {
      return this.ready;
    }

    this.started = true;
    this.closing = false;

    if (!this.enabled) {
      if (this.required) {
        throw new Error(
          "REDIS_REQUIRED=1-dir, amma REDIS_URL verilmeyib."
        );
      }

      console.log(
        "[REDIS] REDIS_URL yoxdur. Single-instance rejimi davam edir."
      );
      return false;
    }

    try {
      const createClient =
        this.clientFactory ||
        require("@redis/client").createClient;

      this.commandClient = createClient({
        url: this.redisUrl
      });

      this._clientLifecycleQeydEt(
        this.commandClient,
        "command"
      );

      await this.commandClient.connect();

      this.subscriber = this.commandClient.duplicate();

      this._clientLifecycleQeydEt(
        this.subscriber,
        "subscriber"
      );

      await this.subscriber.connect();

      await this.subscriber.subscribe(
        this.instanceChannel(),
        async (raw) => {
          await this._directMesajiEmalEt(raw);
        }
      );

      await this.subscriber.subscribe(
        this.broadcastChannel(),
        async (raw) => {
          await this._broadcastMesajiEmalEt(raw);
        }
      );

      this.subscribed = true;
      this._readyYenile();

      if (!this.ready) {
        throw new Error(
          "Redis command/subscriber client-ləri hazır deyil."
        );
      }

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
      this.subscribed = false;

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

    if (
      !this.commandClient ||
      !this.commandClient.isReady
    ) {
      return false;
    }

    await this.commandClient.zRem(
      this.presenceInstancesKey(id),
      this.instanceId
    );

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

    const targetInstanceIds =
      await this._aktivInstanceIdleriniAl(
        id
      );

    const remoteTargets =
      targetInstanceIds.filter(
        instanceId =>
          instanceId !==
            this.instanceId
      );

    if (remoteTargets.length === 0) {
      return false;
    }

    /*
     * Envelope v1 saxlanılır ki rolling deploy zamanı köhnə instance-lar
     * yeni multi-instance publisher-dan gələn mesajı qəbul edə bilsin.
     */
    const envelope = {
      version: 1,
      sourceInstanceId: this.instanceId,
      playerId: id,
      payload
    };

    let delivered = false;

    for (
      const targetInstanceId of
      remoteTargets
    ) {
      const subscriberCount =
        await this.commandClient.publish(
          this.instanceChannel(
            targetInstanceId
          ),
          JSON.stringify(envelope)
        );

      if (
        Number(subscriberCount) > 0
      ) {
        delivered = true;
      }
    }

    return delivered;
  }

  async publishBroadcast(
    scope,
    targetId,
    payload
  ) {
    const normalizedScope =
      metnAl(scope)
        .toLowerCase();

    const normalizedTargetId =
      metnAl(targetId);

    if (
      !this.ready ||
      !normalizedScope ||
      !normalizedTargetId ||
      !payload ||
      typeof payload !== "object"
    ) {
      return false;
    }

    const envelope = {
      version: 1,
      sourceInstanceId:
        this.instanceId,
      scope:
        normalizedScope,
      targetId:
        normalizedTargetId,
      payload
    };

    const subscriberCount =
      await this.commandClient.publish(
        this.broadcastChannel(),
        JSON.stringify(
          envelope
        )
      );

    return Number(
      subscriberCount
    ) > 0;
  }

  snapshot() {
    return {
      enabled: this.enabled,
      required: this.required,
      ready: this.ready,
      instanceId: this.instanceId,
      localPlayers: this.localPlayers.size,
      presenceMode: "multi-instance-v2",
      broadcastMode: "global-v1"
    };
  }

  async close() {
    this.closing = true;

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
    this.subscribed = false;

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

    this.started = false;
  }

  _clientLifecycleQeydEt(
    client,
    role
  ) {
    if (
      !client ||
      typeof client.on !== "function"
    ) {
      return;
    }

    client.on("error", (error) => {
      console.error(
        "[REDIS] " + role + " client error:",
        error && error.message ? error.message : error
      );
    });

    client.on("reconnecting", () => {
      this.ready = false;
    });

    client.on("end", () => {
      this.ready = false;
    });

    client.on("ready", () => {
      const evvelki =
        this.ready;

      this._readyYenile();

      if (
        !evvelki &&
        this.ready &&
        this.subscribed &&
        !this.closing
      ) {
        this._butunPresenceYenile()
          .catch((error) => {
            console.error(
              "[REDIS] reconnect presence refresh error:",
              error && error.message ? error.message : error
            );
          });
      }
    });
  }

  _readyYenile() {
    this.ready =
      !this.closing &&
      this.subscribed &&
      !!(
        this.commandClient &&
        this.commandClient.isReady
      ) &&
      !!(
        this.subscriber &&
        this.subscriber.isReady
      );

    return this.ready;
  }

  async _presenceYenile(playerId) {
    if (
      !this.ready ||
      !this.commandClient ||
      !this.commandClient.isReady
    ) {
      return false;
    }

    const now =
      Date.now();

    const expiresAtMs =
      now +
      this.presenceTtlSeconds *
        1000;

    const transaction =
      this.commandClient.multi();

    transaction.set(
      this.presenceKey(playerId),
      this.instanceId,
      {
        EX: this.presenceTtlSeconds
      }
    );

    transaction.zRemRangeByScore(
      this.presenceInstancesKey(
        playerId
      ),
      0,
      now
    );

    transaction.zAdd(
      this.presenceInstancesKey(
        playerId
      ),
      [
        {
          score: expiresAtMs,
          value: this.instanceId
        }
      ]
    );

    transaction.expire(
      this.presenceInstancesKey(
        playerId
      ),
      this.presenceTtlSeconds *
        2
    );

    await transaction.exec();

    return true;
  }

  async _aktivInstanceIdleriniAl(
    playerId
  ) {
    if (
      !this.commandClient ||
      !this.commandClient.isReady
    ) {
      return [];
    }

    const now =
      Date.now();

    const key =
      this.presenceInstancesKey(
        playerId
      );

    await this.commandClient
      .zRemRangeByScore(
        key,
        0,
        now
      );

    const multiInstanceIds =
      await this.commandClient
        .zRangeByScore(
          key,
          now + 1,
          "+inf"
        );

    /*
     * Legacy key həmişə ayrıca oxunur. Beləliklə rolling deploy zamanı
     * yeni instance həm v2 presence üzvlərinə, həm də köhnə serverin
     * single-instance presence qeydiyyatına çata bilir.
     */
    const legacyInstanceId =
      await this.commandClient.get(
        this.presenceKey(
          playerId
        )
      );

    const ids =
      new Set(
        Array.isArray(
          multiInstanceIds
        )
          ? multiInstanceIds
          : []
      );

    if (legacyInstanceId) {
      ids.add(
        legacyInstanceId
      );
    }

    return Array.from(ids);
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

    const now =
      Date.now();

    const expiresAtMs =
      now +
      this.presenceTtlSeconds *
        1000;

    for (const playerId of this.localPlayers) {
      transaction.set(
        this.presenceKey(playerId),
        this.instanceId,
        {
          EX: this.presenceTtlSeconds
        }
      );

      transaction.zRemRangeByScore(
        this.presenceInstancesKey(
          playerId
        ),
        0,
        now
      );

      transaction.zAdd(
        this.presenceInstancesKey(
          playerId
        ),
        [
          {
            score:
              expiresAtMs,
            value:
              this.instanceId
          }
        ]
      );

      transaction.expire(
        this.presenceInstancesKey(
          playerId
        ),
        this.presenceTtlSeconds *
          2
      );
    }

    await transaction.exec();
  }

  async _broadcastMesajiEmalEt(raw) {
    if (
      !raw ||
      !this.onBroadcastMessage
    ) {
      return;
    }

    let envelope;

    try {
      envelope =
        JSON.parse(raw);
    }
    catch (_) {
      return;
    }

    if (
      !envelope ||
      envelope.version !== 1 ||
      envelope.sourceInstanceId ===
        this.instanceId ||
      !metnAl(envelope.scope) ||
      !metnAl(envelope.targetId) ||
      !envelope.payload ||
      typeof envelope.payload !==
        "object"
    ) {
      return;
    }

    try {
      await this.onBroadcastMessage({
        scope:
          metnAl(
            envelope.scope
          ).toLowerCase(),
        targetId:
          metnAl(
            envelope.targetId
          ),
        payload:
          envelope.payload,
        sourceInstanceId:
          envelope.sourceInstanceId ||
          ""
      });
    }
    catch (error) {
      console.error(
        "[REDIS] broadcast message handler error:",
        error && error.message
          ? error.message
          : error
      );
    }
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
  createRuntimeRedisBus,
  bayraqAktivdir
};
