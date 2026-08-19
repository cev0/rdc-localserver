"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const serverKoku = __dirname;
const manifestYolu = path.join(
  serverKoku,
  "server_unity_message_contract.json"
);
const manifest = JSON.parse(fs.readFileSync(manifestYolu, "utf8"));

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

function normallasdirilmisMetn(kod) {
  return kod.replace(/\r\n/g, "\n").trimEnd();
}

function fnv1a64(kod) {
  let hash = 14695981039346656037n;
  const prime = 1099511628211n;
  const mask = (1n << 64n) - 1n;

  for (let i = 0; i < kod.length; i++) {
    const simvol = kod.charCodeAt(i);
    hash ^= BigInt(simvol & 0xff);
    hash = (hash * prime) & mask;

    if (simvol > 0xff) {
      hash ^= BigInt((simvol >> 8) & 0xff);
      hash = (hash * prime) & mask;
    }
  }

  return hash.toString(16).padStart(16, "0");
}

function binaMuqavilesiniYoxla(kok) {
  const kod = normallasdirilmisMetn(
    fayliOxu(kok, "building_definitions.json")
  );

  assert.strictEqual(
    kod.length,
    manifest.buildingDefinitions.normalizedLength,
    "building_definitions.json uzunluğu müqavilədən ayrışıb."
  );
  assert.strictEqual(
    fnv1a64(kod),
    manifest.buildingDefinitions.fnv1a64,
    "building_definitions.json məzmunu müqavilədən ayrışıb."
  );
}

assert.strictEqual(manifest.version, 2);
assert.ok(Array.isArray(manifest.clientOutboundTypes));

const clientTipleri = manifest.clientOutboundTypes.slice();
const siralanmisTipler = clientTipleri.slice().sort();

assert.deepStrictEqual(
  clientTipleri,
  siralanmisTipler,
  "Protocol manifest outbound tipləri əlifba sırası ilə saxlanmalıdır."
);
assert.strictEqual(
  new Set(clientTipleri).size,
  clientTipleri.length,
  "Protocol manifest təkrarlanan outbound tip saxlamamalıdır."
);
assert.ok(
  clientTipleri.length >= 40,
  "Protocol manifest gözlənilmədən kiçilib."
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

const catismayanServerTipleri = clientTipleri.filter(tip => {
  const literal = new RegExp(
    "[\"']" + regexUcunTemizle(tip) + "[\"']"
  );
  return !literal.test(serverRuntimeKod);
});

assert.deepStrictEqual(
  catismayanServerTipleri,
  [],
  "Manifest outbound mesajlarının server qarşılığı yoxdur: " +
    catismayanServerTipleri.join(", ")
);

saheleriYoxla(
  serverKoku,
  "hesab_elave_handler.js",
  ["account_info_result"].concat(manifest.criticalFields.accountInfo)
);
saheleriYoxla(
  serverKoku,
  "server_client_state_patch.js",
  ["CLIENT_TECH_LEVEL_COMPAT"].concat(
    manifest.criticalFields.technologyState.filter(x => x !== "technology")
  )
);
saheleriYoxla(
  serverKoku,
  "qosun_telimi_handler.js",
  manifest.criticalFields.troopCatalog
);
saheleriYoxla(
  serverKoku,
  "qosun_telimi_handler.js",
  manifest.criticalFields.troopTrainingStatus.filter(
    sahe => sahe !== "activeQueues"
  )
);
saheleriYoxla(
  serverKoku,
  "qosun_telimi_sistemi.js",
  ["activeQueues"]
);
saheleriYoxla(
  serverKoku,
  "konvoy_handler.js",
  manifest.criticalFields.convoyInfo
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
binaMuqavilesiniYoxla(serverKoku);

// İki repo lokal olaraq yanaşı olduqda eyni skript client tərəfini də yoxlayır.
const rawUnityYolu = process.argv[2] || process.env.UNITY_REPO_DIR || "";
if (rawUnityYolu) {
  const unityKoku = path.resolve(rawUnityYolu);
  const assetsKoku = path.join(unityKoku, "Assets");
  assert.ok(fs.existsSync(assetsKoku), "Unity Assets qovluğu tapılmadı.");

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
  const tapilanTipler = new Set();

  for (const fayl of fayllariTap(assetsKoku, x => x.endsWith(".cs"))) {
    const kod = fs.readFileSync(fayl, "utf8");
    const literalRegex = /"([a-z][a-z0-9_]{1,127})"/g;
    let uygunluq;

    while ((uygunluq = literalRegex.exec(kod)) !== null) {
      const tip = uygunluq[1];
      if (tip.endsWith("_request") || standaloneOutbound.has(tip)) {
        tapilanTipler.add(tip);
      }
    }

    assert.ok(
      !/\btype\s*=\s*"state_sync"/.test(kod),
      "Unity lokal state upload etməməlidir: " +
        path.relative(unityKoku, fayl)
    );
  }

  assert.deepStrictEqual(
    Array.from(tapilanTipler).sort(),
    clientTipleri,
    "Unity outbound tipləri protocol manifest-dən ayrışıb."
  );

  saheleriYoxla(
    unityKoku,
    "Assets/_RDC/Scripts/RDC/Net/Sync/StateSyncService.cs",
    ["HesabMelumatiNeticesi"].concat(manifest.criticalFields.accountInfo)
  );
  saheleriYoxla(
    unityKoku,
    "Assets/_RDC/Scripts/RDC/GameState/Models/RdcGameState.cs",
    ["TechnologyData"].concat(manifest.criticalFields.technologyState)
  );
  saheleriYoxla(
    unityKoku,
    "Assets/_RDC/Scripts/RDC/Net/Sync/StateSyncService.QosunTelimi.cs",
    manifest.criticalFields.troopCatalog
  );
  saheleriYoxla(
    unityKoku,
    "Assets/_RDC/Scripts/RDC/Net/Sync/StateSyncService.Konvoy.cs",
    manifest.criticalFields.convoyInfo
  );
  binaMuqavilesiniYoxla(unityKoku);
}

console.log(
  "[SERVER_UNITY_MESAJ_MUQAVILESI] " +
  clientTipleri.length +
  " outbound tip qorunur."
);
