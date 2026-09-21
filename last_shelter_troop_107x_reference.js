"use strict";

/*
 * Verified Last Shelter v1.250.x 107x troop rows recovered from the reference
 * server's init army payloads. Only fields stable across inspected reference
 * snapshots are preserved. `free` is deliberately excluded because it is a
 * player-owned mutable quantity, not troop configuration.
 *
 * 107319 is intentionally not promoted yet: its observed speed changes between
 * reference snapshots, so the static/effect split must be verified first.
 * Do not infer unlock buildings/levels from numeric ids.
 */

const TROOP_107X = Object.freeze({
  "107000": Object.freeze({ upkeep: 0.2083333283662796, heal_res: 5, wood: 0, range: 0, speed: 8, stone: 0, defen: 14, health: 8, iron: 0, march: 0, time: 20, level: 0, food: 61, heal_time: 50, power: 1, load: 8, attack: 6, move: 10 }),
  "107001": Object.freeze({ upkeep: 0.4166666567325592, heal_res: 10, wood: 0, range: 0, speed: 8, stone: 0, defen: 19, health: 9, iron: 0, march: 0, time: 25, level: 0, food: 100, heal_time: 70, power: 1.399999976158142, load: 8, attack: 8, move: 10 }),
  "107002": Object.freeze({ upkeep: 0.625, heal_res: 15, wood: 31, range: 0, speed: 9, stone: 0, defen: 13, health: 6, iron: 0, march: 0, time: 33, level: 0, food: 119, heal_time: 60, power: 1.899999976158142, load: 9, attack: 22, move: 10 }),
  "107003": Object.freeze({ upkeep: 0.8333333134651184, heal_res: 20, wood: 0, range: 0, speed: 8, stone: 0, defen: 35, health: 15, iron: 7, march: 0, time: 44, level: 0, food: 169, heal_time: 50, power: 2.5, load: 9, attack: 15, move: 10 }),
  "107004": Object.freeze({ upkeep: 1.0416666269302368, heal_res: 30, wood: 57, range: 0, speed: 9, stone: 0, defen: 22, health: 9, iron: 9, march: 0, time: 58, level: 0, food: 164, heal_time: 40, power: 3.200000047683716, load: 10, attack: 38, move: 10 }),
  "107005": Object.freeze({ upkeep: 1.25, heal_res: 40, wood: 0, range: 0, speed: 8, stone: 0, defen: 56, health: 22, iron: 18, march: 0, time: 75, level: 0, food: 245, heal_time: 32, power: 4, load: 10, attack: 24, move: 10 }),
  "107006": Object.freeze({ upkeep: 1.4583333730697632, heal_res: 50, wood: 0, range: 0, speed: 8, stone: 3, defen: 68, health: 26, iron: 22, march: 0, time: 95, level: 0, food: 253, heal_time: 26, power: 4.900000095367432, load: 11, attack: 29, move: 10 }),
  "107007": Object.freeze({ upkeep: 1.6666666269302368, heal_res: 50, wood: 108, range: 0, speed: 9, stone: 4, defen: 41, health: 15, iron: 25, march: 0, time: 118, level: 0, food: 203, heal_time: 22, power: 5.900000095367432, load: 11, attack: 70, move: 10 }),
  "107019": Object.freeze({ upkeep: 1.6666666269302368, heal_res: 100, wood: 0, range: 0, speed: 8, stone: 12, defen: 127, health: 44, iron: 95, march: 0, time: 173, level: 0, food: 300, heal_time: 25, power: 9, load: 12, attack: 36, move: 10 }),
  "107119": Object.freeze({ upkeep: 1.6666666269302368, heal_res: 100, wood: 0, range: 0, speed: 16.100000381469727, stone: 13, defen: 53, health: 22, iron: 160, march: 0, time: 173, level: 0, food: 0, heal_time: 25, power: 9, load: 10, attack: 102, move: 10 }),
  "107219": Object.freeze({ upkeep: 1.6666666269302368, heal_res: 100, wood: 0, range: 50, speed: 8, stone: 19, defen: 42, health: 16, iron: 75, march: 0, time: 173, level: 0, food: 155, heal_time: 25, power: 9, load: 12, attack: 72, move: 10 })
});

const LAST_SHELTER_SPECIAL_ARMS_CONFIG = Object.freeze({
  k1: "200000",
  k2: "107019,781000|107219,782400|107119,783800|107319,785200",
  mappings: Object.freeze([
    Object.freeze({ troopId: "107019", configId: "781000" }),
    Object.freeze({ troopId: "107219", configId: "782400" }),
    Object.freeze({ troopId: "107119", configId: "783800" }),
    Object.freeze({ troopId: "107319", configId: "785200" })
  ])
});

function specialArmConfigAl(troopId) {
  const id = String(troopId == null ? "" : troopId).trim();
  const found = LAST_SHELTER_SPECIAL_ARMS_CONFIG.mappings.find(x => x.troopId === id);
  return found ? { ...found } : null;
}

function troop107xAl(id) {
  const key = String(id == null ? "" : id).trim();
  return TROOP_107X[key] || null;
}

module.exports = { TROOP_107X, LAST_SHELTER_SPECIAL_ARMS_CONFIG, troop107xAl, specialArmConfigAl };
