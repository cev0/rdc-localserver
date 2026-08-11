"use strict";

const crypto = require("crypto");

const {
    hesabYaratVeBagla,
    hesabPlayerIdIleTap,
    emailTesdiqKoduHazirla,
    emailTesdiqKodunuYoxla
} = require("./hesab_yaddasi_postgres");

const {
    proqramHovuzunuAl,
    hovuzlariBagla
} = require("./verilenler_bazasi");


// ============================================================
// EMAIL TƏSDİQ POSTGRESQL TESTİ
// ============================================================

async function testiBaslat()
{
    const testId =
        crypto
            .randomBytes(8)
            .toString("hex");

    const testPlayerId =
        "email_test_player_" +
        testId;

    const testEmail =
        `email_test_${testId}@example.test`;

    const testSifre =
        "TestSifre_12345";


    console.log(
        "[EMAIL_PG_TEST] Test başlayır..."
    );


    try {
        // ====================================================
        // 1. TEST HESABI YARAT
        // ====================================================

        const hesabNeticesi =
            await hesabYaratVeBagla(
                testPlayerId,
                testEmail,
                testSifre
            );


        if (
            !hesabNeticesi ||
            hesabNeticesi.success !== true ||
            !hesabNeticesi.account
        ) {
            throw new Error(
                "Test hesabı yaradıla bilmədi: " +
                (
                    hesabNeticesi &&
                    hesabNeticesi.message
                        ? hesabNeticesi.message
                        : "Naməlum xəta"
                )
            );
        }


        console.log(
            "[EMAIL_PG_TEST] Test hesabı yaradıldı."
        );


        // ====================================================
        // 2. TƏSDİQ KODU HAZIRLA
        // ====================================================

        const kodNeticesi =
            await emailTesdiqKoduHazirla(
                testPlayerId
            );


        if (
            !kodNeticesi ||
            kodNeticesi.success !== true ||
            !kodNeticesi.kod
        ) {
            throw new Error(
                "Təsdiq kodu hazırlanmadı: " +
                (
                    kodNeticesi &&
                    kodNeticesi.message
                        ? kodNeticesi.message
                        : "Naməlum xəta"
                )
            );
        }


        if (
            !/^\d{6}$/.test(
                kodNeticesi.kod
            )
        ) {
            throw new Error(
                "Hazırlanan təsdiq kodu 6 rəqəmli deyil."
            );
        }


        console.log(
            "[EMAIL_PG_TEST] 6 rəqəmli təsdiq kodu hazırlandı."
        );


        // ====================================================
        // 3. DB-DƏ KODUN ÖZÜ YOX, HASH-I SAXLANIR?
        // ====================================================

        const hovuz =
            proqramHovuzunuAl();


        const tesdiqSetri =
            await hovuz.query(
                `
                SELECT
                    kod_hash,
                    duz,
                    cehd_sayi,
                    bitme_vaxti
                FROM email_tesdiqleri
                WHERE hesab_id = $1
                LIMIT 1
                `,
                [
                    hesabNeticesi
                        .account
                        .accountId
                ]
            );


        if (
            !tesdiqSetri.rows ||
            tesdiqSetri.rows.length !== 1
        ) {
            throw new Error(
                "Email təsdiq sətri DB-də tapılmadı."
            );
        }


        const dbTesdiq =
            tesdiqSetri.rows[0];


        if (
            !dbTesdiq.kod_hash ||
            !dbTesdiq.duz
        ) {
            throw new Error(
                "Kod hash və ya duz DB-də yoxdur."
            );
        }


        if (
            String(
                dbTesdiq.kod_hash
            ) ===
            String(
                kodNeticesi.kod
            )
        ) {
            throw new Error(
                "Təsdiq kodu açıq mətn kimi saxlanılıb."
            );
        }


        console.log(
            "[EMAIL_PG_TEST] Kod DB-də hash formasında saxlanılır."
        );


        // ====================================================
        // 4. SƏHV KOD HAZIRLA
        // ====================================================

        const sehvKod =
            (
                (
                    Number(
                        kodNeticesi.kod
                    ) + 1
                ) %
                1000000
            )
                .toString()
                .padStart(
                    6,
                    "0"
                );


        // ====================================================
        // 5. SƏHV KOD RƏDD EDİLMƏLİDİR
        // ====================================================

        const sehvNetice =
            await emailTesdiqKodunuYoxla(
                testPlayerId,
                sehvKod
            );


        if (
            !sehvNetice ||
            sehvNetice.success !== false
        ) {
            throw new Error(
                "Səhv təsdiq kodu qəbul edildi."
            );
        }


        console.log(
            "[EMAIL_PG_TEST] Səhv kod düzgün rədd edildi."
        );


        // ====================================================
        // 6. CƏHD SAYI 1 OLMALIDIR
        // ====================================================

        const cehdYoxlamasi =
            await hovuz.query(
                `
                SELECT
                    cehd_sayi
                FROM email_tesdiqleri
                WHERE hesab_id = $1
                LIMIT 1
                `,
                [
                    hesabNeticesi
                        .account
                        .accountId
                ]
            );


        if (
            cehdYoxlamasi.rows.length !== 1 ||
            Number(
                cehdYoxlamasi
                    .rows[0]
                    .cehd_sayi
            ) !== 1
        ) {
            throw new Error(
                "Səhv koddan sonra cəhd sayı 1 olmadı."
            );
        }


        console.log(
            "[EMAIL_PG_TEST] Cəhd sayı düzgün yeniləndi."
        );


        // ====================================================
        // 7. DÜZGÜN KODU TƏSDİQ ET
        // ====================================================

        const duzgunNetice =
            await emailTesdiqKodunuYoxla(
                testPlayerId,
                kodNeticesi.kod
            );


        if (
            !duzgunNetice ||
            duzgunNetice.success !== true ||
            !duzgunNetice.account ||
            duzgunNetice
                .account
                .emailVerified !== true
        ) {
            throw new Error(
                "Düzgün təsdiq kodu qəbul edilmədi."
            );
        }


        console.log(
            "[EMAIL_PG_TEST] Düzgün kod qəbul edildi."
        );


        // ====================================================
        // 8. HESAB DB-DƏ TƏSDİQLƏNİB?
        // ====================================================

        const dbHesab =
            await hesabPlayerIdIleTap(
                testPlayerId
            );


        if (
            !dbHesab ||
            dbHesab.emailVerified !== true
        ) {
            throw new Error(
                "emailVerified DB-də TRUE olmadı."
            );
        }


        console.log(
            "[EMAIL_PG_TEST] emailVerified TRUE oldu."
        );


        // ====================================================
        // 9. TƏSDİQ KODU SƏTRİ SİLİNİB?
        // ====================================================

        const qalanTesdiq =
            await hovuz.query(
                `
                SELECT hesab_id
                FROM email_tesdiqleri
                WHERE hesab_id = $1
                `,
                [
                    hesabNeticesi
                        .account
                        .accountId
                ]
            );


        if (
            qalanTesdiq.rows.length !== 0
        ) {
            throw new Error(
                "Uğurlu təsdiqdən sonra təsdiq kodu silinmədi."
            );
        }


        console.log(
            "[EMAIL_PG_TEST] İstifadə edilmiş təsdiq kodu silindi."
        );


        // ====================================================
        // 10. AUDİT JURNALI
        // ====================================================

        const auditNeticesi =
            await hovuz.query(
                `
                SELECT
                    hadise_novu
                FROM hesab_audit_jurnali
                WHERE
                    hesab_id = $1
                    AND hadise_novu = 'email_tesdiqlendi'
                ORDER BY id DESC
                LIMIT 1
                `,
                [
                    hesabNeticesi
                        .account
                        .accountId
                ]
            );


        if (
            auditNeticesi.rows.length !== 1
        ) {
            throw new Error(
                "Email təsdiq audit qeydi yaradılmadı."
            );
        }


        console.log(
            "[EMAIL_PG_TEST] Audit qeydi yaradıldı."
        );


        console.log(
            "[EMAIL_PG_TEST] Bütün email təsdiq testləri uğurla tamamlandı."
        );
    }
    catch (xeta) {
        console.error(
            "[EMAIL_PG_TEST] Test uğursuz oldu:",
            xeta
        );

        process.exitCode = 1;
    }
    finally {
        // ====================================================
        // TEST MƏLUMATLARINI TƏMİZLƏ
        // ====================================================

        try {
            const hovuz =
                proqramHovuzunuAl();


            // Audit FK ON DELETE SET NULL olduğu üçün
            // əvvəl audit sətrini ayrıca silirik.
            await hovuz.query(
                `
                DELETE FROM hesab_audit_jurnali
                WHERE oyuncu_id = $1
                `,
                [
                    testPlayerId
                ]
            );


            // Digər bağlı cədvəllər CASCADE ilə təmizlənəcək.
            await hovuz.query(
                `
                DELETE FROM hesablar
                WHERE oyuncu_id = $1
                `,
                [
                    testPlayerId
                ]
            );


            console.log(
                "[EMAIL_PG_TEST] Test məlumatları təmizləndi."
            );
        }
        catch (temizlemeXetasi) {
            console.error(
                "[EMAIL_PG_TEST] Test məlumatları təmizlənmədi:",
                temizlemeXetasi.message
            );
        }


        try {
            await hovuzlariBagla();
        }
        catch (baglamaXetasi) {
            console.error(
                "[EMAIL_PG_TEST] DB hovuzu bağlanmadı:",
                baglamaXetasi.message
            );
        }
    }
}


testiBaslat();