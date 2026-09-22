"use strict";

/*
 * Verified Last Shelter v1.250.102 user-resource envelope.
 *
 * The reference server emits these fields alongside ordinary command
 * responses. regTime is persistent account registration time (milliseconds);
 * db_timezone_offset is refreshed to current epoch seconds. Population fields
 * are kept independent from RDC resource balances because their growth/cap
 * formula is not inferred here.
 */

const LAST_SHELTER_RESOURCE_PAYLOAD_FIELDS = Object.freeze([
  "chip",
  "electricity",
  "water",
  "people",
  "food",
  "stone",
  "diamond",
  "regTime",
  "changePeople",
  "money",
  "iron",
  "silver",
  "wood",
  "maxPeople",
  "db_timezone_offset"
]);

function tamEded(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n)
    ? Math.max(0, Math.trunc(n))
    : fallback;
}

function lastShelterResourceRuntimeDefaultHazirla(nowMs = Date.now()) {
  return {
    regTime: tamEded(nowMs, Date.now()),
    people: 0,
    changePeople: 0,
    maxPeople: 0
  };
}

function lastShelterResourceRuntimeTeminEt(state, nowMs = Date.now()) {
  if (!state || typeof state !== "object") {
    return null;
  }

  if (
    !state.lastShelterResourceRuntime ||
    typeof state.lastShelterResourceRuntime !== "object" ||
    Array.isArray(state.lastShelterResourceRuntime)
  ) {
    state.lastShelterResourceRuntime =
      lastShelterResourceRuntimeDefaultHazirla(nowMs);
  }

  const runtime = state.lastShelterResourceRuntime;

  runtime.regTime = tamEded(runtime.regTime, tamEded(nowMs, Date.now()));
  runtime.people = tamEded(runtime.people, 0);
  runtime.changePeople = tamEded(runtime.changePeople, 0);
  runtime.maxPeople = tamEded(runtime.maxPeople, 0);

  return runtime;
}

function resursDeyeriAl(resources, canonical, legacyAlias) {
  if (!resources || typeof resources !== "object") {
    return 0;
  }

  if (resources[canonical] != null) {
    return tamEded(resources[canonical], 0);
  }

  if (legacyAlias && resources[legacyAlias] != null) {
    return tamEded(resources[legacyAlias], 0);
  }

  return 0;
}

function lastShelterResourcePayloadHazirla(state, nowMs = Date.now()) {
  const runtime =
    lastShelterResourceRuntimeTeminEt(state, nowMs);

  if (!runtime) {
    return null;
  }

  const resources =
    state.resources &&
    typeof state.resources === "object"
      ? state.resources
      : {};

  return {
    chip: resursDeyeriAl(resources, "chip", "chips"),
    electricity: resursDeyeriAl(resources, "electricity"),
    water: resursDeyeriAl(resources, "water"),
    people: runtime.people,
    food: resursDeyeriAl(resources, "food"),
    stone: resursDeyeriAl(resources, "stone"),
    diamond: resursDeyeriAl(resources, "diamond"),
    regTime: runtime.regTime,
    changePeople: runtime.changePeople,
    money: resursDeyeriAl(resources, "money"),
    iron: resursDeyeriAl(resources, "iron"),
    silver: resursDeyeriAl(resources, "silver"),
    wood: resursDeyeriAl(resources, "wood"),
    maxPeople: runtime.maxPeople,
    db_timezone_offset:
      Math.max(0, Math.trunc(tamEded(nowMs, 0) / 1000))
  };
}

module.exports = {
  LAST_SHELTER_RESOURCE_PAYLOAD_FIELDS,
  lastShelterResourceRuntimeDefaultHazirla,
  lastShelterResourceRuntimeTeminEt,
  lastShelterResourcePayloadHazirla
};
