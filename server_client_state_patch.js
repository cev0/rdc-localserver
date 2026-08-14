"use strict";

const fs = require("fs");
const path = require("path");

function clientStateQaydalariniTetbiqEt() {
  const serverYolu = path.join(__dirname, "server.js");
  let kod = fs.readFileSync(serverYolu, "utf8");

  const axtarilan = `  const clientState = JSON.parse(JSON.stringify(state));\n\n  if (`;
  const yeniMetn = `  const clientState = JSON.parse(JSON.stringify(state));\n\n  // Server-internal mobil retry/idempotency tarixçəsi Unity-yə göndərilmir.\n  // PostgreSQL gameplay snapshot-da qalır və server restart-dan sonra da\n  // duplicate request-ləri tanımaq üçün istifadə oluna bilir.\n  delete clientState.serverSorquIdempotentliyi;\n\n  if (`;

  if (kod.includes("delete clientState.serverSorquIdempotentliyi;")) {
    return false;
  }

  const ilk = kod.indexOf(axtarilan);
  if (ilk < 0) {
    throw new Error("[CLIENT_STATE_PATCH] makeClientState uyğun hissəsi tapılmadı.");
  }

  if (kod.indexOf(axtarilan, ilk + axtarilan.length) >= 0) {
    throw new Error("[CLIENT_STATE_PATCH] makeClientState üçün birdən çox uyğun hissə tapıldı.");
  }

  kod = kod.replace(axtarilan, yeniMetn);
  fs.writeFileSync(serverYolu, kod, "utf8");
  console.log("[CLIENT_STATE_PATCH] Server-internal idempotency state client payload-dan çıxarıldı.");
  return true;
}

module.exports = {
  clientStateQaydalariniTetbiqEt
};
