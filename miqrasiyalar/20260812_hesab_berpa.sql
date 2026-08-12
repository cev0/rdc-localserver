-- ============================================================
-- İTİRİLMİŞ HESAB BƏRPASI - TƏHLÜKƏSİZ MİQRASİYA
--
-- VACİB:
-- 001_hesab_sistemi.sql artıq hesab_berpa_sorqulari cədvəlini
-- köhnə/support formatında yaradır. Buna görə bu miqrasiya cədvəli
-- yenidən yaratmağa güvənmir; mövcud cədvələ yeni sütunları əlavə edir.
-- ============================================================

CREATE TABLE IF NOT EXISTS hesab_berpa_sorqulari (
    sorqu_id TEXT PRIMARY KEY
);


-- Yeni avtomatik email-kod bərpa axını üçün sütunlar.
-- Köhnə cədvəldə əvvəlki support sütunları qala bilər; bu normaldır.

ALTER TABLE hesab_berpa_sorqulari
    ADD COLUMN IF NOT EXISTS hesab_id TEXT
        REFERENCES hesablar(hesab_id)
        ON DELETE CASCADE;

ALTER TABLE hesab_berpa_sorqulari
    ADD COLUMN IF NOT EXISTS kod_hash TEXT;

ALTER TABLE hesab_berpa_sorqulari
    ADD COLUMN IF NOT EXISTS duz TEXT;

ALTER TABLE hesab_berpa_sorqulari
    ADD COLUMN IF NOT EXISTS bitme_vaxti TIMESTAMPTZ;

ALTER TABLE hesab_berpa_sorqulari
    ADD COLUMN IF NOT EXISTS cehd_sayi INTEGER NOT NULL DEFAULT 0;

ALTER TABLE hesab_berpa_sorqulari
    ADD COLUMN IF NOT EXISTS son_gonderilme_vaxti TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE hesab_berpa_sorqulari
    ADD COLUMN IF NOT EXISTS istifade_vaxti TIMESTAMPTZ;

ALTER TABLE hesab_berpa_sorqulari
    ADD COLUMN IF NOT EXISTS teleb_email TEXT;

ALTER TABLE hesab_berpa_sorqulari
    ADD COLUMN IF NOT EXISTS teleb_oyuncu_id TEXT;

ALTER TABLE hesab_berpa_sorqulari
    ADD COLUMN IF NOT EXISTS komandir_adi TEXT;

ALTER TABLE hesab_berpa_sorqulari
    ADD COLUMN IF NOT EXISTS elave_melumat TEXT;

ALTER TABLE hesab_berpa_sorqulari
    ADD COLUMN IF NOT EXISTS yaradilma_vaxti TIMESTAMPTZ NOT NULL DEFAULT NOW();


-- Köhnə support formatındakı məlumat varsa, yalnız məlumat məqsədilə
-- yeni request sütunlarına kopyalayırıq. Bu sətirlər avtomatik bərpa üçün
-- istifadə olunmur, çünki hesab_id/kod_hash yoxdur.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'hesab_berpa_sorqulari'
          AND column_name = 'email'
    ) THEN
        EXECUTE '
            UPDATE hesab_berpa_sorqulari
            SET teleb_email = COALESCE(teleb_email, email)
            WHERE teleb_email IS NULL
              AND email IS NOT NULL
        ';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'hesab_berpa_sorqulari'
          AND column_name = 'oyuncu_id'
    ) THEN
        EXECUTE '
            UPDATE hesab_berpa_sorqulari
            SET teleb_oyuncu_id = COALESCE(teleb_oyuncu_id, oyuncu_id)
            WHERE teleb_oyuncu_id IS NULL
              AND oyuncu_id IS NOT NULL
        ';
    END IF;
END
$$;


CREATE INDEX IF NOT EXISTS idx_hesab_berpa_hesab_vaxt
    ON hesab_berpa_sorqulari (
        hesab_id,
        yaradilma_vaxti DESC
    );

CREATE INDEX IF NOT EXISTS idx_hesab_berpa_aktiv
    ON hesab_berpa_sorqulari (hesab_id)
    WHERE istifade_vaxti IS NULL;


GRANT SELECT, INSERT, UPDATE, DELETE
ON hesab_berpa_sorqulari
TO demiryumruq_app;
