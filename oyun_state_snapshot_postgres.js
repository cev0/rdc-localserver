"use strict";

const {
  sorguEt
} = require("./verilenler_bazasi");

const SNAPSHOT_HADISE_NOVU = "oyun_state_snapshot_v1";
const SAXLANILAN_SNAPSHOT_SAYI = 3;

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function snapshotUcunKopyala(state) {
  if (!state || typeof state !== "object") {
    return null;
  }

  return JSON.parse(JSON.stringify(state));
}

function snapshotNeticesindenStateAl(netice) {
  if (!netice || !Array.isArray(netice.rows) || netice.rows.length === 0) {
    return null;
  }

  const detallar = netice.rows[0] && netice.rows[0].detallar;

  if (!detallar || typeof detallar !== "object") {
    return null;
  }

  const state = detallar.state;

  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return null;
  }

  return JSON.parse(JSON.stringify(state));
}

async function snapshotiYazSorquIle(sorquEt, playerId, state) {
  const oyuncuId = metnAl(playerId, 128);
  const snapshot = snapshotUcunKopyala(state);

  if (typeof sorquEt !== "function") {
    throw new Error("Oyun state snapshot sorğu funksiyası yoxdur.");
  }

  if (!oyuncuId || !snapshot) {
    throw new Error("Oyun state snapshot məlumatı natamamdır.");
  }

  await sorquEt(
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
        state: snapshot
      })
    ]
  );

  // Audit cədvəli lazımsız böyüməsin deyə hər oyunçu üçün
  // yalnız son bir neçə gameplay snapshot saxlanılır.
  await sorquEt(
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

  return true;
}

async function snapshotiOxuSorquIle(sorquEt, playerId) {
  const oyuncuId = metnAl(playerId, 128);

  if (typeof sorquEt !== "function" || !oyuncuId) {
    return null;
  }

  const netice = await sorquEt(
    `
      SELECT detallar
      FROM hesab_audit_jurnali
      WHERE oyuncu_id = $1
        AND hadise_novu = $2
      ORDER BY id DESC
      LIMIT 1
    `,
    [oyuncuId, SNAPSHOT_HADISE_NOVU]
  );

  return snapshotNeticesindenStateAl(netice);
}

async function oyunStateSnapshotiniYaz(playerId, state) {
  return await snapshotiYazSorquIle(
    async (sql, parametrler) => await sorguEt(sql, parametrler),
    playerId,
    state
  );
}

async function oyunStateSnapshotiniYazClient(client, playerId, state) {
  if (!client || typeof client.query !== "function") {
    throw new Error("Oyun state snapshot üçün PostgreSQL client yoxdur.");
  }

  return await snapshotiYazSorquIle(
    async (sql, parametrler) => await client.query(sql, parametrler),
    playerId,
    state
  );
}

async function sonOyunStateSnapshotiniAl(playerId) {
  return await snapshotiOxuSorquIle(
    async (sql, parametrler) => await sorguEt(sql, parametrler),
    playerId
  );
}

async function sonOyunStateSnapshotiniAlClient(client, playerId) {
  if (!client || typeof client.query !== "function") {
    return null;
  }

  return await snapshotiOxuSorquIle(
    async (sql, parametrler) => await client.query(sql, parametrler),
    playerId
  );
}

function snapshotiCariStateIleBirlesdir(cariState, snapshot) {
  if (
    !cariState ||
    typeof cariState !== "object" ||
    !snapshot ||
    typeof snapshot !== "object"
  ) {
    return false;
  }

  const cariPlayerId = metnAl(cariState.playerId, 128);
  const snapshotPlayerId = metnAl(snapshot.playerId, 128);

  if (
    cariPlayerId &&
    snapshotPlayerId &&
    cariPlayerId !== snapshotPlayerId
  ) {
    return false;
  }

  for (const acar of Object.keys(cariState)) {
    delete cariState[acar];
  }

  Object.assign(
    cariState,
    JSON.parse(JSON.stringify(snapshot))
  );

  if (!cariState.playerId) {
    cariState.playerId = cariPlayerId;
  }

  return true;
}

module.exports = {
  SNAPSHOT_HADISE_NOVU,
  SAXLANILAN_SNAPSHOT_SAYI,
  oyunStateSnapshotiniYaz,
  oyunStateSnapshotiniYazClient,
  sonOyunStateSnapshotiniAl,
  sonOyunStateSnapshotiniAlClient,
  snapshotiCariStateIleBirlesdir
};
