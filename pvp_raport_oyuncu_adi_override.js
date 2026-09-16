'use strict';

/**
 * PvP döyüş raportlarında playerId əvəzinə oyunçunun real komandir adını daşıyır.
 * Mövcud playerId sahələri saxlanılır; ad ayrıca opponentCommanderName kimi əlavə olunur.
 * Modul əsas server handler-ləri yüklənməzdən əvvəl require edilməlidir.
 */

const pvpRaportModulu = require('./pvp_doyus_raport_sistemi');
const doyusRaportModulu = require('./doyus_raport_sistemi');

function metnAl(v, max = 128) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function rolAl(report) {
  const role = metnAl(report && report.pvpRole, 32).toLowerCase();
  if (role === 'attacker' || role === 'defender') return role;

  const reportId = metnAl(report && report.reportId, 220).toLowerCase();
  if (reportId.endsWith('_defender')) return 'defender';
  if (reportId.endsWith('_attacker')) return 'attacker';
  return '';
}

function pvpDir(report) {
  if (!report || typeof report !== 'object') return false;
  const battleType = metnAl(report.battleType, 32).toLowerCase();
  const enemyType = metnAl(report.enemyType, 128).toLowerCase();
  const reportId = metnAl(report.reportId, 220).toLowerCase();
  return battleType === 'pvp' || enemyType === 'player_base' || reportId.startsWith('pvp_');
}

function playerIdQisalt(raw) {
  const id = metnAl(raw, 128);
  if (!id) return 'naməlum';
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function raportuStateDeYenile(state, reportId, opponentCommanderName) {
  const id = metnAl(reportId, 220);
  const ad = metnAl(opponentCommanderName, 64);
  if (!state || !id || !ad) return;

  const items = state.doyusRaportlari && Array.isArray(state.doyusRaportlari.items)
    ? state.doyusRaportlari.items
    : [];

  const report = items.find(x => x && metnAl(x.reportId, 220) === id);
  if (report) report.opponentCommanderName = ad;
}

function raportGorunusunuYenile(report, rawReport) {
  if (!pvpDir(report)) return report;

  const ad = metnAl(
    (rawReport && rawReport.opponentCommanderName) || report.opponentCommanderName,
    64
  );
  const opponentId = metnAl(
    report.opponentPlayerId || report.enemyId || (rawReport && (rawReport.opponentPlayerId || rawReport.enemyId)),
    128
  );
  const role = rolAl(report) || rolAl(rawReport);
  const etiket = role === 'defender' ? 'Hücumçu' : 'Rəqib';
  const adVeYaId = ad || playerIdQisalt(opponentId);
  const stateId = Math.max(1, Number(report.stateId || (rawReport && rawReport.stateId)) || 1);
  const x = Number(report.x != null ? report.x : (rawReport && rawReport.x)) || 0;
  const z = Number(report.z != null ? report.z : (rawReport && rawReport.z)) || 0;

  report.opponentCommanderName = ad;
  report.enemyType = `${etiket}: ${adVeYaId} • D${stateId} X:${x} Y:${z}`;
  return report;
}

const esasIkiTerefRaportuYarat = pvpRaportModulu.pvpIkiTerefRaportlariniYarat;
if (typeof esasIkiTerefRaportuYarat === 'function') {
  pvpRaportModulu.pvpIkiTerefRaportlariniYarat = function(...args) {
    const attackerState = args[0];
    const defenderState = args[1];
    const netice = esasIkiTerefRaportuYarat.apply(this, args);

    if (!netice || netice.success !== true || netice.created !== true) {
      return netice;
    }

    const attackerAdi = metnAl(attackerState && attackerState.oyuncuAdi, 64);
    const defenderAdi = metnAl(defenderState && defenderState.oyuncuAdi, 64);

    if (netice.attackerReport && defenderAdi) {
      netice.attackerReport.opponentCommanderName = defenderAdi;
      raportuStateDeYenile(attackerState, netice.attackerReport.reportId, defenderAdi);
    }

    if (netice.defenderReport && attackerAdi) {
      netice.defenderReport.opponentCommanderName = attackerAdi;
      raportuStateDeYenile(defenderState, netice.defenderReport.reportId, attackerAdi);
    }

    return netice;
  };
}

const esasSiyahiniHazirla = doyusRaportModulu.raportSiyahisiniHazirla;
if (typeof esasSiyahiniHazirla === 'function') {
  doyusRaportModulu.raportSiyahisiniHazirla = function(state) {
    const items = esasSiyahiniHazirla.apply(this, arguments);
    const rawItems = state && state.doyusRaportlari && Array.isArray(state.doyusRaportlari.items)
      ? state.doyusRaportlari.items
      : [];

    for (const item of Array.isArray(items) ? items : []) {
      const raw = rawItems.find(x => x && metnAl(x.reportId, 220) === metnAl(item && item.reportId, 220));
      raportGorunusunuYenile(item, raw);
    }

    return items;
  };
}

const esasDetaliHazirla = doyusRaportModulu.raportDetaliHazirla;
if (typeof esasDetaliHazirla === 'function') {
  doyusRaportModulu.raportDetaliHazirla = function(state, reportId) {
    const report = esasDetaliHazirla.apply(this, arguments);
    if (!report) return report;

    const rawItems = state && state.doyusRaportlari && Array.isArray(state.doyusRaportlari.items)
      ? state.doyusRaportlari.items
      : [];
    const raw = rawItems.find(x => x && metnAl(x.reportId, 220) === metnAl(reportId, 220));
    return raportGorunusunuYenile(report, raw);
  };
}

console.log('[PVP_REPORT_NAME] Komandir adı raport inteqrasiyası aktivdir.');
