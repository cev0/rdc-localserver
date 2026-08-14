"use strict";

const { proqramHovuzunuAl } = require("./verilenler_bazasi");

const KILID_ADI = "dovlet_baza_yerdeyisme_v1";

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

async function dovletYerdeyismeKilidiIleIcraEt(stateId, emeliyyat) {
  const sid = Math.max(1, tamEded(stateId) || 1);
  const client = await proqramHovuzunuAl().connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext($1::text), $2::integer)`,
      [KILID_ADI, sid]
    );

    const netice = await emeliyyat();
    await client.query("COMMIT");
    return netice;
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
    client.release();
  }
}

module.exports = {
  KILID_ADI,
  dovletYerdeyismeKilidiIleIcraEt
};
