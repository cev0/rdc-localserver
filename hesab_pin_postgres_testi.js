"use strict";

const crypto = require("crypto");

const {
  proqramHovuzunuAl
} = require("./verilenler_bazasi");

const {
  hesabYaratVeBagla
} = require("./hesab_yaddasi_postgres");

const {
  pinStatusunuAl,
  pinTeyinEt,
  pinSil,
  pinYoxla
} = require("./hesab_pin_postgres");

async function main() {
  const suffix = crypto.randomBytes(6).toString("hex");
  const playerId = `pin_test_${suffix}`;
  const email = `pin_test_${suffix}@example.com`;
  const sifre = "TestSifre_12345";
  const hovuz = proqramHovuzunuAl();

  try {
    const yaradildi = await hesabYaratVeBagla(playerId, email, sifre);
    if (!yaradildi || yaradildi.success !== true) {
      throw new Error("Test hesabı yaradıla bilmədi.");
    }

    let status = await pinStatusunuAl(playerId);
    if (!status.success || status.hasPin) {
      throw new Error("Başlanğıc PIN statusu düzgün deyil.");
    }

    let netice = await pinTeyinEt(playerId, "", "123456");
    if (!netice.success || !netice.hasPin) {
      throw new Error("PIN təyin edilmədi.");
    }

    netice = await pinYoxla(playerId, "000000");
    if (netice.success) {
      throw new Error("Səhv PIN qəbul edildi.");
    }

    netice = await pinYoxla(playerId, "123456");
    if (!netice.success) {
      throw new Error("Düzgün PIN qəbul edilmədi.");
    }

    netice = await pinTeyinEt(playerId, "123456", "654321");
    if (!netice.success) {
      throw new Error("PIN dəyişdirilmədi.");
    }

    netice = await pinYoxla(playerId, "654321");
    if (!netice.success) {
      throw new Error("Yeni PIN qəbul edilmədi.");
    }

    netice = await pinSil(playerId, "654321");
    if (!netice.success || netice.hasPin) {
      throw new Error("PIN silinmədi.");
    }

    status = await pinStatusunuAl(playerId);
    if (!status.success || status.hasPin) {
      throw new Error("Final PIN statusu düzgün deyil.");
    }

    console.log("[PIN_TEST] PIN yaratma uğurludur.");
    console.log("[PIN_TEST] Səhv PIN yoxlaması bloklandı.");
    console.log("[PIN_TEST] PIN dəyişmə uğurludur.");
    console.log("[PIN_TEST] PIN silmə uğurludur.");
    console.log("[PIN_TEST] Bütün PIN testləri uğurludur.");
  }
  finally {
    try {
      await hovuz.query(
        "DELETE FROM hesablar WHERE oyuncu_id = $1",
        [playerId]
      );
    }
    catch (xeta) {
      console.warn("[PIN_TEST] Test hesabı təmizlənmədi:", xeta.message);
    }

    try {
      await hovuz.end();
    }
    catch {
    }
  }
}

main().catch((xeta) => {
  console.error("[PIN_TEST] Uğursuz:", xeta);
  process.exitCode = 1;
});
