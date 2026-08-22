'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

const WORLDV2_MARKER = '// === WORLDV2 BRANCH INTEGRATION ===';

function yalnizBirDefeDeyisdir(menbe, axtarilan, evez, anchorAdi) {
  const ilk = menbe.indexOf(axtarilan);
  if (ilk < 0) {
    throw new Error(`[WORLDV2 LAUNCHER] Anchor tapılmadı: ${anchorAdi}`);
  }

  const ikinci = menbe.indexOf(axtarilan, ilk + axtarilan.length);
  if (ikinci >= 0) {
    throw new Error(`[WORLDV2 LAUNCHER] Anchor birdən çox tapıldı: ${anchorAdi}`);
  }

  return menbe.slice(0, ilk) + evez + menbe.slice(ilk + axtarilan.length);
}

function worldV2ServerMenbesiniHazirla(xamMenbe) {
  if (typeof xamMenbe !== 'string' || !xamMenbe.trim()) {
    throw new Error('[WORLDV2 LAUNCHER] server.js mənbə mətni tələb olunur.');
  }

  if (xamMenbe.includes(WORLDV2_MARKER)) {
    throw new Error('[WORLDV2 LAUNCHER] Mənbədə WorldV2 inteqrasiyası artıq mövcuddur.');
  }

  const playersAnchor = [
    'const PORT = process.env.PORT || 3001;',
    'const players = new Map();',
    'const connections = new Map();',
  ].join('\n');

  const playersEvez = [
    playersAnchor,
    '',
    WORLDV2_MARKER,
    'const { worldV2HandleriYarat } = require("./dovlet_xerite_worldv2_handler");',
    'const { worldV2BazalariniPlayersMapDanAl } = require("./dovlet_xerite_worldv2_baza_adapteri");',
    '',
    'const worldV2MesajHandleri = worldV2HandleriYarat({',
    '  dovletBazalariAl: async (stateId) =>',
    '    worldV2BazalariniPlayersMapDanAl(players, stateId)',
    '});',
    '// === WORLDV2 BRANCH INTEGRATION END ===',
  ].join('\n');

  let netice = yalnizBirDefeDeyisdir(
    xamMenbe,
    playersAnchor,
    playersEvez,
    'players Map / handler qurulması',
  );

  const switchAnchor = [
    '  if (sifreSifirlamaEmalOlundu) {',
    '    return;',
    '  }',
    '',
    '  switch (type) {',
  ].join('\n');

  const switchEvez = [
    '  if (sifreSifirlamaEmalOlundu) {',
    '    return;',
    '  }',
    '',
    '  const worldV2EmalOlundu = await worldV2MesajHandleri({',
    '    type,',
    '    msg,',
    '    ws,',
    '    send,',
    '    nowMs,',
    '    getOrCreatePlayerState,',
    '  });',
    '',
    '  if (worldV2EmalOlundu) {',
    '    return;',
    '  }',
    '',
    '  switch (type) {',
  ].join('\n');

  netice = yalnizBirDefeDeyisdir(
    netice,
    switchAnchor,
    switchEvez,
    'əsas mesaj switch-i',
  );

  return netice;
}

function worldV2ServeriBaslat() {
  const serverYolu = path.resolve(__dirname, 'server.js');
  const esasStartYolu = path.resolve(__dirname, 'server_missiya_genisletme.js');
  const esasJsYukleyicisi = Module._extensions['.js'];
  let serverTransformOlundu = false;

  if (typeof esasJsYukleyicisi !== 'function') {
    throw new Error('[WORLDV2 LAUNCHER] Node .js module yükləyicisi tapılmadı.');
  }

  Module._extensions['.js'] = function worldV2JsYukleyicisi(modul, faylAdi) {
    if (path.resolve(faylAdi) !== serverYolu) {
      return esasJsYukleyicisi(modul, faylAdi);
    }

    if (serverTransformOlundu) {
      throw new Error('[WORLDV2 LAUNCHER] server.js ikinci dəfə transform edilməyə cəhd etdi.');
    }

    const xamMenbe = fs.readFileSync(serverYolu, 'utf8');
    const hazirMenbe = worldV2ServerMenbesiniHazirla(xamMenbe);
    serverTransformOlundu = true;

    console.log('[WORLDV2 LAUNCHER] server.js mövcud start zənciri daxilində WorldV2 ilə genişləndirildi.');
    return modul._compile(hazirMenbe, faylAdi);
  };

  try {
    console.log('[WORLDV2 LAUNCHER] Mövcud server_missiya_genisletme.js start zənciri başladılır.');
    console.log('[WORLDV2 LAUNCHER] Ayrı WebSocket və ya ikinci players state-i yaradılmır.');

    require(esasStartYolu);

    if (!serverTransformOlundu) {
      throw new Error(
        '[WORLDV2 LAUNCHER] Mövcud start zənciri server.js-i yükləmədi; təhlükəsizlik üçün dayandırıldı.'
      );
    }
  } finally {
    Module._extensions['.js'] = esasJsYukleyicisi;
  }
}

if (require.main === module) {
  try {
    worldV2ServeriBaslat();
  } catch (xeta) {
    console.error('[WORLDV2 LAUNCHER] Server başladılmadı.');
    console.error(xeta);
    process.exitCode = 1;
  }
}

module.exports = {
  WORLDV2_MARKER,
  yalnizBirDefeDeyisdir,
  worldV2ServerMenbesiniHazirla,
  worldV2ServeriBaslat,
};
