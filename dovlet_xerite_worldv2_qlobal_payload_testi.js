'use strict';

const assert = require('assert');

const {
  DOVLET_DOVR_MS,
  PREZIDENT_ACILMA_MS,
} = require('./dovlet_xerite_worldv2_lifecycle_adapteri');

const {
  qlobalDovletlerPayloadHazirla,
} = require('./dovlet_xerite_worldv2_qlobal_payload');

function test(basliq, funksiya) {
  try {
    funksiya();
    console.log(`✓ ${basliq}`);
  } catch (xeta) {
    console.error(`✗ ${basliq}`);
    throw xeta;
  }
}

function envIle(releaseTarixi, funksiya) {
  const evvelki = process.env.PLAY_MARKET_RELEASE_TARIXI;

  try {
    if (releaseTarixi === null) {
      delete process.env.PLAY_MARKET_RELEASE_TARIXI;
    } else {
      process.env.PLAY_MARKET_RELEASE_TARIXI = releaseTarixi;
    }
    funksiya();
  } finally {
    if (evvelki === undefined) {
      delete process.env.PLAY_MARKET_RELEASE_TARIXI;
    } else {
      process.env.PLAY_MARKET_RELEASE_TARIXI = evvelki;
    }
  }
}

const RELEASE_MS = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
const RELEASE_ISO = new Date(RELEASE_MS).toISOString();

test('Release günü yalnız Dövlət #1 və Qlobal layout V1 gəlir', () => {
  envIle(RELEASE_ISO, () => {
    const payload = qlobalDovletlerPayloadHazirla({ nowMs: RELEASE_MS });

    assert.strictEqual(payload.version, 2);
    assert.strictEqual(payload.onlyOpenedStates, true);
    assert.deepStrictEqual(payload.states.map(x => x.stateId), [1]);
    assert.deepStrictEqual(payload.layout, {
      layoutVersion: 1,
      coordinateSpace: 'normalized_0_1',
      origin: 'bottom_left',
      backgroundId: 'worldv2_qlobal_fon_v1',
      backgroundAspectRatio: 9 / 16,
      capacity: 91,
    });
    assert.deepStrictEqual(payload.connections, []);

    const node = payload.states[0].globalNode;
    assert.ok(node);
    assert.strictEqual(node.nodeId, 'qlobal_v1_node_001');
    assert.ok(node.normalizedX >= 0 && node.normalizedX <= 1);
    assert.ok(node.normalizedY >= 0 && node.normalizedY <= 1);
  });
});

test('60 gündən sonra Dövlət #1 və #2 server node-ları ilə gəlir', () => {
  envIle(RELEASE_ISO, () => {
    const now = RELEASE_MS + DOVLET_DOVR_MS;
    const payload = qlobalDovletlerPayloadHazirla({ nowMs: now });

    assert.deepStrictEqual(payload.states.map(x => x.stateId), [1, 2]);
    assert.strictEqual(payload.states.every(x => x.opened === true), true);
    assert.strictEqual(payload.states.every(x => x.globalNode != null), true);
    assert.strictEqual(payload.states.every(x => Number.isFinite(x.globalNode.normalizedX)), true);
    assert.strictEqual(payload.states.every(x => Number.isFinite(x.globalNode.normalizedY)), true);

    for (const elage of payload.connections) {
      assert.ok([1, 2].includes(elage.fromStateId));
      assert.ok([1, 2].includes(elage.toStateId));
    }
  });
});

test('Gələcək bağlı Dövlət metadata-da olsa belə Qlobal siyahı və əlaqəyə salınmır', () => {
  envIle(RELEASE_ISO, () => {
    const now = RELEASE_MS + DOVLET_DOVR_MS;
    const payload = qlobalDovletlerPayloadHazirla({
      nowMs: now,
      metadata: [
        { stateId: 1, flagId: 'az_1' },
        { stateId: 2, flagId: 'az_2' },
        { stateId: 3, flagId: 'gelecek' },
      ],
    });

    assert.deepStrictEqual(payload.states.map(x => x.stateId), [1, 2]);
    assert.strictEqual(payload.states.some(x => x.stateId === 3), false);
    assert.strictEqual(
      payload.connections.some(x => x.fromStateId === 3 || x.toStateId === 3),
      false,
    );
  });
});

test('Real metadata Prezident, ittifaq, ad və bayrağı əlavə edir; layout node serverdən qalır', () => {
  envIle(RELEASE_ISO, () => {
    const payload = qlobalDovletlerPayloadHazirla({
      nowMs: RELEASE_MS,
      metadata: [{
        stateId: 1,
        displayName: 'Dövlət 1',
        presidentPlayerId: 'oyuncu_99',
        presidentAllianceId: 'ittifaq_7',
        presidentUnlocked: true,
        presidentOccupiedAtMs: RELEASE_MS + 5000,
        flagId: 'bayraq_1',
        globalNode: { nodeId: 'kohne_node' },
      }],
    });

    const state = payload.states[0];
    assert.strictEqual(state.stateId, 1);
    assert.strictEqual(state.opened, true);
    assert.strictEqual(state.stateOpenedAtMs, RELEASE_MS);
    assert.strictEqual(state.presidentUnlockAtMs, RELEASE_MS + PREZIDENT_ACILMA_MS);
    assert.strictEqual(state.displayName, 'Dövlət 1');
    assert.strictEqual(state.presidentPlayerId, 'oyuncu_99');
    assert.strictEqual(state.presidentAllianceId, 'ittifaq_7');
    assert.strictEqual(state.presidentUnlocked, true);
    assert.strictEqual(state.presidentOccupiedAtMs, RELEASE_MS + 5000);
    assert.strictEqual(state.flagId, 'bayraq_1');
    assert.strictEqual(state.globalNode.nodeId, 'qlobal_v1_node_001');
    assert.ok(Number.isFinite(state.globalNode.normalizedX));
    assert.ok(Number.isFinite(state.globalNode.normalizedY));
  });
});

test('Metadata yoxdursa Prezident/ad/bayraq uydurulmur, yalnız layout node verilir', () => {
  envIle(RELEASE_ISO, () => {
    const payload = qlobalDovletlerPayloadHazirla({ nowMs: RELEASE_MS });
    const state = payload.states[0];

    assert.strictEqual(state.displayName, null);
    assert.strictEqual(state.presidentPlayerId, null);
    assert.strictEqual(state.presidentAllianceId, null);
    assert.strictEqual(state.presidentUnlocked, null);
    assert.strictEqual(state.presidentOccupiedAtMs, null);
    assert.strictEqual(state.flagId, null);
    assert.ok(state.globalNode);
    assert.strictEqual(state.globalNode.nodeId, 'qlobal_v1_node_001');
  });
});

test('Metadata Qlobal node-u üçün yarımçıq normalized koordinat rədd edilir', () => {
  envIle(RELEASE_ISO, () => {
    assert.throws(() => qlobalDovletlerPayloadHazirla({
      nowMs: RELEASE_MS,
      metadata: [{
        stateId: 1,
        globalNode: {
          nodeId: 'metadata_node',
          normalizedX: 0.5,
        },
      }],
    }));
  });
});

test('Metadata Qlobal node normalized koordinatı 0..1 xaricində ola bilməz', () => {
  envIle(RELEASE_ISO, () => {
    assert.throws(() => qlobalDovletlerPayloadHazirla({
      nowMs: RELEASE_MS,
      metadata: [{
        stateId: 1,
        globalNode: {
          nodeId: 'metadata_node',
          normalizedX: 1.5,
          normalizedY: 0.5,
        },
      }],
    }));
  });
});

test('Təkrarlanan State metadata-sı rədd edilir', () => {
  envIle(RELEASE_ISO, () => {
    assert.throws(() => qlobalDovletlerPayloadHazirla({
      nowMs: RELEASE_MS,
      metadata: [
        { stateId: 1 },
        { stateId: 1 },
      ],
    }));
  });
});

test('Release env yoxdursa legacy fallback yalnız Dövlət #1-dir, layout yenə mövcuddur', () => {
  envIle(null, () => {
    const payload = qlobalDovletlerPayloadHazirla({ nowMs: RELEASE_MS });

    assert.deepStrictEqual(payload.states.map(x => x.stateId), [1]);
    assert.strictEqual(payload.states[0].stateOpenedAtMs, null);
    assert.strictEqual(payload.states[0].presidentUnlockAtMs, null);
    assert.ok(payload.states[0].globalNode);
    assert.strictEqual(payload.layout.layoutVersion, 1);
    assert.strictEqual(payload.layout.origin, 'bottom_left');
    assert.strictEqual(payload.layout.backgroundAspectRatio, 9 / 16);
  });
});

test('Etibarsız server vaxtı rədd edilir', () => {
  envIle(RELEASE_ISO, () => {
    assert.throws(() => qlobalDovletlerPayloadHazirla({ nowMs: Number.NaN }));
    assert.throws(() => qlobalDovletlerPayloadHazirla({ nowMs: -1 }));
  });
});

console.log('\nWorldV2 Qlobal Dövlətlər payload testləri uğurla tamamlandı.');
