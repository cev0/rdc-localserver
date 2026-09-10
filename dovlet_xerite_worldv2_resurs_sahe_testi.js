'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Load the real viewport service without opening a database connection.
const moduleUnderTest = { exports: {} };
const filename = path.join(__dirname, 'dovlet_xerite_worldv2_resurs_sahe.js');
const req = name => {
  if (name === './verilenler_bazasi') return { proqramHovuzunuAl() { throw new Error('Unexpected DB access'); } };
  if (name === './dovlet_xerite_worldv2_resurs_provider') return { HADISE_NOVU: 'test', worldV2ResurslariniAl() { throw new Error('Unexpected default provider'); } };
  return require(name);
};
vm.runInThisContext('(function(require,module,exports){' + fs.readFileSync(filename, 'utf8') + '\n})', { filename })(req, moduleUnderTest, moduleUnderTest.exports);
const { saheSorqusunuOxu, resursSaheXidmetiYarat } = moduleUnderTest.exports;

async function run() {
  const request = { resourceView: true, resourceVisualOnly: true, resourceViewRequestId: 7,
    resourceViewMinX: 100, resourceViewMinY: 100, resourceViewMaxX: 110, resourceViewMaxY: 110 };
  const view = saheSorqusunuOxu(request);
  assert.equal(saheSorqusunuOxu({}), null, 'Legacy requests stay on their existing path');
  for (const edit of [ { resourceViewRequestId: 0 }, { resourceViewMinX: -1 },
    { resourceViewMaxX: 229 }, { resourceViewMaxY: 99 }, { resourceViewMinX: 100.5 },
    { resourceVisualOnly: false }, { resourceViewMaxY: 1201 } ]) {
    assert.throws(() => saheSorqusunuOxu({ ...request, ...edit }), 'Reject malformed or unbounded client requests');
  }
  let revision = '1', calls = 0;
  const resource = (index, x, y) => ({ index, x, y, resourceId: 'wood', level: 4,
    spawnSerial: 2, remainingAmount: 100, respawnAtMs: 0 });
  let nodes = [resource(1, 100, 100), resource(2, 110, 110), resource(3, 111, 105)];
  const service = resursSaheXidmetiYarat({ revisionAl: async () => revision,
    provider: async () => {
      calls++;
      await Promise.resolve();
      return { resources: nodes, runtimeRevision: revision, nextRespawnAtMs: 2000 };
    } });
  const result = await Promise.all([service(1, [], 1000, view), service(1, [], 1000, view)]);
  assert.equal(calls, 1, 'Simultaneous views of one state share the catalog build');
  assert.equal(result[0].vizual.say, 2, 'Only in-bounds resources reach the client');
  assert.deepEqual(new Set(result[0].vizual.i), new Set([1, 2]));
  await service(1, [], 1200, view);
  assert.equal(calls, 1, 'Camera refreshes reuse an unchanged catalog');
  nodes = [resource(3, 106, 106)]; revision = '2';
  const changed = await service(1, [], 1300, view);
  assert.deepEqual(changed.vizual.i, [3], 'Harvest/respawn revision removes stale resource identities');
  assert.equal(calls, 2);
  await service(1, [], 2001, view);
  assert.equal(calls, 3, 'Respawn deadline invalidates cache even without a new audit row');
  await service(2, [], 1300, view);
  assert.equal(calls, 4, 'States have independent caches');
  const samePlace = Array.from({ length: 4100 }, (_, i) => resource(i + 1, 105, 105));
  const bounded = resursSaheXidmetiYarat({ revisionAl: async () => '1',
    provider: async () => ({ resources: samePlace, runtimeRevision: '1' }) });
  const clipped = await bounded(1, [], 1000, view);
  assert.equal(clipped.vizual.say, 4096, 'Malformed old dense data cannot create an unbounded response');
  assert.equal(clipped.resourceViewTruncated, true);
  console.log('WorldV2 resource viewport cache, bounds, concurrency and invalidation tests OK');
}
module.exports = run();
