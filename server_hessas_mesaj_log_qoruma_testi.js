"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const repoKoku = __dirname;
const serverYolu = path.join(repoKoku, "server.js");
const serverKod = fs.readFileSync(serverYolu, "utf8");

const mesajBaslangici = serverKod.indexOf('ws.on("message", async (data) => {');
assert.ok(mesajBaslangici >= 0, "WebSocket message handler tapılmadı.");

const parseSetri = 'const [msg, err] = safeJsonParse(text);';
const parseIndex = serverKod.indexOf(parseSetri, mesajBaslangici);
assert.ok(parseIndex > mesajBaslangici, "WebSocket JSON parse nöqtəsi tapılmadı.");

const parseQabaqiKod = serverKod.slice(mesajBaslangici, parseIndex);
assert.ok(
  !/console\.(?:log|info|debug|warn|error)\s*\(/.test(parseQabaqiKod),
  "Parse-dan əvvəl raw WebSocket məzmunu log edilə bilməz."
);

assert.ok(
  !serverKod.includes("[SERVER RAW MESSAGE]"),
  "Köhnə raw WebSocket log marker-i qalmamalıdır."
);

assert.ok(
  serverKod.includes('console.log("[SERVER PARSED TYPE]", msg.type);'),
  "Diaqnostika üçün yalnız təhlükəsiz mesaj tipi logu saxlanmalıdır."
);

const runtimeFayllari = fs.readdirSync(repoKoku)
  .filter(ad => ad.endsWith(".js"))
  .filter(ad => !ad.endsWith("_testi.js"))
  .filter(ad => !ad.includes("_test"));

const qadağanOlunmusLog = /console\.(?:log|info|debug|warn|error)\s*\(([\s\S]{0,1200}?)\);/g;
const hassasIfadeler = [
  /JSON\.stringify\s*\(\s*msg\s*\)/,
  /\bmsg\.(?:sifre|password|idToken|refreshToken|kod|pin|token)\b/i,
  /\b(?:sifre|password|idToken|refreshToken)\b\s*[,)]/i
];

for (const ad of runtimeFayllari) {
  const kod = fs.readFileSync(path.join(repoKoku, ad), "utf8");
  let uygunluq;

  while ((uygunluq = qadağanOlunmusLog.exec(kod)) !== null) {
    const logGovdesi = uygunluq[1];

    assert.ok(
      !hassasIfadeler.some(qayda => qayda.test(logGovdesi)),
      `${ad} həssas giriş məlumatını loglaya bilər: ${uygunluq[0].slice(0, 180)}`
    );
  }
}

console.log("[HESSAS_LOG_QORUMA_TEST] Raw credential log qoruması uğurludur.");
