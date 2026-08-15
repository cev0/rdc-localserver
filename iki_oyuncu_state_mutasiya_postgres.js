"use strict";

const {
  proqramHovuzunuAl
} = require("./verilenler_bazasi");
const {
  oyunStateSnapshotiniYazClient,
  sonOyunStateSnapshotiniAlClient,
  snapshotiCariStateIleBirlesdir
} = require("./oyun_state_snapshot_postgres");
const {
  catismayanDefaultlariElaveEt,
  postgresOyuncuKilidleriniSiraliAl
} = require("./oyun_state_mutasiya_postgres");

function metnAl(deyer, maksimum = 128) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum).toLowerCase()
    : "";
}

function kopyala(deyer) {
  return deyer == null
    ? null
    : JSON.parse(JSON.stringify(deyer));
}

function sadeObyektdir(deyer) {
  return !!deyer &&
    typeof deyer === "object" &&
    !Array.isArray(deyer);
}

function oyuncuTerefiniHazirla(raw, ad) {
  const playerId = metnAl(raw && raw.playerId, 128);
  const cariState = raw && sadeObyektdir(raw.cariState)
    ? raw.cariState
    : null;

  if (!playerId) {
    throw new Error(`${ad} üçün playerId yoxdur.`);
  }

  return {
    playerId,
    cariState
  };
}

function isStateHazirla(teref, sonSnapshot) {
  const snapshot = sadeObyektdir(sonSnapshot)
    ? kopyala(sonSnapshot)
    : null;
  const cari = sadeObyektdir(teref.cariState)
    ? kopyala(teref.cariState)
    : null;

  const state = snapshot || cari;

  if (!state) {
    throw new Error(
      `${teref.playerId} üçün nə PostgreSQL snapshot, nə də canlı state tapıldı.`
    );
  }

  if (cari) {
    catismayanDefaultlariElaveEt(state, cari);
  }

  const snapshotPlayerId = metnAl(state.playerId, 128);
  if (snapshotPlayerId && snapshotPlayerId !== teref.playerId) {
    throw new Error(
      `${teref.playerId} üçün snapshot playerId uyğunsuzluğu aşkarlandı.`
    );
  }

  state.playerId = teref.playerId;
  return state;
}

function deyisenPlayerIdleriniHazirla(raw, icazeliPlayerIds) {
  const icazeli = new Set(icazeliPlayerIds);
  const netice = [];
  const gorulen = new Set();

  for (const rawId of Array.isArray(raw) ? raw : []) {
    const playerId = metnAl(rawId, 128);
    if (!playerId || gorulen.has(playerId)) continue;

    if (!icazeli.has(playerId)) {
      throw new Error(
        `İki-oyunçu transaction naməlum dəyişən playerId qaytardı: ${playerId}`
      );
    }

    gorulen.add(playerId);
    netice.push(playerId);
  }

  return netice.sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
}

async function ikiOyuncuStateMutasiyasiniPostgresIleIcraEt(
  rawBirinci,
  rawIkinci,
  emeliyyat,
  secimler = null
) {
  const birinci = oyuncuTerefiniHazirla(rawBirinci, "Birinci oyunçu");
  const ikinci = oyuncuTerefiniHazirla(rawIkinci, "İkinci oyunçu");

  if (birinci.playerId === ikinci.playerId) {
    throw new Error("İki-oyunçu transaction üçün fərqli playerId-lər tələb olunur.");
  }

  if (typeof emeliyyat !== "function") {
    throw new Error("İki-oyunçu state mutation əməliyyatı yoxdur.");
  }

  const hovuz = secimler && secimler.hovuz
    ? secimler.hovuz
    : proqramHovuzunuAl();

  if (!hovuz || typeof hovuz.connect !== "function") {
    throw new Error("İki-oyunçu state mutation üçün PostgreSQL hovuzu yoxdur.");
  }

  const client = await hovuz.connect();
  const terefler = [birinci, ikinci];
  let stateler = null;
  let cavab;
  let commitOlundu = false;

  try {
    await client.query("BEGIN");

    const kilidSirasi = await postgresOyuncuKilidleriniSiraliAl(
      client,
      [birinci.playerId, ikinci.playerId]
    );

    const snapshotlar = {};
    for (const playerId of kilidSirasi) {
      snapshotlar[playerId] = await sonOyunStateSnapshotiniAlClient(
        client,
        playerId
      );
    }

    stateler = {};
    for (const teref of terefler) {
      stateler[teref.playerId] = isStateHazirla(
        teref,
        snapshotlar[teref.playerId]
      );
    }

    cavab = await emeliyyat(stateler, {
      client,
      playerIds: kilidSirasi.slice(),
      birinciPlayerId: birinci.playerId,
      ikinciPlayerId: ikinci.playerId,
      snapshotVarByPlayerId: {
        [birinci.playerId]: !!snapshotlar[birinci.playerId],
        [ikinci.playerId]: !!snapshotlar[ikinci.playerId]
      }
    });

    const deyisenPlayerIdleri = deyisenPlayerIdleriniHazirla(
      cavab && cavab.deyisenPlayerIdleri,
      kilidSirasi
    );

    for (const playerId of deyisenPlayerIdleri) {
      await oyunStateSnapshotiniYazClient(
        client,
        playerId,
        stateler[playerId]
      );
    }

    // COMMIT-dən əvvəl yalnız canlı RAM state verilmiş tərəflərin merge uyğunluğu
    // clone üzərində yoxlanılır. Offline defender üçün RAM state tələb olunmur.
    for (const teref of terefler) {
      if (!teref.cariState) continue;

      const yoxlama = kopyala(teref.cariState);
      if (!snapshotiCariStateIleBirlesdir(yoxlama, stateler[teref.playerId])) {
        throw new Error(
          `${teref.playerId} üçün commit-dən əvvəl RAM merge uyğunluğu təsdiqlənmədi.`
        );
      }
    }

    await client.query("COMMIT");
    commitOlundu = true;
  }
  catch (xeta) {
    try {
      await client.query("ROLLBACK");
    }
    catch (_) {
      // Əsas xəta saxlanılır.
    }
    throw xeta;
  }
  finally {
    if (client && typeof client.release === "function") {
      client.release();
    }
  }

  if (commitOlundu && stateler) {
    for (const teref of terefler) {
      if (!teref.cariState) continue;

      const birlesdi = snapshotiCariStateIleBirlesdir(
        teref.cariState,
        stateler[teref.playerId]
      );

      if (!birlesdi) {
        console.error("[IKI_OYUNCU_STATE_RAM_SYNC] Commit uğurludur, RAM merge alınmadı.", {
          playerId: teref.playerId
        });
      }
    }
  }

  return cavab;
}

module.exports = {
  oyuncuTerefiniHazirla,
  deyisenPlayerIdleriniHazirla,
  ikiOyuncuStateMutasiyasiniPostgresIleIcraEt
};
