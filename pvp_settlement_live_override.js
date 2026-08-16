"use strict";

// pvp_baza_live_handler bu override-dan SONRA require edilməlidir.
// Node require cache-də eyni module.exports obyekti saxlandığı üçün burada
// settlement export-u dəyişdirilir və live handler destructuring zamanı artıq
// tam bridge funksiyasını alır.
const settlementModulu = require("./pvp_doyus_settlement_sistemi");
const {
  pvpDoyusSettlementVeRaportlariniPostgresIleIcraEt
} = require("./pvp_doyus_raport_settlement_korpu");

if (
  !settlementModulu ||
  typeof pvpDoyusSettlementVeRaportlariniPostgresIleIcraEt !== "function"
) {
  throw new Error("PvP live settlement override üçün bridge tapılmadı.");
}

settlementModulu.pvpDoyusSettlementiniPostgresIleIcraEt =
  pvpDoyusSettlementVeRaportlariniPostgresIleIcraEt;

module.exports = {
  liveSettlementOverrideActive: true
};
