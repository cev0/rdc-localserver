"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  qehremanRecruitMutasiyasiniTetbiqEt
} = require("./qehreman_recruit_handler");

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function stateHazirla() {
  return {
    playerId: "oyuncu_a",
    heroes: [],
    heroRecruit: {
      version: 1,
      freeDraws: 3,
      tickets: 10
    },
    serverSorquIdempotentliyi: {
      version: 1,
      items: []
    }
  };
}

(function ugurluRecruitVeReplayTesti() {
  const state = stateHazirla();
  let recruitCagirisSayi = 0;

  const asililiqlar = {
    stateTeminEt() {},
    recruitEt(kilidliState, bannerId, drawCount) {
      recruitCagirisSayi += 1;
      kilidliState.heroes.push({
        heroId: "hero_yeni",
        level: 1
      });
      kilidliState.heroRecruit.tickets -= 1;

      return {
        success: true,
        bannerId,
        usedFreeDraw: false,
        ticketCost: 1,
        drawCount,
        entries: [
          {
            type: "hero",
            heroId: "hero_yeni"
          }
        ],
        recruitInfo: {
          tickets: kilidliState.heroRecruit.tickets
        },
        message: "ok"
      };
    },
    updateServerTime(kilidliState) {
      kilidliState.serverTimeUnixMs = 1000;
    }
  };

  const ilk = qehremanRecruitMutasiyasiniTetbiqEt(
    state,
    "hero_recruit_single_request",
    {
      requestId: "REQ-001",
      bannerId: "NORMAL"
    },
    1000,
    asililiqlar
  );

  assert.strictEqual(ilk.success, true);
  assert.strictEqual(ilk.deyisdi, true);
  assert.strictEqual(ilk.idempotentReplay, false);
  assert.strictEqual(ilk.requestId, "req-001");
  assert.strictEqual(ilk.cavabNeticesi.bannerId, "normal");
  assert.strictEqual(state.heroes.length, 1);
  assert.strictEqual(state.heroes[0].heroId, "hero_yeni");
  assert.strictEqual(state.heroRecruit.tickets, 9);
  assert.strictEqual(state.serverSorquIdempotentliyi.items.length, 1);
  assert.strictEqual(recruitCagirisSayi, 1);

  const ilkdenSonra = kopyala(state);

  const replay = qehremanRecruitMutasiyasiniTetbiqEt(
    state,
    "hero_recruit_single_request",
    {
      requestId: "req-001",
      bannerId: "normal"
    },
    2000,
    asililiqlar
  );

  assert.strictEqual(replay.success, true);
  assert.strictEqual(replay.idempotentReplay, true);
  assert.strictEqual(replay.deyisdi, false);
  assert.strictEqual(recruitCagirisSayi, 1);
  assert.deepStrictEqual(
    state,
    ilkdenSonra,
    "Idempotent replay ikinci recruit etməməlidir."
  );
})();

(function requestIdConflictTesti() {
  const state = stateHazirla();
  let recruitCagirisSayi = 0;

  const asililiqlar = {
    stateTeminEt() {},
    recruitEt(kilidliState, bannerId, drawCount) {
      recruitCagirisSayi += 1;
      return {
        success: true,
        bannerId,
        drawCount,
        entries: [],
        recruitInfo: {},
        message: "ok"
      };
    }
  };

  const ilk = qehremanRecruitMutasiyasiniTetbiqEt(
    state,
    "hero_recruit_single_request",
    { requestId: "req-conflict", bannerId: "normal" },
    1000,
    asililiqlar
  );
  assert.strictEqual(ilk.success, true);
  assert.strictEqual(recruitCagirisSayi, 1);

  const evvelki = kopyala(state);

  const conflict = qehremanRecruitMutasiyasiniTetbiqEt(
    state,
    "hero_recruit_single_request",
    { requestId: "req-conflict", bannerId: "advanced" },
    2000,
    asililiqlar
  );

  assert.strictEqual(conflict.success, false);
  assert.strictEqual(conflict.idempotentReplay, false);
  assert.ok(conflict.message.includes("requestId"));
  assert.strictEqual(recruitCagirisSayi, 1);
  assert.deepStrictEqual(state, evvelki);
})();

(function qismenMutasiyaXetaRollbackTesti() {
  const state = stateHazirla();
  const evvelki = kopyala(state);

  const netice = qehremanRecruitMutasiyasiniTetbiqEt(
    state,
    "hero_recruit_single_request",
    {
      requestId: "",
      bannerId: "normal"
    },
    3000,
    {
      stateTeminEt() {},
      recruitEt(kilidliState) {
        kilidliState.heroes.push({ heroId: "yarimciq_hero" });
        kilidliState.heroRecruit.tickets = 0;
        throw new Error("qesdli_recruit_xetasi");
      }
    }
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, false);
  assert.strictEqual(netice.daxiliXeta, "qesdli_recruit_xetasi");
  assert.deepStrictEqual(
    state,
    evvelki,
    "Recruit exception qismən hero/ticket mutation-u saxlamamalıdır."
  );
})();

(function dailyTeminDeyisikliyiQorunurTesti() {
  const state = stateHazirla();
  state.heroRecruit.dailyDay = "kohne";

  const netice = qehremanRecruitMutasiyasiniTetbiqEt(
    state,
    "hero_recruit_single_request",
    {
      requestId: "",
      bannerId: "normal"
    },
    4000,
    {
      stateTeminEt(kilidliState) {
        kilidliState.heroRecruit.dailyDay = "yeni";
        kilidliState.heroRecruit.freeDraws = 3;
      },
      recruitEt(kilidliState) {
        kilidliState.heroes.push({ heroId: "silinmeli_hero" });
        return {
          success: false,
          message: "ticket yoxdur"
        };
      }
    }
  );

  assert.strictEqual(netice.success, false);
  assert.strictEqual(netice.deyisdi, true);
  assert.strictEqual(state.heroRecruit.dailyDay, "yeni");
  assert.strictEqual(state.heroes.length, 0);
})();

(function sourceInteqrasiyaTesti() {
  const kod = fs.readFileSync(
    path.join(__dirname, "qehreman_recruit_handler.js"),
    "utf8"
  );

  assert.ok(
    kod.includes("oyuncuStateMutasiyasiniPostgresIleIcraEt"),
    "Recruit handler PostgreSQL player mutation helper istifadə etməlidir."
  );
  assert.ok(
    !kod.includes("oyunStateIniYaddaSaxla"),
    "Recruit handler köhnə ayrıca snapshot-save yolunu istifadə etməməlidir."
  );
  assert.ok(
    kod.includes("hero_recruit_info_request"),
    "Recruit info contract saxlanmalıdır."
  );
})();

console.log("[QEHRAMAN_RECRUIT_PG_MUTASIYA_TEST] OK");
