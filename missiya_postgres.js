"use strict";

const {
  sorguEt,
  proqramHovuzunuAl
} = require("./verilenler_bazasi");

const MISSIYA_MUKAFAT_HADISESI = "missiya_mukafat_alindi";
const MISSIYA_PROQRES_HADISESI = "missiya_proqres_hadisesi";

function metnAl(deyer, maksimum = 256) {
  return typeof deyer === "string"
    ? deyer.trim().slice(0, maksimum)
    : "";
}

function musbetTamEded(deyer, standart = 0) {
  const say = Number(deyer);
  if (!Number.isFinite(say)) return standart;
  return Math.max(0, Math.trunc(say));
}

function detaliObyektEt(deyer) {
  if (!deyer) return {};
  if (typeof deyer === "object" && !Array.isArray(deyer)) return deyer;

  if (typeof deyer === "string") {
    try {
      const parsed = JSON.parse(deyer);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    }
    catch {
      return {};
    }
  }

  return {};
}

async function missiyaDaimiVeziyyetiniSorquIle(
  sorquFunksiyasi,
  playerId
) {
  const oyuncuId = metnAl(playerId, 128);

  if (!oyuncuId) {
    return {
      claimedRewardIds: [],
      eventCounters: {}
    };
  }

  if (typeof sorquFunksiyasi !== "function") {
    throw new Error("Missiya daimi state sorğu funksiyası yoxdur.");
  }

  const netice = await sorquFunksiyasi(
    `
      SELECT hadise_novu, detallar
      FROM hesab_audit_jurnali
      WHERE oyuncu_id = $1
        AND hadise_novu IN ($2, $3)
      ORDER BY id ASC
    `,
    [
      oyuncuId,
      MISSIYA_MUKAFAT_HADISESI,
      MISSIYA_PROQRES_HADISESI
    ]
  );

  const claimedSet = new Set();
  const eventCounters = {};

  for (const setir of netice.rows || []) {
    const nov = metnAl(setir && setir.hadise_novu, 128);
    const detallar = detaliObyektEt(setir && setir.detallar);

    if (nov === MISSIYA_MUKAFAT_HADISESI) {
      const missiyaId = metnAl(detallar.missionId, 64).toLowerCase();
      if (missiyaId) claimedSet.add(missiyaId);
      continue;
    }

    if (nov === MISSIYA_PROQRES_HADISESI) {
      const hadiseId = metnAl(detallar.eventId, 128).toLowerCase();
      const miqdar = Math.max(1, musbetTamEded(detallar.amount, 1));

      if (!hadiseId) continue;
      eventCounters[hadiseId] =
        musbetTamEded(eventCounters[hadiseId]) + miqdar;
    }
  }

  return {
    claimedRewardIds: Array.from(claimedSet),
    eventCounters
  };
}

async function missiyaDaimiVeziyyetiniAl(playerId) {
  return await missiyaDaimiVeziyyetiniSorquIle(
    async (sql, parametrler) => await sorguEt(sql, parametrler),
    playerId
  );
}

async function missiyaDaimiVeziyyetiniAlClient(client, playerId) {
  if (!client || typeof client.query !== "function") {
    throw new Error("Missiya daimi state üçün PostgreSQL client yoxdur.");
  }

  return await missiyaDaimiVeziyyetiniSorquIle(
    async (sql, parametrler) => await client.query(sql, parametrler),
    playerId
  );
}

async function missiyaMukafatiniAuditdeYaddaSaxla(playerId, missionId) {
  const oyuncuId = metnAl(playerId, 128);
  const missiyaId = metnAl(missionId, 64).toLowerCase();

  if (!oyuncuId || !missiyaId) {
    throw new Error("Missiya mükafatı audit məlumatı natamamdır.");
  }

  const client = await proqramHovuzunuAl().connect();

  try {
    await client.query("BEGIN");

    // Eyni oyunçu + missiya üçün paralel claim-ləri PostgreSQL səviyyəsində sırala.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
      [oyuncuId, missiyaId]
    );

    const movcud = await client.query(
      `
        SELECT id
        FROM hesab_audit_jurnali
        WHERE oyuncu_id = $1
          AND hadise_novu = $2
          AND LOWER(COALESCE(detallar->>'missionId', '')) = $3
        LIMIT 1
      `,
      [oyuncuId, MISSIYA_MUKAFAT_HADISESI, missiyaId]
    );

    if (movcud.rows && movcud.rows.length > 0) {
      await client.query("COMMIT");

      return {
        yazildi: false,
        artiqMovcuddur: true
      };
    }

    await client.query(
      `
        INSERT INTO hesab_audit_jurnali (
          hesab_id,
          oyuncu_id,
          hadise_novu,
          detallar
        )
        VALUES (
          NULL,
          $1,
          $2,
          $3::jsonb
        )
      `,
      [
        oyuncuId,
        MISSIYA_MUKAFAT_HADISESI,
        JSON.stringify({ missionId: missiyaId })
      ]
    );

    await client.query("COMMIT");

    return {
      yazildi: true,
      artiqMovcuddur: false
    };
  }
  catch (xeta) {
    try {
      await client.query("ROLLBACK");
    }
    catch {}

    throw xeta;
  }
  finally {
    client.release();
  }
}

async function missiyaProqresHadisesiniAuditdeYaddaSaxla(
  playerId,
  eventId,
  amount = 1
) {
  const oyuncuId = metnAl(playerId, 128);
  const hadiseId = metnAl(eventId, 128).toLowerCase();
  const miqdar = Math.max(1, musbetTamEded(amount, 1));

  if (!oyuncuId || !hadiseId) {
    throw new Error("Missiya progress audit məlumatı natamamdır.");
  }

  await sorguEt(
    `
      INSERT INTO hesab_audit_jurnali (
        hesab_id,
        oyuncu_id,
        hadise_novu,
        detallar
      )
      VALUES (
        NULL,
        $1,
        $2,
        $3::jsonb
      )
    `,
    [
      oyuncuId,
      MISSIYA_PROQRES_HADISESI,
      JSON.stringify({
        eventId: hadiseId,
        amount: miqdar
      })
    ]
  );

  return true;
}

function daimiVeziyyetiStateIleBirlesdir(state, daimiVeziyyet) {
  if (!state || typeof state !== "object") return;

  if (!state.missions || typeof state.missions !== "object") {
    state.missions = {};
  }

  const lokalClaimler = Array.isArray(state.missions.claimedRewardIds)
    ? state.missions.claimedRewardIds
    : [];

  const dbClaimler = Array.isArray(daimiVeziyyet && daimiVeziyyet.claimedRewardIds)
    ? daimiVeziyyet.claimedRewardIds
    : [];

  state.missions.claimedRewardIds = Array.from(
    new Set(
      [...lokalClaimler, ...dbClaimler]
        .map(x => metnAl(x, 64).toLowerCase())
        .filter(Boolean)
    )
  );

  const lokalSaygaclar =
    state.missions.eventCounters &&
    typeof state.missions.eventCounters === "object"
      ? state.missions.eventCounters
      : {};

  const dbSaygaclar =
    daimiVeziyyet &&
    daimiVeziyyet.eventCounters &&
    typeof daimiVeziyyet.eventCounters === "object"
      ? daimiVeziyyet.eventCounters
      : {};

  const birlesmis = {};
  const acarlar = new Set([
    ...Object.keys(lokalSaygaclar),
    ...Object.keys(dbSaygaclar)
  ]);

  for (const acar of acarlar) {
    const normalAcar = metnAl(acar, 128).toLowerCase();
    if (!normalAcar) continue;

    // DB daimi source-of-truth-dur. RAM yalnız daha irəli gedibsə saxlanılır.
    birlesmis[normalAcar] = Math.max(
      musbetTamEded(lokalSaygaclar[acar]),
      musbetTamEded(dbSaygaclar[acar])
    );
  }

  state.missions.eventCounters = birlesmis;
  state.missions.version = 1;
}

module.exports = {
  missiyaDaimiVeziyyetiniAl,
  missiyaDaimiVeziyyetiniAlClient,
  missiyaMukafatiniAuditdeYaddaSaxla,
  missiyaProqresHadisesiniAuditdeYaddaSaxla,
  daimiVeziyyetiStateIleBirlesdir
};
