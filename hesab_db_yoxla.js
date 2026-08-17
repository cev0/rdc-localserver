"use strict";

const {
    hesabEmailIleTap
} = require("./hesab_yaddasi_postgres");

const {
    hovuzlariBagla
} = require("./verilenler_bazasi");

async function baslat() {
    const email = String(
        process.argv[2] || ""
    ).trim();

    if (!email) {
        console.log(
            "[HESAB_YOXLA] İstifadə: npm run hesab:yoxla -- email@example.com"
        );
        process.exitCode = 1;
        return;
    }

    try {
        const hesab = await hesabEmailIleTap(email);

        if (!hesab) {
            console.log("[HESAB_YOXLA] HESAB TAPILMADI");
            return;
        }

        console.log("[HESAB_YOXLA] HESAB TAPILDI:", {
            accountId: hesab.accountId,
            playerId: hesab.playerId,
            status: hesab.status
        });
    }
    catch (xeta) {
        console.error(
            "[HESAB_YOXLA] Xəta:",
            xeta
        );
        process.exitCode = 1;
    }
    finally {
        try {
            await hovuzlariBagla();
        }
        catch {
        }
    }
}

baslat();
