"use strict";

const assert = require("assert");
const {
  teleportYeriYoxla,
  worldV2TeleportHandleriYarat,
} = require("./dovlet_xerite_worldv2_teleport_handler");

async function run() {
  const sabitVaxt = 1770000000000;

  assert.strictEqual(teleportYeriYoxla({
    playerId: "oyuncu_1",
    x: 300,
    y: 400,
    cariX: 100,
    cariY: 100,
    bases: [],
    resources: [],
  }).success, true);

  assert.strictEqual(teleportYeriYoxla({
    playerId: "oyuncu_1",
    x: 602,
    y: 602,
    cariX: 100,
    cariY: 100,
  }).errorCode, "WORLDV2_TELEPORT_RESERVED_ZONE");

  assert.strictEqual(teleportYeriYoxla({
    playerId: "oyuncu_1",
    x: 301,
    y: 401,
    cariX: 100,
    cariY: 100,
    bases: [{ playerId: "oyuncu_2", x: 300, y: 400 }],
  }).errorCode, "WORLDV2_TELEPORT_BASE_OCCUPIED");

  assert.strictEqual(teleportYeriYoxla({
    playerId: "oyuncu_1",
    x: 302,
    y: 402,
    cariX: 100,
    cariY: 100,
    resources: [{ x: 300, y: 400 }],
  }).errorCode, "WORLDV2_TELEPORT_RESOURCE_OCCUPIED");

  const state = {
    playerId: "oyuncu_1",
    worldPlacement: { stateId: 1, baseX: 100, baseZ: 100 },
  };
  const gonderilenler = [];
  const sqlSorqulari = [];
  const temizlenenStateIdleri = [];

  const handler = worldV2TeleportHandleriYarat({
    stateBerpaOlunub: () => true,
    stateBerpaEt: async () => {},
    stateMutasiyaEt: async (_playerId, cariState, emeliyyat) => {
      return await emeliyyat(cariState, {
        client: {
          query: async (sql, params) => {
            sqlSorqulari.push({ sql, params });
            return { rows: [] };
          },
        },
      });
    },
    bazalariKilidliAl: async (_client, stateId) => ({ stateId, bases: [] }),
    resurslariAl: async (stateId) => ({ stateId, resources: [] }),
    bazaKeshiniTemizle: stateId => temizlenenStateIdleri.push(stateId),
  });

  function kontekst(type, msg = {}, ws = { _authedPlayerId: "oyuncu_1" }) {
    return {
      type,
      msg,
      ws,
      nowMs: () => sabitVaxt,
      getOrCreatePlayerState: () => state,
      updateServerTime: cariState => { cariState.serverTimeUnixMs = sabitVaxt; },
      makeClientState: cariState => JSON.parse(JSON.stringify(cariState)),
      send: (_ws, payload) => gonderilenler.push(payload),
    };
  }

  const emalOlundu = await handler(kontekst(
    "state_map_v2_base_teleport_request",
    { stateId: 1, x: 300, y: 400 },
  ));

  assert.strictEqual(emalOlundu, true);
  assert.strictEqual(state.worldPlacement.baseX, 300);
  assert.strictEqual(state.worldPlacement.baseZ, 400);
  assert.strictEqual(state.worldPlacement.lastTeleportAtMs, sabitVaxt);
  assert.ok(sqlSorqulari[0].sql.includes("pg_advisory_xact_lock"));
  assert.deepStrictEqual(temizlenenStateIdleri, [1]);
  assert.strictEqual(gonderilenler[0].type, "state_map_v2_base_teleport_result");
  assert.strictEqual(gonderilenler[0].success, true);
  assert.strictEqual(gonderilenler[1].type, "state");

  gonderilenler.length = 0;
  await handler(kontekst(
    "state_map_v2_base_teleport_request",
    { stateId: 2, x: 350, y: 450 },
  ));
  assert.strictEqual(gonderilenler[0].success, false);
  assert.strictEqual(gonderilenler[0].errorCode, "WORLDV2_TELEPORT_STATE_MISMATCH");
  assert.strictEqual(state.worldPlacement.baseX, 300);

  gonderilenler.length = 0;
  await handler(kontekst(
    "state_map_v2_base_teleport_request",
    { stateId: 1, x: 360, y: 460 },
    {},
  ));
  assert.strictEqual(gonderilenler[0].errorCode, "WORLDV2_AUTH_REQUIRED");

  const aidiyyetsiz = await handler(kontekst("state_map_v2_objects_request"));
  assert.strictEqual(aidiyyetsiz, false);

  console.log("WorldV2 server-authoritative baza teleport handler testi OK");
}

module.exports = run();
