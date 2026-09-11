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
  }).success, true, "A nearby resource outside the destination footprint is allowed");

  // Independent cell-set oracle: touching sides/corners are legal, sharing a cell is not.
  const cells = (x, y, width) => new Set(Array.from({ length: width * width }, (_, i) =>
    `${x + i % width}:${y + Math.floor(i / width)}`));
  for (const width of [1, 2]) {
    const occupied = cells(300, 400, width);
    for (let dx = -4; dx <= 4; dx++) for (let dy = -4; dy <= 4; dy++) {
      const blocked = [...cells(300 + dx, 400 + dy, 2)].some(cell => occupied.has(cell));
      const args = { playerId: "oyuncu_1", x: 300 + dx, y: 400 + dy, cariX: 100, cariY: 100 };
      if (width === 1) args.resources = [{ x: 300, y: 400 }];
      else args.bases = [{ playerId: "oyuncu_2", x: 300, y: 400 }];
      assert.strictEqual(teleportYeriYoxla(args).success, width === 1 || !blocked,
        `2x2 destination vs ${width}x${width}: ${dx}:${dy}`);
    }
  }
  for (const [x, y] of [[301,400],[300,401],[302,400],[300,402]]) {
    assert.strictEqual(teleportYeriYoxla({ playerId: "oyuncu_1", x, y, cariX: 300, cariY: 400,
      bases: [{ playerId: "oyuncu_1", x: 300, y: 400 }] }).success, true,
      "Own old footprint is vacated during a move");
  }
  assert.strictEqual(teleportYeriYoxla({ playerId: "oyuncu_1", x: 300, y: 400, cariX: 300, cariY: 400 })
    .errorCode, "WORLDV2_TELEPORT_ALREADY_THERE");
  for (const [x, y] of [[300,400],[301,400],[300,401],[301,401]]) {
    assert.strictEqual(teleportYeriYoxla({ playerId: "oyuncu_1", x:300, y:400, cariX:100, cariY:100,
      resources:[{x,y}] }).success, true, "Resources in every destination cell may be cleared on commit");
  }
  assert.strictEqual(teleportYeriYoxla({ x:0, y:400 }).errorCode,"WORLDV2_TELEPORT_BORDER_BLOCKED");
  assert.strictEqual(teleportYeriYoxla({ x:300.5, y:400 }).errorCode,"WORLDV2_TELEPORT_COORDINATE_INVALID");

  const state = {
    playerId: "oyuncu_1",
    worldPlacement: { stateId: 1, baseX: 100, baseZ: 100 },
  };
  const gonderilenler = [];
  const sqlSorqulari = [];
  const temizlenenStateIdleri = [];
  let busyBases = [], busyResources = [];

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
    bazalariKilidliAl: async (_client, stateId) => ({ stateId, bases: busyBases }),
    resurslariSilClient: async () => ({ removedResourceTargetIds: [] }),
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

  busyBases = [{ playerId:"oyuncu_2", x:304, y:400 }];
  busyResources = [{ x:301, y:400 }];
  gonderilenler.length = 0;
  await handler(kontekst("state_map_v2_base_teleport_request", {stateId:1,x:302,y:400}));
  assert.strictEqual(gonderilenler[0].success,true,"Adjacent base and resource are accepted through the transaction handler");
  assert.strictEqual(state.worldPlacement.baseX,302);

  for (const [x,y,errorCode] of [[303,400,"WORLDV2_TELEPORT_BASE_OCCUPIED"]]) {
    const before = JSON.stringify(state);
    gonderilenler.length = 0;
    await handler(kontekst("state_map_v2_base_teleport_request", {stateId:1,x,y}));
    assert.strictEqual(gonderilenler[0].errorCode,errorCode,"Server checks current occupied cells even if client saw free space");
    assert.strictEqual(JSON.stringify(state),before,"Rejected placement does not mutate state");
  }

  gonderilenler.length = 0;
  await handler(kontekst(
    "state_map_v2_base_teleport_request",
    { stateId: 2, x: 350, y: 450 },
  ));
  assert.strictEqual(gonderilenler[0].success, false);
  assert.strictEqual(gonderilenler[0].errorCode, "WORLDV2_TELEPORT_STATE_MISMATCH");
  assert.strictEqual(state.worldPlacement.baseX, 302);

  // Ekranda Dövlət 2 read-only göstərilsə belə request Ev Dövlət ID-si ilə gəlsə,
  // server artıq koordinatı Ev Dövlət bazasına tətbiq etməməlidir.
  const xariciBaxisWs = {
    _authedPlayerId: "oyuncu_1",
    _worldV2ViewedStateId: 2,
    _worldV2ViewingHomeState: false,
  };
  const xariciBaxisdenEvvel = JSON.stringify(state.worldPlacement);
  gonderilenler.length = 0;
  await handler(kontekst(
    "state_map_v2_base_teleport_request",
    { stateId: 1, x: 355, y: 455 },
    xariciBaxisWs,
  ));
  assert.strictEqual(gonderilenler[0].success, false);
  assert.strictEqual(gonderilenler[0].errorCode, "WORLDV2_TELEPORT_READ_ONLY_VIEW");
  assert.strictEqual(JSON.stringify(state.worldPlacement), xariciBaxisdenEvvel,
    "Foreign read-only view must never mutate home placement");

  // Ev Dövlətinə qayıdış markerindən sonra teleport yenidən mümkündür.
  const evBaxisWs = {
    _authedPlayerId: "oyuncu_1",
    _worldV2ViewedStateId: 1,
    _worldV2ViewingHomeState: true,
  };
  busyBases = [];
  gonderilenler.length = 0;
  await handler(kontekst(
    "state_map_v2_base_teleport_request",
    { stateId: 1, x: 356, y: 456 },
    evBaxisWs,
  ));
  assert.strictEqual(gonderilenler[0].success, true);
  assert.strictEqual(state.worldPlacement.baseX, 356);
  assert.strictEqual(state.worldPlacement.baseZ, 456);

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