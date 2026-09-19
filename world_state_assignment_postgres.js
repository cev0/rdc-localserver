"use strict";

const crypto = require("crypto");

const {
  sorguEt
} = require("./verilenler_bazasi");
const {
  SNAPSHOT_HADISE_NOVU
} = require("./oyun_state_snapshot_postgres");

const WORLD_STATE_ASSIGNMENT_LOCK_NAME =
  "world_state_assignment_v1";

const DEFAULT_STATE_SOFT_CAP = 200;
const DEFAULT_CENTER_UNLOCK_DELAY_MS =
  30 * 24 * 60 * 60 * 1000;

const DEFAULT_MAP_CONFIG = Object.freeze({
  width: 1024,
  height: 1024,
  centerX: 512,
  centerZ: 512,
  spawnMinRadius: 330,
  spawnMaxRadius: 460,
  minBaseDistance: 18,
  maxSpawnAttempts: 300
});

function metnAl(
  value,
  max = 128
) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function tamEded(
  value,
  fallback = 0
) {
  const n = Number(value);

  return Number.isFinite(n)
    ? Math.max(
        0,
        Math.trunc(n)
      )
    : fallback;
}

function stateIdAl(value) {
  const sid =
    tamEded(value);

  return sid > 0
    ? sid
    : 0;
}

function worldStatePlacementEtibarlidir(
  state
) {
  const placement =
    state &&
    state.worldPlacement;

  if (
    !placement ||
    typeof placement !== "object"
  ) {
    return false;
  }

  const sid =
    stateIdAl(
      placement.stateId
    );

  const x =
    Number(
      placement.baseX
    );

  const z =
    Number(
      placement.baseZ
    );

  return !!(
    sid &&
    Number.isFinite(x) &&
    Number.isFinite(z)
  );
}

function metadataHazirla(row) {
  if (!row) {
    return null;
  }

  const stateId =
    stateIdAl(
      row.state_id
    );

  if (!stateId) {
    return null;
  }

  return {
    stateId,
    createdAtMs:
      tamEded(
        row.created_at_ms
      ),
    centerUnlockAtMs:
      tamEded(
        row.center_unlock_at_ms
      ),
    displayName:
      metnAl(
        row.display_name,
        96
      ) ||
      "State#" + stateId,
    isOpen:
      row.is_open !== false,
    presidentPlayerId:
      metnAl(
        row.president_player_id,
        128
      ),
    presidentAllianceId:
      metnAl(
        row.president_alliance_id,
        128
      ),
    occupiedAtMs:
      tamEded(
        row.center_occupied_at_ms
      ),
    revision:
      tamEded(
        row.revision
      )
  };
}

async function worldStateAssignmentKilidiniAl(
  client
) {
  if (
    !client ||
    typeof client.query !==
      "function"
  ) {
    throw new Error(
      "Dövlət assignment transaction client-i yoxdur."
    );
  }

  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext($1))",
    [
      WORLD_STATE_ASSIGNMENT_LOCK_NAME
    ]
  );

  return true;
}

async function worldStateMetadatalariniAlClient(
  client
) {
  if (
    !client ||
    typeof client.query !==
      "function"
  ) {
    throw new Error(
      "Dövlət metadata transaction client-i yoxdur."
    );
  }

  const result =
    await client.query(
      `
      SELECT
        state_id,
        created_at_ms,
        center_unlock_at_ms,
        display_name,
        is_open,
        president_player_id,
        president_alliance_id,
        center_occupied_at_ms,
        revision
      FROM dovlet_world_state_runtime
      ORDER BY state_id ASC
      `
    );

  return (
    result &&
    Array.isArray(result.rows)
      ? result.rows
      : []
  )
    .map(metadataHazirla)
    .filter(Boolean);
}

async function worldStateMetadatalariniAl() {
  const result =
    await sorguEt(
      `
      SELECT
        state_id,
        created_at_ms,
        center_unlock_at_ms,
        display_name,
        is_open,
        president_player_id,
        president_alliance_id,
        center_occupied_at_ms,
        revision
      FROM dovlet_world_state_runtime
      ORDER BY state_id ASC
      `
    );

  return (
    result &&
    Array.isArray(result.rows)
      ? result.rows
      : []
  )
    .map(metadataHazirla)
    .filter(Boolean);
}

async function worldStateMetadataTeminEtClient(
  client,
  stateId,
  nowMs = Date.now(),
  options = {}
) {
  const sid =
    stateIdAl(
      stateId
    );

  if (!sid) {
    throw new Error(
      "Dövlət metadata üçün stateId yoxdur."
    );
  }

  const now =
    tamEded(
      nowMs,
      Date.now()
    ) ||
    Date.now();

  const unlockDelay =
    Math.max(
      0,
      tamEded(
        options.centerUnlockDelayMs,
        DEFAULT_CENTER_UNLOCK_DELAY_MS
      )
    );

  const createdAtMs =
    Math.max(
      0,
      tamEded(
        options.createdAtMs,
        now
      )
    );

  const centerUnlockAtMs =
    Math.max(
      createdAtMs,
      tamEded(
        options.centerUnlockAtMs,
        createdAtMs + unlockDelay
      )
    );

  const displayName =
    metnAl(
      options.displayName,
      96
    ) ||
    "State#" + sid;

  await client.query(
    `
    INSERT INTO dovlet_world_state_runtime (
      state_id,
      created_at_ms,
      center_unlock_at_ms,
      display_name,
      is_open,
      president_player_id,
      president_alliance_id,
      center_occupied_at_ms,
      revision,
      yenilenme_vaxti
    )
    VALUES (
      $1, $2, $3, $4, TRUE,
      '', '', 0, 0, NOW()
    )
    ON CONFLICT (state_id) DO NOTHING
    `,
    [
      sid,
      createdAtMs,
      centerUnlockAtMs,
      displayName
    ]
  );

  /*
   * Köhnə center-only sətirlər assignment miqrasiyasından sonra 0/boş
   * metadata ilə qala bilər. İlk authoritative allocator onları bir dəfə
   * doldurur, amma mövcud unlock vaxtını dəyişmir.
   */
  await client.query(
    `
    UPDATE dovlet_world_state_runtime
    SET
      created_at_ms =
        CASE
          WHEN created_at_ms = 0
            THEN $2
          ELSE created_at_ms
        END,
      display_name =
        CASE
          WHEN display_name = ''
            THEN $4
          ELSE display_name
        END,
      yenilenme_vaxti = NOW()
    WHERE state_id = $1
      AND (
        created_at_ms = 0 OR
        display_name = ''
      )
    `,
    [
      sid,
      createdAtMs,
      centerUnlockAtMs,
      displayName
    ]
  );

  const result =
    await client.query(
      `
      SELECT
        state_id,
        created_at_ms,
        center_unlock_at_ms,
        display_name,
        is_open,
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
    Array.isArray(result.rows)
      ? result.rows[0]
      : null;

  const metadata =
    metadataHazirla(
      row
    );

  if (!metadata) {
    throw new Error(
      "Dövlət persistent metadata sətri yaradıla bilmədi."
    );
  }

  return metadata;
}

const WORLD_STATE_PLAYER_COUNTS_SQL =
  `
  WITH son_snapshot AS (
    SELECT DISTINCT ON (oyuncu_id)
      oyuncu_id,
      detallar
    FROM hesab_audit_jurnali
    WHERE hadise_novu = $1
    ORDER BY oyuncu_id, id DESC
  )
  SELECT
    (detallar #>> '{state,worldPlacement,stateId}')::integer AS state_id,
    COUNT(*)::integer AS player_count
  FROM son_snapshot
  WHERE
    detallar #>> '{state,worldPlacement,stateId}'
      ~ '^[1-9][0-9]*$'
  GROUP BY
    (detallar #>> '{state,worldPlacement,stateId}')::integer
  ORDER BY state_id ASC
  `;

function worldStatePlayerSayNeticesiniHazirla(
  result
) {
  const counts =
    new Map();

  for (
    const row of
    result &&
    Array.isArray(result.rows)
      ? result.rows
      : []
  ) {
    const sid =
      stateIdAl(
        row.state_id
      );

    if (!sid) {
      continue;
    }

    counts.set(
      sid,
      tamEded(
        row.player_count
      )
    );
  }

  return counts;
}

async function worldStatePlayerSaylariniAlClient(
  client
) {
  if (
    !client ||
    typeof client.query !==
      "function"
  ) {
    throw new Error(
      "Dövlət player count transaction client-i yoxdur."
    );
  }

  const result =
    await client.query(
      WORLD_STATE_PLAYER_COUNTS_SQL,
      [
        SNAPSHOT_HADISE_NOVU
      ]
    );

  return worldStatePlayerSayNeticesiniHazirla(
    result
  );
}

async function worldStatePlayerSaylariniAl() {
  const result =
    await sorguEt(
      WORLD_STATE_PLAYER_COUNTS_SQL,
      [
        SNAPSHOT_HADISE_NOVU
      ]
    );

  return worldStatePlayerSayNeticesiniHazirla(
    result
  );
}

async function worldStateBazalariniAlClient(
  client,
  stateId,
  exceptPlayerId = ""
) {
  const sid =
    stateIdAl(
      stateId
    );

  if (!sid) {
    return [];
  }

  const result =
    await client.query(
      `
      WITH son_snapshot AS (
        SELECT DISTINCT ON (oyuncu_id)
          oyuncu_id,
          detallar
        FROM hesab_audit_jurnali
        WHERE hadise_novu = $1
        ORDER BY oyuncu_id, id DESC
      )
      SELECT
        oyuncu_id,
        detallar #>> '{state,worldPlacement,baseX}' AS base_x,
        detallar #>> '{state,worldPlacement,baseZ}' AS base_z
      FROM son_snapshot
      WHERE
        detallar #>> '{state,worldPlacement,stateId}' = $2
      ORDER BY oyuncu_id ASC
      `,
      [
        SNAPSHOT_HADISE_NOVU,
        String(sid)
      ]
    );

  const exceptId =
    metnAl(
      exceptPlayerId,
      128
    ).toLowerCase();

  const bases = [];

  for (
    const row of
    result &&
    Array.isArray(result.rows)
      ? result.rows
      : []
  ) {
    const playerId =
      metnAl(
        row.oyuncu_id,
        128
      ).toLowerCase();

    if (
      exceptId &&
      playerId === exceptId
    ) {
      continue;
    }

    const baseX =
      Number(
        row.base_x
      );

    const baseZ =
      Number(
        row.base_z
      );

    if (
      !Number.isFinite(baseX) ||
      !Number.isFinite(baseZ)
    ) {
      continue;
    }

    bases.push({
      playerId,
      baseX,
      baseZ
    });
  }

  return bases;
}

function random01Default() {
  if (
    typeof crypto.randomInt ===
      "function"
  ) {
    return crypto.randomInt(
      0,
      0x1000000
    ) / 0x1000000;
  }

  return Math.random();
}

function spawnNamizediniYarat(
  config,
  randomFn
) {
  const angle =
    randomFn() *
    Math.PI *
    2;

  const radius =
    config.spawnMinRadius +
    (
      randomFn() *
      Math.max(
        0,
        config.spawnMaxRadius -
        config.spawnMinRadius
      )
    );

  return {
    baseX:
      Math.round(
        config.centerX +
        Math.cos(angle) *
        radius
      ),
    baseZ:
      Math.round(
        config.centerZ +
        Math.sin(angle) *
        radius
      )
  };
}

function spawnUyqundur(
  candidate,
  bases,
  config
) {
  if (
    candidate.baseX < 0 ||
    candidate.baseX >=
      config.width ||
    candidate.baseZ < 0 ||
    candidate.baseZ >=
      config.height
  ) {
    return false;
  }

  const dxCenter =
    candidate.baseX -
    config.centerX;

  const dzCenter =
    candidate.baseZ -
    config.centerZ;

  const centerDistanceSq =
    dxCenter * dxCenter +
    dzCenter * dzCenter;

  if (
    centerDistanceSq <
    config.minBaseDistance *
    config.minBaseDistance
  ) {
    return false;
  }

  const minDistanceSq =
    config.minBaseDistance *
    config.minBaseDistance;

  for (const base of bases) {
    const dx =
      candidate.baseX -
      Number(base.baseX);

    const dz =
      candidate.baseZ -
      Number(base.baseZ);

    if (
      dx * dx +
      dz * dz <
      minDistanceSq
    ) {
      return false;
    }
  }

  return true;
}

function spawnSec(
  bases,
  options = {}
) {
  const rawConfig =
    options.mapConfig &&
    typeof options.mapConfig ===
      "object"
      ? options.mapConfig
      : {};

  const config = {
    ...DEFAULT_MAP_CONFIG,
    ...rawConfig
  };

  const randomFn =
    typeof options.randomFn ===
      "function"
      ? options.randomFn
      : random01Default;

  for (
    let attempt = 0;
    attempt <
      config.maxSpawnAttempts;
    attempt += 1
  ) {
    const candidate =
      spawnNamizediniYarat(
        config,
        randomFn
      );

    if (
      spawnUyqundur(
        candidate,
        bases,
        config
      )
    ) {
      return {
        ...candidate,
        spawnZone: "outer"
      };
    }
  }

  /*
   * Random cəhdlər uğursuz olsa deterministik grid scan fallback işləyir.
   * Bu, dolmağa yaxın State-də auth-un təsadüfi olaraq fail olmasının qarşısını alır.
   */
  const step =
    Math.max(
      config.minBaseDistance,
      1
    );

  for (
    let z = 0;
    z < config.height;
    z += step
  ) {
    for (
      let x = 0;
      x < config.width;
      x += step
    ) {
      const dx =
        x -
        config.centerX;

      const dz =
        z -
        config.centerZ;

      const radius =
        Math.sqrt(
          dx * dx +
          dz * dz
        );

      if (
        radius <
          config.spawnMinRadius ||
        radius >
          config.spawnMaxRadius
      ) {
        continue;
      }

      const candidate = {
        baseX: x,
        baseZ: z
      };

      if (
        spawnUyqundur(
          candidate,
          bases,
          config
        )
      ) {
        return {
          ...candidate,
          spawnZone: "outer"
        };
      }
    }
  }

  throw new Error(
    "Dövlət xəritəsində təhlükəsiz yeni baza mövqeyi tapılmadı."
  );
}

async function worldStatePlacementiniTeminEtClient(
  client,
  state,
  playerId,
  nowMs = Date.now(),
  options = {}
) {
  const oyuncuId =
    metnAl(
      playerId ||
      (state && state.playerId),
      128
    ).toLowerCase();

  if (!oyuncuId) {
    throw new Error(
      "Dövlət assignment üçün playerId yoxdur."
    );
  }

  if (
    !state ||
    typeof state !== "object" ||
    Array.isArray(state)
  ) {
    throw new Error(
      "Dövlət assignment üçün player state yoxdur."
    );
  }

  if (
    options.force !== true &&
    worldStatePlacementEtibarlidir(
      state
    )
  ) {
    return {
      success: true,
      deyisdi: false,
      stateId:
        stateIdAl(
          state.worldPlacement.stateId
        ),
      placement:
        JSON.parse(
          JSON.stringify(
            state.worldPlacement
          )
        )
    };
  }

  await worldStateAssignmentKilidiniAl(
    client
  );

  const now =
    tamEded(
      nowMs,
      Date.now()
    ) ||
    Date.now();

  let metadataList =
    await worldStateMetadatalariniAlClient(
      client
    );

  if (
    metadataList.length === 0
  ) {
    metadataList = [
      await worldStateMetadataTeminEtClient(
        client,
        1,
        now,
        options
      )
    ];
  }

  const counts =
    await worldStatePlayerSaylariniAlClient(
      client
    );

  const allStateIds =
    metadataList.map(
      item =>
        item.stateId
    );

  let active =
    metadataList
      .filter(
        item =>
          item.isOpen !== false
      )
      .sort(
        (a, b) =>
          b.stateId -
          a.stateId
      )[0] ||
    null;

  const softCap =
    Math.max(
      1,
      tamEded(
        options.softCap,
        DEFAULT_STATE_SOFT_CAP
      ) ||
      DEFAULT_STATE_SOFT_CAP
    );

  if (
    !active ||
    (
      counts.get(
        active.stateId
      ) ||
      0
    ) >= softCap
  ) {
    const nextStateId =
      Math.max(
        0,
        ...allStateIds
      ) + 1;

    active =
      await worldStateMetadataTeminEtClient(
        client,
        nextStateId,
        now,
        options
      );

    metadataList = [
      ...metadataList,
      active
    ];
  }

  const bases =
    await worldStateBazalariniAlClient(
      client,
      active.stateId,
      oyuncuId
    );

  const spawn =
    spawnSec(
      bases,
      options
    );

  const placement = {
    stateId:
      active.stateId,
    stateName:
      active.displayName,
    baseX:
      spawn.baseX,
    baseZ:
      spawn.baseZ,
    spawnZone:
      spawn.spawnZone,
    currentZone:
      spawn.spawnZone,
    stateCreatedAtMs:
      active.createdAtMs,
    centerUnlockAtMs:
      active.centerUnlockAtMs,
    centerBuildingX:
      (
        options.mapConfig &&
        Number(
          options.mapConfig.centerX
        )
      ) ||
      DEFAULT_MAP_CONFIG.centerX,
    centerBuildingZ:
      (
        options.mapConfig &&
        Number(
          options.mapConfig.centerZ
        )
      ) ||
      DEFAULT_MAP_CONFIG.centerZ,
    activeStateIdForNewPlayers:
      active.stateId,
    assignmentAuthority:
      "postgres_v1",
    assignedAtMs:
      now
  };

  state.worldPlacement =
    placement;

  state.worldMap = {
    ...(
      state.worldMap &&
      typeof state.worldMap ===
        "object"
        ? state.worldMap
        : {}
    ),
    activeStateIdForNewPlayers:
      active.stateId,
    currentStateId:
      active.stateId
  };

  return {
    success: true,
    deyisdi: true,
    stateId:
      active.stateId,
    placement:
      JSON.parse(
        JSON.stringify(
          placement
        )
      ),
    metadata:
      JSON.parse(
        JSON.stringify(
          active
        )
      ),
    globalPlayerCountBefore:
      counts.get(
        active.stateId
      ) ||
      0
  };
}

module.exports = {
  WORLD_STATE_ASSIGNMENT_LOCK_NAME,
  DEFAULT_STATE_SOFT_CAP,
  DEFAULT_CENTER_UNLOCK_DELAY_MS,
  DEFAULT_MAP_CONFIG,
  worldStatePlacementEtibarlidir,
  worldStateAssignmentKilidiniAl,
  worldStateMetadatalariniAlClient,
  worldStateMetadatalariniAl,
  worldStateMetadataTeminEtClient,
  worldStatePlayerSayNeticesiniHazirla,
  worldStatePlayerSaylariniAlClient,
  worldStatePlayerSaylariniAl,
  worldStateBazalariniAlClient,
  spawnUyqundur,
  spawnSec,
  worldStatePlacementiniTeminEtClient
};
