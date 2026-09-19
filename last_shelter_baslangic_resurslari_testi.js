"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const {
  LAST_SHELTER_BASLANGIC_RESURSLARI,
  lastShelterServerBaslangicResurslariniAl
} = require("./last_shelter_baslangic_resurslari");

assert.deepStrictEqual(
  LAST_SHELTER_BASLANGIC_RESURSLARI,
  {
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
  }
);

const serverResources =
  lastShelterServerBaslangicResurslariniAl();

assert.deepStrictEqual(
  serverResources,
  {
    food: 1000,
    water: 700,
    wood: 1500,
    stone: 1500,
    iron: 800,
    silver: 500,
    fuel: 0,
    electricity: 500,
    money: 1200,
    chips: 0,
    diamond: 0
  }
);

const serverSource =
  fs.readFileSync(
    path.join(__dirname, "server.js"),
    "utf8"
  );

assert.ok(
  serverSource.includes(
    "lastShelterServerBaslangicResurslariniAl()"
  ),
  "Yeni oyunçu resursları Last Shelter başlanğıc kataloqundan gəlməlidir."
);

console.log(
  "[LAST_SHELTER_BASLANGIC_RESURSLARI_TESTI] OK"
);
