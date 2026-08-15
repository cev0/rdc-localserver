"use strict";

const {
  qehremanRecruitStateTeminEt,
  recruitMelumatiniHazirla,
  recruitEt
} = require("./qehreman_recruit_sistemi");
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

const QEHRAMAN_RECRUIT_MESAJLARI = new Set([
  "hero_recruit_info_request",
  "hero_recruit_single_request",
  "hero_recruit_x10_request"
]);

const oyuncuKilidleri = new Map();

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function derinKopyala(deyer) {
  if (deyer === undefined) return undefined;
  if (deyer === null) return null;
  return JSON.parse(JSON.stringify(deyer));
}

function sabitJson(deyer) {
  return JSON.stringify(deyer == null ? null : deyer);
}

function neticeTipiniAl(type) {
  if (type === "hero_recruit_info_request") {
    return "hero_recruit_info_result";
  }

  if (type === "hero_recruit_single_request") {
    return "hero_recruit_single_result";
  }

  return "hero_recruit_x10_result";
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

function ugursuzCavab(kontekst, type, playerId, message, elave = null) {
  kontekst.send(kontekst.ws, {
    type,
    success: false,
    playerId: playerId || null,
    message,
    entries: [],
    ...((elave && typeof elave === "object") ? elave : {}),
    serverTimeUnixMs: kontekst.nowMs()
  });
}

function oyunStateGonder(kontekst, playerId, state) {
  if (
    typeof kontekst.makeClientState !== "function" ||
    typeof kontekst.send !== "function"
  ) {
    return;
  }

  kontekst.send(kontekst.ws, {
    type: "state",
    playerId,
    serverTimeUnixMs: kontekst.nowMs(),
    payloadJson: JSON.stringify(
      kontekst.makeClientState(state)
    )
  });
}

async function snapshotBerpasiniTeminEt(kontekst, playerId) {
  if (oyuncuStateBerpaOlunub(playerId)) {
    return;
  }

  await oyunStateIniBerpaEt(kontekst, playerId);
}

function recruitMutationYedeyiniAl(state) {
  return {
    heroes: derinKopyala(state && state.heroes),
    heroRecruit: derinKopyala(state && state.heroRecruit),
    serverSorquIdempotentliyi: derinKopyala(
      state && state.serverSorquIdempotentliyi
    ),
    serverTimeUnixMs: state && state.serverTimeUnixMs
  };
}

function recruitMutationRollbackEt(state, yedek) {
  if (!state || !yedek) return;

  if (yedek.heroes === undefined) delete state.heroes;
  else state.heroes = derinKopyala(yedek.heroes);

  if (yedek.heroRecruit === undefined) delete state.heroRecruit;
  else state.heroRecruit = derinKopyala(yedek.heroRecruit);

  if (yedek.serverSorquIdempotentliyi === undefined) {
    delete state.serverSorquIdempotentliyi;
  }
  else {
    state.serverSorquIdempotentliyi = derinKopyala(
      yedek.serverSorquIdempotentliyi
    );
  }

  if (yedek.serverTimeUnixMs === undefined) delete state.serverTimeUnixMs;
  else state.serverTimeUnixMs = yedek.serverTimeUnixMs;
}

function qehremanRecruitMutasiyasiniTetbiqEt(
  state,
  type,
  msg,
  nowMs = Date.now(),
  asililiqlar = null
) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return {
      success: false,
      deyisdi: false,
      message: "Qəhrəman recruit üçün oyunçu state-i yoxdur."
    };
  }

  const stateTeminEt = asililiqlar && typeof asililiqlar.stateTeminEt === "function"
    ? asililiqlar.stateTeminEt
    : qehremanRecruitStateTeminEt;
  const recruitIcraEt = asililiqlar && typeof asililiqlar.recruitEt === "function"
    ? asililiqlar.recruitEt
    : recruitEt;
  const serverVaxtiniYenile = asililiqlar && typeof asililiqlar.updateServerTime === "function"
    ? asililiqlar.updateServerTime
    : null;

  const recruitStateEvvel = sabitJson(state.heroRecruit);
  stateTeminEt(state, nowMs);
  const recruitStateTeminDeyisdi = recruitStateEvvel !== sabitJson(state.heroRecruit);

  const bannerId = metnAl(msg && msg.bannerId, 64).toLowerCase();
  const drawCount = type === "hero_recruit_single_request" ? 1 : 10;
  const requestId = requestIdAl(msg && msg.requestId);
  const requestPayload = {
    bannerId,
    drawCount
  };

  const idempotentlikEvvel = sabitJson(state.serverSorquIdempotentliyi);
  const tekrar = tekrarNeticesiniTap(
    state,
    "qehreman_recruit",
    requestId,
    requestPayload
  );
  const idempotentlikTeminDeyisdi =
    idempotentlikEvvel !== sabitJson(state.serverSorquIdempotentliyi);
  const esasTeminDeyisdi = recruitStateTeminDeyisdi || idempotentlikTeminDeyisdi;

  if (tekrar.conflict) {
    return {
      success: false,
      deyisdi: esasTeminDeyisdi,
      requestId,
      idempotentReplay: false,
      message: tekrar.message || "requestId ziddiyyəti yarandı."
    };
  }

  if (tekrar.replay) {
    const replayNetice = tekrar.result && typeof tekrar.result === "object"
      ? derinKopyala(tekrar.result)
      : {};

    return {
      success: true,
      deyisdi: esasTeminDeyisdi,
      requestId,
      idempotentReplay: true,
      cavabNeticesi: replayNetice
    };
  }

  // State initialization / daily reset kimi əvvəlki legitim dəyişikliklər
  // saxlanılır. Recruit cəhdinin öz qismən mutasiyaları isə failure zamanı
  // bu nöqtəyə rollback edilir.
  const recruitBaslangicYedeyi = recruitMutationYedeyiniAl(state);

  let netice;
  try {
    netice = recruitIcraEt(
      state,
      bannerId,
      drawCount,
      nowMs
    );
  }
  catch (xeta) {
    recruitMutationRollbackEt(state, recruitBaslangicYedeyi);
    return {
      success: false,
      deyisdi: esasTeminDeyisdi,
      requestId,
      idempotentReplay: false,
      message: "Recruit nəticəsi hesablana bilmədi.",
      daxiliXeta: xeta && xeta.message ? xeta.message : String(xeta)
    };
  }

  if (!netice || netice.success !== true) {
    recruitMutationRollbackEt(state, recruitBaslangicYedeyi);
    return {
      success: false,
      deyisdi: esasTeminDeyisdi,
      requestId,
      idempotentReplay: false,
      message: netice && netice.message
        ? netice.message
        : "Recruit mümkün deyil."
    };
  }

  if (serverVaxtiniYenile) {
    serverVaxtiniYenile(state);
  }
  else {
    state.serverTimeUnixMs = Number(nowMs) || Date.now();
  }

  const cavabNeticesi = {
    bannerId: netice.bannerId,
    usedFreeDraw: netice.usedFreeDraw === true,
    ticketCost: Number(netice.ticketCost) || 0,
    drawCount: Number(netice.drawCount) || drawCount,
    entries: Array.isArray(netice.entries) ? derinKopyala(netice.entries) : [],
    recruitInfo: derinKopyala(netice.recruitInfo),
    message: netice.message || "Recruit uğurla tamamlandı."
  };

  ugurluNeticeniQeydEt(
    state,
    "qehreman_recruit",
    requestId,
    requestPayload,
    cavabNeticesi,
    nowMs
  );

  return {
    success: true,
    deyisdi: true,
    requestId,
    idempotentReplay: false,
    cavabNeticesi
  };
}

async function qehremanRecruitMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);

  if (!QEHRAMAN_RECRUIT_MESAJLARI.has(type)) {
    return false;
  }

  const resultType = neticeTipiniAl(type);
  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId) {
    ugursuzCavab(
      kontekst,
      resultType,
      null,
      "Qəhrəman recruit əməliyyatı üçün autentifikasiya tələb olunur."
    );
    return true;
  }

  if (typeof kontekst.getOrCreatePlayerState !== "function") {
    ugursuzCavab(
      kontekst,
      resultType,
      playerId,
      "Server oyunçu state funksiyası əlçatan deyil."
    );
    return true;
  }

  try {
    await snapshotBerpasiniTeminEt(kontekst, playerId);
  }
  catch (xeta) {
    console.error("[QEHRAMAN_RECRUIT] State bərpa xətası:", {
      playerId,
      message: xeta && xeta.message ? xeta.message : String(xeta)
    });

    ugursuzCavab(
      kontekst,
      resultType,
      playerId,
      "Oyun vəziyyəti daimi yaddaşdan bərpa edilə bilmədi."
    );
    return true;
  }

  const state = kontekst.getOrCreatePlayerState(playerId);

  if (type === "hero_recruit_info_request") {
    qehremanRecruitStateTeminEt(state, kontekst.nowMs());

    const melumat = recruitMelumatiniHazirla(
      state,
      kontekst.nowMs()
    );

    kontekst.send(kontekst.ws, {
      type: "hero_recruit_info_result",
      success: true,
      playerId,
      ...melumat,
      payloadJson: JSON.stringify(melumat),
      serverTimeUnixMs: kontekst.nowMs()
    });

    return true;
  }

  await oyuncuKilidiIleIcraEt(
    playerId,
    async () => {
      const canliState = kontekst.getOrCreatePlayerState(playerId);
      const now = kontekst.nowMs();

      const mutasiyaNeticesi = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
        playerId,
        canliState,
        async kilidliState => {
          return qehremanRecruitMutasiyasiniTetbiqEt(
            kilidliState,
            type,
            kontekst.msg,
            now,
            {
              updateServerTime: typeof kontekst.updateServerTime === "function"
                ? kontekst.updateServerTime
                : null
            }
          );
        }
      );

      if (!mutasiyaNeticesi || mutasiyaNeticesi.success !== true) {
        if (mutasiyaNeticesi && mutasiyaNeticesi.daxiliXeta) {
          console.error("[QEHRAMAN_RECRUIT] Recruit hesablanma xətası:", {
            playerId,
            message: mutasiyaNeticesi.daxiliXeta
          });
        }

        ugursuzCavab(
          kontekst,
          resultType,
          playerId,
          mutasiyaNeticesi && mutasiyaNeticesi.message
            ? mutasiyaNeticesi.message
            : "Recruit mümkün deyil.",
          {
            requestId: mutasiyaNeticesi && mutasiyaNeticesi.requestId
              ? mutasiyaNeticesi.requestId
              : requestIdAl(kontekst.msg && kontekst.msg.requestId),
            idempotentReplay: false
          }
        );

        if (mutasiyaNeticesi && mutasiyaNeticesi.deyisdi === true) {
          oyunStateGonder(kontekst, playerId, canliState);
        }
        return;
      }

      const cavabNeticesi = mutasiyaNeticesi.cavabNeticesi &&
        typeof mutasiyaNeticesi.cavabNeticesi === "object"
        ? mutasiyaNeticesi.cavabNeticesi
        : {};

      kontekst.send(kontekst.ws, {
        type: resultType,
        success: true,
        playerId,
        requestId: mutasiyaNeticesi.requestId || "",
        idempotentReplay: mutasiyaNeticesi.idempotentReplay === true,
        ...cavabNeticesi,
        payloadJson: JSON.stringify(cavabNeticesi),
        serverTimeUnixMs: kontekst.nowMs()
      });

      oyunStateGonder(
        kontekst,
        playerId,
        canliState
      );

      if (mutasiyaNeticesi.idempotentReplay !== true) {
        console.log("[QEHRAMAN_RECRUIT] Uğurlu:", {
          playerId,
          requestId: mutasiyaNeticesi.requestId || null,
          bannerId: cavabNeticesi.bannerId || null,
          drawCount: Number(cavabNeticesi.drawCount) || 0,
          usedFreeDraw: cavabNeticesi.usedFreeDraw === true,
          heroCount: Array.isArray(canliState.heroes)
            ? canliState.heroes.length
            : 0
        });
      }
    }
  );

  return true;
}

module.exports = {
  QEHRAMAN_RECRUIT_MESAJLARI,
  qehremanRecruitMutasiyasiniTetbiqEt,
  qehremanRecruitMesajiniEmalEt
};
