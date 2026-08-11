BEGIN;

ALTER TABLE sifre_sifirlama_sorqulari
    ADD COLUMN IF NOT EXISTS tesdiq_vaxti TIMESTAMPTZ;

ALTER TABLE sifre_sifirlama_sorqulari
    ADD COLUMN IF NOT EXISTS reset_token_hash TEXT;

ALTER TABLE sifre_sifirlama_sorqulari
    ADD COLUMN IF NOT EXISTS reset_token_bitme_vaxti TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sifre_sifirlama_aktiv
ON sifre_sifirlama_sorqulari (
    hesab_id,
    yaradilma_vaxti DESC
)
WHERE istifade_vaxti IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sifre_sifirlama_reset_token
ON sifre_sifirlama_sorqulari (reset_token_hash)
WHERE reset_token_hash IS NOT NULL;

COMMIT;
