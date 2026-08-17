"use strict";

const qosunTelimi = require("./qosun_telimi_sistemi");
const {
  INKISAF_EFFEKT_NOVU,
  binaUcunInkIsafModifikatorlariniHesabla
} = require("./qehreman_inkisaf_sistemi");

function reqemAl(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function kopyala(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function telimMuddetiniInkIsaflaHesabla(baseDurationMs, technologySpeedPct, developmentSpeedPct) {
  const baseMs = Math.max(0, Math.round(reqemAl(baseDurationMs)));
  const texnologiyaFaizi = Math.max(0, reqemAl(technologySpeedPct));
  const inkisafFaizi = Math.max(0, reqemAl(developmentSpeedPct));
  const umumiSuretFaizi = texnologiyaFaizi + inkisafFaizi;

  if (baseMs <= 0 || umumiSuretFaizi <= 0) {
    return {
      baseDurationMs: baseMs,
      effectiveDurationMs: baseMs,
      technologySpeedPct: texnologiyaFaizi,
      developmentSpeedPct: inkisafFaizi,
      totalSpeedPct: umumiSuretFaizi
    };
  }

  return {
    baseDurationMs: baseMs,
    effectiveDurationMs: Math.max(1000, Math.round(baseMs / (1 + (umumiSuretFaizi / 100)))),
    technologySpeedPct: texnologiyaFaizi,
    developmentSpeedPct: inkisafFaizi,
    totalSpeedPct: umumiSuretFaizi
  };
}

function binaUcunTelimInkIsafiniAl(state, buildingInstanceId) {
  const modifier = binaUcunInkIsafModifikatorlariniHesabla(state, buildingInstanceId);
  const developmentSpeedPct = Math.max(
    0,
    reqemAl(modifier && modifier.totals && modifier.totals[INKISAF_EFFEKT_NOVU.TELIM_SURETI_FAIZ])
  );

  const effects = Array.isArray(modifier && modifier.effects)
    ? modifier.effects.filter(x => x && x.type === INKISAF_EFFEKT_NOVU.TELIM_SURETI_FAIZ)
    : [];

  return {
    developmentSpeedPct,
    effects: kopyala(effects)
  };
}

function previeweInkIsafTetbiqEt(state, preview) {
  if (!preview || preview.success !== true || !preview.timeInfo) return preview;

  const inkisaf = binaUcunTelimInkIsafiniAl(state, preview.buildingInstanceId);
  const muddet = telimMuddetiniInkIsaflaHesabla(
    preview.timeInfo.baseDurationMs,
    preview.timeInfo.speedPct,
    inkisaf.developmentSpeedPct
  );

  preview.timeInfo = {
    ...preview.timeInfo,
    finalDurationMs: muddet.effectiveDurationMs,
    developmentSpeedPct: muddet.developmentSpeedPct,
    totalSpeedPct: muddet.totalSpeedPct,
    developmentEffects: inkisaf.effects
  };

  return preview;
}

const esasPreview = qosunTelimi.qosunTelimOnBaxisiniHazirla;
const esasBaslat = qosunTelimi.qosunTeliminiBaslat;

qosunTelimi.qosunTelimOnBaxisiniHazirla = function(state, buildingInstanceId, unitId, rawCount) {
  const preview = esasPreview(state, buildingInstanceId, unitId, rawCount);
  return previeweInkIsafTetbiqEt(state, preview);
};

qosunTelimi.qosunTeliminiBaslat = function(state, buildingInstanceId, unitId, rawCount, nowMs = Date.now()) {
  const result = esasBaslat(state, buildingInstanceId, unitId, rawCount, nowMs);
  if (!result || result.success !== true || !result.queue) return result;

  const inkisaf = binaUcunTelimInkIsafiniAl(state, result.queue.buildingInstanceId);
  const muddet = telimMuddetiniInkIsaflaHesabla(
    result.queue.baseDurationMs,
    result.queue.trainingSpeedPct,
    inkisaf.developmentSpeedPct
  );

  const startTimeMs = Math.max(0, Math.trunc(reqemAl(result.queue.startTimeMs)));
  result.queue.durationMs = muddet.effectiveDurationMs;
  result.queue.finishTimeMs = startTimeMs + muddet.effectiveDurationMs;
  result.queue.developmentTrainingSpeedPct = muddet.developmentSpeedPct;
  result.queue.totalTrainingSpeedPct = muddet.totalSpeedPct;
  result.queue.developmentEffects = inkisaf.effects;
  result.durationMs = muddet.effectiveDurationMs;

  if (
    state && state.army && state.army.trainingQueues &&
    result.queue.buildingInstanceId && state.army.trainingQueues[result.queue.buildingInstanceId]
  ) {
    state.army.trainingQueues[result.queue.buildingInstanceId] = kopyala(result.queue);
  }

  if (result.preview) {
    result.preview = previeweInkIsafTetbiqEt(state, result.preview);
  }

  return result;
};

module.exports = {
  telimMuddetiniInkIsaflaHesabla,
  binaUcunTelimInkIsafiniAl,
  previeweInkIsafTetbiqEt
};
