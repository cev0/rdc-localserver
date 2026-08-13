"use strict";

const {
  qehremanRecruitStateTeminEt,
  recruitMelumatiniHazirla,
  recruitEt
} = require("./qehreman_recruit_sistemi");

const {
  oyunStateIniBerpaEt,
  oyunStateIniYaddaSaxla,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

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
  return JSON.parse(JSON.stringify(deyer));
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

function ugursuzCavab(kontekst, type, playerId, message) {
  kontekst.send(kontekst.ws, {
    type,
    success: false,
    playerId: playerId || null,
    message,
    entries: [],
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
  qehremanRecruitStateTeminEt(state, kontekst.nowMs());

  if (type === "hero_recruit_info_request") {
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
      const kilidliState = kontekst.getOrCreatePlayerState(playerId);
      qehremanRecruitStateTeminEt(kilidliState, kontekst.nowMs());

      const evvelkiHeroes = derinKopyala(kilidliState.heroes || []);
      const evvelkiRecruit = derinKopyala(kilidliState.heroRecruit || {});

      const bannerId = metnAl(
        kontekst.msg && kontekst.msg.bannerId,
        64
      ).toLowerCase();

      const drawCount =
        type === "hero_recruit_single_request"
          ? 1
          : 10;

      let netice;

      try {
        netice = recruitEt(
          kilidliState,
          bannerId,
          drawCount,
          kontekst.nowMs()
        );
      }
      catch (xeta) {
        console.error("[QEHRAMAN_RECRUIT] Recruit hesablanma xətası:", {
          playerId,
          bannerId,
          message: xeta && xeta.message ? xeta.message : String(xeta)
        });

        netice = {
          success: false,
          message: "Recruit nəticəsi hesablana bilmədi.",
          entries: []
        };
      }

      if (!netice.success) {
        ugursuzCavab(
          kontekst,
          resultType,
          playerId,
          netice.message || "Recruit mümkün deyil."
        );
        return;
      }

      if (typeof kontekst.updateServerTime === "function") {
        kontekst.updateServerTime(kilidliState);
      }

      try {
        await oyunStateIniYaddaSaxla(
          playerId,
          kilidliState
        );
      }
      catch (xeta) {
        kilidliState.heroes = evvelkiHeroes;
        kilidliState.heroRecruit = evvelkiRecruit;

        console.error("[QEHRAMAN_RECRUIT] Snapshot yazma xətası:", {
          playerId,
          bannerId,
          message: xeta && xeta.message ? xeta.message : String(xeta)
        });

        ugursuzCavab(
          kontekst,
          resultType,
          playerId,
          "Recruit nəticəsi daimi yaddaşa yazılmadı. Ticket və nəticə geri qaytarıldı."
        );
        return;
      }

      kontekst.send(kontekst.ws, {
        type: resultType,
        success: true,
        playerId,
        bannerId: netice.bannerId,
        usedFreeDraw: netice.usedFreeDraw === true,
        ticketCost: Number(netice.ticketCost) || 0,
        drawCount: Number(netice.drawCount) || drawCount,
        entries: Array.isArray(netice.entries) ? netice.entries : [],
        recruitInfo: netice.recruitInfo,
        payloadJson: JSON.stringify(netice),
        message: netice.message || "Recruit uğurla tamamlandı.",
        serverTimeUnixMs: kontekst.nowMs()
      });

      oyunStateGonder(
        kontekst,
        playerId,
        kilidliState
      );

      console.log("[QEHRAMAN_RECRUIT] Uğurlu:", {
        playerId,
        bannerId: netice.bannerId,
        drawCount: netice.drawCount,
        usedFreeDraw: netice.usedFreeDraw === true,
        heroCount: Array.isArray(kilidliState.heroes)
          ? kilidliState.heroes.length
          : 0
      });
    }
  );

  return true;
}

module.exports = {
  QEHRAMAN_RECRUIT_MESAJLARI,
  qehremanRecruitMesajiniEmalEt
};
