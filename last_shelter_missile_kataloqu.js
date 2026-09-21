"use strict";

/*
 * Verified Last Shelter v1.250.102 missile configuration recovered from the
 * reference init payloads. Only static fields observed in the source payloads
 * are preserved. Runtime/player fields such as producing, totalNum and
 * finishTime are deliberately excluded from this configuration catalog.
 */

const MISSILE = Object.freeze({
  "53301": Object.freeze({ wood: 200000, iron: 20000, def_value: 1000, speed: 1, item_need: "200047;15", unlock_level: 1, atk_value: 0, time: 10800, capacity: 1, status: 500901 }),
  "53302": Object.freeze({ wood: 1500000, def_value: 2000, speed: 2, item_need: "200047;200", unlock_level: 2, atk_value: 3, time: 28800, capacity: 1, missile_effect: 53500 }),
  "53303": Object.freeze({ wood: 500000, iron: 500000, def_value: 4500, speed: 5, item_need: "200047;500", unlock_level: 4, atk_value: 5, time: 54000, capacity: 2 }),
  "53304": Object.freeze({ iron: 50000, def_value: 4500, speed: 4, item_need: "200047;1000", unlock_level: 5, atk_value: 4, time: 86400, capacity: 2, missile_effect: 53501 }),
  "53305": Object.freeze({ wood: 500000, iron: 100000, def_value: 2000, speed: 2, item_need: "200047;525", unlock_level: 3, atk_value: 10, time: 28800, capacity: 1 }),
  "53306": Object.freeze({ iron: 200000, def_value: 6000, speed: 4.5, item_need: "200047;1200", unlock_level: 6, atk_value: 5, time: 86400, capacity: 2, missile_effect: 53502 }),
  "53307": Object.freeze({ wood: 1500000, iron: 500000, status: 500905, def_value: 5000, speed: 1.5, item_need: "200047;1500", unlock_level: 7, atk_value: 10, time: 144000, capacity: 2, missile_effect: 53503 }),
  "53308": Object.freeze({ wood: 500000, def_value: 5000, speed: 1.5, item_need: "200047;200", unlock_level: 8, atk_value: 1, time: 86400, capacity: 1 })
});

function missileAl(id) {
  const key = String(id == null ? "" : id).trim();
  return MISSILE[key] || null;
}

function missileIds() {
  return Object.keys(MISSILE);
}

module.exports = { MISSILE, missileAl, missileIds };
