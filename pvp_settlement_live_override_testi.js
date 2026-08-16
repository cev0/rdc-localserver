"use strict";

const assert = require("assert");
const settlementModulu = require("./pvp_doyus_settlement_sistemi");
const bridge = require("./pvp_doyus_raport_settlement_korpu");

require("./pvp_settlement_live_override");

assert.strictEqual(
  settlementModulu.pvpDoyusSettlementiniPostgresIleIcraEt,
  bridge.pvpDoyusSettlementVeRaportlariniPostgresIleIcraEt,
  "Live PvP settlement export-u tam report/zeroing/plunder bridge funksiyasına yönəlməlidir."
);

console.log("PvP live settlement override testi uğurla keçdi.");
