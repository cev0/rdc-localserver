"use strict";

const {
  proqramHovuzunuAl
} = require("./verilenler_bazasi");

const MISSIYA_MUKAFAT_HADISESI = "missiya_mukafat_alindi";
const SNAPSHOT_HADISE_NOVU = "oyun_state_snapshot_v1";
const SAXLANILAN_SNAPSHOT_SAYI = 3;

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function derinKopyala(deyer) {
  return JSON.parse(JSON.stringify(deyer));
}

async function missiyaMukafatVeSnapshotiniAtomikYaz(
  playerId,
  missionId,
  state
) {
  const oyuncuId = metnAl(playerId, 128);
  const missiyaId = metnAl(missionId, 64).toLowerCase();

  if (!oyuncuId || !missiyaId || !state || typeof state !== "object") {
    throw new Error("Missiya reward transaction məlumatı natamamdır.");
  }

  const hovuz = proqramHovuzunuAl();
  const klient = await hovuz.connect();

  try {
    await klient.query("BEGIN");

    // Eyni oyunçu + missiya üçün paralel claim-ləri transaction səviyyəsində sırala.
    await klient.query(
      `SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`,
      [oyuncuId, missiyaId]
    );

    const movcud = await klient.query(
      `
        SELECT id
        FROM hesab_audit_jurnali
        WHERE oyuncu_id = $1
          AND hadise_novu = $2
          AND LOWER(COALESCE(detallar->>'missionId', '')) = $3
        LIMIT 1
      `,
      [oyuncuId, MISSIYA_MUKAFAT_HADISESI, missiyaId]
    );

    if (movcud.rows && movcud.rows.length > 0) {
      await klient.query("ROLLBACK");
      return {
        yazildi: false,
        artiqMovcuddur: true
      };
    }

    await klient.query(
      `
        INSERT INTO hesab_audit_jurnali (
          hesab_id,
          oyuncu_id,
          hadise_novu,
          detallar
        )
        VALUES (
          NULL,
          $1,
          $2,
          $3::jsonb
        )
      `,
      [
        oyuncuId,
        MISSIYA_MUKAFAT_HADISESI,
        JSON.stringify({ missionId: missiyaId })
      ]
    );

    await klient.query(
      `
        INSERT INTO hesab_audit_jurnali (
          hesab_id,
          oyuncu_id,
          hadise_novu,
          detallar
        )
        VALUES (
          NULL,
          $1,
          $2,
          $3::jsonb
        )
      `,
      [
        oyuncuId,
        SNAPSHOT_HADISE_NOVU,
        JSON.stringify({
          version: 1,
          state: derinKopyala(state)
        })
      ]
    );

    await klient.query(
      `
        DELETE FROM hesab_audit_jurnali
        WHERE id IN (
          SELECT id
          FROM hesab_audit_jurnali
          WHERE oyuncu_id = $1
            AND hadise_novu = $2
          ORDER BY id DESC
          OFFSET $3
        )
      `,
      [
        oyuncuId,
        SNAPSHOT_HADISE_NOVU,
        SAXLANILAN_SNAPSHOT_SAYI
      ]
    );

    await klient.query("COMMIT");

    return {
      yazildi: true,
      artiqMovcuddur: false
    };
  }
  catch (xeta) {
    try {
      await klient.query("ROLLBACK");
    }
    catch {
      // Əsas xətanı qoruyuruq.
    }

    throw xeta;
  }
  finally {
    klient.release();
  }
}

module.exports = {
  missiyaMukafatVeSnapshotiniAtomikYaz
};
