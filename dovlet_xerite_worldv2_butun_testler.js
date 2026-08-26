'use strict';

async function run() {
  console.log('=== WorldV2 Dövlət xəritəsi testləri başlayır ===\n');

  require('./dovlet_xerite_worldv2_qaydalari_testi');
  require('./dovlet_xerite_worldv2_payload_testi');
  require('./dovlet_xerite_worldv2_obyekt_payload_testi');
  require('./dovlet_xerite_worldv2_resurs_provider_testi');
  require('./dovlet_xerite_worldv2_lifecycle_adapteri_testi');
  require('./dovlet_xerite_worldv2_qlobal_layout_testi');
  require('./dovlet_xerite_worldv2_qlobal_payload_testi');
  require('./dovlet_xerite_worldv2_qlobal_axtaris_testi');
  require('./dovlet_xerite_worldv2_topologiya_testi');
  require('./dovlet_xerite_worldv2_topologiya_provider_testi');
  require('./dovlet_xerite_worldv2_metadata_provider_testi');
  require('./dovlet_xerite_worldv2_serhed_xidmeti_testi');
  require('./dovlet_xerite_worldv2_lod_qaydalari_testi');
  require('./dovlet_xerite_worldv2_baxis_naviqasiyasi_testi');
  require('./dovlet_xerite_worldv2_prezident_adapteri_testi');
  require('./dovlet_xerite_worldv2_runtime_metadata_testi');
  require('./dovlet_xerite_worldv2_runtime_guard_testi');
  require('./dovlet_xerite_worldv2_muqavile_testi');
  require('./dovlet_xerite_worldv2_server_unity_contract_testi');
  require('./dovlet_xerite_worldv2_izolyasiya_testi');
  require('./dovlet_xerite_worldv2_hazirliq_guard_testi');
  require('./dovlet_xerite_worldv2_aciq_meseleler_senedi_testi');
  require('./dovlet_xerite_worldv2_production_route_testi');

  await require('./dovlet_xerite_worldv2_handler_testi');
  await require('./dovlet_xerite_worldv2_obyekt_handler_testi');
  await require('./dovlet_xerite_worldv2_info_production_handler_testi');
  await require('./dovlet_xerite_worldv2_obyekt_production_handler_testi');
  await require('./dovlet_xerite_worldv2_qlobal_production_handler_testi');
  await require('./dovlet_xerite_worldv2_baxis_production_handler_testi');
  await require('./dovlet_xerite_worldv2_serhed_production_handler_testi');
  await require('./dovlet_xerite_worldv2_elfecin_handler_testi');
  await require('./dovlet_xerite_worldv2_invalid_direction_testi');

  console.log('\n=== WorldV2 Dövlət xəritəsi bütün testləri tamamlandı ===');
}

run().catch((xeta) => {
  console.error('\nWorldV2 test runner uğursuz oldu.');
  console.error(xeta);
  process.exitCode = 1;
});
