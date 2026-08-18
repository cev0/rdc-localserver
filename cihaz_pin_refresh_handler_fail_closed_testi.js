"use strict";

const assert = require("assert");

const sessiyaModulu = require("./hesab_sessiya_postgres");
const cihazPinModulu = require("./hesab_cihaz_pin_qoruma");

const esasSessiyaniYenile = sessiyaModulu.sessiyaniYenile;
const esasRefreshQorumasi =
  cihazPinModulu.refreshCihazQorumasiniYoxla;

async function handleriYoxla() {
  let sessiyaYenileSayi = 0;

  sessiyaModulu.sessiyaniYenile = async () => {
    sessiyaYenileSayi++;
    throw new Error(
      "Etibarsız cihaz yoxlamasından sonra sessiya yenilənməməlidir."
    );
  };

  cihazPinModulu.refreshCihazQorumasiniYoxla = async () => ({
    valid: false,
    requiresPin: false
  });

  const handlerYolu = require.resolve("./hesab_login_handler");
  delete require.cache[handlerYolu];

  const {
    hesabLoginMesajiniEmalEt
  } = require("./hesab_login_handler");

  const gonderilenler = [];
  const ws = {};

  const emalOlundu = await hesabLoginMesajiniEmalEt({
    type: "account_session_refresh_request",
    msg: {
      refreshToken:
        "refresh-token-123456789012345678901234567890",
      cihazId: ""
    },
    ws,
    send(_ws, mesaj) {
      gonderilenler.push(mesaj);
    },
    nowMs() {
      return 123456789;
    },
    connections: new Map(),
    getOrCreatePlayerState() {
      throw new Error("State yaradılmamalıdır.");
    },
    updateServerTime() {
      throw new Error("State yenilənməməlidir.");
    },
    makeClientState() {
      throw new Error("Client state yaradılmamalıdır.");
    },
    sendStateLocalMapToPlayer() {
      throw new Error("Lokal xəritə göndərilməməlidir.");
    },
    sendWorldMapToPlayer() {
      throw new Error("Dünya xəritəsi göndərilməməlidir.");
    }
  });

  assert.strictEqual(emalOlundu, true);
  assert.strictEqual(sessiyaYenileSayi, 0);
  assert.strictEqual(gonderilenler.length, 1);
  assert.strictEqual(
    gonderilenler[0].type,
    "account_session_refresh_result"
  );
  assert.strictEqual(gonderilenler[0].success, false);
  assert.match(
    gonderilenler[0].message,
    /etibarsızdır/
  );
}

handleriYoxla()
  .then(() => {
    console.log(
      "[CIHAZ_PIN_REFRESH_HANDLER_FAIL_CLOSED_TEST] " +
      "Etibarsız cihaz yoxlaması sessiya rotasiyasını dayandırır."
    );
  })
  .catch(xeta => {
    console.error(xeta);
    process.exitCode = 1;
  })
  .finally(() => {
    sessiyaModulu.sessiyaniYenile = esasSessiyaniYenile;
    cihazPinModulu.refreshCihazQorumasiniYoxla =
      esasRefreshQorumasi;

    delete require.cache[
      require.resolve("./hesab_login_handler")
    ];
  });
