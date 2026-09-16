'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function moduluYukle(runtimeMode) {
  let legacyCalls = 0;
  const moduleUnderTest = { exports: {} };
  const filename = path.join(__dirname, 'dovlet_xerite_worldv2_resurs_provider.js');
  const req = name => {
    if (name === './dovlet_xerite_worldv2_resurs_provider_legacy') return {
      HADISE_NOVU: 'test',
      worldV2ResursDescriptoruAl: () => ({ resourceId: 'wood', level: 1 }),
      async worldV2ResurslariniAl() {
        legacyCalls++;
        return { resources: [{ index: 1 }] };
      },
    };
    if (name === './dovlet_xerite_worldv2_resurs_runtime_mode') return {
      SQL_AUTHORITATIVE: 'sql_authoritative',
      worldV2SqlMutasiyaFlagAktivdir: () => true,
      worldV2SqlViewportFlagAktivdir: () => true,
      worldV2ResursRuntimeModeAl: async () => ({ runtimeMode }),
    };
    return require(name);
  };
  vm.runInThisContext(
    '(function(require,module,exports){' + fs.readFileSync(filename, 'utf8') + '\n})',
    { filename },
  )(req, moduleUnderTest, moduleUnderTest.exports);
  return { modul: moduleUnderTest.exports, legacyCalls: () => legacyCalls };
}

async function run() {
  const authoritative = await moduluYukle('sql_authoritative');
  await assert.rejects(
    () => authoritative.modul.worldV2ResurslariniAl(1, [], Date.now(), 80000),
    xeta => xeta && xeta.code === 'WORLDV2_SQL_VIEWPORT_REQUIRED',
  );
  assert.equal(authoritative.legacyCalls(), 0, 'Authoritative rejim giant legacy provider-i çağırmamalıdır');

  const legacy = await moduluYukle('legacy_shadow');
  const netice = await legacy.modul.worldV2ResurslariniAl(1, [], Date.now(), 3000);
  assert.equal(legacy.legacyCalls(), 1);
  assert.equal(netice.resources.length, 1);

  console.log('✓ WorldV2 authoritative legacy-provider guard testi keçdi.');
}

module.exports = run();
