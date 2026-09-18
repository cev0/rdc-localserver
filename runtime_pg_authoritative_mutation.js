"use strict";

const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

function kopyala(value) {
  return value == null
    ? value
    : JSON.parse(JSON.stringify(value));
}

function obyektiYerindeEvezEt(
  target,
  source
) {
  if (
    !target ||
    typeof target !== "object" ||
    Array.isArray(target)
  ) {
    throw new Error(
      "Authoritative mutation target state yoxdur."
    );
  }

  const next =
    source &&
    typeof source === "object" &&
    !Array.isArray(source)
      ? kopyala(source)
      : {};

  for (const key of Object.keys(target)) {
    delete target[key];
  }

  Object.assign(
    target,
    next
  );

  return target;
}

function stateBarmaqIziAl(state) {
  try {
    return JSON.stringify(state);
  }
  catch (_) {
    return "";
  }
}

function postgresAuthoritativeMutationExecutorYarat(
  options = {}
) {
  const getOrCreatePlayerState =
    options.getOrCreatePlayerState;

  const transactionExecutor =
    typeof options.transactionExecutor === "function"
      ? options.transactionExecutor
      : oyuncuStateMutasiyasiniPostgresIleIcraEt;

  const prepareLockedState =
    typeof options.prepareLockedState === "function"
      ? options.prepareLockedState
      : null;

  const afterCommit =
    typeof options.afterCommit === "function"
      ? options.afterCommit
      : null;

  if (
    typeof getOrCreatePlayerState !==
    "function"
  ) {
    throw new Error(
      "PostgreSQL authoritative executor üçün getOrCreatePlayerState yoxdur."
    );
  }

  return async function executeAuthoritativeMutation(
    playerId,
    action,
    metadata = {}
  ) {
    if (typeof action !== "function") {
      throw new Error(
        "PostgreSQL authoritative mutation action yoxdur."
      );
    }

    const liveState =
      getOrCreatePlayerState(
        playerId
      );

    if (
      !liveState ||
      typeof liveState !== "object" ||
      Array.isArray(liveState)
    ) {
      throw new Error(
        "PostgreSQL authoritative mutation üçün live state yoxdur."
      );
    }

    const originalLiveState =
      kopyala(liveState);

    const queuedResponses = [];
    const afterCommitCallbacks = [];

    const baseSend =
      typeof metadata.send === "function"
        ? metadata.send
        : null;

    let actionResult;
    let stateChanged = false;

    try {
      await transactionExecutor(
        playerId,
        liveState,
        async (
          lockedState,
          transactionContext = {}
        ) => {
          const before =
            stateBarmaqIziAl(
              lockedState
            );

          /*
           * Vaxtı çatmış build/research/production kimi state keçidləri də
           * eyni PostgreSQL lock daxilində authoritative snapshot üzərində
           * yekunlaşdırılır.
           */
          if (prepareLockedState) {
            await prepareLockedState(
              lockedState,
              playerId,
              metadata
            );
          }

          /*
           * Transaction advisory lock alındıqdan sonra oxunan PostgreSQL
           * snapshot-u həmin request üçün yeganə authoritative başlanğıcdır.
           * Handler-lər mövcud getOrCreatePlayerState API-sini dəyişmədən
           * həmin obyekt üzərində işləsin deyə live object yerində yenilənir.
           */
          obyektiYerindeEvezEt(
            liveState,
            lockedState
          );

          const deferredSend =
            (ws, payload) => {
              queuedResponses.push({
                ws,
                payload:
                  kopyala(payload)
              });

              return true;
            };

          actionResult =
            await action({
              send:
                baseSend
                  ? deferredSend
                  : null,
              transactionContext,
              deferAfterCommit:
                (callback) => {
                  if (
                    typeof callback !==
                    "function"
                  ) {
                    return false;
                  }

                  afterCommitCallbacks.push(
                    callback
                  );

                  return true;
                }
            });

          /*
           * Handler liveState-i mutasiya edib. Eyni yekun state transaction
           * helper-in yazacağı lockedState-ə köçürülür.
           */
          obyektiYerindeEvezEt(
            lockedState,
            liveState
          );

          const after =
            stateBarmaqIziAl(
              lockedState
            );

          stateChanged =
            before !== after;

          return {
            deyisdi:
              stateChanged
          };
        }
      );
    }
    catch (error) {
      /*
       * DB rollback zamanı handler-in RAM-da etdiyi dəyişiklik qalmasın.
       */
      obyektiYerindeEvezEt(
        liveState,
        originalLiveState
      );

      throw error;
    }

    /*
     * Success/state cavabları yalnız COMMIT-dən sonra client-ə çıxır.
     * Beləliklə DB rollback olmuş əməliyyat client-də uğurlu görünmür.
     */
    if (baseSend) {
      for (
        const item of
        queuedResponses
      ) {
        baseSend(
          item.ws,
          item.payload
        );
      }
    }

    for (
      const callback of
      afterCommitCallbacks
    ) {
      await callback();
    }

    if (afterCommit) {
      await afterCommit(
        playerId,
        liveState,
        {
          type:
            metadata.type || "",
          msg:
            metadata.msg || null,
          changed:
            stateChanged
        }
      );
    }

    return actionResult;
  };
}

module.exports = {
  kopyala,
  obyektiYerindeEvezEt,
  postgresAuthoritativeMutationExecutorYarat
};
