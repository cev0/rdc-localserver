"use strict";

const assert = require("assert");
const {
  SIFRE_MINIMUM_UZUNLUQ,
  SIFRE_MAKSIMUM_UZUNLUQ,
  sifreHashYarat,
  sifreDuzgundur,
  hesabYaratVeBagla
} = require("./hesab_yaddasi_postgres");
const {
  yeniSifreTeyinEt
} = require("./sifre_sifirlama_postgres");

(async function testleriIcraEt() {
  assert.strictEqual(SIFRE_MINIMUM_UZUNLUQ, 8);
  assert.strictEqual(SIFRE_MAKSIMUM_UZUNLUQ, 64);

  const minimumSifre = "a".repeat(SIFRE_MINIMUM_UZUNLUQ);
  const maksimumSifre = "b".repeat(SIFRE_MAKSIMUM_UZUNLUQ);
  const uzunSifre = "c".repeat(SIFRE_MAKSIMUM_UZUNLUQ + 1);

  const minimumHash = sifreHashYarat(minimumSifre);
  const maksimumHash = sifreHashYarat(maksimumSifre);

  assert.strictEqual(sifreDuzgundur(minimumSifre, minimumHash), true);
  assert.strictEqual(sifreDuzgundur(maksimumSifre, maksimumHash), true);
  assert.strictEqual(sifreDuzgundur("yanlis-sifre", minimumHash), false);
  assert.notStrictEqual(
    sifreHashYarat(minimumSifre),
    minimumHash,
    "Eyni şifrə hər dəfə fərqli duzla hash-lənməlidir."
  );

  assert.throws(
    () => sifreHashYarat("a".repeat(SIFRE_MINIMUM_UZUNLUQ - 1)),
    /8-64/
  );
  assert.throws(
    () => sifreHashYarat(uzunSifre),
    /8-64/
  );

  const baglamaNeticesi = await hesabYaratVeBagla(
    "oyuncu_uzun_sifre",
    "uzun@example.com",
    uzunSifre
  );
  assert.strictEqual(baglamaNeticesi.success, false);
  assert.match(baglamaNeticesi.message, /8-64/);

  const resetNeticesi = await yeniSifreTeyinEt(
    "x".repeat(64),
    uzunSifre
  );
  assert.strictEqual(resetNeticesi.success, false);
  assert.match(resetNeticesi.message, /8-64/);

  console.log(
    "[HESAB_SIFRE_QAYDALARI_TEST] 8-64 simvol sərhədi bütün yeni şifrə axınlarında qorunur."
  );
})().catch(xeta => {
  console.error("[HESAB_SIFRE_QAYDALARI_TEST] Uğursuz:", xeta);
  process.exitCode = 1;
});
