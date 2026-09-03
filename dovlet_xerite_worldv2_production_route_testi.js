'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function run() {
  const routeMetni = fs.readFileSync(
    path.join(__dirname, 'server_missiya_genisletme_v2.js'),
    'utf8',
  );

  const telebOlunanHandlerler = [
    'dovletXeriteWorldV2InfoProductionMesajiniEmalEt',
    'dovletXeriteWorldV2TeleportMesajiniEmalEt',
    'dovletXeriteWorldV2ObyektProductionMesajiniEmalEt',
    'dovletXeriteWorldV2BaxisProductionMesajiniEmalEt',
    'dovletXeriteWorldV2QlobalProductionMesajiniEmalEt',
  ];

  for (const handlerAdi of telebOlunanHandlerler) {
    assert.ok(
      routeMetni.includes(handlerAdi),
      `Production gameplay zəncirində ${handlerAdi} mövcud olmalıdır.`,
    );
    assert.ok(
      routeMetni.includes(`await ${handlerAdi}(kontekst)`),
      `Production gameplay zəncirində ${handlerAdi} çağırılmalıdır.`,
    );
  }

  assert.ok(routeMetni.includes('runtimeTopologiyaXeritesiniAl'),
    'Production route vahid WorldV2 runtime topologiya provider-i istifadə etməlidir.');
  assert.ok(routeMetni.includes('worldV2RuntimeTopologiyaXeritesi = runtimeTopologiyaXeritesiniAl()'),
    'WorldV2 runtime topologiyası bir dəfə alınmalı və paylaşılmalıdır.');

  assert.ok(routeMetni.includes('runtimeDovletMetadatasiniAl'),
    'Production route WorldV2 Dövlət metadata provider-i istifadə etməlidir.');
  assert.ok(routeMetni.includes('metadataAl: runtimeDovletMetadatasiniAl'),
    'Global handler explicit runtime metadata provider-i almalıdır.');

  const factoryler = [
    'worldV2InfoProductionHandleriYarat',
    'worldV2BaxisProductionHandleriYarat',
    'worldV2QlobalProductionHandleriYarat',
  ];
  for (const factoryAdi of factoryler) {
    assert.ok(routeMetni.includes(factoryAdi), `${factoryAdi} production route-da istifadə olunmalıdır.`);
  }

  const topologyInjectionCount = (
    routeMetni.match(/topologiyaXeritesi:\s*worldV2RuntimeTopologiyaXeritesi/g) || []
  ).length;
  assert.strictEqual(topologyInjectionCount, 3,
    'Near, Far/View və Global handler-lərinin üçü də eyni runtime topology Map-i almalıdır.');

  const readOnlyMesajlar = [
    'state_map_v2_info_request',
    'state_map_v2_objects_request',
    'state_map_v2_view_request',
    'state_map_v2_view_objects_request',
    'state_map_v2_president_focus_request',
    'state_map_v2_home_request',
    'state_map_v2_border_transition_request',
    'global_states_v2_request',
    'global_states_v2_search_request',
  ];

  const mutasiyaSetiBaslangici = routeMetni.indexOf('const OYUNCU_MUTASIYA_MESAJLARI = new Set([');
  const mutasiyaSetiSonu = routeMetni.indexOf(']);', mutasiyaSetiBaslangici);
  assert.ok(mutasiyaSetiBaslangici >= 0 && mutasiyaSetiSonu > mutasiyaSetiBaslangici,
    'OYUNCU_MUTASIYA_MESAJLARI set-i tapılmalıdır.');

  const mutasiyaSetiMetni = routeMetni.slice(mutasiyaSetiBaslangici, mutasiyaSetiSonu);
  for (const mesajType of readOnlyMesajlar) {
    assert.ok(
      !mutasiyaSetiMetni.includes(`"${mesajType}"`) && !mutasiyaSetiMetni.includes(`'${mesajType}'`),
      `${mesajType} read-only qalmalı və player mutasiya kilidinə salınmamalıdır.`,
    );
  }

  assert.ok(
    mutasiyaSetiMetni.includes('"state_map_v2_base_teleport_request"'),
    'WorldV2 baza teleportu player mutation kilidində işləməlidir.',
  );

  console.log('✓ WorldV2 production route wiring testi keçdi');
}

module.exports = run();
