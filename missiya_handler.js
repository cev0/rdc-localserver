"use strict";

const {
  butunMissiyalariAl,
  missiyaniTap
} = require("./missiya_kataloqu");

const {
  missiyaStateTeminEt,
  missiyaGorunusunuHazirla,
  aktivMissiyaniTap
} = require("./missiya_proqres");

const {
  missiyaMukafatiniAl
} = require("./missiya_mukafat");

const {
  gameplayNeticesiniIzlemeyeHazirla
} = require("./missiya_gameplay_musahide");

const MISSIYA_MESAJLARI = new Set([
  "mission_list_request",
  "mission_info_request",
  "mission_reward_claim_request"
]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function autentifikasiyaOlunmusPlayerIdAl(ws) {
  return metnAl(ws && ws._authedPlayerId, 128);
}

function ugursuzCavab(kontekst, type, message, elave = {}) {
  kontekst.send(kontekst.ws, {
    type,
    success: false,
    message,
    serverTimeUnixMs: kontekst.nowMs(),
    ...elave
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

async function missiyaMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);

  // Gameplay sorğularının nəticəsini yalnız server state-i dəyişəndən
  // sonra yoxlayan observer. Client missiya progressini birbaşa yaza bilmir.
  gameplayNeticesiniIzlemeyeHazirla(kontekst);

  if (!MISSIYA_MESAJLARI.has(type)) {
    return false;
  }

  const playerId = autentifikasiyaOlunmusPlayerIdAl(
    kontekst && kontekst.ws
  );

  if (!playerId) {
    ugursuzCavab(
      kontekst,
      type.replace("_request", "_result"),
      "Missiya əməliyyatı üçün oyunçu autentifikasiya olunmayıb."
    );
    return true;
  }

  if (typeof kontekst.getOrCreatePlayerState !== "function") {
    ugursuzCavab(
      kontekst,
      type.replace("_request", "_result"),
      "Server oyunçu state funksiyası əlçatan deyil."
    );
    return true;
  }

  const state = kontekst.getOrCreatePlayerState(playerId);
  missiyaStateTeminEt(state);

  if (type === "mission_list_request") {
    const missiyalar = butunMissiyalariAl()
      .map(missiya => missiyaGorunusunuHazirla(state, missiya));

    const aktivMissiya = aktivMissiyaniTap(state);

    const payload = {
      missions: missiyalar,
      activeMissionId: aktivMissiya ? aktivMissiya.missionId : ""
    };

    kontekst.send(kontekst.ws, {
      type: "mission_list_result",
      success: true,
      playerId,
      ...payload,
      payloadJson: JSON.stringify(payload),
      serverTimeUnixMs: kontekst.nowMs()
    });

    return true;
  }

  if (type === "mission_info_request") {
    const missionId = metnAl(kontekst.msg && kontekst.msg.missionId, 64);
    const missiya = missiyaniTap(missionId);

    if (!missiya) {
      ugursuzCavab(
        kontekst,
        "mission_info_result",
        "Missiya tapılmadı.",
        { playerId, missionId }
      );
      return true;
    }

    const gorunus = missiyaGorunusunuHazirla(state, missiya);

    kontekst.send(kontekst.ws, {
      type: "mission_info_result",
      success: true,
      playerId,
      missionId: missiya.missionId,
      mission: gorunus,
      payloadJson: JSON.stringify(gorunus),
      serverTimeUnixMs: kontekst.nowMs()
    });

    return true;
  }

  const missionId = metnAl(kontekst.msg && kontekst.msg.missionId, 64);
  const netice = missiyaMukafatiniAl(state, missionId);

  if (netice.success && typeof kontekst.updateServerTime === "function") {
    kontekst.updateServerTime(state);
  }

  kontekst.send(kontekst.ws, {
    type: "mission_reward_claim_result",
    playerId,
    ...netice,
    serverTimeUnixMs: kontekst.nowMs()
  });

  if (netice.success) {
    oyunStateGonder(kontekst, playerId, state);
  }

  return true;
}

module.exports = {
  missiyaMesajiniEmalEt
};
