"use strict";

const assert = require("assert");
const {
  KONVOY_TEXNOLOGIYA_ACARLARI
} = require("./konvoy_qaydalari");
const {
  legacyTechnologyLevelAl,
  legacyTexnologiyaMelumatiniHazirla
} = require("./konvoy_texnologiya_handler");

const state = {
  technology: {
    levels: {
      [KONVOY_TEXNOLOGIYA_ACARLARI.IKINCI_QEHRAMAN_YERI]: 1,
      [KONVOY_TEXNOLOGIYA_ACARLARI.UCUNCU_QEHRAMAN_YERI]: 0
    }
  }
};

assert.strictEqual(
  legacyTechnologyLevelAl(
    state,
    KONVOY_TEXNOLOGIYA_ACARLARI.IKINCI_QEHRAMAN_YERI
  ),
  1
);

assert.strictEqual(
  legacyTechnologyLevelAl(
    {},
    KONVOY_TEXNOLOGIYA_ACARLARI.IKINCI_QEHRAMAN_YERI
  ),
  0
);

const before =
  JSON.stringify(state);

const info =
  legacyTexnologiyaMelumatiniHazirla(
    state
  );

assert.strictEqual(
  info.length,
  3
);
assert.ok(
  info.every(
    row =>
      row.legacyReadOnly === true &&
      row.canResearch === false
  )
);
assert.strictEqual(
  info.find(
    row =>
      row.techId ===
      KONVOY_TEXNOLOGIYA_ACARLARI.IKINCI_QEHRAMAN_YERI
  ).completed,
  true
);
assert.strictEqual(
  JSON.stringify(state),
  before,
  "Read-only convoy compatibility projection state-i dəyişməməlidir."
);
assert.strictEqual(
  Object.prototype.hasOwnProperty.call(
    {},
    "technology"
  ),
  false
);

console.log(
  "PASS: synthetic convoy research is read-only compatibility only."
);
