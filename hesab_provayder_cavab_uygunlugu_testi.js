"use strict";

const assert = require("assert");
const {
  hesabCavabiniProvayderdenTamamla
} = require("./hesab_provayder_cavab_uygunlugu");

function kopyala(deyer) {
  return JSON.parse(JSON.stringify(deyer));
}

(function googleAccountInfoTesti() {
  const cavab = {
    type: "account_info_result",
    success: true,
    playerId: "player_001",
    accountId: "account_900",
    primaryEmail: "",
    emailVerified: false,
    account: {
      accountId: "account_900",
      playerId: "player_001",
      primaryEmail: "",
      emailVerified: false,
      providers: [
        {
          provider: "google",
          email: "Player@Example.com",
          emailVerified: false
        }
      ]
    }
  };

  const netice = hesabCavabiniProvayderdenTamamla(cavab);

  assert.strictEqual(netice, cavab);
  assert.strictEqual(netice.playerId, "player_001");
  assert.strictEqual(netice.accountId, "account_900");
  assert.notStrictEqual(netice.playerId, netice.accountId);
  assert.strictEqual(netice.primaryEmail, "player@example.com");
  assert.strictEqual(netice.emailVerified, true);
  assert.strictEqual(netice.account.playerId, "player_001");
  assert.strictEqual(netice.account.accountId, "account_900");
  assert.strictEqual(netice.account.primaryEmail, "player@example.com");
  assert.strictEqual(netice.account.emailVerified, true);
})();

(function googleFerqliEsasEmailiTesdiqlemesinTesti() {
  const cavab = {
    type: "account_info_result",
    success: true,
    playerId: "player_002",
    accountId: "account_901",
    primaryEmail: "owner@example.com",
    emailVerified: false,
    account: {
      accountId: "account_901",
      playerId: "player_002",
      primaryEmail: "owner@example.com",
      emailVerified: false,
      providers: [
        {
          provider: "google",
          email: "other@example.com",
          emailVerified: true
        }
      ]
    }
  };

  hesabCavabiniProvayderdenTamamla(cavab);

  assert.strictEqual(cavab.primaryEmail, "owner@example.com");
  assert.strictEqual(cavab.emailVerified, false);
  assert.strictEqual(cavab.account.primaryEmail, "owner@example.com");
  assert.strictEqual(cavab.account.emailVerified, false);
})();

(function tesdiqsizDigerProvayderTesti() {
  const cavab = {
    type: "account_provider_link_result",
    success: true,
    playerId: "player_003",
    accountId: "account_902",
    primaryEmail: "",
    emailVerified: false,
    providers: [
      {
        provider: "apple",
        email: "apple@example.com",
        emailVerified: false
      }
    ]
  };
  const evvelki = kopyala(cavab);

  hesabCavabiniProvayderdenTamamla(cavab);

  assert.deepStrictEqual(cavab, evvelki);
})();

(function tesdiqlenmisDigerProvayderTesti() {
  const cavab = {
    type: "account_provider_link_result",
    success: true,
    playerId: "player_004",
    accountId: "account_903",
    primaryEmail: "",
    emailVerified: false,
    providers: [
      {
        provider: "apple",
        email: "Verified@Example.com",
        emailVerified: true
      }
    ]
  };

  hesabCavabiniProvayderdenTamamla(cavab);

  assert.strictEqual(cavab.primaryEmail, "verified@example.com");
  assert.strictEqual(cavab.emailVerified, true);
  assert.strictEqual(cavab.playerId, "player_004");
  assert.strictEqual(cavab.accountId, "account_903");
})();

(function ugursuzVeYadCavabDeyismesinTesti() {
  for (const cavab of [
    {
      type: "account_info_result",
      success: false,
      primaryEmail: "",
      emailVerified: false,
      providers: [
        {
          provider: "google",
          email: "google@example.com"
        }
      ]
    },
    {
      type: "unrelated_result",
      success: true,
      primaryEmail: "",
      emailVerified: false,
      providers: [
        {
          provider: "google",
          email: "google@example.com"
        }
      ]
    }
  ]) {
    const evvelki = kopyala(cavab);
    hesabCavabiniProvayderdenTamamla(cavab);
    assert.deepStrictEqual(cavab, evvelki);
  }
})();

console.log(
  "[GOOGLE_HESAB_MUQAVILE_TEST] Email təsdiqi və playerId/accountId ayrılığı uğurludur."
);
