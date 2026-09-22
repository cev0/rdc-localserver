"use strict";

const assert = require("assert");
const {
  pvpZeroingRecallPendingdir,
  pvpZeroingRecallDeadlineAtMs,
  pvpZeroingPendingRecalliniBerpaEt
} = require("./pvp_zeroing_recall_deadline");

(async () => {
  const state = {
    pvpCity: {
      convoyRecallPending: true,
      zeroedAtMs: 700
    }
  };

  assert.strictEqual(
    pvpZeroingRecallPendingdir(state),
    true
  );

  assert.strictEqual(
    pvpZeroingRecallDeadlineAtMs(
      state,
      1000
    ),
    700
  );

  assert.strictEqual(
    pvpZeroingRecallDeadlineAtMs(
      {},
      1000
    ),
    null
  );

  const calls = [];

  const result =
    await pvpZeroingPendingRecalliniBerpaEt({
      state,
      playerId: " defender ",
      nowMs: 1200,
      recallFn:
        async (playerId, nowMs) => {
          calls.push(
            "recall:" +
            playerId +
            ":" +
            nowMs
          );

          return {
            success: true,
            alreadyCompleted: false
          };
        },
      refreshFn:
        async playerId => {
          calls.push(
            "refresh:" +
            playerId
          );

          return {
            playerId,
            pvpCity: {
              convoyRecallPending: false
            }
          };
        }
    });

  assert.strictEqual(
    result.handled,
    true
  );

  assert.deepStrictEqual(
    calls,
    [
      "recall:defender:1200",
      "refresh:defender"
    ],
    "Durable post-commit recall uğurla tamamlandıqdan sonra local state force-refresh edilməlidir."
  );

  const skipped =
    await pvpZeroingPendingRecalliniBerpaEt({
      state: {},
      playerId: "defender",
      recallFn:
        async () => {
          throw new Error("çağırılmamalıdır");
        },
      refreshFn:
        async () => {
          throw new Error("çağırılmamalıdır");
        }
    });

  assert.strictEqual(
    skipped.handled,
    false
  );

  await assert.rejects(
    async () =>
      await pvpZeroingPendingRecalliniBerpaEt({
        state,
        playerId: "defender",
        nowMs: 1300,
        recallFn:
          async () => {
            throw new Error("temporary postgres error");
          },
        refreshFn:
          async () => {
            throw new Error("çağırılmamalıdır");
          }
      }),
    /temporary postgres error/
  );

  console.log(
    "PASS: pending PvP zeroing convoy recall is deadline-detectable and repaired through the existing durable post-commit path."
  );
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
