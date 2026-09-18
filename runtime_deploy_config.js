"use strict";

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

function musbetReqem(value, fallback) {
  const n = Number(value);

  return Number.isFinite(n) && n > 0
    ? n
    : fallback;
}

function runtimeDeployConfiginiAl(env = process.env) {
  const nodeEnv =
    metnAl(env.NODE_ENV, "development")
      .toLowerCase();

  return {
    nodeEnv,
    production:
      nodeEnv === "production",
    koyeb:
      !!metnAl(
        env.KOYEB_INSTANCE_ID
      ),
    multiInstance:
      bayraqAktivdir(
        env.RUNTIME_MULTI_INSTANCE
      ),
    redisRequired:
      bayraqAktivdir(
        env.REDIS_REQUIRED
      ),
    redisUrlConfigured:
      !!metnAl(
        env.REDIS_URL
      ),
    databaseUrlConfigured:
      !!metnAl(
        env.DATABASE_URL
      ),
    redisNamespace:
      metnAl(
        env.REDIS_NAMESPACE,
        "rdc:v2"
      ),
    presenceTtlSeconds:
      Math.max(
        30,
        musbetReqem(
          env.REDIS_PRESENCE_TTL_SECONDS,
          90
        )
      ),
    presenceRefreshMs:
      Math.max(
        10000,
        musbetReqem(
          env.REDIS_PRESENCE_REFRESH_MS,
          30000
        )
      ),
    lockTtlMs:
      Math.max(
        5000,
        musbetReqem(
          env.REDIS_LOCK_TTL_MS,
          30000
        )
      ),
    lockWaitMs:
      Math.max(
        500,
        musbetReqem(
          env.REDIS_LOCK_WAIT_MS,
          5000
        )
      ),
    lockRetryMs:
      Math.max(
        20,
        musbetReqem(
          env.REDIS_LOCK_RETRY_MS,
          60
        )
      )
  };
}

function runtimeDeployConfiginiYoxla(config) {
  if (
    !config ||
    typeof config !== "object"
  ) {
    throw new Error(
      "RUNTIME_DEPLOY_CONFIG_INVALID: konfiqurasiya yoxdur."
    );
  }

  const xetalar = [];

  if (
    config.multiInstance &&
    !config.redisRequired
  ) {
    xetalar.push(
      "RUNTIME_MULTI_INSTANCE=1 üçün REDIS_REQUIRED=1 tələb olunur."
    );
  }

  if (
    (
      config.multiInstance ||
      config.redisRequired
    ) &&
    !config.redisUrlConfigured
  ) {
    xetalar.push(
      "Multi-instance/required Redis rejimi üçün REDIS_URL tələb olunur."
    );
  }

  if (
    config.multiInstance &&
    !config.databaseUrlConfigured
  ) {
    xetalar.push(
      "RUNTIME_MULTI_INSTANCE=1 üçün DATABASE_URL tələb olunur."
    );
  }

  if (
    !config.redisNamespace ||
    typeof config.redisNamespace !==
      "string"
  ) {
    xetalar.push(
      "REDIS_NAMESPACE boş ola bilməz."
    );
  }

  if (
    config.presenceRefreshMs >=
      config.presenceTtlSeconds *
        1000
  ) {
    xetalar.push(
      "REDIS_PRESENCE_REFRESH_MS presence TTL-dən kiçik olmalıdır."
    );
  }

  if (
    config.lockRetryMs >
      config.lockWaitMs
  ) {
    xetalar.push(
      "REDIS_LOCK_RETRY_MS REDIS_LOCK_WAIT_MS-dən böyük ola bilməz."
    );
  }

  if (xetalar.length > 0) {
    throw new Error(
      "RUNTIME_DEPLOY_CONFIG_INVALID: " +
      xetalar.join(" | ")
    );
  }

  return config;
}

function runtimeDeployPublicMelumatiniAl(config) {
  return {
    nodeEnv:
      config.nodeEnv,
    production:
      config.production,
    koyeb:
      config.koyeb,
    multiInstance:
      config.multiInstance,
    redisRequired:
      config.redisRequired,
    redisConfigured:
      config.redisUrlConfigured,
    databaseConfigured:
      config.databaseUrlConfigured,
    redisNamespace:
      config.redisNamespace
  };
}

module.exports = {
  runtimeDeployConfiginiAl,
  runtimeDeployConfiginiYoxla,
  runtimeDeployPublicMelumatiniAl
};
