"use strict";

const {
  itkileriXestexanayaBol
} = require("./xestexana_sistemi");
const {
  konvoyQosunStateTeminEt
} = require("./konvoy_qosun_sistemi");
const {
  formasiyaStateTeminEt,
  formasiyaQosunlariniTopla
} = require("./konvoy_formasiya_sistemi");

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

function formasiyaSirasiniTemizle(raw) {
  return {
    siraId: metnAl(raw && raw.siraId, 32),
    unitId: metnAl(raw && raw.unitId, 128),
    count: tamEded(raw && raw.count)
  };
}

function itkiSiyahisiniYoxla(sentFormation, rawLosses) {
  const sent = Array.isArray(sentFormation)
    ? sentFormation.map(formasiyaSirasiniTemizle)
    : [];
  const losses = Array.isArray(rawLosses)
    ? rawLosses.map(formasiyaSirasiniTemizle).filter(x => x.siraId && x.unitId && x.count > 0)
    : [];

  const sentByRow = new Map();
  for (const row of sent) {
    if (!row.siraId) continue;
    sentByRow.set(row.siraId, row);
  }

  const seenRows = new Set();
  for (const loss of losses) {
    if (seenRows.has(loss.siraId)) {
      return { success: false, message: "Eyni formasiya sırası itki siyahısında iki dəfə göndərilib." };
    }
    seenRows.add(loss.siraId);

    const source = sentByRow.get(loss.siraId);
    if (!source || source.unitId !== loss.unitId) {
      return { success: false, message: "İtki formasiya snapshot-ına uyğun deyil." };
    }
    if (loss.count > source.count) {
      return { success: false, message: "İtki sayı göndərilmiş birlik sayından çox ola bilməz." };
    }
  }

  return { success: true, sent, losses };
}

function toplula(rawItems, field) {
  const result = {};
  for (const raw of Array.isArray(rawItems) ? rawItems : []) {
    const unitId = metnAl(raw && raw.unitId, 128);
    const count = tamEded(raw && raw[field]);
    if (!unitId || count <= 0) continue;
    result[unitId] = tamEded(result[unitId]) + count;
  }
  return result;
}

function formasiyaNeticesiniHazirla(sent, allocationItems) {
  const byRow = new Map();
  for (const item of Array.isArray(allocationItems) ? allocationItems : []) {
    byRow.set(metnAl(item && item.siraId, 32), item);
  }

  const lostFormation = [];
  const woundedFormation = [];
  const deadFormation = [];
  const returnedFormation = [];

  for (const source of sent) {
    const allocation = byRow.get(source.siraId) || null;
    const loss = allocation ? tamEded(allocation.itki) : 0;
    const wounded = allocation ? tamEded(allocation.yarali) : 0;
    const dead = allocation ? tamEded(allocation.olu) : 0;
    const returned = Math.max(0, source.count - loss);

    if (loss > 0) lostFormation.push({ siraId: source.siraId, unitId: source.unitId, count: loss });
    if (wounded > 0) woundedFormation.push({ siraId: source.siraId, unitId: source.unitId, count: wounded });
    if (dead > 0) deadFormation.push({ siraId: source.siraId, unitId: source.unitId, count: dead });

    returnedFormation.push({
      siraId: source.siraId,
      unitId: returned > 0 ? source.unitId : "",
      count: returned
    });
  }

  return {
    lostFormation,
    woundedFormation,
    deadFormation,
    returnedFormation
  };
}

function armyItkileriniTetbiqEt(state, lostTroops) {
  if (!state.army || typeof state.army !== "object") state.army = {};
  if (!state.army.troops || typeof state.army.troops !== "object") state.army.troops = {};

  for (const [unitId, rawCount] of Object.entries(lostTroops || {})) {
    const count = tamEded(rawCount);
    if (count <= 0) continue;
    state.army.troops[unitId] = Math.max(0, tamEded(state.army.troops[unitId]) - count);
  }
}

function konvoyuSagQalanlarlaYenile(state, convoyId, returnedFormation) {
  const konvoylar = konvoyQosunStateTeminEt(state);
  const id = metnAl(convoyId, 64);
  const konvoy = konvoylar.items.find(x => x && metnAl(x.konvoyId, 64) === id) || null;
  if (!konvoy) return;

  const formasiya = formasiyaStateTeminEt(konvoy);
  formasiya.siralar = returnedFormation.map(x => ({ ...x }));
  konvoy.qosunlar = formasiyaQosunlariniTopla(formasiya.siralar);
}

function raportuYenile(report, netice) {
  if (!report || typeof report !== "object") return;

  report.lostFormation = kopyala(netice.lostFormation) || [];
  report.woundedFormation = kopyala(netice.woundedFormation) || [];
  report.deadFormation = kopyala(netice.deadFormation) || [];
  report.returnedFormation = kopyala(netice.returnedFormation) || [];
  report.lostTroops = toplula(netice.allocationItems, "itki");
  report.woundedTroops = toplula(netice.allocationItems, "yarali");
  report.deadTroops = toplula(netice.allocationItems, "olu");

  const returnedTroops = {};
  for (const row of netice.returnedFormation) {
    if (!row.unitId || row.count <= 0) continue;
    returnedTroops[row.unitId] = tamEded(returnedTroops[row.unitId]) + tamEded(row.count);
  }
  report.returnedTroops = returnedTroops;

  report.lossCalculationPending = false;
  report.hospitalResolutionPending = false;
  report.hospital = kopyala(netice.tutumHesabi) || null;
}

function serverItkisiniTetbiqEt(state, convoyId, sentFormation, rawLosses, report = null) {
  const validation = itkiSiyahisiniYoxla(sentFormation, rawLosses);
  if (!validation.success) return validation;

  const allocation = itkileriXestexanayaBol(state, validation.losses);
  if (!allocation || allocation.success !== true) {
    return {
      success: false,
      message: allocation && allocation.message ? allocation.message : "Xəstəxana itkini bölə bilmədi.",
      hospital: allocation || null
    };
  }

  const formationResult = formasiyaNeticesiniHazirla(validation.sent, allocation.items);
  const lostTroops = toplula(allocation.items, "itki");

  armyItkileriniTetbiqEt(state, lostTroops);
  konvoyuSagQalanlarlaYenile(state, convoyId, formationResult.returnedFormation);

  const result = {
    success: true,
    convoyId: metnAl(convoyId, 64),
    allocationItems: allocation.items.map(x => ({ ...x })),
    umumiYarali: tamEded(allocation.umumiYarali),
    umumiOlu: tamEded(allocation.umumiOlu),
    tutumHesabi: kopyala(allocation.tutumHesabi),
    ...formationResult
  };

  raportuYenile(report, result);
  return result;
}

module.exports = {
  itkiSiyahisiniYoxla,
  serverItkisiniTetbiqEt
};
