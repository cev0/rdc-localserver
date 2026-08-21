"use strict";

const {
    dovletIdAl,
    ittifaqIdAl
} = require("./mesajlasma_handler");

const {
    kanalOxunmamisSayiniGetir,
    kanalMesajlariniOxunduEt
} = require("./mesaj_kanal_oxunma_postgres");

const MESAJLAR = new Set([
    "olke_oxunmamis_say_request",
    "olke_mesajlari_oxundu_request",
    "ittifaq_oxunmamis_say_request",
    "ittifaq_mesajlari_oxundu_request"
]);

function metnAl(deyer, maksimum = 128) {
    return typeof deyer === "string"
        ? deyer.trim().slice(0, maksimum)
        : "";
}

function gonder(kontekst, type, playerId, yuk) {
    kontekst.send(kontekst.ws, {
        type,
        playerId: playerId || null,
        serverTimeUnixMs: kontekst.nowMs(),
        payloadJson: JSON.stringify(yuk || {})
    });
}

function xetaGonder(kontekst, type, playerId, xetaKodu, mesaj) {
    gonder(kontekst, type, playerId, {
        success: false,
        xetaKodu,
        mesaj,
        oxunmamisSay: 0
    });
}

async function mesajKanalOxunmaMesajiniEmalEt(kontekst) {
    const type = metnAl(kontekst && kontekst.type).toLowerCase();
    if (!MESAJLAR.has(type)) return false;

    const ws = kontekst && kontekst.ws;
    const playerId = metnAl(ws && ws._authedPlayerId);
    const resultType = type.replace(/_request$/, "_result");

    if (!playerId) {
        xetaGonder(
            kontekst,
            resultType,
            null,
            "AUTH_REQUIRED",
            "Mesaj bildirişləri üçün autentifikasiya tələb olunur."
        );
        return true;
    }

    const msg = kontekst.msg || {};
    const sorquPlayerId = metnAl(msg.playerId);

    if (sorquPlayerId && sorquPlayerId !== playerId) {
        xetaGonder(
            kontekst,
            resultType,
            playerId,
            "IDENTITY_MISMATCH",
            "Sorğudakı oyunçu ID-si aktiv sessiya ilə uyğun deyil."
        );
        return true;
    }

    try {
        const olkeSorqusudur = type.startsWith("olke_");
        const kanalNovu = olkeSorqusudur ? "olke" : "ittifaq";
        let kontekstId;

        if (olkeSorqusudur) {
            kontekstId = dovletIdAl(kontekst.getOrCreatePlayerState, playerId);

            if (kontekstId == null) {
                xetaGonder(
                    kontekst,
                    resultType,
                    playerId,
                    "DOVLET_TAPILMADI",
                    "Oyunçunun ölkəsi müəyyən edilmədi."
                );
                return true;
            }
        }
        else {
            kontekstId = ittifaqIdAl(kontekst.getOrCreatePlayerState, playerId);

            if (!kontekstId) {
                xetaGonder(
                    kontekst,
                    resultType,
                    playerId,
                    "ITTIFAQA_UZV_DEYIL",
                    "Oyunçu heç bir ittifaqa üzv deyil."
                );
                return true;
            }
        }

        if (type.endsWith("_oxunmamis_say_request")) {
            const say = await kanalOxunmamisSayiniGetir({
                playerId,
                kanalNovu,
                kontekstId
            });

            gonder(kontekst, resultType, playerId, {
                success: true,
                xetaKodu: "",
                kanalNovu,
                kontekstId: String(kontekstId),
                oxunmamisSay: say
            });
            return true;
        }

        const netice = await kanalMesajlariniOxunduEt({
            playerId,
            kanalNovu,
            kontekstId
        });

        gonder(kontekst, resultType, playerId, {
            success: true,
            xetaKodu: "",
            kanalNovu,
            kontekstId: String(kontekstId),
            oxunmamisSay: 0,
            sonOxunmaVaxtiMs: netice.sonOxunmaVaxtiMs
        });
        return true;
    }
    catch (xeta) {
        console.error("[MESAJ_KANAL_OXUNMA]", type, playerId, xeta);

        xetaGonder(
            kontekst,
            resultType,
            playerId,
            "MESAJ_KANAL_OXUNMA_SERVER_XETASI",
            "Kanal bildiriş vəziyyəti yenilənə bilmədi."
        );
        return true;
    }
}

module.exports = {
    MESAJLAR,
    mesajKanalOxunmaMesajiniEmalEt
};