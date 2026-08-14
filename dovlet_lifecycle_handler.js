"use strict";

const DOVR_MS = 60 * 24 * 60 * 60 * 1000;

function releaseMsAl() {
  const raw = String(process.env.PLAY_MARKET_RELEASE_TARIXI || "").trim();
  if (!raw) return 0;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

function lifecycleInfo(now = Date.now()) {
  const releaseAtMs = releaseMsAl();
  if (!releaseAtMs) {
    return {
      releaseConfigured: false,
      periodDays: 60,
      calculatedActiveStateId: 1,
      releaseAtMs: 0,
      currentPeriodStartMs: 0,
      nextStateOpensAtMs: 0
    };
  }

  const elapsed = Math.max(0, now - releaseAtMs);
  const periodIndex = Math.floor(elapsed / DOVR_MS);
  const currentPeriodStartMs = releaseAtMs + periodIndex * DOVR_MS;
  return {
    releaseConfigured: true,
    periodDays: 60,
    calculatedActiveStateId: periodIndex + 1,
    releaseAtMs,
    currentPeriodStartMs,
    nextStateOpensAtMs: currentPeriodStartMs + DOVR_MS
  };
}

async function dovletLifecycleMesajiniEmalEt(kontekst) {
  const type = String(kontekst && kontekst.type || "").trim().toLowerCase();
  if (type !== "state_lifecycle_info_request") return false;
  const info = lifecycleInfo(kontekst.nowMs());
  kontekst.send(kontekst.ws, {
    type: "state_lifecycle_info_result",
    success: true,
    info,
    payloadJson: JSON.stringify(info),
    serverTimeUnixMs: kontekst.nowMs()
  });
  return true;
}

module.exports = { lifecycleInfo, dovletLifecycleMesajiniEmalEt };
