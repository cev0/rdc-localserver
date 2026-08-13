"use strict";

const crypto = require("crypto");

function cekiAl(deyer) {
  const say = Number(deyer);
  return Number.isFinite(say) ? Math.max(0, Math.trunc(say)) : 0;
}

function hovuzdanQehremanSec(hovuz) {
  const namizedler = Array.isArray(hovuz)
    ? hovuz.filter(x => x && x.active === true && cekiAl(x.weight) > 0)
    : [];

  if (namizedler.length === 0) return null;

  const umumiCeki = namizedler.reduce((cem, x) => cem + cekiAl(x.weight), 0);
  if (umumiCeki <= 0) return null;

  let secim = crypto.randomInt(umumiCeki);

  for (const namized of namizedler) {
    const ceki = cekiAl(namized.weight);
    if (secim < ceki) return { ...namized };
    secim -= ceki;
  }

  return { ...namizedler[namizedler.length - 1] };
}

module.exports = {
  hovuzdanQehremanSec
};
