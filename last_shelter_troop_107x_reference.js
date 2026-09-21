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
  "107008": Object.freeze({ upkeep: 1.875, heal_res: 50, wood: 133, range: 0, speed: 9, stone: 6, defen: 49, health: 18, iron: 30, march: 0, time: 144, level: 0, food: 206, heal_time: 19, power: 7, load: 12, attack: 84, move: 10 }),
  "107009": Object.freeze({ upkeep: 2.0833332538604736, heal_res: 50, wood: 0, range: 0, speed: 8, arm_type: 1, stone: 9, defen: 114, health: 42, iron: 39, march: 0, time: 173, level: 0, food: 323, heal_time: 17, power: 8.199999809265137, load: 12, attack: 49, move: 10 }),
  "107100": Object.freeze({ upkeep: 0.2083333283662796, heal_res: 50, wood: 0, range: 0, speed: 16.100000381469727, stone: 0, defen: 8, health: 4, iron: 0, march: 0, time: 20, level: 0, food: 57, heal_time: 50, power: 1, load: 6, attack: 11, move: 10 }),
  "107101": Object.freeze({ upkeep: 0.4166666567325592, heal_res: 50, wood: 0, range: 0, speed: 16.100000381469727, stone: 0, defen: 11, health: 4, iron: 0, march: 0, time: 25, level: 0, food: 100, heal_time: 70, power: 1.399999976158142, load: 6, attack: 15, move: 10 }),
  "107102": Object.freeze({ upkeep: 0.625, heal_res: 50, wood: 0, range: 0, speed: 16.100000381469727, stone: 0, defen: 15, health: 6, iron: 0, march: 0, time: 33, level: 0, food: 155, heal_time: 60, power: 1.899999976158142, load: 7, attack: 20, move: 10 }),
  "107103": Object.freeze({ upkeep: 0.8333333134651184, heal_res: 50, wood: 20, range: 40, speed: 14.949999809265137, stone: 0, defen: 17, health: 7, iron: 2, march: 0, time: 44, level: 0, food: 175, heal_time: 50, power: 2.5, load: 7, attack: 32, move: 10 }),
  "107104": Object.freeze({ upkeep: 1.0416666269302368, heal_res: 50, wood: 27, range: 40, speed: 14.949999809265137, stone: 0, defen: 22, health: 9, iron: 5, march: 0, time: 58, level: 0, food: 228, heal_time: 40, power: 3.200000047683716, load: 8, attack: 41, move: 10 }),
  "107105": Object.freeze({ upkeep: 1.25, heal_res: 50, wood: 0, range: 0, speed: 16.100000381469727, stone: 0, defen: 32, health: 11, iron: 15, march: 0, time: 75, level: 0, food: 271, heal_time: 32, power: 4, load: 8, attack: 44, move: 10 }),
  "107106": Object.freeze({ upkeep: 1.4583333730697632, heal_res: 50, wood: 56, range: 40, speed: 14.949999809265137, stone: 3, defen: 34, health: 13, iron: 9, march: 0, time: 95, level: 0, food: 269, heal_time: 26, power: 4.900000095367432, load: 9, attack: 63, move: 10 }),
  "107107": Object.freeze({ upkeep: 1.6666666269302368, heal_res: 50, wood: 0, range: 0, speed: 16.100000381469727, stone: 5, defen: 47, health: 15, iron: 27, march: 0, time: 118, level: 0, food: 253, heal_time: 22, power: 5.900000095367432, load: 9, attack: 64, move: 10 }),
  "107108": Object.freeze({ upkeep: 1.875, heal_res: 50, wood: 104, range: 40, speed: 14.949999809265137, stone: 8, defen: 49, health: 18, iron: 15, march: 0, time: 144, level: 0, food: 276, heal_time: 19, power: 7, load: 10, attack: 91, move: 10 }),
  "107109": Object.freeze({ upkeep: 2.0833332538604736, heal_res: 50, wood: 0, range: 0, speed: 16.100000381469727, arm_type: 1, stone: 11, defen: 65, health: 21, iron: 52, march: 0, time: 173, level: 0, food: 189, heal_time: 17, power: 8.199999809265137, load: 10, attack: 90, move: 10 }),
  "107200": Object.freeze({ upkeep: 0.2083333283662796, heal_res: 50, wood: 0, range: 50, speed: 8, stone: 0, defen: 6, health: 3, iron: 0, march: 0, time: 20, level: 0, food: 57, heal_time: 50, power: 1, load: 8, attack: 8, move: 10 }),
  "107201": Object.freeze({ upkeep: 0.4166666567325592, heal_res: 50, wood: 10, range: 50, speed: 8, stone: 0, defen: 8, health: 3, iron: 0, march: 0, time: 25, level: 0, food: 90, heal_time: 70, power: 1.399999976158142, load: 8, attack: 11, move: 10 }),
  "107202": Object.freeze({ upkeep: 0.625, heal_res: 50, wood: 14, range: 80, speed: 8, stone: 0, defen: 13, health: 4, iron: 0, march: 0, time: 33, level: 0, food: 130, heal_time: 60, power: 1.899999976158142, load: 8, attack: 26, move: 10 }),
  "107203": Object.freeze({ upkeep: 0.8333333134651184, heal_res: 50, wood: 20, range: 80, speed: 8, stone: 0, defen: 17, health: 5, iron: 2, march: 0, time: 44, level: 0, food: 185, heal_time: 50, power: 2.5, load: 8, attack: 35, move: 10 }),
  "107204": Object.freeze({ upkeep: 1.0416666269302368, heal_res: 50, wood: 27, range: 50, speed: 8, stone: 0, defen: 19, health: 6, iron: 3, march: 0, time: 58, level: 0, food: 241, heal_time: 40, power: 3.200000047683716, load: 10, attack: 25, move: 10 }),
  "107205": Object.freeze({ upkeep: 1.25, heal_res: 50, wood: 35, range: 50, speed: 8, stone: 0, defen: 24, health: 8, iron: 4, march: 0, time: 75, level: 0, food: 296, heal_time: 32, power: 4, load: 10, attack: 32, move: 10 }),
  "107206": Object.freeze({ upkeep: 1.4583333730697632, heal_res: 50, wood: 46, range: 80, speed: 8, stone: 5, defen: 34, health: 10, iron: 5, march: 0, time: 95, level: 0, food: 254, heal_time: 26, power: 4.900000095367432, load: 10, attack: 68, move: 10 }),
  "107207": Object.freeze({ upkeep: 1.6666666269302368, heal_res: 50, wood: 53, range: 50, speed: 8, stone: 9, defen: 35, health: 11, iron: 7, march: 0, time: 118, level: 0, food: 217, heal_time: 22, power: 5.900000095367432, load: 11, attack: 47, move: 10 }),
  "107208": Object.freeze({ upkeep: 1.875, heal_res: 50, wood: 68, range: 80, speed: 8, stone: 15, defen: 49, health: 13, iron: 10, march: 0, time: 144, level: 0, food: 181, heal_time: 19, power: 7, load: 11, attack: 98, move: 10 }),
  "107209": Object.freeze({ upkeep: 2.0833332538604736, heal_res: 50, wood: 77, range: 50, speed: 8, arm_type: 1, stone: 19, defen: 49, health: 15, iron: 13, march: 0, time: 173, level: 0, food: 155, heal_time: 17, power: 8.199999809265137, load: 12, attack: 65, move: 10 }),
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
