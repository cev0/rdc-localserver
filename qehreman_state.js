"use strict";

function musbetTamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say) ? Math.max(0, Math.trunc(say)) : 0;
}

function qehremanStateTeminEt(state) {
  if (!state || typeof state !== "object") return null;

  if (!state.qehremanlar || typeof state.qehremanlar !== "object" || Array.isArray(state.qehremanlar)) {
    state.qehremanlar = {};
  }

  if (!Array.isArray(state.qehremanlar.owned)) {
    state.qehremanlar.owned = [];
  }

  state.qehremanlar.version = 1;
  return state.qehremanlar;
}

function qehremaniStateEElaveEt(state, qehreman) {
  const qehremanState = qehremanStateTeminEt(state);
  if (!qehremanState || !qehreman || !qehreman.heroId) return null;

  const heroId = String(qehreman.heroId).trim().toLowerCase();
  let movcud = qehremanState.owned.find(
    x => x && String(x.heroId || "").trim().toLowerCase() === heroId
  );

  if (movcud) {
    movcud.duplicateCopies = musbetTamEded(movcud.duplicateCopies) + 1;

    return {
      wasDuplicate: true,
      heroId: movcud.heroId,
      displayName: movcud.displayName || qehreman.displayName || movcud.heroId,
      rarity: movcud.rarity || qehreman.rarity,
      level: Math.max(1, musbetTamEded(movcud.level) || 1),
      duplicateCopiesAfter: movcud.duplicateCopies
    };
  }

  movcud = {
    heroId,
    displayName: qehreman.displayName || heroId,
    rarity: qehreman.rarity || "",
    level: 1,
    exp: 0,
    duplicateCopies: 0,
    isOwned: true
  };

  qehremanState.owned.push(movcud);

  return {
    wasDuplicate: false,
    heroId: movcud.heroId,
    displayName: movcud.displayName,
    rarity: movcud.rarity,
    level: 1,
    duplicateCopiesAfter: 0
  };
}

module.exports = {
  qehremanStateTeminEt,
  qehremaniStateEElaveEt
};
