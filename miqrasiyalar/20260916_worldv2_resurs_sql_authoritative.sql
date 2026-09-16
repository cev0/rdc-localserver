BEGIN;

ALTER TABLE dovlet_worldv2_resurs_state
  ADD COLUMN IF NOT EXISTS runtime_mode TEXT NOT NULL DEFAULT 'legacy_shadow';

ALTER TABLE dovlet_worldv2_resurs_state
  ADD COLUMN IF NOT EXISTS sql_authoritative_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'chk_worldv2_resurs_runtime_mode'
       AND conrelid = 'dovlet_worldv2_resurs_state'::regclass
  ) THEN
    ALTER TABLE dovlet_worldv2_resurs_state
      ADD CONSTRAINT chk_worldv2_resurs_runtime_mode
      CHECK (runtime_mode IN ('legacy_shadow', 'sql_authoritative'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_worldv2_resurs_due_respawn
ON dovlet_worldv2_resurs_runtime (state_id, respawn_at_ms)
WHERE respawn_at_ms > 0;

COMMIT;
