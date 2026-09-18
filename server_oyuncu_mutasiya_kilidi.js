"use strict";

const crypto = require("crypto");

const aktivKilidler = new Map();

let redisClient = null;
let redisConnectPromise = null;
let redisWarningYazildi = false;

const REDIS_URL =
  typeof process.env.REDIS_URL === "string"
    ? process.env.REDIS_URL.trim()
    : "";

const REDIS_REQUIRED =
  ["1", "true", "yes", "on"].includes(
    String(
      process.env.REDIS_REQUIRED || ""
    )
      .trim()
      .toLowerCase()
  );

const REDIS_NAMESPACE =
  (process.env.REDIS_NAMESPACE || "rdc:v2").trim();

const LOCK_TTL_MS =
  Math.max(
    5000,
    Number(process.env.REDIS_LOCK_TTL_MS || 30000) || 30000
  );

const LOCK_WAIT_MS =
  Math.max(
    500,
    Number(process.env.REDIS_LOCK_WAIT_MS || 5000) || 5000
  );

const LOCK_RETRY_MS =
  Math.max(
    20,
    Number(process.env.REDIS_LOCK_RETRY_MS || 60) || 60
  );

function metnAl(v, max = 128) {
  return typeof v === "string"
    ? v.trim().slice(0, max).toLowerCase()
    : "";
}

function gozle(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function tokenYarat() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(16).toString("hex");
}

function lockKey(playerId) {
  return `${REDIS_NAMESPACE}:lock:player:${playerId}`;
}

async function redisClientAl() {
  if (!REDIS_URL) {
    if (REDIS_REQUIRED) {
      throw new Error(
        "REDIS_REQUIRED=1-dir, amma REDIS_URL verilmeyib."
      );
    }

    return null;
  }

  if (redisClient && redisClient.isReady) {
    return redisClient;
  }

  if (redisConnectPromise) {
    return await redisConnectPromise;
  }

  redisConnectPromise = (async () => {
    try {
      const { createClient } = require("@redis/client");

      const client = createClient({
        url: REDIS_URL
      });

      client.on("error", (error) => {
        if (!redisWarningYazildi) {
          redisWarningYazildi = true;
          console.error(
            "[DISTRIBUTED_LOCK] Redis error:",
            error && error.message ? error.message : error
          );
        }
      });

      await client.connect();

      redisClient = client;
      redisWarningYazildi = false;

      return client;
    }
    catch (error) {
      if (REDIS_REQUIRED) {
        throw error;
      }

      if (!redisWarningYazildi) {
        redisWarningYazildi = true;
        console.warn(
          "[DISTRIBUTED_LOCK] Redis elcatmazdir; local lock ile davam edilir:",
          error && error.message ? error.message : error
        );
      }

      return null;
    }
    finally {
      redisConnectPromise = null;
    }
  })();

  return await redisConnectPromise;
}

async function distributedLockAl(playerId) {
  const client = await redisClientAl();

  if (!client) {
    return null;
  }

  const key = lockKey(playerId);
  const token = tokenYarat();
  const deadline = Date.now() + LOCK_WAIT_MS;

  while (Date.now() <= deadline) {
    const result = await client.set(
      key,
      token,
      {
        NX: true,
        PX: LOCK_TTL_MS
      }
    );

    if (result === "OK") {
      return {
        client,
        key,
        token,
        lockLost: false,
        renewTimer: null
      };
    }

    const jitter = Math.floor(Math.random() * 25);
    await gozle(LOCK_RETRY_MS + jitter);
  }

  throw new Error(
    "PLAYER_DISTRIBUTED_LOCK_TIMEOUT"
  );
}

function distributedLockYenilemeyiBaslat(handle) {
  if (!handle || !handle.client) {
    return;
  }

  const renewEveryMs =
    Math.max(1000, Math.floor(LOCK_TTL_MS / 3));

  const script =
    "if redis.call('GET', KEYS[1]) == ARGV[1] " +
    "then return redis.call('PEXPIRE', KEYS[1], ARGV[2]) " +
    "else return 0 end";

  handle.renewTimer = setInterval(async () => {
    try {
      const result = await handle.client.eval(
        script,
        {
          keys: [handle.key],
          arguments: [
            handle.token,
            String(LOCK_TTL_MS)
          ]
        }
      );

      if (Number(result) !== 1) {
        handle.lockLost = true;
      }
    }
    catch (error) {
      handle.lockLost = true;

      console.error(
        "[DISTRIBUTED_LOCK] Lock renew failed:",
        error && error.message ? error.message : error
      );
    }
  }, renewEveryMs);

  if (
    handle.renewTimer &&
    typeof handle.renewTimer.unref === "function"
  ) {
    handle.renewTimer.unref();
  }
}

async function distributedLockBurax(handle) {
  if (!handle) {
    return;
  }

  if (handle.renewTimer) {
    clearInterval(handle.renewTimer);
    handle.renewTimer = null;
  }

  if (!handle.client) {
    return;
  }

  const script =
    "if redis.call('GET', KEYS[1]) == ARGV[1] " +
    "then return redis.call('DEL', KEYS[1]) " +
    "else return 0 end";

  try {
    await handle.client.eval(
      script,
      {
        keys: [handle.key],
        arguments: [handle.token]
      }
    );
  }
  catch (error) {
    console.error(
      "[DISTRIBUTED_LOCK] Lock release failed:",
      error && error.message ? error.message : error
    );
  }
}

async function oyuncuMutasiyaKilidiIleIcraEt(
  playerId,
  emeliyyat
) {
  const acar = metnAl(playerId, 128);

  if (!acar || typeof emeliyyat !== "function") {
    return typeof emeliyyat === "function"
      ? await emeliyyat()
      : undefined;
  }

  // Bir instance daxilinde evvelki davranisi saxlayiriq:
  // eyni player ucun mutation-lar siraya duzulur.
  const evvelki =
    aktivKilidler.get(acar) ||
    Promise.resolve();

  let localKilidiAc;

  const cari = new Promise(resolve => {
    localKilidiAc = resolve;
  });

  aktivKilidler.set(acar, cari);

  let distributedHandle = null;

  try {
    await evvelki.catch(() => {});

    distributedHandle =
      await distributedLockAl(acar);

    distributedLockYenilemeyiBaslat(
      distributedHandle
    );

    const netice = await emeliyyat();

    if (
      distributedHandle &&
      distributedHandle.lockLost &&
      REDIS_REQUIRED
    ) {
      throw new Error(
        "PLAYER_DISTRIBUTED_LOCK_LOST"
      );
    }

    return netice;
  }
  finally {
    await distributedLockBurax(
      distributedHandle
    );

    localKilidiAc();

    if (aktivKilidler.get(acar) === cari) {
      aktivKilidler.delete(acar);
    }
  }
}

function oyuncuMutasiyaNovbesiVar(playerId) {
  const acar = metnAl(playerId, 128);
  return !!acar && aktivKilidler.has(acar);
}

module.exports = {
  oyuncuMutasiyaKilidiIleIcraEt,
  oyuncuMutasiyaNovbesiVar
};
