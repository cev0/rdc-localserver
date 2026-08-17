"use strict";

const fs = require("fs");
const path = require("path");

const {
    proqramHovuzunuAl,
    hovuzlariBagla
} = require("./verilenler_bazasi");


const HESABLAR_FAYLI =
    process.env.HESABLAR_FAYLI ||
    path.join(
        __dirname,
        "hesablar.json"
    );


// ============================================================
// UNIX MS -> DATE
// ============================================================

function tarixYarat(ms)
{
    const deyer =
        Number(ms || 0);

    if (
        !Number.isFinite(deyer) ||
        deyer <= 0
    ) {
        return null;
    }

    return new Date(deyer);
}


// ============================================================
// JSON-DAN HESABLARI OXU
// ============================================================

function jsonHesablariOxu()
{
    if (
        !fs.existsSync(
            HESABLAR_FAYLI
        )
    ) {
        console.log(
            "[HESAB_KOCURME] hesablar.json tapılmadı."
        );

        return [];
    }


    const xam =
        fs.readFileSync(
            HESABLAR_FAYLI,
            "utf8"
        );


    if (!xam.trim()) {
        console.log(
            "[HESAB_KOCURME] hesablar.json boşdur."
        );

        return [];
    }


    const melumat =
        JSON.parse(xam);


    if (!Array.isArray(melumat)) {
        throw new Error(
            "hesablar.json array deyil."
        );
    }


    return melumat;
}


// ============================================================
// BİR HESABI KÖÇÜR
// ============================================================

async function hesabiKocur(
    client,
    hesab
)
{
    if (
        !hesab ||
        typeof hesab !== "object"
    ) {
        return {
            kecildi: true,
            sebeb: "Hesab obyekti düzgün deyil."
        };
    }


    const hesabId =
        String(
            hesab.accountId || ""
        ).trim();

    const playerId =
        String(
            hesab.playerId || ""
        ).trim();

    const esasEmail =
        String(
            hesab.primaryEmail || ""
        )
            .trim()
            .toLowerCase();

    const ikinciEmail =
        String(
            hesab.secondaryEmail || ""
        )
            .trim()
            .toLowerCase();

    const sifreHash =
        String(
            hesab.passwordHash || ""
        );

    const pinHash =
        String(
            hesab.pinHash || ""
        );


    if (
        !hesabId ||
        !playerId ||
        !esasEmail ||
        !sifreHash
    ) {
        return {
            kecildi: true,
            sebeb:
                "Məcburi hesab məlumatı çatışmır."
        };
    }


    let status =
        "aktiv";


    if (
        Number(
            hesab.deletionRequestedAtMs || 0
        ) > 0
    ) {
        status =
            "silinme_gozleyir";
    }


    const yaradilmaVaxti =
        tarixYarat(
            hesab.createdAtMs
        ) ||
        new Date();

    const yenilenmeVaxti =
        tarixYarat(
            hesab.updatedAtMs
        ) ||
        yaradilmaVaxti;


    // ========================================================
    // HESAB
    // ========================================================

    await client.query(
        `
        INSERT INTO hesablar (
            hesab_id,
            oyuncu_id,
            esas_email,
            ikinci_email,
            email_tesdiqlenib,
            sifre_hash,
            pin_hash,
            status,
            yaradilma_vaxti,
            yenilenme_vaxti
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10
        )

        ON CONFLICT (hesab_id)
        DO UPDATE SET
            oyuncu_id = EXCLUDED.oyuncu_id,
            esas_email = EXCLUDED.esas_email,
            ikinci_email = EXCLUDED.ikinci_email,
            email_tesdiqlenib = EXCLUDED.email_tesdiqlenib,
            sifre_hash = EXCLUDED.sifre_hash,
            pin_hash = EXCLUDED.pin_hash,
            status = EXCLUDED.status,
            yenilenme_vaxti = EXCLUDED.yenilenme_vaxti
        `,
        [
            hesabId,
            playerId,
            esasEmail,

            ikinciEmail
                ? ikinciEmail
                : null,

            hesab.emailVerified === true,

            sifreHash,

            pinHash
                ? pinHash
                : null,

            status,
            yaradilmaVaxti,
            yenilenmeVaxti
        ]
    );


    // ========================================================
    // PROVIDER-LƏR
    // ========================================================

    const provayderler =
        Array.isArray(
            hesab.providers
        )
            ? hesab.providers
            : [
                "email"
            ];


    for (
        const xamProvayder
        of provayderler
    ) {
        const provayder =
            String(
                xamProvayder || ""
            )
                .trim()
                .toLowerCase();


        if (!provayder) {
            continue;
        }


        let provayderIstifadeciId =
            esasEmail;


        // Gələcək provider-lər üçün fallback.
        if (
            provayder !== "email"
        ) {
            provayderIstifadeciId =
                `${provayder}:${playerId}`;
        }


        await client.query(
            `
            INSERT INTO hesab_provayderleri (
                hesab_id,
                provayder,
                provayder_istifadeci_id
            )
            VALUES (
                $1,
                $2,
                $3
            )

            ON CONFLICT DO NOTHING
            `,
            [
                hesabId,
                provayder,
                provayderIstifadeciId
            ]
        );
    }


    // ========================================================
    // AKTİV EMAIL TƏSDİQİ VARSA KÖÇÜR
    // ========================================================

    const tesdiq =
        hesab.emailVerification;


    if (
        hesab.emailVerified !== true &&
        tesdiq &&
        typeof tesdiq === "object" &&
        tesdiq.codeHash &&
        tesdiq.salt
    ) {
        const bitmeVaxti =
            tarixYarat(
                tesdiq.expiresAtMs
            );

        const sonGonderilme =
            tarixYarat(
                tesdiq.lastSentAtMs
            ) ||
            new Date();


        if (bitmeVaxti) {
            await client.query(
                `
                INSERT INTO email_tesdiqleri (
                    hesab_id,
                    kod_hash,
                    duz,
                    bitme_vaxti,
                    cehd_sayi,
                    son_gonderilme_vaxti
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6
                )

                ON CONFLICT (hesab_id)
                DO UPDATE SET
                    kod_hash = EXCLUDED.kod_hash,
                    duz = EXCLUDED.duz,
                    bitme_vaxti = EXCLUDED.bitme_vaxti,
                    cehd_sayi = EXCLUDED.cehd_sayi,
                    son_gonderilme_vaxti =
                        EXCLUDED.son_gonderilme_vaxti
                `,
                [
                    hesabId,
                    String(
                        tesdiq.codeHash
                    ),
                    String(
                        tesdiq.salt
                    ),
                    bitmeVaxti,

                    Math.max(
                        0,
                        Math.trunc(
                            Number(
                                tesdiq.attempts
                            ) || 0
                        )
                    ),

                    sonGonderilme
                ]
            );
        }
    }


    return {
        kecildi: false,
        playerId: playerId,
        email: esasEmail
    };
}


// ============================================================
// KÖÇÜRMƏNİ BAŞLAT
// ============================================================

async function kocurmeniBaslat()
{
    console.log(
        "[HESAB_KOCURME] JSON → PostgreSQL köçürməsi başlayır..."
    );


    let hesablar;


    try {
        hesablar =
            jsonHesablariOxu();
    }
    catch (xeta) {
        console.error(
            "[HESAB_KOCURME] JSON oxunmadı:",
            xeta
        );

        process.exitCode = 1;
        return;
    }


    console.log(
        `[HESAB_KOCURME] JSON hesab sayı: ${hesablar.length}`
    );


    if (hesablar.length === 0) {
        console.log(
            "[HESAB_KOCURME] Köçürüləcək hesab yoxdur."
        );

        return;
    }


    const hovuz =
        proqramHovuzunuAl();

    const client =
        await hovuz.connect();


    let ugurluSay =
        0;

    let kecilenSay =
        0;


    try {
        await client.query(
            "BEGIN"
        );


        for (
            const hesab
            of hesablar
        ) {
            const netice =
                await hesabiKocur(
                    client,
                    hesab
                );


            if (netice.kecildi) {
                kecilenSay++;

                console.warn(
                    "[HESAB_KOCURME] Hesab keçildi:",
                    netice.sebeb
                );

                continue;
            }


            ugurluSay++;


            console.log(
                "[HESAB_KOCURME] Hesab köçürüldü:",
                {
                    playerId:
                        netice.playerId
                }
            );
        }


        await client.query(
            "COMMIT"
        );


        console.log(
            "[HESAB_KOCURME] Köçürmə tamamlandı:",
            {
                ugurlu:
                    ugurluSay,

                kecilen:
                    kecilenSay,

                umumi:
                    hesablar.length
            }
        );
    }
    catch (xeta) {
        try {
            await client.query(
                "ROLLBACK"
            );
        }
        catch {
        }


        console.error(
            "[HESAB_KOCURME] Köçürmə uğursuz oldu:",
            xeta
        );

        process.exitCode = 1;
    }
    finally {
        client.release();

        try {
            await hovuzlariBagla();
        }
        catch {
        }
    }
}


kocurmeniBaslat();