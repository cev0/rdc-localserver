'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const moduleUnderTest = { exports: {} };
const filename = path.join(__dirname, 'dovlet_xerite_worldv2_resurs_sahe.js');
const req = name => {
  if (name === './verilenler_bazasi') return { proqramHovuzunuAl() { throw new Error('Unexpected DB access'); } };
  if (name === './dovlet_xerite_worldv2_resurs_provider') return {
    HADISE_NOVU: 'test',
    worldV2ResurslariniAl() { throw new Error('Unexpected default provider'); },
    worldV2ResursDescriptoruAl(_stateId, index) {
      return { index, resourceId: 'wood', level: 4 };
    },
  };
  if (name === './dovlet_xerite_worldv2_resurs_runtime_postgres') return {
    worldV2ResursSahesiniSqlDenAlClient() { throw new Error('Unexpected default SQL viewport'); },
  };
  if (name === './dovlet_xerite_worldv2_resurs_sql_native') return {
    async worldV2SqlRespawnlariYenile() { return { updated: 0 }; },
  };
  return require(name);
};
vm.runInThisContext('(function(require,module,exports){' + fs.readFileSync(filename, 'utf8') + '\n})', { filename })(req, moduleUnderTest, moduleUnderTest.exports);
const { saheSorqusunuOxu, resursSaheXidmetiYarat, sqlNeticesiniHazirla } = moduleUnderTest.exports;

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
  const service = resursSaheXidmetiYarat({ sqlAktivdir: () => false, revisionAl: async () => revision,
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
  const bounded = resursSaheXidmetiYarat({ sqlAktivdir: () => false, revisionAl: async () => '1',
    provider: async () => ({ resources: samePlace, runtimeRevision: '1' }) });
  const clipped = await bounded(1, [], 1000, view);
  assert.equal(clipped.vizual.say, 4096, 'Malformed old dense data cannot create an unbounded response');
  assert.equal(clipped.resourceViewTruncated, true);

  let legacyCalls = 0;
  const sqlFast = resursSaheXidmetiYarat({
    sqlAktivdir: () => true,
    sqlMetaAl: async () => ({ stateId: 1, fresh: true, coverageOk: true,
      provisionedCount: 80000, physicalCapacityReached: false }),
    sqlViewAl: async () => ({ nodes: [{ index: 7, x: 104, y: 105, spawnSerial: 3 }], truncated: false }),
    descriptorAl: (_stateId, index) => ({ index, resourceId: 'wood', level: 4 }),
    revisionAl: async () => { throw new Error('Legacy revision should not run'); },
    provider: async () => { legacyCalls++; throw new Error('Legacy provider should not run'); },
  });
  const sqlResult = await sqlFast(1, [], 1000, view);
  assert.equal(legacyCalls, 0, 'Fresh SQL viewport bypasses giant legacy catalog build');
  assert.deepEqual(sqlResult.vizual.i, [7]);
  assert.deepEqual(sqlResult.vizual.r, [2]);
  assert.deepEqual(sqlResult.vizual.l, [4]);
  assert.deepEqual(sqlResult.vizual.s, [3]);
  assert.equal(sqlResult.activeResourceCount, 80000);

  let staleLegacyCalls = 0;
  const staleSql = resursSaheXidmetiYarat({
    sqlAktivdir: () => true,
    sqlMetaAl: async () => ({ stateId: 1, fresh: false, coverageOk: true,
      provisionedCount: 80000, physicalCapacityReached: false }),
    sqlViewAl: async () => { throw new Error('Stale SQL must not be read'); },
    revisionAl: async () => '9',
    provider: async () => {
      staleLegacyCalls++;
      return { resources: [resource(9, 105, 105)], runtimeRevision: '9' };
    },
  });
  const staleResult = await staleSql(1, [], 1000, view);
  assert.equal(staleLegacyCalls, 1, 'Stale SQL automatically falls back to legacy provider');
  assert.deepEqual(staleResult.vizual.i, [9]);

  let coverageLegacyCalls = 0;
  const partialSql = resursSaheXidmetiYarat({
    sqlAktivdir: () => true,
    sqlMetaAl: async () => ({ stateId: 1, fresh: true, coverageOk: false,
      provisionedCount: 3000, physicalCapacityReached: false }),
    sqlViewAl: async () => { throw new Error('Partial SQL must not be read'); },
    revisionAl: async () => '10',
    provider: async () => {
      coverageLegacyCalls++;
      return { resources: [resource(10, 106, 106)], runtimeRevision: '10' };
    },
  });
  await partialSql(1, [], 1000, view);
  assert.equal(coverageLegacyCalls, 1, 'Incomplete SQL catalog falls back until full import/provision exists');

  const direct = sqlNeticesiniHazirla(
    { nodes: [{ index: 11, x: 101, y: 102, spawnSerial: 5 }], truncated: true },
    { stateId: 1, provisionedCount: 80000, physicalCapacityReached: false },
    80000,
    view,
    (_stateId, index) => ({ index, resourceId: 'fuel', level: 8 }),
  );
  assert.deepEqual(direct.vizual.r, [4]);
  assert.equal(direct.resourceViewTruncated, true);

  console.log('WorldV2 resource viewport SQL fast-path, fallback, bounds and cache tests OK');
}
module.exports = run();
