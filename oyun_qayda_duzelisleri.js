"use strict";

// ============================================================
// CARİ OYUN QAYDASI DÜZƏLİŞLƏRİ
// ------------------------------------------------------------
// 1) outer / middle / inner_green oyunçu unlock sistemi deyil.
//    Bunlar yalnız Dövlət xəritəsindəki resurs və düşmən səviyyə bantlarıdır.
// 2) Buna görə köhnə M020 xəritə-zona unlock şərti deaktiv edilir.
//    M020 yeni missiya qaydası verilənə qədər tamamlanmır.
// ============================================================

const { MISSIYA_KATALOQU } = require("./missiya_kataloqu");

function cariQaydalariTetbiqEt() {
  const m020 = Array.isArray(MISSIYA_KATALOQU)
    ? MISSIYA_KATALOQU.find(x => x && x.missionId === "M020")
    : null;

  if (m020) {
    m020.title = "Növbəti Mərhələ";
    m020.description = "Bu missiyanın yeni gameplay qaydası hələ təyin edilməyib.";
    m020.type = "server_event_count";
    m020.eventId = "m020_yeni_qayda_gozleyir";
    m020.requiredCount = 1;
    m020.rewards = [];
  }
}

cariQaydalariTetbiqEt();

module.exports = {
  cariQaydalariTetbiqEt
};
