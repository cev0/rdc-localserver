"use strict";

const {
  qosunDoyusMelumatiniAl,
  qosunDoyusStatlariniHesabla
} = require("./qosun_doyus_stat_sistemi");

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

function itkiniSiralarArasindaBol(formasiya, umumiItki, cfg = dovusItkiKonfiqi()) {
  const rows = formasiyaTemizle(formasiya);
  const toplam = rows.reduce((cem, x) => cem + x.count, 0);
  const qalan = Math.min(tamEded(umumiItki), toplam);
  if (qalan <= 0 || toplam <= 0) return rows.map(x => ({ ...x, count: 0 }));

  const weighted = rows.map((row, index) => {
    const riskModifier = siraRiskModifieriniHesabla(row.unitId, cfg);
    return {
      ...row,
      _index: index,
      _riskModifier: riskModifier,
      _weight: row.count * riskModifier
    };
  });

  const weightTotal = weighted.reduce((cem, x) => cem + x._weight, 0) || toplam;
  const ilkin = weighted.map(row => {
    const exact = (row._weight / weightTotal) * qalan;
    const count = Math.min(row.count, Math.floor(exact));
    return { ...row, count, _qaliq: exact - count };
  });

  let artiq = qalan - ilkin.reduce((cem, x) => cem + x.count, 0);
  const sirali = ilkin.slice().sort((a, b) => b._qaliq - a._qaliq || a._index - b._index);

  let dovr = 0;
  while (artiq > 0 && dovr < rows.length * 2) {
    let verildi = false;
    for (const row of sirali) {
      if (artiq <= 0) break;
      const target = ilkin[row._index];
      if (target.count >= rows[row._index].count) continue;
      target.count += 1;
      artiq -= 1;
      verildi = true;
    }
    if (!verildi) break;
    dovr += 1;
  }

  return ilkin.map(x => ({
    siraId: x.siraId,
    unitId: x.unitId,
    count: x.count,
    riskModifier: yuvarlaqla(x._riskModifier)
  }));
}

function birSiraniNovlereBol(row, cfg = dovusItkiKonfiqi(), policyId = ITKI_POLICY.NORMAL) {
  const itki = tamEded(row && row.count);
  const common = {
    siraId: metnAl(row && row.siraId, 32),
    unitId: metnAl(row && row.unitId, 128),
    itki,
    riskModifier: yuvarlaqla(row && row.riskModifier)
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
  const siralar = itkiniSiralarArasindaBol(formasiya, hesab.itki, cfg)
    .map(x => birSiraniNovlereBol(x, cfg, policyId));

  return {
    version: 2,
    formulaId: "power_ratio_plus_authoritative_attack_defense_hp_v2",
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
      totalBattlePower: hesab.combatStats.totalBattlePower
    },
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
  itkiniSiralarArasindaBol,
  itkiPlaniniHazirla
};
