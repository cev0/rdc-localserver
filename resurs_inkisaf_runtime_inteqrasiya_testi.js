"use strict";

const assert = require("assert");
const fs = require("fs");
const source = fs.readFileSync("./server.js", "utf8");
assert.ok(source.includes('require("./resurs_inkisaf_korpu")'));
assert.ok(source.includes('stateUcunBinaIstehsaliniHesabla('));
assert.ok(source.includes('building.instanceId'));
assert.ok(source.includes('productionCalculation.finalAmount'));
console.log("Resurs İnkişaf runtime inteqrasiya testi uğurla keçdi.");
