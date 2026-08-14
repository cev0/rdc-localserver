"use strict";

const { sorguEt } = require("./verilenler_bazasi");

const HADISE_NOVU = "dovlet_resurs_runtime_v1";
const yaddaKilidi = new Map();

function stateAcar(stateId) {
  const id = Math.max(1, Math.trunc(Number(stateId) || 1));
  return `__dovlet_resurs_${id}__`;
}

function kopyala(value) {
  return JSON.parse(JSON.stringify(value));
}

async function runtimeOxu(stateId) {
  const netice = await sorguEt(
    `SELECT detallar
       FROM hesab_audit_jurnali
      WHERE oyuncu_id = $1 AND hadise_novu = $2
      ORDER BY id DESC
      LIMIT 1`,
    [stateAcar(stateId), HADISE_NOVU]
  );

  const detallar = netice.rows && netice.rows[0] && netice.rows[0].detallar;
  return detallar && typeof detallar === "object" && detallar.runtime
    ? kopyala(detallar.runtime)
    : { version: 1, stateId: Math.max(1, Math.trunc(Number(stateId) || 1)), nodes: {} };
}

async function runtimeYaz(stateId, runtime) {
  const acar = stateAcar(stateId);
  const onceki = yaddaKilidi.get(acar) || Promise.resolve();

  const yeni = onceki.then(async () => {
    await sorguEt(
      `INSERT INTO hesab_audit_jurnali (hesab_id, oyuncu_id, hadise_novu, detallar)
       VALUES (NULL, $1, $2, $3::jsonb)`,
      [acar, HADISE_NOVU, JSON.stringify({ version: 1, runtime: kopyala(runtime) })]
    );

    await sorguEt(
      `DELETE FROM hesab_audit_jurnali
        WHERE id IN (
          SELECT id FROM hesab_audit_jurnali
           WHERE oyuncu_id = $1 AND hadise_novu = $2
           ORDER BY id DESC OFFSET 3
        )`,
      [acar, HADISE_NOVU]
    );
  });

  yaddaKilidi.set(acar, yeni.catch(() => {}));
  await yeni;
  return true;
}

async function runtimeEmeliyyati(stateId, emeliyyat) {
  const acar = stateAcar(stateId);
  const onceki = yaddaKilidi.get(acar) || Promise.resolve();
  let cavab;

  const yeni = onceki.then(async () => {
    const runtime = await runtimeOxu(stateId);
    cavab = await emeliyyat(runtime);
    if (cavab && cavab.deyisdi === true) {
      await sorguEt(
        `INSERT INTO hesab_audit_jurnali (hesab_id, oyuncu_id, hadise_novu, detallar)
         VALUES (NULL, $1, $2, $3::jsonb)`,
        [acar, HADISE_NOVU, JSON.stringify({ version: 1, runtime: kopyala(runtime) })]
      );
    }
  });

  yaddaKilidi.set(acar, yeni.catch(() => {}));
  await yeni;
  return cavab;
}

module.exports = { runtimeOxu, runtimeYaz, runtimeEmeliyyati };
