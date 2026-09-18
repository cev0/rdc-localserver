"use strict";

const {
  ikiOyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./iki_oyuncu_state_mutasiya_postgres");
const {
  worldStateMutationKilidiniAl
} = require("./world_state_transaction_lock");

function stateIdAl(state) {
  const n = Number(
    state &&
    state.worldPlacement &&
    state.worldPlacement.stateId
  );

  return Number.isInteger(n) &&
    n > 0
      ? n
      : 0;
}

function ilkinStateIdAl(
  rawBirinci,
  rawIkinci,
  options
) {
  const explicit =
    Number(
      options &&
      options.stateId
    );

  if (
    Number.isInteger(explicit) &&
    explicit > 0
  ) {
    return explicit;
  }

  const birinciStateId =
    stateIdAl(
      rawBirinci &&
      rawBirinci.cariState
    );

  const ikinciStateId =
    stateIdAl(
      rawIkinci &&
      rawIkinci.cariState
    );

  if (
    birinciStateId > 0 &&
    ikinciStateId > 0 &&
    birinciStateId !==
      ikinciStateId
  ) {
    throw new Error(
      "Shared-world iki-oyunçu transaction canlı state-ləri fərqli Dövlətdədir."
    );
  }

  return birinciStateId ||
    ikinciStateId ||
    0;
}

class WorldStateRetryError extends Error {
  constructor(stateId) {
    super(
      "Shared-world iki-oyunçu transaction authoritative stateId dəyişib."
    );

    this.name =
      "WorldStateRetryError";

    this.stateId =
      stateId;
  }
}

async function worldStateIkiOyuncuMutasiyasiniPostgresIleIcraEt(
  rawBirinci,
  rawIkinci,
  emeliyyat,
  secimler = null
) {
  if (typeof emeliyyat !== "function") {
    throw new Error(
      "Shared-world iki-oyunçu mutation əməliyyatı yoxdur."
    );
  }

  const options =
    secimler &&
    typeof secimler === "object"
      ? secimler
      : {};

  const stateLockFn =
    typeof options.worldStateLockFn === "function"
      ? options.worldStateLockFn
      : worldStateMutationKilidiniAl;

  const originalTransactionHazirla =
    typeof options.transactionHazirla === "function"
      ? options.transactionHazirla
      : null;

  const originalLockedStatesYoxla =
    typeof options.lockedStatesYoxla === "function"
      ? options.lockedStatesYoxla
      : null;

  const maxAttempts =
    Math.max(
      1,
      Math.min(
        5,
        Math.trunc(
          Number(
            options.maxStateResolveAttempts
          ) || 3
        )
      )
    );

  let targetStateId =
    ilkinStateIdAl(
      rawBirinci,
      rawIkinci,
      options
    );

  if (!targetStateId) {
    throw new Error(
      "Shared-world iki-oyunçu transaction üçün stateId yoxdur."
    );
  }

  for (
    let attempt = 0;
    attempt < maxAttempts;
    attempt += 1
  ) {
    try {
      const runnerOptions = {
        ...options,

        transactionHazirla:
          async (
            client,
            context
          ) => {
            await stateLockFn(
              client,
              targetStateId
            );

            const extra =
              originalTransactionHazirla
                ? await originalTransactionHazirla(
                    client,
                    {
                      ...context,
                      worldStateId:
                        targetStateId,
                      worldStateLockHeld:
                        true
                    }
                  )
                : null;

            return {
              worldStateId:
                targetStateId,
              worldStateLockHeld:
                true,
              extra
            };
          },

        lockedStatesYoxla:
          async (
            stateler,
            context
          ) => {
            const ids =
              context.playerIds.map(
                playerId =>
                  stateIdAl(
                    stateler[playerId]
                  )
              );

            if (
              ids.some(
                stateId =>
                  stateId <= 0
              )
            ) {
              throw new Error(
                "Shared-world iki-oyunçu transaction authoritative stateId tapmadı."
              );
            }

            const unique =
              Array.from(
                new Set(ids)
              );

            if (
              unique.length !== 1
            ) {
              throw new Error(
                "Shared-world iki-oyunçu transaction tərəfləri artıq eyni Dövlətdə deyil."
              );
            }

            const authoritativeStateId =
              unique[0];

            if (
              authoritativeStateId !==
              targetStateId
            ) {
              throw new WorldStateRetryError(
                authoritativeStateId
              );
            }

            if (originalLockedStatesYoxla) {
              await originalLockedStatesYoxla(
                stateler,
                {
                  ...context,
                  worldStateId:
                    targetStateId,
                  worldStateLockHeld:
                    true
                }
              );
            }
          }
      };

      delete runnerOptions.worldStateLockFn;
      delete runnerOptions.maxStateResolveAttempts;
      delete runnerOptions.stateId;

      return await ikiOyuncuStateMutasiyasiniPostgresIleIcraEt(
        rawBirinci,
        rawIkinci,
        async (
          stateler,
          transaction
        ) =>
          await emeliyyat(
            stateler,
            {
              ...transaction,
              worldStateId:
                targetStateId,
              worldStateLockHeld:
                true
            }
          ),
        runnerOptions
      );
    }
    catch (error) {
      if (
        error instanceof
          WorldStateRetryError &&
        error.stateId > 0
      ) {
        targetStateId =
          error.stateId;

        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "Shared-world iki-oyunçu transaction stateId sabitləşmədi."
  );
}

module.exports = {
  stateIdAl,
  worldStateIkiOyuncuMutasiyasiniPostgresIleIcraEt
};
