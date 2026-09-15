"use strict";

const assert = require("assert");
const {
  konvoyEmeliyyatMutasiyasiniTetbiqEt
} = require("./konvoy_emeliyyat_handler");
const {
  tekrarNeticesiniTap,
  ugurluNeticeniQeydEt
} = require("./server_sorqu_idempotentliyi");

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function stateHazirla() {
  const returning = {
    operationId: "op_recall_1",
    convoyId: "konvoy_1",
    playerId: "oyuncu_a",
    targetType: "resource",
    targetId: "legacy_resource_1",
    stateId: 1,
    fromX: 10,
    fromZ: 10,
    targetX: 20,
    targetZ: 20,
    startedAtMs: 500,
    arrivalAtMs: 900,
    actionEndsAtMs: 0,
    returnStartedAtMs: 1000,
    returnEndsAtMs: 2000,
    travelDurationMs: 1000,
    plannedActionDurationMs: 0,
    plannedActionEndsAtMs: 0,
    plannedReturnEndsAtMs: 2000,
    movementMsPerMapUnit: 100,
    movementSource: "test",
    status: "returning",
    reportId: "",
    gatherRewardId: "",
    failureReason: "",
    lightWoundedFormation: []
  };

  return {
    playerId: "oyuncu_a",
    worldPlacement: {
      stateId: 1,
      baseX: 10,
      baseZ: 10
    },
    buildings: [],
    heroes: [],
    konvoylar: {
      items: [
        {
          konvoyId: "konvoy_1",
          qehremanIdleri: [],
          qosunlar: {},
          formasiya: { version: 2, siralar: [] }
        }
      ]
    },
    konvoyEmeliyyatlari: {
      version: 3,
      activeByConvoy: {
        konvoy_1: kopyala(returning)
      },
      history: []
    },
    serverSorquIdempotentliyi: {
      version: 1,
      items: []
    },
    army: { troops: {} },
    resources: {}
  };
}

function fakeClientHazirla() {
  let runtime = {
    version: 2,
    stateId: 1,
    items: {},
    nodes: {}
  };

  return {
    async query(sql, parametrler = []) {
      const temizSql = String(sql || "").replace(/\s+/g, " ").trim();

      if (temizSql.startsWith("SELECT pg_advisory_xact_lock")) {
        return { rows: [{ pg_advisory_xact_lock: null }] };
      }

      if (temizSql.startsWith("SELECT detallar")) {
        return {
          rows: [{ detallar: { version: 2, runtime: kopyala(runtime) } }]
        };
      }

      if (temizSql.startsWith("INSERT INTO hesab_audit_jurnali")) {
        const detallar = JSON.parse(parametrler[2]);
        runtime = kopyala(detallar.runtime);
        return { rowCount: 1, rows: [] };
      }

      return { rowCount: 0, rows: [] };
    }
  };
}

(async function testiIcraEt() {
  const state = stateHazirla();
  const payload = { convoyId: "konvoy_1" };
  const staleOperation = kopyala(state.konvoyEmeliyyatlari.activeByConvoy.konvoy_1);
  const staleInfo = {
    version: 3,
    active: [kopyala(staleOperation)],
    history: []
  };

  ugurluNeticeniQeydEt(
    state,
    "konvoy_emeliyyat_geri_cagir",
    "REQ-RECALL-001",
    payload,
    {
      operation: staleOperation,
      info: staleInfo,
      message: "Konvoy bazaya geri çağırıldı."
    },
    1500
  );

  const saxlanmis = tekrarNeticesiniTap(
    state,
    "konvoy_emeliyyat_geri_cagir",
    "req-recall-001",
    payload
  );

  assert.strictEqual(saxlanmis.replay, true);
  assert.ok(saxlanmis.result);
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(saxlanmis.result, "info"),
    false,
    "Recall idempotency dinamik konvoy info snapshot-ını saxlamamalıdır."
  );

  const netice = await konvoyEmeliyyatMutasiyasiniTetbiqEt(
    state,
    "oyuncu_a",
    "convoy_operation_recall_request",
    {
      requestId: "req-recall-001",
      convoyId: "konvoy_1"
    },
    3000,
    fakeClientHazirla()
  );

  assert.strictEqual(netice.success, true);
  assert.strictEqual(netice.idempotentReplay, true);
  assert.ok(netice.info);
  assert.ok(Array.isArray(netice.info.active));
  assert.strictEqual(
    netice.info.active.some(x => x && x.convoyId === "konvoy_1"),
    false,
    "Geri dönüş vaxtı bitəndən sonra replay köhnə returning vəziyyətini qaytarmamalıdır."
  );
  assert.strictEqual(
    state.konvoyEmeliyyatlari.activeByConvoy.konvoy_1,
    undefined,
    "Server authoritative yeniləmə bazaya çatmış konvoyu active siyahıdan çıxarmalıdır."
  );

  console.log("[KONVOY_GERI_CAGIR_IDEMPOTENT_REPLAY_TEST] OK");
})().catch(xeta => {
  console.error("[KONVOY_GERI_CAGIR_IDEMPOTENT_REPLAY_TEST] XETA", xeta);
  process.exitCode = 1;
});
