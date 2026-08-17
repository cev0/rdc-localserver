"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const serverKoku = __dirname;
const unityKoku = path.resolve(
  process.argv[2] || process.env.UNITY_REPO_DIR || "../testgame"
);
const unityAssets = path.join(unityKoku, "Assets");

assert.ok(
  fs.existsSync(unityAssets),
  "Unity Assets qovluğu tapılmadı: " + unityAssets
);

function fayllariTap(qovluq, filter) {
  const netice = [];

  for (const entry of fs.readdirSync(qovluq, { withFileTypes: true })) {
    const tamYol = path.join(qovluq, entry.name);

    if (entry.isDirectory()) {
      netice.push(...fayllariTap(tamYol, filter));
    }
    else if (entry.isFile() && filter(tamYol)) {
      netice.push(tamYol);
    }
  }

  return netice;
}

function regexUcunTemizle(deyer) {
  return deyer.replace(/[.*+?^()|[\]{}$\\]/g, "\\$&");
}

function fayliOxu(kok, nisbiYol) {
  const tamYol = path.join(kok, nisbiYol);
  assert.ok(fs.existsSync(tamYol), "Müqavilə faylı tapılmadı: " + tamYol);
  return fs.readFileSync(tamYol, "utf8");
}

function saheleriYoxla(kok, nisbiYol, saheler) {
  const kod = fayliOxu(kok, nisbiYol);

  for (const sahe of saheler) {
    assert.ok(
      new RegExp("\\b" + regexUcunTemizle(sahe) + "\\b").test(kod),
      nisbiYol + " müqavilə sahəsini itirib: " + sahe
    );
  }
}

const unityCsFayllari = fayllariTap(
  unityAssets,
  fayl => fayl.endsWith(".cs")
);

const requestMenbeleri = new Map();
const standaloneOutbound = new Set([
  "hello",
  "ping",
  "auth",
  "get_state",
  "get_world_map",
  "get_state_local_map",
  "research_start",
  "technology_research_start"
]);

for (const fayl of unityCsFayllari) {
  const kod = fs.readFileSync(fayl, "utf8");
  const nisbiYol = path.relative(unityKoku, fayl);
  const literalRegex = /"([a-z][a-z0-9_]{1,127})"/g;
  let uygunluq;

  while ((uygunluq = literalRegex.exec(kod)) !== null) {
    const tip = uygunluq[1];

    if (!tip.endsWith("_request") && !standaloneOutbound.has(tip)) {
      continue;
    }

    if (!requestMenbeleri.has(tip)) {
      requestMenbeleri.set(tip, new Set());
    }

    requestMenbeleri.get(tip).add(nisbiYol);
  }

  assert.ok(
    !/\btype\s*=\s*"state_sync"/.test(kod),
    "Unity lokal state upload etməməlidir: " + nisbiYol
  );
}

const clientTipleri = Array.from(requestMenbeleri.keys()).sort();

assert.ok(
  clientTipleri.length >= 40,
  "Unity outbound mesaj inventarı gözlənilmədən kiçildi: " + clientTipleri.length
);

const serverRuntimeFayllari = fs.readdirSync(serverKoku)
  .filter(ad =>
    ad === "server.js" ||
    ad.endsWith("_handler.js") ||
    /^server_.*genisletme.*\.js$/.test(ad)
  )
  .map(ad => path.join(serverKoku, ad));

const serverRuntimeKod = serverRuntimeFayllari
  .map(fayl => fs.readFileSync(fayl, "utf8"))
  .join("\n");

const catismayanTipler = clientTipleri.filter(tip => {
  const literal = new RegExp(
    "[\"']" + regexUcunTemizle(tip) + "[\"']"
  );
  return !literal.test(serverRuntimeKod);
});

assert.deepStrictEqual(
  catismayanTipler,
  [],
  "Unity outbound mesajlarının server qarşılığı yoxdur: " +
    catismayanTipler.map(tip => {
      const menbeler = Array.from(requestMenbeleri.get(tip) || []);
      return tip + " (" + menbeler.join(", ") + ")";
    }).join("; ")
);

saheleriYoxla(
  serverKoku,
  "hesab_elave_handler.js",
  [
    "account_info_result",
    "playerId",
    "accountId",
    "isBound",
    "primaryEmail",
    "emailVerified"
  ]
);
saheleriYoxla(
  unityKoku,
  "Assets/_RDC/Scripts/RDC/Net/Sync/StateSyncService.cs",
  [
    "HesabMelumatiNeticesi",
    "playerId",
    "accountId",
    "isBound",
    "primaryEmail",
    "emailVerified"
  ]
);

saheleriYoxla(
  serverKoku,
  "server_client_state_patch.js",
  ["CLIENT_TECH_LEVEL_COMPAT", "techLevels", "techId", "level"]
);
saheleriYoxla(
  unityKoku,
  "Assets/_RDC/Scripts/RDC/GameState/Models/RdcGameState.cs",
  ["TechnologyData", "technology", "techLevels", "techId", "level"]
);

saheleriYoxla(
  serverKoku,
  "qosun_telimi_handler.js",
  ["troop_catalog_request", "troop_catalog_result", "catalog", "payloadJson"]
);
saheleriYoxla(
  unityKoku,
  "Assets/_RDC/Scripts/RDC/Net/Sync/StateSyncService.QosunTelimi.cs",
  ["troop_catalog_request", "troop_catalog_result", "catalog", "payloadJson"]
);

saheleriYoxla(
  serverKoku,
  "konvoy_handler.js",
  ["convoy_info_request", "convoy_info_result", "siraTutumu"]
);
saheleriYoxla(
  unityKoku,
  "Assets/_RDC/Scripts/RDC/Net/Sync/StateSyncService.Konvoy.cs",
  ["convoy_info_request", "convoy_info_result", "siraTutumu"]
);

saheleriYoxla(
  serverKoku,
  "hesab_login_handler.js",
  [
    "socketKimlikQorumasiniYoxla",
    "_authedPlayerId",
    "identity_mismatch",
    "auth_required"
  ]
);

const serverBina = fayliOxu(serverKoku, "building_definitions.json")
  .replace(/\r\n/g, "\n")
  .trimEnd();
const unityBina = fayliOxu(unityKoku, "building_definitions.json")
  .replace(/\r\n/g, "\n")
  .trimEnd();

assert.strictEqual(
  unityBina,
  serverBina,
  "Server və Unity building_definitions.json ayrışıb."
);

console.log(
  "[SERVER_UNITY_MESAJ_MUQAVILESI] " +
  clientTipleri.length +
  " outbound tip uyğun gəlir."
);
console.log(clientTipleri.join("\n"));
