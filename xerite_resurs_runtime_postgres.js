"use strict";

const {
  sorguEt,
  proqramHovuzunuAl
} = require("./verilenler_bazasi");

const HADISE_NOVU = "dovlet_resurs_runtime_v1";
const yaddaKilidi = new Map();

function sidAl(stateId) {
  return Math.max(1, Math.trunc(Number(stateId) || 1));
}

function stateAcar(stateId) {
  return `__dovlet_resurs_${sidAl(stateId)}__`;
}

function kopyala(value) {
  return value == null ? null : JSON.parse(JSON.stringify(value));
}

function runtimeNeticesiniHazirla(stateId, netice) {
  const sid = sidAl(stateId);
  const detallar = netice && netice.rows && netice.rows[0] && netice.rows[0].detallar;
  const runtime = detallar && typeof detallar === "object" && detallar.runtime
    ? kopyala(detallar.runtime)
    : { version: 1, stateId: sid, nodes: {} };

  runtime.version = 1;
  runtime.stateId = sid;
  if (!runtime.nodes || typeof runtime.nodes !== "object" || Array.isArray(runtime.nodes)) {
    runtime.nodes = {};
  }
  return runtime;
}

async function runtimeOxu(stateId) {
  const sid = sidAl(stateId);
  const netice = await sorguEt(
    `SELECT detallar
       FROM hesab_audit_jurnali
      WHERE oyuncu_id = $1 AND hadise_novu = $2
      ORDER BY id DESC
      LIMIT 1`,
    [stateAcar(sid), HADISE_NOVU]
  );
  return runtimeNeticesiniHazirla(sid, netice);
}

async function runtimeOxuClient(client, stateId) {
  const sid = sidAl(stateId);
  const netice = await client.query(
    `SELECT detallar
       FROM hesab_audit_jurnali
      WHERE oyuncu_id = $1 AND hadise_novu = $2
      ORDER BY id DESC
      LIMIT 1`,
    [stateAcar(sid), HADISE_NOVU]
  );
  return runtimeNeticesiniHazirla(sid, netice);
}

async function postgresDovletKilidiniAl(client, stateId) {
  await client.query(
    `SELECT pg_advisory_xact_lock(hashtext($1::text), $2::integer)`,
    [HADISE_NOVU, sidAl(stateId)]
  );
}

async function runtimeYazClient(client, stateId, runtime) {
  const acar = stateAcar(stateId);
  await client.query(
    `INSERT INTO hesab_audit_jurnali (hesab_id, oyuncu_id, hadise_novu, detallar)
     VALUES (NULL, $1, $2, $3::jsonb)`,
    [acar, HADISE_NOVU, JSON.stringify({ version: 1, runtime: kopyala(runtime) })]
  );

  await client.query(
    `DELETE FROM hesab_audit_jurnali
      WHERE id IN (
        SELECT id FROM hesab_audit_jurnali
         WHERE oyuncu_id = $1 AND hadise_novu = $2
         ORDER BY id DESC OFFSET 3
      )`,
    [acar, HADISE_NOVU]
  );
}

async function yerliKilidIleIcraEt(stateId, emeliyyat) {
  const acar = stateAcar(stateId);
  const onceki = yaddaKilidi.get(acar) || Promise.resolve();
  let cavab;

  const yeni = onceki.then(async () => {
    cavab = await emeliyyat();
  });

  yaddaKilidi.set(acar, yeni.catch(() => {}));
  await yeni;
  return cavab;
}

async function tranzaksiyaIleIcraEt(stateId, emeliyyat) {
  const sid = sidAl(stateId);
  const client = await proqramHovuzunuAl().connect();

  try {
    await client.query("BEGIN");
    await postgresDovletKilidiniAl(client, sid);
    const cavab = await emeliyyat(client, sid);
    await client.query("COMMIT");
    return cavab;
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

async function runtimeYaz(stateId, runtime) {
  const sid = sidAl(stateId);
  return yerliKilidIleIcraEt(sid, async () => {
    await tranzaksiyaIleIcraEt(sid, async client => {
      await runtimeYazClient(client, sid, runtime);
    });
    return true;
  });
}

async function runtimeEmeliyyati(stateId, emeliyyat) {
  const sid = sidAl(stateId);
  return yerliKilidIleIcraEt(sid, async () => {
    return tranzaksiyaIleIcraEt(sid, async client => {
      const runtime = await runtimeOxuClient(client, sid);
      const cavab = await emeliyyat(runtime);
      if (cavab && cavab.deyisdi === true) {
        await runtimeYazClient(client, sid, runtime);
      }
      return cavab;
    });
  });
}

module.exports = {
  runtimeOxu,
  runtimeYaz,
  runtimeEmeliyyati
};
