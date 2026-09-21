"use strict";

const {
  SCIENCE,
  scienceTopologyMelumatiniAl
} = require("./last_shelter_science_full_topology");

function metnAl(value, max = 128) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : value == null
      ? ""
      : String(value).trim().slice(0, max);
}

function tamEded(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n)
    ? Math.max(0, Math.trunc(n))
    : fallback;
}

/*
 * science_condition ids encode the runtime science root plus required level:
 *   901401 -> root 901400, level 1
 *   902205 -> root 902200, level 5
 *   997520 -> root 997500, level 20
 *
 * This encoding is verified across all 548 science_condition tokens in the
 * captured 441-node GetScienceInfo topology.
 */
function scienceConditionTokeniniAc(token) {
  const text = metnAl(token, 32);

  if (!/^\d+$/.test(text)) {
    return null;
  }

  const numeric = Number(text);
  if (!Number.isSafeInteger(numeric)) {
    return null;
  }

  const rootNumeric =
    Math.floor(numeric / 100) * 100;
  const requiredLevel =
    numeric - rootNumeric;
  const rootItemId =
    String(rootNumeric);
  const root =
    SCIENCE[rootItemId];

  if (
    !root ||
    requiredLevel <= 0 ||
    requiredLevel > root.maxLevel
  ) {
    return null;
  }

  return {
    token: text,
    itemId: rootItemId,
    requiredLevel
  };
}

/*
 * building_condition ids use the same XML-level encoding with 3 level digits:
 *   403001 -> building type 403000, level 1
 *   423025 -> building type 423000, level 25
 *
 * This parser does not map those XML building types to RDC building ids. That
 * mapping remains server-authoritative and must be sourced from building.xml.
 */
function buildingConditionTokeniniAc(token) {
  const text = metnAl(token, 32);

  if (!/^\d+$/.test(text)) {
    return null;
  }

  const numeric = Number(text);
  if (!Number.isSafeInteger(numeric)) {
    return null;
  }

  const rootNumeric =
    Math.floor(numeric / 1000) * 1000;
  const requiredLevel =
    numeric - rootNumeric;

  if (requiredLevel <= 0) {
    return null;
  }

  return {
    token: text,
    buildingTypeId:
      String(rootNumeric),
    requiredLevel
  };
}

function scienceLevelAl(state, itemId) {
  const id = metnAl(itemId, 32);
  if (!id || !state) return 0;

  const science = state.science;

  if (Array.isArray(science)) {
    const row =
      science.find(
        item =>
          metnAl(
            item &&
            (item.itemId || item.id),
            32
          ) === id
      );

    return tamEded(
      row &&
      (row.level || row.scienceLevel),
      0
    );
  }

  if (
    science &&
    typeof science === "object"
  ) {
    const value = science[id];

    if (typeof value === "number") {
      return tamEded(value, 0);
    }

    if (
      value &&
      typeof value === "object"
    ) {
      return tamEded(
        value.level ||
        value.scienceLevel,
        0
      );
    }
  }

  return 0;
}

function sciencePrerequisiteStatusuAl(
  state,
  itemId
) {
  const topology =
    scienceTopologyMelumatiniAl(
      itemId
    );

  if (!topology) {
    return {
      ok: false,
      code: "SCIENCE_TOPOLOGY_UNVERIFIED",
      missingScience: []
    };
  }

  const requirements = [];
  const malformed = [];

  for (
    const token of
    topology.scienceConditions
  ) {
    const parsed =
      scienceConditionTokeniniAc(
        token
      );

    if (!parsed) {
      malformed.push(token);
      continue;
    }

    requirements.push(parsed);
  }

  if (malformed.length > 0) {
    return {
      ok: false,
      code:
        "SCIENCE_CONDITION_INVALID",
      itemId: topology.itemId,
      malformed,
      missingScience: []
    };
  }

  const missingScience =
    requirements
      .map(req => ({
        ...req,
        currentLevel:
          scienceLevelAl(
            state,
            req.itemId
          )
      }))
      .filter(
        req =>
          req.currentLevel <
          req.requiredLevel
      );

  return {
    ok:
      missingScience.length === 0,
    code:
      missingScience.length === 0
        ? "OK"
        : "SCIENCE_CONDITION_NOT_MET",
    itemId: topology.itemId,
    requirements,
    missingScience,
    buildingConditions:
      topology.buildingConditions
        .map(
          buildingConditionTokeniniAc
        )
        .filter(Boolean),
    scienceTypeConditions:
      [...topology.scienceTypeConditions],
    goodsNeed:
      topology.goodsNeed
        ? { ...topology.goodsNeed }
        : null
  };
}

function topologyButovlukYoxlamasi() {
  const malformedScience = [];
  const malformedBuilding = [];
  let scienceConditionCount = 0;
  let buildingConditionCount = 0;

  for (
    const node of
    Object.values(SCIENCE)
  ) {
    const topology =
      scienceTopologyMelumatiniAl(
        node.itemId
      );

    for (
      const token of
      topology.scienceConditions
    ) {
      scienceConditionCount += 1;

      if (
        !scienceConditionTokeniniAc(
          token
        )
      ) {
        malformedScience.push({
          itemId: node.itemId,
          token
        });
      }
    }

    for (
      const token of
      topology.buildingConditions
    ) {
      buildingConditionCount += 1;

      if (
        !buildingConditionTokeniniAc(
          token
        )
      ) {
        malformedBuilding.push({
          itemId: node.itemId,
          token
        });
      }
    }
  }

  return {
    ok:
      malformedScience.length === 0 &&
      malformedBuilding.length === 0,
    scienceConditionCount,
    buildingConditionCount,
    malformedScience,
    malformedBuilding
  };
}

module.exports = {
  scienceConditionTokeniniAc,
  buildingConditionTokeniniAc,
  scienceLevelAl,
  sciencePrerequisiteStatusuAl,
  topologyButovlukYoxlamasi
};
