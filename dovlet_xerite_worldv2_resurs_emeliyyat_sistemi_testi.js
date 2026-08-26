'use strict';

const assert = require('assert');

const {
  worldV2ResursTargetIdDirmi,
  worldV2ResursTargetiniParcala,
  worldV2ResursHedefiniAlClient,
  worldV2ResursuRezervEtClient,
  worldV2ResursToplamaniBitirClient,
} = require('./dovlet_xerite_worldv2_resurs_emeliyyat_sistemi');

function kopyala(v) {
  return v == null ? v : JSON.parse(JSON.stringify(v));
}

function saxtaClientYarat(ilkinRuntime) {
  let runtime = kopyala(ilkinRuntime);

  return {
    runtimeAl() {
      return kopyala(runtime);
    },

    runtimeQur(yeniRuntime) {
      runtime = kopyala(yeniRuntime);
    },

    async query(sql, params = []) {
      const metn = String(sql || '');

      if (metn.includes('pg_advisory_xact_lock')) {
        return { rows: [] };
      }

      if (metn.includes('SELECT detallar') && metn.includes('hesab_audit_jurnali')) {
        return {
          rows: runtime
            ? [{ detallar: { version: 2, runtime: kopyala(runtime) } }]
            : [],
        };
      }

      if (metn.includes('INSERT INTO hesab_audit_jurnali')) {
        const yazilan = JSON.parse(String(params[2] || '{}'));
        runtime = kopyala(yazilan.runtime);
        return { rows: [] };
      }

      if (metn.includes('DELETE FROM hesab_audit_jurnali')) {
        return { rows: [] };
      }

      throw new Error(`Saxta client tanımadığı SQL aldı: ${metn}`);
    },
  };
}

async function run() {
  const targetId = 'state_1_worldv2_resource_1_spawn_1';
  const nodeId = 'state_1_worldv2_resource_1';

  assert.strictEqual(worldV2ResursTargetIdDirmi(targetId), true);
  assert.strictEqual(worldV2ResursTargetIdDirmi('legacy_resource_1'), false);

  assert.deepStrictEqual(
    worldV2ResursTargetiniParcala(targetId),
    {
      targetId,
      stateId: 1,
      index: 1,
      spawnSerial: 1,
      nodeId,
    },
  );

  assert.strictEqual(
    worldV2ResursTargetiniParcala('state_1_worldv2_resource_99999_spawn_1'),
    null,
  );

  const client = saxtaClientYarat({
    version: 2,
    stateId: 1,
    nodes: {
      [nodeId]: {
        spawnSerial: 1,
        x: 1000,
        y: 600,
        remainingAmount: 100,
        occupiedByPlayerId: '',
        occupiedByConvoyId: '',
        occupiedUntilMs: 0,
        respawnAtMs: 0,
      },
    },
  });

  const now = 1770000000000;

  const bax = await worldV2ResursHedefiniAlClient(client, 1, targetId, now);
  assert.strictEqual(bax.success, true);
  assert.ok(bax.hedef);
  assert.strictEqual(bax.hedef.resourceSystem, 'worldv2');
  assert.strictEqual(bax.hedef.remainingAmount, 100);
  assert.strictEqual(bax.hedef.available, true);

  const sehvState = await worldV2ResursHedefiniAlClient(client, 2, targetId, now);
  assert.strictEqual(sehvState.success, false);
  assert.strictEqual(sehvState.errorCode, 'WORLDV2_RESOURCE_TARGET_INVALID');

  const rezerv = await worldV2ResursuRezervEtClient(client, {
    stateId: 1,
    targetId,
    playerId: 'p1',
    convoyId: 'c1',
    occupiedUntilMs: now + 60000,
    nowMs: now,
  });
  assert.strictEqual(rezerv.success, true);
  assert.strictEqual(rezerv.remainingAmount, 100);

  const ikinciRezerv = await worldV2ResursuRezervEtClient(client, {
    stateId: 1,
    targetId,
    playerId: 'p2',
    convoyId: 'c2',
    occupiedUntilMs: now + 60000,
    nowMs: now + 1,
  });
  assert.strictEqual(ikinciRezerv.success, false);
  assert.strictEqual(ikinciRezerv.errorCode, 'WORLDV2_RESOURCE_OCCUPIED');

  const ilkToplama = await worldV2ResursToplamaniBitirClient(client, {
    stateId: 1,
    targetId,
    playerId: 'p1',
    convoyId: 'c1',
    miqdar: 40,
    nowMs: now + 60000,
  });
  assert.strictEqual(ilkToplama.success, true);
  assert.strictEqual(ilkToplama.goturulen, 40);
  assert.strictEqual(ilkToplama.remainingAmount, 60);
  assert.strictEqual(ilkToplama.respawnAtMs, 0);

  const ikinciRezervOz = await worldV2ResursuRezervEtClient(client, {
    stateId: 1,
    targetId,
    playerId: 'p1',
    convoyId: 'c1',
    occupiedUntilMs: now + 120000,
    nowMs: now + 60001,
  });
  assert.strictEqual(ikinciRezervOz.success, true);

  const sonToplama = await worldV2ResursToplamaniBitirClient(client, {
    stateId: 1,
    targetId,
    playerId: 'p1',
    convoyId: 'c1',
    miqdar: 999999,
    nowMs: now + 120000,
  });
  assert.strictEqual(sonToplama.success, true);
  assert.strictEqual(sonToplama.goturulen, 60);
  assert.strictEqual(sonToplama.remainingAmount, 0);
  assert.ok(sonToplama.respawnAtMs > now + 120000);

  const tukenen = await worldV2ResursHedefiniAlClient(client, 1, targetId, now + 120001);
  assert.strictEqual(tukenen.success, false);
  assert.strictEqual(tukenen.errorCode, 'WORLDV2_RESOURCE_DEPLETED');

  const runtime = client.runtimeAl();
  runtime.nodes[nodeId] = {
    ...runtime.nodes[nodeId],
    spawnSerial: 2,
    remainingAmount: 100,
    respawnAtMs: 0,
  };
  client.runtimeQur(runtime);

  const kohneSpawn = await worldV2ResursHedefiniAlClient(client, 1, targetId, now + 130000);
  assert.strictEqual(kohneSpawn.success, false);
  assert.strictEqual(kohneSpawn.errorCode, 'WORLDV2_RESOURCE_STALE_TARGET');

  console.log('✓ WorldV2 transactional resurs əməliyyat testləri keçdi.');
}

module.exports = run();
