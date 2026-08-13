"use strict";

const fs = require("fs");
const path = require("path");

function birDefeDeyisdir(kod, axtarilan, yeniMetn, ad) {
  const ilk = kod.indexOf(axtarilan);
  if (ilk < 0) return { kod, deyisdi: false };
  if (kod.indexOf(axtarilan, ilk + axtarilan.length) >= 0) {
    throw new Error(`[DOVLET_PATCH] Birdən çox uyğun hissə tapıldı: ${ad}`);
  }
  return { kod: kod.replace(axtarilan, yeniMetn), deyisdi: true };
}

function dovletQaydalariniTetbiqEt() {
  const serverYolu = path.join(__dirname, "server.js");
  let kod = fs.readFileSync(serverYolu, "utf8");
  let deyisdi = false;

  let netice = birDefeDeyisdir(
    kod,
    "const STATE_NEW_PLAYER_SOFT_CAP = 200;",
    `const STATE_AY_MUDDETI_MS = 30 * 24 * 60 * 60 * 1000;\nconst STATE_DUNYA_BASLANGIC_MS = (() => {\n  const xam = String(process.env.DOVLET_1_BASLANGIC_TARIXI || \"\").trim();\n  if (!xam) return 0;\n  const tarix = Date.parse(xam);\n  return Number.isFinite(tarix) && tarix > 0 ? tarix : 0;\n})();`,
    "Dövlət soft-cap"
  );
  kod = netice.kod;
  deyisdi = deyisdi || netice.deyisdi;

  netice = birDefeDeyisdir(
    kod,
    `  if (getWorldStatePlayerCount(activeState) >= STATE_NEW_PLAYER_SOFT_CAP) {\n    activeState = openNextWorldState();\n  }`,
    `  if (STATE_DUNYA_BASLANGIC_MS > 0) {\n    const kecen = Math.max(0, nowMs() - STATE_DUNYA_BASLANGIC_MS);\n    const hedefStateId = Math.max(1, Math.floor(kecen / STATE_AY_MUDDETI_MS) + 1);\n\n    while (worldRuntime.nextStateId <= hedefStateId) {\n      openNextWorldState();\n    }\n\n    for (let stateId = 1; stateId <= hedefStateId; stateId++) {\n      const dovlet = getWorldStateRuntime(stateId);\n      if (!dovlet) continue;\n      const planliBaslangic = STATE_DUNYA_BASLANGIC_MS + ((stateId - 1) * STATE_AY_MUDDETI_MS);\n      dovlet.createdAtMs = planliBaslangic;\n      dovlet.centerUnlockAtMs = planliBaslangic + STATE_CENTER_UNLOCK_DELAY_MS;\n      if (dovlet.centerBuilding && typeof dovlet.centerBuilding === \"object\") {\n        dovlet.centerBuilding.unlockAtMs = dovlet.centerUnlockAtMs;\n      }\n    }\n\n    const vaxtState = getWorldStateRuntime(hedefStateId);\n    if (vaxtState) {\n      worldRuntime.activeStateIdForNewPlayers = vaxtState.stateId;\n      activeState = vaxtState;\n      refreshWorldRuntimeFlags();\n    }\n  }`,
    "Dövlət aylıq aktivlik"
  );
  kod = netice.kod;
  deyisdi = deyisdi || netice.deyisdi;

  const evvelkiKod = kod;
  kod = kod.replaceAll("infectedSitesPerState", "enemyScoutSitesPerState");
  kod = kod.replaceAll("infectedSiteCount", "enemyScoutCount");
  kod = kod.replaceAll("_infected_", "_enemy_scout_");
  kod = kod.replace(/\binfected\b/g, "enemyScouts");
  if (kod !== evvelkiKod) deyisdi = true;

  const enemyPush = "    enemyScouts.push({\n      id: `state_${stateId}_enemy_scout_${i + 1}`,";
  if (kod.includes(enemyPush) && !kod.includes('enemyType: "scout"')) {
    kod = kod.replace(enemyPush, `${enemyPush}\n      enemyType: "scout",`);
    deyisdi = true;
  }

  if (deyisdi) {
    fs.writeFileSync(serverYolu, kod, "utf8");
    console.log("[DOVLET_PATCH] Dövlət və enemy scout qaydaları tətbiq edildi.");
  }
}

module.exports = { dovletQaydalariniTetbiqEt };
