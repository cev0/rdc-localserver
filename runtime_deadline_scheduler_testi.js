"use strict";

const assert = require("assert");
const {
  RuntimeDeadlineScheduler
} = require("./runtime_deadline_scheduler");

function gozle(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const fired = [];

  const scheduler =
    new RuntimeDeadlineScheduler({
      minDelayMs: 2,
      onDue: async (playerId) => {
        fired.push(playerId);
        return null;
      }
    });

  const now = Date.now();

  scheduler.schedule("late", now + 80);
  scheduler.schedule("early", now + 25);

  // Eyni player yenidən schedule olunanda köhnə heap entry stale olmalıdır.
  scheduler.schedule("rescheduled", now + 100);
  scheduler.schedule("rescheduled", now + 40);

  scheduler.schedule("cancelled", now + 30);
  scheduler.cancel("cancelled");

  await gozle(140);

  assert.deepStrictEqual(
    fired,
    ["early", "rescheduled", "late"]
  );

  assert.strictEqual(scheduler.size, 0);

  scheduler.stop();

  // onDue növbəti deadline qaytaranda avtomatik yenidən schedule olunmasını yoxla.
  let repeatCount = 0;

  const repeating =
    new RuntimeDeadlineScheduler({
      minDelayMs: 2,
      onDue: async () => {
        repeatCount += 1;

        if (repeatCount === 1) {
          return Date.now() + 20;
        }

        return null;
      }
    });

  repeating.schedule(
    "repeat-player",
    Date.now() + 10
  );

  await gozle(80);

  assert.strictEqual(repeatCount, 2);
  assert.strictEqual(repeating.size, 0);

  repeating.stop();

  console.log(
    "PASS: deadline scheduler order, reschedule, cancel and repeat."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
