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

test('Release günü Qlobal xəritədə yalnız Dövlət #1 olur', () => {
  envIle(RELEASE_ISO, () => {
    const payload = qlobalDovletlerPayloadHazirla({ nowMs: RELEASE_MS });

    assert.strictEqual(payload.version, 2);
    assert.strictEqual(payload.onlyOpenedStates, true);
    assert.deepStrictEqual(payload.states.map(x => x.stateId), [1]);
  });
});

test('60 gündən sonra Qlobal xəritədə Dövlət #1 və #2 olur', () => {
  envIle(RELEASE_ISO, () => {
    const now = RELEASE_MS + DOVLET_DOVR_MS;
    const payload = qlobalDovletlerPayloadHazirla({ nowMs: now });

    assert.deepStrictEqual(payload.states.map(x => x.stateId), [1, 2]);
    assert.strictEqual(payload.states.every(x => x.opened === true), true);
  });
});

test('Gələcək bağlı Dövlət metadata-da olsa belə Qlobal siyahıya salınmır', () => {
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
  });
});

test('Real metadata veriləndə Prezident, ittifaq, ad, bayraq və node əlavə olunur', () => {
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
        globalNode: { nodeId: 'qlobal_node_01' },
      }],
    });

    assert.deepStrictEqual(payload.states[0], {
      stateId: 1,
      opened: true,
      stateOpenedAtMs: RELEASE_MS,
      presidentUnlockAtMs: RELEASE_MS + PREZIDENT_ACILMA_MS,
      displayName: 'Dövlət 1',
      presidentPlayerId: 'oyuncu_99',
      presidentAllianceId: 'ittifaq_7',
      presidentUnlocked: true,
      presidentOccupiedAtMs: RELEASE_MS + 5000,
      flagId: 'bayraq_1',
      globalNode: { nodeId: 'qlobal_node_01' },
    });
  });
});

test('Metadata yoxdursa naməlum Prezident/ad/bayraq/node uydurulmur', () => {
  envIle(RELEASE_ISO, () => {
    const payload = qlobalDovletlerPayloadHazirla({ nowMs: RELEASE_MS });
    const state = payload.states[0];

    assert.strictEqual(state.displayName, null);
    assert.strictEqual(state.presidentPlayerId, null);
    assert.strictEqual(state.presidentAllianceId, null);
    assert.strictEqual(state.presidentUnlocked, null);
    assert.strictEqual(state.presidentOccupiedAtMs, null);
    assert.strictEqual(state.flagId, null);
    assert.strictEqual(state.globalNode, null);
  });
});

test('Qlobal node üçün koordinat uydurulmur, stabil nodeId tələb olunur', () => {
  envIle(RELEASE_ISO, () => {
    assert.throws(() => qlobalDovletlerPayloadHazirla({
      nowMs: RELEASE_MS,
      metadata: [{
        stateId: 1,
        globalNode: { x: 100, y: 200 },
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

test('Release env yoxdursa legacy fallback Qlobal xəritədə yalnız Dövlət #1-dir', () => {
  envIle(null, () => {
    const payload = qlobalDovletlerPayloadHazirla({ nowMs: RELEASE_MS });

    assert.deepStrictEqual(payload.states.map(x => x.stateId), [1]);
    assert.strictEqual(payload.states[0].stateOpenedAtMs, null);
    assert.strictEqual(payload.states[0].presidentUnlockAtMs, null);
  });
});

test('Etibarsız server vaxtı rədd edilir', () => {
  envIle(RELEASE_ISO, () => {
    assert.throws(() => qlobalDovletlerPayloadHazirla({ nowMs: Number.NaN }));
    assert.throws(() => qlobalDovletlerPayloadHazirla({ nowMs: -1 }));
  });
});

console.log('\nWorldV2 Qlobal Dövlətlər payload testləri uğurla tamamlandı.');
