"use strict";

// Mövcud teleport lock namespace-i saxlanılır ki rolling deploy zamanı
// köhnə instanslarla yeni state-level transaction-lar eyni advisory lock-u paylaşsın.
const WORLD_STATE_MUTATION_LOCK_NAME =
  "worldv2_baza_teleport_state_v1";

const WORLD_STATE_TELEPORT_LOCK_NAME =
  WORLD_STATE_MUTATION_LOCK_NAME;

function stateIdAl(value) {
  const n = Number(value);

  if (
    !Number.isInteger(n) ||
    n <= 0
  ) {
    throw new Error(
      "World state transaction üçün etibarlı stateId tələb olunur."
    );
  }

  return n;
}

async function worldStateMutationKilidiniAl(
  client,
  stateId
) {
  if (
    !client ||
    typeof client.query !==
      "function"
  ) {
    throw new Error(
      "World state transaction client-i yoxdur."
    );
  }

  const sid =
    stateIdAl(stateId);

  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext($1))",
    [
      WORLD_STATE_MUTATION_LOCK_NAME +
      ":" +
      sid
    ]
  );

  return sid;
}

async function worldStateTeleportKilidiniAl(
  client,
  stateId
) {
  return await worldStateMutationKilidiniAl(
    client,
    stateId
  );
}

module.exports = {
  WORLD_STATE_MUTATION_LOCK_NAME,
  WORLD_STATE_TELEPORT_LOCK_NAME,
  worldStateMutationKilidiniAl,
  worldStateTeleportKilidiniAl
};
