"use strict";

const {
  missiyaStateTeminEt,
  serverHadisesiniQeydEt
} = require("./missiya_proqres");

const {
  missiyaDaimiVeziyyetiniAl,
  missiyaProqresHadisesiniAuditdeYaddaSaxla,
  daimiVeziyyetiStateIleBirlesdir
} = require("./missiya_postgres");

const ICAZELI_SERVER_HADISELERI = new Set([
  "bina_yeri_deyisdirildi",
  "baza_girisi_aktivlesdi",
  "qehreman_bacarigi_artdi",
  "kesfiyyat_tamamlandi",
  "dusmen_movqeyi_askarlandi",
  "doyus_basladildi",
  "doyus_qazanildi",
  "doyus_mukafati_verildi",
  "xerite_zonasi_acildi"
]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : "";
}

function musbetTamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say)
    ? Math.max(1, Math.trunc(say))
    : 1;
}

function derinKopyala(deyer) {
  return JSON.parse(JSON.stringify(deyer));
}

async function missiyaServerHadisesiniQeydEt(
  playerId,
  state,
  hadiseId,
  miqdar = 1
) {
  const oyuncuId = metnAl(playerId, 128);
  const hadise = metnAl(hadiseId, 128);
  const artim = musbetTamEded(miqdar);

  if (!oyuncuId) {
    throw new Error("Missiya hadisəsi üçün playerId yoxdur.");
  }

  if (!state || typeof state !== "object") {
    throw new Error("Missiya hadisəsi üçün oyunçu state-i yoxdur.");
  }

  if (!ICAZELI_SERVER_HADISELERI.has(hadise)) {
    throw new Error(`İcazəsiz missiya server hadisəsi: ${hadise}`);
  }

  missiyaStateTeminEt(state);

  const daimiVeziyyet = await missiyaDaimiVeziyyetiniAl(oyuncuId);
  daimiVeziyyetiStateIleBirlesdir(state, daimiVeziyyet);

  const evvelkiMissiyalar = derinKopyala(state.missions);

  const yeniSay = serverHadisesiniQeydEt(
    state,
    hadise,
    artim
  );

  try {
    await missiyaProqresHadisesiniAuditdeYaddaSaxla(
      oyuncuId,
      hadise,
      artim
    );
  }
  catch (xeta) {
    state.missions = evvelkiMissiyalar;
    throw xeta;
  }

  return {
    success: true,
    eventId: hadise,
    added: artim,
    total: yeniSay
  };
}

module.exports = {
  ICAZELI_SERVER_HADISELERI,
  missiyaServerHadisesiniQeydEt
};
