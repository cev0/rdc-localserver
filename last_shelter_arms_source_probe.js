"use strict";

const {
  sourceCatalog
} = require("./last_shelter_source_catalog");

const {
  scienceTopologyMelumatiniAl
} = require("./last_shelter_science_full_topology");

const {
  scienceMelumatiniAl
} = require("./last_shelter_science_kataloqu");

const ids = [
  "107000","107008","107009",
  "107100","107108","107109",
  "107200","107208","107209"
];

for (const id of ids) {
  const row =
    sourceCatalog.row(
      "arms",
      id,
      ["arms"]
    );

  console.log(
    "[ARMS_SOURCE_PROBE]",
    id,
    JSON.stringify(row)
  );
}

sourceCatalog.release("arms");

for (const scienceId of [
  "973400","973700",
  "971400","971700",
  "975400","975700"
]) {
  console.log(
    "[SCIENCE_UNLOCK_PROBE]",
    scienceId,
    JSON.stringify({
      topology:
        scienceTopologyMelumatiniAl(
          scienceId
        ),
      catalog:
        scienceMelumatiniAl(
          scienceId
        )
    })
  );
}
