'use strict';

async function run() {
  console.log('=== WorldV2 Dövlət xəritəsi testləri başlayır ===\n');

  require('./dovlet_xerite_worldv2_qaydalari_testi');
  require('./dovlet_xerite_worldv2_payload_testi');
  require('./dovlet_xerite_worldv2_lifecycle_adapteri_testi');
  require('./dovlet_xerite_worldv2_qlobal_payload_testi');
  require('./dovlet_xerite_worldv2_topologiya_testi');
  require('./dovlet_xerite_worldv2_serhed_xidmeti_testi');
  require('./dovlet_xerite_worldv2_lod_qaydalari_testi');
  require('./dovlet_xerite_worldv2_prezident_adapteri_testi');
  require('./dovlet_xerite_worldv2_runtime_metadata_testi');
  require('./dovlet_xerite_worldv2_muqavile_testi');

  await require('./dovlet_xerite_worldv2_handler_testi');

  console.log('\n=== WorldV2 Dövlət xəritəsi bütün testləri tamamlandı ===');
}

run().catch((xeta) => {
  console.error('\nWorldV2 test runner uğursuz oldu.');
  console.error(xeta);
  process.exitCode = 1;
});
