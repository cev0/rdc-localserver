BEGIN;

ALTER TABLE dovlet_world_state_runtime
ADD COLUMN IF NOT EXISTS created_at_ms BIGINT NOT NULL DEFAULT 0
CHECK (created_at_ms >= 0);

ALTER TABLE dovlet_world_state_runtime
ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '';

ALTER TABLE dovlet_world_state_runtime
ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE dovlet_world_state_runtime
SET created_at_ms =
  GREATEST(
    0,
    center_unlock_at_ms - 2592000000
  )
WHERE created_at_ms = 0
  AND center_unlock_at_ms > 0;

UPDATE dovlet_world_state_runtime
SET display_name =
  'State#' || state_id::text
WHERE display_name = '';

CREATE INDEX IF NOT EXISTS idx_dovlet_world_state_runtime_open
ON dovlet_world_state_runtime (is_open, state_id DESC);

COMMIT;
