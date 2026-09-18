"use strict";

const WORLD_STATE_TELEPORT_LOCK_NAME =
  "worldv2_baza_teleport_state_v1";

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

async function worldStateTeleportKilidiniAl(
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
      WORLD_STATE_TELEPORT_LOCK_NAME +
      ":" +
      sid
    ]
  );

  return sid;
}

module.exports = {
  WORLD_STATE_TELEPORT_LOCK_NAME,
  worldStateTeleportKilidiniAl
};
