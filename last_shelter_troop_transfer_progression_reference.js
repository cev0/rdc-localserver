"use strict";

/*
 * Verified Last Shelter v1.250.102 troop-transfer progression observation.
 *
 * Multiple developed-account init snapshots expose the same level-6 topology:
 * total=50, level=6, power=244, singleCostAmount=10, and points 5..10
 * activated at level 1 with the effect/skill maps below.
 *
 * Account-variable fields such as exp/todayTranTimes are deliberately not
 * promoted to static rules. Numeric effect ids remain raw until their gameplay
 * semantics are independently verified.
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

const LAST_SHELTER_TROOP_TRANSFER_LEVEL6 = deepFreeze({
  total: 50,
  level: 6,
  power: 244,
  singleCostAmount: 10,
  trees: {
    "1": {
      "109034": { level:1, pointType:"5", skills:{}, effects:{"1561":-5,"1531":-5,"1541":-5,"1551":-5} },
      "109036": { level:1, pointType:"6", skills:{}, effects:{"1331":3} },
      "109038": { level:1, pointType:"7", skills:{}, effects:{"1041":2} },
      "109040": { level:1, pointType:"8", skills:{}, effects:{"1514":30,"1513":20} },
      "109042": { level:1, pointType:"9", skills:{}, effects:{"1322":3} },
      "109044": { level:1, pointType:"10", skills:{}, effects:{"1122":100} }
    },
    "2": {
      "109084": { level:1, pointType:"5", skills:{"101004":1,"101024":1}, effects:{} },
      "109086": { level:1, pointType:"6", skills:{}, effects:{"1548":5,"1543":10,"1544":10,"1545":5,"1546":5,"1547":5} },
      "109088": { level:1, pointType:"7", skills:{"101021":1}, effects:{} },
      "109090": { level:1, pointType:"8", skills:{}, effects:{"1326":3,"1553":5,"1554":5} },
      "109092": { level:1, pointType:"9", skills:{"101005":1,"101025":1}, effects:{} },
      "109094": { level:1, pointType:"10", skills:{}, effects:{"42":10} }
    },
    "3": {
      "109134": { level:1, pointType:"5", skills:{"101008":1}, effects:{} },
      "109136": { level:1, pointType:"6", skills:{}, effects:{"1313":15,"1527":5,"1528":5} },
      "109138": { level:1, pointType:"7", skills:{}, effects:{"1113":100} },
      "109140": { level:1, pointType:"8", skills:{"101009":1}, effects:{} },
      "109142": { level:1, pointType:"9", skills:{}, effects:{"1537":5,"1538":5,"1314":15} },
      "109144": { level:1, pointType:"10", skills:{}, effects:{"40":10} }
    },
    "4": {
      "109184": { level:1, pointType:"5", skills:{"101013":1}, effects:{} },
      "109186": { level:1, pointType:"6", skills:{"101018":1}, effects:{"1566":5,"1565":5} },
      "109188": { level:1, pointType:"7", skills:{"101014":1}, effects:{} },
      "109190": { level:1, pointType:"8", skills:{}, effects:{"1218":20} },
      "109192": { level:1, pointType:"9", skills:{"101012":1}, effects:{"1576":5,"1575":5} },
      "109194": { level:1, pointType:"10", skills:{"101015":1,"101019":1}, effects:{} }
    }
  }
});

function clone(value) {
  return value == null
    ? value
    : JSON.parse(JSON.stringify(value));
}

function level6PointAl(type, pointId) {
  const tree =
    LAST_SHELTER_TROOP_TRANSFER_LEVEL6
      .trees[String(type)];

  if (!tree) {
    return null;
  }

  const point =
    tree[String(pointId)];

  return point
    ? {
        id: String(pointId),
        ...clone(point)
      }
    : null;
}

function level6AktivPointleriAl(type) {
  const tree =
    LAST_SHELTER_TROOP_TRANSFER_LEVEL6
      .trees[String(type)];

  if (!tree) {
    return [];
  }

  return Object.entries(tree)
    .map(([id, point]) => ({
      id,
      ...clone(point)
    }))
    .sort(
      (a, b) =>
        Number(a.pointType) -
        Number(b.pointType)
    );
}

function level6RawEffectleriTopla(type) {
  const result = {};

  for (
    const point of
    level6AktivPointleriAl(type)
  ) {
    for (
      const [effectId, value] of
      Object.entries(point.effects || {})
    ) {
      result[effectId] =
        (result[effectId] || 0) +
        Number(value || 0);
    }
  }

  return result;
}

function level6RawSkillleriTopla(type) {
  const result = {};

  for (
    const point of
    level6AktivPointleriAl(type)
  ) {
    for (
      const [skillId, level] of
      Object.entries(point.skills || {})
    ) {
      result[skillId] =
        Math.max(
          result[skillId] || 0,
          Number(level || 0)
        );
    }
  }

  return result;
}


function level6RuntimeTreeProjectionHazirla(runtimeTree) {
  if (
    !runtimeTree ||
    typeof runtimeTree !== "object" ||
    Array.isArray(runtimeTree)
  ) {
    return null;
  }

  const result = clone(runtimeTree);
  const type = String(
    result.type == null ? "" : result.type
  ).trim();

  if (
    Number(result.level) !==
      LAST_SHELTER_TROOP_TRANSFER_LEVEL6.level ||
    !LAST_SHELTER_TROOP_TRANSFER_LEVEL6.trees[type]
  ) {
    return result;
  }

  result.total =
    LAST_SHELTER_TROOP_TRANSFER_LEVEL6.total;
  result.power =
    LAST_SHELTER_TROOP_TRANSFER_LEVEL6.power;
  result.singleCostAmount =
    LAST_SHELTER_TROOP_TRANSFER_LEVEL6.singleCostAmount;

  if (Array.isArray(result.details)) {
    result.details = result.details.map(detail => {
      const verified =
        detail &&
        LAST_SHELTER_TROOP_TRANSFER_LEVEL6
          .trees[type][String(detail.id)];

      if (!verified) {
        return clone(detail);
      }

      return {
        ...clone(detail),
        level: verified.level,
        pointType: verified.pointType,
        skills: clone(verified.skills),
        effects: clone(verified.effects)
      };
    });
  }

  return result;
}

function runtimeTreesProjectionHazirla(runtimeTrees) {
  if (!Array.isArray(runtimeTrees)) {
    return [];
  }

  return runtimeTrees
    .map(level6RuntimeTreeProjectionHazirla)
    .filter(Boolean);
}

module.exports = {
  LAST_SHELTER_TROOP_TRANSFER_LEVEL6,
  level6PointAl,
  level6AktivPointleriAl,
  level6RawEffectleriTopla,
  level6RawSkillleriTopla,
  level6RuntimeTreeProjectionHazirla,
  runtimeTreesProjectionHazirla
};
