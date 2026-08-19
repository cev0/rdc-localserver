"use strict";

const crypto = require("crypto");
const {
    sexsiMesajYarat,
    olkeMesajiYarat,
    ittifaqMesajiYarat,
    mesajiIdIleGetir,
    sexsiMesajTarixcesiniGetir,
    olkeMesajTarixcesiniGetir,
    ittifaqMesajTarixcesiniGetir,
    sexsiMesajlariOxunduEt,
    oxunmamisSexsiMesajSayiniGetir,
    tercumeKesiniGetir,
    tercumeKesiniYaddaSaxla
} = require("./mesajlasma_postgres");
const {
    DESTEKLENEN_OYUN_DILLERI,
    oyunDiliDesteklenir,
    oyunDiliniGetir,
    oyunDiliniYaddaSaxla
} = require("./oyun_dili_postgres");
const { metniTercumeEt } = require("./tercume_xidmeti");

const MESAJ_MAX_UZUNLUQ = 500;
const MESAJ_MIN_INTERVAL_MS = 600;
const TERCUME_MIN_INTERVAL_MS = 1000;

const sonMesajVaxtlari = new Map();
const sonTercumeVaxtlari = new Map();

const DESTEKLENEN_MESAJ_NOVLERI = new Set([
    "oyun_dili_getir_request",
    "oyun_dili_deyis_request",
    "sexsi_mesaj_gonder_request",
    "sexsi_mesaj_tarixcesi_request",
    "sexsi_mesaj_oxundu_request",
    "sexsi_oxunmamis_say_request",
    "olke_mesaj_gonder_request",
    "olke_mesaj_tarixcesi_request",
    "ittifaq_mesaj_gonder_request",
    "ittifaq_mesaj_tarixcesi_request",
    "mesaj_tercume_request"
]);

function metnAl(deyer, max = MESAJ_MAX_UZUNLUQ) {
    return typeof deyer === "string" ? deyer.trim().slice(0, max) : "";
}

function mesajIdYarat() {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return crypto.randomBytes(16).toString("hex");
}

function yukAl(msg) {
    const netice = {};
    if (msg && typeof msg.payloadJson === "string" && msg.payloadJson.trim()) {
        try {
            const parse = JSON.parse(msg.payloadJson);
            if (parse && typeof parse === "object" && !Array.isArray(parse)) {
                Object.assign(netice, parse);
            }
        } catch (_) {
            // Köhnə/top-level müqavilə ilə davam et.
        }
    }
    if (msg && typeof msg === "object") Object.assign(netice, msg);
    return netice;
}

function cavabGonder(send, ws, type, playerId, yuk) {
    send(ws, {
        type,
        playerId: playerId || null,
        serverTimeUnixMs: Date.now(),
        payloadJson: JSON.stringify(yuk || {})
    });
}

function xetaGonder(send, ws, type, playerId, kod, mesaj) {
    cavabGonder(send, ws, type, playerId, {
        success: false,
        xetaKodu: kod,
        mesaj: mesaj || kod
    });
}

function intervalIcazesi(map, playerId, minimumMs) {
    const indi = Date.now();
    const evvel = Number(map.get(playerId) || 0);
    if (indi - evvel < minimumMs) return false;
    map.set(playerId, indi);
    return true;
}

function dovletIdAl(getOrCreatePlayerState, playerId) {
    const state = getOrCreatePlayerState(playerId);
    const id = Number(state && state.worldPlacement && state.worldPlacement.stateId);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function ittifaqIdAl(getOrCreatePlayerState, playerId) {
    const state = getOrCreatePlayerState(playerId);
    if (!state) return "";

    const sabitId =
        metnAl(state.ittifaqId, 128) ||
        metnAl(state.allianceId, 128) ||
        metnAl(state.ittifaq && state.ittifaq.ittifaqId, 128) ||
        metnAl(state.ittifaq && state.ittifaq.id, 128) ||
        metnAl(state.playerProfile && state.playerProfile.ittifaqId, 128);

    if (sabitId) return sabitId;

    // Köhnə state-lərlə müvəqqəti uyğunluq. İttifaq modulu sabit ittifaqId
    // yaratdıqdan sonra bu fallback silinə bilər.
    const kohneAd =
        metnAl(state.ittifaqAdi, 128) ||
        metnAl(state.playerProfile && state.playerProfile.ittifaqAdi, 128);
    return kohneAd ? `ad:${kohneAd.toLowerCase()}` : "";
}

function mesajGoruntulemeIcazesi(mesaj, playerId, getOrCreatePlayerState) {
    if (!mesaj) return false;

    if (mesaj.kanalNovu === "sexsi") {
        return mesaj.gonderenPlayerId === playerId || mesaj.qebulEdenPlayerId === playerId;
    }

    if (mesaj.kanalNovu === "olke") {
        const dovletId = dovletIdAl(getOrCreatePlayerState, playerId);
        return dovletId != null && Number(mesaj.dovletId) === dovletId;
    }

    if (mesaj.kanalNovu === "ittifaq") {
        const ittifaqId = ittifaqIdAl(getOrCreatePlayerState, playerId);
        return !!ittifaqId && mesaj.ittifaqId === ittifaqId;
    }

    return false;
}

function oyuncuyaGonder(connections, send, playerId, type, yuk) {
    if (!connections || typeof connections.get !== "function") return false;
    const socket = connections.get(playerId);
    if (!socket) return false;
    cavabGonder(send, socket, type, playerId, yuk);
    return true;
}

function dovleteYayimEt(connections, send, getOrCreatePlayerState, dovletId, type, yuk) {
    if (!connections || typeof connections.entries !== "function") return 0;
    let say = 0;
    for (const [digerPlayerId, socket] of connections.entries()) {
        if (!socket) continue;
        if (dovletIdAl(getOrCreatePlayerState, digerPlayerId) !== dovletId) continue;
        cavabGonder(send, socket, type, digerPlayerId, yuk);
        say++;
    }
    return say;
}

function ittifaqaYayimEt(connections, send, getOrCreatePlayerState, ittifaqId, type, yuk) {
    if (!connections || typeof connections.entries !== "function") return 0;
    let say = 0;
    for (const [digerPlayerId, socket] of connections.entries()) {
        if (!socket) continue;
        if (ittifaqIdAl(getOrCreatePlayerState, digerPlayerId) !== ittifaqId) continue;
        cavabGonder(send, socket, type, digerPlayerId, yuk);
        say++;
    }
    return say;
}

async function mesajlasmaMesajiniEmalEt(kontekst) {
    const { ws, msg, send, connections, getOrCreatePlayerState } = kontekst || {};
    if (!ws || !msg || typeof send !== "function") return false;

    const type = metnAl(msg.type || kontekst.type, 128).toLowerCase();
    if (!DESTEKLENEN_MESAJ_NOVLERI.has(type)) return false;

    const playerId = metnAl(ws._authedPlayerId, 128);
    if (!playerId) {
        xetaGonder(send, ws, `${type}_result`, null, "AUTH_REQUIRED", "Əvvəl autentifikasiya olunmalıdır.");
        return true;
    }

    const yuk = yukAl(msg);

    try {
        if (type === "oyun_dili_getir_request") {
            const oyunDili = await oyunDiliniGetir(playerId);
            cavabGonder(send, ws, "oyun_dili_getir_result", playerId, {
                success: true,
                oyunDili,
                desteklenenDiller: DESTEKLENEN_OYUN_DILLERI
            });
            return true;
        }

        if (type === "oyun_dili_deyis_request") {
            const yeniDil = metnAl(yuk.oyunDili, 5).toLowerCase();
            if (!oyunDiliDesteklenir(yeniDil)) {
                xetaGonder(send, ws, "oyun_dili_deyis_result", playerId, "DESTEKLENMEYEN_OYUN_DILI", "Yalnız az, ru, en, tr qəbul edilir.");
                return true;
            }
            const netice = await oyunDiliniYaddaSaxla(playerId, yeniDil);
            cavabGonder(send, ws, "oyun_dili_deyis_result", playerId, {
                success: true,
                oyunDili: netice.oyunDili
            });
            return true;
        }

        if (type === "sexsi_mesaj_gonder_request") {
            if (!intervalIcazesi(sonMesajVaxtlari, playerId, MESAJ_MIN_INTERVAL_MS)) {
                xetaGonder(send, ws, "sexsi_mesaj_gonder_result", playerId, "MESAJ_COX_SURETLI", "Mesajları çox sürətli göndərirsiniz.");
                return true;
            }

            const qebulEdenPlayerId = metnAl(yuk.qebulEdenPlayerId, 128);
            const metn = metnAl(yuk.metn, MESAJ_MAX_UZUNLUQ);
            if (!qebulEdenPlayerId || qebulEdenPlayerId === playerId) {
                xetaGonder(send, ws, "sexsi_mesaj_gonder_result", playerId, "QEBUL_EDEN_SEHVDIR", "Qəbul edən oyunçu düzgün deyil.");
                return true;
            }
            if (!metn) {
                xetaGonder(send, ws, "sexsi_mesaj_gonder_result", playerId, "MESAJ_BOSDUR", "Mesaj boş ola bilməz.");
                return true;
            }

            const mesaj = await sexsiMesajYarat({
                mesajId: mesajIdYarat(),
                gonderenPlayerId: playerId,
                qebulEdenPlayerId,
                metn
            });

            cavabGonder(send, ws, "sexsi_mesaj_gonder_result", playerId, {
                success: true,
                mesaj
            });
            oyuncuyaGonder(connections, send, qebulEdenPlayerId, "sexsi_mesaj_geldi", {
                mesaj
            });
            return true;
        }

        if (type === "sexsi_mesaj_tarixcesi_request") {
            const digerPlayerId = metnAl(yuk.digerPlayerId || yuk.qebulEdenPlayerId, 128);
            if (!digerPlayerId || digerPlayerId === playerId) {
                xetaGonder(send, ws, "sexsi_mesaj_tarixcesi_result", playerId, "DIGER_OYUNCU_SEHVDIR", "Digər oyunçu düzgün deyil.");
                return true;
            }
            const mesajlar = await sexsiMesajTarixcesiniGetir(playerId, digerPlayerId, yuk.limit);
            cavabGonder(send, ws, "sexsi_mesaj_tarixcesi_result", playerId, {
                success: true,
                digerPlayerId,
                mesajlar
            });
            return true;
        }

        if (type === "sexsi_mesaj_oxundu_request") {
            const digerPlayerId = metnAl(yuk.digerPlayerId || yuk.gonderenPlayerId, 128);
            if (!digerPlayerId) {
                xetaGonder(send, ws, "sexsi_mesaj_oxundu_result", playerId, "DIGER_OYUNCU_BOSDUR", "Digər oyunçu ID-si tələb olunur.");
                return true;
            }
            const say = await sexsiMesajlariOxunduEt(playerId, digerPlayerId);
            cavabGonder(send, ws, "sexsi_mesaj_oxundu_result", playerId, {
                success: true,
                digerPlayerId,
                oxunduEdilenSay: say
            });
            oyuncuyaGonder(connections, send, digerPlayerId, "sexsi_mesajlar_oxundu", {
                oxuyanPlayerId: playerId
            });
            return true;
        }

        if (type === "sexsi_oxunmamis_say_request") {
            const say = await oxunmamisSexsiMesajSayiniGetir(playerId);
            cavabGonder(send, ws, "sexsi_oxunmamis_say_result", playerId, {
                success: true,
                oxunmamisSay: say
            });
            return true;
        }

        if (type === "olke_mesaj_gonder_request") {
            if (!intervalIcazesi(sonMesajVaxtlari, playerId, MESAJ_MIN_INTERVAL_MS)) {
                xetaGonder(send, ws, "olke_mesaj_gonder_result", playerId, "MESAJ_COX_SURETLI", "Mesajları çox sürətli göndərirsiniz.");
                return true;
            }
            const dovletId = dovletIdAl(getOrCreatePlayerState, playerId);
            const metn = metnAl(yuk.metn, MESAJ_MAX_UZUNLUQ);
            if (dovletId == null) {
                xetaGonder(send, ws, "olke_mesaj_gonder_result", playerId, "DOVLET_TAPILMADI", "Oyunçunun ölkəsi müəyyən edilmədi.");
                return true;
            }
            if (!metn) {
                xetaGonder(send, ws, "olke_mesaj_gonder_result", playerId, "MESAJ_BOSDUR", "Mesaj boş ola bilməz.");
                return true;
            }

            const mesaj = await olkeMesajiYarat({
                mesajId: mesajIdYarat(),
                gonderenPlayerId: playerId,
                dovletId,
                metn
            });
            dovleteYayimEt(connections, send, getOrCreatePlayerState, dovletId, "olke_mesaj_geldi", { mesaj });
            cavabGonder(send, ws, "olke_mesaj_gonder_result", playerId, {
                success: true,
                mesajId: mesaj.mesajId
            });
            return true;
        }

        if (type === "olke_mesaj_tarixcesi_request") {
            const dovletId = dovletIdAl(getOrCreatePlayerState, playerId);
            if (dovletId == null) {
                xetaGonder(send, ws, "olke_mesaj_tarixcesi_result", playerId, "DOVLET_TAPILMADI", "Oyunçunun ölkəsi müəyyən edilmədi.");
                return true;
            }
            const mesajlar = await olkeMesajTarixcesiniGetir(dovletId, yuk.limit);
            cavabGonder(send, ws, "olke_mesaj_tarixcesi_result", playerId, {
                success: true,
                dovletId,
                mesajlar
            });
            return true;
        }

        if (type === "ittifaq_mesaj_gonder_request") {
            if (!intervalIcazesi(sonMesajVaxtlari, playerId, MESAJ_MIN_INTERVAL_MS)) {
                xetaGonder(send, ws, "ittifaq_mesaj_gonder_result", playerId, "MESAJ_COX_SURETLI", "Mesajları çox sürətli göndərirsiniz.");
                return true;
            }
            const ittifaqId = ittifaqIdAl(getOrCreatePlayerState, playerId);
            const metn = metnAl(yuk.metn, MESAJ_MAX_UZUNLUQ);
            if (!ittifaqId) {
                xetaGonder(send, ws, "ittifaq_mesaj_gonder_result", playerId, "ITTIFAQA_UZV_DEYIL", "Oyunçu heç bir ittifaqa üzv deyil.");
                return true;
            }
            if (!metn) {
                xetaGonder(send, ws, "ittifaq_mesaj_gonder_result", playerId, "MESAJ_BOSDUR", "Mesaj boş ola bilməz.");
                return true;
            }

            const mesaj = await ittifaqMesajiYarat({
                mesajId: mesajIdYarat(),
                gonderenPlayerId: playerId,
                ittifaqId,
                metn
            });
            ittifaqaYayimEt(connections, send, getOrCreatePlayerState, ittifaqId, "ittifaq_mesaj_geldi", { mesaj });
            cavabGonder(send, ws, "ittifaq_mesaj_gonder_result", playerId, {
                success: true,
                mesajId: mesaj.mesajId
            });
            return true;
        }

        if (type === "ittifaq_mesaj_tarixcesi_request") {
            const ittifaqId = ittifaqIdAl(getOrCreatePlayerState, playerId);
            if (!ittifaqId) {
                xetaGonder(send, ws, "ittifaq_mesaj_tarixcesi_result", playerId, "ITTIFAQA_UZV_DEYIL", "Oyunçu heç bir ittifaqa üzv deyil.");
                return true;
            }
            const mesajlar = await ittifaqMesajTarixcesiniGetir(ittifaqId, yuk.limit);
            cavabGonder(send, ws, "ittifaq_mesaj_tarixcesi_result", playerId, {
                success: true,
                ittifaqId,
                mesajlar
            });
            return true;
        }

        if (type === "mesaj_tercume_request") {
            if (!intervalIcazesi(sonTercumeVaxtlari, playerId, TERCUME_MIN_INTERVAL_MS)) {
                xetaGonder(send, ws, "mesaj_tercume_result", playerId, "TERCUME_COX_SURETLI", "Tərcümə sorğuları çox sürətlidir.");
                return true;
            }

            const mesajId = metnAl(yuk.mesajId, 128);
            if (!mesajId) {
                xetaGonder(send, ws, "mesaj_tercume_result", playerId, "MESAJ_ID_BOSDUR", "Mesaj ID-si tələb olunur.");
                return true;
            }

            const mesaj = await mesajiIdIleGetir(mesajId);
            if (!mesaj || !mesajGoruntulemeIcazesi(mesaj, playerId, getOrCreatePlayerState)) {
                xetaGonder(send, ws, "mesaj_tercume_result", playerId, "MESAJ_ELCATAN_DEYIL", "Bu mesajı tərcümə etmək icazəniz yoxdur.");
                return true;
            }

            const hedefDil = await oyunDiliniGetir(playerId);
            const kes = await tercumeKesiniGetir(mesajId, hedefDil);
            if (kes) {
                cavabGonder(send, ws, "mesaj_tercume_result", playerId, {
                    success: true,
                    cache: true,
                    mesajId,
                    hedefDil,
                    orijinalDil: kes.orijinalDil,
                    orijinalMetn: mesaj.metn,
                    tercumeMetni: kes.tercumeMetni
                });
                return true;
            }

            const tercume = await metniTercumeEt({
                metn: mesaj.metn,
                hedefDil
            });
            const saxlanmis = await tercumeKesiniYaddaSaxla({
                mesajId,
                hedefDil,
                orijinalDil: tercume.orijinalDil,
                tercumeMetni: tercume.tercumeMetni
            });

            cavabGonder(send, ws, "mesaj_tercume_result", playerId, {
                success: true,
                cache: false,
                mesajId,
                hedefDil,
                orijinalDil: saxlanmis.orijinalDil,
                orijinalMetn: mesaj.metn,
                tercumeMetni: saxlanmis.tercumeMetni
            });
            return true;
        }
    } catch (xeta) {
        const kod = xeta && xeta.message ? String(xeta.message).slice(0, 128) : "MESAJLASMA_SERVER_XETASI";
        console.error("[MESAJLASMA] Handler xətası:", type, playerId, kod);
        xetaGonder(send, ws, `${type}_result`, playerId, kod, "Mesajlaşma əməliyyatı tamamlanmadı.");
        return true;
    }

    return false;
}

module.exports = {
    DESTEKLENEN_MESAJ_NOVLERI,
    mesajlasmaMesajiniEmalEt,
    dovletIdAl,
    ittifaqIdAl,
    mesajGoruntulemeIcazesi
};
