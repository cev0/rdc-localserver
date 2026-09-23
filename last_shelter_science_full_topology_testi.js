"use strict";

const assert = require("assert");
const commandCatalog = require("./data/last_shelter/commands.json");

const {
  SOURCE,
  ROWS,
  GROUP_ROWS,
  SCIENCE,
  SCIENCE_GROUPS,
  scienceTopologyMelumatiniAl,
  scienceTopologyIdleriniAl,
  scienceGroupMelumatiniAl
} = require("./last_shelter_science_full_topology");

function fnv64(text) {
  let h =
    14695981039346656037n;

  for (
    let i = 0;
    i < text.length;
    i += 1
  ) {
    h =
      BigInt.asUintN(
        64,
        (
          h ^
          BigInt(
            text.charCodeAt(i)
          )
        ) *
        1099511628211n
      );
  }

  return (
    "0x" +
    h
      .toString(16)
      .padStart(16, "0")
  );
}

assert.strictEqual(
  SOURCE.version,
  "1.250.102"
);
assert.strictEqual(
  SOURCE.endpoint,
  "GetScienceInfo"
);
assert.strictEqual(
  SOURCE.command,
  "science.data.init"
);
assert.strictEqual(
  SOURCE.handlerClass,
  "com.elex.cok.handlers.requesthandlers.science.GetScienceInfo"
);
assert(
  (commandCatalog.commands[SOURCE.command] || []).some(row =>
    row.class === SOURCE.handlerClass &&
    row.classSha256 === SOURCE.handlerClassSha256
  )
);
assert.deepStrictEqual(
  SOURCE.responseFields,
  ["hasKingdomAct", "scienceGroup", "science", "scienceRecord"]
);
assert.strictEqual(SOURCE.observedHasKingdomAct, 0);
assert.strictEqual(SOURCE.observedScienceRecordCount, 0);
assert.deepStrictEqual(SOURCE.dynamicFieldsUnmapped, ["valid", "cd"]);
assert.strictEqual(
  SOURCE.verifiedCaptureCount,
  2
);

assert.strictEqual(
  ROWS.length,
  441
);
assert.strictEqual(
  scienceTopologyIdleriniAl().length,
  441
);
assert.strictEqual(
  Object.keys(SCIENCE).length,
  441
);

assert.strictEqual(
  fnv64(
    JSON.stringify(ROWS)
  ),
  SOURCE.compactRowsFNV64
);

assert.strictEqual(
  GROUP_ROWS.length,
  52
);
assert.strictEqual(
  Object.keys(SCIENCE_GROUPS).length,
  52
);

const uniqueIds =
  new Set(
    ROWS.map(r => r[0])
  );

assert.strictEqual(
  uniqueIds.size,
  441
);

const early =
  scienceTopologyMelumatiniAl(
    "901600"
  );

assert.deepStrictEqual(
  early.scienceConditions,
  [
    "901401",
    "901501"
  ]
);
assert.strictEqual(
  early.buildingCondition,
  "403001"
);

const goods =
  scienceTopologyMelumatiniAl(
    "971400"
  );

assert.deepStrictEqual(
  goods.goodsNeed,
  {
    itemId: "210163",
    amount: 17500
  }
);
assert.deepStrictEqual(
  goods.buildingConditions,
  [
    "403024",
    "424025"
  ]
);
assert.deepStrictEqual(
  goods.scienceTypeConditions,
  [
    "20004035",
    "20004036"
  ]
);

const alternateGoods =
  scienceTopologyMelumatiniAl(
    "985500"
  );

assert.deepStrictEqual(
  alternateGoods.goodsNeed,
  {
    itemId: "212008",
    amount: 110
  }
);

const late =
  scienceTopologyMelumatiniAl(
    "1202100"
  );

assert.strictEqual(
  late.maxLevel,
  20
);
assert.deepStrictEqual(
  late.scienceConditions,
  [
    "1201905",
    "1202005"
  ]
);
assert.strictEqual(
  late.nextPara2,
  "200"
);

assert.strictEqual(
  scienceTopologyMelumatiniAl(
    "not-a-science-id"
  ),
  null
);

const group =
  scienceGroupMelumatiniAl(
    249906
  );

assert.deepStrictEqual(
  group.effects,
  {
    "1211": 12,
    "1212": 12,
    "1213": 12,
    "1214": 12,
    "1215": 12,
    "1216": 12
  }
);
assert.strictEqual(
  group.isActive,
  0
);

const emptyGroup =
  scienceGroupMelumatiniAl(
    20004040
  );

assert.deepStrictEqual(
  emptyGroup.effects,
  {}
);

for (const node of Object.values(SCIENCE)) {
  assert.ok(
    /^\d+$/.test(node.itemId)
  );
  assert.ok(
    Number.isInteger(node.maxLevel)
  );
  assert.ok(
    node.maxLevel > 0
  );

  // Runtime-modified response costs/timers must never silently replace
  // raw science.xml balance values.
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(
      node,
      "researchNeedRaw"
    ),
    false
  );
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(
      node,
      "researchTimeSeconds"
    ),
    false
  );
}

console.log(
  "PASS: all 441 verified Last Shelter science topology nodes and 52 groups are preserved."
);
