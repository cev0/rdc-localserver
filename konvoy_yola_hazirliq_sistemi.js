"use strict";

const {
  konvoyQosunlariniTeyinEt,
  qosunSayiniHesabla
} = require("./konvoy_qosun_sistemi");
const {
  formasiyaStateTeminEt,
  formasiyaQosunlariniTopla,
  konvoyFormasiyalariniTeminEt
} = require("./konvoy_formasiya_sistemi");
const { konvoyTutumHesabiniAl } = require("./konvoy_tutum_formulu");

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function qosunObyektleriEynidir(a, b) {
  const sol = Object.entries(a || {})
    .map(([unitId, count]) => [metnAl(unitId, 128), tamEded(count)])
    .filter(([unitId, count]) => !!unitId && count > 0)
    .sort((x, y) => x[0].localeCompare(y[0]));
  const sag = Object.entries(b || {})
    .map(([unitId, count]) => [metnAl(unitId, 128), tamEded(count)])
    .filter(([unitId, count]) => !!unitId && count > 0)
    .sort((x, y) => x[0].localeCompare(y[0]));

  if (sol.length !== sag.length) return false;
  for (let i = 0; i < sol.length; i++) {
    if (sol[i][0] !== sag[i][0] || sol[i][1] !== sag[i][1]) return false;
  }
  return true;
}

function ugursuz(code, message, elave = {}) {
  return {
    success: false,
    ready: false,
    code,
    message,
    ...elave
  };
}

function konvoyYolaHazirliginiYoxla(state, convoyId, targetType = "") {
  const id = metnAl(convoyId, 64);
  const hedefTipi = metnAl(targetType, 32);
  const konvoylar = konvoyFormasiyalariniTeminEt(state);
  const konvoy = konvoylar.items.find(x => x && x.konvoyId === id) || null;

  if (!konvoy || konvoy.aciqdir !== true) {
    return ugursuz(
      "convoy_not_open",
      "Konvoy xəritəyə göndərilə bilməz: konvoy hələ açıq deyil.",
      { convoyId: id }
    );
  }

  const qosunlar = { ...(konvoy.qosunlar || {}) };
  const troopCount = qosunSayiniHesabla(qosunlar);
  if (troopCount <= 0) {
    return ugursuz(
      "convoy_has_no_troops",
      "Konvoy xəritəyə göndərilə bilməz: konvoyda qoşun yoxdur.",
      { convoyId: id }
    );
  }

  const tutumHesabi = konvoyTutumHesabiniAl(state, id);
  const siraTutumu = tamEded(tutumHesabi.siraTutumu);
  const formasiya = formasiyaStateTeminEt(konvoy);
  const siralar = formasiya.siralar.map(x => ({
    siraId: metnAl(x && x.siraId, 32),
    unitId: metnAl(x && x.unitId, 128),
    count: tamEded(x && x.count)
  }));

  for (const sira of siralar) {
    if (sira.count > siraTutumu) {
      return ugursuz(
        "formation_row_capacity_exceeded",
        `${sira.siraId} tutumu keçilib. Bu sıraya maksimum ${siraTutumu} birlik yerləşdirilə bilər.`,
        {
          convoyId: id,
          siraId: sira.siraId,
          rowCount: sira.count,
          siraTutumu,
          tutum: tamEded(tutumHesabi.yekunTutum),
          tutumHesabi
        }
      );
    }
  }

  const formasiyaQosunlari = formasiyaQosunlariniTopla(siralar);
  if (!qosunObyektleriEynidir(qosunlar, formasiyaQosunlari)) {
    return ugursuz(
      "formation_troop_mismatch",
      "Konvoy xəritəyə göndərilə bilməz: 3 sıralı formasiya ilə konvoy qoşun siyahısı uyğun deyil. Qoşunları yenidən yerləşdirin.",
      {
        convoyId: id,
        qosunlar,
        formasiyaQosunlari,
        siralar,
        siraTutumu,
        tutum: tamEded(tutumHesabi.yekunTutum),
        tutumHesabi
      }
    );
  }

  // Mövcud server-authoritative army/reservation/total-capacity validatorunu
  // cari qoşun snapshot-u üzərində yenidən işlədirik. Beləliklə köhnə/stale
  // snapshot sahib olunan real ordudan və ya cari barrack tutumundan böyükdürsə
  // yürüş başlamadan bloklanır.
  const qosunYoxlamasi = konvoyQosunlariniTeyinEt(state, id, qosunlar);
  if (!qosunYoxlamasi || qosunYoxlamasi.success !== true) {
    return ugursuz(
      "troop_reservation_or_capacity_invalid",
      qosunYoxlamasi && qosunYoxlamasi.message
        ? qosunYoxlamasi.message
        : "Konvoy qoşunları cari ordu və tutum qaydalarına uyğun deyil.",
      {
        convoyId: id,
        siraTutumu,
        tutum: tamEded(tutumHesabi.yekunTutum),
        tutumHesabi
      }
    );
  }

  const heroIds = Array.isArray(konvoy.qehremanIdleri)
    ? konvoy.qehremanIdleri.map(x => metnAl(x, 128)).filter(Boolean)
    : [];

  // Enemy yürüşü onsuz da çatanda serverdə hero tələb edirdi. Eyni qaydanı
  // dispatch mərhələsinə gətiririk ki, 5 saniyəlik döyüşə qədər boşuna yürüməsin.
  if (hedefTipi === "enemy" && heroIds.length <= 0) {
    return ugursuz(
      "enemy_convoy_has_no_combat_hero",
      "Düşmənə hücum üçün konvoyda Döyüş qəhrəmanı olmalıdır.",
      { convoyId: id }
    );
  }

  return {
    success: true,
    ready: true,
    code: "ready",
    convoyId: id,
    targetType: hedefTipi,
    troopCount,
    qosunlar: { ...qosunlar },
    siralar,
    heroIds,
    tutum: tamEded(tutumHesabi.yekunTutum),
    siraTutumu,
    tutumHesabi
  };
}

module.exports = {
  qosunObyektleriEynidir,
  konvoyYolaHazirliginiYoxla
};
