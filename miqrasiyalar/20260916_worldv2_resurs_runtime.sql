BEGIN;

-- WorldV2 resurslarının dinamik vəziyyəti artıq ayrıca sətirlərdə saxlanıla bilər.
-- Statik resourceId/level/zone məlumatı deterministik kataloqdan hesablanır və burada təkrarlanmır.
CREATE TABLE IF NOT EXISTS dovlet_worldv2_resurs_runtime (
    state_id INTEGER NOT NULL CHECK (state_id > 0),
    node_index INTEGER NOT NULL CHECK (node_index > 0),
    spawn_serial INTEGER NOT NULL DEFAULT 1 CHECK (spawn_serial > 0),
    x SMALLINT NOT NULL CHECK (x BETWEEN 0 AND 1200),
    y SMALLINT NOT NULL CHECK (y BETWEEN 0 AND 1200),
    remaining_amount INTEGER NOT NULL DEFAULT 0 CHECK (remaining_amount >= 0),
    occupied_by_player_id TEXT NOT NULL DEFAULT '',
    occupied_by_convoy_id TEXT NOT NULL DEFAULT '',
    occupied_until_ms BIGINT NOT NULL DEFAULT 0 CHECK (occupied_until_ms >= 0),
    respawn_at_ms BIGINT NOT NULL DEFAULT 0 CHECK (respawn_at_ms >= 0),
    last_spawn_at_ms BIGINT NOT NULL DEFAULT 0 CHECK (last_spawn_at_ms >= 0),
    yenilenme_vaxti TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (state_id, node_index)
);

-- Kamera düzbucaqlısı yalnız canlı resursları oxuyur; bütün 80k kataloq skan edilmir.
CREATE INDEX IF NOT EXISTS idx_worldv2_resurs_viewport
ON dovlet_worldv2_resurs_runtime (state_id, x, y, node_index)
WHERE remaining_amount > 0 AND respawn_at_ms = 0;

CREATE INDEX IF NOT EXISTS idx_worldv2_resurs_respawn
ON dovlet_worldv2_resurs_runtime (state_id, respawn_at_ms)
WHERE respawn_at_ms > 0;

CREATE INDEX IF NOT EXISTS idx_worldv2_resurs_occupancy
ON dovlet_worldv2_resurs_runtime (state_id, occupied_until_ms)
WHERE occupied_until_ms > 0;

-- Dövlət üzrə ucuz revision/provision metadata-sı. Viewport cache invalidasiyası üçün
-- böyük JSON audit sətrini oxumağa ehtiyac qalmayacaq.
CREATE TABLE IF NOT EXISTS dovlet_worldv2_resurs_state (
    state_id INTEGER PRIMARY KEY CHECK (state_id > 0),
    provisioned_count INTEGER NOT NULL DEFAULT 0 CHECK (provisioned_count >= 0),
    physical_capacity_reached BOOLEAN NOT NULL DEFAULT FALSE,
    revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
    legacy_audit_id BIGINT,
    yenilenme_vaxti TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE
ON dovlet_worldv2_resurs_runtime, dovlet_worldv2_resurs_state
TO demiryumruq_app;

COMMIT;
