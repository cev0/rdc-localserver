"use strict";

const {
  emeliyyatiBaslat,
  emeliyyatlariYenile,
  emeliyyatMelumatiniHazirla
} = require("./konvoy_emeliyyat_sistemi");
const {
  oyuncuKonvoylariniSinxronEtClient
} = require("./dovlet_konvoy_runtime_postgres");
const {
  requestIdAl,
  tekrarNeticesiniTap,
  ugurluNeticeniQeydEt
} = require("./server_sorqu_idempotentliyi");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

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

function aktivEmeliyyatlariAl(state) {
  const active = state &&
    state.konvoyEmeliyyatlari &&
    state.konvoyEmeliyyatlari.activeByConvoy;

  return active && typeof active === "object" && !Array.isArray(active)
    ? active
    : {};
}

async function sharedKonvoylariTransactiondaSinxronEt(
  client,
  state,
  playerId,
  nowMs
) {
  const netice = await oyuncuKonvoylariniSinxronEtClient(
    client,
    dovletIdAl(state),
    playerId,
    aktivEmeliyyatlariAl(state),
    nowMs
  );

  if (!netice || netice.success !== true) {
    throw new Error(
      netice && netice.message
        ? netice.message
        : "Shared convoy runtime transaction daxilində sinxron edilə bilmədi."
    );
  }

  return netice;
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
  state.konvoyEmeliyyatlari = kopyala(evvelki && evvelki.konvoyEmeliyyatlari);
  state.xeriteToplama = kopyala(evvelki && evvelki.xeriteToplama);
  state.worldEnemyBattle = kopyala(evvelki && evvelki.worldEnemyBattle);
  state.doyusRaportlari = kopyala(evvelki && evvelki.doyusRaportlari);
  state.resources = kopyala(evvelki && evvelki.resources);
  state.army = kopyala(evvelki && evvelki.army);
  state.konvoylar = kopyala(evvelki && evvelki.konvoylar);
  state.xestexana = kopyala(evvelki && evvelki.xestexana);
  state.serverSorquIdempotentliyi = kopyala(
    evvelki && evvelki.serverSorquIdempotentliyi
  );
}

function startPayloadiniAl(msg) {
  return {
    convoyId: metnAl(msg && msg.convoyId, 64),
    targetType: metnAl(msg && msg.targetType, 32),
    targetId: metnAl(msg && msg.targetId, 128)
  };
}

async function konvoyEmeliyyatMutasiyasiniTetbiqEt(
  state,
  playerId,
  type,
  msg,
  nowMs,
  client
) {
  const yenileme = await emeliyyatlariYenile(state, playerId, nowMs);
  const yenilemeDeyisdi = !!(yenileme && yenileme.changed === true);

  if (type === "convoy_operation_info_request") {
    await sharedKonvoylariTransactiondaSinxronEt(
      client,
      state,
      playerId,
      nowMs
    );

    const info = emeliyyatMelumatiniHazirla(state, nowMs);
    return {
      success: true,
      deyisdi: yenilemeDeyisdi,
      info,
      payloadJson: JSON.stringify(info)
    };
  }

  const requestId = requestIdAl(msg && msg.requestId);
  const requestPayload = startPayloadiniAl(msg);
  const tekrar = tekrarNeticesiniTap(
    state,
    "konvoy_emeliyyat_baslat",
    requestId,
    requestPayload
  );

  if (tekrar.conflict) {
    if (yenilemeDeyisdi) {
      await sharedKonvoylariTransactiondaSinxronEt(
        client,
        state,
        playerId,
        nowMs
      );
    }

    return {
      success: false,
      deyisdi: yenilemeDeyisdi,
      requestId,
      idempotentReplay: false,
      message: tekrar.message || "requestId ziddiyyəti yarandı.",
      info: emeliyyatMelumatiniHazirla(state, nowMs)
    };
  }

  if (tekrar.replay) {
    await sharedKonvoylariTransactiondaSinxronEt(
      client,
      state,
      playerId,
      nowMs
    );

    const replay = tekrar.result && typeof tekrar.result === "object"
      ? kopyala(tekrar.result)
      : {};

    return {
      success: true,
      deyisdi: yenilemeDeyisdi,
      requestId,
      idempotentReplay: true,
      operation: replay.operation || null,
      info: replay.info || emeliyyatMelumatiniHazirla(state, nowMs),
      payloadJson: JSON.stringify(replay)
    };
  }

  // `emeliyyatiBaslat()` stateTeminEt() vasitəsilə validation-dan əvvəl
  // default konvoy əməliyyat state-i yarada bilər. Uğursuz start cəhdi
  // time-based `emeliyyatlariYenile()` nəticələrini silməməlidir, ona görə
  // backup məhz yeniləmədən və idempotency yoxlamasından SONRA götürülür.
  const startdanEvvel = stateYedeyiniAl(state);

  const result = emeliyyatiBaslat(
    state,
    playerId,
    requestPayload.convoyId,
    requestPayload.targetType,
    requestPayload.targetId,
    nowMs
  );

  if (!result || result.success !== true) {
    stateRollbackEt(state, startdanEvvel);

    if (yenilemeDeyisdi) {
      await sharedKonvoylariTransactiondaSinxronEt(
        client,
        state,
        playerId,
        nowMs
      );
    }

    return {
      success: false,
      deyisdi: yenilemeDeyisdi,
      requestId,
      idempotentReplay: false,
      message: result && result.message
        ? result.message
        : "Konvoy əməliyyatı başlaya bilmədi.",
      movementConfigured: result && result.movementConfigured === false
        ? false
        : undefined,
      info: emeliyyatMelumatiniHazirla(state, nowMs)
    };
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

  await sharedKonvoylariTransactiondaSinxronEt(
    client,
    state,
    playerId,
    nowMs
  );

  return {
    success: true,
    deyisdi: true,
    requestId,
    idempotentReplay: false,
    operation: cavab.operation,
    info: cavab.info,
    payloadJson: JSON.stringify(cavab)
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
      const canliState = kontekst.getOrCreatePlayerState(playerId);
      const nowMs = kontekst.nowMs();

      const netice = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
        playerId,
        canliState,
        async (kilidliState, transaction) => {
          return konvoyEmeliyyatMutasiyasiniTetbiqEt(
            kilidliState,
            playerId,
            type,
            kontekst.msg,
            nowMs,
            transaction && transaction.client
          );
        }
      );

      if (type === "convoy_operation_info_request") {
        const info = netice && netice.info
          ? netice.info
          : emeliyyatMelumatiniHazirla(canliState, nowMs);

        gonder(kontekst, resultType, {
          success: true,
          playerId,
          info,
          payloadJson: netice && netice.payloadJson
            ? netice.payloadJson
            : JSON.stringify(info)
        });
        return;
      }

      if (!netice || netice.success !== true) {
        gonder(kontekst, resultType, {
          success: false,
          playerId,
          requestId: netice && netice.requestId
            ? netice.requestId
            : requestIdAl(kontekst.msg && kontekst.msg.requestId),
          idempotentReplay: false,
          message: netice && netice.message
            ? netice.message
            : "Konvoy əməliyyatı başlaya bilmədi.",
          movementConfigured: netice && netice.movementConfigured === false
            ? false
            : undefined,
          info: netice && netice.info
            ? netice.info
            : emeliyyatMelumatiniHazirla(canliState, nowMs)
        });
        return;
      }

      gonder(kontekst, resultType, {
        success: true,
        playerId,
        requestId: netice.requestId || "",
        idempotentReplay: netice.idempotentReplay === true,
        operation: netice.operation || null,
        info: netice.info || emeliyyatMelumatiniHazirla(canliState, nowMs),
        payloadJson: netice.payloadJson || JSON.stringify({
          operation: netice.operation || null,
          info: netice.info || emeliyyatMelumatiniHazirla(canliState, nowMs)
        })
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
  startPayloadiniAl,
  konvoyEmeliyyatMutasiyasiniTetbiqEt,
  konvoyEmeliyyatMesajiniEmalEt
};
