-- ============================================================
-- HESAB PIN QORUMASI
-- ============================================================
-- hesablar.pin_hash artıq ilkin sxemdə mövcuddur.
-- Bu miqrasiya yalnız online brute-force qoruması üçün sayğac və
-- müvəqqəti blok sütunlarını əlavə edir.
-- ============================================================

ALTER TABLE hesablar
    ADD COLUMN IF NOT EXISTS pin_sehv_cehd_sayi INTEGER NOT NULL DEFAULT 0;

ALTER TABLE hesablar
    ADD COLUMN IF NOT EXISTS pin_blok_vaxti TIMESTAMPTZ;

ALTER TABLE hesablar
    ADD COLUMN IF NOT EXISTS pin_yenilenme_vaxti TIMESTAMPTZ;

ALTER TABLE hesablar
    DROP CONSTRAINT IF EXISTS hesablar_pin_sehv_cehd_sayi_check;

ALTER TABLE hesablar
    ADD CONSTRAINT hesablar_pin_sehv_cehd_sayi_check
    CHECK (pin_sehv_cehd_sayi >= 0);

GRANT SELECT, INSERT, UPDATE, DELETE
ON hesablar
TO demiryumruq_app;
