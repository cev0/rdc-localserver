"use strict";

const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");
const {
  oyuncuStateMutasiyasiniPostgresIleIcraEt
} = require("./oyun_state_mutasiya_postgres");
const {
  pvpBazaHucumStartMutasiyasiniIcraEt
} = require("./pvp_baza_hucum_start_xidmeti");
const {
  pvpBazaHucumCatmaMutasiyasiniIcraEt,
  pvpAktivHucumEmeliyyatiniTap
} = require("./pvp_baza_hucum_catma_xidmeti");
const {
  pvpDoyusSettlementiniPostgresIleIcraEt
} = require("./pvp_doyus_settlement_sistemi");
const {
  pvpBazaPreviewMesajiniEmalEt
} = require("./pvp_baza_preview_handler");
const {
  stateTeminEt
} = require("./konvoy_emeliyyat_sistemi");
const {
  yungulYaralilariBerpaEt
} = require("./doyus_xestexana_korpu");
const {
  PVP_BAZA_STATUSLARI
} = require("./pvp_baza_hedef_qaydasi");

const MESAJLAR = new Set([
  "pvp_base_attack_preview_request",
  "pvp_incoming_attacks_request",
  "pvp_base_attack_start_request",
  "pvp_base_attack_status_request",
  "pvp_base_attack_return_request"
]);

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function kopyala(v) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

function gonder(k, type, data) {
  k.send(k.ws, {
    type,
    ...data,
    serverTimeUnixMs: k.nowMs()
  });
}

function pvpCanliQaydasiniHazirla() {
  return {
    version: 1,
    pvpEnabled: true,
    attackStartEnabled: true,
    arrivalResolutionEnabled: true,
    combatResolverEnabled: true,
    atomicTwoPlayerSettlementEnabled: true,
    defenderSnapshotLockedAtArrival: true,
    attackerSnapshotLockedAtAttackStart: true,
    targetCoordinatesLockedAtAttackStart: true,
    relocatedTargetIsNotFollowed: true,
    manualReturnFromAbandonedTargetEnabled: true,
    attackerLightWoundedRecoverOnReturn: true,
    defenderLightWoundedRecoverAtBase: true,
    clientCannotSubmitBattleWinner: true,
    clientCannotSubmitCasualties: true
  };
}

function previewCavabiniAktivEt(rawPayload) {
  const payload = kopyala(rawPayload) || {};
  payload.pvpEnabled = true;

  if (payload.preview && typeof payload.preview === "object") {
    const preview = payload.preview;
    preview.pvpEnabled = true;
    preview.blockers = (Array.isArray(preview.blockers) ? preview.blockers : [])
      .filter(x => metnAl(x && x.code, 64) !== "pvp_not_enabled");

    const selectedId = metnAl(preview.selectedConvoyId, 64);
    if (!selectedId && !preview.blockers.some(x => metnAl(x && x.code, 64) === "convoy_not_selected")) {
      preview.blockers.push({
        code: "convoy_not_selected",
        message: "PvP hücumu üçün konvoy seçilməlidir."
      });
    }

    preview.canAttack = preview.blockers.length === 0;
    preview.liveRule = pvpCanliQaydasiniHazirla();
    payload.canAttack = preview.canAttack;
    payload.payloadJson = JSON.stringify(preview);
  }

  if (payload.info && typeof payload.info === "object") {
    payload.info.pvpEnabled = true;
    payload.info.liveRule = pvpCanliQaydasiniHazirla();
    payload.payloadJson = JSON.stringify(payload.info);
  }

  return payload;
}

async function kohnePreviewiCanliCavabaCevir(kontekst) {
  const tutulmus = [];
  const proxy = {
    ...kontekst,
    send(ws, payload) {
      tutulmus.push({ ws, payload: kopyala(payload) });
    }
  };

  const handled = await pvpBazaPreviewMesajiniEmalEt(proxy);
  if (!handled) return false;

  for (const item of tutulmus) {
    const payload = previewCavabiniAktivEt(item.payload);
    kontekst.send(kontekst.ws, payload);
  }
  return true;
}

function pvpGeriDonusuBaslat(state, convoyId, operationId = "", nowMs = Date.now()) {
  const operation = pvpAktivHucumEmeliyyatiniTap(state, convoyId);
  if (!operation) {
    return { success: false, deyisdi: false, message: "Aktiv PvP hücumu tapılmadı." };
  }

  const requestedId = metnAl(operationId, 220);
  const currentId = metnAl(operation.operationId, 220);
  if (requestedId && requestedId !== currentId) {
    return { success: false, deyisdi: false, blocker: "operation_mismatch", message: "PvP operationId uyğun deyil." };
  }

  const status = metnAl(operation.status, 64);
  if (status === PVP_BAZA_STATUSLARI.GERI) {
    return { success: true, deyisdi: false, alreadyReturning: true, operation: kopyala(operation) };
  }

  if (status !== PVP_BAZA_STATUSLARI.TERK_EDILMIS_HEDEFDE_KAMP) {
    return {
      success: false,
      deyisdi: false,
      blocker: "return_not_allowed",
      message: "Manual geri dönüş yalnız boşalmış hədəfdə kamp edən konvoy üçün mümkündür."
    };
  }

  const now = tamEded(nowMs) || Date.now();
  operation.status = PVP_BAZA_STATUSLARI.GERI;
  operation.returnStartedAtMs = now;
  operation.returnEndsAtMs = now + Math.max(1, tamEded(operation.travelDurationMs));
  operation.battleAllowed = false;
  operation.result = {
    ...(operation.result && typeof operation.result === "object" ? operation.result : {}),
    returnReason: "manual_return_from_abandoned_target",
    returnStartedAtMs: now
  };

  return { success: true, deyisdi: true, operation: kopyala(operation) };
}

function pvpGeriDonusuYekunlasdir(state, convoyId, operationId = "", nowMs = Date.now()) {
  const operations = stateTeminEt(state);
  const id = metnAl(convoyId, 64);
  const operation = operations.activeByConvoy[id];
  if (!operation || metnAl(operation.targetType, 32) !== "player_base") {
    return { success: true, deyisdi: false, finished: false, operation: null };
  }

  const requestedId = metnAl(operationId, 220);
  const currentId = metnAl(operation.operationId, 220);
  if (requestedId && requestedId !== currentId) {
    return { success: false, deyisdi: false, blocker: "operation_mismatch", message: "PvP operationId uyğun deyil." };
  }

  if (metnAl(operation.status, 64) !== PVP_BAZA_STATUSLARI.GERI) {
    return { success: true, deyisdi: false, finished: false, operation: kopyala(operation) };
  }

  const now = tamEded(nowMs) || Date.now();
  const returnEndsAtMs = tamEded(operation.returnEndsAtMs);
  if (returnEndsAtMs <= 0 || now < returnEndsAtMs) {
    return {
      success: true,
      deyisdi: false,
      finished: false,
      remainingMs: returnEndsAtMs > 0 ? Math.max(0, returnEndsAtMs - now) : 0,
      operation: kopyala(operation)
    };
  }

  let recovery = null;
  if (Array.isArray(operation.lightWoundedFormation) && operation.lightWoundedFormation.length > 0) {
    recovery = yungulYaralilariBerpaEt(
      state,
      id,
      operation.lightWoundedFormation,
      null,
      returnEndsAtMs
    );
    if (!recovery || recovery.success !== true) {
      return { success: false, deyisdi: false, message: "PvP yüngül yaralıları geri dönüşdə bərpa edilə bilmədi." };
    }
    operation.lightWoundedFormation = [];
  }

  const historyItem = {
    ...kopyala(operation),
    status: PVP_BAZA_STATUSLARI.BOS,
    lightWoundedRecovery: kopyala(recovery),
    finishedAtMs: returnEndsAtMs
  };
  operations.history.push(historyItem);
  operations.history = operations.history.slice(-30);
  delete operations.activeByConvoy[id];

  return {
    success: true,
    deyisdi: true,
    finished: true,
    historyItem: kopyala(historyItem),
    operation: null
  };
}

function pvpStatusMelumatiniHazirla(state, convoyId, operationId = "", nowMs = Date.now(), extra = null) {
  const id = metnAl(convoyId, 64);
  const requestedId = metnAl(operationId, 220);
  const operations = stateTeminEt(state);
  const active = operations.activeByConvoy[id] || null;
  const history = [...operations.history].reverse().find(x => {
    if (metnAl(x && x.convoyId, 64) !== id) return false;
    if (!requestedId) return true;
    return metnAl(x && x.operationId, 220) === requestedId;
  }) || null;
  const now = tamEded(nowMs) || Date.now();

  let remainingMs = 0;
  if (active) {
    const status = metnAl(active.status, 64);
    if (status === PVP_BAZA_STATUSLARI.YOLDA) remainingMs = Math.max(0, tamEded(active.arrivalAtMs) - now);
    else if (status === PVP_BAZA_STATUSLARI.GERI) remainingMs = Math.max(0, tamEded(active.returnEndsAtMs) - now);
  }

  return {
    version: 1,
    pvpEnabled: true,
    convoyId: id,
    operationId: active ? metnAl(active.operationId, 220) : requestedId,
    active: !!active,
    finished: !active && !!history,
    remainingMs,
    operation: kopyala(active),
    lastHistory: !active ? kopyala(history) : null,
    settlement: extra && extra.settlement ? kopyala(extra.settlement) : null,
    liveRule: pvpCanliQaydasiniHazirla()
  };
}

async function autentifikasiyaVeStateHazirla(kontekst, resultType) {
  const playerId = metnAl(kontekst && kontekst.ws && kontekst.ws._authedPlayerId, 128);
  if (!playerId) {
    gonder(kontekst, resultType, { success: false, pvpEnabled: true, message: "PvP üçün autentifikasiya tələb olunur." });
    return null;
  }

  if (!oyuncuStateBerpaOlunub(playerId)) {
    await oyunStateIniBerpaEt(kontekst, playerId);
  }

  return {
    playerId,
    state: kontekst.getOrCreatePlayerState(playerId)
  };
}

async function startEmeliyyatiniIcraEt(kontekst, hazir) {
  const { playerId, state } = hazir;
  const now = kontekst.nowMs();
  const netice = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
    playerId,
    state,
    async (kilidliState, trx) => pvpBazaHucumStartMutasiyasiniIcraEt(
      kilidliState,
      playerId,
      kontekst.msg,
      trx.client,
      now
    )
  );

  gonder(kontekst, "pvp_base_attack_start_result", {
    success: !!(netice && netice.success === true),
    pvpEnabled: true,
    playerId,
    requestId: netice && netice.requestId ? netice.requestId : "",
    idempotentReplay: !!(netice && netice.idempotentReplay === true),
    blocker: netice && netice.blocker ? netice.blocker : "",
    message: netice && netice.message ? netice.message : "",
    operation: netice && netice.operation ? netice.operation : null,
    rule: pvpCanliQaydasiniHazirla(),
    payloadJson: JSON.stringify(netice && netice.operation ? netice.operation : {})
  });

  if (netice && netice.success === true && netice.deyisdi === true) {
    gonder(kontekst, "state", {
      playerId,
      payloadJson: JSON.stringify(kontekst.makeClientState(state))
    });
  }
  return true;
}

async function statusEmeliyyatiniIcraEt(kontekst, hazir) {
  const { playerId, state } = hazir;
  const now = kontekst.nowMs();
  const convoyId = metnAl(kontekst && kontekst.msg && kontekst.msg.convoyId, 64);
  const operationId = metnAl(kontekst && kontekst.msg && kontekst.msg.operationId, 220);

  if (!convoyId) {
    gonder(kontekst, "pvp_base_attack_status_result", { success: false, pvpEnabled: true, playerId, message: "convoyId tələb olunur." });
    return true;
  }

  let deyisdi = false;
  let settlement = null;

  const progress = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
    playerId,
    state,
    async (kilidliState, trx) => {
      const arrival = await pvpBazaHucumCatmaMutasiyasiniIcraEt(
        kilidliState,
        playerId,
        { convoyId, operationId },
        trx.client,
        now
      );
      if (!arrival || arrival.success !== true) return arrival;

      const finish = pvpGeriDonusuYekunlasdir(kilidliState, convoyId, operationId, now);
      if (!finish.success) return finish;

      return {
        success: true,
        deyisdi: arrival.deyisdi === true || finish.deyisdi === true,
        arrival,
        finish
      };
    }
  );

  if (!progress || progress.success !== true) {
    gonder(kontekst, "pvp_base_attack_status_result", {
      success: false,
      pvpEnabled: true,
      playerId,
      blocker: progress && progress.blocker ? progress.blocker : "",
      message: progress && progress.message ? progress.message : "PvP statusu yenilənmədi."
    });
    return true;
  }
  deyisdi = progress.deyisdi === true;

  const active = pvpAktivHucumEmeliyyatiniTap(state, convoyId);
  if (
    active &&
    metnAl(active.status, 64) === PVP_BAZA_STATUSLARI.DOYUSE_HAZIR &&
    active.battleAllowed === true &&
    active.battleResolved !== true
  ) {
    const defenderId = metnAl(active.targetPlayerId || active.targetId, 128);
    if (!defenderId || defenderId === playerId) {
      throw new Error("PvP settlement üçün defender playerId düzgün deyil.");
    }

    settlement = await pvpDoyusSettlementiniPostgresIleIcraEt(
      { playerId, cariState: state },
      { playerId: defenderId, cariState: null },
      convoyId,
      active.operationId,
      now
    );
    deyisdi = deyisdi || !!(settlement && settlement.deyisdi === true);
  }

  const finishAfterBattle = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
    playerId,
    state,
    async kilidliState => pvpGeriDonusuYekunlasdir(
      kilidliState,
      convoyId,
      operationId,
      now
    )
  );
  deyisdi = deyisdi || !!(finishAfterBattle && finishAfterBattle.deyisdi === true);

  const info = pvpStatusMelumatiniHazirla(state, convoyId, operationId, now, { settlement });
  gonder(kontekst, "pvp_base_attack_status_result", {
    success: true,
    pvpEnabled: true,
    playerId,
    info,
    payloadJson: JSON.stringify(info)
  });

  if (deyisdi) {
    gonder(kontekst, "state", {
      playerId,
      payloadJson: JSON.stringify(kontekst.makeClientState(state))
    });
  }
  return true;
}

async function returnEmeliyyatiniIcraEt(kontekst, hazir) {
  const { playerId, state } = hazir;
  const now = kontekst.nowMs();
  const convoyId = metnAl(kontekst && kontekst.msg && kontekst.msg.convoyId, 64);
  const operationId = metnAl(kontekst && kontekst.msg && kontekst.msg.operationId, 220);

  const netice = await oyuncuStateMutasiyasiniPostgresIleIcraEt(
    playerId,
    state,
    async kilidliState => pvpGeriDonusuBaslat(kilidliState, convoyId, operationId, now)
  );

  gonder(kontekst, "pvp_base_attack_return_result", {
    success: !!(netice && netice.success === true),
    pvpEnabled: true,
    playerId,
    blocker: netice && netice.blocker ? netice.blocker : "",
    message: netice && netice.message ? netice.message : "",
    operation: netice && netice.operation ? netice.operation : null,
    payloadJson: JSON.stringify(netice && netice.operation ? netice.operation : {})
  });

  if (netice && netice.deyisdi === true) {
    gonder(kontekst, "state", {
      playerId,
      payloadJson: JSON.stringify(kontekst.makeClientState(state))
    });
  }
  return true;
}

async function pvpBazaLiveMesajiniEmalEt(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  if (!MESAJLAR.has(type)) return false;

  try {
    if (type === "pvp_base_attack_preview_request" || type === "pvp_incoming_attacks_request") {
      return await kohnePreviewiCanliCavabaCevir(kontekst);
    }

    const resultType = type === "pvp_base_attack_start_request"
      ? "pvp_base_attack_start_result"
      : type === "pvp_base_attack_return_request"
        ? "pvp_base_attack_return_result"
        : "pvp_base_attack_status_result";
    const hazir = await autentifikasiyaVeStateHazirla(kontekst, resultType);
    if (!hazir) return true;

    if (type === "pvp_base_attack_start_request") return await startEmeliyyatiniIcraEt(kontekst, hazir);
    if (type === "pvp_base_attack_return_request") return await returnEmeliyyatiniIcraEt(kontekst, hazir);
    return await statusEmeliyyatiniIcraEt(kontekst, hazir);
  }
  catch (xeta) {
    console.error("[PVP_BAZA_LIVE]", xeta);
    const resultType = type === "pvp_base_attack_start_request"
      ? "pvp_base_attack_start_result"
      : type === "pvp_base_attack_return_request"
        ? "pvp_base_attack_return_result"
        : "pvp_base_attack_status_result";
    gonder(kontekst, resultType, {
      success: false,
      pvpEnabled: true,
      message: "PvP əməliyyatı serverdə atomik şəkildə tamamlanmadı."
    });
    return true;
  }
}

module.exports = {
  MESAJLAR,
  pvpCanliQaydasiniHazirla,
  previewCavabiniAktivEt,
  pvpGeriDonusuBaslat,
  pvpGeriDonusuYekunlasdir,
  pvpStatusMelumatiniHazirla,
  pvpBazaLiveMesajiniEmalEt
};
