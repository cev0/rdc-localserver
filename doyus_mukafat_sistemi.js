"use strict";

const {
  doyusStateTeminEt
} = require("./doyus_sistemi");

function metnAl(deyer, maksimum = 64) {
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

function mukafatlariYoxla(state, mukafatlar) {
  if (!state || typeof state !== "object") {
    return {
      ok: false,
      message: "Oyunçu state-i tapılmadı."
    };
  }

  if (
    !state.resources ||
    typeof state.resources !== "object" ||
    Array.isArray(state.resources)
  ) {
    return {
      ok: false,
      message: "Resurs state-i tapılmadı."
    };
  }

  for (const mukafat of mukafatlar || []) {
    const resursId = metnAl(
      mukafat && mukafat.resourceId,
      64
    );

    const miqdar = musbetTamEded(
      mukafat && mukafat.amount
    );

    if (!resursId || miqdar <= 0) {
      continue;
    }

    if (typeof state.resources[resursId] !== "number") {
      return {
        ok: false,
        message: `Dəstəklənməyən döyüş resursu: ${resursId}`
      };
    }

    const cari =
      Number(state.resources[resursId]) || 0;

    const limit = Number(
      state.resourceCaps &&
      state.resourceCaps[resursId]
    );

    if (
      Number.isFinite(limit) &&
      limit >= 0 &&
      cari + miqdar > limit
    ) {
      return {
        ok: false,
        message: `${resursId} anbarında döyüş mükafatı üçün kifayət qədər yer yoxdur.`
      };
    }
  }

  return { ok: true };
}

function mukafatlariVer(state, mukafatlar) {
  const verilenler = [];

  for (const mukafat of mukafatlar || []) {
    const resursId = metnAl(
      mukafat && mukafat.resourceId,
      64
    );

    const miqdar = musbetTamEded(
      mukafat && mukafat.amount
    );

    if (!resursId || miqdar <= 0) {
      continue;
    }

    if (typeof state.resources[resursId] !== "number") {
      continue;
    }

    state.resources[resursId] =
      (Number(state.resources[resursId]) || 0) + miqdar;

    verilenler.push({
      resourceId: resursId,
      amount: miqdar
    });
  }

  return verilenler;
}

function tutorialDoyusMukafatiniAl(state) {
  const doyus = doyusStateTeminEt(state);
  const tutorial = doyus.tutorial;

  if (tutorial.status !== "qelebe") {
    return {
      success: false,
      alreadyClaimed: false,
      message: "Döyüş mükafatı üçün əvvəlcə qələbə tələb olunur.",
      rewards: []
    };
  }

  if (tutorial.rewardClaimed === true) {
    return {
      success: true,
      alreadyClaimed: true,
      message: "Döyüş mükafatı artıq alınıb.",
      rewards: []
    };
  }

  const pendingRewards = Array.isArray(
    tutorial.pendingRewards
  )
    ? tutorial.pendingRewards.map(x => ({ ...x }))
    : [];

  if (pendingRewards.length === 0) {
    return {
      success: false,
      alreadyClaimed: false,
      message: "Alınacaq döyüş mükafatı yoxdur.",
      rewards: []
    };
  }

  const yoxlama =
    mukafatlariYoxla(
      state,
      pendingRewards
    );

  if (!yoxlama.ok) {
    return {
      success: false,
      alreadyClaimed: false,
      message: yoxlama.message,
      rewards: []
    };
  }

  const verilenMukafatlar =
    mukafatlariVer(
      state,
      pendingRewards
    );

  tutorial.rewardClaimed = true;
  tutorial.claimedRewards =
    verilenMukafatlar.map(x => ({ ...x }));
  tutorial.pendingRewards = [];

  return {
    success: true,
    alreadyClaimed: false,
    message: "Döyüş təchizatı bazaya əlavə edildi.",
    rewards: verilenMukafatlar
  };
}

module.exports = {
  tutorialDoyusMukafatiniAl
};
