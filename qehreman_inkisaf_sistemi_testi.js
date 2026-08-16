"use strict";

const assert = require("assert");
const {
  INKISAF_SAHESI,
  INKISAF_EFFEKT_NOVU,
  EFFEKT_AZ_ADI,
  inkisafKonfiqurasiyasiniAl,
  binaUcunInkIsafModifikatorlariniHesabla
} = require("./qehreman_inkisaf_sistemi");
const {
  tapshiriqStateTeminEt,
  inkisafQehremaniTeyinEt
} = require("./qehreman_tapshiriq_sistemi");

assert.strictEqual(INKISAF_SAHESI.TEXNOLOGIYA, "texnologiya");
assert.strictEqual(INKISAF_SAHESI.TIKINTI, "tikinti");
assert.strictEqual(INKISAF_SAHESI.RESURS_ISTEHSALI, "resurs_istehsali");
assert.strictEqual(INKISAF_SAHESI.QOSUN_TELIMI, "qosun_telimi");
assert.strictEqual(INKISAF_SAHESI.XESTEXANA, "xestexana");
assert.strictEqual(INKISAF_SAHESI.TICARET, "ticaret");

for (const nov of Object.values(INKISAF_EFFEKT_NOVU)) {
  assert.ok(EFFEKT_AZ_ADI[nov], `Azərbaycan dilində effekt adı çatışmır: ${nov}`);
}

const legacyState = {
  qehremanTapshiriqlari: { version: 1, technology: null, resources: [] }
};
const migrated = tapshiriqStateTeminEt(legacyState);
assert.strictEqual(migrated.version, 2);
assert.ok(Array.isArray(migrated.development));
assert.strictEqual(migrated.development.length, 0);

// Təsdiqlənməmiş/mövcud döyüş qəhrəmanına İnkişaf effekti uydurulmamalıdır.
assert.strictEqual(inkisafKonfiqurasiyasiniAl("feroman"), null);
const state = {
  heroes: [{ heroId: "feroman", level: 50 }],
  buildings: [{ instanceId: "b1", buildingId: "institute", isCompleted: true }],
  qehremanTapshiriqlari: { version: 2, technology: null, resources: [], development: [] }
};
const result = inkisafQehremaniTeyinEt(state, "feroman", "b1");
assert.strictEqual(result.success, false);
assert.match(result.message, /İnkişaf/);

const mods = binaUcunInkIsafModifikatorlariniHesabla(state, "b1");
assert.deepStrictEqual(mods.effects, []);
assert.deepStrictEqual(mods.totals, {});

console.log("Qəhrəman İnkişaf sistemi testləri uğurla keçdi.");
