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

    const fayllar = fs
        .readdirSync(MIQRASIYA_QOVLUGU)
        .filter((ad) => ad.toLowerCase().endsWith(".sql"))
        .sort((a, b) => a.localeCompare(b));

    // Keep existing ledger names: assignment alters the table created by runtime.
    const runtime = "20260918_world_state_runtime.sql";
    const assignment = "20260918_world_state_assignment.sql";
    const runtimeIndex = fayllar.indexOf(runtime);
    const assignmentIndex = fayllar.indexOf(assignment);
    if (runtimeIndex >= 0 && assignmentIndex >= 0 && runtimeIndex > assignmentIndex) {
        fayllar.splice(runtimeIndex, 1);
        fayllar.splice(assignmentIndex, 0, runtime);
    }
    return fayllar;
}

async function miqrasiyalariBaslat() {
    const hovuz = adminHovuzunuAl();
    const client = await hovuz.connect();

    try {
        // Serialize overlapping deployment starts before inspecting the ledger.
        await client.query("SELECT pg_advisory_lock(742196, 1)");
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

            // SQL files may own an outer BEGIN/COMMIT. Move that boundary here
            // so the schema change and its ledger entry commit together.
            const body = sql.trim().replace(/^BEGIN\s*;/i, "").replace(/COMMIT\s*;\s*$/i, "");
            await client.query("BEGIN");
            await client.query(body);

            await client.query(
                `
                INSERT INTO miqrasiyalar (ad)
                VALUES ($1)
                `,
                [miqrasiyaAdi]
            );

            await client.query("COMMIT");

            console.log(
                "[DB_MIQ] Miqrasiya uğurla tamamlandı:",
                miqrasiyaAdi
            );
        }

        console.log("[DB_MIQ] Bütün miqrasiyalar yoxlanıldı.");
    }
    catch (xeta) {
        await client.query("ROLLBACK").catch(() => {});
        console.error(
            "[DB_MIQ] Miqrasiya uğursuz oldu:",
            xeta
        );
        process.exitCode = 1;
    }
    finally {
        // Closing this dedicated connection also releases the session lock.
        client.release(true);

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

miqrasiyalariBaslat().catch(async (xeta) => {
    console.error("[DB_MIQ] Başlanğıc xətası:", xeta.message);
    process.exitCode = 1;
    await hovuzlariBagla();
});
