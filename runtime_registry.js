"use strict";

/**
 * RuntimeRegistry
 * ------------------------------------------------------------
 * Serverin proses-yaddasi state ve socket saxlamasini bir yerde toplayir.
 *
 * Hazirda davranis Map ile eynidir. Meqsed server.js-in birbasa Map-a
 * bagliligini kesmekdir ki novbeti merhelede:
 * - player hot-state -> Redis cache,
 * - connection routing -> local socket + Redis Pub/Sub,
 * - multi-instance presence
 * elave edilende gameplay kodunu yeniden yazmaq gerekmesin.
 */

class MapCompatibleRegistry {
  constructor(name) {
    this.name = name || "runtime";
    this._items = new Map();
  }

  get size() {
    return this._items.size;
  }

  has(key) {
    return this._items.has(key);
  }

  get(key) {
    return this._items.get(key);
  }

  set(key, value) {
    this._items.set(key, value);
    return this;
  }

  delete(key) {
    return this._items.delete(key);
  }

  clear() {
    this._items.clear();
  }

  keys() {
    return this._items.keys();
  }

  values() {
    return this._items.values();
  }

  entries() {
    return this._items.entries();
  }

  forEach(callback, thisArg) {
    return this._items.forEach(callback, thisArg);
  }

  [Symbol.iterator]() {
    return this._items[Symbol.iterator]();
  }
}

class PlayerRuntimeRegistry extends MapCompatibleRegistry {
  constructor() {
    super("players");
  }
}

class ConnectionRuntimeRegistry extends MapCompatibleRegistry {
  constructor() {
    super("connections");
    this._socketSets = new Map();
    this._remotePublisher = null;
    this._lastLocalDisconnectHandler = null;
  }

  configureRemotePublisher(publisher) {
    this._remotePublisher =
      typeof publisher === "function"
        ? publisher
        : null;
  }

  configureLastLocalDisconnectHandler(handler) {
    this._lastLocalDisconnectHandler =
      typeof handler === "function"
        ? handler
        : null;
  }

  _lastLocalDisconnectQeydEt(playerId) {
    if (!this._lastLocalDisconnectHandler) {
      return;
    }

    try {
      this._lastLocalDisconnectHandler(
        playerId
      );
    }
    catch (error) {
      console.error(
        "[RUNTIME_REGISTRY] Last local disconnect handler failed:",
        error && error.message
          ? error.message
          : error
      );
    }
  }

  /**
   * Map-compatible get() son (primary) socket-i qaytarir.
   * Amma registry eyni player ucun bir nece local socket-i de izleyir.
   */
  set(playerId, socket) {
    let sockets = this._socketSets.get(playerId);
    if (!sockets) {
      sockets = new Set();
      this._socketSets.set(playerId, sockets);
    }

    sockets.add(socket);
    this._items.set(playerId, socket);
    return this;
  }

  forEachSocket(playerId, callback) {
    const sockets = this._socketSets.get(playerId);
    if (!sockets || typeof callback !== "function") {
      return 0;
    }

    let count = 0;
    for (const socket of sockets) {
      callback(socket);
      count += 1;
    }

    return count;
  }

  deliverLocal(playerId, payload, sendFn) {
    if (typeof sendFn !== "function") {
      return 0;
    }

    return this.forEachSocket(playerId, (socket) => {
      sendFn(socket, payload);
    });
  }

  deliver(playerId, payload, sendFn) {
    const localCount =
      this.deliverLocal(
        playerId,
        payload,
        sendFn
      );

    /*
     * Eyni hesab eyni anda başqa server instansında da açıq ola bilər.
     * Ona görə local socket tapılsa belə remote publish dayandırılmır.
     * Redis bus öz instanceId-sini target siyahısından çıxardığı üçün
     * bu fan-out local socket-lərdə duplicate yaratmır.
     */
    if (this._remotePublisher) {
      Promise.resolve(
        this._remotePublisher(
          playerId,
          payload
        )
      ).catch((error) => {
        console.error(
          "[RUNTIME_REGISTRY] Remote delivery failed:",
          error && error.message ? error.message : error
        );
      });

      return true;
    }

    return localCount > 0;
  }

  /**
   * Yalniz baglanan socket-i silir.
   * Reconnect zamani kohne socket close eventi yeni socket-i registry-den
   * sehvnen silmesin.
   */
  deleteIfCurrent(playerId, socket) {
    const sockets = this._socketSets.get(playerId);
    if (!sockets || !sockets.delete(socket)) {
      return false;
    }

    if (sockets.size === 0) {
      this._socketSets.delete(playerId);
      this._items.delete(playerId);
      this._lastLocalDisconnectQeydEt(
        playerId
      );
      return true;
    }

    if (this._items.get(playerId) === socket) {
      let latest = null;
      for (const candidate of sockets) {
        latest = candidate;
      }
      this._items.set(playerId, latest);
    }

    return true;
  }

  delete(playerId) {
    const hadLocalSockets =
      this._socketSets.delete(playerId);

    const deleted =
      this._items.delete(playerId);

    if (hadLocalSockets) {
      this._lastLocalDisconnectQeydEt(
        playerId
      );
    }

    return deleted;
  }

  clear() {
    this._socketSets.clear();
    this._items.clear();
  }
}

const players = new PlayerRuntimeRegistry();
const connections = new ConnectionRuntimeRegistry();

module.exports = {
  MapCompatibleRegistry,
  PlayerRuntimeRegistry,
  ConnectionRuntimeRegistry,
  players,
  connections
};
