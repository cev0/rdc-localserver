"use strict";

const {
  emeliyyatiBaslat,
  emeliyyatlariYenile,
  emeliyyatMelumatiniHazirla
} = require("./konvoy_emeliyyat_sistemi");
const {
  oyuncuKonvoylariniSinxronEt
} = require("./dovlet_konvoy_runtime_postgres");
const {
  requestIdAl,
  tekrarNeticesiniTap,
  ugurluNeticeniQeydEt
} = require("./server_sorqu_idempotentliyi");
const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const MESAJLAR = new Set([
  "convoy_operation_info_request",
  "convoy_operation_start_request"
]);

const oyuncuKilidleri = new Map();

function metnAl(v, max = 220) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function gonder(k, type, data) {
  k.send(k.ws, {
    type,
    ...data,
    serverTimeUnixMs: k.nowMs()
  });
}

async function oyuncuKilidiIleIcraEt(playerId, emeliyyat) {
  const evvelki = oyuncuKilidleri.get(playerId) || Promise.resolve();
  let kilidiAc;
  const cari = new Promise(resolve => {
    kilidiAc = resolve;
  });

  oyuncuKilidleri.set(playerId, cari);
  await evvelki;

  try {
    return await emeliyyat();
  }
  finally {
    kilidiAc();
    if (oyuncuKilidleri.get(playerId) === cari) {
      oyuncuKilidleri.delete(playerId);
    }
  }
}

function dovletIdAl(state) {
  return Math.max(
    1,
    Math.trunc(Number(state && state.worldPlacement && state.worldPlacement.stateId) || 1)
  );
}

async function sharedKonvoylariSinxronEtTehlukesiz(state, playerId, nowMs) {
  try {
    const active = state && state.konvoyEmeliyyatlari && state.konvoyEmeliyyatlari.activeByConvoy;
    await oyuncuKonvoylariniSinxronEt(
      dovletIdAl(state),
      playerId,
      active && typeof active === "object" ? active : {},
      nowMs
    );
    return true;
  }
  catch (xeta) {
    console.error("[KONVOY_SHARED_RUNTIME_SYNC]", xeta);
    return false;
  }
}

function stateYedeyiniAl(state) {
  return kopyala({
    konvoyEmeliyyatlari: state.konvoyEmeliyyatlari || null,
    xeriteToplama: state.xeriteToplama || null,
    worldEnemyBattle: state.worldEnemyBattle || null,
    doyusRaportlari: state.doyusRaportlari || null,
    resources: state.resources || null,
    army: state.army || null,
    konvoylar: state.konvoylar || null,
    xestexana: state.xestexana || null,
    serverSorquIdempotentliyi: state.serverSorquIdempotentliyi || null
  });
}

function stateRollbackEt(state, evvelki) {
  state.konvoyEmeliyyatlari = evvelki.konvoyEmeliyyatlari;
  state.xeriteToplama = evvelki.xeriteToplama;
  state.worldEnemyBattle = evvelki.worldEnemyBattle;
  state.doyusRaportlari = evvelki.doyusRaportlari;
  state.resources = evvelki.resources;
  state.army = evvelki.army;
  state.konvoylar = evvelki.konvoylar;
  state.xestexana = evvelki.xestexana;
  state.serverSorquIdempotentliyi = evvelki.serverSorquIdempotentliyi;
}

async function stateYaddaSaxlaVeYaRollbackEt(playerId, state, evvelki) {
  try {
    await oyunStateIniYaddaSaxla(playerId, state);
  }
  catch (xeta) {
    stateRollbackEt(state, evvelki);
    throw xeta;
  }
}

function startPayloadiniAl(msg) {
  return {
    convoyId: metnAl(msg && msg.convoyId, 64),
    targetType: metnAl(msg && msg.targetType, 32),
    targetId: metnAl(msg && msg.targetId, 128)
  };
}

async function konvoyEmeliyyatMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!MESAJLAR.has(type)) return false;

  const resultType = type.replace(/_request$/, "_result");
  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    gonder(kontekst, resultType, {
      success: false,
      message: "Konvoy əməliyyatı üçün autentifikasiya tələb olunur."
    });
    return true;
  }

  try {
    if (!oyuncuStateBerpaOlunub(playerId)) {
      await oyunStateIniBerpaEt(kontekst, playerId);
    }

    await oyuncuKilidiIleIcraEt(playerId, async () => {
      const state = kontekst.getOrCreatePlayerState(playerId);
      const nowMs = kontekst.nowMs();
      const evvelki = stateYedeyiniAl(state);
      const yenileme = await emeliyyatlariYenile(state, playerId, nowMs);

      if (type === "convoy_operation_info_request") {
        if (yenileme.changed) {
          await stateYaddaSaxlaVeYaRollbackEt(playerId, state, evvelki);
        }

        await sharedKonvoylariSinxronEtTehlukesiz(state, playerId, nowMs);
        const info = emeliyyatMelumatiniHazirla(state, nowMs);
        gonder(kontekst, resultType, {
          success: true,
          playerId,
          info,
          payloadJson: JSON.stringify(info)
        });
        return;
      }

      const requestId = requestIdAl(kontekst.msg && kontekst.msg.requestId);
      const requestPayload = startPayloadiniAl(kontekst.msg);
      const tekrar = tekrarNeticesiniTap(
        state,
        "konvoy_emeliyyat_baslat",
        requestId,
        requestPayload
      );

      if (tekrar.conflict) {
        if (yenileme.changed) {
          await stateYaddaSaxlaVeYaRollbackEt(playerId, state, evvelki);
        }
        gonder(kontekst, resultType, {
          success: false,
          playerId,
          requestId,
          idempotentReplay: false,
          message: tekrar.message || "requestId ziddiyyəti yarandı.",
          info: emeliyyatMelumatiniHazirla(state, nowMs)
        });
        return;
      }

      if (tekrar.replay) {
        if (yenileme.changed) {
          await stateYaddaSaxlaVeYaRollbackEt(playerId, state, evvelki);
        }
        await sharedKonvoylariSinxronEtTehlukesiz(state, playerId, nowMs);
        const replay = tekrar.result && typeof tekrar.result === "object"
          ? tekrar.result
          : {};
        gonder(kontekst, resultType, {
          success: true,
          playerId,
          requestId,
          idempotentReplay: true,
          operation: replay.operation || null,
          info: replay.info || emeliyyatMelumatiniHazirla(state, nowMs),
          payloadJson: JSON.stringify(replay)
        });
        return;
      }

      const result = emeliyyatiBaslat(
        state,
        playerId,
        requestPayload.convoyId,
        requestPayload.targetType,
        requestPayload.targetId,
        nowMs
      );

      if (!result || result.success !== true) {
        if (yenileme.changed) {
          await stateYaddaSaxlaVeYaRollbackEt(playerId, state, evvelki);
        }
        gonder(kontekst, resultType, {
          success: false,
          playerId,
          requestId,
          idempotentReplay: false,
          message: result && result.message ? result.message : "Konvoy əməliyyatı başlaya bilmədi.",
          movementConfigured: result && result.movementConfigured === false ? false : undefined,
          info: emeliyyatMelumatiniHazirla(state, nowMs)
        });
        return;
      }

      const info = emeliyyatMelumatiniHazirla(state, nowMs);
      const cavab = {
        operation: kopyala(result.operation),
        info: kopyala(info)
      };

      ugurluNeticeniQeydEt(
        state,
        "konvoy_emeliyyat_baslat",
        requestId,
        requestPayload,
        cavab,
        nowMs
      );

      await stateYaddaSaxlaVeYaRollbackEt(playerId, state, evvelki);
      await sharedKonvoylariSinxronEtTehlukesiz(state, playerId, nowMs);

      gonder(kontekst, resultType, {
        success: true,
        playerId,
        requestId,
        idempotentReplay: false,
        operation: cavab.operation,
        info: cavab.info,
        payloadJson: JSON.stringify(cavab)
      });
    });
  }
  catch (xeta) {
    console.error("[KONVOY_EMELIYYAT]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      requestId: requestIdAl(kontekst.msg && kontekst.msg.requestId),
      idempotentReplay: false,
      message: "Konvoy əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  MESAJLAR,
  konvoyEmeliyyatMesajiniEmalEt
};
