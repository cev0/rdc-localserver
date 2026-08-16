"use strict";

const assert = require("assert");

function envYedeyi(adlar) {
  const yedek = {};
  for (const ad of adlar) yedek[ad] = process.env[ad];
  return () => {
    for (const [ad, deyer] of Object.entries(yedek)) {
      if (deyer == null) delete process.env[ad];
      else process.env[ad] = deyer;
    }
  };
}

const adlar = [
  "KONVOY_BINASI_IDLERI",
  "KONVOY_BINASI_TUTUM_CEDVELI",
  "KONVOY_HERO_LEVEL_TUTUM_CEDVELI",
  "KONVOY_HERO_LEVEL_TUTUM_BONUSU",
  "KONVOY_SKILL1_TUTUM_CEDVELI",
  "KONVOY_SKILL6_LIDERLIK_FAIZ_CEDVELI"
];

const berpaEt = envYedeyi(adlar);

try {
  process.env.KONVOY_BINASI_IDLERI = "convoy_hq";
  process.env.KONVOY_BINASI_TUTUM_CEDVELI = JSON.stringify([5000, 7000, 9000]);
  process.env.KONVOY_HERO_LEVEL_TUTUM_CEDVELI = JSON.stringify([0, 100, 200, 300, 400]);
  delete process.env.KONVOY_HERO_LEVEL_TUTUM_BONUSU;
  process.env.KONVOY_SKILL1_TUTUM_CEDVELI = JSON.stringify([
    200, 500, 1000, 2000, 3500, 5500, 8000, 11000, 15000, 19500
  ]);
  process.env.KONVOY_SKILL6_LIDERLIK_FAIZ_CEDVELI = JSON.stringify([
    25, 50, 75, 100, 125, 150, 175, 200, 225, 250
  ]);

  delete require.cache[require.resolve("./konvoy_tutum_formulu")];
  const { konvoyTutumHesabiniAl } = require("./konvoy_tutum_formulu");

  const state = {
    buildings: [
      { buildingId: "convoy_hq", level: 2, isCompleted: true }
    ],
    heroes: [
      {
        heroId: "hero_a",
        level: 5,
        skills: [
          { slotIndex: 1, isUnlocked: true, skillLevel: 10 },
          { slotIndex: 6, isUnlocked: true, skillLevel: 1 }
        ]
      },
      {
        heroId: "hero_b",
        level: 3,
        skills: [
          { slotIndex: 1, isUnlocked: true, skillLevel: 2 },
          { slotIndex: 6, isUnlocked: false, skillLevel: 10 }
        ]
      }
    ],
    konvoylar: {
      items: [
        { konvoyId: "konvoy_1", qehremanIdleri: ["hero_a", "hero_b"] }
      ]
    }
  };

  const netice = konvoyTutumHesabiniAl(state, "konvoy_1");
  assert.strictEqual(netice.formulaVersion, 3);
  assert.strictEqual(netice.formulaConfigured, true);
  assert.strictEqual(netice.formulaActive, true);
  assert.strictEqual(netice.esasBinaTutumu, 7000);
  assert.strictEqual(netice.qehremanLevelBonusu, 600);
  assert.strictEqual(netice.skill1EsasBonusu, 20000);
  assert.strictEqual(netice.skill6LiderlikBonusu, 4875);
  assert.strictEqual(netice.yekunTutum, 32475);
  assert.strictEqual(netice.qehremanlar[0].skill6LiderlikFaizi, 25);
  assert.strictEqual(netice.qehremanlar[0].skill6LiderlikBonusu, 4875);
  assert.strictEqual(netice.qehremanlar[1].skill6LiderlikBonusu, 0);

  delete process.env.KONVOY_SKILL6_LIDERLIK_FAIZ_CEDVELI;
  const fallback = konvoyTutumHesabiniAl(state, "konvoy_1");
  assert.strictEqual(fallback.formulaConfigured, false);
  assert.strictEqual(fallback.formulaActive, false);
  assert.strictEqual(fallback.yekunTutum, 5000);
  assert.strictEqual(
    fallback.pendingReason,
    "convoy_building_hero_level_skill1_skill6_tables_not_configured"
  );

  console.log("konvoy_tutum_formulu_testi: OK");
}
finally {
  berpaEt();
}
