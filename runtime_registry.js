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
    this._socketSets.delete(playerId);
    return this._items.delete(playerId);
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
