"use strict";

/*
 * Verified Last Shelter v1.250.102 source rows used by science runtime.
 * These fields were recovered from new_hero_skills. Keep raw semantics here;
 * runtime code must not infer lifecycle behavior from fields that have not
 * been independently mapped.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_SCIENCE_HERO_SKILLS = deepFreeze({
  ENERGY_SKILL: {
    id: "50046",
    hero_skill: "50046",
    type: "2",
    state: "2",
    station_buildings: "403000;0",
    active_skill: "1",
    cd_time: "10",
    max_level: "10",
    time_lv: "1",
    para: "20;10",
    para_add: "5;5",
    para_lv: "0;0",
    cost: "210164;20|210164;30|210164;45|210164;60|210164;90|210164;130|210164;190|210164;270|210164;400"
  },
  SECOND_RESEARCH_QUEUE: {
    id: "61012",
    type: "2",
    state: "1",
    station_buildings: "403000;0",
    max_level: "10",
    para: "1",
    effect: "232;5",
    effect_add: "232;5",
    cost: "210164;20|210164;30|210164;45|210164;60|210164;90|210164;130|210164;200|210164;270|210164;400"
  }
});

function stationBuildingTypeAl(row) {
  const token = String(row?.station_buildings || "").split(";")[0];
  return /^\d+$/.test(token) ? token : "";
}

function skillIdAl(row) {
  const id = String(row?.hero_skill ?? row?.id ?? "");
  return /^\d+$/.test(id) ? id : "";
}

function skillLevelCostlariAl(row) {
  const raw = String(row?.cost || "");
  if (!raw) return [];
  return raw.split("|").map((token, index) => {
    const fields = token.split(";");
    if (fields.length !== 2 || !fields.every(value => /^\d+$/.test(value))) {
      throw new Error(`Invalid verified hero skill cost at level ${index + 1}`);
    }
    return {
      level: index + 1,
      itemId: fields[0],
      amount: Number(fields[1])
    };
  });
}

module.exports = {
  LAST_SHELTER_SCIENCE_HERO_SKILLS,
  stationBuildingTypeAl,
  skillIdAl,
  skillLevelCostlariAl
};
