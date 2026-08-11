"use strict";

const crypto = require("crypto");

const {
    hesabYaratVeBagla,
    hesabEmailIleTap,
    sifreDuzgundur
} = require("./hesab_yaddasi_postgres");

const {
    emailSifreIleDaxilOl
} = require("./hesab_sessiya_postgres");

const {
    sifreSifirlamaKodunuHazirla,
    sifreSifirlamaKodunuYoxla,
    yeniSifreTeyinEt
} = require("./sifre_sifirlama_postgres");

const {
    proqramHovuzunuAl,
    hovuzlariBagla
} = require("./verilenler_bazasi");

async function testiBaslat() {
    const testId = crypto.randomBytes(8).toString("hex");
    const playerId = "reset_test_player_" + testId;
    const email = `reset_test_${testId}@example.test`;
    const kohneSifre = "KohneSifre_12345";
    const yeniSifre = "YeniSifre_67890";
    const cihazId = "reset_test_device_" + testId;

    console.log("[SIFRE_RESET_TEST] Test başlayır...");

    try {
        const hesabNeticesi = await hesabYaratVeBagla(
            playerId,
            email,
            kohneSifre
        );

        if (!hesabNeticesi || hesabNeticesi.success !== true) {
            throw new Error(
                "Test hesabı yaradıla bilmədi: " +
                (hesabNeticesi && hesabNeticesi.message
                    ? hesabNeticesi.message
                    : "Naməlum xəta")
            );
        }

        console.log("[SIFRE_RESET_TEST] Test hesabı yaradıldı.");

        const loginNeticesi = await emailSifreIleDaxilOl(
            email,
            kohneSifre,
            cihazId
        );

        if (!loginNeticesi || loginNeticesi.success !== true) {
            throw new Error("Köhnə şifrə ilə ilkin login alınmadı.");
        }

        const kohneSessiyaId = loginNeticesi.session.sessionId;

        console.log("[SIFRE_RESET_TEST] İlkin sessiya yaradıldı.");

        const kodNeticesi = await sifreSifirlamaKodunuHazirla(email);

        if (
            !kodNeticesi ||
            kodNeticesi.success !== true ||
            !kodNeticesi.kod ||
            !/^\d{6}$/.test(kodNeticesi.kod)
        ) {
            throw new Error("6 rəqəmli sıfırlama kodu hazırlanmadı.");
        }

        console.log("[SIFRE_RESET_TEST] Sıfırlama kodu hazırlandı.");

        const sehvKod = (
            (Number(kodNeticesi.kod) + 1) % 1000000
        )
            .toString()
            .padStart(6, "0");

        const sehvNetice = await sifreSifirlamaKodunuYoxla(
            email,
            sehvKod
        );

        if (!sehvNetice || sehvNetice.success !== false) {
            throw new Error("Səhv təsdiq kodu qəbul edildi.");
        }

        console.log("[SIFRE_RESET_TEST] Səhv kod düzgün rədd edildi.");

        const duzgunNetice = await sifreSifirlamaKodunuYoxla(
            email,
            kodNeticesi.kod
        );

        if (
            !duzgunNetice ||
            duzgunNetice.success !== true ||
            !duzgunNetice.resetToken
        ) {
            throw new Error("Düzgün kod reset token yaratmadı.");
        }

        console.log("[SIFRE_RESET_TEST] Düzgün kod qəbul edildi və reset token yaradıldı.");

        const sifreNeticesi = await yeniSifreTeyinEt(
            duzgunNetice.resetToken,
            yeniSifre
        );

        if (!sifreNeticesi || sifreNeticesi.success !== true) {
            throw new Error(
                "Yeni şifrə təyin edilmədi: " +
                (sifreNeticesi && sifreNeticesi.message
                    ? sifreNeticesi.message
                    : "Naməlum xəta")
            );
        }

        console.log("[SIFRE_RESET_TEST] Yeni şifrə uğurla təyin edildi.");

        const hesab = await hesabEmailIleTap(email);

        if (!hesab) {
            throw new Error("Şifrə dəyişəndən sonra hesab tapılmadı.");
        }

        if (sifreDuzgundur(kohneSifre, hesab.passwordHash) !== false) {
            throw new Error("Köhnə şifrə hələ də qəbul edilir.");
        }

        if (sifreDuzgundur(yeniSifre, hesab.passwordHash) !== true) {
            throw new Error("Yeni şifrə DB-də düzgün saxlanılmayıb.");
        }

        console.log("[SIFRE_RESET_TEST] Köhnə şifrə rədd edilir, yeni şifrə düzgündür.");

        const hovuz = proqramHovuzunuAl();
        const sessiyaYoxlamasi = await hovuz.query(
            `
            SELECT legv_vaxti
            FROM hesab_sessiyalari
            WHERE sessiya_id = $1
            LIMIT 1
            `,
            [kohneSessiyaId]
        );

        if (
            sessiyaYoxlamasi.rows.length !== 1 ||
            !sessiyaYoxlamasi.rows[0].legv_vaxti
        ) {
            throw new Error("Şifrə dəyişəndə köhnə sessiya ləğv edilmədi.");
        }

        console.log("[SIFRE_RESET_TEST] Köhnə sessiyalar ləğv edildi.");

        const tokenTekrar = await yeniSifreTeyinEt(
            duzgunNetice.resetToken,
            "BasqaSifre_11111"
        );

        if (!tokenTekrar || tokenTekrar.success !== false) {
            throw new Error("İstifadə edilmiş reset token ikinci dəfə qəbul edildi.");
        }

        console.log("[SIFRE_RESET_TEST] Reset token ikinci dəfə düzgün rədd edildi.");

        const yeniLogin = await emailSifreIleDaxilOl(
            email,
            yeniSifre,
            cihazId + "_yeni"
        );

        if (!yeniLogin || yeniLogin.success !== true) {
            throw new Error("Yeni şifrə ilə login alınmadı.");
        }

        console.log("[SIFRE_RESET_TEST] Yeni şifrə ilə login uğurludur.");
        console.log("[SIFRE_RESET_TEST] Bütün şifrə sıfırlama testləri uğurla tamamlandı.");
    }
    catch (xeta) {
        console.error("[SIFRE_RESET_TEST] Test uğursuz oldu:", xeta);
        process.exitCode = 1;
    }
    finally {
        try {
            const hovuz = proqramHovuzunuAl();

            await hovuz.query(
                `
                DELETE FROM hesab_audit_jurnali
                WHERE oyuncu_id = $1
                `,
                [playerId]
            );

            await hovuz.query(
                `
                DELETE FROM hesablar
                WHERE oyuncu_id = $1
                `,
                [playerId]
            );

            console.log("[SIFRE_RESET_TEST] Test məlumatları təmizləndi.");
        }
        catch (temizlemeXetasi) {
            console.error(
                "[SIFRE_RESET_TEST] Test məlumatları təmizlənmədi:",
                temizlemeXetasi.message
            );
        }

        try {
            await hovuzlariBagla();
        }
        catch {
        }
    }
}

testiBaslat();
