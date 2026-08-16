"use strict";

const {
  qosunDoyusMelumatiniAl,
  qosunDoyusStatlariniHesabla
} = require("./qosun_doyus_stat_sistemi");
const {
  aktivSiraEkspozisiyalariniHazirla,
  formasiyaDoyusMelumatiniHazirla,
  siraSirasi,
  unitRolunuAl
} = require("./doyus_formasiya_sistemi");

const ITKI_POLICY = Object.freeze({
  NORMAL: "normal",
  DEATH_ZONE: "death_zone"
});

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function musbetEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function faizEnv(ad, fallback) {
  const n = Number(process.env[ad]);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, Number(v) || 0));
}

function clamp01(v) {
  return clamp(v, 0, 1);
}

function lerp(a, b, t) {
  return a + ((b - a) * clamp01(t));
}

function yuvarlaqla(v, reqem = 4) {
  const faktor = Math.pow(10, reqem);
  return Math.round((musbetEded(v) + Number.EPSILON) * faktor) / faktor;
}

function dovusItkiKonfiqi() {
  return {
    qelebeMinimumItkiFaizi: faizEnv("DOYUS_QELEBE_MIN_ITKI_FAIZ", 2),
    qelebeMaksimumItkiFaizi: faizEnv("DOYUS_QELEBE_MAX_ITKI_FAIZ", 30),
    meglubiyyetMinimumItkiFaizi: faizEnv("DOYUS_MEGLUBIYYET_MIN_ITKI_FAIZ", 30),
    meglubiyyetMaksimumItkiFaizi: faizEnv("DOYUS_MEGLUBIYYET_MAX_ITKI_FAIZ", 80),
    agirYaraliFaizi: faizEnv("DOYUS_AGIR_YARALI_FAIZ", 60),
    yungulYaraliFaizi: faizEnv("DOYUS_YUNGUL_YARALI_FAIZ", 20),
    mudafieModifierMinimum: 0.8,
    mudafieModifierMaksimum: 1.2,
    siraRiskMinimum: 0.7,
    siraRiskMaksimum: 1.3
  };
}

function formasiyaTemizle(raw) {
  return Array.isArray(raw)
    ? raw.map(x => ({
        siraId: metnAl(x && x.siraId, 32),
        unitId: metnAl(x && x.unitId, 128),
        count: tamEded(x && x.count)
      })).filter(x => x.siraId && x.unitId && x.count > 0)
    : [];
}

function umumiEsgerSayiniAl(formasiya) {
  return formasiyaTemizle(formasiya).reduce((cem, x) => cem + x.count, 0);
}

function formasiyaQosunSnapshotiniHazirla(formasiya) {
  const troops = {};
  for (const row of formasiyaTemizle(formasiya)) {
    troops[row.unitId] = (troops[row.unitId] || 0) + row.count;
  }
  return troops;
}

function dayaniqliliqPayiniHesabla(stats) {
  const attack = musbetEded(stats && stats.totalAttack);
  const defense = musbetEded(stats && stats.totalDefense);
  const hp = musbetEded(stats && stats.totalHp);
  const cem = attack + defense + hp;
  if (cem <= 0) return 0.5;
  return clamp01((defense + hp) / cem);
}

function mudafieModifieriniHesabla(stats, cfg = dovusItkiKonfiqi()) {
  const pay = dayaniqliliqPayiniHesabla(stats);
  const raw = 1 + ((0.5 - pay) * 0.8);
  return clamp(raw, cfg.mudafieModifierMinimum, cfg.mudafieModifierMaksimum);
}

function bazaItkiFaiziniHesabla(playerPower, enemyPower, victory, cfg = dovusItkiKonfiqi()) {
  const p = Math.max(0.0001, musbetEded(playerPower));
  const e = Math.max(0.0001, musbetEded(enemyPower));

  if (victory) {
    const yaxinliq = Math.pow(clamp01(e / p), 1.15);
    return lerp(cfg.qelebeMinimumItkiFaizi, cfg.qelebeMaksimumItkiFaizi, yaxinliq);
  }

  const yaxinliq = clamp01(p / e);
  return lerp(cfg.meglubiyyetMaksimumItkiFaizi, cfg.meglubiyyetMinimumItkiFaizi, yaxinliq);
}

function itkiFaiziniHesabla(playerPower, enemyPower, victory, cfg = dovusItkiKonfiqi(), combatStats = null) {
  const bazaFaiz = bazaItkiFaiziniHesabla(playerPower, enemyPower, victory, cfg);
  const modifier = combatStats ? mudafieModifieriniHesabla(combatStats, cfg) : 1;
  return clamp(bazaFaiz * modifier, 0, 95);
}

function umumiItkiniHesabla(formasiya, playerPower, enemyPower, victory, cfg = dovusItkiKonfiqi()) {
  const rows = formasiyaTemizle(formasiya);
  const toplam = rows.reduce((cem, x) => cem + x.count, 0);
  if (toplam <= 0) {
    return {
      toplam: 0,
      itki: 0,
      itkiFaizi: 0,
      bazaItkiFaizi: 0,
      mudafieModifieri: 1,
      combatStats: qosunDoyusStatlariniHesabla({})
    };
  }

  const combatStats = qosunDoyusStatlariniHesabla(formasiyaQosunSnapshotiniHazirla(rows));
  const bazaItkiFaizi = bazaItkiFaiziniHesabla(playerPower, enemyPower, victory, cfg);
  const mudafieModifieri = mudafieModifieriniHesabla(combatStats, cfg);
  const itkiFaizi = clamp(bazaItkiFaizi * mudafieModifieri, 0, 95);
  const itki = Math.min(toplam, Math.max(0, Math.round(toplam * (itkiFaizi / 100))));

  return {
    toplam,
    itki,
    itkiFaizi,
    bazaItkiFaizi,
    mudafieModifieri,
    combatStats
  };
}

function siraRiskModifieriniHesabla(unitId, cfg = dovusItkiKonfiqi()) {
  const unit = qosunDoyusMelumatiniAl(unitId);
  if (!unit) return 1;

  const attack = musbetEded(unit.attackSpeed);
  const defense = musbetEded(unit.defense);
  const hp = musbetEded(unit.hp);
  const cem = attack + defense + hp;
  const dayaniqliliq = cem > 0 ? (defense + hp) / cem : 0.5;
  const raw = 1 + ((0.5 - dayaniqliliq) * 1.2);
  return clamp(raw, cfg.siraRiskMinimum, cfg.siraRiskMaksimum);
}

function itkiniSiralarArasindaBolDetalli(formasiya, umumiItki, cfg = dovusItkiKonfiqi()) {
  const rows = formasiyaTemizle(formasiya)
    .sort((a, b) => siraSirasi(a.siraId) - siraSirasi(b.siraId));
  const toplam = rows.reduce((cem, x) => cem + x.count, 0);
  let qalan = Math.min(tamEded(umumiItki), toplam);

  const states = rows.map((row, index) => ({
    ...row,
    _index: index,
    remaining: row.count,
    lost: 0,
    currentWeight: 0,
    riskModifier: siraRiskModifieriniHesabla(row.unitId, cfg),
    initialExposure: 0,
    maxExposure: 0,
    becameFrontline: false
  }));

  const initialExposure = aktivSiraEkspozisiyalariniHazirla(
    states.map(x => ({ siraId: x.siraId, unitId: x.unitId, count: x.remaining }))
  );
  for (const item of initialExposure) {
    const state = states.find(x => x.siraId === item.siraId);
    if (!state) continue;
    state.initialExposure = item.exposure;
    state.maxExposure = item.exposure;
    state.becameFrontline = item.activeDepth === 1;
  }

  const frontlineSequence = [];
  let lastFrontline = "";
  let addim = 0;

  while (qalan > 0) {
    const activeInput = states
      .filter(x => x.remaining > 0)
      .map(x => ({ siraId: x.siraId, unitId: x.unitId, count: x.remaining }));
    if (activeInput.length <= 0) break;

    const exposures = aktivSiraEkspozisiyalariniHazirla(activeInput);
    const exposureByRow = new Map(exposures.map(x => [x.siraId, x]));
    const frontline = exposures.find(x => x.activeDepth === 1) || null;
    if (frontline && frontline.siraId !== lastFrontline) {
      lastFrontline = frontline.siraId;
      frontlineSequence.push({
        siraId: frontline.siraId,
        becameFrontlineAfterLosses: addim
      });
    }

    let totalWeight = 0;
    for (const state of states) {
      if (state.remaining <= 0) continue;
      const exposure = exposureByRow.get(state.siraId);
      const exposureValue = exposure ? exposure.exposure : 0;
      state.maxExposure = Math.max(state.maxExposure, exposureValue);
      if (exposure && exposure.activeDepth === 1) state.becameFrontline = true;

      const weight = Math.max(0.0001, state.remaining * state.riskModifier * exposureValue);
      state.currentWeight += weight;
      state._lastWeight = weight;
      state._lastExposure = exposureValue;
      totalWeight += weight;
    }

    const candidates = states
      .filter(x => x.remaining > 0)
      .sort((a, b) => {
        if (b.currentWeight !== a.currentWeight) return b.currentWeight - a.currentWeight;
        return siraSirasi(a.siraId) - siraSirasi(b.siraId);
      });
    const selected = candidates[0];
    if (!selected) break;

    selected.currentWeight -= totalWeight;
    selected.remaining -= 1;
    selected.lost += 1;
    qalan -= 1;
    addim += 1;
  }

  const resultRows = states.map(x => {
    const role = unitRolunuAl(x.unitId);
    return {
      siraId: x.siraId,
      unitId: x.unitId,
      count: x.lost,
      riskModifier: yuvarlaqla(x.riskModifier),
      initialExposure: yuvarlaqla(x.initialExposure),
      maxExposure: yuvarlaqla(x.maxExposure),
      becameFrontline: x.becameFrontline === true,
      classId: role ? role.classId : "",
      classRoleId: role ? role.roleId : "",
      preferredPlacement: !!(role && role.preferredRows.includes(x.siraId))
    };
  });

  return {
    rows: resultRows,
    formationResolution: {
      version: 1,
      targetingRuleId: "front_to_back_dynamic_exposure_v1",
      classRoleBonusEnabled: false,
      classRolePenaltyEnabled: false,
      frontlineSequence,
      formationInfo: formasiyaDoyusMelumatiniHazirla(rows)
    }
  };
}

function itkiniSiralarArasindaBol(formasiya, umumiItki, cfg = dovusItkiKonfiqi()) {
  return itkiniSiralarArasindaBolDetalli(formasiya, umumiItki, cfg).rows;
}

function birSiraniNovlereBol(row, cfg = dovusItkiKonfiqi(), policyId = ITKI_POLICY.NORMAL) {
  const itki = tamEded(row && row.count);
  const common = {
    siraId: metnAl(row && row.siraId, 32),
    unitId: metnAl(row && row.unitId, 128),
    itki,
    riskModifier: yuvarlaqla(row && row.riskModifier),
    initialExposure: yuvarlaqla(row && row.initialExposure),
    maxExposure: yuvarlaqla(row && row.maxExposure),
    becameFrontline: row && row.becameFrontline === true,
    classId: metnAl(row && row.classId, 64),
    classRoleId: metnAl(row && row.classRoleId, 64),
    preferredPlacement: row && row.preferredPlacement === true
  };

  if (itki <= 0) {
    return { ...common, agirYaraliNamized: 0, yungulYarali: 0, birbasaOlu: 0 };
  }

  if (policyId === ITKI_POLICY.DEATH_ZONE) {
    return { ...common, agirYaraliNamized: 0, yungulYarali: 0, birbasaOlu: itki };
  }

  const agir = Math.min(itki, Math.round(itki * (cfg.agirYaraliFaizi / 100)));
  const yungul = Math.min(itki - agir, Math.round(itki * (cfg.yungulYaraliFaizi / 100)));
  const birbasaOlu = Math.max(0, itki - agir - yungul);

  return {
    ...common,
    agirYaraliNamized: agir,
    yungulYarali: yungul,
    birbasaOlu
  };
}

function itkiPlaniniHazirla(formasiya, playerPower, enemyPower, victory, options = {}) {
  const cfg = dovusItkiKonfiqi();
  const policyId = options && options.policyId === ITKI_POLICY.DEATH_ZONE
    ? ITKI_POLICY.DEATH_ZONE
    : ITKI_POLICY.NORMAL;
  const hesab = umumiItkiniHesabla(formasiya, playerPower, enemyPower, victory, cfg);
  const bolgu = itkiniSiralarArasindaBolDetalli(formasiya, hesab.itki, cfg);
  const siralar = bolgu.rows.map(x => birSiraniNovlereBol(x, cfg, policyId));

  return {
    version: 3,
    formulaId: "power_ratio_plus_stats_plus_dynamic_rows_v3",
    policyId,
    victory: victory === true,
    sentCount: hesab.toplam,
    totalLoss: hesab.itki,
    lossPercent: Number(hesab.itkiFaizi.toFixed(2)),
    formulaBreakdown: {
      baseLossPercent: Number(hesab.bazaItkiFaizi.toFixed(2)),
      durabilityShare: Number(dayaniqliliqPayiniHesabla(hesab.combatStats).toFixed(4)),
      defenseHpModifier: Number(hesab.mudafieModifieri.toFixed(4)),
      totalAttack: hesab.combatStats.totalAttack,
      totalDefense: hesab.combatStats.totalDefense,
      totalHp: hesab.combatStats.totalHp,
      totalBattlePower: hesab.combatStats.totalBattlePower,
      rowTargetingRuleId: bolgu.formationResolution.targetingRuleId,
      classRoleBonusEnabled: false,
      classRolePenaltyEnabled: false
    },
    formationResolution: bolgu.formationResolution,
    config: { ...cfg },
    siralar
  };
}

module.exports = {
  ITKI_POLICY,
  dovusItkiKonfiqi,
  formasiyaTemizle,
  umumiEsgerSayiniAl,
  formasiyaQosunSnapshotiniHazirla,
  dayaniqliliqPayiniHesabla,
  mudafieModifieriniHesabla,
  bazaItkiFaiziniHesabla,
  itkiFaiziniHesabla,
  umumiItkiniHesabla,
  siraRiskModifieriniHesabla,
  itkiniSiralarArasindaBolDetalli,
  itkiniSiralarArasindaBol,
  itkiPlaniniHazirla
};
