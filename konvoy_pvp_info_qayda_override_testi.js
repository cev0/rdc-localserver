"use strict";

const assert = require("assert");
const {
  PVP_BAZA_STATUSLARI
} = require("./pvp_baza_hedef_qaydasi");

// Override handler-dan əvvəl serverdə necə yüklənirsə testdə də əvvəl yüklənir.
require("./konvoy_pvp_info_qayda_override");

const {
  emeliyyatMelumatiniHazirla
} = require("./konvoy_emeliyyat_sistemi");

(function testleriIcraEt() {
  const state = {
    konvoyEmeliyyatlari: {
      version: 3,
      activeByConvoy: {
        konvoy_1: {
          convoyId: "konvoy_1",
          targetType: "player_base",
          targetId: "oyuncu_b",
          status: PVP_BAZA_STATUSLARI.YOLDA,
          startedAtMs: 1000,
          arrivalAtMs: 5000,
          actionEndsAtMs: 0,
          returnEndsAtMs: 0
        },
        konvoy_2: {
          convoyId: "konvoy_2",
          targetType: "enemy",
          targetId: "state_1_enemy_1",
          status: "marching",
          startedAtMs: 1000,
          arrivalAtMs: 4000,
          actionEndsAtMs: 0,
          returnEndsAtMs: 0
        },
        konvoy_3: {
          convoyId: "konvoy_3",
          targetType: "player_base",
          targetId: "oyuncu_c",
          status: PVP_BAZA_STATUSLARI.DOYUSE_HAZIR,
          arrivalAtMs: 1500,
          actionEndsAtMs: 0,
          returnEndsAtMs: 0
        },
        konvoy_4: {
          convoyId: "konvoy_4",
          targetType: "enemy",
          targetId: "state_1_enemy_2",
          status: "returning",
          returnEndsAtMs: 6000,
          actionEndsAtMs: 0
        }
      },
      history: []
    }
  };

  const info = emeliyyatMelumatiniHazirla(state, 2000);
  const byId = new Map(
    info.active.map(item => [item.convoyId, item])
  );

  assert.strictEqual(
    byId.get("konvoy_1").remainingMs,
    3000,
    "PvP yürüşü arrivalAtMs əsasında qalan vaxt verməlidir."
  );

  assert.strictEqual(
    byId.get("konvoy_2").remainingMs,
    2000,
    "Normal marching davranışı dəyişməməlidir."
  );

  assert.strictEqual(
    byId.get("konvoy_3").remainingMs,
    0,
    "Döyüşə hazır PvP statusunda yürüş vaxtı qalmamalıdır."
  );

  assert.strictEqual(
    byId.get("konvoy_4").remainingMs,
    4000,
    "Normal returning davranışı dəyişməməlidir."
  );

  console.log("[KONVOY_PVP_INFO_QAYDA_OVERRIDE_TEST] OK");
})();
