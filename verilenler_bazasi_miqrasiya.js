"use strict";

const fs = require("fs");
const path = require("path");

const {
    adminHovuzunuAl,
    hovuzlariBagla
} = require("./verilenler_bazasi");


const MIQRASIYA_ADI =
    "001_hesab_sistemi";

const MIQRASIYA_FAYLI =
    path.join(
        __dirname,
        "miqrasiyalar",
        "001_hesab_sistemi.sql"
    );


async function miqrasiyaniBaslat()
{
    const hovuz =
        adminHovuzunuAl();

    const client =
        await hovuz.connect();


    try {
        console.log(
            "[DB_MIQ] Miqrasiya başlayır:",
            MIQRASIYA_ADI
        );


        // Miqrasiya cədvəli yoxdursa əvvəl yaradırıq.
        await client.query(`
            CREATE TABLE IF NOT EXISTS miqrasiyalar (
                ad TEXT PRIMARY KEY,
                tetbiq_vaxti TIMESTAMPTZ
                    NOT NULL
                    DEFAULT NOW()
            )
        `);


        const yoxlama =
            await client.query(
                `
                SELECT ad
                FROM miqrasiyalar
                WHERE ad = $1
                LIMIT 1
                `,
                [
                    MIQRASIYA_ADI
                ]
            );


        if (
            yoxlama.rows &&
            yoxlama.rows.length > 0
        ) {
            console.log(
                "[DB_MIQ] Bu miqrasiya artıq tətbiq olunub:",
                MIQRASIYA_ADI
            );

            return;
        }


        if (
            !fs.existsSync(
                MIQRASIYA_FAYLI
            )
        ) {
            throw new Error(
                "Miqrasiya SQL faylı tapılmadı."
            );
        }


        const sql =
            fs.readFileSync(
                MIQRASIYA_FAYLI,
                "utf8"
            );


        if (!sql.trim()) {
            throw new Error(
                "Miqrasiya SQL faylı boşdur."
            );
        }


        await client.query(sql);


        await client.query(
            `
            INSERT INTO miqrasiyalar (
                ad
            )
            VALUES ($1)
            `,
            [
                MIQRASIYA_ADI
            ]
        );


        console.log(
            "[DB_MIQ] Miqrasiya uğurla tamamlandı:",
            MIQRASIYA_ADI
        );
    }
    catch (xeta) {
        console.error(
            "[DB_MIQ] Miqrasiya uğursuz oldu:",
            xeta
        );

        process.exitCode = 1;
    }
    finally {
        client.release();

        try {
            await hovuzlariBagla();
        }
        catch (baglamaXetasi) {
            console.error(
                "[DB_MIQ] Hovuz bağlanarkən xəta:",
                baglamaXetasi
            );
        }
    }
}


miqrasiyaniBaslat();