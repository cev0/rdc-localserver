"use strict";

const crypto = require("crypto");

const MAKSIMUM_QEYD_SAYI = 80;

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function emeliyyatTipiniAl(v) {
  return metnAl(v, 96).toLowerCase();
}

function requestIdAl(v) {
  return metnAl(v, 128).toLowerCase();
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function sabitDeyereCevir(v) {
  if (Array.isArray(v)) {
    return v.map(sabitDeyereCevir);
  }

  if (v && typeof v === "object") {
    const netice = {};
    for (const acar of Object.keys(v).sort()) {
      netice[acar] = sabitDeyereCevir(v[acar]);
    }
    return netice;
  }

  if (typeof v === "number") {
    return Number.isFinite(v) ? v : 0;
  }

  if (typeof v === "string" || typeof v === "boolean" || v === null) {
    return v;
  }

  return null;
}

function barmaqIziAl(payload) {
  const sabit = JSON.stringify(sabitDeyereCevir(payload == null ? null : payload));
  return crypto.createHash("sha256").update(sabit).digest("hex");
}

function stateTeminEt(state) {
  if (!state || typeof state !== "object") {
    throw new Error("Sorğu idempotentliyi üçün oyunçu state-i yoxdur.");
  }

  if (
    !state.serverSorquIdempotentliyi ||
    typeof state.serverSorquIdempotentliyi !== "object" ||
    Array.isArray(state.serverSorquIdempotentliyi)
  ) {
    state.serverSorquIdempotentliyi = {
      version: 1,
      items: []
    };
  }

  state.serverSorquIdempotentliyi.version = 1;
  if (!Array.isArray(state.serverSorquIdempotentliyi.items)) {
    state.serverSorquIdempotentliyi.items = [];
  }

  state.serverSorquIdempotentliyi.items = state.serverSorquIdempotentliyi.items
    .filter(x => x && requestIdAl(x.requestId) && emeliyyatTipiniAl(x.operationType))
    .slice(-MAKSIMUM_QEYD_SAYI);

  return state.serverSorquIdempotentliyi;
}

function tekrarNeticesiniTap(state, operationType, requestId, payload) {
  const op = emeliyyatTipiniAl(operationType);
  const rid = requestIdAl(requestId);

  if (!rid) {
    return {
      enabled: false,
      replay: false,
      conflict: false,
      requestId: "",
      fingerprint: "",
      result: null
    };
  }

  if (!op) {
    return {
      enabled: true,
      replay: false,
      conflict: true,
      requestId: rid,
      fingerprint: "",
      result: null,
      message: "Idempotent əməliyyat tipi yoxdur."
    };
  }

  const fingerprint = barmaqIziAl(payload);
  const store = stateTeminEt(state);

  for (let i = store.items.length - 1; i >= 0; i--) {
    const item = store.items[i];
    if (
      emeliyyatTipiniAl(item.operationType) !== op ||
      requestIdAl(item.requestId) !== rid
    ) {
      continue;
    }

    if (metnAl(item.fingerprint, 128) !== fingerprint) {
      return {
        enabled: true,
        replay: false,
        conflict: true,
        requestId: rid,
        fingerprint,
        result: null,
        message: "Eyni requestId fərqli əməliyyat məlumatı ilə təkrar istifadə edilə bilməz."
      };
    }

    return {
      enabled: true,
      replay: true,
      conflict: false,
      requestId: rid,
      fingerprint,
      completedAtMs: tamEded(item.completedAtMs),
      result: kopyala(item.result)
    };
  }

  return {
    enabled: true,
    replay: false,
    conflict: false,
    requestId: rid,
    fingerprint,
    result: null
  };
}

function ugurluNeticeniQeydEt(state, operationType, requestId, payload, result, nowMs = Date.now()) {
  const op = emeliyyatTipiniAl(operationType);
  const rid = requestIdAl(requestId);
  if (!op || !rid) return null;

  const fingerprint = barmaqIziAl(payload);
  const store = stateTeminEt(state);

  const movcud = store.items.find(
    x => emeliyyatTipiniAl(x.operationType) === op && requestIdAl(x.requestId) === rid
  );

  if (movcud) {
    if (metnAl(movcud.fingerprint, 128) !== fingerprint) {
      throw new Error("Eyni requestId fərqli payload ilə qeyd edilə bilməz.");
    }
    return kopyala(movcud);
  }

  const qeyd = {
    operationType: op,
    requestId: rid,
    fingerprint,
    completedAtMs: tamEded(nowMs) || Date.now(),
    result: kopyala(result)
  };

  store.items.push(qeyd);
  store.items = store.items.slice(-MAKSIMUM_QEYD_SAYI);
  return kopyala(qeyd);
}

module.exports = {
  MAKSIMUM_QEYD_SAYI,
  requestIdAl,
  barmaqIziAl,
  stateTeminEt,
  tekrarNeticesiniTap,
  ugurluNeticeniQeydEt
};
