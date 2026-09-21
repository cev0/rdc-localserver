"use strict";

/*
 * Verified Last Shelter v1.250.x item.xml tuning rows.
 *
 * Values are preserved with their original kN keys.  We deliberately avoid
 * assigning gameplay meanings to individual kN slots until the corresponding
 * server code path has also been verified from the reference package.
 */

const ITEM_TUNING = Object.freeze({
  cd_time: Object.freeze({
    k1: 300,
    k2: 900,
    k3: 3600,
    k4: 10800,
    k5: 28800,
    k6: 54000,
    k7: 86400,
    k8: 259200,
    k9: 604800,
    k10: 2592000
  }),
  worldmap_time: Object.freeze({
    k1: 15,
    k2: 60,
    k3: 240,
    k4: 480
  }),
  world_marchtime: Object.freeze({
    k1: 0.82,
    k2: 120,
    k3: 3,
    k4: 20,
    k5: 10,
    k6: 0.2
  }),
  resources_speed: Object.freeze({
    k1: 6,
    k2: 3,
    k3: 4,
    k4: 6,
    k5: 24,
    k6: 0.00083
  }),
  resources_speed2: Object.freeze({
    k1: 18,
    k2: 0.75,
    k3: 3,
    k4: 18,
    k5: 360000000,
    k6: 15000000,
    k7: 60000000,
    k8: 360000000
  }),
  recruit_hero_time: Object.freeze({
    k1: 10
  }),
  new_resources_speed: Object.freeze({
    k1: 2,
    k2: 6,
    k4: 0,
    k5: 25,
    k6: 50
  }),
  resources_output_time: Object.freeze({
    k1: 20,
    k2: 20,
    k3: 20,
    k4: 20,
    k12: 20,
    k13: 20,
    k14: 20
  }),
  trade_stay_time: Object.freeze({
    k1: 1200,
    k2: 6000,
    k3: 1,
    k4: 60,
    k5: "34;45",
    k6: "35;1|35;89",
    k7: "36;1|36;89"
  }),
  speedup_mode: Object.freeze({
    k1: 75,
    k2: 20,
    k3: 3,
    k4: 25,
    k5: 1800,
    k6: 0.05
  }),
  timed_event: Object.freeze({
    k1: 0.01,
    k2: 0.1,
    k3: 0.05,
    k4: 0.18,
    k5: 1
  }),
  scoutmark_time: Object.freeze({
    k1: 10
  }),
  enforce_guide_training_time: Object.freeze({
    k1: 2
  }),
  four_kind_speedup_switch: Object.freeze({
    k1: "0|",
    k2: "1|",
    k3: "2|",
    k4: "3|1-10000"
  }),
  truck_stay_time: Object.freeze({
    k1: 15
  }),
  recourse_refresh_time: Object.freeze({
    k1: 600
  }),
  global_timer: Object.freeze({
    k1: 20
  }),
  wonder_acceleration: Object.freeze({
    k1: 999
  }),
  killerevent_starttime: Object.freeze({
    k1: 2
  }),
  monster_life_time: Object.freeze({
    k1: 7200,
    k2: 21300
  }),
  preliminaries_time: Object.freeze({
    k1: 259200,
    k2: 3600
  })
});

function itemTuningAl(id) {
  const key = typeof id === "string" ? id.trim() : "";
  return ITEM_TUNING[key] || null;
}

module.exports = {
  ITEM_TUNING,
  itemTuningAl
};
