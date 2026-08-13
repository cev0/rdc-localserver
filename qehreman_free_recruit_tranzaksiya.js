"use strict";

const { proqramHovuzunuAl } = require("./verilenler_bazasi");
const { FREE_RECRUIT_HADISESI } = require("./qehreman_recruit_status_postgres");

const SNAPSHOT_HADISE_NOVU = "oyun_state_snapshot_v1";

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string" ? deyer.trim().slice(0, maksimum) : "";
}

async function freeRecruitVeSnapshotiniYaz({
  playerId,
  tarix,
  rarity,
  heroId,
  wasDuplicate,
  state
}) {
  const oyuncuId = metnAl(playerId, 128);
  const tarixAcar = metnAl(tarix, 16);
  const rarityAcar = metnAl(rarity, 32).toLowerCase();
  const qehremanId = metnAl(heroId, 128).toLowerCase();

  if (!oyuncuId || !tarixAcar || !rarityAcar || !qehremanId || !state) {
    throw new Error("Free recruit transaction məlumatı natamamdır.");
  }

  const klient = await proqramHovuzunuAl().connect();

  try {
    await klient.query("BEGIN");
    await klient.query(
      "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
      [oyuncuId, `${tarixAcar}:${rarityAcar}`]
    );

    const movcud = await klient.query(
      `SELECT id FROM hesab_audit_jurnali
       WHERE oyuncu_id = $1
         AND hadise_novu = $2
         AND COALESCE(detallar->>'tarix', '') = $3
         AND LOWER(COALESCE(detallar->>'rarity', '')) = $4
       LIMIT 1`,
      [oyuncuId, FREE_RECRUIT_HADISESI, tarixAcar, rarityAcar]
    );

    if (movcud.rows && movcud.rows.length > 0) {
      await klient.query("ROLLBACK");
      return { yazildi: false, artiqIstifadeOlunub: true };
    }

    await klient.query(
      `INSERT INTO hesab_audit_jurnali
       (hesab_id, oyuncu_id, hadise_novu, detallar)
       VALUES (NULL, $1, $2, $3::jsonb)`,
      [
        oyuncuId,
        FREE_RECRUIT_HADISESI,
        JSON.stringify({
          tarix: tarixAcar,
          rarity: rarityAcar,
          heroId: qehremanId,
          wasDuplicate: wasDuplicate === true
        })
      ]
    );

    await klient.query(
      `INSERT INTO hesab_audit_jurnali
       (hesab_id, oyuncu_id, hadise_novu, detallar)
       VALUES (NULL, $1, $2, $3::jsonb)`,
      [
        oyuncuId,
        SNAPSHOT_HADISE_NOVU,
        JSON.stringify({ version: 1, state })
      ]
    );

    await klient.query("COMMIT");
    return { yazildi: true, artiqIstifadeOlunub: false };
  }
  catch (xeta) {
    try { await klient.query("ROLLBACK"); } catch {}
    throw xeta;
  }
  finally {
    klient.release();
  }
}

module.exports = {
  freeRecruitVeSnapshotiniYaz
};
