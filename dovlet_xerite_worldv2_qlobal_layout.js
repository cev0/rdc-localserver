'use strict';

/**
 * WorldV2 Qlobal xəritə layout V1.
 *
 * Bu layout statik fon şəkli üzərində Dövlət node-larının server-authoritative
 * yerləşimini müəyyən edir. Koordinatlar UI-dən asılı olmayan 0..1 normalized
 * sahədədir. V1 production-a çıxdıqdan sonra bu alqoritmin mövqeləri dəyişdirilməməlidir;
 * gələcək vizual dəyişiklik ayrıca layoutVersion ilə edilməlidir.
 *
 * 7 x 13 = 91 stabil slot var. 60 günlük Dövlət açılış intervalı ilə bu,
 * təxminən 15 illik yeni Dövlət açılışına kifayət edir.
 */

const QLOBAL_LAYOUT_VERSION = 1;
const QLOBAL_LAYOUT_KOORDINAT_SAHESI = 'normalized_0_1';
const QLOBAL_LAYOUT_FON_ID = 'worldv2_qlobal_fon_v1';

const SUTUN_SAYI = 7;
const SETIR_SAYI = 13;
const MERKEZ_SUTUN = Math.floor(SUTUN_SAYI / 2);
const MERKEZ_SETIR = Math.floor(SETIR_SAYI / 2);
const QLOBAL_LAYOUT_TUTUMU = SUTUN_SAYI * SETIR_SAYI;

function tamEdedYoxla(deyer, ad) {
  const reqem = Number(deyer);
  if (!Number.isInteger(reqem)) {
    throw new Error(`${ad} tam ədəd olmalıdır: ${deyer}`);
  }
  return reqem;
}

function dovletIdYoxla(stateId) {
  const id = tamEdedYoxla(stateId, 'Dövlət ID-si');
  if (id <= 0) {
    throw new Error(`Dövlət ID-si müsbət olmalıdır: ${stateId}`);
  }
  return id;
}

function ucReqemli(reqem) {
  return String(reqem).padStart(3, '0');
}

function clamp01(deyer) {
  return Math.max(0, Math.min(1, Number(deyer)));
}

function huceyreSiralamaAcariniHazirla(setir, sutun) {
  const dx = sutun - MERKEZ_SUTUN;
  const dy = setir - MERKEZ_SETIR;
  const mesafe = Math.abs(dx) + Math.abs(dy);

  // Mərkəzdən başlayıb halqa-halqa genişlənən sabit sıra.
  // Bucaq yalnız eyni Manhattan halqasındakı hüceyrələri deterministik sıralayır.
  const bucaq = Math.atan2(dy, dx);

  return { mesafe, bucaq, setir, sutun };
}

function huceyreleriDovletSirasinaSal() {
  const huceyreler = [];

  for (let setir = 0; setir < SETIR_SAYI; setir++) {
    for (let sutun = 0; sutun < SUTUN_SAYI; sutun++) {
      const acar = huceyreSiralamaAcariniHazirla(setir, sutun);
      huceyreler.push({ setir, sutun, ...acar });
    }
  }

  huceyreler.sort((a, b) => {
    if (a.mesafe !== b.mesafe) return a.mesafe - b.mesafe;
    if (a.bucaq !== b.bucaq) return a.bucaq - b.bucaq;
    if (a.setir !== b.setir) return a.setir - b.setir;
    return a.sutun - b.sutun;
  });

  return huceyreler;
}

function normalizedMovqeHazirla(setir, sutun) {
  const minX = 0.075;
  const maxX = 0.925;
  const minY = 0.045;
  const maxY = 0.955;

  const esasX = minX + ((maxX - minX) * sutun / Math.max(1, SUTUN_SAYI - 1));
  const esasY = minY + ((maxY - minY) * setir / Math.max(1, SETIR_SAYI - 1));

  // Referansdakı təbii yol şəbəkəsinə daha yaxın görünməsi üçün sərt kvadrat
  // hissini azaldan, lakin tam deterministik xırda yerdəyişmələr.
  const setirSurusmesi = setir % 2 === 0 ? -0.012 : 0.018;
  const jitterX = ((((setir * 17) + (sutun * 13)) % 5) - 2) * 0.004;
  const jitterY = ((((setir * 11) + (sutun * 19)) % 5) - 2) * 0.003;

  return {
    normalizedX: Number(clamp01(esasX + setirSurusmesi + jitterX).toFixed(6)),
    normalizedY: Number(clamp01(esasY + jitterY).toFixed(6)),
  };
}

function layoutNodeLariHazirla() {
  const huceyreler = huceyreleriDovletSirasinaSal();

  return huceyreler.map((huceyre, indeks) => {
    const stateId = indeks + 1;
    const movqe = normalizedMovqeHazirla(huceyre.setir, huceyre.sutun);

    return Object.freeze({
      stateId,
      nodeId: `qlobal_v1_node_${ucReqemli(stateId)}`,
      normalizedX: movqe.normalizedX,
      normalizedY: movqe.normalizedY,
      setir: huceyre.setir,
      sutun: huceyre.sutun,
    });
  });
}

const QLOBAL_LAYOUT_NODELARI = Object.freeze(layoutNodeLariHazirla());
const NODE_STATE_ID_XERITESI = new Map(
  QLOBAL_LAYOUT_NODELARI.map(node => [`${node.setir}:${node.sutun}`, node.stateId]),
);

function dovletUcunQlobalNodeAl(stateId) {
  const id = dovletIdYoxla(stateId);
  if (id > QLOBAL_LAYOUT_NODELARI.length) return null;

  const node = QLOBAL_LAYOUT_NODELARI[id - 1];
  return {
    nodeId: node.nodeId,
    normalizedX: node.normalizedX,
    normalizedY: node.normalizedY,
  };
}

function elaqeAcariniHazirla(a, b) {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return `${min}:${max}`;
}

function butunQlobalElaqeleriHazirla() {
  const netice = [];
  const gorulen = new Set();

  // Yalnız sağ, aşağı və iki aşağı diaqonal istiqaməti yoxlanılır;
  // bununla hər cüt bir dəfə yaradılır və xəritə şəbəkə kimi qalır.
  const istiqametler = [
    [0, 1],
    [1, 0],
    [1, -1],
    [1, 1],
  ];

  for (const node of QLOBAL_LAYOUT_NODELARI) {
    for (const [dr, dc] of istiqametler) {
      const qonsuStateId = NODE_STATE_ID_XERITESI.get(
        `${node.setir + dr}:${node.sutun + dc}`,
      );

      if (!qonsuStateId || qonsuStateId === node.stateId) continue;

      const acar = elaqeAcariniHazirla(node.stateId, qonsuStateId);
      if (gorulen.has(acar)) continue;
      gorulen.add(acar);

      const fromStateId = Math.min(node.stateId, qonsuStateId);
      const toStateId = Math.max(node.stateId, qonsuStateId);
      const fromNode = QLOBAL_LAYOUT_NODELARI[fromStateId - 1];
      const toNode = QLOBAL_LAYOUT_NODELARI[toStateId - 1];

      netice.push(Object.freeze({
        connectionId: `qlobal_v1_elage_${ucReqemli(fromStateId)}_${ucReqemli(toStateId)}`,
        fromStateId,
        toStateId,
        fromNodeId: fromNode.nodeId,
        toNodeId: toNode.nodeId,
      }));
    }
  }

  netice.sort((a, b) => {
    if (a.fromStateId !== b.fromStateId) return a.fromStateId - b.fromStateId;
    return a.toStateId - b.toStateId;
  });

  return Object.freeze(netice);
}

const QLOBAL_LAYOUT_ELAQELERI = butunQlobalElaqeleriHazirla();

function acilmisDovletElageleriniHazirla(acilmisStateIdler) {
  if (!Array.isArray(acilmisStateIdler)) {
    throw new Error('Açılmış Dövlət ID-ləri massiv olmalıdır.');
  }

  const aciq = new Set();
  for (const xam of acilmisStateIdler) {
    const id = dovletIdYoxla(xam);
    aciq.add(id);
  }

  return QLOBAL_LAYOUT_ELAQELERI
    .filter(elage => aciq.has(elage.fromStateId) && aciq.has(elage.toStateId))
    .map(elage => ({ ...elage }));
}

function qlobalLayoutMelumatiniHazirla() {
  return {
    layoutVersion: QLOBAL_LAYOUT_VERSION,
    coordinateSpace: QLOBAL_LAYOUT_KOORDINAT_SAHESI,
    backgroundId: QLOBAL_LAYOUT_FON_ID,
    capacity: QLOBAL_LAYOUT_TUTUMU,
  };
}

module.exports = {
  QLOBAL_LAYOUT_VERSION,
  QLOBAL_LAYOUT_KOORDINAT_SAHESI,
  QLOBAL_LAYOUT_FON_ID,
  QLOBAL_LAYOUT_TUTUMU,
  QLOBAL_LAYOUT_NODELARI,
  QLOBAL_LAYOUT_ELAQELERI,
  dovletUcunQlobalNodeAl,
  acilmisDovletElageleriniHazirla,
  qlobalLayoutMelumatiniHazirla,
};
