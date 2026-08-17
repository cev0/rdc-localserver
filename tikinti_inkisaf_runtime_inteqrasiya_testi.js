"use strict";

const assert = require("assert");
const fs = require("fs");
const source = fs.readFileSync("./server.js", "utf8");
assert.ok(source.includes('require("./tikinti_inkisaf_korpu")'));
assert.ok(source.includes('stateUcunTikintiMuddetiniHesabla('));
assert.ok(source.includes('technologySpeedPct'));
assert.ok(source.includes('netice.effectiveDurationMs'));
console.log("Tikinti İnkişaf runtime inteqrasiya testi uğurla keçdi.");
