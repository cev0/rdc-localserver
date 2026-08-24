'use strict';

const {
  DOVLET_XERITESI_V2,
} = require('./dovlet_xerite_worldv2_qaydalari');

const EKS_ISTIQAMET = Object.freeze({
  simal: 'cenub',
  cenub: 'simal',
  serq: 'qerb',
  qerb: 'serq',
});

function dovletIdAl(deyer, sahəAdi = 'stateId') {
  if (deyer === null || deyer === undefined) {
    return null;
  }

  const reqem = Number(deyer);
  if (!Number.isFinite(reqem) || !Number.isInteger(reqem) || reqem <= 0) {
    throw new Error(`Etibarsız ${sahəAdi}: ${deyer}`);
  }

  return reqem;
}

function topologiyaSetriniHazirla(xam) {
  if (!xam || typeof xam !== 'object' || Array.isArray(xam)) {
    throw new Error('Dövlət topologiya elementi obyekt olmalıdır.');
  }

  const stateId = dovletIdAl(xam.stateId, 'stateId');
  if (stateId === null) {
    throw new Error('Dövlət topologiya elementi üçün stateId tələb olunur.');
  }

  const setr = { stateId };

  for (const istiqamet of DOVLET_XERITESI_V2.serhedIstiqametleri) {
    if (!Object.prototype.hasOwnProperty.call(xam, istiqamet)) {
      throw new Error(`State #${stateId} üçün istiqamət yoxdur: ${istiqamet}`);
    }

    const qonsuId = dovletIdAl(xam[istiqamet], `${istiqamet} qonşu State ID-si`);
    if (qonsuId === stateId) {
      throw new Error(`State #${stateId} özünə qonşu ola bilməz: ${istiqamet}`);
    }

    setr[istiqamet] = qonsuId;
  }

  return Object.freeze(setr);
}

/**
 * Tam Dövlət qonşuluq konfiqini yoxlayır.
 *
 * Qaydalar:
 * - Hər State yalnız bir dəfə olmalıdır.
 * - Dörd istiqamət də açıq şəkildə yazılmalıdır; qonşu yoxdursa null verilir.
 * - Referans verilən hər qonşu həmin konfiqdə mövcud olmalıdır.
 * - Qonşuluq qarşılıqlı olmalıdır:
 *   A.serq = B olduqda B.qerb = A olmalıdır və s.
 *
 * Bu modul heç bir real Dövlət ID/topologiya yaratmır.
 */
function topologiyaniYoxlaVeHazirla(xamTopologiya) {
  if (!Array.isArray(xamTopologiya) || xamTopologiya.length === 0) {
    throw new Error('WorldV2 Dövlət topologiyası boş olmayan massiv olmalıdır.');
  }

  const xerite = new Map();

  for (const xam of xamTopologiya) {
    const setr = topologiyaSetriniHazirla(xam);

    if (xerite.has(setr.stateId)) {
      throw new Error(`Təkrarlanan Dövlət topologiyası: State #${setr.stateId}`);
    }

    xerite.set(setr.stateId, setr);
  }

  for (const setr of xerite.values()) {
    for (const istiqamet of DOVLET_XERITESI_V2.serhedIstiqametleri) {
      const qonsuId = setr[istiqamet];
      if (qonsuId === null) continue;

      const qonsu = xerite.get(qonsuId);
      if (!qonsu) {
        throw new Error(
          `State #${setr.stateId} ${istiqamet} istiqamətində mövcud olmayan State #${qonsuId}-ə bağlanıb.`,
        );
      }

      const eksIstiqamet = EKS_ISTIQAMET[istiqamet];
      if (qonsu[eksIstiqamet] !== setr.stateId) {
        throw new Error(
          `Qarşılıqsız qonşuluq: State #${setr.stateId}.${istiqamet} = ${qonsuId}, ` +
          `amma State #${qonsuId}.${eksIstiqamet} = ${qonsu[eksIstiqamet]}.`,
        );
      }
    }
  }

  return xerite;
}

function dovletTopologiyasiniAl(topologiyaXeritesi, stateId) {
  if (!(topologiyaXeritesi instanceof Map)) {
    throw new Error('Hazırlanmış WorldV2 topologiya Map-i tələb olunur.');
  }

  const id = dovletIdAl(stateId, 'stateId');
  const setr = topologiyaXeritesi.get(id);
  if (!setr) {
    throw new Error(`WorldV2 topologiyasında State #${id} tapılmadı.`);
  }

  return {
    simal: setr.simal,
    serq: setr.serq,
    cenub: setr.cenub,
    qerb: setr.qerb,
  };
}

/**
 * Eyni authoritative topologiyadan Qlobal xəritə üçün unikal əlaqə cütləri yaradır.
 * Near sərhədləri, Far qonşu oxları və Global əlaqə xətləri bununla eyni mənbədən
 * qidalana bilər. Yalnız açılmış Dövlətlərin hər iki ucu payload-a daxil edilir.
 */
function topologiyadanQlobalElaqeleriHazirla(topologiyaXeritesi, acilmisStateIdler) {
  if (!(topologiyaXeritesi instanceof Map)) {
    throw new Error('Qlobal əlaqələr üçün hazırlanmış WorldV2 topologiya Map-i tələb olunur.');
  }
  if (!Array.isArray(acilmisStateIdler)) {
    throw new Error('Açılmış Dövlət ID-ləri massiv olmalıdır.');
  }

  const aciq = new Set(acilmisStateIdler.map(x => dovletIdAl(x, 'açılmış stateId')));
  const gorulen = new Set();
  const netice = [];

  for (const stateId of [...aciq].sort((a, b) => a - b)) {
    const setr = topologiyaXeritesi.get(stateId);
    if (!setr) continue;

    for (const istiqamet of DOVLET_XERITESI_V2.serhedIstiqametleri) {
      const qonsuId = setr[istiqamet];
      if (qonsuId === null || !aciq.has(qonsuId)) continue;

      const fromStateId = Math.min(stateId, qonsuId);
      const toStateId = Math.max(stateId, qonsuId);
      const acar = `${fromStateId}:${toStateId}`;
      if (gorulen.has(acar)) continue;
      gorulen.add(acar);

      netice.push({
        connectionId: `topologiya_${fromStateId}_${toStateId}`,
        fromStateId,
        toStateId,
      });
    }
  }

  netice.sort((a, b) => {
    if (a.fromStateId !== b.fromStateId) return a.fromStateId - b.fromStateId;
    return a.toStateId - b.toStateId;
  });

  return netice;
}

module.exports = {
  EKS_ISTIQAMET,
  dovletIdAl,
  topologiyaSetriniHazirla,
  topologiyaniYoxlaVeHazirla,
  dovletTopologiyasiniAl,
  topologiyadanQlobalElaqeleriHazirla,
};
