"use strict";

const MISSIYA_MUKAFAT_HADISESI = "missiya_mukafat_alindi";

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

async function missiyaMukafatAuditiniYazClient(
  client,
  playerId,
  missionId
) {
  const oyuncuId = metnAl(playerId, 128);
  const missiyaId = metnAl(missionId, 64).toLowerCase();

  if (
    !client ||
    typeof client.query !== "function" ||
    !oyuncuId ||
    !missiyaId
  ) {
    throw new Error("Missiya reward audit məlumatı natamamdır.");
  }

  // Oyunçu üçün ümumi PostgreSQL mutation kilidi çağıran tərəfdə alınır.
  // Audit və gameplay snapshot həmin xarici transaction-da birlikdə commit olur.
  const movcud = await client.query(
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
    return {
      yazildi: false,
      artiqMovcuddur: true
    };
  }

  await client.query(
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

  return {
    yazildi: true,
    artiqMovcuddur: false
  };
}

module.exports = {
  MISSIYA_MUKAFAT_HADISESI,
  missiyaMukafatAuditiniYazClient
};
