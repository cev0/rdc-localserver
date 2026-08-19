-- RDC mesajlaşma + oyun dili infrastrukturu
-- 2026-08-19

CREATE TABLE IF NOT EXISTS oyuncu_dil_ayarlari (
    player_id TEXT PRIMARY KEY,
    oyun_dili VARCHAR(5) NOT NULL DEFAULT 'az',
    yenilenme_vaxti TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT oyuncu_dil_ayarlari_desteklenen_dil
        CHECK (oyun_dili IN ('az', 'ru', 'en', 'tr'))
);

CREATE TABLE IF NOT EXISTS mesajlar (
    mesaj_id TEXT PRIMARY KEY,
    kanal_novu VARCHAR(16) NOT NULL,
    gonderen_player_id TEXT NOT NULL,
    qebul_eden_player_id TEXT NULL,
    dovlet_id INTEGER NULL,
    ittifaq_id TEXT NULL,
    metn TEXT NOT NULL,
    gonderilme_vaxti TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    oxunma_vaxti TIMESTAMPTZ NULL,

    CONSTRAINT mesajlar_kanal_novu_yoxla
        CHECK (kanal_novu IN ('sexsi', 'olke', 'ittifaq')),

    CONSTRAINT mesajlar_metn_bos_olmasin
        CHECK (char_length(btrim(metn)) > 0 AND char_length(metn) <= 500),

    CONSTRAINT mesajlar_kanal_hedefi_yoxla CHECK (
        (
            kanal_novu = 'sexsi'
            AND qebul_eden_player_id IS NOT NULL
            AND dovlet_id IS NULL
            AND ittifaq_id IS NULL
        )
        OR
        (
            kanal_novu = 'olke'
            AND qebul_eden_player_id IS NULL
            AND dovlet_id IS NOT NULL
            AND ittifaq_id IS NULL
        )
        OR
        (
            kanal_novu = 'ittifaq'
            AND qebul_eden_player_id IS NULL
            AND dovlet_id IS NULL
            AND ittifaq_id IS NOT NULL
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_mesajlar_sexsi_qebul_vaxt
    ON mesajlar (qebul_eden_player_id, gonderilme_vaxti DESC)
    WHERE kanal_novu = 'sexsi';

CREATE INDEX IF NOT EXISTS idx_mesajlar_sexsi_gonderen_vaxt
    ON mesajlar (gonderen_player_id, gonderilme_vaxti DESC)
    WHERE kanal_novu = 'sexsi';

CREATE INDEX IF NOT EXISTS idx_mesajlar_olke_vaxt
    ON mesajlar (dovlet_id, gonderilme_vaxti DESC)
    WHERE kanal_novu = 'olke';

CREATE INDEX IF NOT EXISTS idx_mesajlar_ittifaq_vaxt
    ON mesajlar (ittifaq_id, gonderilme_vaxti DESC)
    WHERE kanal_novu = 'ittifaq';

CREATE INDEX IF NOT EXISTS idx_mesajlar_oxunmamis
    ON mesajlar (qebul_eden_player_id, gonderilme_vaxti DESC)
    WHERE kanal_novu = 'sexsi' AND oxunma_vaxti IS NULL;

CREATE TABLE IF NOT EXISTS mesaj_tercumeleri (
    mesaj_id TEXT NOT NULL REFERENCES mesajlar(mesaj_id) ON DELETE CASCADE,
    hedef_dil VARCHAR(5) NOT NULL,
    orijinal_dil VARCHAR(16) NULL,
    tercume_metni TEXT NOT NULL,
    yaradilmа_vaxti TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (mesaj_id, hedef_dil),

    CONSTRAINT mesaj_tercumeleri_desteklenen_dil
        CHECK (hedef_dil IN ('az', 'ru', 'en', 'tr')),

    CONSTRAINT mesaj_tercumeleri_metn_bos_olmasin
        CHECK (char_length(btrim(tercume_metni)) > 0)
);
