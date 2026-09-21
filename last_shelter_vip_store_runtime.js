"use strict";

const {
  VIP_STORE_PROTOCOL,
  VIP_STORE_GOODS,
  VIP_STORE_STATE_EFFECT_IDS
} = require("./last_shelter_vip_store_reference");

function tamEded(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n)
    ? Math.max(0, Math.trunc(n))
    : fallback;
}

function lastShelterVipStoreStateHazirla() {
  return {
    currentExp: 0,
    level: 1,
    activepoint: 0,
    gambleCount: 0,
    initExp: 0,
    purchaseCounts: {}
  };
}

function lastShelterVipStoreStateTeminEt(state) {
  if (
    !state ||
    typeof state !== "object"
  ) {
    return null;
  }

  if (
    !state.lastShelterVipStore ||
    typeof state.lastShelterVipStore !== "object" ||
    Array.isArray(state.lastShelterVipStore)
  ) {
    state.lastShelterVipStore =
      lastShelterVipStoreStateHazirla();
  }

  const store =
    state.lastShelterVipStore;

  store.currentExp =
    tamEded(store.currentExp, 0);
  store.level =
    Math.max(
      1,
      tamEded(store.level, 1)
    );
  store.activepoint =
    tamEded(store.activepoint, 0);
  store.gambleCount =
    tamEded(store.gambleCount, 0);
  store.initExp =
    tamEded(store.initExp, 0);

  if (
    !store.purchaseCounts ||
    typeof store.purchaseCounts !== "object" ||
    Array.isArray(store.purchaseCounts)
  ) {
    store.purchaseCounts = {};
  }

  for (
    const good of
    VIP_STORE_GOODS
  ) {
    const key =
      String(good.id);

    store.purchaseCounts[key] =
      tamEded(
        store.purchaseCounts[key],
        0
      );
  }

  return store;
}

/*
 * Produces the verified newPanelInfo shape. refreshTime is supplied by the
 * reset scheduler because only the captured timestamp is verified; reset
 * cadence is not guessed here.
 */
function vipStorePanelInfoHazirla(
  state,
  refreshTime
) {
  const store =
    lastShelterVipStoreStateTeminEt(
      state
    );

  if (!store) {
    return null;
  }

  const refresh =
    tamEded(refreshTime, 0);

  return {
    vipstore: {
      effectIds: [],
      currentExp:
        store.currentExp,
      level:
        store.level,
      refreshTime:
        refresh,
      activepoint:
        store.activepoint,
      goods:
        VIP_STORE_GOODS.map(
          good => ({
            ...good,
            buyAmount:
              tamEded(
                store.purchaseCounts[
                  String(good.id)
                ],
                0
              )
          })
        ),
      gambleCount:
        store.gambleCount,
      maxviplevel:
        VIP_STORE_PROTOCOL.maxVipLevel,
      vip_effects: {},
      lvUpNeedExp:
        VIP_STORE_PROTOCOL.levelUpNeedExp,
      initExp:
        store.initExp,
      stateArray:
        VIP_STORE_STATE_EFFECT_IDS.map(
          item => ({ ...item })
        )
    }
  };
}

module.exports = {
  lastShelterVipStoreStateHazirla,
  lastShelterVipStoreStateTeminEt,
  vipStorePanelInfoHazirla
};
