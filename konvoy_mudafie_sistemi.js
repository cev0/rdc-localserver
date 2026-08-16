"use strict";

const { konvoyStateTeminEt } = require("./konvoy_sistemi");
const { konvoyMesguldur } = require("./konvoy_mesgul_sistemi");

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function konvoyMudafieStateTeminEt(state) {
  const konvoylar = konvoyStateTeminEt(state);

  for (const konvoy of konvoylar.items) {
    if (!konvoy) continue;

    // Legacy save-lərdə bu field yoxdur. Əvvəlki davranışa ən yaxın təhlükəsiz
    // migration kimi açıq konvoylar müdafiəyə aktiv sayılır. Oyunçu sonra
    // binadan istədiyi konvoyu deaktiv edə bilər.
    if (typeof konvoy.defenseEnabled !== "boolean") {
      konvoy.defenseEnabled = konvoy.aciqdir === true;
    }

    if (konvoy.aciqdir !== true) {
      konvoy.defenseEnabled = false;
    }
  }

  return konvoylar;
}

function konvoyMudafieMelumatiniHazirla(state, nowMs = Date.now()) {
  const konvoylar = konvoyMudafieStateTeminEt(state);

  return {
    version: 1,
    mode: "selected_idle_convoys_only",
    freeTroopsAutoDefend: false,
    items: konvoylar.items.map(konvoy => {
      const mesgul = konvoyMesguldur(state, konvoy.konvoyId, nowMs);
      return {
        konvoyId: konvoy.konvoyId,
        aciqdir: konvoy.aciqdir === true,
        defenseEnabled: konvoy.defenseEnabled === true,
        atBase: mesgul.mesguldur !== true,
        participatesNow: konvoy.aciqdir === true &&
          konvoy.defenseEnabled === true &&
          mesgul.mesguldur !== true,
        busyReason: mesgul.mesguldur ? mesgul.sebeb : ""
      };
    })
  };
}

function konvoyMudafiesiniTeyinEt(state, konvoyId, enabled, nowMs = Date.now()) {
  const id = metnAl(konvoyId, 64);
  const konvoylar = konvoyMudafieStateTeminEt(state);
  const konvoy = konvoylar.items.find(x => x && x.konvoyId === id);

  if (!konvoy || konvoy.aciqdir !== true) {
    return { success: false, message: "Konvoy hələ açıq deyil." };
  }

  if (typeof enabled !== "boolean") {
    return { success: false, message: "Müdafiə aktivliyi true/false olmalıdır." };
  }

  const mesgul = konvoyMesguldur(state, id, nowMs);
  if (mesgul.mesguldur) {
    return {
      success: false,
      message: "Aktiv xəritə tapşırığında olan konvoyun müdafiə seçimi dəyişdirilə bilməz.",
      busyReason: mesgul.sebeb,
      mission: mesgul.mission
    };
  }

  konvoy.defenseEnabled = enabled;

  return {
    success: true,
    konvoyId: id,
    defenseEnabled: enabled,
    defenseInfo: konvoyMudafieMelumatiniHazirla(state, nowMs)
  };
}

function mudafiedeIstirakEdenKonvoyIdSetiniAl(state, nowMs = Date.now()) {
  const info = konvoyMudafieMelumatiniHazirla(state, nowMs);
  return new Set(
    info.items
      .filter(x => x.participatesNow === true)
      .map(x => x.konvoyId)
  );
}

module.exports = {
  konvoyMudafieStateTeminEt,
  konvoyMudafieMelumatiniHazirla,
  konvoyMudafiesiniTeyinEt,
  mudafiedeIstirakEdenKonvoyIdSetiniAl
};
