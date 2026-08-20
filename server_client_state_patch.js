"use strict";

const fs = require("fs");
const path = require("path");

function clientStateQaydalariniTetbiqEt(serverYolu = path.join(__dirname, "server.js")) {
  let kod = fs.readFileSync(serverYolu, "utf8");
  let deyisdi = false;

  const cloneSetri = `  const clientState = JSON.parse(JSON.stringify(state));\n`;
  const cloneIndex = kod.indexOf(cloneSetri);

  if (cloneIndex < 0) {
    throw new Error("[CLIENT_STATE_PATCH] makeClientState clientState clone hissəsi tapılmadı.");
  }

  if (kod.indexOf(cloneSetri, cloneIndex + cloneSetri.length) >= 0) {
    throw new Error("[CLIENT_STATE_PATCH] makeClientState clientState clone hissəsi birdən çox tapıldı.");
  }

  // ------------------------------------------------------------
  // Server-internal idempotency tarixçəsini client payload-dan çıxar.
  // ------------------------------------------------------------
  if (!kod.includes("delete clientState.serverSorquIdempotentliyi;")) {
    const idempotencyKod = `\n  // Server-internal mobil retry/idempotency tarixçəsi Unity-yə göndərilmir.\n  // PostgreSQL gameplay snapshot-da qalır və server restart-dan sonra da\n  // duplicate request-ləri tanımaq üçün istifadə oluna bilir.\n  delete clientState.serverSorquIdempotentliyi;\n`;

    kod = kod.slice(0, cloneIndex + cloneSetri.length) +
      idempotencyKod +
      kod.slice(cloneIndex + cloneSetri.length);
    deyisdi = true;
  }

  // ------------------------------------------------------------
  // Resurs hesabatları ayrıca on-demand WebSocket endpoint-i ilə gəlir.
  // PostgreSQL gameplay snapshot-da saxlanılır, amma tez-tez göndərilən
  // ümumi state payload-ını və mobil trafiki şişirtməsin.
  // ------------------------------------------------------------
  if (!kod.includes("delete clientState.resursHesabatlari;")) {
    const resursHesabatiKod = `\n  // Resurs hesabatları ayrıca sorğu ilə alınır.\n  delete clientState.resursHesabatlari;\n`;

    const yeniCloneIndex = kod.indexOf(cloneSetri);
    kod = kod.slice(0, yeniCloneIndex + cloneSetri.length) +
      resursHesabatiKod +
      kod.slice(yeniCloneIndex + cloneSetri.length);
    deyisdi = true;
  }

  // ------------------------------------------------------------
  // Qoşun client compatibility.
  // Yeni server kataloqu canonical ID-lər saxlayır:
  //   warrior_t1, shooter_t1, vehicle_t1 ...
  // Cari Unity ArmyTroopsData isə legacy sahələri oxuyur:
  //   fighter_lv1, shooter_lv1, vehicle_lv1 ...
  //
  // Snapshot-da hər iki açar ola bilər və döyüş sistemi onları ayrıca
  // vahidlər kimi canonical-a toplayır. Ona görə client üçün göstərilən
  // legacy sahə legacy + canonical cəmi olmalıdır. Server state dəyişmir;
  // yalnız clone edilmiş clientState uyğunlaşdırılır.
  // ------------------------------------------------------------
  if (!kod.includes("[CLIENT_TROOP_ALIAS_COMPAT]")) {
    const aliasKod = `\n  // [CLIENT_TROOP_ALIAS_COMPAT]\n  if (\n    clientState.army &&\n    clientState.army.troops &&\n    typeof clientState.army.troops === \"object\" &&\n    !Array.isArray(clientState.army.troops)\n  ) {\n    const troops = clientState.army.troops;\n    const sayAl = (acar) => {\n      const n = Number(troops[acar]);\n      return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;\n    };\n\n    for (let tier = 1; tier <= 10; tier++) {\n      troops[\`fighter_lv\${tier}\`] =\n        sayAl(\`fighter_lv\${tier}\`) + sayAl(\`warrior_t\${tier}\`);\n\n      troops[\`shooter_lv\${tier}\`] =\n        sayAl(\`shooter_lv\${tier}\`) + sayAl(\`shooter_t\${tier}\`);\n\n      troops[\`vehicle_lv\${tier}\`] =\n        sayAl(\`vehicle_lv\${tier}\`) + sayAl(\`vehicle_t\${tier}\`);\n    }\n  }\n`;

    const yeniCloneIndex = kod.indexOf(cloneSetri);
    kod = kod.slice(0, yeniCloneIndex + cloneSetri.length) +
      aliasKod +
      kod.slice(yeniCloneIndex + cloneSetri.length);
    deyisdi = true;
  }

  // ------------------------------------------------------------
  // Unity JsonUtility Dictionary<string, int> oxumur.
  // Authoritative levels obyekti server state-də dəyişmədən qalır;
  // client clone-a əlavə, deterministik array görünüşü verilir.
  // ------------------------------------------------------------
  if (!kod.includes("[CLIENT_TECH_LEVEL_COMPAT]")) {
    const techLevelsKod = `
  // [CLIENT_TECH_LEVEL_COMPAT]
  if (
    clientState.technology &&
    typeof clientState.technology === "object" &&
    !Array.isArray(clientState.technology)
  ) {
    const levels =
      clientState.technology.levels &&
      typeof clientState.technology.levels === "object" &&
      !Array.isArray(clientState.technology.levels)
        ? clientState.technology.levels
        : {};

    clientState.technology.techLevels = Object.entries(levels)
      .map(([techId, rawLevel]) => ({
        techId: String(techId || "").trim().toLowerCase(),
        level: Math.max(0, Math.trunc(Number(rawLevel) || 0))
      }))
      .filter(x => x.techId)
      .sort((a, b) => a.techId.localeCompare(b.techId));
  }
`;

    const yeniCloneIndex = kod.indexOf(cloneSetri);
    kod = kod.slice(0, yeniCloneIndex + cloneSetri.length) +
      techLevelsKod +
      kod.slice(yeniCloneIndex + cloneSetri.length);
    deyisdi = true;
  }

  if (!deyisdi) {
    return false;
  }

  fs.writeFileSync(serverYolu, kod, "utf8");
  console.log("[CLIENT_STATE_PATCH] Client state compatibility qaydaları tətbiq edildi.");
  return true;
}

module.exports = {
  clientStateQaydalariniTetbiqEt
};