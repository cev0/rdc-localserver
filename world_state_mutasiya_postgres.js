"use strict";

const { proqramHovuzunuAl } = require("./verilenler_bazasi");
const {
  catismayanDefaultlariElaveEt,
  postgresOyuncuKilidiniAl
} = require("./oyun_state_mutasiya_postgres");
const {
  oyunStateSnapshotiniYazClient,
  sonOyunStateSnapshotiniAlClient,
  snapshotiCariStateIleBirlesdir
} = require("./oyun_state_snapshot_postgres");
const {
  worldStateMutationKilidiniAl
} = require("./world_state_transaction_lock");

function metnAl(value, max = 128) {
  return typeof value === "string"
    ? value.trim().slice(0, max).toLowerCase()
    : "";
}

function kopyala(value) {
  return value == null ? null : JSON.parse(JSON.stringify(value));
}

function sadeObyektdir(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function worldStateIdAl(state) {
  const value = Number(
    state && state.worldPlacement && state.worldPlacement.stateId
  );
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function isStateHazirla(cariState, sonSnapshot, playerId) {
  const cari = kopyala(cariState) || {};
  const snapshot = kopyala(sonSnapshot);
  const isState =
    snapshot && sadeObyektdir(snapshot)
      ? snapshot
      : cari;

  catismayanDefaultlariElaveEt(isState, cari);

  if (!isState.playerId) {
    isState.playerId = playerId;
  }

  return isState;
}

async function worldStateOyuncuMutasiyasiniPostgresIleIcraEt(
  playerId,
  cariState,
  emeliyyat,
  secimler = null
) {
  const oyuncuId = metnAl(playerId, 128);

  if (!oyuncuId) {
    throw new Error("World state mutation üçün playerId yoxdur.");
  }
  if (!cariState || typeof cariState !== "object" || Array.isArray(cariState)) {
    throw new Error("World state mutation üçün cari player state yoxdur.");
  }
  if (typeof emeliyyat !== "function") {
    throw new Error("World state mutation əməliyyatı yoxdur.");
  }

  const options = secimler && typeof secimler === "object" ? secimler : {};
  const hovuz = options.hovuz || proqramHovuzunuAl();

  if (!hovuz || typeof hovuz.connect !== "function") {
    throw new Error("World state mutation üçün PostgreSQL hovuzu yoxdur.");
  }

  const stateLockFn =
    typeof options.worldStateLockFn === "function"
      ? options.worldStateLockFn
      : worldStateMutationKilidiniAl;
  const playerLockFn =
    typeof options.playerLockFn === "function"
      ? options.playerLockFn
      : postgresOyuncuKilidiniAl;
  const snapshotReadFn =
    typeof options.snapshotReadFn === "function"
      ? options.snapshotReadFn
      : sonOyunStateSnapshotiniAlClient;
  const snapshotWriteFn =
    typeof options.snapshotWriteFn === "function"
      ? options.snapshotWriteFn
      : oyunStateSnapshotiniYazClient;

  const maxAttempts = Math.max(
    1,
    Math.min(5, Math.trunc(Number(options.maxStateResolveAttempts) || 3))
  );

  let targetStateId = worldStateIdAl(cariState);

  if (
    !targetStateId &&
    Number.isInteger(Number(options.stateId)) &&
    Number(options.stateId) > 0
  ) {
    targetStateId = Number(options.stateId);
  }

  if (!targetStateId) {
    throw new Error("World state mutation üçün stateId yoxdur.");
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const client = await hovuz.connect();
    let transactionFinished = false;
    let isState = null;
    let cavab;

    try {
      await client.query("BEGIN");

      // Shared-world lock sırası həmişə: Dövlət -> oyunçu.
      await stateLockFn(client, targetStateId);
      await playerLockFn(client, oyuncuId);

      const sonSnapshot = await snapshotReadFn(client, oyuncuId);
      isState = isStateHazirla(cariState, sonSnapshot, oyuncuId);

      const snapshotPlayerId = metnAl(isState.playerId, 128);
      if (snapshotPlayerId && snapshotPlayerId !== oyuncuId) {
        throw new Error(
          "World state mutation snapshot playerId uyğunsuzluğu aşkarlandı."
        );
      }

      const authoritativeStateId = worldStateIdAl(isState);
      if (!authoritativeStateId) {
        throw new Error(
          "World state mutation authoritative stateId tapılmadı."
        );
      }

      if (authoritativeStateId !== targetStateId) {
        await client.query("ROLLBACK");
        transactionFinished = true;
        targetStateId = authoritativeStateId;
        continue;
      }

      cavab = await emeliyyat(isState, {
        client,
        playerId: oyuncuId,
        stateId: targetStateId,
        sonSnapshotVar: !!sonSnapshot,
        worldStateLockHeld: true
      });

      if (cavab && cavab.deyisdi === true) {
        await snapshotWriteFn(client, oyuncuId, isState);
      }

      const ramYoxlamaState = kopyala(cariState);
      if (!snapshotiCariStateIleBirlesdir(ramYoxlamaState, isState)) {
        throw new Error(
          "World state mutation commit-dən əvvəl RAM uyğunluğu təsdiqlənmədi."
        );
      }

      await client.query("COMMIT");
      transactionFinished = true;
    } catch (error) {
      if (!transactionFinished) {
        try {
          await client.query("ROLLBACK");
        } catch (_) {}
      }
      throw error;
    } finally {
      if (client && typeof client.release === "function") {
        client.release();
      }
    }

    if (transactionFinished && isState) {
      const birlesdi = snapshotiCariStateIleBirlesdir(cariState, isState);

      if (!birlesdi) {
        console.error(
          "[WORLD_STATE_MUTASIYA_RAM_SYNC] Commit uğurludur, RAM merge alınmadı.",
          { playerId: oyuncuId, stateId: targetStateId }
        );
      }

      return cavab;
    }
  }

  throw new Error("World state mutation stateId sabitləşmədi.");
}

module.exports = {
  worldStateIdAl,
  worldStateOyuncuMutasiyasiniPostgresIleIcraEt
};
