"use strict";

const crypto = require("crypto");

const {
    proqramHovuzunuAl,
    hovuzlariBagla
} = require("./verilenler_bazasi");


async function hesabDbTestiniBaslat()
{
    const hovuz =
        proqramHovuzunuAl();

    const client =
        await hovuz.connect();


    const testHesabId =
        "test_" +
        crypto
            .randomBytes(8)
            .toString("hex");

    const testOyuncuId =
        "test_player_" +
        crypto
            .randomBytes(8)
            .toString("hex");

    const testEmail =
        `${testHesabId}@example.test`;


    try {
        console.log(
            "[HESAB_DB_TEST] Test başlayır..."
        );


        await client.query("BEGIN");


        // ====================================================
        // INSERT
        // ====================================================

        await client.query(
            `
            INSERT INTO hesablar (
                hesab_id,
                oyuncu_id,
                esas_email,
                email_tesdiqlenib,
                sifre_hash,
                status
            )
            VALUES (
                $1,
                $2,
                $3,
                FALSE,
                $4,
                'aktiv'
            )
            `,
            [
                testHesabId,
                testOyuncuId,
                testEmail,
                "test_hash"
            ]
        );


        console.log(
            "[HESAB_DB_TEST] INSERT uğurludur."
        );


        // ====================================================
        // SELECT
        // ====================================================

        const tapilan =
            await client.query(
                `
                SELECT
                    hesab_id,
                    oyuncu_id,
                    esas_email,
                    email_tesdiqlenib,
                    status
                FROM hesablar
                WHERE hesab_id = $1
                LIMIT 1
                `,
                [
                    testHesabId
                ]
            );


        if (
            !tapilan.rows ||
            tapilan.rows.length !== 1
        ) {
            throw new Error(
                "Test hesabı SELECT ilə tapılmadı."
            );
        }


        console.log(
            "[HESAB_DB_TEST] SELECT uğurludur:",
            {
                hesabId:
                    tapilan.rows[0].hesab_id,

                oyuncuId:
                    tapilan.rows[0].oyuncu_id,

                email:
                    tapilan.rows[0].esas_email
            }
        );


        // ====================================================
        // UPDATE
        // ====================================================

        await client.query(
            `
            UPDATE hesablar
            SET
                email_tesdiqlenib = TRUE,
                yenilenme_vaxti = NOW()
            WHERE hesab_id = $1
            `,
            [
                testHesabId
            ]
        );


        const yenilenmis =
            await client.query(
                `
                SELECT
                    email_tesdiqlenib
                FROM hesablar
                WHERE hesab_id = $1
                `,
                [
                    testHesabId
                ]
            );


        if (
            yenilenmis.rows.length !== 1 ||
            yenilenmis.rows[0]
                .email_tesdiqlenib !== true
        ) {
            throw new Error(
                "UPDATE testi uğursuz oldu."
            );
        }


        console.log(
            "[HESAB_DB_TEST] UPDATE uğurludur."
        );


        // ====================================================
        // DELETE
        // ====================================================

        await client.query(
            `
            DELETE FROM hesablar
            WHERE hesab_id = $1
            `,
            [
                testHesabId
            ]
        );


        const silinmeYoxlamasi =
            await client.query(
                `
                SELECT hesab_id
                FROM hesablar
                WHERE hesab_id = $1
                `,
                [
                    testHesabId
                ]
            );


        if (
            silinmeYoxlamasi.rows.length !== 0
        ) {
            throw new Error(
                "DELETE testi uğursuz oldu."
            );
        }


        console.log(
            "[HESAB_DB_TEST] DELETE uğurludur."
        );


        await client.query("COMMIT");


        console.log(
            "[HESAB_DB_TEST] Bütün hesab DB testləri uğurla tamamlandı."
        );
    }
    catch (xeta) {
        try {
            await client.query("ROLLBACK");
        }
        catch {
            // Əsas xətanı dəyişmirik.
        }


        console.error(
            "[HESAB_DB_TEST] Test uğursuz oldu:",
            xeta
        );

        process.exitCode = 1;
    }
    finally {
        client.release();

        try {
            await hovuzlariBagla();
        }
        catch (xeta) {
            console.error(
                "[HESAB_DB_TEST] Hovuz bağlanmadı:",
                xeta
            );
        }
    }
}


hesabDbTestiniBaslat();