"use strict";

const { proqramHovuzunuAl } = require("./verilenler_bazasi");
const {
  sonOyunStateSnapshotiniAlClient,
  oyunStateSnapshotiniYazClient
} = require("./oyun_state_snapshot_postgres");
const { postgresOyuncuKilidiniAl } = require("./oyun_state_mutasiya_postgres");
const { bazaYerdeyismeKonvoylariniGeriCagir } = require("./baza_yerdeyisme_konvoy_sistemi");
const {
  oyuncuKonvoylariniSinxronEtClient
} = require("./dovlet_konvoy_runtime_postgres");

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function dovletIdAl(state) {
  const n =
    Number(
      state &&
      state.worldPlacement &&
      state.worldPlacement.stateId
    );

  return Number.isFinite(n) &&
    Math.trunc(n) > 0
      ? Math.trunc(n)
      : 1;
}

function aktivEmeliyyatlariAl(state) {
  const active =
    state &&
    state.konvoyEmeliyyatlari &&
    state.konvoyEmeliyyatlari
      .activeByConvoy;

  return active &&
    typeof active === "object" &&
    !Array.isArray(active)
      ? active
      : {};
}

async function pvpZeroingKonvoyRecalliniPostCommitIcraEt(
  defenderPlayerId,
  nowMs = Date.now(),
  secimler = null
) {
  const playerId = metnAl(defenderPlayerId, 128);
  if (!playerId) throw new Error("PvP zeroing convoy recall üçün defender playerId tələb olunur.");

  const hovuz = secimler && secimler.hovuz ? secimler.hovuz : proqramHovuzunuAl();
  const recallFn = secimler && typeof secimler.recallFn === "function"
    ? secimler.recallFn
    : bazaYerdeyismeKonvoylariniGeriCagir;
  const snapshotAl = secimler && typeof secimler.snapshotAl === "function"
    ? secimler.snapshotAl
    : sonOyunStateSnapshotiniAlClient;
  const snapshotYaz = secimler && typeof secimler.snapshotYaz === "function"
    ? secimler.snapshotYaz
    : oyunStateSnapshotiniYazClient;
  const lockFn = secimler && typeof secimler.lockFn === "function"
    ? secimler.lockFn
    : postgresOyuncuKilidiniAl;
  const sharedSyncFn =
    secimler &&
    typeof secimler.sharedSyncFn ===
      "function"
      ? secimler.sharedSyncFn
      : oyuncuKonvoylariniSinxronEtClient;

  if (!hovuz || typeof hovuz.connect !== "function") {
    throw new Error("PvP zeroing convoy recall üçün PostgreSQL hovuzu yoxdur.");
  }

  const client = await hovuz.connect();
  let netice = null;
  try {
    await client.query("BEGIN");
    await lockFn(client, playerId);

    const snapshot = await snapshotAl(client, playerId);
    if (!snapshot || typeof snapshot !== "object") {
      throw new Error("PvP zeroing convoy recall üçün defender snapshot tapılmadı.");
    }

    if (!snapshot.pvpCity || snapshot.pvpCity.convoyRecallPending !== true) {
      await client.query("COMMIT");
      return {
        success: true,
        deyisdi: false,
        alreadyCompleted: true,
        playerId
      };
    }

    const isState = kopyala(snapshot);
    const recall = await recallFn(isState, playerId, nowMs);
    if (!recall || recall.success !== true) {
      throw new Error("PvP zeroing sonrası konvoy recall tamamlanmadı.");
    }

    if (!isState.pvpCity || typeof isState.pvpCity !== "object") isState.pvpCity = {};
    isState.pvpCity.convoyRecallPending = false;
    isState.pvpCity.lastConvoyRecallAtMs = Number(nowMs) || Date.now();
    isState.pvpCity.lastConvoyRecallCount = Number(recall.recalledCount) || 0;

    const sharedSync =
      await sharedSyncFn(
        client,
        dovletIdAl(isState),
        playerId,
        aktivEmeliyyatlariAl(
          isState
        ),
        nowMs
      );

    if (
      !sharedSync ||
      sharedSync.success !== true
    ) {
      throw new Error(
        sharedSync &&
        sharedSync.message
          ? sharedSync.message
          : "PvP zeroing sonrası shared convoy projection sinxron edilə bilmədi."
      );
    }

    await snapshotYaz(client, playerId, isState);
    await client.query("COMMIT");

    netice = {
      success: true,
      deyisdi: true,
      alreadyCompleted: false,
      playerId,
      recalledCount: Number(recall.recalledCount) || 0,
      stateId:
        dovletIdAl(isState),
      recall: kopyala(recall),
      sharedConvoySync:
        kopyala(sharedSync)
    };
  }
  catch (xeta) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw xeta;
  }
  finally {
    if (client && typeof client.release === "function") client.release();
  }

  return netice;
}

module.exports = {
  pvpZeroingKonvoyRecalliniPostCommitIcraEt
};
