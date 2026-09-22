"use strict";

const {
  sourceCatalog
} = require("./last_shelter_source_catalog");

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
