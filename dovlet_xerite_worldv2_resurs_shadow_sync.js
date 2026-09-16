'use strict';

const {
  LEGACY_HADISE_NOVU,
  worldV2ResursSqlCedvelleriMovcuddurClient,
  worldV2ResursStateMetaAlClient,
  worldV2ResursNodeYazClient,
  worldV2ResursRevisionArtirClient,
} = require('./dovlet_xerite_worldv2_resurs_runtime_postgres');

const TARGET_REGEX = /^state_(\d+)_worldv2_resource_(\d+)_spawn_(\d+)$/;
const SAVEPOINT_ADI = 'worldv2_resurs_shadow_sync';

function tamEdedAl(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function sidAl(v) {
  return Math.max(1, tamEdedAl(v, 1));
}

function worldV2ResursShadowSyncAktivdir() {
  const deyer = String(process.env.WORLDV2_RESOURCE_SQL_SHADOW_SYNC || '').trim().toLowerCase();
  return deyer === '1' || deyer === 'true' || deyer === 'on' || deyer === 'yes';
}

function targetleriNodeMelumatinaCevir(stateId, targetIds) {
  const sid = sidAl(stateId);
  const netice = new Map();
  for (const raw of Array.isArray(targetIds) ? targetIds : []) {
    const targetId = String(raw || '').trim().toLowerCase();
    const match = targetId.match(TARGET_REGEX);
    if (!match || Number(match[1]) !== sid) continue;
    const index = Math.max(1, tamEdedAl(match[2], 1));
    const nodeId = `state_${sid}_worldv2_resource_${index}`;
    netice.set(nodeId, { nodeId, index, targetId });
  }
  return Array.from(netice.values());
}

async function sonIkiLegacyAuditIdAlClient(client, stateId) {
  const sid = sidAl(stateId);
  const acar = `__dovlet_worldv2_resurs_${sid}__`;
  const netice = await client.query(
    `SELECT id
       FROM hesab_audit_jurnali
      WHERE oyuncu_id = $1 AND hadise_novu = $2
      ORDER BY id DESC
      LIMIT 2`,
    [acar, LEGACY_HADISE_NOVU],
  );
  const rows = (netice && netice.rows) || [];
  return {
    currentAuditId: rows[0] && rows[0].id != null ? String(rows[0].id) : null,
    previousAuditId: rows[1] && rows[1].id != null ? String(rows[1].id) : null,
  };
}

async function legacyNodlariAlClient(client, stateId, nodeIds) {
  const sid = sidAl(stateId);
  const acar = `__dovlet_worldv2_resurs_${sid}__`;
  const netice = await client.query(
    `WITH latest AS (
       SELECT id, detallar
         FROM hesab_audit_jurnali
        WHERE oyuncu_id = $1 AND hadise_novu = $2
        ORDER BY id DESC
        LIMIT 1
     )
     SELECT latest.id, q.node_id,
            latest.detallar #> ARRAY['runtime','nodes',q.node_id] AS node
       FROM latest
       CROSS JOIN UNNEST($3::text[]) AS q(node_id)`,
    [acar, LEGACY_HADISE_NOVU, nodeIds],
  );
  return (netice && netice.rows) || [];
}

async function savepointiTehlukesizBagla(client, geriAl = false) {
  if (geriAl) {
    try { await client.query(`ROLLBACK TO SAVEPOINT ${SAVEPOINT_ADI}`); } catch (_) {}
  }
  try { await client.query(`RELEASE SAVEPOINT ${SAVEPOINT_ADI}`); } catch (_) {}
}

async function worldV2ResursShadowSyncEtClient(client, stateId, targetIds) {
  const sid = sidAl(stateId);
  const hedefler = targetleriNodeMelumatinaCevir(sid, targetIds);
  if (!worldV2ResursShadowSyncAktivdir()) {
    return { synced: false, reason: 'disabled', stateId: sid };
  }
  if (!client || typeof client.query !== 'function') {
    return { synced: false, reason: 'client_missing', stateId: sid };
  }
  if (hedefler.length === 0) {
    return { synced: false, reason: 'no_targets', stateId: sid };
  }

  await client.query(`SAVEPOINT ${SAVEPOINT_ADI}`);
  try {
    const cedvellerVar = await worldV2ResursSqlCedvelleriMovcuddurClient(client);
    if (!cedvellerVar) {
      await savepointiTehlukesizBagla(client, false);
      return { synced: false, reason: 'schema_missing', stateId: sid };
    }

    const audit = await sonIkiLegacyAuditIdAlClient(client, sid);
    const meta = await worldV2ResursStateMetaAlClient(client, sid);
    if (!audit.currentAuditId || !meta || !meta.legacyAuditId) {
      await savepointiTehlukesizBagla(client, false);
      return { synced: false, reason: 'not_imported', stateId: sid };
    }

    if (String(meta.legacyAuditId) === String(audit.currentAuditId)) {
      await savepointiTehlukesizBagla(client, false);
      return { synced: true, reason: 'already_fresh', stateId: sid, legacyAuditId: audit.currentAuditId };
    }

    if (!audit.previousAuditId || String(meta.legacyAuditId) !== String(audit.previousAuditId)) {
      await savepointiTehlukesizBagla(client, false);
      return {
        synced: false,
        reason: 'continuity_lost',
        stateId: sid,
        sqlLegacyAuditId: String(meta.legacyAuditId),
        previousAuditId: audit.previousAuditId,
        currentAuditId: audit.currentAuditId,
      };
    }

    const nodeIds = hedefler.map(h => h.nodeId);
    const rows = await legacyNodlariAlClient(client, sid, nodeIds);
    const rowMap = new Map(rows.map(row => [String(row.node_id || ''), row]));
    const eksikler = hedefler.filter(h => {
      const row = rowMap.get(h.nodeId);
      return !row || !row.node || typeof row.node !== 'object' || Array.isArray(row.node);
    });
    if (eksikler.length > 0) {
      await savepointiTehlukesizBagla(client, false);
      return { synced: false, reason: 'legacy_node_missing', stateId: sid, missingCount: eksikler.length };
    }

    for (const hedef of hedefler) {
      const node = rowMap.get(hedef.nodeId).node;
      await worldV2ResursNodeYazClient(client, sid, hedef.index, node);
    }

    const revision = await worldV2ResursRevisionArtirClient(client, sid, {
      legacyAuditId: audit.currentAuditId,
    });
    await savepointiTehlukesizBagla(client, false);
    return {
      synced: true,
      reason: 'updated',
      stateId: sid,
      syncedCount: hedefler.length,
      revision,
      legacyAuditId: audit.currentAuditId,
    };
  } catch (xeta) {
    await savepointiTehlukesizBagla(client, true);
    return {
      synced: false,
      reason: 'error',
      stateId: sid,
      message: xeta && xeta.message ? String(xeta.message).slice(0, 220) : 'shadow sync error',
    };
  }
}

module.exports = {
  TARGET_REGEX,
  worldV2ResursShadowSyncAktivdir,
  targetleriNodeMelumatinaCevir,
  worldV2ResursShadowSyncEtClient,
};
