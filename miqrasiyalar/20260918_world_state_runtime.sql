BEGIN;

CREATE TABLE IF NOT EXISTS dovlet_world_state_runtime (
    state_id INTEGER PRIMARY KEY CHECK (state_id > 0),
    center_unlock_at_ms BIGINT NOT NULL DEFAULT 0 CHECK (center_unlock_at_ms >= 0),
    president_player_id TEXT NOT NULL DEFAULT '',
    president_alliance_id TEXT NOT NULL DEFAULT '',
    center_occupied_at_ms BIGINT NOT NULL DEFAULT 0 CHECK (center_occupied_at_ms >= 0),
    revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
    yenilenme_vaxti TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dovlet_world_state_runtime_president
ON dovlet_world_state_runtime (president_player_id)
WHERE president_player_id <> '';

GRANT SELECT, INSERT, UPDATE, DELETE
ON dovlet_world_state_runtime
TO demiryumruq_app;

COMMIT;
