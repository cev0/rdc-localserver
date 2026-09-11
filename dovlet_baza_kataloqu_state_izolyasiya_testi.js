"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const kod = fs.readFileSync(
  path.join(__dirname, "dovlet_baza_kataloqu_postgres.js"),
  "utf8",
);

const cteBaslangic = kod.indexOf("WITH son_snapshot AS (");
const sonSnapshotFiltri = kod.indexOf(
  "WHERE hadise_novu = $1",
  cteBaslangic,
);
const distinctOrder = kod.indexOf(
  "ORDER BY oyuncu_id, id DESC",
  sonSnapshotFiltri,
);
const cteBaglanis = kod.indexOf(")\n      SELECT oyuncu_id, detallar", distinctOrder);
const cariStateFiltri = kod.indexOf(
  "WHERE detallar #>> '{state,worldPlacement,stateId}' = $2",
  cteBaglanis,
);

assert.ok(cteBaslangic >= 0, "son_snapshot CTE-si olmalıdır");
assert.ok(sonSnapshotFiltri > cteBaslangic, "snapshot hadisə növü filtr olunmalıdır");
assert.ok(distinctOrder > sonSnapshotFiltri, "oyunçunun ən son snapshot-ı id DESC ilə seçilməlidir");
assert.ok(cteBaglanis > distinctOrder, "CTE state filtrindən əvvəl bağlanmalıdır");
assert.ok(cariStateFiltri > cteBaglanis,
  "Dövlət filtri yalnız hər oyunçunun ən son snapshot-ı seçildikdən sonra tətbiq olunmalıdır");

const kohneSizmaFormasi = /WHERE\s+hadise_novu\s*=\s*\$1[\s\S]{0,180}AND\s+detallar\s*#>>\s*'\{state,worldPlacement,stateId\}'\s*=\s*\$2[\s\S]{0,180}ORDER BY oyuncu_id, id DESC/;
assert.strictEqual(kohneSizmaFormasi.test(kod), false,
  "Köhnə Dövlət snapshot-ını canlı baza kimi saxlayan SQL forması geri qayıtmamalıdır");

console.log("Dövlət baza kataloqu current-snapshot izolyasiya testi OK");
