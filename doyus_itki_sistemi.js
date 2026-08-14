"use strict";

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function faizEnv(ad, fallback) {
  const n = Number(process.env[ad]);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function dovusItkiKonfiqi() {
  return {
    qelebeMinimumItkiFaizi: faizEnv("DOYUS_QELEBE_MIN_ITKI_FAIZ", 5),
    qelebeMaksimumItkiFaizi: faizEnv("DOYUS_QELEBE_MAX_ITKI_FAIZ", 25),
    meglubiyyetMinimumItkiFaizi: faizEnv("DOYUS_MEGLUBIYYET_MIN_ITKI_FAIZ", 35),
    meglubiyyetMaksimumItkiFaizi: faizEnv("DOYUS_MEGLUBIYYET_MAX_ITKI_FAIZ", 75),
    agirYaraliFaizi: faizEnv("DOYUS_AGIR_YARALI_FAIZ", 60),
    yungulYaraliFaizi: faizEnv("DOYUS_YUNGUL_YARALI_FAIZ", 20)
  };
}

function clamp01(v) {
  return Math.max(0, Math.min(1, Number(v) || 0));
}

function lerp(a, b, t) {
  return a + ((b - a) * clamp01(t));
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

function itkiFaiziniHesabla(playerPower, enemyPower, victory, cfg = dovusItkiKonfiqi()) {
  const p = Math.max(1, tamEded(playerPower));
  const e = Math.max(1, tamEded(enemyPower));

  if (victory) {
    const yaxinliq = clamp01(e / p);
    return lerp(cfg.qelebeMinimumItkiFaizi, cfg.qelebeMaksimumItkiFaizi, yaxinliq);
  }

  const yaxinliq = clamp01(p / e);
  return lerp(cfg.meglubiyyetMaksimumItkiFaizi, cfg.meglubiyyetMinimumItkiFaizi, yaxinliq);
}

function umumiItkiniHesabla(formasiya, playerPower, enemyPower, victory, cfg = dovusItkiKonfiqi()) {
  const toplam = umumiEsgerSayiniAl(formasiya);
  if (toplam <= 0) return { toplam: 0, itki: 0, itkiFaizi: 0 };

  const itkiFaizi = itkiFaiziniHesabla(playerPower, enemyPower, victory, cfg);
  const itki = Math.min(toplam, Math.max(0, Math.round(toplam * (itkiFaizi / 100))));
  return { toplam, itki, itkiFaizi };
}

function itkiniSiralarArasindaBol(formasiya, umumiItki) {
  const rows = formasiyaTemizle(formasiya);
  const toplam = rows.reduce((cem, x) => cem + x.count, 0);
  let qalan = Math.min(tamEded(umumiItki), toplam);
  if (qalan <= 0 || toplam <= 0) return rows.map(x => ({ ...x, count: 0 }));

  const ilkin = rows.map((row, index) => {
    const exact = (row.count / toplam) * qalan;
    const count = Math.min(row.count, Math.floor(exact));
    return { ...row, count, _qaliq: exact - count, _index: index };
  });

  let verilib = ilkin.reduce((cem, x) => cem + x.count, 0);
  let artiq = qalan - verilib;

  ilkin
    .slice()
    .sort((a, b) => b._qaliq - a._qaliq || a._index - b._index)
    .forEach(row => {
      if (artiq <= 0) return;
      const original = rows[row._index];
      const target = ilkin[row._index];
      if (target.count < original.count) {
        target.count += 1;
        artiq -= 1;
      }
    });

  return ilkin.map(x => ({ siraId: x.siraId, unitId: x.unitId, count: x.count }));
}

function birSiraniNovlereBol(row, cfg = dovusItkiKonfiqi()) {
  const itki = tamEded(row && row.count);
  if (itki <= 0) {
    return {
      siraId: metnAl(row && row.siraId, 32),
      unitId: metnAl(row && row.unitId, 128),
      itki: 0,
      agirYaraliNamized: 0,
      yungulYarali: 0,
      birbasaOlu: 0
    };
  }

  const agir = Math.min(itki, Math.round(itki * (cfg.agirYaraliFaizi / 100)));
  const yungul = Math.min(itki - agir, Math.round(itki * (cfg.yungulYaraliFaizi / 100)));
  const birbasaOlu = Math.max(0, itki - agir - yungul);

  return {
    siraId: metnAl(row && row.siraId, 32),
    unitId: metnAl(row && row.unitId, 128),
    itki,
    agirYaraliNamized: agir,
    yungulYarali: yungul,
    birbasaOlu
  };
}

function itkiPlaniniHazirla(formasiya, playerPower, enemyPower, victory) {
  const cfg = dovusItkiKonfiqi();
  const hesab = umumiItkiniHesabla(formasiya, playerPower, enemyPower, victory, cfg);
  const siralar = itkiniSiralarArasindaBol(formasiya, hesab.itki).map(x => birSiraniNovlereBol(x, cfg));

  return {
    version: 1,
    victory: victory === true,
    sentCount: hesab.toplam,
    totalLoss: hesab.itki,
    lossPercent: Number(hesab.itkiFaizi.toFixed(2)),
    config: { ...cfg },
    siralar
  };
}

module.exports = {
  dovusItkiKonfiqi,
  formasiyaTemizle,
  umumiEsgerSayiniAl,
  itkiFaiziniHesabla,
  umumiItkiniHesabla,
  itkiniSiralarArasindaBol,
  itkiPlaniniHazirla
};
