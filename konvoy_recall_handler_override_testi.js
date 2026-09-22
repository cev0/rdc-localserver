"use strict";

const assert = require("assert");
const fs = require("fs");

const kod =
  fs.readFileSync(
    require.resolve(
      "./konvoy_recall_handler_override"
    ),
    "utf8"
  );

assert.ok(
  kod.includes(
    "oyuncuKonvoylariniSinxronEt"
  ),
  "Fast recall public convoy projection-u yeniləməlidir."
);

assert.ok(
  kod.includes(
    "runtimeDynamicMapRefreshGonder"
  ),
  "Projection yenilənəndən sonra digər server instanslarına dynamic map refresh göndərilməlidir."
);

const syncIndex =
  kod.indexOf(
    "oyuncuKonvoylariniSinxronEt("
  );

const refreshIndex =
  kod.indexOf(
    "runtimeDynamicMapRefreshGonder("
  );

assert.ok(
  syncIndex >= 0 &&
  refreshIndex > syncIndex,
  "Redis dynamic refresh shared PostgreSQL projection sync-dən sonra işləməlidir."
);

assert.ok(
  kod.includes(
    "kontekst.runtimeBus"
  ),
  "Fast recall override runtime bus-u background projection refresh-ə ötürməlidir."
);

console.log(
  "[KONVOY_RECALL_HANDLER_OVERRIDE_TEST] cross-instance dynamic refresh order OK"
);
