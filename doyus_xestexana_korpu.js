"use strict";

const { itkileriXestexanayaBol } = require("./xestexana_sistemi");
const { konvoyQosunStateTeminEt } = require("./konvoy_qosun_sistemi");
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

function planSirasiniTemizle(raw) {
  return {
    siraId: metnAl(raw && raw.siraId, 32),
    unitId: metnAl(raw && raw.unitId, 128),
    itki: tamEded(raw && raw.itki),
    agirYaraliNamized: tamEded(raw && raw.agirYaraliNamized),
    yungulYarali: tamEded(raw && raw.yungulYarali),
    birbasaOlu: tamEded(raw && raw.birbasaOlu)
  };
}

function itkiPlaniniYoxla(sentFormation, rawPlan) {
  const sent = Array.isArray(sentFormation)
    ? sentFormation.map(formasiyaSirasiniTemizle).filter(x => x.siraId && x.unitId && x.count > 0)
    : [];
  const rows = Array.isArray(rawPlan && rawPlan.siralar)
    ? rawPlan.siralar.map(planSirasiniTemizle).filter(x => x.siraId && x.unitId)
    : [];

  const sentByRow = new Map(sent.map(x => [x.siraId, x]));
  const seen = new Set();

  for (const row of rows) {
    if (seen.has(row.siraId)) {
      return { success: false, message: "Eyni formasiya sırası itki planında iki dəfə ola bilməz." };
    }
    seen.add(row.siraId);

    const source = sentByRow.get(row.siraId);
    if (!source || source.unitId !== row.unitId) {
      return { success: false, message: "Server itki planı formasiya snapshot-ına uyğun deyil." };
    }

    const split = row.agirYaraliNamized + row.yungulYarali + row.birbasaOlu;
    if (row.itki !== split || row.itki > source.count) {
      return { success: false, message: "Server itki planında saylar uyğun deyil." };
    }
  }

  return { success: true, sent, rows };
}

function toplula(rawItems, field = "count") {
  const result = {};
  for (const raw of Array.isArray(rawItems) ? rawItems : []) {
    const unitId = metnAl(raw && raw.unitId, 128);
    const count = tamEded(raw && raw[field]);
    if (!unitId || count <= 0) continue;
    result[unitId] = tamEded(result[unitId]) + count;
  }
  return result;
}

function armyAzalt(state, items) {
  if (!state.army || typeof state.army !== "object") state.army = {};
  if (!state.army.troops || typeof state.army.troops !== "object") state.army.troops = {};
  for (const [unitId, count] of Object.entries(toplula(items))) {
    state.army.troops[unitId] = Math.max(0, tamEded(state.army.troops[unitId]) - tamEded(count));
  }
}

function armyArtir(state, items) {
  if (!state.army || typeof state.army !== "object") state.army = {};
  if (!state.army.troops || typeof state.army.troops !== "object") state.army.troops = {};
  for (const [unitId, count] of Object.entries(toplula(items))) {
    state.army.troops[unitId] = tamEded(state.army.troops[unitId]) + tamEded(count);
  }
}

function konvoyuTap(state, convoyId) {
  const konvoylar = konvoyQosunStateTeminEt(state);
  const id = metnAl(convoyId, 64);
  return konvoylar.items.find(x => x && metnAl(x.konvoyId, 64) === id) || null;
}

function konvoyFormasiyasiniYaz(state, convoyId, rows) {
  const konvoy = konvoyuTap(state, convoyId);
  if (!konvoy) return false;
  const formasiya = formasiyaStateTeminEt(konvoy);
  formasiya.siralar = Array.isArray(rows) ? rows.map(formasiyaSirasiniTemizle) : [];
  konvoy.qosunlar = formasiyaQosunlariniTopla(formasiya.siralar);
  return true;
}

function reportTotals(rows) {
  return (Array.isArray(rows) ? rows : []).reduce((cem, x) => cem + tamEded(x && x.count), 0);
}

function raportuYenile(report, result) {
  if (!report || typeof report !== "object") return;

  report.casualtyVersion = 2;
  report.casualtyPlan = kopyala(result.casualtyPlan) || null;
  report.lostFormation = kopyala(result.lostFormation) || [];
  report.heavyWoundedFormation = kopyala(result.heavyWoundedFormation) || [];
  report.lightWoundedFormation = kopyala(result.lightWoundedFormation) || [];
  report.directDeadFormation = kopyala(result.directDeadFormation) || [];
  report.hospitalOverflowDeadFormation = kopyala(result.hospitalOverflowDeadFormation) || [];
  report.deadFormation = kopyala(result.deadFormation) || [];
  report.survivedFormation = kopyala(result.survivedFormation) || [];
  report.returnedFormation = kopyala(result.survivedFormation) || [];

  report.woundedFormation = kopyala(result.heavyWoundedFormation) || [];
  report.lostTroops = toplula(result.lostFormation);
  report.woundedTroops = toplula(result.heavyWoundedFormation);
  report.heavyWoundedTroops = toplula(result.heavyWoundedFormation);
  report.lightWoundedTroops = toplula(result.lightWoundedFormation);
  report.directDeadTroops = toplula(result.directDeadFormation);
  report.hospitalOverflowDeadTroops = toplula(result.hospitalOverflowDeadFormation);
  report.deadTroops = toplula(result.deadFormation);
  report.survivedTroops = toplula(result.survivedFormation);
  report.returnedTroops = toplula(result.survivedFormation);

  report.casualtySummary = {
    sent: result.sentCount,
    totalLoss: result.totalLoss,
    directDead: reportTotals(result.directDeadFormation),
    hospitalOverflowDead: reportTotals(result.hospitalOverflowDeadFormation),
    deadTotal: reportTotals(result.deadFormation),
    heavyWounded: reportTotals(result.heavyWoundedFormation),
    lightWounded: reportTotals(result.lightWoundedFormation),
    survived: reportTotals(result.survivedFormation),
    lightWoundedPendingReturn: reportTotals(result.lightWoundedFormation)
  };

  report.lossCalculationPending = false;
  report.hospitalResolutionPending = false;
  report.lightWoundedRecoveryPending = result.lightWoundedFormation.length > 0;
  report.hospital = kopyala(result.hospital) || null;
}

function serverItkiPlaniniTetbiqEt(state, convoyId, sentFormation, rawPlan, report = null) {
  const validation = itkiPlaniniYoxla(sentFormation, rawPlan);
  if (!validation.success) return validation;

  const heavyCandidates = validation.rows
    .filter(x => x.agirYaraliNamized > 0)
    .map(x => ({ siraId: x.siraId, unitId: x.unitId, count: x.agirYaraliNamized }));
  const hospital = itkileriXestexanayaBol(state, heavyCandidates);
  if (!hospital || hospital.success !== true) {
    return { success: false, message: "Xəstəxana itkini bölə bilmədi." };
  }

  const hospitalByRow = new Map((hospital.items || []).map(x => [metnAl(x.siraId, 32), x]));
  const planByRow = new Map(validation.rows.map(x => [x.siraId, x]));

  const lostFormation = [];
  const heavyWoundedFormation = [];
  const lightWoundedFormation = [];
  const directDeadFormation = [];
  const hospitalOverflowDeadFormation = [];
  const deadFormation = [];
  const survivedFormation = [];

  for (const source of validation.sent) {
    const plan = planByRow.get(source.siraId) || {
      itki: 0,
      agirYaraliNamized: 0,
      yungulYarali: 0,
      birbasaOlu: 0
    };
    const hosp = hospitalByRow.get(source.siraId) || { yarali: 0, xestexanayaQebul: 0, tutumAsimiOlum: 0 };

    const totalLoss = tamEded(plan.itki);
    const heavy = tamEded(hosp.xestexanayaQebul || hosp.yarali);
    const light = tamEded(plan.yungulYarali);
    const directDead = tamEded(plan.birbasaOlu);
    const overflowDead = tamEded(hosp.tutumAsimiOlum);
    const dead = directDead + overflowDead;
    const survived = Math.max(0, source.count - totalLoss);

    if (totalLoss > 0) lostFormation.push({ siraId: source.siraId, unitId: source.unitId, count: totalLoss });
    if (heavy > 0) heavyWoundedFormation.push({ siraId: source.siraId, unitId: source.unitId, count: heavy });
    if (light > 0) lightWoundedFormation.push({ siraId: source.siraId, unitId: source.unitId, count: light });
    if (directDead > 0) directDeadFormation.push({ siraId: source.siraId, unitId: source.unitId, count: directDead });
    if (overflowDead > 0) hospitalOverflowDeadFormation.push({ siraId: source.siraId, unitId: source.unitId, count: overflowDead });
    if (dead > 0) deadFormation.push({ siraId: source.siraId, unitId: source.unitId, count: dead });

    survivedFormation.push({
      siraId: source.siraId,
      unitId: survived > 0 ? source.unitId : "",
      count: survived
    });
  }

  armyAzalt(state, lostFormation);
  konvoyFormasiyasiniYaz(state, convoyId, survivedFormation);

  const result = {
    success: true,
    convoyId: metnAl(convoyId, 64),
    sentCount: validation.sent.reduce((cem, x) => cem + x.count, 0),
    totalLoss: lostFormation.reduce((cem, x) => cem + x.count, 0),
    casualtyPlan: kopyala(rawPlan),
    hospital: kopyala(hospital.tutumHesabi),
    lostFormation,
    heavyWoundedFormation,
    lightWoundedFormation,
    directDeadFormation,
    hospitalOverflowDeadFormation,
    deadFormation,
    survivedFormation
  };

  raportuYenile(report, result);
  return result;
}

function yungulYaralilariBerpaEt(state, convoyId, rawLightFormation, report = null, nowMs = Date.now()) {
  const light = Array.isArray(rawLightFormation)
    ? rawLightFormation.map(formasiyaSirasiniTemizle).filter(x => x.siraId && x.unitId && x.count > 0)
    : [];
  if (light.length <= 0) return { success: true, recoveredCount: 0, finalFormation: [] };

  armyArtir(state, light);

  const konvoy = konvoyuTap(state, convoyId);
  const finalRows = [];
  if (konvoy) {
    const formasiya = formasiyaStateTeminEt(konvoy);
    const current = Array.isArray(formasiya.siralar) ? formasiya.siralar.map(formasiyaSirasiniTemizle) : [];
    const lightByRow = new Map(light.map(x => [x.siraId, x]));
    const seen = new Set();

    for (const row of current) {
      const add = lightByRow.get(row.siraId);
      if (add && add.unitId === row.unitId) {
        row.count += add.count;
        seen.add(row.siraId);
      }
      finalRows.push(row);
    }
    for (const row of light) {
      if (!seen.has(row.siraId)) finalRows.push({ ...row });
    }
    konvoyFormasiyasiniYaz(state, convoyId, finalRows);
  }

  if (report && typeof report === "object") {
    report.lightWoundedRecoveryPending = false;
    report.lightWoundedRecoveredAtMs = tamEded(nowMs) || Date.now();
    report.returnedFormation = finalRows.map(x => ({ ...x }));
    report.returnedTroops = toplula(finalRows);
    if (report.casualtySummary && typeof report.casualtySummary === "object") {
      report.casualtySummary.lightWoundedPendingReturn = 0;
      report.casualtySummary.finalActiveAfterReturn = reportTotals(finalRows);
    }
  }

  return {
    success: true,
    recoveredCount: light.reduce((cem, x) => cem + x.count, 0),
    finalFormation: finalRows
  };
}

function serverItkisiniTetbiqEt(state, convoyId, sentFormation, rawLosses, report = null) {
  const rows = Array.isArray(rawLosses)
    ? rawLosses.map(x => ({
        siraId: metnAl(x && x.siraId, 32),
        unitId: metnAl(x && x.unitId, 128),
        itki: tamEded(x && x.count),
        agirYaraliNamized: tamEded(x && x.count),
        yungulYarali: 0,
        birbasaOlu: 0
      }))
    : [];
  return serverItkiPlaniniTetbiqEt(state, convoyId, sentFormation, { version: 0, siralar: rows }, report);
}

module.exports = {
  itkiPlaniniYoxla,
  serverItkiPlaniniTetbiqEt,
  yungulYaralilariBerpaEt,
  serverItkisiniTetbiqEt
};
