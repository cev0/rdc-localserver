"use strict";

const assert = require("assert");
const {
  dovletBazasiniBirbasaAlClient
} = require("./dovlet_baza_kataloqu_postgres");

function fakeClientHazirla(rows) {
  const sorqular = [];

  return {
    sorqular,
    client: {
      async query(sql, parametrler = []) {
        const temizSql = String(sql || "").replace(/\s+/g, " ").trim();
        sorqular.push({ sql: temizSql, parametrler });
        return {
          rows: JSON.parse(JSON.stringify(rows || []))
        };
      }
    }
  };
}

function snapshotRow(playerId, stateId, x, z) {
  return {
    oyuncu_id: playerId,
    detallar: {
      version: 1,
      state: {
        playerId,
        oyuncuAdi: "Komandir A",
        ittifaqAdi: "İttifaq A",
        worldPlacement: {
          stateId,
          baseX: x,
          baseZ: z
        },
        buildings: [
          {
            buildingId: "hq",
            level: 4,
            isCompleted: true
          },
          {
            buildingId: "house",
            level: 2,
            isCompleted: true
          },
          {
            buildingId: "road",
            level: 1,
            isCompleted: true
          }
        ],
        gucMelumatlari: {
          umumiGuc: 12345
        }
      }
    }
  };
}

(async function testleriIcraEt() {
  {
    const fake = fakeClientHazirla([
      snapshotRow("oyuncu_b", 1, 120, 140)
    ]);

    const baza = await dovletBazasiniBirbasaAlClient(
      fake.client,
      1,
      "OYUNCU_B"
    );

    assert.ok(baza);
    assert.strictEqual(baza.playerId, "oyuncu_b");
    assert.strictEqual(baza.stateId, 1);
    assert.strictEqual(baza.baseX, 120);
    assert.strictEqual(baza.baseZ, 140);
    assert.strictEqual(baza.x, 120);
    assert.strictEqual(baza.z, 140);
    assert.strictEqual(baza.hqLevel, 4);
    assert.strictEqual(baza.completedBuildingCount, 2);
    assert.strictEqual(baza.publicPower, 12345);
    assert.strictEqual(baza.commanderName, "Komandir A");
    assert.strictEqual(baza.allianceName, "İttifaq A");

    assert.strictEqual(fake.sorqular.length, 1);
    assert.ok(fake.sorqular[0].sql.includes("ORDER BY id DESC LIMIT 1"));
    assert.ok(!fake.sorqular[0].sql.includes("worldPlacement,stateId"));
    assert.deepStrictEqual(
      fake.sorqular[0].parametrler,
      ["oyuncu_b", "oyun_state_snapshot_v1"]
    );
  }

  {
    // Oyunçunun ən son snapshot-u artıq başqa Dövlətdədirsə, köhnə Dövlətə
    // aid əvvəlki snapshot axtarılmır və hədəf baza null qaytarılır.
    const fake = fakeClientHazirla([
      snapshotRow("oyuncu_b", 2, 300, 320)
    ]);

    const baza = await dovletBazasiniBirbasaAlClient(
      fake.client,
      1,
      "oyuncu_b"
    );

    assert.strictEqual(baza, null);
    assert.strictEqual(fake.sorqular.length, 1);
  }

  {
    const fake = fakeClientHazirla([]);

    const baza = await dovletBazasiniBirbasaAlClient(
      fake.client,
      1,
      "oyuncu_yoxdur"
    );

    assert.strictEqual(baza, null);
  }

  {
    const baza = await dovletBazasiniBirbasaAlClient(
      null,
      1,
      "oyuncu_b"
    );

    assert.strictEqual(baza, null);
  }

  console.log("[DOVLET_BAZA_BIRBASA_POSTGRES_TEST] OK");
})().catch(xeta => {
  console.error("[DOVLET_BAZA_BIRBASA_POSTGRES_TEST] XETA", xeta);
  process.exitCode = 1;
});
