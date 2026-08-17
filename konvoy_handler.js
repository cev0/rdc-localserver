"use strict";

const {
  konvoyMelumatiniHazirla,
  qehremaniKonvoyaYerlesdir,
  qehremaniKonvoydanCixar
} = require("./konvoy_sistemi");

const {
  konvoyQosunMelumatiniHazirla
} = require("./konvoy_qosun_sistemi");

const {
  legacyQosunlardanFormasiyaHazirla,
  formasiyaMelumatiniHazirla,
  formasiyaTeyinEt
} = require("./konvoy_formasiya_sistemi");

const {
  konvoyTutumHesabiniAl
} = require("./konvoy_tutum_formulu");

const {
  konvoyMudafieMelumatiniHazirla,
  konvoyMudafiesiniTeyinEt
} = require("./konvoy_mudafie_sistemi");

const {
  konvoyMesguldur
} = require("./konvoy_mesgul_sistemi");

const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");

const KONVOY_MESAJLARI = new Set([
  "convoy_info_request",
  "convoy_hero_assign_request",
  "convoy_hero_remove_request",
  "convoy_troops_set_request",
  "convoy_formation_set_request",
  "convoy_defense_set_request"
]);

const FORMASIYA_SIRA_IDLERI = Object.freeze([
  "sira_1",
  "sira_2",
  "sira_3"
]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : "";
}

function musbetTamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say)
    ? Math.max(0, Math.trunc(say))
    : 0;
}

function kopyala(deyer) {
  return deyer == null
    ? null
    : JSON.parse(JSON.stringify(deyer));
}

function gonder(kontekst, type, melumat) {
  kontekst.send(kontekst.ws, {
    type,
    ...melumat,
    serverTimeUnixMs: kontekst.nowMs()
  });
}

function neticeTipiniAl(type) {
  if (type === "convoy_info_request") return "convoy_info_result";
  if (type === "convoy_hero_assign_request") return "convoy_hero_assign_result";
  if (type === "convoy_hero_remove_request") return "convoy_hero_remove_result";
  if (type === "convoy_formation_set_request") return "convoy_formation_set_result";
  if (type === "convoy_defense_set_request") return "convoy_defense_set_result";
  return "convoy_troops_set_result";
}

function unityFormasiyasiniSiralarArrayinaCevir(rawFormasiya) {
  if (Array.isArray(rawFormasiya)) {
    return rawFormasiya;
  }

  if (!rawFormasiya || typeof rawFormasiya !== "object") {
    return rawFormasiya;
  }

  return FORMASIYA_SIRA_IDLERI.map(siraId => {
    const raw = rawFormasiya[siraId];
    return {
      siraId,
      unitId: metnAl(raw && raw.unitId, 128),
      count: musbetTamEded(raw && raw.count)
    };
  });
}

function siralarArrayiniUnityFormasiyasinaCevir(rawSiralar) {
  const netice = {
    sira_1: { unitId: "", count: 0 },
    sira_2: { unitId: "", count: 0 },
    sira_3: { unitId: "", count: 0 }
  };

  for (const raw of Array.isArray(rawSiralar) ? rawSiralar : []) {
    const siraId = metnAl(raw && raw.siraId, 32);
    if (!FORMASIYA_SIRA_IDLERI.includes(siraId)) continue;

    netice[siraId] = {
      unitId: metnAl(raw && raw.unitId, 128),
      count: musbetTamEded(raw && raw.count)
    };
  }

  return netice;
}

function formationInfoUnityUcunUyğunlaşdır(formationInfo, troopInfo) {
  const rawFormation = formationInfo && typeof formationInfo === "object"
    ? formationInfo
    : {};
  const rawTroop = troopInfo && typeof troopInfo === "object"
    ? troopInfo
    : {};

  const troopItems = Array.isArray(rawTroop.items) ? rawTroop.items : [];
  const troopById = new Map(
    troopItems
      .filter(x => x && metnAl(x.konvoyId, 64))
      .map(x => [metnAl(x.konvoyId, 64), x])
  );

  const items = Array.isArray(rawFormation.items)
    ? rawFormation.items.map(item => {
        const konvoyId = metnAl(item && item.konvoyId, 64);
        const troopItem = troopById.get(konvoyId) || null;
        const siralar = Array.isArray(item && item.siralar)
          ? item.siralar.map(x => ({ ...x }))
          : [];

        return {
          ...item,
          tutum: musbetTamEded(troopItem && troopItem.tutum),
          istifadeOlunanTutum: musbetTamEded(
            troopItem && troopItem.istifadeOlunanTutum
          ),
          formation: siralarArrayiniUnityFormasiyasinaCevir(siralar)
        };
      })
    : [];

  return {
    ...rawFormation,
    tutumLevel: musbetTamEded(rawTroop.tutumLevel),
    tutum: musbetTamEded(rawTroop.tutum),
    items
  };
}

function legacyTroopRequestiniTetbiqEt(state, konvoyId, rawTroops) {
  const id = metnAl(konvoyId, 64);
  const tutumHesabi = konvoyTutumHesabiniAl(state, id);
  const siralar = legacyQosunlardanFormasiyaHazirla(
    rawTroops,
    tutumHesabi.siraTutumu
  );

  if (!siralar) {
    return {
      success: false,
      message: "Köhnə qoşun seçimi 3 sıralı konvoy formasiyasına sığmır. Qoşunları 3 sıra üzrə yenidən yerləşdirin.",
      legacyFormationSyncRequired: true,
      tutum: musbetTamEded(tutumHesabi.yekunTutum),
      siraTutumu: musbetTamEded(tutumHesabi.siraTutumu),
      tutumHesabi
    };
  }

  const formasiyaNeticesi = formasiyaTeyinEt(state, id, siralar);
  if (!formasiyaNeticesi || formasiyaNeticesi.success !== true) {
    return formasiyaNeticesi || {
      success: false,
      message: "Köhnə qoşun seçimi konvoy formasiyasına tətbiq edilə bilmədi."
    };
  }

  const troopInfo = formasiyaNeticesi.troopInfo || konvoyQosunMelumatiniHazirla(state);
  const formationInfo = formationInfoUnityUcunUyğunlaşdır(
    formasiyaNeticesi.formationInfo,
    troopInfo
  );

  return {
    success: true,
    konvoyId: id,
    tutum: formasiyaNeticesi.tutum,
    siraTutumu: formasiyaNeticesi.siraTutumu,
    tutumHesabi,
    istifadeOlunanTutum: formasiyaNeticesi.istifadeOlunanTutum,
    qosunlar: { ...(formasiyaNeticesi.qosunlar || {}) },
    siralar: Array.isArray(formasiyaNeticesi.siralar)
      ? formasiyaNeticesi.siralar.map(x => ({ ...x }))
      : [],
    formation: siralarArrayiniUnityFormasiyasinaCevir(formasiyaNeticesi.siralar),
    formationInfo,
    troopInfo,
    // Köhnə `convoy_troops_set_result` client-ləri `info` sahəsini gözləyə bilər.
    info: troopInfo,
    legacyFormationSynced: true
  };
}

function konvoyStateYedeyiniAl(state) {
  const varIdi = Object.prototype.hasOwnProperty.call(state, "konvoylar");
  return {
    varIdi,
    deyer: varIdi ? kopyala(state.konvoylar) : undefined
  };
}

function konvoyStateRollbackEt(state, yedek) {
  if (yedek && yedek.varIdi) {
    state.konvoylar = kopyala(yedek.deyer);
  }
  else {
    delete state.konvoylar;
  }
}

function konvoyMutasiyasiniTetbiqEt(state, type, msg, nowMs = Date.now()) {
  const konvoyId = metnAl(msg && msg.konvoyId, 64);
  const heroId = metnAl(msg && msg.heroId, 128);

  const mesgul = konvoyMesguldur(state, konvoyId, nowMs);
  if (mesgul.mesguldur) {
    return {
      success: false,
      deyisdi: false,
      busyReason: mesgul.sebeb,
      mission: mesgul.mission,
      message: mesgul.message
    };
  }

  const konvoyYedeyi = konvoyStateYedeyiniAl(state);
  let netice;

  if (type === "convoy_hero_assign_request") {
    netice = qehremaniKonvoyaYerlesdir(state, konvoyId, heroId);
  }
  else if (type === "convoy_hero_remove_request") {
    netice = qehremaniKonvoydanCixar(state, konvoyId, heroId);
  }
  else if (type === "convoy_formation_set_request") {
    // Serverin canonical müqaviləsi `siralar[]` saxlanılır.
    // Unity 3-sıralı UI isə `formation.sira_1..sira_3` göndərir.
    // Hər iki formatı qəbul edirik ki, köhnə client-lər pozulmasın.
    const rawFormasiya = msg && (
      Array.isArray(msg.siralar)
        ? msg.siralar
        : msg.formation
    );
    const siralar = unityFormasiyasiniSiralarArrayinaCevir(rawFormasiya);
    netice = formasiyaTeyinEt(state, konvoyId, siralar);

    if (netice && netice.success === true) {
      netice.formation = siralarArrayiniUnityFormasiyasinaCevir(netice.siralar);
      netice.formationInfo = formationInfoUnityUcunUyğunlaşdır(
        netice.formationInfo,
        netice.troopInfo
      );
    }
  }
  else if (type === "convoy_troops_set_request") {
    // Legacy client aggregate `troops` göndərir. Onu ayrıca qosunlar-a yazmaq
    // formasiya ilə state mismatch yaradırdı. İndi eyni məlumat serverdə
    // deterministik 3 sıraya çevrilir və canonical formation mutation işləyir.
    netice = legacyTroopRequestiniTetbiqEt(
      state,
      konvoyId,
      msg && msg.troops
    );
  }
  else if (type === "convoy_defense_set_request") {
    netice = konvoyMudafiesiniTeyinEt(
      state,
      konvoyId,
      msg && msg.enabled,
      nowMs
    );
  }
  else {
    return {
      success: false,
      deyisdi: false,
      message: "Naməlum konvoy mutation mesajı göndərilib."
    };
  }

  if (!netice || netice.success !== true) {
    konvoyStateRollbackEt(state, konvoyYedeyi);

    return {
      success: false,
      deyisdi: false,
      message: netice && netice.message
        ? netice.message
        : "Konvoy mutation-u tətbiq edilə bilmədi.",
      busyReason: netice && netice.busyReason ? netice.busyReason : undefined,
      mission: netice && netice.mission ? netice.mission : undefined,
      legacyFormationSyncRequired: netice && netice.legacyFormationSyncRequired === true
        ? true
        : undefined
    };
  }

  return {
    success: true,
    deyisdi: true,
    netice
  };
}

async function konvoyMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!KONVOY_MESAJLARI.has(type)) return false;

  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  const resultType = neticeTipiniAl(type);

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

    const state = kontekst.getOrCreatePlayerState(playerId);

    if (type === "convoy_info_request") {
      const heroInfo = konvoyMelumatiniHazirla(state);
      const troopInfo = konvoyQosunMelumatiniHazirla(state);
      const formationInfo = formationInfoUnityUcunUyğunlaşdır(
        formasiyaMelumatiniHazirla(state),
        troopInfo
      );
      const defenseInfo = konvoyMudafieMelumatiniHazirla(
        state,
        kontekst.nowMs()
      );
      const info = {
        ...heroInfo,
        troopInfo,
        formationInfo,
        defenseInfo
      };

      gonder(kontekst, resultType, {
        success: true,
        playerId,
        info,
        payloadJson: JSON.stringify(info)
      });
      return true;
    }

    const mutasiyaNeticesi = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
      playerId,
      state,
      async kilidliState => {
        return konvoyMutasiyasiniTetbiqEt(
          kilidliState,
          type,
          kontekst.msg,
          kontekst.nowMs()
        );
      }
    );

    if (!mutasiyaNeticesi || mutasiyaNeticesi.success !== true) {
      gonder(kontekst, resultType, {
        success: false,
        playerId,
        message: mutasiyaNeticesi && mutasiyaNeticesi.message
          ? mutasiyaNeticesi.message
          : "Konvoy mutation-u tamamlanmadı.",
        busyReason: mutasiyaNeticesi && mutasiyaNeticesi.busyReason
          ? mutasiyaNeticesi.busyReason
          : undefined,
        mission: mutasiyaNeticesi && mutasiyaNeticesi.mission
          ? mutasiyaNeticesi.mission
          : undefined,
        legacyFormationSyncRequired: mutasiyaNeticesi && mutasiyaNeticesi.legacyFormationSyncRequired === true
          ? true
          : undefined
      });
      return true;
    }

    const netice = mutasiyaNeticesi.netice || {};

    gonder(kontekst, resultType, {
      success: true,
      playerId,
      ...netice,
      payloadJson: JSON.stringify(netice)
    });
  }
  catch (xeta) {
    console.error("[KONVOY]", xeta);
    gonder(kontekst, resultType, {
      success: false,
      playerId,
      message: "Konvoy əməliyyatı tamamlanmadı."
    });
  }

  return true;
}

module.exports = {
  KONVOY_MESAJLARI,
  unityFormasiyasiniSiralarArrayinaCevir,
  siralarArrayiniUnityFormasiyasinaCevir,
  formationInfoUnityUcunUyğunlaşdır,
  legacyTroopRequestiniTetbiqEt,
  konvoyMutasiyasiniTetbiqEt,
  konvoyMesajiniEmalEt
};
