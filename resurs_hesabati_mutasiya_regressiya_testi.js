"use strict";

const assert = require("assert");

const {
  resursHesabatiYarat,
  resursHesabatiTap,
  resursHesabatiniOxunmusEt,
  resursHesabatiniFavoritEt,
  resursHesabatiniSil
} = require("./resurs_hesabati_sistemi");

const {
  resursHesabatiMutasiyasiniTetbiqEt
} = require("./resurs_hesabatlari");

function yeniState() {
  return {
    resursHesabatlari: {
      version: 1,
      items: []
    }
  };
}

function hesabatYarat(state, id, nowMs = 1000) {
  return resursHesabatiYarat(
    state,
    {
      hesabatId: id,
      menbeMukafatId: `mukafat_${id}`,
      resursNovu: "iron",
      miqdar: 250,
      toplamaYeriAdi: "Test yatağı",
      toplamaYeriSeviyesi: 3,
      koordinatX: 12,
      koordinatY: 18,
      yaradildiMs: nowMs
    },
    nowMs
  );
}

function testOxunmaIdempotentdir() {
  const state = yeniState();
  hesabatYarat(state, "h1", 1000);

  const ilk = resursHesabatiniOxunmusEt(state, "h1", 2000);
  assert.strictEqual(ilk.success, true);
  assert.strictEqual(ilk.hesabat.oxunub, true);
  assert.strictEqual(ilk.hesabat.oxunmaVaxtiMs, 2000);

  const ikinci = resursHesabatiniOxunmusEt(state, "h1", 9000);
  assert.strictEqual(ikinci.success, true);
  assert.strictEqual(ikinci.hesabat.oxunmaVaxtiMs, 2000,
    "Təkrar oxuma ilk oxunma vaxtını dəyişməməlidir.");
}

function testFavoritHesabatBirbasaSilinmir() {
  const state = yeniState();
  hesabatYarat(state, "h2", 1000);

  const favorit = resursHesabatiniFavoritEt(state, "h2", true, 3000);
  assert.strictEqual(favorit.success, true);
  assert.strictEqual(favorit.hesabat.favoritdir, true);

  const evvel = JSON.stringify(state.resursHesabatlari);
  const sil = resursHesabatiniSil(state, "h2");

  assert.strictEqual(sil.success, false);
  assert.strictEqual(sil.favoritdir, true);
  assert.strictEqual(JSON.stringify(state.resursHesabatlari), evvel,
    "Bloklanmış silmə state-i dəyişməməlidir.");
  assert.ok(resursHesabatiTap(state, "h2"));
}

function testFavoritdenCixarSonraSilinir() {
  const state = yeniState();
  hesabatYarat(state, "h3", 1000);

  assert.strictEqual(
    resursHesabatiniFavoritEt(state, "h3", true, 3000).success,
    true
  );
  assert.strictEqual(
    resursHesabatiniFavoritEt(state, "h3", false, 4000).success,
    true
  );

  const sil = resursHesabatiniSil(state, "h3");
  assert.strictEqual(sil.success, true);
  assert.strictEqual(sil.hesabatId, "h3");
  assert.strictEqual(resursHesabatiTap(state, "h3"), null);
}

function testWrapperUgursuzMutasiyaniRollbackEdir() {
  const state = yeniState();
  hesabatYarat(state, "h4", 1000);

  const evvel = JSON.stringify(state.resursHesabatlari);
  const netice = resursHesabatiMutasiyasiniTetbiqEt(
    state,
    "resurs_hesabati_sil_request",
    { hesabatId: "olmayan_hesabat" },
    5000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.strictEqual(JSON.stringify(state.resursHesabatlari), evvel,
    "Uğursuz mutation state-i əvvəlki vəziyyətə qaytarmalıdır.");
}

function testWrapperFavoritSilmeniRollbackEdir() {
  const state = yeniState();
  hesabatYarat(state, "h5", 1000);
  resursHesabatiniFavoritEt(state, "h5", true, 3000);

  const evvel = JSON.stringify(state.resursHesabatlari);
  const netice = resursHesabatiMutasiyasiniTetbiqEt(
    state,
    "resurs_hesabati_sil_request",
    { hesabatId: "h5" },
    5000
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.strictEqual(JSON.stringify(state.resursHesabatlari), evvel);
  assert.strictEqual(resursHesabatiTap(state, "h5").favoritdir, true);
}

function testWrapperOxuVeFavoritDeyisikliyiQeydEdir() {
  const state = yeniState();
  hesabatYarat(state, "h6", 1000);

  const oxu = resursHesabatiMutasiyasiniTetbiqEt(
    state,
    "resurs_hesabati_oxu_request",
    { hesabatId: "h6" },
    6000
  );
  assert.strictEqual(oxu.success, true);
  assert.strictEqual(oxu.deyisdi, true);
  assert.strictEqual(resursHesabatiTap(state, "h6").oxunub, true);

  const favorit = resursHesabatiMutasiyasiniTetbiqEt(
    state,
    "resurs_hesabati_favorit_request",
    { hesabatId: "h6", favoritdir: true },
    7000
  );
  assert.strictEqual(favorit.success, true);
  assert.strictEqual(favorit.deyisdi, true);
  assert.strictEqual(resursHesabatiTap(state, "h6").favoritdir, true);
}

function run() {
  testOxunmaIdempotentdir();
  testFavoritHesabatBirbasaSilinmir();
  testFavoritdenCixarSonraSilinir();
  testWrapperUgursuzMutasiyaniRollbackEdir();
  testWrapperFavoritSilmeniRollbackEdir();
  testWrapperOxuVeFavoritDeyisikliyiQeydEdir();

  console.log("[RESURS_HESABATI_TEST] Bütün mutation regressiya testləri keçdi.");
}

run();
