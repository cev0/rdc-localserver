"use strict";

const WORLD_STATE_CENTER_LOCK_NAME =
  "world_state_center_v1";

function tamEdedAl(value, fallback = 0) {
  const n = Number(value);

  return Number.isFinite(n)
    ? Math.max(
        0,
        Math.trunc(n)
      )
    : fallback;
}

function metnAl(value, max = 128) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function stateIdAl(value) {
  const stateId =
    tamEdedAl(value);

  if (stateId <= 0) {
    throw new Error(
      "Dövlət mərkəzi üçün etibarlı stateId tələb olunur."
    );
  }

  return stateId;
}

async function worldStateCenterKilidiniAl(
  client,
  stateId
) {
  if (
    !client ||
    typeof client.query !==
      "function"
  ) {
    throw new Error(
      "Dövlət mərkəzi transaction client-i yoxdur."
    );
  }

  const sid =
    stateIdAl(stateId);

  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext($1))",
    [
      WORLD_STATE_CENTER_LOCK_NAME +
      ":" +
      sid
    ]
  );

  return sid;
}

async function worldStateCenterMetadataAlClient(
  client,
  stateId
) {
  const sid =
    stateIdAl(stateId);

  const result =
    await client.query(
      `
      SELECT
        state_id,
        center_unlock_at_ms,
        president_player_id,
        president_alliance_id,
        center_occupied_at_ms,
        revision
      FROM dovlet_world_state_runtime
      WHERE state_id = $1
      LIMIT 1
      `,
      [sid]
    );

  const row =
    result &&
    Array.isArray(result.rows) &&
    result.rows.length > 0
      ? result.rows[0]
      : null;

  if (!row) {
    return null;
  }

  return {
    stateId:
      tamEdedAl(
        row.state_id
      ),
    centerUnlockAtMs:
      tamEdedAl(
        row.center_unlock_at_ms
      ),
    presidentPlayerId:
      metnAl(
        row.president_player_id
      ),
    presidentAllianceId:
      metnAl(
        row.president_alliance_id
      ),
    occupiedAtMs:
      tamEdedAl(
        row.center_occupied_at_ms
      ),
    revision:
      tamEdedAl(
        row.revision
      )
  };
}

async function occupyStateCenterPostgresClient(
  client,
  options = {}
) {
  const stateId =
    stateIdAl(
      options.stateId
    );

  const playerId =
    metnAl(
      options.playerId
    );

  if (!playerId) {
    return {
      success: false,
      errorCode:
        "STATE_CENTER_PLAYER_REQUIRED",
      message:
        "Dövlət mərkəzi üçün playerId tələb olunur."
    };
  }

  const allianceId =
    metnAl(
      options.allianceId
    );

  const nowMs =
    tamEdedAl(
      options.nowMs,
      Date.now()
    );

  const centerUnlockAtMs =
    tamEdedAl(
      options.centerUnlockAtMs,
      nowMs
    );

  await worldStateCenterKilidiniAl(
    client,
    stateId
  );

  /*
   * İlk yazan instance Dövlətin unlock vaxtını persistent edir.
   * Sonrakı instanslar öz RAM tarixləri ilə həmin dəyəri overwrite etmir.
   */
  await client.query(
    `
    INSERT INTO dovlet_world_state_runtime (
      state_id,
      center_unlock_at_ms,
      president_player_id,
      president_alliance_id,
      center_occupied_at_ms,
      revision,
      yenilenme_vaxti
    )
    VALUES ($1, $2, '', '', 0, 0, NOW())
    ON CONFLICT (state_id) DO NOTHING
    `,
    [
      stateId,
      centerUnlockAtMs
    ]
  );

  const current =
    await worldStateCenterMetadataAlClient(
      client,
      stateId
    );

  if (!current) {
    throw new Error(
      "Dövlət mərkəzi persistent metadata sətri yaradıla bilmədi."
    );
  }

  if (
    nowMs <
    current.centerUnlockAtMs
  ) {
    return {
      success: false,
      errorCode:
        "STATE_CENTER_LOCKED",
      message:
        "State center is not unlocked yet",
      stateId,
      centerUnlockAtMs:
        current.centerUnlockAtMs
    };
  }

  const updated =
    await client.query(
      `
      UPDATE dovlet_world_state_runtime
      SET
        president_player_id = $2,
        president_alliance_id = $3,
        center_occupied_at_ms = $4,
        revision = revision + 1,
        yenilenme_vaxti = NOW()
      WHERE state_id = $1
      RETURNING
        state_id,
        center_unlock_at_ms,
        president_player_id,
        president_alliance_id,
        center_occupied_at_ms,
        revision
      `,
      [
        stateId,
        playerId,
        allianceId,
        nowMs
      ]
    );

  const row =
    updated &&
    Array.isArray(updated.rows) &&
    updated.rows.length > 0
      ? updated.rows[0]
      : null;

  if (!row) {
    throw new Error(
      "Dövlət mərkəzi ownership yazısı yenilənmədi."
    );
  }

  return {
    success: true,
    stateId:
      tamEdedAl(
        row.state_id
      ),
    occupiedByPlayerId:
      metnAl(
        row.president_player_id
      ),
    occupiedByAllianceId:
      metnAl(
        row.president_alliance_id
      ),
    occupiedAtMs:
      tamEdedAl(
        row.center_occupied_at_ms
      ),
    centerUnlockAtMs:
      tamEdedAl(
        row.center_unlock_at_ms
      ),
    revision:
      tamEdedAl(
        row.revision
      )
  };
}

module.exports = {
  WORLD_STATE_CENTER_LOCK_NAME,
  worldStateCenterKilidiniAl,
  worldStateCenterMetadataAlClient,
  occupyStateCenterPostgresClient
};
