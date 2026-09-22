"use strict";

/*
 * Compatibility facade for the complete Last Shelter Survival v1.250.102
 * GetScienceInfo topology catalog.
 *
 * Earlier migration batches carried only the first verified subset here.
 * The authoritative runtime-topology set now contains all 441 nodes from two
 * identical captured server responses. Raw XML cost/timer balance remains
 * separate in last_shelter_science_kataloqu.js.
 */

const {
  SOURCE,
  SCIENCE,
  splitRaw,
  goodsNeedParseEt,
  scienceTopologyMelumatiniAl,
  scienceTopologyIdleriniAl
} = require("./last_shelter_science_full_topology");

const RAW_SCIENCE_TREE =
  SCIENCE;

function scienceTreeMelumatiniAl(
  itemId
) {
  return (
    scienceTopologyMelumatiniAl(
      itemId
    )
  );
}

function scienceTreeIdleriniAl() {
  return (
    scienceTopologyIdleriniAl()
  );
}

module.exports = {
  SOURCE,
  RAW_SCIENCE_TREE,
  splitRaw,
  goodsNeedParseEt,
  scienceTreeMelumatiniAl,
  scienceTreeIdleriniAl
};
