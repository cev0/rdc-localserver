"use strict";

const {
  missiyaIdNormallasdir,
  missiyaniTap,
  novbetiMissiyaniTap
} = require("./missiya_kataloqu");

const {
  missiyaStateTeminEt,
  missiyaProqresiniHesabla,
  mukafatAlinib,
  missiyaKilidlidir
} = require("./missiya_proqres");

function metnNormallasdir(deyer) {
  return String(deyer || "").trim().toLowerCase();
}

function musbetTamEded(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say)
    ? Math.max(0, Math.trunc(say))
    : 0;
}

function mukafatlariYoxla(state, mukafatlar) {
  if (!state || typeof state !== "object") {
    return { ok: false, message: "Oyunçu state-i tapılmadı." };
  }

  if (!state.resources || typeof state.resources !== "object") {
    return { ok: false, message: "Resurs state-i tapılmadı." };
  }

  for (const mukafat of mukafatlar || []) {
    const resursId = metnNormallasdir(mukafat && mukafat.resourceId);
    const miqdar = musbetTamEded(mukafat && mukafat.amount);

    if (!resursId || miqdar <= 0) continue;

    if (typeof state.resources[resursId] !== "number") {
      return {
        ok: false,
        message: `Dəstəklənməyən missiya resursu: ${resursId}`
      };
    }

    const cari = Number(state.resources[resursId]) || 0;
    const limit = Number(
      state.resourceCaps && state.resourceCaps[resursId]
    );

    if (
      Number.isFinite(limit) &&
      limit >= 0 &&
      cari + miqdar > limit
    ) {
      return {
        ok: false,
        message: `${resursId} anbarında missiya mükafatı üçün kifayət qədər yer yoxdur.`
      };
    }
  }

  return { ok: true };
}

function mukafatlariVer(state, mukafatlar) {
  const verilenler = [];

  for (const mukafat of mukafatlar || []) {
    const resursId = metnNormallasdir(mukafat && mukafat.resourceId);
    const miqdar = musbetTamEded(mukafat && mukafat.amount);

    if (!resursId || miqdar <= 0) continue;
    if (typeof state.resources[resursId] !== "number") continue;

    state.resources[resursId] =
      (Number(state.resources[resursId]) || 0) + miqdar;

    verilenler.push({
      resourceId: resursId,
      amount: miqdar
    });
  }

  return verilenler;
}

function missiyaMukafatiniAl(state, missiyaId) {
  missiyaStateTeminEt(state);

  const missiya = missiyaniTap(missiyaId);

  if (!missiya) {
    return {
      success: false,
      alreadyClaimed: false,
      locked: false,
      missionId: String(missiyaId || ""),
      message: "Missiya tapılmadı.",
      rewards: []
    };
  }

  if (mukafatAlinib(state, missiya.missionId)) {
    return {
      success: false,
      alreadyClaimed: true,
      locked: false,
      missionId: missiya.missionId,
      message: "Missiya mükafatı artıq alınıb.",
      rewards: []
    };
  }

  if (missiyaKilidlidir(state, missiya)) {
    return {
      success: false,
      alreadyClaimed: false,
      locked: true,
      missionId: missiya.missionId,
      message: "Əvvəlki missiyanın mükafatı alınmalıdır.",
      rewards: []
    };
  }

  const teleb = Math.max(1, musbetTamEded(missiya.requiredCount));
  const proqres = missiyaProqresiniHesabla(state, missiya);

  if (proqres < teleb) {
    return {
      success: false,
      alreadyClaimed: false,
      locked: false,
      missionId: missiya.missionId,
      message: `Missiya tamamlanmayıb. Proqres ${proqres}/${teleb}.`,
      rewards: []
    };
  }

  const yoxlama = mukafatlariYoxla(state, missiya.rewards);
  if (!yoxlama.ok) {
    return {
      success: false,
      alreadyClaimed: false,
      locked: false,
      missionId: missiya.missionId,
      message: yoxlama.message,
      rewards: []
    };
  }

  const verilenMukafatlar = mukafatlariVer(state, missiya.rewards);

  state.missions.claimedRewardIds.push(
    missiyaIdNormallasdir(missiya.missionId)
  );

  state.missions.claimedRewardIds = Array.from(
    new Set(state.missions.claimedRewardIds)
  );

  const novbeti = novbetiMissiyaniTap(missiya.missionId);

  return {
    success: true,
    alreadyClaimed: false,
    locked: false,
    missionId: missiya.missionId,
    message: "Missiya mükafatı uğurla alındı.",
    rewards: verilenMukafatlar,
    nextMissionId: novbeti ? novbeti.missionId : ""
  };
}

module.exports = {
  missiyaMukafatiniAl
};
