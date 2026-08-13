"use strict";

const { sorguEt } = require("./verilenler_bazasi");

const FREE_RECRUIT_HADISESI = "qehreman_free_recruit_v1";

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

async function gundelikFreeRecruitStatusunuAl(playerId, tarix) {
  const oyuncuId = metnAl(playerId, 128);
  const tarixAcar = metnAl(tarix, 16);

  const status = {
    goy: false,
    benovseyi: false,
    narinci: false
  };

  if (!oyuncuId || !tarixAcar) return status;

  const netice = await sorguEt(
    `
      SELECT LOWER(COALESCE(detallar->>'rarity', '')) AS rarity
      FROM hesab_audit_jurnali
      WHERE oyuncu_id = $1
        AND hadise_novu = $2
        AND COALESCE(detallar->>'tarix', '') = $3
    `,
    [oyuncuId, FREE_RECRUIT_HADISESI, tarixAcar]
  );

  for (const setir of netice.rows || []) {
    const rarity = metnAl(setir && setir.rarity, 32).toLowerCase();
    if (Object.prototype.hasOwnProperty.call(status, rarity)) {
      status[rarity] = true;
    }
  }

  return status;
}

module.exports = {
  FREE_RECRUIT_HADISESI,
  gundelikFreeRecruitStatusunuAl
};
