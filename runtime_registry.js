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
  }

  /**
   * Yalniz cari socket-i silir.
   * Reconnect zamani kohne socket close eventi yeni socket-i registry-den
   * sehvnen silmesin.
   */
  deleteIfCurrent(playerId, socket) {
    if (this.get(playerId) !== socket) {
      return false;
    }

    return this.delete(playerId);
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
