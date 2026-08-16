"use strict";

const {
  qosunDoyusStatlariniHesabla
} = require("./qosun_doyus_stat_sistemi");
const {
  dovusItkiKonfiqi,
  umumiItkiniHesabla,
  siraRiskModifieriniHesabla,
  itkiPlaniniHazirla
} = require("./doyus_itki_sistemi");

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

function snapshotYoxla(raw, side) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { success: false, message: `${side} PvP snapshot-u yoxdur.` };
  }
  if (raw.locked !== true) {
    return { success: false, message: `${side} PvP snapshot-u kilidlənməyib.` };
  }
  const stats = qosunDoyusStatlariniHesabla(raw.troops || {});
  if (stats.unknownUnitIds.length > 0) {
    return { success: false, message: `${side} snapshot-da naməlum qoşun ID-si var.`, unknownUnitIds: stats.unknownUnitIds };
  }
  return { success: true, stats };
}

function largestRemainderBol(items, total, weightFn) {
  const hedef = Math.max(0, tamEded(total));
  if (hedef <= 0 || !Array.isArray(items) || items.length <= 0) return items.map(() => 0);
  const weights = items.map(x => Math.max(0, Number(weightFn(x)) || 0));
  const weightTotal = weights.reduce((a, b) => a + b, 0);
  if (weightTotal <= 0) return items.map(() => 0);

  const exact = weights.map(w => (hedef * w) / weightTotal);
  const result = exact.map((v, i) => Math.min(tamEded(items[i].count), Math.floor(v)));
  let qalan = hedef - result.reduce((a, b) => a + b, 0);
  const order = exact.map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  while (qalan > 0) {
    let deyisdi = false;
    for (const x of order) {
      if (qalan <= 0) break;
      if (result[x.i] >= tamEded(items[x.i].count)) continue;
      result[x.i] += 1;
      qalan -= 1;
      deyisdi = true;
    }
    if (!deyisdi) break;
  }
  return result;
}

function itkiniNovlereBol(itki, cfg) {
  const total = tamEded(itki);
  const agir = Math.min(total, Math.round(total * ((Number(cfg.agirYaraliFaizi) || 0) / 100)));
  const yungul = Math.min(total - agir, Math.round(total * ((Number(cfg.yungulYaraliFaizi) || 0) / 100)));
  return { agir, yungul, olu: Math.max(0, total - agir - yungul) };
}

function pvpMudafieItkiPlaniniHazirla(snapshot, ownPower, enemyPower, victory) {
  const stats = qosunDoyusStatlariniHesabla(snapshot && snapshot.troops || {});
  const formasiya = stats.perUnit.map((x, index) => ({
    siraId: `mudafie_${index + 1}`,
    unitId: x.unitId,
    count: x.count
  }));
  const cfg = dovusItkiKonfiqi();
  const hesab = umumiItkiniHesabla(formasiya, ownPower, enemyPower, victory, cfg);
  const counts = largestRemainderBol(stats.perUnit, hesab.itki, x => x.count * siraRiskModifieriniHesabla(x.unitId, cfg));
  const siralar = stats.perUnit.map((x, index) => {
    const split = itkiniNovlereBol(counts[index], cfg);
    return {
      siraId: `mudafie_${index + 1}`,
      unitId: x.unitId,
      itki: counts[index],
      agirYaraliNamized: split.agir,
      yungulYarali: split.yungul,
      birbasaOlu: split.olu
    };
  });
  return {
    version: 1,
    formulaId: "pvp_base_defense_aggregate_units_v1",
    policyId: "normal",
    victory: victory === true,
    sentCount: hesab.toplam,
    totalLoss: hesab.itki,
    lossPercent: Number(hesab.itkiFaizi.toFixed(2)),
    siralar
  };
}

function pvpDoyusuHesabla(attackerSnapshot, defenderSnapshot, nowMs = Date.now()) {
  const a = snapshotYoxla(attackerSnapshot, "Hücumçu");
  if (!a.success) return a;
  const d = snapshotYoxla(defenderSnapshot, "Müdafiəçi");
  if (!d.success) return d;
  if (a.stats.totalTroops <= 0) return { success: false, message: "Hücumçu snapshot-da qoşun yoxdur." };

  const attackerPower = a.stats.totalBattlePower;
  const defenderPower = d.stats.totalBattlePower;
  const attackerVictory = attackerPower >= defenderPower;

  const attackerFormation = Array.isArray(attackerSnapshot.formation) ? attackerSnapshot.formation : [];
  const attackerCasualtyPlan = itkiPlaniniHazirla(
    attackerFormation,
    attackerPower,
    defenderPower,
    attackerVictory
  );
  const defenderCasualtyPlan = pvpMudafieItkiPlaniniHazirla(
    defenderSnapshot,
    defenderPower,
    attackerPower,
    !attackerVictory
  );

  return {
    success: true,
    version: 1,
    resolverId: "pvp_two_side_server_resolver_v1",
    resolvedAtMs: tamEded(nowMs) || Date.now(),
    winnerSide: attackerVictory ? "attacker" : "defender",
    attackerVictory,
    defenderVictory: !attackerVictory,
    attackerPower,
    defenderPower,
    heroPowerApplied: false,
    classBonusApplied: false,
    attackerStats: kopyala(a.stats),
    defenderStats: kopyala(d.stats),
    attackerCasualtyPlan,
    defenderCasualtyPlan
  };
}

module.exports = {
  snapshotYoxla,
  pvpMudafieItkiPlaniniHazirla,
  pvpDoyusuHesabla
};
