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
    `    const ring = i < 10\n      ? { min: middleRadius + 20, max: outerRadius - 10, zone: \"outer\", presidentCenter: false }\n      : i < 15\n        ? { min: innerRadius + 20, max: middleRadius - 10, zone: \"middle\", presidentCenter: false }\n        : i < STATE_WORLD_OBJECT_CONFIG.resourceSitesPerState - 1\n          ? { min: 70, max: innerRadius - 15, zone: \"inner_green\", presidentCenter: false }\n          : { min: 25, max: Math.min(70, innerRadius - 20), zone: \"inner_green\", presidentCenter: true };`,
    "Resurs zona paylanması"
  );
  kod = netice.kod;
  deyisdi = deyisdi || netice.deyisdi;

  netice = birDefeDeyisdir(
    kod,
    `      resourceType: resourceTypes[i % resourceTypes.length],\n      levelBand: ring.zone === \"outer\" ? 1 : ring.zone === \"middle\" ? 2 : 3`,
    `      resourceType: resourceTypes[i % resourceTypes.length],\n      levelBand: ring.zone === \"outer\" ? 1 : ring.zone === \"middle\" ? 2 : 3,\n      level: ring.presidentCenter === true\n        ? 10\n        : ring.zone === \"outer\"\n          ? xeriteLeveliSec(rng, 3, 6)\n          : ring.zone === \"middle\"\n            ? xeriteLeveliSec(rng, 5, 8)\n            : xeriteLeveliSec(rng, 8, 9),\n      presidentCenter: ring.presidentCenter === true`,
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

  netice = birDefeDeyisdir(
    kod,
    `const {\n  sifreSifirlamaMesajiniEmalEt\n} = require(\"./sifre_sifirlama_handler\");`,
    `const {\n  sifreSifirlamaMesajiniEmalEt\n} = require(\"./sifre_sifirlama_handler\");\n\nconst {\n  bazaYerdeyismeKonvoylariniGeriCagir\n} = require(\"./baza_yerdeyisme_konvoy_sistemi\");\nconst {\n  oyuncuMutasiyaKilidiIleIcraEt\n} = require(\"./server_oyuncu_mutasiya_kilidi\");\nconst {\n  oyunStateIniYaddaSaxla\n} = require(\"./oyun_state_daimilik_korpu\");\nconst {\n  dovletBazalariniAl,\n  dovletBazaKeshiniTemizle\n} = require(\"./dovlet_baza_kataloqu_postgres\");\nconst {\n  dovletYerdeyismeKilidiIleIcraEt\n} = require(\"./baza_yerdeyisme_dovlet_kilidi_postgres\");`,
    "Baza yerdəyişmə modul importları"
  );
  kod = netice.kod;
  deyisdi = deyisdi || netice.deyisdi;

  netice = birDefeDeyisdir(
    kod,
    `      case \"base_teleport_request\": {\n        const playerId =\n          (msg.playerId && typeof msg.playerId === \"string\" && msg.playerId) ||\n          ws._authedPlayerId;\n\n        if (!playerId) {\n          send(ws, { type: \"error\", message: \"Not authed. Send auth first.\" });\n          break;\n        }\n\n        const targetBaseX = Number.isInteger(msg.x) ? msg.x : parseInt(msg.x, 10);\n        const targetBaseZ = Number.isInteger(msg.z) ? msg.z : parseInt(msg.z, 10);\n\n        if (!Number.isInteger(targetBaseX) || !Number.isInteger(targetBaseZ)) {\n          send(ws, { type: \"error\", message: \"Invalid base teleport coordinates\" });\n          break;\n        }\n\n        const state = getOrCreatePlayerState(playerId);\n        const result = teleportPlayerBaseInsideState(state, playerId, targetBaseX, targetBaseZ);\n\n        if (!result.ok) {\n          send(ws, { type: \"error\", message: result.message || \"Base teleport failed\" });\n          break;\n        }\n\n        send(ws, {\n          type: result.ignored ? \"base_teleport_ignored\" : \"base_teleported\",\n          playerId,\n          serverTimeUnixMs: nowMs(),\n          payloadJson: JSON.stringify(result)\n        });\n\n        pushStateToPlayerConnections(playerId, state);\n        pushStateLocalMapToStatePlayers(result.stateId);\n\n        console.log(\"[BASE_TELEPORT]\", {\n          playerId,\n          stateId: result.stateId,\n          baseX: result.baseX,\n          baseZ: result.baseZ,\n          zone: result.zone,\n          ignored: !!result.ignored\n        });\n\n        break;\n      }`,
    `      case \"base_teleport_request\": {\n        const playerId =\n          (msg.playerId && typeof msg.playerId === \"string\" && msg.playerId) ||\n          ws._authedPlayerId;\n\n        if (!playerId) {\n          send(ws, { type: \"error\", message: \"Not authed. Send auth first.\" });\n          break;\n        }\n\n        const targetBaseX = Number.isInteger(msg.x) ? msg.x : parseInt(msg.x, 10);\n        const targetBaseZ = Number.isInteger(msg.z) ? msg.z : parseInt(msg.z, 10);\n\n        if (!Number.isInteger(targetBaseX) || !Number.isInteger(targetBaseZ)) {\n          send(ws, { type: \"error\", message: \"Invalid base teleport coordinates\" });\n          break;\n        }\n\n        const teleportNeticesi = await oyuncuMutasiyaKilidiIleIcraEt(\n          playerId,\n          async () => {\n            const state = getOrCreatePlayerState(playerId);\n            const stateId = Number(state && state.worldPlacement && state.worldPlacement.stateId);\n            const stateRuntime = getWorldStateRuntime(stateId);\n            const oldBaseX = Number(state.worldPlacement.baseX);\n            const oldBaseZ = Number(state.worldPlacement.baseZ);\n            const samePosition = oldBaseX === targetBaseX && oldBaseZ === targetBaseZ;\n\n            if (samePosition) {\n              const result = teleportPlayerBaseInsideState(\n                state,\n                playerId,\n                targetBaseX,\n                targetBaseZ\n              );\n              return { result, convoyRecall: null, state };\n            }\n\n            return await dovletYerdeyismeKilidiIleIcraEt(\n              stateId,\n              async () => {\n                const check = canTeleportBaseInsideState(\n                  stateRuntime,\n                  playerId,\n                  targetBaseX,\n                  targetBaseZ\n                );\n\n                if (!check.ok) {\n                  return { result: check, convoyRecall: null, state };\n                }\n\n                // Cari Koyeb instance-in 3 saniyəlik baza cache-i burada\n                // məcburi təmizlənir. State advisory lock saxlanıldığı üçün\n                // paralel teleport bu yoxlamanı keçə bilməz.\n                dovletBazaKeshiniTemizle(stateId);\n                const bazaKataloqu = await dovletBazalariniAl(stateId, nowMs());\n                const minDistance = Math.max(\n                  0,\n                  Number(STATE_LOCAL_MAP_CONFIG.minBaseDistance) || 0\n                );\n                const minDistanceSq = minDistance * minDistance;\n                const playerAcar = String(playerId || \"\").trim().toLowerCase();\n\n                for (const other of (bazaKataloqu.bases || [])) {\n                  const otherPlayerId = String(other && other.playerId || \"\")\n                    .trim()\n                    .toLowerCase();\n\n                  if (!otherPlayerId || otherPlayerId === playerAcar) continue;\n\n                  const otherX = Number(other && other.baseX);\n                  const otherZ = Number(other && other.baseZ);\n                  if (!Number.isFinite(otherX) || !Number.isFinite(otherZ)) continue;\n\n                  if (\n                    getDistanceSquared(\n                      targetBaseX,\n                      targetBaseZ,\n                      otherX,\n                      otherZ\n                    ) < minDistanceSq\n                  ) {\n                    return {\n                      result: {\n                        ok: false,\n                        message: \"Target location is too close to another base\"\n                      },\n                      convoyRecall: null,\n                      state\n                    };\n                  }\n                }\n\n                const recallAtMs = nowMs();\n                const convoyRecall = await bazaYerdeyismeKonvoylariniGeriCagir(\n                  state,\n                  playerId,\n                  recallAtMs\n                );\n\n                const result = teleportPlayerBaseInsideState(\n                  state,\n                  playerId,\n                  targetBaseX,\n                  targetBaseZ\n                );\n\n                if (!result.ok) {\n                  await oyunStateIniYaddaSaxla(playerId, state);\n                  return { result, convoyRecall, state };\n                }\n\n                state.worldPlacement.lastTeleportFromX = oldBaseX;\n                state.worldPlacement.lastTeleportFromZ = oldBaseZ;\n                result.oldBaseX = oldBaseX;\n                result.oldBaseZ = oldBaseZ;\n                result.convoyRecall = convoyRecall;\n\n                await oyunStateIniYaddaSaxla(playerId, state);\n                dovletBazaKeshiniTemizle(result.stateId);\n\n                return { result, convoyRecall, state };\n              }\n            );\n          }\n        );\n\n        const result = teleportNeticesi && teleportNeticesi.result;\n        const state = teleportNeticesi && teleportNeticesi.state;\n\n        if (!result || !result.ok) {\n          send(ws, {\n            type: \"error\",\n            message: result && result.message ? result.message : \"Base teleport failed\"\n          });\n          break;\n        }\n\n        send(ws, {\n          type: result.ignored ? \"base_teleport_ignored\" : \"base_teleported\",\n          playerId,\n          serverTimeUnixMs: nowMs(),\n          payloadJson: JSON.stringify(result)\n        });\n\n        pushStateToPlayerConnections(playerId, state);\n        pushStateLocalMapToStatePlayers(result.stateId);\n\n        console.log(\"[BASE_TELEPORT]\", {\n          playerId,\n          stateId: result.stateId,\n          baseX: result.baseX,\n          baseZ: result.baseZ,\n          oldBaseX: result.oldBaseX,\n          oldBaseZ: result.oldBaseZ,\n          recalledConvoys: result.convoyRecall ? result.convoyRecall.recalledCount : 0,\n          zone: result.zone,\n          ignored: !!result.ignored\n        });\n\n        break;\n      }`,
    "Baza teleport zamanı konvoyları dərhal geri çağır"
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
      "[DOVLET_PATCH] 60 günlük Dövlət, xəritə level, enemy scout və baza teleport qaydaları tətbiq edildi."
    );
  }
}

module.exports = {
  dovletQaydalariniTetbiqEt
};
