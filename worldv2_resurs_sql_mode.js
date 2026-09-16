'use strict';

const {
  worldV2ResursRuntimeModeAl,
  worldV2ResursSqlAuthoritativeEt,
} = require('./dovlet_xerite_worldv2_resurs_runtime_mode');

async function run() {
  const emr = String(process.argv[2] || '').trim().toLowerCase();
  const stateIds = process.argv.slice(3)
    .map(v => Math.trunc(Number(v)))
    .filter(v => Number.isInteger(v) && v > 0);
  if (!['status', 'enable'].includes(emr) || stateIds.length === 0) {
    console.error('İstifadə: node worldv2_resurs_sql_mode.js status <stateId...>');
    console.error('       node worldv2_resurs_sql_mode.js enable <stateId...>');
    process.exitCode = 2;
    return;
  }

  for (const stateId of stateIds) {
    if (emr === 'status') {
      const netice = await worldV2ResursRuntimeModeAl(stateId);
      console.log(JSON.stringify(netice));
      continue;
    }
    const netice = await worldV2ResursSqlAuthoritativeEt(stateId);
    console.log(JSON.stringify(netice));
  }
}

run().catch(xeta => {
  console.error(xeta && xeta.stack ? xeta.stack : xeta);
  process.exitCode = 1;
});
