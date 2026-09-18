"use strict";

const {
  oyunStateSnapshotiniYaz
} = require("./oyun_state_snapshot_postgres");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

const berpaOlunmusOyuncular =
  new Set();

const berpaPromiseByPlayerId =
  new Map();

function metnAl(
  deyer,
  maksimum = 128
) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

async function oyunStateIniBerpaEt(
  kontekst,
  playerId,
  secimler = null
) {
  const oyuncuId =
    metnAl(
      playerId,
      128
    );

  if (
    !oyuncuId ||
    !kontekst ||
    typeof kontekst.getOrCreatePlayerState !==
      "function"
  ) {
    return false;
  }

  const options =
    secimler &&
    typeof secimler ===
      "object"
      ? secimler
      : {};

  const force =
    options.force === true;

  if (force) {
    berpaOlunmusOyuncular
      .delete(
        oyuncuId
      );
  }
  else if (
    berpaOlunmusOyuncular
      .has(
        oyuncuId
      )
  ) {
    return false;
  }

  const movcudPromise =
    berpaPromiseByPlayerId
      .get(
        oyuncuId
      );

  if (movcudPromise) {
    const netice =
      await movcudPromise;

    if (!force) {
      return netice;
    }

    /*
     * Force invalidation əvvəlki restore gedərkən gəlibsə həmin restore
     * artıq köhnə snapshot oxumuş ola bilər. Ona görə force çağırışı
     * mövcud işi gözləyib bir dəfə də authoritative PG lock altında oxuyur.
     */
    berpaOlunmusOyuncular
      .delete(
        oyuncuId
      );
  }

  const transactionExecutor =
    typeof options.transactionExecutor ===
      "function"
      ? options.transactionExecutor
      : oyuncuStateMutasiyasiniPostgresIleIcraEt;

  const promise =
    (async () => {
      const state =
        kontekst
          .getOrCreatePlayerState(
            oyuncuId
          );

      let snapshotVar =
        false;

      await transactionExecutor(
        oyuncuId,
        state,
        async (
          _lockedState,
          transactionContext = {}
        ) => {
          snapshotVar =
            transactionContext
              .sonSnapshotVar ===
            true;

          return {
            deyisdi: false
          };
        },
        options.transactionOptions ||
          null
      );

      const finalState =
        kontekst
          .getOrCreatePlayerState(
            oyuncuId
          );

      if (
        typeof kontekst.updateServerTime ===
          "function"
      ) {
        kontekst
          .updateServerTime(
            finalState
          );
      }

      berpaOlunmusOyuncular
        .add(
          oyuncuId
        );

      return snapshotVar;
    })();

  berpaPromiseByPlayerId.set(
    oyuncuId,
    promise
  );

  try {
    return await promise;
  }
  finally {
    if (
      berpaPromiseByPlayerId.get(
        oyuncuId
      ) === promise
    ) {
      berpaPromiseByPlayerId
        .delete(
          oyuncuId
        );
    }
  }
}

async function oyunStateIniYaddaSaxla(
  playerId,
  state
) {
  const oyuncuId =
    metnAl(
      playerId,
      128
    );

  if (
    !oyuncuId ||
    !state ||
    typeof state !== "object"
  ) {
    return false;
  }

  await oyunStateSnapshotiniYaz(
    oyuncuId,
    state
  );

  berpaOlunmusOyuncular
    .add(
      oyuncuId
    );

  return true;
}

function oyuncuStateBerpaOlunub(
  playerId
) {
  return berpaOlunmusOyuncular.has(
    metnAl(
      playerId,
      128
    )
  );
}

function oyuncuStateBerpasiniKohneIsarele(
  playerId
) {
  const oyuncuId =
    metnAl(
      playerId,
      128
    );

  if (!oyuncuId) {
    return false;
  }

  return berpaOlunmusOyuncular
    .delete(
      oyuncuId
    );
}

module.exports = {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub,
  oyuncuStateBerpasiniKohneIsarele
};
