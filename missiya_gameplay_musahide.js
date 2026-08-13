"use strict";

const {
  serverHadisesiniQeydEt
} = require("./missiya_proqres");

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function tamEdedAl(deyer) {
  const say = Number(deyer);
  return Number.isInteger(say) ? say : null;
}

function binaHereketiniIzle(kontekst) {
  if (
    !kontekst ||
    kontekst.type !== "move_request" ||
    typeof kontekst.getOrCreatePlayerState !== "function"
  ) {
    return;
  }

  const playerId = metnAl(
    kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  const instanceId = metnAl(
    kontekst.msg && kontekst.msg.buildingInstanceId,
    128
  );

  const hedefX = tamEdedAl(kontekst.msg && kontekst.msg.x);
  const hedefZ = tamEdedAl(kontekst.msg && kontekst.msg.z);

  if (!playerId || !instanceId || hedefX === null || hedefZ === null) {
    return;
  }

  const evvelkiState = kontekst.getOrCreatePlayerState(playerId);
  const evvelkiBina =
    evvelkiState && Array.isArray(evvelkiState.buildings)
      ? evvelkiState.buildings.find(
          bina => bina && bina.instanceId === instanceId
        )
      : null;

  if (!evvelkiBina) {
    return;
  }

  const evvelkiX = Number(evvelkiBina.x);
  const evvelkiZ = Number(evvelkiBina.z);

  if (evvelkiX === hedefX && evvelkiZ === hedefZ) {
    return;
  }

  setImmediate(() => {
    try {
      const sonState = kontekst.getOrCreatePlayerState(playerId);
      const sonBina =
        sonState && Array.isArray(sonState.buildings)
          ? sonState.buildings.find(
              bina => bina && bina.instanceId === instanceId
            )
          : null;

      if (!sonBina) return;

      const ugurludur =
        Number(sonBina.x) === hedefX &&
        Number(sonBina.z) === hedefZ &&
        (
          Number(sonBina.x) !== evvelkiX ||
          Number(sonBina.z) !== evvelkiZ
        );

      if (!ugurludur) return;

      serverHadisesiniQeydEt(
        sonState,
        "bina_yeri_deyisdirildi",
        1
      );

      if (typeof kontekst.updateServerTime === "function") {
        kontekst.updateServerTime(sonState);
      }

      console.log("[MISSIYA_HADISE]", {
        playerId,
        eventId: "bina_yeri_deyisdirildi"
      });
    }
    catch (xeta) {
      console.error(
        "[MISSIYA_HADISE] Bina hərəkəti yoxlanarkən xəta:",
        xeta
      );
    }
  });
}

function gameplayNeticesiniIzlemeyeHazirla(kontekst) {
  binaHereketiniIzle(kontekst);
}

module.exports = {
  gameplayNeticesiniIzlemeyeHazirla
};
