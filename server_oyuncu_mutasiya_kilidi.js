"use strict";

const aktivKilidler = new Map();

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

async function oyuncuMutasiyaKilidiIleIcraEt(playerId, emeliyyat) {
  const acar = metnAl(playerId, 128);

  if (!acar || typeof emeliyyat !== "function") {
    return typeof emeliyyat === "function"
      ? await emeliyyat()
      : undefined;
  }

  const evvelki = aktivKilidler.get(acar) || Promise.resolve();
  let kilidiAc;

  const cari = new Promise(resolve => {
    kilidiAc = resolve;
  });

  aktivKilidler.set(acar, cari);

  try {
    await evvelki.catch(() => {});
    return await emeliyyat();
  }
  finally {
    kilidiAc();

    if (aktivKilidler.get(acar) === cari) {
      aktivKilidler.delete(acar);
    }
  }
}

function oyuncuMutasiyaNovbesiVar(playerId) {
  const acar = metnAl(playerId, 128);
  return !!acar && aktivKilidler.has(acar);
}

module.exports = {
  oyuncuMutasiyaKilidiIleIcraEt,
  oyuncuMutasiyaNovbesiVar
};
