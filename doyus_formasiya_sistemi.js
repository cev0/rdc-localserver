"use strict";

const { qosunDoyusMelumatiniAl } = require("./qosun_doyus_stat_sistemi");

const SIRA_IDLERI = Object.freeze(["sira_1", "sira_2", "sira_3"]);

const SIRA_QAYDALARI = Object.freeze({
  sira_1: Object.freeze({
    siraId: "sira_1",
    order: 1,
    roleId: "frontline",
    displayNameAz: "Ön sıra",
    baseExposure: 1
  }),
  sira_2: Object.freeze({
    siraId: "sira_2",
    order: 2,
    roleId: "support",
    displayNameAz: "Dəstək sırası",
    baseExposure: 0.65
  }),
  sira_3: Object.freeze({
    siraId: "sira_3",
    order: 3,
    roleId: "rear",
    displayNameAz: "Arxa sıra",
    baseExposure: 0.4
  })
});

// Bu rollar hələ əlavə damage/defense bonusu vermir. Unity-yə taktiki məna
// göstərmək və gələcək skill/bonus balansını sabit ID-lərlə bağlamaq üçündür.
const SINIF_ROLLARI = Object.freeze({
  warrior: Object.freeze({
    classId: "warrior",
    roleId: "frontline_infantry",
    displayNameAz: "Ön xətt piyadası",
    preferredRows: Object.freeze(["sira_1", "sira_2"])
  }),
  shooter: Object.freeze({
    classId: "shooter",
    roleId: "ranged_support",
    displayNameAz: "Uzaqmənzilli dəstək",
    preferredRows: Object.freeze(["sira_2", "sira_3"])
  }),
  vehicle: Object.freeze({
    classId: "vehicle",
    roleId: "armored_assault",
    displayNameAz: "Zirehli hücum",
    preferredRows: Object.freeze(["sira_1", "sira_2"])
  })
});

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function siraQaydasiniAl(siraId) {
  return SIRA_QAYDALARI[metnAl(siraId, 32)] || null;
}

function siraSirasi(siraId) {
  const qayda = siraQaydasiniAl(siraId);
  return qayda ? qayda.order : 999;
}

function sinifRolunuAl(classId) {
  return SINIF_ROLLARI[metnAl(classId, 64)] || null;
}

function unitRolunuAl(unitId) {
  const unit = qosunDoyusMelumatiniAl(unitId);
  if (!unit) return null;
  const role = sinifRolunuAl(unit.classId);
  return role
    ? {
        classId: role.classId,
        roleId: role.roleId,
        displayNameAz: role.displayNameAz,
        preferredRows: [...role.preferredRows]
      }
    : null;
}

function siraniTemizle(raw) {
  const siraId = metnAl(raw && raw.siraId, 32);
  const unitId = metnAl(raw && raw.unitId, 128);
  const count = tamEded(raw && raw.count);
  if (!SIRA_IDLERI.includes(siraId) || !unitId || count <= 0) return null;
  return { siraId, unitId, count };
}

function formasiyaTemizle(raw) {
  if (!Array.isArray(raw)) return [];
  const byRow = new Map();
  for (const item of raw) {
    const row = siraniTemizle(item);
    if (!row || byRow.has(row.siraId)) continue;
    byRow.set(row.siraId, row);
  }
  return SIRA_IDLERI.map(id => byRow.get(id)).filter(Boolean);
}

function aktivSiraEkspozisiyalariniHazirla(rawRows) {
  const active = formasiyaTemizle(rawRows)
    .filter(x => x.count > 0)
    .sort((a, b) => siraSirasi(a.siraId) - siraSirasi(b.siraId));

  return active.map((row, index) => {
    // Qarşıdakı sıra boşaldıqda növbəti sıra avtomatik ön xəttə keçir.
    const nisbiQayda = SIRA_QAYDALARI[SIRA_IDLERI[Math.min(index, 2)]];
    return {
      siraId: row.siraId,
      unitId: row.unitId,
      count: row.count,
      absoluteOrder: siraSirasi(row.siraId),
      activeDepth: index + 1,
      exposure: nisbiQayda.baseExposure,
      activeRoleId: nisbiQayda.roleId
    };
  });
}

function formasiyaDoyusMelumatiniHazirla(rawRows) {
  const rows = formasiyaTemizle(rawRows);
  const activeExposure = new Map(
    aktivSiraEkspozisiyalariniHazirla(rows).map(x => [x.siraId, x])
  );

  return {
    version: 1,
    rowCount: 3,
    targetingRuleId: "front_to_back_dynamic_exposure_v1",
    classRoleBonusEnabled: false,
    classRolePenaltyEnabled: false,
    rows: SIRA_IDLERI.map(siraId => {
      const source = rows.find(x => x.siraId === siraId) || { siraId, unitId: "", count: 0 };
      const qayda = siraQaydasiniAl(siraId);
      const unit = source.unitId ? qosunDoyusMelumatiniAl(source.unitId) : null;
      const role = unit ? sinifRolunuAl(unit.classId) : null;
      const active = activeExposure.get(siraId) || null;
      return {
        siraId,
        order: qayda.order,
        rowRoleId: qayda.roleId,
        rowDisplayNameAz: qayda.displayNameAz,
        baseExposure: qayda.baseExposure,
        unitId: source.unitId,
        count: source.count,
        classId: unit ? unit.classId : "",
        classRoleId: role ? role.roleId : "",
        classRoleDisplayNameAz: role ? role.displayNameAz : "",
        preferredRows: role ? [...role.preferredRows] : [],
        preferredPlacement: !!(role && role.preferredRows.includes(siraId)),
        currentExposure: active ? active.exposure : 0,
        activeDepth: active ? active.activeDepth : 0
      };
    })
  };
}

module.exports = {
  SIRA_IDLERI,
  SIRA_QAYDALARI,
  SINIF_ROLLARI,
  siraQaydasiniAl,
  siraSirasi,
  sinifRolunuAl,
  unitRolunuAl,
  formasiyaTemizle,
  aktivSiraEkspozisiyalariniHazirla,
  formasiyaDoyusMelumatiniHazirla
};
