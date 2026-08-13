"use strict";

const RECRUIT_QAYDALARI = {
  goy: { displayName: "Göy", dailyFreeCount: 1 },
  benovseyi: { displayName: "Bənövşəyi", dailyFreeCount: 1 },
  narinci: { displayName: "Narıncı", dailyFreeCount: 1 }
};

// Müvəqqəti test qəhrəmanlarıdır. Finalda siyahı 15/10/5 data ilə genişlənəcək.
const QEHREMANLAR = [
  { heroId: "war_master", displayName: "War Master", rarity: "goy", weight: 100, active: true },
  { heroId: "iron_maiden", displayName: "Iron Maiden", rarity: "benovseyi", weight: 100, active: true },
  { heroId: "qiz", displayName: "Qiz", rarity: "narinci", weight: 100, active: true },
  { heroId: "qiz2", displayName: "Qiz2", rarity: "narinci", weight: 100, active: true },
  { heroId: "feroman", displayName: "Feroman", rarity: "narinci", weight: 100, active: true }
];

function rarityNormallasdir(deyer) {
  const xam = String(deyer || "").trim().toLowerCase();
  if (xam === "goy" || xam === "blue") return "goy";
  if (xam === "benovseyi" || xam === "purple") return "benovseyi";
  if (xam === "narinci" || xam === "orange" || xam === "super") return "narinci";
  return "";
}

function recruitQaydasiniAl(rarity) {
  const acar = rarityNormallasdir(rarity);
  return acar ? RECRUIT_QAYDALARI[acar] || null : null;
}

function aktivQehremanlariAl(rarity) {
  const acar = rarityNormallasdir(rarity);
  return QEHREMANLAR.filter(x => x.active === true && x.rarity === acar && x.weight > 0)
    .map(x => ({ ...x }));
}

module.exports = {
  RECRUIT_QAYDALARI,
  rarityNormallasdir,
  recruitQaydasiniAl,
  aktivQehremanlariAl
};
