"use strict";

const crypto = require("crypto");

// ============================================================
// RESURS TOPLAMA HESABATLARI
// ------------------------------------------------------------
// Hesabatlar əsas player state-ə əlavə edilmir.
// Məqsəd tez-tez göndərilən state paketini şişirtməməkdir.
//
// Hazır mərhələ:
// - hər oyunçu üçün ayrıca hesabat siyahısı
// - maksimum 100 hesabat
// - server-authoritative list request
// - Unity bağlantısını yoxlamaq üçün ilk sorğuda 3 test hesabatı
//
// TODO:
// Real dünya-resurs toplama sistemi tamamlandıqda
// TEST_HESABATLARINI_ILK_SORGUDA_YARAT false ediləcək və
// resursHesabatiYarat(...) real toplama tamamlanma nöqtəsindən
// çağırılacaq.
// ============================================================

const MAKSIMUM_HESABAT_SAYI = 100;
const TEST_HESABATLARINI_ILK_SORGUDA_YARAT = true;

const oyuncuHesabatlari = new Map();

function metnAl(deyer) {
  return typeof deyer === "string" ? deyer.trim() : "";
}

function tamEdedAl(deyer, minimum = 0) {
  const reqem = Number(deyer);

  if (!Number.isFinite(reqem)) {
    return minimum;
  }

  return Math.max(minimum, Math.trunc(reqem));
}

function tarixSaatiFormatla(ms) {
  const tarix = new Date(Number(ms) || Date.now());

  if (Number.isNaN(tarix.getTime())) {
    return "";
  }

  // Unity hazırda yyyy-MM-dd HH:mm:ss formatını gözləyir.
  return tarix
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

function yeniHesabatIdYarat() {
  if (typeof crypto.randomUUID === "function") {
    return `resurs_${crypto.randomUUID()}`;
  }

  return `resurs_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function oyuncuSiyahisiniAl(playerId) {
  const temizPlayerId = metnAl(playerId);

  if (!temizPlayerId) {
    return null;
  }

  if (!oyuncuHesabatlari.has(temizPlayerId)) {
    oyuncuHesabatlari.set(temizPlayerId, []);
  }

  return oyuncuHesabatlari.get(temizPlayerId);
}

function resursHesabatiYarat(playerId, melumat = {}) {
  const temizPlayerId = metnAl(playerId);

  if (!temizPlayerId) {
    return null;
  }

  const siyahi = oyuncuSiyahisiniAl(temizPlayerId);

  if (!siyahi) {
    return null;
  }

  const yaradildiMs = Number(melumat.yaradildiMs) || Date.now();

  const hesabat = {
    hesabatId: metnAl(melumat.hesabatId) || yeniHesabatIdYarat(),
    resursNovu: metnAl(melumat.resursNovu).toLowerCase() || "iron",
    miqdar: tamEdedAl(melumat.miqdar, 0),
    toplamaYeriAdi: metnAl(melumat.toplamaYeriAdi) || "Resurs nöqtəsi",
    toplamaYeriSeviyesi: tamEdedAl(melumat.toplamaYeriSeviyesi, 1),
    koordinatX: Math.trunc(Number(melumat.koordinatX) || 0),
    koordinatY: Math.trunc(Number(melumat.koordinatY) || 0),
    tarixSaat: metnAl(melumat.tarixSaat) || tarixSaatiFormatla(yaradildiMs),
    oxunub: melumat.oxunub === true,
    favoritdir: melumat.favoritdir === true,
    yaradildiMs
  };

  // Ən yeni hesabat həmişə siyahının əvvəlindədir.
  siyahi.unshift(hesabat);

  if (siyahi.length > MAKSIMUM_HESABAT_SAYI) {
    siyahi.length = MAKSIMUM_HESABAT_SAYI;
  }

  return { ...hesabat };
}

function resursHesabatlariniGetir(playerId, limit = 50) {
  const siyahi = oyuncuSiyahisiniAl(playerId);

  if (!siyahi) {
    return [];
  }

  const temizLimit = Math.max(
    1,
    Math.min(100, tamEdedAl(limit, 50))
  );

  return siyahi
    .slice(0, temizLimit)
    .map((hesabat) => ({ ...hesabat }));
}

function testHesabatlariniTeminEt(playerId, nowMs) {
  if (!TEST_HESABATLARINI_ILK_SORGUDA_YARAT) {
    return;
  }

  const siyahi = oyuncuSiyahisiniAl(playerId);

  if (!siyahi || siyahi.length > 0) {
    return;
  }

  const indi = typeof nowMs === "function"
    ? Number(nowMs()) || Date.now()
    : Date.now();

  // Reverse sıra ilə yaradırıq, çünki resursHesabatiYarat
  // yeni elementi siyahının əvvəlinə əlavə edir.
  resursHesabatiYarat(playerId, {
    hesabatId: `test_qida_${playerId}`,
    resursNovu: "food",
    miqdar: 32750,
    toplamaYeriAdi: "Ferma",
    toplamaYeriSeviyesi: 4,
    koordinatX: 331,
    koordinatY: 690,
    yaradildiMs: indi - 4 * 60 * 1000,
    oxunub: false,
    favoritdir: false
  });

  resursHesabatiYarat(playerId, {
    hesabatId: `test_neft_${playerId}`,
    resursNovu: "fuel",
    miqdar: 18400,
    toplamaYeriAdi: "Neft Quyusu",
    toplamaYeriSeviyesi: 3,
    koordinatX: 518,
    koordinatY: 402,
    yaradildiMs: indi - 2 * 60 * 1000,
    oxunub: true,
    favoritdir: false
  });

  resursHesabatiYarat(playerId, {
    hesabatId: `test_demir_${playerId}`,
    resursNovu: "iron",
    miqdar: 6250,
    toplamaYeriAdi: "Dəmir Fabrikası",
    toplamaYeriSeviyesi: 2,
    koordinatX: 724,
    koordinatY: 126,
    yaradildiMs: indi,
    oxunub: false,
    favoritdir: false
  });

  console.log(
    "[RESURS_HESABATI] Unity bağlantısı üçün 3 server test hesabatı yaradıldı:",
    playerId
  );
}

function neticeGonder(send, ws, playerId, nowMs, netice) {
  const serverVaxti = typeof nowMs === "function"
    ? Number(nowMs()) || Date.now()
    : Date.now();

  send(ws, {
    type: "resurs_hesabatlari_getir_result",
    playerId: playerId || "",
    serverTimeUnixMs: serverVaxti,
    payloadJson: JSON.stringify(netice)
  });
}

async function resursHesabatiMesajiniEmalEt(kontekst) {
  const {
    type,
    msg,
    ws,
    send,
    nowMs
  } = kontekst || {};

  if (type !== "resurs_hesabatlari_getir_request") {
    return false;
  }

  const socketPlayerId = metnAl(ws && ws._authedPlayerId);

  if (!socketPlayerId) {
    neticeGonder(
      send,
      ws,
      "",
      nowMs,
      {
        success: false,
        xetaKodu: "AUTH_REQUIRED",
        mesaj: "Resurs hesabatları üçün autentifikasiya tələb olunur.",
        umumiSay: 0,
        hesabatlar: []
      }
    );

    return true;
  }

  const mesajPlayerId = metnAl(msg && msg.playerId);

  if (mesajPlayerId && mesajPlayerId !== socketPlayerId) {
    neticeGonder(
      send,
      ws,
      socketPlayerId,
      nowMs,
      {
        success: false,
        xetaKodu: "IDENTITY_MISMATCH",
        mesaj: "Sorğudakı oyunçu ID-si aktiv sessiya ilə uyğun deyil.",
        umumiSay: 0,
        hesabatlar: []
      }
    );

    console.warn(
      "[RESURS_HESABATI] Başqa playerId ilə hesabat sorğusu bloklandı:",
      {
        socketPlayerId,
        mesajPlayerId
      }
    );

    return true;
  }

  testHesabatlariniTeminEt(socketPlayerId, nowMs);

  const butunHesabatlar = oyuncuSiyahisiniAl(socketPlayerId) || [];
  const hesabatlar = resursHesabatlariniGetir(
    socketPlayerId,
    msg && msg.limit
  );

  neticeGonder(
    send,
    ws,
    socketPlayerId,
    nowMs,
    {
      success: true,
      xetaKodu: "",
      mesaj: "Resurs hesabatları gətirildi.",
      umumiSay: butunHesabatlar.length,
      hesabatlar
    }
  );

  console.log(
    "[RESURS_HESABATI] Hesabat siyahısı göndərildi:",
    {
      playerId: socketPlayerId,
      say: hesabatlar.length,
      umumiSay: butunHesabatlar.length
    }
  );

  return true;
}

function oyuncununResursHesabatlariniTemizle(playerId) {
  const temizPlayerId = metnAl(playerId);

  if (!temizPlayerId) {
    return false;
  }

  return oyuncuHesabatlari.delete(temizPlayerId);
}

module.exports = {
  resursHesabatiMesajiniEmalEt,
  resursHesabatiYarat,
  resursHesabatlariniGetir,
  oyuncununResursHesabatlariniTemizle
};
