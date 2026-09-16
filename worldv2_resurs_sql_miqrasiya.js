'use strict';

const { hovuzlariBagla } = require('./verilenler_bazasi');
const { worldV2LegacyRuntimePostgreseKocur } = require('./dovlet_xerite_worldv2_resurs_runtime_postgres');

function stateIdleriAl() {
  const argv = process.argv.slice(2);
  const env = String(process.env.WORLDV2_RESOURCE_MIGRATE_STATES || '')
    .split(',').map(v => v.trim()).filter(Boolean);
  const raw = argv.length ? argv : env;
  const ids = [...new Set(raw.map(Number).filter(v => Number.isInteger(v) && v > 0))];
  if (!ids.length) {
    throw new Error('Dövlət ID-si verilməyib. Məsələn: node worldv2_resurs_sql_miqrasiya.js 1 2');
  }
  return ids;
}

async function run() {
  const ids = stateIdleriAl();
  console.log('[WORLDV2 SQL MIG] Başlayır. Dövlətlər:', ids.join(', '));
  for (const stateId of ids) {
    const basla = Date.now();
    const netice = await worldV2LegacyRuntimePostgreseKocur(stateId, {
      batchSize: Number(process.env.WORLDV2_RESOURCE_MIGRATE_BATCH) || 750,
    });
    console.log(`[WORLDV2 SQL MIG] Dövlət ${stateId}: ${netice.importedCount} node, ${Date.now() - basla} ms`);
  }
  console.log('[WORLDV2 SQL MIG] Tamamlandı. Legacy audit məlumatı silinmədi.');
}

run()
  .catch(xeta => {
    console.error('[WORLDV2 SQL MIG] Uğursuz:', xeta && xeta.stack || xeta);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await hovuzlariBagla(); } catch (_) {}
  });
