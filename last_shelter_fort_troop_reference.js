"use strict";

/*
 * Verified Last Shelter v1.250.102 fort troop rows from the real init payload.
 * The mutable player-owned "free" quantity is deliberately excluded.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_FORT_TROOPS = deepFreeze([
  {
    "level": 1,
    "attack": 11,
    "iron": 0,
    "wood": 243,
    "id": "107920",
    "time": 40,
    "power": 1,
    "defen": 0,
    "food": 0,
    "stone": 0
  },
  {
    "level": 1,
    "attack": 21,
    "iron": 0,
    "wood": 860,
    "id": "107931",
    "time": 66,
    "power": 1.899999976158142,
    "defen": 0,
    "food": 0,
    "stone": 0
  },
  {
    "level": 1,
    "attack": 11,
    "iron": 0,
    "wood": 340,
    "id": "107930",
    "time": 40,
    "power": 1,
    "defen": 0,
    "food": 0,
    "stone": 0
  },
  {
    "level": 1,
    "attack": 35,
    "iron": 81,
    "wood": 0,
    "id": "107902",
    "time": 116,
    "power": 3.200000047683716,
    "defen": 0,
    "food": 470,
    "stone": 0
  },
  {
    "level": 1,
    "attack": 54,
    "iron": 80,
    "wood": 294,
    "id": "107913",
    "time": 190,
    "power": 4.900000095367432,
    "defen": 0,
    "food": 295,
    "stone": 11
  },
  {
    "level": 1,
    "attack": 77,
    "iron": 90,
    "wood": 434,
    "id": "107924",
    "time": 288,
    "power": 7,
    "defen": 0,
    "food": 0,
    "stone": 30
  },
  {
    "level": 1,
    "attack": 21,
    "iron": 0,
    "wood": 0,
    "id": "107901",
    "time": 66,
    "power": 1.899999976158142,
    "defen": 0,
    "food": 589,
    "stone": 0
  },
  {
    "level": 1,
    "attack": 35,
    "iron": 64,
    "wood": 297,
    "id": "107912",
    "time": 116,
    "power": 3.200000047683716,
    "defen": 0,
    "food": 286,
    "stone": 0
  },
  {
    "level": 1,
    "attack": 54,
    "iron": 75,
    "wood": 320,
    "id": "107923",
    "time": 190,
    "power": 4.900000095367432,
    "defen": 0,
    "food": 0,
    "stone": 23
  },
  {
    "level": 1,
    "attack": 77,
    "iron": 110,
    "wood": 434,
    "id": "107934",
    "time": 288,
    "power": 7,
    "defen": 0,
    "food": 900,
    "stone": 42
  },
  {
    "level": 1,
    "attack": 11,
    "iron": 0,
    "wood": 0,
    "id": "107900",
    "time": 40,
    "power": 1,
    "defen": 0,
    "food": 251,
    "stone": 0
  },
  {
    "level": 1,
    "attack": 21,
    "iron": 0,
    "wood": 290,
    "id": "107911",
    "time": 66,
    "power": 1.899999976158142,
    "defen": 0,
    "food": 286,
    "stone": 0
  },
  {
    "level": 1,
    "attack": 35,
    "iron": 62,
    "wood": 590,
    "id": "107922",
    "time": 116,
    "power": 3.200000047683716,
    "defen": 0,
    "food": 0,
    "stone": 0
  },
  {
    "level": 1,
    "attack": 54,
    "iron": 75,
    "wood": 320,
    "id": "107933",
    "time": 190,
    "power": 4.900000095367432,
    "defen": 0,
    "food": 600,
    "stone": 23
  },
  {
    "level": 1,
    "attack": 11,
    "iron": 0,
    "wood": 118,
    "id": "107910",
    "time": 40,
    "power": 1,
    "defen": 0,
    "food": 125,
    "stone": 0
  },
  {
    "level": 1,
    "attack": 21,
    "iron": 0,
    "wood": 596,
    "id": "107921",
    "time": 66,
    "power": 1.899999976158142,
    "defen": 0,
    "food": 0,
    "stone": 0
  },
  {
    "level": 1,
    "attack": 35,
    "iron": 62,
    "wood": 590,
    "id": "107932",
    "time": 116,
    "power": 3.200000047683716,
    "defen": 0,
    "food": 300,
    "stone": 0
  },
  {
    "level": 1,
    "attack": 77,
    "iron": 120,
    "wood": 0,
    "id": "107904",
    "time": 288,
    "power": 7,
    "defen": 0,
    "food": 440,
    "stone": 21
  },
  {
    "level": 1,
    "attack": 54,
    "iron": 102,
    "wood": 0,
    "id": "107903",
    "time": 190,
    "power": 4.900000095367432,
    "defen": 0,
    "food": 329,
    "stone": 17
  },
  {
    "level": 1,
    "attack": 77,
    "iron": 105,
    "wood": 342,
    "id": "107914",
    "time": 288,
    "power": 7,
    "defen": 0,
    "food": 331,
    "stone": 15
  }
]);

function fortTroopAl(id) {
  const key = id == null ? "" : String(id).trim();
  const found = LAST_SHELTER_FORT_TROOPS.find(x => String(x.id) === key);
  return found ? { ...found } : null;
}

function fortTroopRuntimeProjectionAl(id) {
  const raw = fortTroopAl(id);
  if (!raw) return null;

  return {
    troopId: String(raw.id),
    level: Number(raw.level) || 0,
    attack: Number(raw.attack) || 0,
    defense: Number(raw.defen) || 0,
    trainingTimeSeconds: Number(raw.time) || 0,
    power: Number(raw.power) || 0,
    cost: {
      food: Number(raw.food) || 0,
      wood: Number(raw.wood) || 0,
      stone: Number(raw.stone) || 0,
      iron: Number(raw.iron) || 0
    }
  };
}


function fortRuntimeDefaultHazirla() {
  const owned = {};
  for (const row of LAST_SHELTER_FORT_TROOPS) {
    owned[String(row.id)] =
      String(row.id) === "107900"
        ? 1
        : 0;
  }
  return { owned };
}

function fortRuntimeTeminEt(state) {
  if (!state || typeof state !== "object") return null;

  if (
    !state.lastShelterFortRuntime ||
    typeof state.lastShelterFortRuntime !== "object" ||
    Array.isArray(state.lastShelterFortRuntime)
  ) {
    state.lastShelterFortRuntime =
      fortRuntimeDefaultHazirla();
  }

  const runtime = state.lastShelterFortRuntime;
  if (
    !runtime.owned ||
    typeof runtime.owned !== "object" ||
    Array.isArray(runtime.owned)
  ) {
    runtime.owned = fortRuntimeDefaultHazirla().owned;
  }

  for (const row of LAST_SHELTER_FORT_TROOPS) {
    const id = String(row.id);
    const n = Number(runtime.owned[id]);
    runtime.owned[id] =
      Number.isFinite(n)
        ? Math.max(0, Math.trunc(n))
        : 0;
  }

  return runtime;
}

function fortInitProjectionHazirla(state) {
  const runtime = fortRuntimeTeminEt(state);
  if (!runtime) return [];

  return LAST_SHELTER_FORT_TROOPS.map(row => ({
    ...row,
    free:
      Math.max(
        0,
        Math.trunc(
          Number(runtime.owned[String(row.id)]) || 0
        )
      )
  }));
}

module.exports = {
  LAST_SHELTER_FORT_TROOPS,
  fortTroopAl,
  fortTroopRuntimeProjectionAl,
  fortRuntimeDefaultHazirla,
  fortRuntimeTeminEt,
  fortInitProjectionHazirla
};
