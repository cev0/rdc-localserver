"use strict";

/*
 * Verified Last Shelter v1.250.102 UserProfile gold wallet semantics.
 *
 * Fresh-account reference init:
 *   user.gold = 40
 *   user.gold1 = 40
 *   user.paidGold = 0
 *
 * decrAllGold bytecode consumes free gold first, then paid gold, rejects
 * non-positive costs, and rejects costs greater than gold + paidGold.
 */

const LAST_SHELTER_STARTER_GOLD_WALLET = Object.freeze({
  gold: 40,
  paidGold: 0
});

function tamEded(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

function lastShelterGoldWalletDefaultHazirla() {
  return {
    gold: LAST_SHELTER_STARTER_GOLD_WALLET.gold,
    paidGold: LAST_SHELTER_STARTER_GOLD_WALLET.paidGold
  };
}

function lastShelterGoldWalletTeminEt(state) {
  if (!state || typeof state !== "object") return null;

  if (
    !state.lastShelterGoldWallet ||
    typeof state.lastShelterGoldWallet !== "object" ||
    Array.isArray(state.lastShelterGoldWallet)
  ) {
    state.lastShelterGoldWallet =
      lastShelterGoldWalletDefaultHazirla();
  }

  const wallet = state.lastShelterGoldWallet;
  const gold = tamEded(wallet.gold);
  const paidGold = tamEded(wallet.paidGold);

  wallet.gold =
    Number.isInteger(gold) && gold >= 0
      ? gold
      : 0;
  wallet.paidGold =
    Number.isInteger(paidGold) && paidGold >= 0
      ? paidGold
      : 0;

  return wallet;
}

function totalGoldAl(wallet) {
  if (!wallet || typeof wallet !== "object") return 0;
  return Math.max(0, tamEded(wallet.gold) || 0) +
    Math.max(0, tamEded(wallet.paidGold) || 0);
}

function decrAllGold(wallet, rawDelta) {
  if (!wallet || typeof wallet !== "object") {
    return {
      success: false,
      code: "WALLET_MISSING",
      message: "Gold wallet yoxdur."
    };
  }

  const delta = tamEded(rawDelta);

  if (!Number.isInteger(delta) || delta <= 0) {
    return {
      success: false,
      code: "INVALID_GOLD_DELTA",
      message: "Gold cost musbet tam eded olmalidir."
    };
  }

  const gold = tamEded(wallet.gold);
  const paidGold = tamEded(wallet.paidGold);

  if (
    !Number.isInteger(gold) ||
    !Number.isInteger(paidGold) ||
    gold < 0 ||
    paidGold < 0
  ) {
    return {
      success: false,
      code: "INVALID_GOLD_STATE",
      message: "Gold wallet state etibarsizdir."
    };
  }

  const totalBefore = gold + paidGold;

  if (totalBefore < delta) {
    return {
      success: false,
      code: "USERGOLD_IS_NOT_ENOUGH",
      message: "Gold kifayet deyil.",
      remainGold: totalBefore
    };
  }

  let nextGold = gold;
  let nextPaidGold = paidGold;

  if (nextGold <= 0) {
    nextPaidGold -= delta;
  }
  else {
    nextGold -= delta;

    if (nextGold < 0) {
      nextPaidGold += nextGold;
      nextGold = 0;
    }
  }

  wallet.gold = nextGold;
  wallet.paidGold = nextPaidGold;

  return {
    success: true,
    costGold: delta,
    gold: nextGold,
    paidGold: nextPaidGold,
    remainGold: nextGold + nextPaidGold
  };
}

function goldInitProjectionHazirla(state) {
  const wallet = lastShelterGoldWalletTeminEt(state);
  if (!wallet) return null;

  return {
    gold: wallet.gold,
    gold1: wallet.gold,
    paidGold: wallet.paidGold
  };
}

module.exports = {
  LAST_SHELTER_STARTER_GOLD_WALLET,
  lastShelterGoldWalletDefaultHazirla,
  lastShelterGoldWalletTeminEt,
  totalGoldAl,
  decrAllGold,
  goldInitProjectionHazirla
};
