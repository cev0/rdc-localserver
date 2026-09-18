"use strict";

const crypto = require("crypto");
const {
  requestIdAl
} = require("./runtime_protocol_envelope");

const DEFAULT_MAX_ITEMS = 128;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const STATE_KEY = "serverRequestIdempotency";

function metnAl(value, max = 128) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function derinKopyala(value) {
  if (value == null) {
    return value;
  }

  return JSON.parse(
    JSON.stringify(value)
  );
}

function sabitDeyereCevir(value) {
  if (Array.isArray(value)) {
    return value.map(
      sabitDeyereCevir
    );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    const result = {};

    for (
      const key of
      Object.keys(value).sort()
    ) {
      if (key === "requestId") {
        continue;
      }

      result[key] =
        sabitDeyereCevir(
          value[key]
        );
    }

    return result;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  return null;
}

function payloadBarmaqIziAl(payload) {
  const canonical =
    JSON.stringify(
      sabitDeyereCevir(
        payload == null
          ? null
          : payload
      )
    );

  return crypto
    .createHash("sha256")
    .update(canonical)
    .digest("hex");
}

function storeTeminEt(
  state,
  nowMs = Date.now(),
  options = {}
) {
  if (
    !state ||
    typeof state !== "object" ||
    Array.isArray(state)
  ) {
    throw new Error(
      "Idempotency üçün oyunçu state-i yoxdur."
    );
  }

  const maxItems =
    Math.max(
      1,
      Math.trunc(
        Number(options.maxItems) ||
        DEFAULT_MAX_ITEMS
      )
    );

  const ttlMs =
    Math.max(
      1000,
      Math.trunc(
        Number(options.ttlMs) ||
        DEFAULT_TTL_MS
      )
    );

  const now =
    Math.max(
      0,
      Math.trunc(
        Number(nowMs) ||
        Date.now()
      )
    );

  if (
    !state[STATE_KEY] ||
    typeof state[STATE_KEY] !==
      "object" ||
    Array.isArray(
      state[STATE_KEY]
    )
  ) {
    state[STATE_KEY] = {
      version: 1,
      items: []
    };
  }

  const store =
    state[STATE_KEY];

  store.version = 1;

  if (!Array.isArray(store.items)) {
    store.items = [];
  }

  const minimumTime =
    now - ttlMs;

  store.items =
    store.items
      .filter(item => {
        if (
          !item ||
          typeof item !== "object"
        ) {
          return false;
        }

        const operationType =
          metnAl(
            item.operationType,
            128
          ).toLowerCase();

        const rid =
          requestIdAl(item);

        const completedAtMs =
          Number(
            item.completedAtMs
          ) || 0;

        return (
          !!operationType &&
          !!rid &&
          completedAtMs >=
            minimumTime
        );
      })
      .slice(-maxItems);

  return store;
}

function requestYoxla(
  state,
  operationType,
  requestId,
  payload,
  nowMs = Date.now(),
  options = {}
) {
  const operation =
    metnAl(
      operationType,
      128
    ).toLowerCase();

  const rid =
    requestIdAl({
      requestId
    });

  if (!rid) {
    return {
      enabled: false,
      replay: false,
      conflict: false,
      responses: [],
      result: null
    };
  }

  if (!operation) {
    return {
      enabled: true,
      replay: false,
      conflict: true,
      responses: [],
      result: null,
      message:
        "Idempotent əməliyyat tipi yoxdur."
    };
  }

  const fingerprint =
    payloadBarmaqIziAl(
      payload
    );

  const store =
    storeTeminEt(
      state,
      nowMs,
      options
    );

  for (
    let i = store.items.length - 1;
    i >= 0;
    i--
  ) {
    const item =
      store.items[i];

    if (
      metnAl(
        item.operationType,
        128
      ).toLowerCase() !==
        operation ||
      requestIdAl(item) !== rid
    ) {
      continue;
    }

    if (
      metnAl(
        item.fingerprint,
        128
      ) !== fingerprint
    ) {
      return {
        enabled: true,
        replay: false,
        conflict: true,
        responses: [],
        result: null,
        message:
          "Eyni requestId fərqli payload ilə istifadə edilə bilməz."
      };
    }

    return {
      enabled: true,
      replay: true,
      conflict: false,
      responses:
        Array.isArray(
          item.responses
        )
          ? derinKopyala(
              item.responses
            )
          : [],
      result:
        derinKopyala(
          item.result
        ),
      completedAtMs:
        Number(
          item.completedAtMs
        ) || 0
    };
  }

  return {
    enabled: true,
    replay: false,
    conflict: false,
    responses: [],
    result: null
  };
}

function requestNeticesiniQeydEt(
  state,
  operationType,
  requestId,
  payload,
  value,
  nowMs = Date.now(),
  options = {}
) {
  const operation =
    metnAl(
      operationType,
      128
    ).toLowerCase();

  const rid =
    requestIdAl({
      requestId
    });

  if (!operation || !rid) {
    return null;
  }

  const fingerprint =
    payloadBarmaqIziAl(
      payload
    );

  const store =
    storeTeminEt(
      state,
      nowMs,
      options
    );

  const existing =
    store.items.find(
      item =>
        metnAl(
          item.operationType,
          128
        ).toLowerCase() ===
          operation &&
        requestIdAl(item) ===
          rid
    );

  if (existing) {
    if (
      metnAl(
        existing.fingerprint,
        128
      ) !== fingerprint
    ) {
      throw new Error(
        "Eyni requestId fərqli payload ilə qeyd edilə bilməz."
      );
    }

    return derinKopyala(
      existing
    );
  }

  const normalizedValue =
    value &&
    typeof value === "object"
      ? value
      : {};

  const item = {
    operationType:
      operation,
    requestId:
      rid,
    fingerprint,
    completedAtMs:
      Math.max(
        0,
        Math.trunc(
          Number(nowMs) ||
          Date.now()
        )
      ),
    responses:
      Array.isArray(
        normalizedValue.responses
      )
        ? derinKopyala(
            normalizedValue.responses
          )
        : [],
    result:
      Object.prototype
        .hasOwnProperty.call(
          normalizedValue,
          "result"
        )
        ? derinKopyala(
            normalizedValue.result
          )
        : null
  };

  store.items.push(item);

  const maxItems =
    Math.max(
      1,
      Math.trunc(
        Number(options.maxItems) ||
        DEFAULT_MAX_ITEMS
      )
    );

  store.items =
    store.items.slice(
      -maxItems
    );

  return derinKopyala(
    item
  );
}

function stateIdempotencyExecutorYarat(
  options = {}
) {
  const getPlayerState =
    options.getPlayerState;

  const nowMs =
    typeof options.nowMs ===
      "function"
      ? options.nowMs
      : Date.now;

  if (
    typeof getPlayerState !==
    "function"
  ) {
    throw new Error(
      "Idempotency üçün getPlayerState yoxdur."
    );
  }

  return async function executeIdempotent(
    context
  ) {
    const {
      playerId,
      type,
      msg,
      ws,
      send,
      execute
    } = context || {};

    if (
      typeof execute !== "function"
    ) {
      throw new Error(
        "Idempotency execute funksiyası yoxdur."
      );
    }

    const requestId =
      requestIdAl(msg);

    if (!requestId) {
      return await execute(send);
    }

    const state =
      getPlayerState(playerId);

    const check =
      requestYoxla(
        state,
        type,
        requestId,
        msg,
        nowMs(),
        options
      );

    if (check.conflict) {
      if (
        typeof send ===
        "function"
      ) {
        send(ws, {
          type: "error",
          code:
            "IDEMPOTENCY_CONFLICT",
          message:
            check.message ||
            "requestId conflict"
        });
      }

      return {
        handled: true,
        conflict: true
      };
    }

    if (check.replay) {
      if (
        typeof send ===
        "function"
      ) {
        for (
          const payload of
          check.responses
        ) {
          send(
            ws,
            derinKopyala(
              payload
            )
          );
        }
      }

      return {
        handled: true,
        replay: true
      };
    }

    const responses = [];

    const recordingSend =
      (targetWs, payload) => {
        if (
          targetWs === ws &&
          payload &&
          typeof payload ===
            "object" &&
          !Array.isArray(payload)
        ) {
          responses.push(
            derinKopyala(
              payload
            )
          );
        }

        return send(
          targetWs,
          payload
        );
      };

    const result =
      await execute(
        recordingSend
      );

    if (responses.length > 0) {
      requestNeticesiniQeydEt(
        state,
        type,
        requestId,
        msg,
        {
          responses,
          result: null
        },
        nowMs(),
        options
      );
    }

    return result;
  };
}

module.exports = {
  DEFAULT_MAX_ITEMS,
  DEFAULT_TTL_MS,
  STATE_KEY,
  payloadBarmaqIziAl,
  storeTeminEt,
  requestYoxla,
  requestNeticesiniQeydEt,
  stateIdempotencyExecutorYarat
};
