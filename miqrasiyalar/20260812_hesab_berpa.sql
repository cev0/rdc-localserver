CREATE TABLE IF NOT EXISTS hesab_berpa_sorqulari (
    sorqu_id TEXT PRIMARY KEY,
    hesab_id TEXT NOT NULL REFERENCES hesablar(hesab_id) ON DELETE CASCADE,
    kod_hash TEXT NOT NULL,
    duz TEXT NOT NULL,
    bitme_vaxti TIMESTAMPTZ NOT NULL,
    cehd_sayi INTEGER NOT NULL DEFAULT 0,
    son_gonderilme_vaxti TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    yaradilma_vaxti TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    istifade_vaxti TIMESTAMPTZ,
    teleb_email TEXT,
    teleb_oyuncu_id TEXT,
    komandir_adi TEXT,
    elave_melumat TEXT
);

CREATE INDEX IF NOT EXISTS idx_hesab_berpa_hesab_vaxt
    ON hesab_berpa_sorqulari (hesab_id, yaradilma_vaxti DESC);

CREATE INDEX IF NOT EXISTS idx_hesab_berpa_aktiv
    ON hesab_berpa_sorqulari (hesab_id)
    WHERE istifade_vaxti IS NULL;
