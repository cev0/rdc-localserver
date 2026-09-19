"use strict";

const assert = require("assert");
const {
  runtimeDeployConfiginiAl,
  runtimeDeployConfiginiYoxla,
  runtimeDeployPublicMelumatiniAl
} = require("./runtime_deploy_config");

(function singleInstanceDefault() {
  const config =
    runtimeDeployConfiginiAl({
      NODE_ENV: "development"
    });

  assert.strictEqual(
    config.multiInstance,
    false
  );

  assert.strictEqual(
    config.redisRequired,
    false
  );

  assert.doesNotThrow(
    () =>
      runtimeDeployConfiginiYoxla(
        config
      )
  );
})();

(function multiInstanceRedisRequiredGuard() {
  const config =
    runtimeDeployConfiginiAl({
      NODE_ENV: "production",
      RUNTIME_MULTI_INSTANCE: "1",
      REDIS_URL: "redis://example",
      DATABASE_URL:
        "postgresql://example"
    });

  assert.throws(
    () =>
      runtimeDeployConfiginiYoxla(
        config
      ),
    /REDIS_REQUIRED=1/
  );
})();

(function multiInstanceRedisUrlGuard() {
  const config =
    runtimeDeployConfiginiAl({
      NODE_ENV: "production",
      RUNTIME_MULTI_INSTANCE: "1",
      REDIS_REQUIRED: "true",
      DATABASE_URL:
        "postgresql://example"
    });

  assert.throws(
    () =>
      runtimeDeployConfiginiYoxla(
        config
      ),
    /REDIS_URL/
  );
})();

(function multiInstanceDatabaseGuard() {
  const config =
    runtimeDeployConfiginiAl({
      NODE_ENV: "production",
      RUNTIME_MULTI_INSTANCE: "1",
      REDIS_REQUIRED: "yes",
      REDIS_URL: "redis://example"
    });

  assert.throws(
    () =>
      runtimeDeployConfiginiYoxla(
        config
      ),
    /DATABASE_URL/
  );
})();

(function presenceCadenceGuard() {
  const config =
    runtimeDeployConfiginiAl({
      REDIS_PRESENCE_TTL_SECONDS:
        "30",
      REDIS_PRESENCE_REFRESH_MS:
        "30000"
    });

  assert.throws(
    () =>
      runtimeDeployConfiginiYoxla(
        config
      ),
    /presence TTL/
  );
})();

(function validKoyebMultiInstance() {
  const config =
    runtimeDeployConfiginiAl({
      NODE_ENV: "production",
      KOYEB_INSTANCE_ID:
        "instance-123",
      RUNTIME_MULTI_INSTANCE:
        "1",
      REDIS_REQUIRED:
        "on",
      REDIS_URL:
        "rediss://redis.example",
      DATABASE_URL:
        "postgresql://db.example",
      REDIS_NAMESPACE:
        "rdc:prod",
      REDIS_PRESENCE_TTL_SECONDS:
        "90",
      REDIS_PRESENCE_REFRESH_MS:
        "30000",
      REDIS_LOCK_TTL_MS:
        "30000",
      REDIS_LOCK_WAIT_MS:
        "5000",
      REDIS_LOCK_RETRY_MS:
        "60"
    });

  assert.doesNotThrow(
    () =>
      runtimeDeployConfiginiYoxla(
        config
      )
  );

  const publicInfo =
    runtimeDeployPublicMelumatiniAl(
      config
    );

  assert.deepStrictEqual(
    publicInfo,
    {
      nodeEnv: "production",
      production: true,
      koyeb: true,
      multiInstance: true,
      redisRequired: true,
      redisConfigured: true,
      databaseConfigured: true,
      redisNamespace:
        "rdc:prod"
    }
  );

  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(
      publicInfo,
      "redisUrl"
    ),
    false
  );

  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(
      publicInfo,
      "databaseUrl"
    ),
    false
  );
})();

console.log(
  "PASS: runtime deployment config fail-closes unsafe multi-instance Redis/Koyeb settings."
);
