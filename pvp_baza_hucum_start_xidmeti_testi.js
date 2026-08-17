"use strict";

const assert = require("assert");
const {
  PVP_HUCUM_START_EMELIYYAT_TIPI,
  pvpBazaHucumStartMutasiyasiniIcraEt
} = require("./pvp_baza_hucum_start_xidmeti");
const {
  qosunGucunuHesabla
} = require("./qosun_doyus_stat_sistemi");

function stateHazirla() {
  return {
    playerId: "oyuncu_a",
    worldPlacement: {
      stateId: 1,
      baseX: 0,
      baseZ: 0
    },
    army: {
      troops: {
        fighter_lv1: 20
      }
    },
    heroes: [
      { heroId: "hero_1" }
    ],
    konvoylar: {
      items: [
        {
          konvoyId: "konvoy_1",
          aciqdir: true,
          qehremanIdleri: ["hero_1"],
          qosunlar: {
            fighter_lv1: 10
          },
          formasiya: {
            version: 1,
            siralar: [
              {
                siraId: "sira_1",
                unitId: "fighter_lv1",
                count: 10
              },
              {
                siraId: "sira_2",
                unitId: "",
                count: 0
              },
              {
                siraId: "sira_3",
                unitId: "",
                count: 0
              }
            ]
          }
        }
      ]
    }
  };
}

function hedefBazaHazirla(playerId = "oyuncu_b", stateId = 1) {
  return {
    playerId,
    stateId,
    x: 3,
    z: 4,
    baseX: 3,
    baseZ: 4,
    hqLevel: 2
  };
}

const fakeClient = {
  async query() {
    throw new Error("Bu testdə injected hədəf loader istifadə olunmalıdır.");
  }
};

(async function testleriIcraEt() {
  const evvelkiHereketEnv = process.env.KONVOY_HEREKET_MS_XANA;
  process.env.KONVOY_HEREKET_MS_XANA = "1000";

  try {
    assert.strictEqual(
      PVP_HUCUM_START_EMELIYYAT_TIPI,
      "pvp_baza_hucum_baslat"
    );

    {
      const state = stateHazirla();
      let loaderCagirildi = 0;

      const netice = await pvpBazaHucumStartMutasiyasiniIcraEt(
        state,
        "oyuncu_a",
        {
          convoyId: "konvoy_1",
          targetPlayerId: "oyuncu_b"
        },
        fakeClient,
        1000,
        {
          hedefBazaAl: async () => {
            loaderCagirildi++;
            return hedefBazaHazirla();
          }
        }
      );

      assert.strictEqual(netice.success, false);
      assert.strictEqual(netice.deyisdi, false);
      assert.strictEqual(netice.requestId, "");
      assert.strictEqual(loaderCagirildi, 0);
      assert.ok(!state.konvoyEmeliyyatlari);
    }

    {
      const state = stateHazirla();
      let loaderCagirildi = 0;

      const mesaj = {
        requestId: "REQ-001",
        convoyId: "KONVOY_1",
        targetPlayerId: "OYUNCU_B"
      };

      const netice = await pvpBazaHucumStartMutasiyasiniIcraEt(
        state,
        "OYUNCU_A",
        mesaj,
        fakeClient,
        1000,
        {
          hedefBazaAl: async (client, stateId, targetPlayerId) => {
            assert.strictEqual(client, fakeClient);
            assert.strictEqual(stateId, 1);
            assert.strictEqual(targetPlayerId, "oyuncu_b");
            loaderCagirildi++;
            return hedefBazaHazirla();
          }
        }
      );

      assert.strictEqual(netice.success, true);
      assert.strictEqual(netice.deyisdi, true);
      assert.strictEqual(netice.requestId, "req-001");
      assert.strictEqual(netice.idempotentReplay, false);
      assert.strictEqual(loaderCagirildi, 1);
      assert.ok(netice.operation);
      assert.strictEqual(netice.operation.convoyId, "konvoy_1");
      assert.strictEqual(netice.operation.targetPlayerId, "oyuncu_b");
      assert.strictEqual(netice.operation.targetX, 3);
      assert.strictEqual(netice.operation.targetZ, 4);
      assert.strictEqual(netice.operation.startedAtMs, 1000);
      assert.strictEqual(netice.operation.travelDurationMs, 5000);
      assert.strictEqual(netice.operation.arrivalAtMs, 6000);
      assert.strictEqual(netice.operation.status, "marching_to_player_base");
      assert.strictEqual(netice.operation.attackerCombatSnapshot.troopCount, 10);
      assert.strictEqual(
        netice.operation.attackerCombatSnapshot.troopPower,
        qosunGucunuHesabla({ fighter_lv1: 10 })
      );

      assert.ok(state.konvoyEmeliyyatlari);
      assert.ok(state.konvoyEmeliyyatlari.activeByConvoy.konvoy_1);
      assert.ok(state.serverSorquIdempotentliyi);
      assert.strictEqual(state.serverSorquIdempotentliyi.items.length, 1);

      const replay = await pvpBazaHucumStartMutasiyasiniIcraEt(
        state,
        "oyuncu_a",
        mesaj,
        fakeClient,
        2000,
        {
          hedefBazaAl: async () => {
            loaderCagirildi++;
            throw new Error("Replay zamanı fresh target query edilməməlidir.");
          }
        }
      );

      assert.strictEqual(replay.success, true);
      assert.strictEqual(replay.deyisdi, false);
      assert.strictEqual(replay.idempotentReplay, true);
      assert.strictEqual(loaderCagirildi, 1);
      assert.strictEqual(
        replay.operation.operationId,
        netice.operation.operationId
      );

      const conflict = await pvpBazaHucumStartMutasiyasiniIcraEt(
        state,
        "oyuncu_a",
        {
          requestId: "req-001",
          convoyId: "konvoy_1",
          targetPlayerId: "oyuncu_c"
        },
        fakeClient,
        3000,
        {
          hedefBazaAl: async () => {
            throw new Error("Conflict zamanı target query edilməməlidir.");
          }
        }
      );

      assert.strictEqual(conflict.success, false);
      assert.strictEqual(conflict.deyisdi, false);
      assert.strictEqual(conflict.idempotentReplay, false);
      assert.ok(conflict.message.includes("requestId"));
    }

    {
      const state = stateHazirla();
      state.konvoyEmeliyyatlari = {
        version: 3,
        activeByConvoy: {
          konvoy_1: {
            convoyId: "konvoy_1",
            status: "marching"
          }
        },
        history: []
      };
      let loaderCagirildi = 0;

      const netice = await pvpBazaHucumStartMutasiyasiniIcraEt(
        state,
        "oyuncu_a",
        {
          requestId: "req-busy",
          convoyId: "konvoy_1",
          targetPlayerId: "oyuncu_b"
        },
        fakeClient,
        1000,
        {
          hedefBazaAl: async () => {
            loaderCagirildi++;
            return hedefBazaHazirla();
          }
        }
      );

      assert.strictEqual(netice.success, false);
      assert.strictEqual(netice.blocker, "convoy_busy");
      assert.strictEqual(loaderCagirildi, 0);
    }

    {
      const state = stateHazirla();
      let loaderCagirildi = 0;

      const netice = await pvpBazaHucumStartMutasiyasiniIcraEt(
        state,
        "oyuncu_a",
        {
          requestId: "req-target-missing",
          convoyId: "konvoy_1",
          targetPlayerId: "oyuncu_yoxdur"
        },
        fakeClient,
        1000,
        {
          hedefBazaAl: async () => {
            loaderCagirildi++;
            return null;
          }
        }
      );

      assert.strictEqual(netice.success, false);
      assert.strictEqual(netice.deyisdi, false);
      assert.strictEqual(loaderCagirildi, 1);
      assert.ok(!state.konvoyEmeliyyatlari.activeByConvoy.konvoy_1);
    }

    {
      const state = stateHazirla();

      const netice = await pvpBazaHucumStartMutasiyasiniIcraEt(
        state,
        "oyuncu_a",
        {
          requestId: "req-self",
          convoyId: "konvoy_1",
          targetPlayerId: "oyuncu_a"
        },
        fakeClient,
        1000,
        {
          hedefBazaAl: async () => hedefBazaHazirla("oyuncu_a", 1)
        }
      );

      assert.strictEqual(netice.success, false);
      assert.strictEqual(netice.deyisdi, false);
      assert.ok(netice.message.includes("öz bazasına"));
      assert.ok(!state.konvoyEmeliyyatlari.activeByConvoy.konvoy_1);
    }

    console.log("[PVP_BAZA_HUCUM_START_XIDMETI_TEST] OK");
  }
  finally {
    if (evvelkiHereketEnv == null) {
      delete process.env.KONVOY_HEREKET_MS_XANA;
    }
    else {
      process.env.KONVOY_HEREKET_MS_XANA = evvelkiHereketEnv;
    }
  }
})().catch(xeta => {
  console.error("[PVP_BAZA_HUCUM_START_XIDMETI_TEST] XETA", xeta);
  process.exitCode = 1;
});
