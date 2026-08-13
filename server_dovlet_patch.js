"use strict";

const fs = require("fs");
const path = require("path");

function birDefeDeyisdir(kod, axtarilan, yeniMetn, ad) {
  const ilk = kod.indexOf(axtarilan);
  if (ilk < 0) return { kod, deyisdi: false };

  if (kod.indexOf(axtarilan, ilk + axtarilan.length) >= 0) {
    throw new Error(`[DOVLET_PATCH] Birdən çox uyğun hissə tapıldı: ${ad}`);
  }

  return {
    kod: kod.replace(axtarilan, yeniMetn),
    deyisdi: true
  };
}

function dovletQaydalariniTetbiqEt() {
  const serverYolu = path.join(__dirname, "server.js");
  let kod = fs.readFileSync(serverYolu, "utf8");
  let deyisdi = false;

  let netice = birDefeDeyisdir(
    kod,
    "const STATE_NEW_PLAYER_SOFT_CAP = 200;",
    `const STATE_DOVLET_MUDDETI_MS = 60 * 24 * 60 * 60 * 1000;\nconst STATE_PLAY_MARKET_RELEASE_MS = (() => {\n  const xam = String(process.env.PLAY_MARKET_RELEASE_TARIXI || \"\").trim();\n  if (!xam) return 0;\n  const tarix = Date.parse(xam);\n  return Number.isFinite(tarix) && tarix > 0 ? tarix : 0;\n})();`,
    "Dövlət müddəti"
  );
  kod = netice.kod;
  deyisdi = deyisdi || netice.deyisdi;

  netice = birDefeDeyisdir(
    kod,
    `  if (getWorldStatePlayerCount(activeState) >= STATE_NEW_PLAYER_SOFT_CAP) {\n    activeState = openNextWorldState();\n  }`,
    `  // Yeni Dövlət oyunçu sayına görə deyil, Play Market release tarixindən\n  // hesablanan 60 günlük dövrlərə görə açılır.\n  if (STATE_PLAY_MARKET_RELEASE_MS > 0) {\n    const kecen = Math.max(0, nowMs() - STATE_PLAY_MARKET_RELEASE_MS);\n    const hedefStateId = Math.max(1, Math.floor(kecen / STATE_DOVLET_MUDDETI_MS) + 1);\n\n    while (worldRuntime.nextStateId <= hedefStateId) {\n      openNextWorldState();\n    }\n\n    for (let stateId = 1; stateId <= hedefStateId; stateId++) {\n      const dovlet = getWorldStateRuntime(stateId);\n      if (!dovlet) continue;\n\n      const planliBaslangic =\n        STATE_PLAY_MARKET_RELEASE_MS +\n        ((stateId - 1) * STATE_DOVLET_MUDDETI_MS);\n\n      dovlet.createdAtMs = planliBaslangic;\n      dovlet.centerUnlockAtMs =\n        planliBaslangic + STATE_CENTER_UNLOCK_DELAY_MS;\n\n      if (dovlet.centerBuilding && typeof dovlet.centerBuilding === \"object\") {\n        dovlet.centerBuilding.unlockAtMs = dovlet.centerUnlockAtMs;\n      }\n    }\n\n    const vaxtState = getWorldStateRuntime(hedefStateId);\n    if (vaxtState) {\n      worldRuntime.activeStateIdForNewPlayers = vaxtState.stateId;\n      activeState = vaxtState;\n      refreshWorldRuntimeFlags();\n    }\n  }`,
    "Dövlət 60 günlük aktivlik"
  );
  kod = netice.kod;
  deyisdi = deyisdi || netice.deyisdi;

  netice = birDefeDeyisdir(
    kod,
    `function clampNumber(value, min, max) {\n  return Math.max(min, Math.min(max, value));\n}`,
    `function clampNumber(value, min, max) {\n  return Math.max(min, Math.min(max, value));\n}\n\nfunction xeriteLeveliSec(rng, minLevel, maxLevel) {\n  const min = Math.max(1, Math.trunc(Number(minLevel) || 1));\n  const max = Math.max(min, Math.trunc(Number(maxLevel) || min));\n  return min + Math.floor(rng() * ((max - min) + 1));\n}`,
    "Xəritə level seçimi"
  );
  kod = netice.kod;
  deyisdi = deyisdi || netice.deyisdi;

  netice = birDefeDeyisdir(
    kod,
    `    const ring = i < 10\n      ? { min: middleRadius + 20, max: outerRadius - 10, zone: \"outer\" }\n      : i < 15\n        ? { min: innerRadius + 20, max: middleRadius - 10, zone: \"middle\" }\n        : { min: 25, max: innerRadius - 15, zone: \"inner_green\" };`,
    `    const ring = i < 10\n      ? { min: middleRadius + 20, max: outerRadius - 10, zone: \"outer\" }\n      : i < 15\n        ? { min: innerRadius + 20, max: middleRadius - 10, zone: \"middle\" }\n        : i < STATE_WORLD_OBJECT_CONFIG.resourceSitesPerState - 1\n          ? { min: 70, max: innerRadius - 15, zone: \"inner_green\" }\n          : { min: 25, max: Math.min(70, innerRadius - 20), zone: \"president_center\" };`,
    "Resurs zona paylanması"
  );
  kod = netice.kod;
  deyisdi = deyisdi || netice.deyisdi;

  netice = birDefeDeyisdir(
    kod,
    `      resourceType: resourceTypes[i % resourceTypes.length],\n      levelBand: ring.zone === \"outer\" ? 1 : ring.zone === \"middle\" ? 2 : 3`,
    `      resourceType: resourceTypes[i % resourceTypes.length],\n      levelBand: ring.zone === \"outer\" ? 1 : ring.zone === \"middle\" ? 2 : ring.zone === \"inner_green\" ? 3 : 4,\n      level: ring.zone === \"outer\"\n        ? xeriteLeveliSec(rng, 3, 6)\n        : ring.zone === \"middle\"\n          ? xeriteLeveliSec(rng, 5, 8)\n          : ring.zone === \"inner_green\"\n            ? xeriteLeveliSec(rng, 8, 9)\n            : 10,\n      presidentCenter: ring.zone === \"president_center\"`,
    "Resurs level diapazonları"
  );
  kod = netice.kod;
  deyisdi = deyisdi || netice.deyisdi;

  netice = birDefeDeyisdir(
    kod,
    `      zone: ring.zone,\n      levelBand: ring.zone === \"outer\" ? 1 : ring.zone === \"middle\" ? 2 : 3\n    });\n  }\n\n  for (let i = 0; i < STATE_WORLD_OBJECT_CONFIG.neutralCitiesPerState; i++) {`,
    `      zone: ring.zone,\n      levelBand: ring.zone === \"outer\" ? 1 : ring.zone === \"middle\" ? 2 : 3,\n      level: ring.zone === \"outer\"\n        ? xeriteLeveliSec(rng, 1, 5)\n        : ring.zone === \"middle\"\n          ? xeriteLeveliSec(rng, 5, 8)\n          : xeriteLeveliSec(rng, 8, 10)\n    });\n  }\n\n  for (let i = 0; i < STATE_WORLD_OBJECT_CONFIG.neutralCitiesPerState; i++) {`,
    "Düşmən level diapazonları"
  );
  kod = netice.kod;
  deyisdi = deyisdi || netice.deyisdi;

  const evvelkiKod = kod;
  kod = kod.replaceAll("infectedSitesPerState", "enemyScoutSitesPerState");
  kod = kod.replaceAll("infectedSiteCount", "enemyScoutCount");
  kod = kod.replaceAll("_infected_", "_enemy_scout_");
  kod = kod.replace(/\binfected\b/g, "enemyScouts");
  if (kod !== evvelkiKod) deyisdi = true;

  const enemyPush =
    "    enemyScouts.push({\n      id: `state_${stateId}_enemy_scout_${i + 1}`,";

  if (kod.includes(enemyPush) && !kod.includes('enemyType: "scout"')) {
    kod = kod.replace(
      enemyPush,
      `${enemyPush}\n      enemyType: \"scout\",`
    );
    deyisdi = true;
  }

  if (deyisdi) {
    fs.writeFileSync(serverYolu, kod, "utf8");
    console.log(
      "[DOVLET_PATCH] 60 günlük Dövlət, xəritə level və enemy scout qaydaları tətbiq edildi."
    );
  }
}

module.exports = {
  dovletQaydalariniTetbiqEt
};
