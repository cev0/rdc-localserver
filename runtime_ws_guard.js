"use strict";

const DEFAULT_MAX_PAYLOAD_BYTES = 1024 * 1024;
const DEFAULT_RATE_PER_SECOND = 80;
const DEFAULT_RATE_BURST = 160;
const DEFAULT_HEARTBEAT_MS = 30000;
const DEFAULT_MAX_BUFFERED_BYTES = 8 * 1024 * 1024;

function musbetTamEded(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < min) {
    return fallback;
  }

  return Math.min(n, max);
}

function websocketRuntimeConfigFromEnv(env = process.env) {
  return {
    maxPayloadBytes: musbetTamEded(
      env.WS_MAX_PAYLOAD_BYTES,
      DEFAULT_MAX_PAYLOAD_BYTES,
      1024,
      16 * 1024 * 1024
    ),
    ratePerSecond: musbetTamEded(
      env.WS_RATE_PER_SECOND,
      DEFAULT_RATE_PER_SECOND,
      1,
      10000
    ),
    rateBurst: musbetTamEded(
      env.WS_RATE_BURST,
      DEFAULT_RATE_BURST,
      1,
      20000
    ),
    heartbeatMs: musbetTamEded(
      env.WS_HEARTBEAT_MS,
      DEFAULT_HEARTBEAT_MS,
      5000,
      5 * 60 * 1000
    ),
    maxBufferedBytes: musbetTamEded(
      env.WS_MAX_BUFFERED_BYTES,
      DEFAULT_MAX_BUFFERED_BYTES,
      64 * 1024,
      64 * 1024 * 1024
    )
  };
}

function byteLengthAl(data) {
  if (data == null) {
    return 0;
  }

  if (Buffer.isBuffer(data)) {
    return data.length;
  }

  if (data instanceof ArrayBuffer) {
    return data.byteLength;
  }

  if (ArrayBuffer.isView(data)) {
    return data.byteLength;
  }

  if (typeof data === "string") {
    return Buffer.byteLength(data, "utf8");
  }

  return Buffer.byteLength(String(data), "utf8");
}

class RuntimeWebSocketGuard {
  constructor(options = {}) {
    this.config = {
      ...websocketRuntimeConfigFromEnv({}),
      ...options
    };

    this._states = new WeakMap();
    this._heartbeatTimer = null;

    this.metrics = {
      acceptedMessages: 0,
      rejectedOversize: 0,
      rejectedRateLimit: 0,
      droppedBackpressure: 0,
      terminatedStale: 0
    };
  }

  attach(ws, nowMs = Date.now()) {
    if (!ws) {
      return;
    }

    this._states.set(ws, {
      tokens: this.config.rateBurst,
      lastRefillAtMs: Number(nowMs) || Date.now()
    });

    ws._runtimeAlive = true;

    if (typeof ws.on === "function") {
      ws.on("pong", () => {
        ws._runtimeAlive = true;
      });
    }
  }

  acceptInbound(ws, data, nowMs = Date.now()) {
    const size = byteLengthAl(data);

    if (size > this.config.maxPayloadBytes) {
      this.metrics.rejectedOversize += 1;

      return {
        ok: false,
        code: "MESSAGE_TOO_LARGE",
        closeCode: 1009,
        message: "WebSocket message is too large."
      };
    }

    let state = this._states.get(ws);

    if (!state) {
      this.attach(ws, nowMs);
      state = this._states.get(ws);
    }

    const now = Number(nowMs) || Date.now();
    const elapsedMs = Math.max(0, now - state.lastRefillAtMs);

    if (elapsedMs > 0) {
      const refill =
        (elapsedMs / 1000) *
        this.config.ratePerSecond;

      state.tokens = Math.min(
        this.config.rateBurst,
        state.tokens + refill
      );

      state.lastRefillAtMs = now;
    }

    if (state.tokens < 1) {
      this.metrics.rejectedRateLimit += 1;

      return {
        ok: false,
        code: "RATE_LIMITED",
        closeCode: 1008,
        message: "Too many WebSocket messages."
      };
    }

    state.tokens -= 1;
    this.metrics.acceptedMessages += 1;

    return {
      ok: true,
      size
    };
  }

  sendJson(ws, payload) {
    if (!ws || ws.readyState !== 1) {
      return false;
    }

    const buffered =
      Number(ws.bufferedAmount) || 0;

    if (
      buffered >
      this.config.maxBufferedBytes
    ) {
      this.metrics.droppedBackpressure += 1;

      try {
        ws.close(
          1013,
          "server_backpressure"
        );
      }
      catch (_) {
      }

      return false;
    }

    let json;

    try {
      json = JSON.stringify(payload);
    }
    catch (_) {
      return false;
    }

    try {
      ws.send(json);
      return true;
    }
    catch (_) {
      return false;
    }
  }

  heartbeatSweep(wss) {
    if (!wss || !wss.clients) {
      return;
    }

    for (const ws of wss.clients) {
      if (!ws) {
        continue;
      }

      if (ws._runtimeAlive === false) {
        this.metrics.terminatedStale += 1;

        try {
          if (typeof ws.terminate === "function") {
            ws.terminate();
          }
          else if (typeof ws.close === "function") {
            ws.close(1001, "heartbeat_timeout");
          }
        }
        catch (_) {
        }

        continue;
      }

      ws._runtimeAlive = false;

      try {
        if (typeof ws.ping === "function") {
          ws.ping();
        }
      }
      catch (_) {
      }
    }
  }

  startHeartbeat(wss) {
    if (this._heartbeatTimer) {
      return () => this.stopHeartbeat();
    }

    this._heartbeatTimer = setInterval(
      () => this.heartbeatSweep(wss),
      this.config.heartbeatMs
    );

    if (
      this._heartbeatTimer &&
      typeof this._heartbeatTimer.unref === "function"
    ) {
      this._heartbeatTimer.unref();
    }

    return () => this.stopHeartbeat();
  }

  stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  snapshot() {
    return {
      config: {
        ...this.config
      },
      metrics: {
        ...this.metrics
      }
    };
  }
}

module.exports = {
  DEFAULT_MAX_PAYLOAD_BYTES,
  DEFAULT_RATE_PER_SECOND,
  DEFAULT_RATE_BURST,
  DEFAULT_HEARTBEAT_MS,
  DEFAULT_MAX_BUFFERED_BYTES,
  websocketRuntimeConfigFromEnv,
  byteLengthAl,
  RuntimeWebSocketGuard
};
