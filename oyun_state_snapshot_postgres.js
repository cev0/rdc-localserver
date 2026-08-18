"use strict";

const {
  sorguEt
} = require("./verilenler_bazasi");

const SNAPSHOT_HADISE_NOVU = "oyun_state_snapshot_v1";
const SAXLANILAN_SNAPSHOT_SAYI = 3;

// Bu sahələr yalnız işləyən Node prosesi üçün runtime cache-dir.
// Onları PostgreSQL snapshot-a yazmaq olmaz.
// Məsələn Set JSON.stringify zamanı {} olur və restore-dan sonra
// yol A* sistemi .has(...) çağıranda serveri çökdürə bilər.
const RUNTIME_CACHE_ACARLARI = new Set([
  "cachedBlockedCells"
]);

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function runtimeCacheleriniSil(state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return state;
  }

  for (const acar of RUNTIME_CACHE_ACARLARI) {
    if (Object.prototype.hasOwnProperty.call(state, acar)) {
      delete state[acar];
    }
  }

  return state;
}

function snapshotUcunKopyala(state) {
  if (!state || typeof state !== "object") {
    return null;
  }

  // Runtime cache-lər serializasiya olunmadan birbaşa buraxılır.
  // Beləliklə Set -> {} korlanması snapshot-a düşmür.
  const json = JSON.stringify(
    state,
    (acar, deyer) => RUNTIME_CACHE_ACARLARI.has(acar) ? undefined : deyer
  );

  const kopya = JSON.parse(json);
  return runtimeCacheleriniSil(kopya);
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

  // Köhnə snapshot-larda cachedBlockedCells artıq {} kimi saxlanmış ola bilər.
  // Restore-dan əvvəl onu silirik ki server növbəti yol hesabında cache-i
  // düzgün Set kimi yenidən qursun.
  const kopya = JSON.parse(JSON.stringify(state));
  return runtimeCacheleriniSil(kopya);
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

  const temizSnapshot = snapshotUcunKopyala(snapshot);

  Object.assign(
    cariState,
    temizSnapshot || {}
  );

  // Cari RAM state-də də runtime cache qalmamalıdır.
  // Yol sistemi lazım olanda onu yenidən Set kimi yaradacaq.
  runtimeCacheleriniSil(cariState);

  if (!cariState.playerId) {
    cariState.playerId = cariPlayerId;
  }

  return true;
}

module.exports = {
  SNAPSHOT_HADISE_NOVU,
  SAXLANILAN_SNAPSHOT_SAYI,
  runtimeCacheleriniSil,
  snapshotUcunKopyala,
  oyunStateSnapshotiniYaz,
  oyunStateSnapshotiniYazClient,
  sonOyunStateSnapshotiniAl,
  sonOyunStateSnapshotiniAlClient,
  snapshotiCariStateIleBirlesdir
};