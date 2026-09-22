"use strict";

const {
  playerIdUyugunluqYoxla
} = require("./runtime_core_read_commands");

function accountCommandleriniQeydEt(
  router,
  deps
) {
  if (!router) {
    throw new Error(
      "Command router yoxdur."
    );
  }

  const {
    hesabYaratVeBagla,
    emailTesdiqKoduHazirla,
    tesdiqKoduEmailiGonder,
    emailTesdiqKodunuYoxla,
    getOrCreatePlayerState,
    oyuncuProfiliniTeminEt,
    updateServerTime,
    pushStateToPlayerConnections
  } = deps || {};

  const requiredFns = {
    hesabYaratVeBagla,
    emailTesdiqKoduHazirla,
    tesdiqKoduEmailiGonder,
    emailTesdiqKodunuYoxla,
    getOrCreatePlayerState,
    oyuncuProfiliniTeminEt,
    updateServerTime,
    pushStateToPlayerConnections
  };

  for (
    const [name, fn] of
    Object.entries(requiredFns)
  ) {
    if (typeof fn !== "function") {
      throw new Error(
        "Account command dependency yoxdur: " +
        name
      );
    }
  }

  router.register(
    "account_bind_request",
    async ({
      ws,
      msg,
      send,
      nowMs
    }) => {
      const authCheck =
        playerIdUyugunluqYoxla(
          msg,
          ws
        );

      if (!authCheck.ok) {
        send(ws, {
          type: "account_bind_result",
          playerId:
            authCheck.playerId || null,
          success: false,
          message:
            authCheck.message ===
            "Player ID mismatch"
              ? "Oyunçu ID uyğun deyil."
              : "Oyunçu autentifikasiya olunmayıb.",
          serverTimeUnixMs:
            nowMs()
        });
        return;
      }

      const playerId =
        authCheck.playerId;

      const email =
        typeof msg.email === "string"
          ? msg.email.trim()
          : "";

      // Şifrə qəsdən trim edilmir.
      const sifre =
        typeof msg.sifre === "string"
          ? msg.sifre
          : "";

      let netice;

      try {
        netice =
          await hesabYaratVeBagla(
            playerId,
            email,
            sifre
          );
      }
      catch (xeta) {
        console.error(
          "[HESAB] Hesab bağlama xətası:",
          xeta
        );

        send(ws, {
          type: "account_bind_result",
          playerId,
          success: false,
          message:
            "Hesab yaradılarkən server xətası baş verdi.",
          serverTimeUnixMs:
            nowMs()
        });
        return;
      }

      if (
        !netice ||
        netice.success !== true
      ) {
        send(ws, {
          type: "account_bind_result",
          playerId,
          success: false,
          message:
            netice && netice.message
              ? netice.message
              : "Hesab bağlana bilmədi.",
          serverTimeUnixMs:
            nowMs()
        });
        return;
      }

      const hesab =
        netice.account || {};

      send(ws, {
        type: "account_bind_result",
        playerId,
        success: true,
        message:
          netice.message ||
          "Hesab uğurla bağlandı.",
        accountId:
          hesab.accountId || "",
        primaryEmail:
          hesab.primaryEmail || "",
        secondaryEmail:
          hesab.secondaryEmail || "",
        emailVerified:
          hesab.emailVerified === true,
        serverTimeUnixMs:
          nowMs()
      });
    },
    {
      authRequired: true
    }
  );

  router.register(
    "account_email_verification_send_request",
    async ({
      ws,
      send,
      nowMs
    }) => {
      const playerId =
        String(
          ws._authedPlayerId
        );

      const netice =
        await emailTesdiqKoduHazirla(
          playerId
        );

      if (
        !netice ||
        netice.success !== true
      ) {
        send(ws, {
          type:
            "account_email_verification_send_result",
          playerId,
          success: false,
          message:
            netice && netice.message
              ? netice.message
              : "",
          retryAfterSeconds:
            Math.ceil(
              Number(
                netice &&
                netice.retryAfterMs ||
                0
              ) / 1000
            ),
          serverTimeUnixMs:
            nowMs()
        });
        return;
      }

      if (
        netice.alreadyVerified
      ) {
        send(ws, {
          type:
            "account_email_verification_send_result",
          playerId,
          success: true,
          alreadyVerified: true,
          message:
            netice.message || "",
          serverTimeUnixMs:
            nowMs()
        });
        return;
      }

      const emailNeticesi =
        await tesdiqKoduEmailiGonder(
          netice.email,
          netice.kod
        );

      if (
        !emailNeticesi ||
        emailNeticesi.success !== true
      ) {
        send(ws, {
          type:
            "account_email_verification_send_result",
          playerId,
          success: false,
          message:
            emailNeticesi &&
            emailNeticesi.message
              ? emailNeticesi.message
              : "Təsdiq e-poçtu göndərilə bilmədi.",
          serverTimeUnixMs:
            nowMs()
        });
        return;
      }

      const devRejimi =
        String(
          process.env
            .EMAIL_DEV_LOG_CODE ||
          ""
        )
          .trim()
          .toLowerCase() === "true";

      send(ws, {
        type:
          "account_email_verification_send_result",
        playerId,
        success: true,
        alreadyVerified: false,
        message:
          devRejimi
            ? "DEV rejimi: təsdiq kodu yaradıldı."
            : "Təsdiq kodu e-poçt ünvanınıza göndərildi.",
        devCode:
          devRejimi
            ? String(
                netice.kod || ""
              )
            : "",
        expiresAtMs:
          Number(
            netice.expiresAtMs ||
            0
          ),
        serverTimeUnixMs:
          nowMs()
      });
    },
    {
      authRequired: true
    }
  );

  router.register(
    "account_email_verification_confirm_request",
    async ({
      ws,
      msg,
      send,
      nowMs
    }) => {
      const playerId =
        String(
          ws._authedPlayerId
        );

      const kod =
        typeof msg.kod === "string"
          ? msg.kod.trim()
          : "";

      const netice =
        await emailTesdiqKodunuYoxla(
          playerId,
          kod
        );

      const hesab =
        netice &&
        netice.account
          ? netice.account
          : null;

      send(ws, {
        type:
          "account_email_verification_confirm_result",
        playerId,
        success:
          !!(
            netice &&
            netice.success === true
          ),
        alreadyVerified:
          !!(
            netice &&
            netice.alreadyVerified === true
          ),
        expired:
          !!(
            netice &&
            netice.expired === true
          ),
        tooManyAttempts:
          !!(
            netice &&
            netice.tooManyAttempts === true
          ),
        attemptsRemaining:
          Number(
            netice &&
            netice.attemptsRemaining ||
            0
          ),
        message:
          netice &&
          netice.message
            ? netice.message
            : "",
        emailVerified:
          Boolean(
            hesab &&
            hesab.emailVerified
          ),
        primaryEmail:
          hesab
            ? hesab.primaryEmail || ""
            : "",
        serverTimeUnixMs:
          nowMs()
      });
    },
    {
      authRequired: true
    }
  );

  router.register(
    "player_name_change_request",
    async ({
      ws,
      msg,
      send,
      nowMs,
      deferAfterCommit
    }) => {
      const authCheck =
        playerIdUyugunluqYoxla(
          msg,
          ws
        );

      if (!authCheck.ok) {
        send(ws, {
          type:
            "player_name_change_result",
          playerId:
            authCheck.playerId || null,
          success: false,
          message:
            authCheck.message
        });
        return;
      }

      const playerId =
        authCheck.playerId;

      const yeniAd =
        typeof msg.yeniAd === "string"
          ? msg.yeniAd.trim()
          : "";

      if (!yeniAd) {
        send(ws, {
          type:
            "player_name_change_result",
          playerId,
          success: false,
          message:
            "Ad boş ola bilməz"
        });
        return;
      }

      if (yeniAd.length < 3) {
        send(ws, {
          type:
            "player_name_change_result",
          playerId,
          success: false,
          message:
            "Ad minimum 3 simvol olmalıdır"
        });
        return;
      }

      if (yeniAd.length > 16) {
        send(ws, {
          type:
            "player_name_change_result",
          playerId,
          success: false,
          message:
            "Ad maksimum 16 simvol ola bilər"
        });
        return;
      }

      const state =
        getOrCreatePlayerState(
          playerId
        );

      oyuncuProfiliniTeminEt(
        state
      );

      if (
        String(
          state.oyuncuAdi || ""
        ).toLowerCase() ===
        yeniAd.toLowerCase()
      ) {
        send(ws, {
          type:
            "player_name_change_result",
          playerId,
          success: false,
          message:
            "Yeni ad cari addan fərqli olmalıdır"
        });
        return;
      }

      state.oyuncuAdi =
        yeniAd;

      updateServerTime(state);

      send(ws, {
        type:
          "player_name_change_result",
        playerId,
        success: true,
        oyuncuAdi:
          yeniAd,
        message:
          "Oyunçu adı dəyişdirildi",
        serverTimeUnixMs:
          nowMs()
      });

      const pushState =
        async () => {
          await pushStateToPlayerConnections(
            playerId,
            state
          );
        };

      if (
        typeof deferAfterCommit ===
          "function"
      ) {
        deferAfterCommit(
          pushState
        );
      }
      else {
        await pushState();
      }
    },
    {
      authRequired: true,
      mutation: true,
      postgresAuthoritative: true
    }
  );

  return router;
}

module.exports = {
  accountCommandleriniQeydEt
};
