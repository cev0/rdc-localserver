BEGIN;

CREATE TABLE IF NOT EXISTS hesab_pin_berpa_sorqulari (
    sorqu_id TEXT PRIMARY KEY,
    hesab_id TEXT NOT NULL REFERENCES hesablar(hesab_id) ON DELETE CASCADE,
    kod_hash TEXT NOT NULL,
    duz TEXT NOT NULL,
    bitme_vaxti TIMESTAMPTZ NOT NULL,
    cehd_sayi INTEGER NOT NULL DEFAULT 0,
    yaradilma_vaxti TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tesdiq_vaxti TIMESTAMPTZ NULL,
    reset_token_hash TEXT NULL,
    reset_token_bitme_vaxti TIMESTAMPTZ NULL,
    istifade_vaxti TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_hesab_pin_berpa_hesab_id
    ON hesab_pin_berpa_sorqulari(hesab_id);

CREATE INDEX IF NOT EXISTS idx_hesab_pin_berpa_reset_token
    ON hesab_pin_berpa_sorqulari(reset_token_hash)
    WHERE reset_token_hash IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE hesab_pin_berpa_sorqulari
    TO demiryumruq_app;

COMMIT;
