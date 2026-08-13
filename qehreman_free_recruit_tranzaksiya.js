"use strict";

const { proqramHovuzunuAl } = require("./verilenler_bazasi");
const { FREE_RECRUIT_HADISESI } = require("./qehreman_recruit_status_postgres");
const { qehremaniStateEElaveEt } = require("./qehreman_state");

const SNAPSHOT_HADISE_NOVU = "oyun_state_snapshot_v1";
const SAXLANILAN_SNAPSHOT_SAYI = 3;

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string" ? deyer.trim().slice(0, maksimum) : "";
}

function derinKopyala(deyer) {
  return JSON.parse(JSON.stringify(deyer));
}

async function freeRecruitVeSnapshotiniYaz({
  playerId,
  tarix,
  rarity,
  qehreman,
  state
}) {
  const oyuncuId = metnAl(playerId, 128);
  const tarixAcar = metnAl(tarix, 16);
  const rarityAcar = metnAl(rarity, 32).toLowerCase();
  const qehremanId = metnAl(qehreman && qehreman.heroId, 128).toLowerCase();

  if (!oyuncuId || !tarixAcar || !rarityAcar || !qehremanId || !state) {
    throw new Error("Free recruit transaction məlumatı natamamdır.");
  }

  const evvelkiQehremanState = derinKopyala(state.qehremanlar || {});
  const klient = await proqramHovuzunuAl().connect();
  let qehremanNeticesi = null;

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
      return { yazildi: false, artiqIstifadeOlunub: true, qehreman: null };
    }

    qehremanNeticesi = qehremaniStateEElaveEt(state, qehreman);
    if (!qehremanNeticesi) {
      throw new Error("Recruit nəticəsi qəhrəman state-inə əlavə edilə bilmədi.");
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
          heroId: qehremanNeticesi.heroId,
          wasDuplicate: qehremanNeticesi.wasDuplicate === true
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

    await klient.query(
      `DELETE FROM hesab_audit_jurnali
       WHERE id IN (
         SELECT id FROM hesab_audit_jurnali
         WHERE oyuncu_id = $1 AND hadise_novu = $2
         ORDER BY id DESC OFFSET $3
       )`,
      [oyuncuId, SNAPSHOT_HADISE_NOVU, SAXLANILAN_SNAPSHOT_SAYI]
    );

    await klient.query("COMMIT");

    return {
      yazildi: true,
      artiqIstifadeOlunub: false,
      qehreman: qehremanNeticesi
    };
  }
  catch (xeta) {
    state.qehremanlar = evvelkiQehremanState;
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
