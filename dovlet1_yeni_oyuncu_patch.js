'use strict';

const fs = require('fs');
const path = require('path');

const YENI_OYUNCU_DOVLET_ID = 1;
const KOHNE_TEST_DOVLET_ID = 2;

function funksiyaBlokunuEvezEt(kod, funksiyaAdi, novbetiFunksiyaAdi, yeniBlok) {
  const baslangicAxtarisi = `function ${funksiyaAdi}(`;
  const baslangic = kod.indexOf(baslangicAxtarisi);
  if (baslangic < 0) {
    throw new Error(`[DOVLET1_PATCH] Funksiya tapılmadı: ${funksiyaAdi}`);
  }

  const sonAxtarisi = `\nfunction ${novbetiFunksiyaAdi}(`;
  const son = kod.indexOf(sonAxtarisi, baslangic);
  if (son < 0) {
    throw new Error(`[DOVLET1_PATCH] Növbəti funksiya tapılmadı: ${novbetiFunksiyaAdi}`);
  }

  return kod.slice(0, baslangic) + yeniBlok.trimEnd() + '\n' + kod.slice(son + 1);
}

function serverKodunuDovlet1UcunHazirla(kod) {
  if (typeof kod !== 'string' || !kod.trim()) {
    throw new Error('[DOVLET1_PATCH] server.js məzmunu boşdur.');
  }

  let netice = kod;

  netice = funksiyaBlokunuEvezEt(
    netice,
    'getOrCreateActiveWorldStateForNewPlayers',
    'registerPlayerInWorldState',
    `function getOrCreateActiveWorldStateForNewPlayers() {
  ensureWorldRuntime();

  const birinciDovlet = getWorldStateRuntime(${YENI_OYUNCU_DOVLET_ID});
  if (!birinciDovlet) {
    throw new Error("Dövlət 1 runtime tapılmadı");
  }

  // Hazırkı gameplay mərhələsində bütün yeni hesablar Dövlət 1-də başlayır.
  // Dövlət 2 yalnız explicit inteqrasiya testi ilə ayrıca açıla bilər.
  worldRuntime.activeStateIdForNewPlayers = ${YENI_OYUNCU_DOVLET_ID};
  refreshWorldRuntimeFlags();
  return birinciDovlet;
}`
  );

  netice = funksiyaBlokunuEvezEt(
    netice,
    'ensurePlayerWorldPlacement',
    'occupyStateCenter',
    `function ensurePlayerWorldPlacement(state, playerId) {
  ensureWorldRuntime();

  let stateRuntime = null;
  let spawnInfo = null;
  let testDovletindenKocuruldu = false;

  const movcudStateId = Number(
    state && state.worldPlacement && state.worldPlacement.stateId
  );

  if (movcudStateId === ${KOHNE_TEST_DOVLET_ID}) {
    // Dövlət 2 əvvəlki məcburi inteqrasiya testindən qalan müvəqqəti state idi.
    // Həmin test hesablarını növbəti state bərpasında Dövlət 1-ə təhlükəsiz köçürürük.
    const kohneDovlet = getWorldStateRuntime(${KOHNE_TEST_DOVLET_ID});
    if (kohneDovlet && Array.isArray(kohneDovlet.playerIds)) {
      kohneDovlet.playerIds = kohneDovlet.playerIds.filter(id => id !== playerId);
    }

    stateRuntime = getWorldStateRuntime(${YENI_OYUNCU_DOVLET_ID});
    if (!stateRuntime) {
      stateRuntime = getOrCreateActiveWorldStateForNewPlayers();
    }

    // Eyni koordinatı kor-koranə daşımırıq; Dövlət 1-də başqa baza ilə toqquşmamaq
    // üçün server yeni təhlükəsiz spawn koordinatı seçir.
    spawnInfo = pickRandomSpawnForState(stateRuntime);
    testDovletindenKocuruldu = true;
  }
  else if (
    state &&
    state.worldPlacement &&
    Number.isInteger(movcudStateId)
  ) {
    stateRuntime = getWorldStateRuntime(movcudStateId);

    if (stateRuntime) {
      spawnInfo = {
        baseX: Number(state.worldPlacement.baseX),
        baseZ: Number(state.worldPlacement.baseZ),
        spawnZone: state.worldPlacement.spawnZone || "outer"
      };
    }
  }

  if (!stateRuntime) {
    stateRuntime = getOrCreateActiveWorldStateForNewPlayers();
  }

  if (!spawnInfo || !Number.isFinite(spawnInfo.baseX) || !Number.isFinite(spawnInfo.baseZ)) {
    spawnInfo = pickRandomSpawnForState(stateRuntime);
  }

  registerPlayerInWorldState(playerId, stateRuntime);
  applyWorldPlacementToPlayerState(state, stateRuntime, spawnInfo);

  if (testDovletindenKocuruldu) {
    updateServerTime(state);

    if (typeof dovletBazaKeshiniTemizle === "function") {
      dovletBazaKeshiniTemizle(${KOHNE_TEST_DOVLET_ID});
      dovletBazaKeshiniTemizle(${YENI_OYUNCU_DOVLET_ID});
    }

    if (typeof oyunStateIniYaddaSaxla === "function") {
      Promise.resolve(oyunStateIniYaddaSaxla(playerId, state)).catch(xeta => {
        console.error("[WORLDV2_STATE1_MIGRATION] Snapshot saxlanmadı:", {
          playerId,
          message: xeta && xeta.message ? xeta.message : String(xeta)
        });
      });
    }

    console.log("[WORLDV2_STATE1_MIGRATION]", {
      playerId,
      fromStateId: ${KOHNE_TEST_DOVLET_ID},
      toStateId: ${YENI_OYUNCU_DOVLET_ID},
      baseX: spawnInfo.baseX,
      baseZ: spawnInfo.baseZ
    });
  }

  // Yeni hesablar üçün aktiv state həmişə Dövlət 1 olaraq saxlanılır.
  getOrCreateActiveWorldStateForNewPlayers();
}`
  );

  return netice;
}

function dovlet1YeniOyuncuQaydasiniTetbiqEt() {
  const serverYolu = path.join(__dirname, 'server.js');
  const kohneKod = fs.readFileSync(serverYolu, 'utf8');
  const yeniKod = serverKodunuDovlet1UcunHazirla(kohneKod);

  if (yeniKod !== kohneKod) {
    fs.writeFileSync(serverYolu, yeniKod, 'utf8');
    console.log('[DOVLET1_PATCH] Yeni oyunçu Dövlət 1 qaydası aktiv edildi.');
  }
}

module.exports = {
  YENI_OYUNCU_DOVLET_ID,
  KOHNE_TEST_DOVLET_ID,
  serverKodunuDovlet1UcunHazirla,
  dovlet1YeniOyuncuQaydasiniTetbiqEt,
};
