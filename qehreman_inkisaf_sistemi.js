"use strict";

const { qehremaniTap } = require("./qehreman_kataloqu");

const INKISAF_SAHESI = Object.freeze({
  TEXNOLOGIYA: "texnologiya",
  TIKINTI: "tikinti",
  RESURS_ISTEHSALI: "resurs_istehsali",
  QOSUN_TELIMI: "qosun_telimi",
  XESTEXANA: "xestexana",
  TICARET: "ticaret"
});

const INKISAF_EFFEKT_NOVU = Object.freeze({
  TEDQIQAT_SURETI_FAIZ: "tedqiqat_sureti_faiz",
  TEDQIQAT_XERCI_FAIZ: "tedqiqat_xerci_faiz",
  TIKINTI_SURETI_FAIZ: "tikinti_sureti_faiz",
  TIKINTI_XERCI_FAIZ: "tikinti_xerci_faiz",
  ISTEHSAL_FAIZ: "istehsal_faiz",
  TELIM_SURETI_FAIZ: "telim_sureti_faiz",
  TELIM_TUTUMU: "telim_tutumu",
  TELIM_XERCI_FAIZ: "telim_xerci_faiz",
  MUALICE_SURETI_FAIZ: "mualice_sureti_faiz",
  MUALICE_XERCI_FAIZ: "mualice_xerci_faiz",
  XESTEXANA_TUTUMU: "xestexana_tutumu",
  TICARET_YUK_FAIZ: "ticaret_yuk_faiz",
  TICARET_QIYMET_FAIZ: "ticaret_qiymet_faiz"
});

const EFFEKT_AZ_ADI = Object.freeze({
  [INKISAF_EFFEKT_NOVU.TEDQIQAT_SURETI_FAIZ]: "Tədqiqat sürəti",
  [INKISAF_EFFEKT_NOVU.TEDQIQAT_XERCI_FAIZ]: "Tədqiqat xərclərinin azalması",
  [INKISAF_EFFEKT_NOVU.TIKINTI_SURETI_FAIZ]: "Tikinti sürəti",
  [INKISAF_EFFEKT_NOVU.TIKINTI_XERCI_FAIZ]: "Tikinti xərclərinin azalması",
  [INKISAF_EFFEKT_NOVU.ISTEHSAL_FAIZ]: "İstehsal artımı",
  [INKISAF_EFFEKT_NOVU.TELIM_SURETI_FAIZ]: "Təlim sürəti",
  [INKISAF_EFFEKT_NOVU.TELIM_TUTUMU]: "Təlim tutumu",
  [INKISAF_EFFEKT_NOVU.TELIM_XERCI_FAIZ]: "Təlim xərclərinin azalması",
  [INKISAF_EFFEKT_NOVU.MUALICE_SURETI_FAIZ]: "Müalicə sürəti",
  [INKISAF_EFFEKT_NOVU.MUALICE_XERCI_FAIZ]: "Müalicə xərclərinin azalması",
  [INKISAF_EFFEKT_NOVU.XESTEXANA_TUTUMU]: "Xəstəxana tutumu",
  [INKISAF_EFFEKT_NOVU.TICARET_YUK_FAIZ]: "Ticarət yük tutumu",
  [INKISAF_EFFEKT_NOVU.TICARET_QIYMET_FAIZ]: "Ticarət qiyməti"
});

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().toLowerCase().slice(0, max) : "";
}

function reqemAl(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function qehremanStateTap(state, heroId) {
  const id = metnAl(heroId);
  return Array.isArray(state && state.heroes)
    ? state.heroes.find(x => metnAl(x && x.heroId) === id) || null
    : null;
}

function skillLeveliniAl(heroState, slotIndex) {
  const slot = Math.max(1, Math.trunc(Number(slotIndex) || 0));
  if (!heroState || slot <= 0) return 0;

  if (Array.isArray(heroState.skills)) {
    const raw = heroState.skills.find(x => x && Math.trunc(Number(x.slotIndex) || 0) === slot);
    if (raw) {
      if (raw.isUnlocked !== true) return 0;
      return Math.max(1, Math.trunc(Number(raw.skillLevel) || 1));
    }
  }
  else if (heroState.skills && typeof heroState.skills === "object") {
    const raw = heroState.skills[String(slot)] ?? heroState.skills[slot];
    if (typeof raw === "number") return Math.max(0, Math.trunc(raw));
    if (raw && typeof raw === "object") {
      if (raw.unlocked === false || raw.isUnlocked === false) return 0;
      return Math.max(0, Math.trunc(Number(raw.level ?? raw.skillLevel) || 0));
    }
  }

  if (Array.isArray(heroState.skillLevels)) {
    return Math.max(0, Math.trunc(Number(heroState.skillLevels[slot - 1]) || 0));
  }

  return slot === 1 ? 1 : 0;
}

function seviyeyeGoreDeyer(effect, level) {
  if (!effect || level <= 0) return 0;
  if (Array.isArray(effect.valuesByLevel) && effect.valuesByLevel.length > 0) {
    const index = Math.min(effect.valuesByLevel.length, Math.max(1, level)) - 1;
    return reqemAl(effect.valuesByLevel[index]);
  }
  if (effect.value !== undefined) return reqemAl(effect.value);
  return 0;
}

function inkisafKonfiqurasiyasiniAl(heroId) {
  const def = qehremaniTap(heroId);
  if (!def || !def.inkisaf || typeof def.inkisaf !== "object") return null;
  return def.inkisaf;
}

function binaUyğundur(inkisaf, building) {
  if (!inkisaf || !building) return false;
  const binaId = metnAl(building.buildingId);
  const icazeli = Array.isArray(inkisaf.allowedBuildingIds)
    ? inkisaf.allowedBuildingIds.map(x => metnAl(x)).filter(Boolean)
    : [];
  return icazeli.length > 0 && icazeli.includes(binaId);
}

function qehremanInkIsafEffektleriniHesabla(state, heroId) {
  const def = qehremaniTap(heroId);
  const inkisaf = inkisafKonfiqurasiyasiniAl(heroId);
  const heroState = qehremanStateTap(state, heroId);
  if (!def || !inkisaf || !heroState) return [];

  const skills = Array.isArray(inkisaf.skills) ? inkisaf.skills : [];
  const netice = [];

  for (const skill of skills) {
    const slotIndex = Math.max(1, Math.trunc(Number(skill && skill.slotIndex) || 0));
    const level = skillLeveliniAl(heroState, slotIndex);
    if (level <= 0) continue;

    for (const effect of Array.isArray(skill.effects) ? skill.effects : []) {
      const nov = metnAl(effect && effect.type, 64);
      if (!Object.values(INKISAF_EFFEKT_NOVU).includes(nov)) continue;
      const value = seviyeyeGoreDeyer(effect, level);
      if (!value) continue;
      netice.push({
        heroId: metnAl(heroId),
        slotIndex,
        skillLevel: level,
        type: nov,
        displayName: EFFEKT_AZ_ADI[nov] || nov,
        value
      });
    }
  }

  return netice;
}

function binaUcunInkIsafModifikatorlariniHesabla(state, buildingInstanceId) {
  const instanceId = metnAl(buildingInstanceId);
  const building = Array.isArray(state && state.buildings)
    ? state.buildings.find(x => x && metnAl(x.instanceId) === instanceId && x.isCompleted === true) || null
    : null;
  if (!building) return { buildingInstanceId: instanceId, effects: [], totals: {} };

  const assignments = state && state.qehremanTapshiriqlari && Array.isArray(state.qehremanTapshiriqlari.development)
    ? state.qehremanTapshiriqlari.development
    : [];

  const effects = [];
  for (const a of assignments) {
    if (!a || metnAl(a.buildingInstanceId) !== instanceId) continue;
    const inkisaf = inkisafKonfiqurasiyasiniAl(a.heroId);
    if (!binaUyğundur(inkisaf, building)) continue;
    effects.push(...qehremanInkIsafEffektleriniHesabla(state, a.heroId));
  }

  const totals = {};
  for (const effect of effects) {
    totals[effect.type] = reqemAl(totals[effect.type]) + reqemAl(effect.value);
  }

  return {
    buildingInstanceId: instanceId,
    buildingId: metnAl(building.buildingId),
    effects,
    totals
  };
}

module.exports = {
  INKISAF_SAHESI,
  INKISAF_EFFEKT_NOVU,
  EFFEKT_AZ_ADI,
  inkisafKonfiqurasiyasiniAl,
  binaUyğundur,
  qehremanInkIsafEffektleriniHesabla,
  binaUcunInkIsafModifikatorlariniHesabla
};
