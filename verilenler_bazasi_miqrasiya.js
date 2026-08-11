"use strict";

const fs = require("fs");
const path = require("path");

const {
    adminHovuzunuAl,
    hovuzlariBagla
} = require("./verilenler_bazasi");

const MIQRASIYA_QOVLUGU =
    path.join(__dirname, "miqrasiyalar");

function miqrasiyaFayllariniAl() {
    if (!fs.existsSync(MIQRASIYA_QOVLUGU)) {
        throw new Error("Miqrasiyalar qovluğu tapılmadı.");
    }

    return fs
        .readdirSync(MIQRASIYA_QOVLUGU)
        .filter((ad) => ad.toLowerCase().endsWith(".sql"))
        .sort((a, b) => a.localeCompare(b));
}

async function miqrasiyalariBaslat() {
    const hovuz = adminHovuzunuAl();
    const client = await hovuz.connect();

    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS miqrasiyalar (
                ad TEXT PRIMARY KEY,
                tetbiq_vaxti TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        const fayllar = miqrasiyaFayllariniAl();

        if (fayllar.length === 0) {
            console.log("[DB_MIQ] Tətbiq ediləcək miqrasiya yoxdur.");
            return;
        }

        console.log(
            "[DB_MIQ] Miqrasiya faylları:",
            fayllar.join(", ")
        );

        for (const faylAdi of fayllar) {
            const miqrasiyaAdi = path.basename(faylAdi, ".sql");

            const yoxlama = await client.query(
                `
                SELECT ad
                FROM miqrasiyalar
                WHERE ad = $1
                LIMIT 1
                `,
                [miqrasiyaAdi]
            );

            if (yoxlama.rows && yoxlama.rows.length > 0) {
                console.log(
                    "[DB_MIQ] Artıq tətbiq olunub:",
                    miqrasiyaAdi
                );
                continue;
            }

            const tamYol = path.join(MIQRASIYA_QOVLUGU, faylAdi);
            const sql = fs.readFileSync(tamYol, "utf8");

            if (!sql.trim()) {
                throw new Error(
                    `Miqrasiya SQL faylı boşdur: ${faylAdi}`
                );
            }

            console.log(
                "[DB_MIQ] Miqrasiya başlayır:",
                miqrasiyaAdi
            );

            await client.query(sql);

            await client.query(
                `
                INSERT INTO miqrasiyalar (ad)
                VALUES ($1)
                `,
                [miqrasiyaAdi]
            );

            console.log(
                "[DB_MIQ] Miqrasiya uğurla tamamlandı:",
                miqrasiyaAdi
            );
        }

        console.log("[DB_MIQ] Bütün miqrasiyalar yoxlanıldı.");
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

miqrasiyalariBaslat();
