"use strict";

const {
  oyunStateSnapshotiniYaz,
  sonOyunStateSnapshotiniAl,
  snapshotiCariStateIleBirlesdir
} = require("./oyun_state_snapshot_postgres");

const berpaOlunmusOyuncular = new Set();

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

async function oyunStateIniBerpaEt(kontekst, playerId) {
  const oyuncuId = metnAl(playerId, 128);

  if (!oyuncuId || berpaOlunmusOyuncular.has(oyuncuId)) {
    return false;
  }

  if (
    !kontekst ||
    typeof kontekst.getOrCreatePlayerState !== "function"
  ) {
    return false;
  }

  const state = kontekst.getOrCreatePlayerState(oyuncuId);
  const snapshot = await sonOyunStateSnapshotiniAl(oyuncuId);

  if (snapshot) {
    const berpaOlundu = snapshotiCariStateIleBirlesdir(state, snapshot);

    if (berpaOlundu) {
      // Cari server helper-ləri köhnə snapshot-a yeni default sahələri əlavə etsin.
      kontekst.getOrCreatePlayerState(oyuncuId);

      if (typeof kontekst.updateServerTime === "function") {
        kontekst.updateServerTime(state);
      }
    }
  }

  berpaOlunmusOyuncular.add(oyuncuId);
  return !!snapshot;
}

async function oyunStateIniYaddaSaxla(playerId, state) {
  const oyuncuId = metnAl(playerId, 128);

  if (!oyuncuId || !state || typeof state !== "object") {
    return false;
  }

  await oyunStateSnapshotiniYaz(oyuncuId, state);
  berpaOlunmusOyuncular.add(oyuncuId);
  return true;
}

function oyuncuStateBerpaOlunub(playerId) {
  return berpaOlunmusOyuncular.has(
    metnAl(playerId, 128)
  );
}

module.exports = {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
};
