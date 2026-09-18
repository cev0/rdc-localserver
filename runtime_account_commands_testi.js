"use strict";

const assert = require("assert");

const {
  RuntimeCommandRouter
} = require("./runtime_command_router");

const {
  accountCommandleriniQeydEt
} = require("./runtime_account_commands");

(async () => {
  const sent = [];
  const pushed = [];
  const states = new Map();
  const mutationPlayers = [];
  const authoritativePlayers = [];
  const deferredCallbacks = [];
  const bindCalls = [];
  const emailSendCalls = [];
  const emailConfirmCalls = [];

  const router =
    new RuntimeCommandRouter({
      name: "account-test",
      logger: {
        error() {}
      },
      mutationExecutor:
        async (playerId, action) => {
          mutationPlayers.push(playerId);
          return await action();
        },

      authoritativeMutationExecutor:
        async (
          playerId,
          action
        ) => {
          authoritativePlayers.push(
            playerId
          );

          const result =
            await action({
              deferAfterCommit:
                (callback) => {
                  deferredCallbacks.push(
                    callback
                  );
                  return true;
                }
            });

          while (
            deferredCallbacks.length > 0
          ) {
            const callback =
              deferredCallbacks.shift();
            await callback();
          }

          return result;
        }
    });

  function getOrCreatePlayerState(playerId) {
    if (!states.has(playerId)) {
      states.set(playerId, {
        playerId,
        oyuncuAdi: "Komandir",
        serverTimeUnixMs: 0
      });
    }

    return states.get(playerId);
  }

  accountCommandleriniQeydEt(
    router,
    {
      hesabYaratVeBagla:
        async (playerId, email, sifre) => {
          bindCalls.push({
            playerId,
            email,
            sifre
          });

          return {
            success: true,
            message: "ok",
            account: {
              accountId: "a1",
              primaryEmail: email,
              secondaryEmail: "",
              emailVerified: false
            }
          };
        },

      emailTesdiqKoduHazirla:
        async (playerId) => {
          emailSendCalls.push(playerId);

          return {
            success: true,
            alreadyVerified: true,
            message: "already"
          };
        },

      tesdiqKoduEmailiGonder:
        async () => ({
          success: true
        }),

      emailTesdiqKodunuYoxla:
        async (playerId, kod) => {
          emailConfirmCalls.push({
            playerId,
            kod
          });

          return {
            success: true,
            alreadyVerified: false,
            expired: false,
            tooManyAttempts: false,
            attemptsRemaining: 2,
            message: "verified",
            account: {
              primaryEmail:
                "a@example.com",
              emailVerified: true
            }
          };
        },

      getOrCreatePlayerState,

      oyuncuProfiliniTeminEt:
        (state) => {
          if (!state.oyuncuAdi) {
            state.oyuncuAdi =
              "Komandir";
          }
        },

      updateServerTime:
        (state) => {
          state.serverTimeUnixMs =
            777;
        },

      pushStateToPlayerConnections:
        (playerId, state) => {
          pushed.push({
            playerId,
            state: {
              ...state
            }
          });
        }
    }
  );

  const ws = {
    _authedPlayerId:
      "player-1"
  };

  const send =
    (_ws, payload) => {
      sent.push(payload);
    };

  // Başqa playerId ilə hesab bağlama cəhdi bloklanmalıdır.
  await router.dispatch({
    type: "account_bind_request",
    msg: {
      type:
        "account_bind_request",
      playerId: "player-2",
      email: "a@example.com",
      sifre: " secret "
    },
    ws,
    send,
    nowMs: () => 100
  });

  assert.strictEqual(
    bindCalls.length,
    0
  );

  assert.strictEqual(
    sent.pop().success,
    false
  );

  // Uğurlu bind. Şifrə trim olunmamalıdır.
  await router.dispatch({
    type: "account_bind_request",
    msg: {
      type:
        "account_bind_request",
      playerId: "player-1",
      email: " a@example.com ",
      sifre: " secret "
    },
    ws,
    send,
    nowMs: () => 101
  });

  assert.deepStrictEqual(
    bindCalls[0],
    {
      playerId: "player-1",
      email: "a@example.com",
      sifre: " secret "
    }
  );

  const bindResult =
    sent.pop();

  assert.strictEqual(
    bindResult.success,
    true
  );

  assert.strictEqual(
    bindResult.accountId,
    "a1"
  );

  // Email artıq təsdiqlənibsə mail göndərilmədən nəticə qaytarılır.
  await router.dispatch({
    type:
      "account_email_verification_send_request",
    msg: {
      type:
        "account_email_verification_send_request"
    },
    ws,
    send,
    nowMs: () => 102
  });

  const emailSendResult =
    sent.pop();

  assert.strictEqual(
    emailSendCalls.length,
    1
  );

  assert.strictEqual(
    emailSendResult.alreadyVerified,
    true
  );

  // Confirm kod trim olunur.
  await router.dispatch({
    type:
      "account_email_verification_confirm_request",
    msg: {
      type:
        "account_email_verification_confirm_request",
      kod: " 123456 "
    },
    ws,
    send,
    nowMs: () => 103
  });

  assert.deepStrictEqual(
    emailConfirmCalls[0],
    {
      playerId: "player-1",
      kod: "123456"
    }
  );

  assert.strictEqual(
    sent.pop().emailVerified,
    true
  );

  // Player name mutation router mutation lock-dan keçməlidir.
  await router.dispatch({
    type:
      "player_name_change_request",
    msg: {
      type:
        "player_name_change_request",
      playerId: "player-1",
      yeniAd: "YeniAd"
    },
    ws,
    send,
    nowMs: () => 104
  });

  const nameResult =
    sent.pop();

  assert.strictEqual(
    nameResult.success,
    true
  );

  assert.strictEqual(
    getOrCreatePlayerState(
      "player-1"
    ).oyuncuAdi,
    "YeniAd"
  );

  assert.strictEqual(
    pushed.length,
    1
  );

  assert.deepStrictEqual(
    mutationPlayers,
    [],
    "Player name mutation plain RAM mutation executor-dan keçməməlidir."
  );

  assert.deepStrictEqual(
    authoritativePlayers,
    [
      "player-1"
    ],
    "Player name mutation PostgreSQL-authoritative executor-dan keçməlidir."
  );

  console.log(
    "PASS: routed account bind, email verification and player-name mutation."
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
