-- ============================================================
-- KRITIK HESAB EMELIYYATLARI UCUN QISA MUDDETLI PIN ICAZELERI
-- ============================================================

CREATE TABLE IF NOT EXISTS hesab_pin_icazeleri (
    icaze_id TEXT PRIMARY KEY,
    hesab_id TEXT NOT NULL
        REFERENCES hesablar(hesab_id)
        ON DELETE CASCADE,
    emeliyyat_novu TEXT NOT NULL
        CHECK (emeliyyat_novu IN ('account_delete', 'password_change')),
    token_hash TEXT NOT NULL UNIQUE,
    bitme_vaxti TIMESTAMPTZ NOT NULL,
    yaradilma_vaxti TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    istifade_vaxti TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_hesab_pin_icaze_aktiv
    ON hesab_pin_icazeleri (hesab_id, emeliyyat_novu, yaradilma_vaxti DESC)
    WHERE istifade_vaxti IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE
ON hesab_pin_icazeleri
TO demiryumruq_app;
