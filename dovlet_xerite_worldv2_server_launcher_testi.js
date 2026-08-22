'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  WORLDV2_MARKER,
  worldV2ServerMenbesiniHazirla,
} = require('./server_worldv2_launcher');

function say(metn, ifade) {
  return metn.split(ifade).length - 1;
}

const serverYolu = path.join(__dirname, 'server.js');
const xamMenbe = fs.readFileSync(serverYolu, 'utf8');
const hazirMenbe = worldV2ServerMenbesiniHazirla(xamMenbe);

assert.strictEqual(xamMenbe.includes(WORLDV2_MARKER), false);
assert.strictEqual(say(hazirMenbe, WORLDV2_MARKER), 1);
assert.strictEqual(say(hazirMenbe, 'const worldV2MesajHandleri = worldV2HandleriYarat({'), 1);
assert.strictEqual(say(hazirMenbe, 'const worldV2EmalOlundu = await worldV2MesajHandleri({'), 1);
assert.strictEqual(say(hazirMenbe, 'worldV2BazalariniPlayersMapDanAl(players, stateId)'), 1);
assert.ok(hazirMenbe.includes('if (worldV2EmalOlundu) {\n    return;\n  }'));

assert.throws(
  () => worldV2ServerMenbesiniHazirla(hazirMenbe),
  /artıq mövcuddur/,
);

assert.throws(
  () => worldV2ServerMenbesiniHazirla('const players = new Map();'),
  /Anchor tapılmadı/,
);

console.log('✓ WorldV2 server launcher server.js anchor-larını təhlükəsiz və yalnız bir dəfə genişləndirir.');
