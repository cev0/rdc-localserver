"use strict";

const {
    baglantiniYoxla,
    hovuzlariBagla
} = require("./verilenler_bazasi");


async function testiBaslat()
{
    console.log(
        "[DB_TEST] PostgreSQL testi başlayır..."
    );


    try {
        // ====================================================
        // APP ROLE
        // ====================================================

        const proqramNeticesi =
            await baglantiniYoxla(
                "proqram"
            );

        console.log(
            "[DB_TEST] PROGRAM bağlantısı uğurludur:",
            {
                database:
                    proqramNeticesi.database_adi,

                istifadeci:
                    proqramNeticesi.istifadeci
            }
        );


        // ====================================================
        // ADMIN ROLE
        // ====================================================

        const adminNeticesi =
            await baglantiniYoxla(
                "admin"
            );

        console.log(
            "[DB_TEST] ADMIN bağlantısı uğurludur:",
            {
                database:
                    adminNeticesi.database_adi,

                istifadeci:
                    adminNeticesi.istifadeci
            }
        );


        console.log(
            "[DB_TEST] Bütün PostgreSQL testləri uğurla tamamlandı."
        );
    }
    catch (xeta) {
        console.error(
            "[DB_TEST] PostgreSQL testi uğursuz oldu:",
            xeta
        );

        process.exitCode = 1;
    }
    finally {
        try {
            await hovuzlariBagla();
        }
        catch (baglamaXetasi) {
            console.error(
                "[DB_TEST] Hovuz bağlanarkən xəta:",
                baglamaXetasi
            );
        }
    }
}


testiBaslat();