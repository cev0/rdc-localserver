BEGIN;

-- ============================================================
-- PROVAYDER HESABLARI ÜÇÜN HESAB CƏDVƏLİNİ GENİŞLƏNDİR
-- ------------------------------------------------------------
-- Google / Apple / Facebook / Game Center ilə yaradılan hesabda
-- e-poçt və lokal şifrə məcburi deyil.
-- ============================================================

ALTER TABLE hesablar
    ALTER COLUMN esas_email DROP NOT NULL;

ALTER TABLE hesablar
    ALTER COLUMN sifre_hash DROP NOT NULL;


-- ============================================================
-- PROVAYDER METADATA-SI
-- ------------------------------------------------------------
-- Token saxlanılmır. Yalnız təhlükəsiz identifikasiya və UI üçün
-- lazım olan metadata saxlanılır.
-- ============================================================

ALTER TABLE hesab_provayderleri
    ADD COLUMN IF NOT EXISTS provayder_email TEXT;

ALTER TABLE hesab_provayderleri
    ADD COLUMN IF NOT EXISTS provayder_email_tesdiqlenib BOOLEAN
        NOT NULL DEFAULT FALSE;

ALTER TABLE hesab_provayderleri
    ADD COLUMN IF NOT EXISTS profil_adi TEXT;

ALTER TABLE hesab_provayderleri
    ADD COLUMN IF NOT EXISTS son_giris_vaxti TIMESTAMPTZ;

ALTER TABLE hesab_provayderleri
    ADD COLUMN IF NOT EXISTS melumatlar JSONB
        NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_hesab_provayderleri_hesab
ON hesab_provayderleri(hesab_id);

CREATE INDEX IF NOT EXISTS idx_hesab_provayderleri_provayder
ON hesab_provayderleri(provayder);

GRANT
    SELECT,
    INSERT,
    UPDATE,
    DELETE
ON hesab_provayderleri
TO demiryumruq_app;

GRANT
    USAGE,
    SELECT
ON ALL SEQUENCES IN SCHEMA public
TO demiryumruq_app;

COMMIT;
