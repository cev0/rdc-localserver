BEGIN;

-- Son gameplay snapshot-u oyunçu üzrə sürətli tapmaq üçün.
CREATE INDEX IF NOT EXISTS idx_hesab_audit_oyun_snapshot_player_latest
ON hesab_audit_jurnali (
    oyuncu_id,
    id DESC
)
WHERE hadise_novu = 'oyun_state_snapshot_v1';

-- Dövlət xəritəsində yalnız həmin State-ə aid oyunçuların son snapshot-larını
-- sürətli seçmək üçün JSONB expression + player + latest-id index-i.
CREATE INDEX IF NOT EXISTS idx_hesab_audit_oyun_snapshot_state_player_latest
ON hesab_audit_jurnali (
    ((detallar #>> '{state,worldPlacement,stateId}')),
    oyuncu_id,
    id DESC
)
WHERE hadise_novu = 'oyun_state_snapshot_v1';

COMMIT;
