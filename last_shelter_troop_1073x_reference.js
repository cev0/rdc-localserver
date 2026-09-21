"use strict";

/*
 * Last Shelter 1073xx fourth troop-family reference.
 *
 * Multiple server init snapshots agree on the fields below for 107300-107309.
 * The speed value changes across snapshots, therefore speed is deliberately
 * excluded from the static projection until the responsible effect pipeline
 * is source-verified. Mutable free quantities are also excluded.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return value;
}

const TROOP_1073X_STABLE = deepFreeze({
  "107300": { upkeep:0.0416666679084301, heal_res:50, wood:29, range:110, stone:0, defen:5, health:5, iron:5, march:0, time:20, level:0, food:0, heal_time:50, power:1, load:2, attack:17, move:10 },
  "107301": { upkeep:0.0416666679084301, heal_res:50, wood:43, range:110, stone:0, defen:7, health:6, iron:10, march:0, time:25, level:0, food:0, heal_time:70, power:1.399999976158142, load:2, attack:23, move:10 },
  "107302": { upkeep:0.0833333358168602, heal_res:50, wood:64, range:0, stone:0, defen:19, health:15, iron:14, march:0, time:33, level:0, food:0, heal_time:60, power:1.899999976158142, load:3, attack:22, move:10 },
  "107303": { upkeep:0.0833333358168602, heal_res:50, wood:88, range:110, stone:0, defen:12, health:9, iron:20, march:0, time:44, level:0, food:0, heal_time:50, power:2.5, load:3, attack:42, move:10 },
  "107304": { upkeep:0.125, heal_res:50, wood:116, range:0, stone:0, defen:32, health:23, iron:27, march:0, time:58, level:0, food:0, heal_time:40, power:3.200000047683716, load:4, attack:38, move:10 },
  "107305": { upkeep:0.125, heal_res:50, wood:151, range:110, stone:0, defen:20, health:14, iron:34, march:0, time:75, level:0, food:0, heal_time:32, power:4, load:4, attack:68, move:10 },
  "107306": { upkeep:0.1666666716337204, heal_res:50, wood:173, range:110, stone:2, defen:24, health:16, iron:37, march:0, time:95, level:0, food:0, heal_time:26, power:5.5, load:5, attack:83, move:10 },
  "107307": { upkeep:0.1666666716337204, heal_res:50, wood:212, range:0, stone:3, defen:59, health:39, iron:41, march:0, time:118, level:0, food:0, heal_time:22, power:6.699999809265137, load:5, attack:70, move:10 },
  "107308": { upkeep:0.2083333283662796, heal_res:50, wood:255, range:0, stone:4, defen:70, health:46, iron:52, march:0, time:144, level:0, food:0, heal_time:19, power:8, load:6, attack:84, move:10 },
  "107309": { upkeep:0.2083333283662796, heal_res:50, wood:330, range:110, arm_type:1, stone:5, defen:41, health:26, iron:60, march:0, time:173, level:0, food:0, heal_time:17, power:9.399999618530273, load:6, attack:139, move:10 }
});

const OBSERVED_SPEEDS = deepFreeze({
  "107300":[13.130000114440918,13.260000228881836,15.210000038146973],
  "107301":[13,13.260000228881836,15.210000038146973],
  "107302":[5,5.099999904632568,5.849999904632568],
  "107303":[13,13.260000228881836,15.210000038146973],
  "107304":[5.099999904632568,5.849999904632568],
  "107305":[13,13.130000114440918,13.260000228881836,15.210000038146973],
  "107306":[13,13.130000114440918,13.260000228881836,15.210000038146973],
  "107307":[5,5.050000190734863,5.099999904632568,5.849999904632568],
  "107308":[5,5.050000190734863,5.099999904632568,5.849999904632568],
  "107309":[13,13.130000114440918,13.260000228881836,15.210000038146973]
});

function troop1073xStableAl(id) {
  const key =
    id == null
      ? ""
      : String(id).trim();

  const row =
    TROOP_1073X_STABLE[key];

  return row
    ? { ...row }
    : null;
}

function troop1073xObservedSpeedsAl(id) {
  const key =
    id == null
      ? ""
      : String(id).trim();

  const values =
    OBSERVED_SPEEDS[key];

  return values
    ? [...values]
    : [];
}

function troop1073xRuntimeProjectionAl(id) {
  const row =
    troop1073xStableAl(id);

  if (!row) {
    return null;
  }

  return {
    lastShelterArmyId:
      String(id),
    attack:row.attack,
    defense:row.defen,
    hp:row.health,
    battlePower:row.power,
    trainingTimeSeconds:row.time,
    range:row.range,
    loadCapacity:row.load,
    upkeep:row.upkeep,
    cost:{
      food:row.food,
      wood:row.wood,
      stone:row.stone,
      iron:row.iron
    },
    speedVerifiedStatic:false
  };
}

module.exports = {
  TROOP_1073X_STABLE,
  OBSERVED_SPEEDS,
  troop1073xStableAl,
  troop1073xObservedSpeedsAl,
  troop1073xRuntimeProjectionAl
};
