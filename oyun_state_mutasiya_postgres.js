"use strict";

const {
  proqramHovuzunuAl
} = require("./verilenler_bazasi");
const {
  oyunStateSnapshotiniYazClient,
  sonOyunStateSnapshotiniAlClient,
  snapshotiCariStateIleBirlesdir
} = require("./oyun_state_snapshot_postgres");

const OYUNCU_STATE_KILID_ADI = "oyun_state_mutasiya_v1";

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

function catismayanDefaultlariElaveEt(hedef, defaultlar) {
  if (!sadeObyektdir(hedef) || !sadeObyektdir(defaultlar)) {
    return hedef;
  }

  for (const [acar, defaultDeyer] of Object.entries(defaultlar)) {
    if (!Object.prototype.hasOwnProperty.call(hedef, acar)) {
      hedef[acar] = kopyala(defaultDeyer);
      continue;
    }

    if (sadeObyektdir(hedef[acar]) && sadeObyektdir(defaultDeyer)) {
      catismayanDefaultlariElaveEt(hedef[acar], defaultDeyer);
    }
  }

  return hedef;
}

function isStateHazirla(cariState, sonSnapshot, playerId) {
  const cari = kopyala(cariState) || {};
  const snapshot = kopyala(sonSnapshot);
  const isState = snapshot && sadeObyektdir(snapshot)
    ? snapshot
    : cari;

  // Köhnə snapshot-da yeni server default sahələri yoxdursa,
  // cari runtime state-dən yalnız çatışmayan sahələr əlavə olunur.
  // PostgreSQL snapshot-dakı mövcud dəyərlər heç vaxt overwrite edilmir.
  catismayanDefaultlariElaveEt(isState, cari);

  if (!isState.playerId) {
    isState.playerId = playerId;
  }

  return isState;
}

async function postgresOyuncuKilidiniAl(client, playerId) {
  const oyuncuId = metnAl(playerId, 128);

  if (!client || typeof client.query !== "function" || !oyuncuId) {
    throw new Error("PostgreSQL oyunçu mutation kilidi üçün məlumat natamamdır.");
  }

  await client.query(
    `SELECT pg_advisory_xact_lock(hashtext($1::text), hashtext($2::text))`,
    [OYUNCU_STATE_KILID_ADI, oyuncuId]
  );
}

function oyuncuIdleriniKilidSirasiIleHazirla(rawPlayerIds) {
  const idler = Array.isArray(rawPlayerIds)
    ? rawPlayerIds
        .map(x => metnAl(x, 128))
        .filter(Boolean)
    : [];

  return Array.from(new Set(idler)).sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });
}

async function postgresOyuncuKilidleriniSiraliAl(client, rawPlayerIds) {
  if (!client || typeof client.query !== "function") {
    throw new Error("PostgreSQL çox-oyunçu mutation kilidi üçün client yoxdur.");
  }

  const playerIds = oyuncuIdleriniKilidSirasiIleHazirla(rawPlayerIds);

  if (playerIds.length === 0) {
    throw new Error("PostgreSQL çox-oyunçu mutation kilidi üçün playerId yoxdur.");
  }

  // Bütün multi-player transaction-lar eyni leksik sıra ilə kilid almalıdır.
  // A→B və B→A paralel PvP əməliyyatlarında qarşılıqlı lock gözləməsini
  // (deadlock) bu deterministik sıra aradan qaldırır.
  for (const playerId of playerIds) {
    await postgresOyuncuKilidiniAl(client, playerId);
  }

  return playerIds;
}

async function oyuncuStateMutasiyasiniPostgresIleIcraEt(
  playerId,
  cariState,
  emeliyyat,
  secimler = null
) {
  const oyuncuId = metnAl(playerId, 128);

  if (!oyuncuId) {
    throw new Error("Oyunçu state mutation üçün playerId yoxdur.");
  }

  if (!cariState || typeof cariState !== "object" || Array.isArray(cariState)) {
    throw new Error("Oyunçu state mutation üçün cari state yoxdur.");
  }

  if (typeof emeliyyat !== "function") {
    throw new Error("Oyunçu state mutation əməliyyatı yoxdur.");
  }

  const hovuz = secimler && secimler.hovuz
    ? secimler.hovuz
    : proqramHovuzunuAl();

  if (!hovuz || typeof hovuz.connect !== "function") {
    throw new Error("Oyunçu state mutation üçün PostgreSQL hovuzu yoxdur.");
  }

  const client = await hovuz.connect();
  let isState = null;
  let cavab;
  let commitOlundu = false;

  try {
    await client.query("BEGIN");
    await postgresOyuncuKilidiniAl(client, oyuncuId);

    // Kilid alındıqdan SONRA son snapshot oxunur. Beləliklə başqa Koyeb
    // instansının kiliddən əvvəl tamamladığı mutation mütləq görünür.
    const sonSnapshot = await sonOyunStateSnapshotiniAlClient(
      client,
      oyuncuId
    );

    isState = isStateHazirla(
      cariState,
      sonSnapshot,
      oyuncuId
    );

    const snapshotPlayerId = metnAl(isState.playerId, 128);
    if (snapshotPlayerId && snapshotPlayerId !== oyuncuId) {
      throw new Error("PostgreSQL oyunçu state snapshot playerId uyğunsuzluğu aşkarlandı.");
    }

    cavab = await emeliyyat(isState, {
      client,
      playerId: oyuncuId,
      sonSnapshotVar: !!sonSnapshot
    });

    if (cavab && cavab.deyisdi === true) {
      await oyunStateSnapshotiniYazClient(
        client,
        oyuncuId,
        isState
      );
    }

    // DB commit-dən sonra RAM merge-in uğursuz olduğunu demək təhlükəlidir:
    // həmin anda transaction artıq geri qaytarıla bilməz. Ona görə uyğunluq
    // əvvəl clone üzərində yoxlanılır; problem varsa transaction rollback olur.
    const ramYoxlamaState = kopyala(cariState);
    if (!snapshotiCariStateIleBirlesdir(ramYoxlamaState, isState)) {
      throw new Error("Commit-dən əvvəl canlı oyunçu state uyğunluğu təsdiqlənmədi.");
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

  // Canlı RAM state yalnız PostgreSQL transaction uğurla COMMIT olduqdan
  // sonra yenilənir. Rollback zamanı cari state toxunulmamış qalır.
  if (commitOlundu && isState) {
    const birlesdi = snapshotiCariStateIleBirlesdir(
      cariState,
      isState
    );

    if (!birlesdi) {
      // Bu hal yalnız commit-dən sonra eyni RAM state başqa kod tərəfindən
      // gözlənilmədən dəyişdirilərsə mümkündür. DB artıq authoritative qalır.
      console.error("[OYUN_STATE_MUTASIYA_RAM_SYNC] Commit uğurludur, RAM merge alınmadı.", {
        playerId: oyuncuId
      });
    }
  }

  return cavab;
}

module.exports = {
  OYUNCU_STATE_KILID_ADI,
  catismayanDefaultlariElaveEt,
  postgresOyuncuKilidiniAl,
  oyuncuIdleriniKilidSirasiIleHazirla,
  postgresOyuncuKilidleriniSiraliAl,
  oyuncuStateMutasiyasiniPostgresIleIcraEt
};
