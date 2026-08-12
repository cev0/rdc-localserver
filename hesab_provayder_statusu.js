"use strict";

const {
  provayderKonfiqurasiyaStatusu
} = require("./hesab_provayder_yoxlayici");

function isare(deyer) {
  return deyer ? "HAZIR" : "QURULMAYIB";
}

function say(deyer) {
  return String(deyer || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean)
    .length;
}

const status = provayderKonfiqurasiyaStatusu();

console.log("[HESAB_PROVAYDER_STATUS] Server provayder statusu:");
console.log(`Google      : ${isare(status.google)} (Client ID sayı: ${say(process.env.GOOGLE_CLIENT_IDS)})`);
console.log(`Apple       : ${isare(status.apple)} (Client ID sayı: ${say(process.env.APPLE_CLIENT_IDS)})`);
console.log(`Facebook    : ${isare(status.facebook)} (App ID: ${process.env.FACEBOOK_APP_ID ? "var" : "yox"}, Secret: ${process.env.FACEBOOK_APP_SECRET ? "var" : "yox"})`);
console.log(`Game Center : ${isare(status.gameCenter)} (Bundle ID sayı: ${say(process.env.GAME_CENTER_BUNDLE_IDS)})`);

console.log("\nTələb olunan Koyeb environment dəyişənləri:");
console.log("GOOGLE_CLIENT_IDS");
console.log("APPLE_CLIENT_IDS");
console.log("FACEBOOK_APP_ID");
console.log("FACEBOOK_APP_SECRET");
console.log("FACEBOOK_GRAPH_VERSION (opsional)");
console.log("GAME_CENTER_BUNDLE_IDS");
console.log("\nQeyd: Secret dəyərlər heç vaxt bu skript tərəfindən çap edilmir.");
