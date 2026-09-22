"use strict";

/*
 * Last Shelter Survival 1.250.102 yeni hesab giriş cavabından
 * təsdiqlənmiş başlanğıc resursları.
 *
 * Original cavabdakı adlar burada olduğu kimi saxlanılır.
 */
const LAST_SHELTER_BASLANGIC_RESURSLARI = Object.freeze({
  chip: 0,
  electricity: 500,
  water: 700,
  food: 1000,
  stone: 1500,
  diamond: 0,
  money: 1200,
  iron: 800,
  silver: 500,
  wood: 1500
});

function lastShelterServerBaslangicResurslariniAl() {
  return {
    food: LAST_SHELTER_BASLANGIC_RESURSLARI.food,
    water: LAST_SHELTER_BASLANGIC_RESURSLARI.water,
    wood: LAST_SHELTER_BASLANGIC_RESURSLARI.wood,
    stone: LAST_SHELTER_BASLANGIC_RESURSLARI.stone,
    iron: LAST_SHELTER_BASLANGIC_RESURSLARI.iron,
    silver: LAST_SHELTER_BASLANGIC_RESURSLARI.silver,

    // Mövcud server kodunun keçid dövrü üçün saxlanan sahələr.
    // Last Shelter yeni hesab cavabında fuel ayrıca gəlmir.
    fuel: 0,

    electricity:
      LAST_SHELTER_BASLANGIC_RESURSLARI.electricity,
    money: LAST_SHELTER_BASLANGIC_RESURSLARI.money,

    // Mövcud kod "chips" adından istifadə edir; dəyər original
    // "chip" sahəsindən götürülür.
    chips: LAST_SHELTER_BASLANGIC_RESURSLARI.chip,

    diamond: LAST_SHELTER_BASLANGIC_RESURSLARI.diamond
  };
}

module.exports = {
  LAST_SHELTER_BASLANGIC_RESURSLARI,
  lastShelterServerBaslangicResurslariniAl
};
