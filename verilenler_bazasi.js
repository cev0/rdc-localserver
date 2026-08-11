"use strict";

const {
    Pool
} = require("pg");


// ============================================================
// HOVUZLAR
// ============================================================

let proqramHovuzu = null;
let adminHovuzu = null;


// ============================================================
// ENV URL AL
// ============================================================

function baglantiUrlAl(
    deyisenAdi
) {
    const url =
        String(
            process.env[deyisenAdi] || ""
        ).trim();

    if (!url) {
        throw new Error(
            `${deyisenAdi} təyin edilməyib.`
        );
    }

    return url;
}


// ============================================================
// POSTGRES HOVUZU YARAT
// ============================================================

function hovuzYarat(
    baglantiUrl,
    hovuzAdi,
    maksimumBaglanti
) {
    const hovuz =
        new Pool({
            connectionString:
                baglantiUrl,

            // Koyeb PostgreSQL SSL tələb edir.
            ssl: {
                rejectUnauthorized:
                    true
            },

            max:
                maksimumBaglanti,

            idleTimeoutMillis:
                10000,

            connectionTimeoutMillis:
                15000
        });


    // Idle connection xətası serveri crash etməsin.
    hovuz.on(
        "error",
        (xeta) => {
            console.error(
                `[VERILENLER_BAZASI:${hovuzAdi}] ` +
                "Hovuz xətası:",
                xeta.message
            );
        }
    );


    return hovuz;
}


// ============================================================
// OYUN SERVERİ HOVUZU
// ------------------------------------------------------------
// Normal SELECT / INSERT / UPDATE / DELETE üçün.
// DATABASE_URL = demiryumruq_app
// ============================================================

function proqramHovuzunuAl()
{
    if (proqramHovuzu != null) {
        return proqramHovuzu;
    }

    proqramHovuzu =
        hovuzYarat(
            baglantiUrlAl(
                "DATABASE_URL"
            ),
            "PROQRAM",
            5
        );

    return proqramHovuzu;
}


// ============================================================
// ADMIN HOVUZU
// ------------------------------------------------------------
// Migration / schema əməliyyatları üçün.
// Normal gameplay query-lərində istifadə edilməməlidir.
// ============================================================

function adminHovuzunuAl()
{
    if (adminHovuzu != null) {
        return adminHovuzu;
    }

    adminHovuzu =
        hovuzYarat(
            baglantiUrlAl(
                "DATABASE_ADMIN_URL"
            ),
            "ADMIN",
            2
        );

    return adminHovuzu;
}


// ============================================================
// NORMAL SORĞU
// ============================================================

async function sorguEt(
    sql,
    parametrler = []
) {
    return await proqramHovuzunuAl()
        .query(
            sql,
            parametrler
        );
}


// ============================================================
// ADMIN SORĞUSU
// ============================================================

async function adminSorquEt(
    sql,
    parametrler = []
) {
    return await adminHovuzunuAl()
        .query(
            sql,
            parametrler
        );
}


// ============================================================
// BAĞLANTI YOXLAMASI
// ============================================================

async function baglantiniYoxla(
    nov
) {
    const hovuz =
        nov === "admin"
            ? adminHovuzunuAl()
            : proqramHovuzunuAl();


    const netice =
        await hovuz.query(`
            SELECT
                current_database() AS database_adi,
                current_user AS istifadeci,
                NOW() AS server_vaxti
        `);


    if (
        !netice.rows ||
        netice.rows.length === 0
    ) {
        throw new Error(
            "PostgreSQL yoxlama cavabı boşdur."
        );
    }


    return netice.rows[0];
}


// ============================================================
// HOVUZLARI BAĞLA
// ============================================================

async function hovuzlariBagla()
{
    if (proqramHovuzu != null) {
        await proqramHovuzu.end();
        proqramHovuzu = null;
    }

    if (adminHovuzu != null) {
        await adminHovuzu.end();
        adminHovuzu = null;
    }
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {
    sorguEt,
    adminSorquEt,

    proqramHovuzunuAl,
    adminHovuzunuAl,

    baglantiniYoxla,
    hovuzlariBagla
};