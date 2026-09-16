'use strict';

const { proqramHovuzunuAl } = require('./verilenler_bazasi');
const {
  LEGACY_HADISE_NOVU,
  STATE_CEDVELI,
  worldV2ResursSqlCedvelleriMovcuddurClient,
} = require('./dovlet_xerite_worldv2_resurs_runtime_postgres');

const LEGACY_SHADOW = 'legacy_shadow';
const SQL_AUTHORITATIVE = 'sql_authoritative';
const DEFAULT_DENSE_COUNT = 80000;

function tamEdedAl(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function sidAl(v) {
  return Math.max(1, tamEdedAl(v, 1));
}

function envFlagAktivdir(ad) {
  const deyer = String(process.env[ad] || '').trim().toLowerCase();
  return deyer === '1' || deyer === 'true' || deyer === 'on' || deyer === 'yes';
}

function worldV2SqlMutasiyaFlagAktivdir() {
  return envFlagAktivdir('WORLDV2_RESOURCE_SQL_MUTATIONS');
}

function worldV2SqlViewportFlagAktivdir() {
  return envFlagAktivdir('WORLDV2_RESOURCE_SQL_VIEWPORT');
}

function denseCountAl() {
  const n = Number(process.env.WORLDV2_RESOURCE_DENSE_COUNT);
  return Number.isInteger(n) && n >= 600 && n <= 100000 ? n : DEFAULT_DENSE_COUNT;
}

function miqrasiyaYoxdurXetasi(xeta) {
  return !!(xeta && (xeta.code === '42703' || xeta.code === '42P01'));
}

async function worldV2ResursRuntimeModeAlClient(client, stateId) {
  const sid = sidAl(stateId);
  if (!client || typeof client.query !== 'function') {
    return { stateId: sid, migrationReady: false, runtimeMode: LEGACY_SHADOW };
  }
  try {
    const netice = await client.query(
      `SELECT state_id, runtime_mode, sql_authoritative_at,
              provisioned_count, physical_capacity_reached, revision, legacy_audit_id
         FROM ${STATE_CEDVELI}
        WHERE state_id = $1`,
      [sid],
    );
    const row = netice.rows && netice.rows[0];
    return {
      stateId: sid,
      migrationReady: true,
      runtimeMode: row && row.runtime_mode === SQL_AUTHORITATIVE ? SQL_AUTHORITATIVE : LEGACY_SHADOW,
      sqlAuthoritativeAt: row && row.sql_authoritative_at ? row.sql_authoritative_at : null,
      provisionedCount: Math.max(0, tamEdedAl(row && row.provisioned_count)),
      physicalCapacityReached: !!(row && row.physical_capacity_reached === true),
      revision: String(row && row.revision != null ? row.revision : '0'),
      legacyAuditId: row && row.legacy_audit_id != null ? String(row.legacy_audit_id) : '',
      exists: !!row,
    };
  } catch (xeta) {
    if (miqrasiyaYoxdurXetasi(xeta)) {
      return { stateId: sid, migrationReady: false, runtimeMode: LEGACY_SHADOW, exists: false };
    }
    throw xeta;
  }
}

async function worldV2ResursRuntimeModeAl(stateId) {
  const client = await proqramHovuzunuAl().connect();
  try {
    return await worldV2ResursRuntimeModeAlClient(client, stateId);
  } finally {
    client.release();
  }
}

async function activationVeziyyetiAlClient(client, stateId) {
  const sid = sidAl(stateId);
  const meta = await worldV2ResursRuntimeModeAlClient(client, sid);
  if (!meta.migrationReady || !meta.exists) {
    return { ...meta, fresh: false, coverageOk: false, currentAuditId: '' };
  }
  const acar = `__dovlet_worldv2_resurs_${sid}__`;
  const audit = await client.query(
    `SELECT id::text AS id
       FROM hesab_audit_jurnali
      WHERE oyuncu_id = $1 AND hadise_novu = $2
      ORDER BY id DESC LIMIT 1`,
    [acar, LEGACY_HADISE_NOVU],
  );
  const currentAuditId = String(audit.rows && audit.rows[0] && audit.rows[0].id || '');
  const hedef = denseCountAl();
  return {
    ...meta,
    currentAuditId,
    targetCount: hedef,
    fresh: !!meta.legacyAuditId && meta.legacyAuditId === currentAuditId,
    coverageOk: meta.provisionedCount >= hedef || meta.physicalCapacityReached === true,
  };
}

async function worldV2ResursSqlAuthoritativeEtClient(client, stateId) {
  const sid = sidAl(stateId);
  if (!worldV2SqlMutasiyaFlagAktivdir() || !worldV2SqlViewportFlagAktivdir()) {
    throw new Error('SQL authoritative keçid üçün WORLDV2_RESOURCE_SQL_MUTATIONS=1 və WORLDV2_RESOURCE_SQL_VIEWPORT=1 olmalıdır.');
  }
  const cedvellerVar = await worldV2ResursSqlCedvelleriMovcuddurClient(client);
  if (!cedvellerVar) throw new Error('WorldV2 SQL runtime cədvəlləri yoxdur.');

  await client.query(
    `SELECT pg_advisory_xact_lock(hashtext($1::text), $2::integer)`,
    [LEGACY_HADISE_NOVU, sid],
  );

  const veziyyet = await activationVeziyyetiAlClient(client, sid);
  if (!veziyyet.migrationReady) throw new Error('SQL authoritative mode miqrasiyası tətbiq edilməyib.');
  if (!veziyyet.fresh) throw new Error('SQL runtime legacy audit revision-la fresh deyil; əvvəl import/shadow-sync tamamlanmalıdır.');
  if (!veziyyet.coverageOk) {
    throw new Error(`SQL runtime coverage natamamdır: ${veziyyet.provisionedCount}/${veziyyet.targetCount}.`);
  }

  const netice = await client.query(
    `UPDATE ${STATE_CEDVELI}
        SET runtime_mode = $2,
            sql_authoritative_at = COALESCE(sql_authoritative_at, NOW()),
            revision = revision + 1,
            yenilenme_vaxti = NOW()
      WHERE state_id = $1
      RETURNING runtime_mode, revision, sql_authoritative_at`,
    [sid, SQL_AUTHORITATIVE],
  );
  const row = netice.rows && netice.rows[0];
  if (!row) throw new Error('WorldV2 SQL runtime state metadata tapılmadı.');
  return {
    success: true,
    stateId: sid,
    runtimeMode: row.runtime_mode,
    revision: String(row.revision),
    sqlAuthoritativeAt: row.sql_authoritative_at,
  };
}

async function worldV2ResursSqlAuthoritativeEt(stateId) {
  const client = await proqramHovuzunuAl().connect();
  try {
    await client.query('BEGIN');
    const netice = await worldV2ResursSqlAuthoritativeEtClient(client, stateId);
    await client.query('COMMIT');
    return netice;
  } catch (xeta) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw xeta;
  } finally {
    client.release();
  }
}

module.exports = {
  LEGACY_SHADOW,
  SQL_AUTHORITATIVE,
  worldV2SqlMutasiyaFlagAktivdir,
  worldV2SqlViewportFlagAktivdir,
  worldV2ResursRuntimeModeAlClient,
  worldV2ResursRuntimeModeAl,
  activationVeziyyetiAlClient,
  worldV2ResursSqlAuthoritativeEtClient,
  worldV2ResursSqlAuthoritativeEt,
};
