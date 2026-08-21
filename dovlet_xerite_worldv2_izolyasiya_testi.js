'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PREFIX = 'dovlet_xerite_worldv2_';

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
        `${fayl} xarici/legacy modul require edir: ${hedef}`,
      );

      const hedefAdi = path.basename(hedef).replace(/\.js$/i, '');
      assert.ok(
        hedefAdi.startsWith(PREFIX),
        `${fayl} WorldV2 xaricində lokal modul require edir: ${hedef}`,
      );
    }

    // Production serverə qoşulma yalnız gələcək açıq inteqrasiya nöqtəsində edilməlidir.
    // Hazırlıq branch-ində WorldV2 modulunun özü server process-i başlatmamalıdır.
    assert.strictEqual(
      /require\s*\(\s*['"]\.\/server(?:_[^'"]*)?['"]\s*\)/.test(metn),
      false,
      `${fayl} production server moduluna birbaşa bağlanıb.`,
    );
  }

  console.log(`WorldV2 izolyasiya testi uğurludur (${fayllar.length} modul).`);
}

run();

module.exports = {
  istehsalWorldV2FayllariniTap,
  relativeRequireHedefleriniTap,
};
