"use strict";

const crypto = require("crypto");

const {
    hesabYaratVeBagla,
    hesabPlayerIdIleTap,
    hesabEmailIleTap,
    sifreDuzgundur
} = require("./hesab_yaddasi_postgres");

const {
    proqramHovuzunuAl,
    hovuzlariBagla
} = require("./verilenler_bazasi");


// ============================================================
// POSTGRES HESAB MODULU TESTİ
// ============================================================

async function testiBaslat()
{
    const testId =
        crypto
            .randomBytes(8)
            .toString("hex");

    const testPlayerId =
        "pg_test_player_" +
        testId;

    const testEmail =
        `pg_test_${testId}@example.test`;

    const testSifre =
        "TestSifre_12345";


    console.log(
        "[HESAB_PG_TEST] Test başlayır..."
    );


    try {
        // ====================================================
        // 1. HESAB YARAT
        // ====================================================

        const yaratmaNeticesi =
            await hesabYaratVeBagla(
                testPlayerId,
                testEmail,
                testSifre
            );


        if (
            !yaratmaNeticesi ||
            yaratmaNeticesi.success !== true ||
            !yaratmaNeticesi.account
        ) {
            throw new Error(
                "Hesab yaratma testi uğursuz oldu: " +
                (
                    yaratmaNeticesi &&
                    yaratmaNeticesi.message
                        ? yaratmaNeticesi.message
                        : "Naməlum xəta"
                )
            );
        }


        console.log(
            "[HESAB_PG_TEST] Hesab yaratma uğurludur:",
            {
                accountId:
                    yaratmaNeticesi.account.accountId,

                playerId:
                    yaratmaNeticesi.account.playerId,

                email:
                    yaratmaNeticesi.account.primaryEmail
            }
        );


        // ====================================================
        // 2. PLAYER ID İLƏ TAP
        // ====================================================

        const playerHesabi =
            await hesabPlayerIdIleTap(
                testPlayerId
            );


        if (!playerHesabi) {
            throw new Error(
                "Player ID ilə hesab tapılmadı."
            );
        }


        console.log(
            "[HESAB_PG_TEST] Player ID ilə tapma uğurludur."
        );


        // ====================================================
        // 3. EMAIL İLƏ TAP
        // ====================================================

        const emailHesabi =
            await hesabEmailIleTap(
                testEmail
            );


        if (!emailHesabi) {
            throw new Error(
                "Email ilə hesab tapılmadı."
            );
        }


        console.log(
            "[HESAB_PG_TEST] Email ilə tapma uğurludur."
        );


        // ====================================================
        // 4. DÜZGÜN ŞİFRƏ
        // ====================================================

        const duzgunSifre =
            sifreDuzgundur(
                testSifre,
                playerHesabi.passwordHash
            );


        if (duzgunSifre !== true) {
            throw new Error(
                "Düzgün şifrə təsdiqlənmədi."
            );
        }


        console.log(
            "[HESAB_PG_TEST] Düzgün şifrə yoxlaması uğurludur."
        );


        // ====================================================
        // 5. SƏHV ŞİFRƏ
        // ====================================================

        const sehvSifre =
            sifreDuzgundur(
                "TamSehvSifre_999",
                playerHesabi.passwordHash
            );


        if (sehvSifre !== false) {
            throw new Error(
                "Səhv şifrə qəbul edildi."
            );
        }


        console.log(
            "[HESAB_PG_TEST] Səhv şifrə düzgün rədd edildi."
        );


        // ====================================================
        // 6. EYNİ EMAIL İKİNCİ DƏFƏ
        // ====================================================

        const ikinciEmailNeticesi =
            await hesabYaratVeBagla(
                "pg_test_player_ikinci_" +
                    testId,
                testEmail,
                testSifre
            );


        if (
            !ikinciEmailNeticesi ||
            ikinciEmailNeticesi.success !== false
        ) {
            throw new Error(
                "Eyni email ikinci dəfə qəbul edildi."
            );
        }


        console.log(
            "[HESAB_PG_TEST] Təkrar email düzgün rədd edildi."
        );


        // ====================================================
        // 7. EYNİ PLAYER ID İKİNCİ DƏFƏ
        // ====================================================

        const ikinciPlayerNeticesi =
            await hesabYaratVeBagla(
                testPlayerId,
                `pg_test_yeni_${testId}@example.test`,
                testSifre
            );


        if (
            !ikinciPlayerNeticesi ||
            ikinciPlayerNeticesi.success !== false
        ) {
            throw new Error(
                "Eyni playerId ikinci dəfə qəbul edildi."
            );
        }


        console.log(
            "[HESAB_PG_TEST] Təkrar playerId düzgün rədd edildi."
        );


        console.log(
            "[HESAB_PG_TEST] Bütün PostgreSQL hesab modulu testləri uğurla tamamlandı."
        );
    }
    catch (xeta) {
        console.error(
            "[HESAB_PG_TEST] Test uğursuz oldu:",
            xeta
        );

        process.exitCode = 1;
    }
    finally {
        // ====================================================
        // TEST MƏLUMATINI SİL
        // ====================================================

        try {
            const hovuz =
                proqramHovuzunuAl();

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
                "[HESAB_PG_TEST] Test hesabı təmizləndi."
            );
        }
        catch (temizlemeXetasi) {
            console.error(
                "[HESAB_PG_TEST] Test hesabı silinmədi:",
                temizlemeXetasi.message
            );
        }


        try {
            await hovuzlariBagla();
        }
        catch (baglamaXetasi) {
            console.error(
                "[HESAB_PG_TEST] DB hovuzu bağlanmadı:",
                baglamaXetasi.message
            );
        }
    }
}


testiBaslat();