'use strict';

const {
  DOVLET_XERITESI_V2,
  DOVLET_KECID_STATUSU,
  koordinatEtibarlidir,
  qonsuDovletMelumatiYarat,
  worldV2XeriteMelumatiYarat,
} = require('./dovlet_xerite_worldv2_qaydalari');

const WORLDV2_MESAJ_NOVLERI = Object.freeze({
  XERITE_MELUMATI_SORGU: 'state_map_v2_info_request',
  XERITE_MELUMATI_CAVAB: 'state_map_v2_info_result',
  OBYEKTLER_SORGU: 'state_map_v2_objects_request',
  OBYEKTLER_CAVAB: 'state_map_v2_objects_result',
  SERHED_KECIDI_SORGU: 'state_map_v2_border_transition_request',
  SERHED_KECIDI_CAVAB: 'state_map_v2_border_transition_result',
  QLOBAL_DOVLETLER_SORGU: 'global_states_v2_request',
  QLOBAL_DOVLETLER_CAVAB: 'global_states_v2_result',
});

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === 'string' ? deyer.trim().slice(0, maksimum) : '';
}

function musbetTamEdedAl(deyer) {
  const reqem = Number(deyer);
  if (!Number.isFinite(reqem)) return null;
  const tam = Math.trunc(reqem);
  return tam > 0 ? tam : null;
}

function dovletIdYoxla(stateId) {
  const id = musbetTamEdedAl(stateId);
  if (id === null) {
    throw new Error(`Etibarsız Dövlət ID-si: ${stateId}`);
  }
  return id;
}

/**
 * Persistent server state-də mövcud sahələr baseX/baseZ-dir.
 * WorldV2 şəbəkə müqaviləsində isə xəritə koordinatı x/y adlandırılır.
 * Bu adapter DB/state sahələrini rename etmədən həmin çevirməni edir:
 *
 * persistent baseX -> protocol x
 * persistent baseZ -> protocol y
 * protocol y       -> Unity world z
 */
function bazaKoordinatiniProtokolaCevir(baseX, baseZ) {
  const x = Number(baseX);
  const y = Number(baseZ);

  if (!koordinatEtibarlidir(x, y)) {
    throw new Error(`Baza koordinatı WorldV2 sərhədindən kənardır: ${baseX}:${baseZ}`);
  }

  return { x, y };
}

function qonsulariHazirla(qonsular) {
  if (!qonsular || typeof qonsular !== 'object' || Array.isArray(qonsular)) {
    throw new Error('WorldV2 qonşu Dövlət məlumatları tələb olunur.');
  }

  const netice = {};

  for (const istiqamet of DOVLET_XERITESI_V2.serhedIstiqametleri) {
    const xam = qonsular[istiqamet];
    if (!xam || typeof xam !== 'object' || Array.isArray(xam)) {
      throw new Error(`Qonşu Dövlət məlumatı yoxdur: ${istiqamet}`);
    }

    netice[istiqamet] = qonsuDovletMelumatiYarat({
      istiqamet,
      stateId: xam.stateId == null ? null : xam.stateId,
      status: xam.status,
    });
  }

  return netice;
}

function prezidentStatusunuHazirla(prezident) {
  const xam = prezident && typeof prezident === 'object' ? prezident : {};
  const unlocked = xam.unlocked === true;

  return {
    unlocked,
    active: unlocked && xam.active === true,
    presidentPlayerId: metnAl(xam.presidentPlayerId, 128) || null,
    presidentAllianceId: metnAl(xam.presidentAllianceId, 128) || null,
    unlockAtUnixMs: Number.isFinite(Number(xam.unlockAtUnixMs))
      ? Math.max(0, Math.trunc(Number(xam.unlockAtUnixMs)))
      : null,
  };
}

/**
 * Unity WorldV2 scene-i ilk dəfə açarkən istifadə ediləcək yığcam server payload-u.
 * Kamera fokusunun playerBase koordinatından açılması üçün playerBase məcburidir.
 *
 * Bu builder heç bir DB sorğusu etmir.
 */
function worldV2BaslangicPayloadHazirla({
  stateId,
  playerId,
  baseX,
  baseZ,
  qonsular,
  prezident = null,
  serverTimeUnixMs = Date.now(),
}) {
  const sid = dovletIdYoxla(stateId);
  const pid = metnAl(playerId, 128);
  if (!pid) {
    throw new Error('WorldV2 başlanğıc payload-u üçün playerId tələb olunur.');
  }

  const playerBase = bazaKoordinatiniProtokolaCevir(baseX, baseZ);
  const xerite = worldV2XeriteMelumatiYarat();
  const now = Number(serverTimeUnixMs);

  return {
    version: 2,
    stateId: sid,
    playerId: pid,
    serverTimeUnixMs: Number.isFinite(now) ? Math.max(0, Math.trunc(now)) : Date.now(),
    map: {
      minX: xerite.koordinatSahesi.minX,
      maxX: xerite.koordinatSahesi.maxX,
      minY: xerite.koordinatSahesi.minY,
      maxY: xerite.koordinatSahesi.maxY,
      centerX: xerite.merkez.x,
      centerY: xerite.merkez.y,
    },
    playerBase,
    presidentCenter: {
      x: xerite.prezidentMerkezi.x,
      y: xerite.prezidentMerkezi.y,
      unlockAfterDays: xerite.prezidentMerkezi.acilmaGunSayi,
      defenseBuildingCount: xerite.prezidentMerkezi.mudafieTopSayi,
      defenseDirections: [...xerite.prezidentMerkezi.mudafieIstiqametleri],
      defenseCoordinates: xerite.prezidentMerkezi.mudafieKoordinatlari
        .map(koordinat => ({ ...koordinat })),
      status: prezidentStatusunuHazirla(prezident),
    },
    neighbors: qonsulariHazirla(qonsular),
  };
}

/**
 * Sərhəd keçidi cavabı üçün yığcam contract builder.
 * Keçid koordinatını qəsdən müəyyən etmir: qonşu xəritəyə hansı dəqiq nöqtədən
 * daxil olunacağı gameplay qaydası hələ təsdiqlənməyib.
 */
function serhedKecidiPayloadHazirla({
  currentStateId,
  istiqamet,
  qonsu,
}) {
  const cariStateId = dovletIdYoxla(currentStateId);
  const melumat = qonsuDovletMelumatiYarat({
    istiqamet,
    stateId: qonsu && qonsu.stateId != null ? qonsu.stateId : null,
    status: qonsu && qonsu.status,
  });

  return {
    version: 2,
    currentStateId: cariStateId,
    direction: istiqamet,
    neighborStateId: melumat.stateId,
    transitionAllowed: melumat.kecideIcazeVar,
    status: melumat.status,
    // Dəqiq giriş koordinatı gameplay qaydası təsdiqlənənədək null saxlanır.
    entryCoordinate: null,
  };
}

module.exports = {
  WORLDV2_MESAJ_NOVLERI,
  DOVLET_KECID_STATUSU,
  dovletIdYoxla,
  bazaKoordinatiniProtokolaCevir,
  qonsulariHazirla,
  prezidentStatusunuHazirla,
  worldV2BaslangicPayloadHazirla,
  serhedKecidiPayloadHazirla,
};
