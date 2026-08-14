"use strict";

const assert = require("assert");
const {
  OYUNCU_STATE_KILID_ADI,
  catismayanDefaultlariElaveEt,
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

function fakeHovuzHazirla(sonSnapshot) {
  const sorqular = [];
  let yazilanState = null;
  let releaseOlundu = false;

  const client = {
    async query(sql, parametrler = []) {
      const temizSql = String(sql || "").replace(/\s+/g, " ").trim();
      sorqular.push({ sql: temizSql, parametrler });

      if (temizSql.startsWith("SELECT detallar")) {
        return sonSnapshot
          ? {
              rows: [
                {
                  detallar: {
                    version: 1,
                    state: JSON.parse(JSON.stringify(sonSnapshot))
                  }
                }
              ]
            }
          : { rows: [] };
      }

      if (temizSql.startsWith("INSERT INTO hesab_audit_jurnali")) {
        const detallar = JSON.parse(parametrler[2]);
        yazilanState = detallar.state;
        return { rowCount: 1, rows: [] };
      }

      return { rowCount: 0, rows: [] };
    },

    release() {
      releaseOlundu = true;
    }
  };

  return {
    hovuz: {
      async connect() {
        return client;
      }
    },
    sorqular,
    yazilanStateAl: () => yazilanState,
    releaseOlundu: () => releaseOlundu
  };
}

(async function testleriIcraEt() {
  assert.strictEqual(OYUNCU_STATE_KILID_ADI, "oyun_state_mutasiya_v1");

  {
    const hedef = {
      playerId: "oyuncu_a",
      resources: {
        wood: 50
      }
    };
    const defaultlar = {
      playerId: "oyuncu_a",
      resources: {
        wood: 999,
        iron: 20
      },
      yeniServerSahesi: {
        aktiv: true
      }
    };

    catismayanDefaultlariElaveEt(hedef, defaultlar);

    assert.deepStrictEqual(hedef, {
      playerId: "oyuncu_a",
      resources: {
        wood: 50,
        iron: 20
      },
      yeniServerSahesi: {
        aktiv: true
      }
    });
  }

  {
    const cariState = {
      playerId: "oyuncu_a",
      resources: {
        wood: 5
      },
      yeniServerDefaultu: {
        aktiv: true
      }
    };

    const sonSnapshot = {
      playerId: "oyuncu_a",
      resources: {
        wood: 100
      },
      serverSorquIdempotentliyi: {
        version: 1,
        items: []
      }
    };

    const fake = fakeHovuzHazirla(sonSnapshot);

    const cavab = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      "OYUNCU_A",
      cariState,
      async isState => {
        assert.strictEqual(isState.resources.wood, 100);
        assert.strictEqual(isState.yeniServerDefaultu.aktiv, true);

        isState.konvoyEmeliyyatlari = {
          version: 4,
          activeByConvoy: {
            konvoy_1: {
              status: "marching_to_player_base"
            }
          },
          history: []
        };

        return {
          success: true,
          deyisdi: true
        };
      },
      { hovuz: fake.hovuz }
    );

    assert.strictEqual(cavab.success, true);
    assert.strictEqual(cariState.resources.wood, 100);
    assert.strictEqual(cariState.yeniServerDefaultu.aktiv, true);
    assert.strictEqual(
      cariState.konvoyEmeliyyatlari.activeByConvoy.konvoy_1.status,
      "marching_to_player_base"
    );

    const yazilanState = fake.yazilanStateAl();
    assert.ok(yazilanState);
    assert.strictEqual(yazilanState.resources.wood, 100);
    assert.strictEqual(
      yazilanState.konvoyEmeliyyatlari.activeByConvoy.konvoy_1.status,
      "marching_to_player_base"
    );

    const sqlSiyahisi = fake.sorqular.map(x => x.sql);
    assert.strictEqual(sqlSiyahisi[0], "BEGIN");
    assert.ok(sqlSiyahisi[1].startsWith("SELECT pg_advisory_xact_lock"));
    assert.deepStrictEqual(
      fake.sorqular[1].parametrler,
      ["oyun_state_mutasiya_v1", "oyuncu_a"]
    );
    assert.ok(sqlSiyahisi[2].startsWith("SELECT detallar"));
    assert.ok(sqlSiyahisi[3].startsWith("INSERT INTO hesab_audit_jurnali"));
    assert.ok(sqlSiyahisi[4].startsWith("DELETE FROM hesab_audit_jurnali"));
    assert.strictEqual(sqlSiyahisi[5], "COMMIT");
    assert.strictEqual(fake.releaseOlundu(), true);
  }

  {
    const cariState = {
      playerId: "oyuncu_a",
      resources: {
        wood: 7
      }
    };

    const sonSnapshot = {
      playerId: "oyuncu_a",
      resources: {
        wood: 90
      }
    };

    const fake = fakeHovuzHazirla(sonSnapshot);

    const cavab = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      "oyuncu_a",
      cariState,
      async isState => {
        assert.strictEqual(isState.resources.wood, 90);
        return {
          success: false,
          deyisdi: false,
          message: "Validation bloklandı."
        };
      },
      { hovuz: fake.hovuz }
    );

    assert.strictEqual(cavab.success, false);
    assert.strictEqual(cariState.resources.wood, 90);
    assert.strictEqual(fake.yazilanStateAl(), null);
    assert.ok(fake.sorqular.some(x => x.sql === "COMMIT"));
    assert.ok(!fake.sorqular.some(x => x.sql === "ROLLBACK"));
  }

  {
    const cariState = {
      playerId: "oyuncu_a",
      resources: {
        wood: 11
      }
    };
    const evvelki = JSON.parse(JSON.stringify(cariState));
    const fake = fakeHovuzHazirla({
      playerId: "oyuncu_a",
      resources: {
        wood: 200
      }
    });

    let xetaAtildi = false;

    try {
      await oyuncuStateMutasiyasiniPostgresIleIcraEt(
        "oyuncu_a",
        cariState,
        async isState => {
          isState.resources.wood = 300;
          throw new Error("test_xetasi");
        },
        { hovuz: fake.hovuz }
      );
    }
    catch (xeta) {
      xetaAtildi = true;
      assert.strictEqual(xeta.message, "test_xetasi");
    }

    assert.strictEqual(xetaAtildi, true);
    assert.deepStrictEqual(cariState, evvelki);
    assert.ok(fake.sorqular.some(x => x.sql === "ROLLBACK"));
    assert.ok(!fake.sorqular.some(x => x.sql === "COMMIT"));
    assert.strictEqual(fake.releaseOlundu(), true);
  }

  console.log("[OYUN_STATE_MUTASIYA_POSTGRES_TEST] OK");
})().catch(xeta => {
  console.error("[OYUN_STATE_MUTASIYA_POSTGRES_TEST] XETA", xeta);
  process.exitCode = 1;
});
