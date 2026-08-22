'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PREFIX = 'dovlet_xerite_worldv2_';

// WorldV2 production-a mərhələli qoşulduğu üçün yalnız bu dəqiq adapterlərə
// mövcud authoritative server mənbələrini oxumağa icazə verilir.
// Buraya wildcard və ümumi qovluq icazəsi əlavə etmək olmaz.
const ICAZELI_XARICI_LOCAL_REQUIRE = Object.freeze({
  'dovlet_xerite_worldv2_lifecycle_adapteri.js': new Set([
    './dovlet_lifecycle_handler',
  ]),
  'dovlet_xerite_worldv2_obyekt_production_handler.js': new Set([
    './dovlet_baza_kataloqu_postgres',
    './oyun_state_daimilik_korpu',
  ]),
});

function istehsalWorldV2FayllariniTap() {
  return fs.readdirSync(ROOT)
    .filter((ad) => ad.startsWith(PREFIX) && ad.endsWith('.js'))
    .filter((ad) => !ad.endsWith('_testi.js'))
    .filter((ad) => ad !== 'dovlet_xerite_worldv2_butun_testler.js')
    .sort();
}

function relativeRequireHedefleriniTap(metn) {
  const netice = [];
  const regex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let uygunluq;

  while ((uygunluq = regex.exec(metn)) !== null) {
    netice.push(uygunluq[1]);
  }

  return netice;
}

function xariciLocalRequireIcazelidir(fayl, hedef) {
  const icazeler = ICAZELI_XARICI_LOCAL_REQUIRE[fayl];
  return icazeler instanceof Set && icazeler.has(hedef);
}

function run() {
  const fayllar = istehsalWorldV2FayllariniTap();
  assert.ok(fayllar.length > 0, 'WorldV2 istehsal modulları tapılmadı.');

  for (const fayl of fayllar) {
    const tamYol = path.join(ROOT, fayl);
    const metn = fs.readFileSync(tamYol, 'utf8');
    const requireHedefleri = relativeRequireHedefleriniTap(metn);

    for (const hedef of requireHedefleri) {
      assert.ok(
        hedef.startsWith('./'),
        `${fayl} xarici package/legacy modul require edir: ${hedef}`,
      );

      const hedefAdi = path.basename(hedef).replace(/\.js$/i, '');
      if (hedefAdi.startsWith(PREFIX)) {
        continue;
      }

      assert.ok(
        xariciLocalRequireIcazelidir(fayl, hedef),
        `${fayl} allowlist xaricində lokal modul require edir: ${hedef}`,
      );
    }

    // WorldV2 modulu server process-i özü başlatmamalıdır.
    // Production inteqrasiya mövcud gameplay handler zəncirindən edilməlidir.
    assert.strictEqual(
      /require\s*\(\s*['"]\.\/server(?:_[^'"]*)?['"]\s*\)/.test(metn),
      false,
      `${fayl} server process moduluna birbaşa bağlanıb.`,
    );
  }

  // Allowlist-də yazılan hər dependency həqiqətən faylda olmalıdır.
  // Beləliklə köhnəlmiş, lazımsız icazə səssiz qalmır.
  for (const [fayl, icazeler] of Object.entries(ICAZELI_XARICI_LOCAL_REQUIRE)) {
    const tamYol = path.join(ROOT, fayl);
    assert.ok(fs.existsSync(tamYol), `Allowlist faylı tapılmadı: ${fayl}`);

    const requireHedefleri = new Set(
      relativeRequireHedefleriniTap(fs.readFileSync(tamYol, 'utf8')),
    );

    for (const hedef of icazeler) {
      assert.ok(
        requireHedefleri.has(hedef),
        `Köhnəlmiş WorldV2 require icazəsi: ${fayl} -> ${hedef}`,
      );
    }
  }

  console.log(`WorldV2 izolyasiya testi uğurludur (${fayllar.length} modul).`);
}

run();

module.exports = {
  ICAZELI_XARICI_LOCAL_REQUIRE,
  istehsalWorldV2FayllariniTap,
  relativeRequireHedefleriniTap,
  xariciLocalRequireIcazelidir,
};
