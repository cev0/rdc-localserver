'use strict';

const assert = require('assert');
const {
  WORLDV2_METADATA_ENV,
  envMetniniAl,
  dovletMetadatasiniEnvDenHazirla,
} = require('./dovlet_xerite_worldv2_metadata_provider');

function test(basliq, funksiya) {
  try {
    funksiya();
    console.log(`✓ ${basliq}`);
  } catch (xeta) {
    console.error(`✗ ${basliq}`);
    throw xeta;
  }
}

test('Metadata konfiqi yoxdursa boş siyahı qaytarılır', () => {
  assert.strictEqual(envMetniniAl({}), '');
  assert.deepStrictEqual(dovletMetadatasiniEnvDenHazirla({}), []);
});

test('Explicit Prezident adı, bayraq və node normallaşdırılır', () => {
  const env = {
    [WORLDV2_METADATA_ENV]: JSON.stringify([
      {
        stateId: 2,
        displayName: ' Dövlət 2 ',
        presidentPlayerId: 'player-2',
        presidentDisplayName: ' Prezident İki ',
        presidentAllianceId: 'alliance-2',
        presidentUnlocked: true,
        presidentOccupiedAtMs: 12345,
        flagId: 'flag_az',
        globalNode: {
          nodeId: 'state_2_custom',
          normalizedX: 0.25,
          normalizedY: 0.75,
        },
      },
      { stateId: 1 },
    ]),
  };

  const metadata = dovletMetadatasiniEnvDenHazirla(env);
  assert.deepStrictEqual(metadata.map(x => x.stateId), [1, 2]);
  assert.deepStrictEqual(metadata[1], {
    stateId: 2,
    displayName: 'Dövlət 2',
    presidentPlayerId: 'player-2',
    presidentDisplayName: 'Prezident İki',
    presidentAllianceId: 'alliance-2',
    presidentUnlocked: true,
    presidentOccupiedAtMs: 12345,
    flagId: 'flag_az',
    globalNode: {
      nodeId: 'state_2_custom',
      normalizedX: 0.25,
      normalizedY: 0.75,
    },
  });
});

test('Provider boş sahələri uydurmur', () => {
  const metadata = dovletMetadatasiniEnvDenHazirla({
    [WORLDV2_METADATA_ENV]: JSON.stringify([{ stateId: 1 }]),
  });

  assert.strictEqual(metadata[0].displayName, null);
  assert.strictEqual(metadata[0].presidentPlayerId, null);
  assert.strictEqual(metadata[0].presidentDisplayName, null);
  assert.strictEqual(metadata[0].flagId, null);
  assert.strictEqual(metadata[0].globalNode, null);
});

test('Etibarsız JSON fail-fast rədd edilir', () => {
  assert.throws(
    () => dovletMetadatasiniEnvDenHazirla({ [WORLDV2_METADATA_ENV]: '{' }),
    (xeta) => xeta && xeta.code === 'WORLDV2_METADATA_CONFIG_INVALID',
  );
});

test('Təkrarlanan State ID və etibarsız node fail-fast rədd edilir', () => {
  assert.throws(
    () => dovletMetadatasiniEnvDenHazirla({
      [WORLDV2_METADATA_ENV]: JSON.stringify([{ stateId: 1 }, { stateId: 1 }]),
    }),
    (xeta) => xeta && xeta.code === 'WORLDV2_METADATA_CONFIG_INVALID',
  );

  assert.throws(
    () => dovletMetadatasiniEnvDenHazirla({
      [WORLDV2_METADATA_ENV]: JSON.stringify([
        { stateId: 1, globalNode: { nodeId: 'x', normalizedX: 1.2, normalizedY: 0.5 } },
      ]),
    }),
    (xeta) => xeta && xeta.code === 'WORLDV2_METADATA_CONFIG_INVALID',
  );
});

console.log('\nWorldV2 metadata provider testləri uğurla tamamlandı.');
