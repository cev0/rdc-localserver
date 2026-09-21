"use strict";

/*
 * Verified v1.250.102 init.showScienceArray UI/server visibility contract.
 *
 * The source carries heterogeneous generations of science-page metadata:
 * older 2499xx rows include is_visible/online fields while 200040xx rows do
 * not. We preserve that exact shape and raw "lock" strings; no guessed lock
 * grammar is imposed here.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_SHOW_SCIENCE_ARRAY = deepFreeze([
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;1",
    "id": "249901",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;18|700901|701001",
    "id": "249902",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;2",
    "id": "249903",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;15|710401",
    "id": "249904",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;1",
    "id": "249905",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;8|731001",
    "id": "249906",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;16|732101",
    "id": "249907",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;22|733201",
    "id": "249908",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;10",
    "id": "249909",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;16|737101|738001",
    "id": "249910",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;10",
    "id": "249911",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;16|735201||735601",
    "id": "249912",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;3",
    "id": "249913",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;16|720801",
    "id": "249914",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;15",
    "id": "249915",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;10",
    "id": "249917",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;10",
    "id": "249918",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;20",
    "id": "249919",
    "version": "1.0.69",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;23",
    "id": "249920",
    "version": "1.0.102",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;23",
    "id": "249921",
    "version": "1.0.102",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;23",
    "id": "249922",
    "version": "1.0.102",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;23",
    "id": "249923",
    "version": "1.0.102",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;17",
    "id": "249924",
    "version": "1.0.119",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;20",
    "id": "249925",
    "version": "1.0.119",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;15",
    "id": "249926",
    "version": "1.0.141",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;25",
    "id": "249927",
    "version": "1.0.140",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;30",
    "id": "249928",
    "version": "1.0.140",
    "isShow": 0
  },
  {
    "is_visible": "close",
    "online": "close",
    "lock": "1;30|781001|782401|783801|785201",
    "id": "249929",
    "version": "1.0.150",
    "isShow": 0
  },
  {
    "lock": "1;1",
    "id": "20004000",
    "version": "1.250.009",
    "isShow": 1
  },
  {
    "lock": "1;1",
    "id": "20004001",
    "version": "1.250.056",
    "isShow": 1
  },
  {
    "lock": "1;1",
    "id": "20004002",
    "version": "1.250.016",
    "isShow": 0
  },
  {
    "lock": "1;3",
    "id": "20004003",
    "version": "1.250.016",
    "isShow": 0
  },
  {
    "lock": "1;7",
    "id": "20004004",
    "version": "1.250.016",
    "isShow": 0
  },
  {
    "lock": "1;1",
    "id": "20004005",
    "version": "1.250.027",
    "isShow": 0
  },
  {
    "lock": "1;1",
    "id": "20004006",
    "version": "1.250.016",
    "isShow": 0
  },
  {
    "lock": "1;1",
    "id": "20004007",
    "version": "1.250.016",
    "isShow": 0
  },
  {
    "lock": "1;1",
    "id": "20004008",
    "version": "1.250.016",
    "isShow": 0
  },
  {
    "lock": "1;1",
    "id": "20004009",
    "version": "1.250.016",
    "isShow": 0
  },
  {
    "lock": "1;1",
    "id": "20004010",
    "version": "1.250.016",
    "isShow": 0
  },
  {
    "lock": "1;1",
    "id": "20004011",
    "version": "1.250.016",
    "isShow": 0
  },
  {
    "lock": "1;1",
    "id": "20004012",
    "version": "1.250.016",
    "isShow": 1
  },
  {
    "lock": "1;2",
    "id": "20004030",
    "version": "1.250.056",
    "isShow": 0
  },
  {
    "lock": "1;2",
    "id": "20004031",
    "version": "1.250.056",
    "isShow": 0
  },
  {
    "lock": "1;2",
    "id": "20004032",
    "version": "1.250.056",
    "isShow": 0
  },
  {
    "lock": "1;4",
    "id": "20004033",
    "version": "1.250.056",
    "isShow": 0
  },
  {
    "lock": "1;4",
    "id": "20004034",
    "version": "1.250.056",
    "isShow": 0
  },
  {
    "lock": "1;8",
    "id": "20004035",
    "version": "1.250.063",
    "isShow": 0
  },
  {
    "lock": "1;8",
    "id": "20004036",
    "version": "1.250.063",
    "isShow": 0
  },
  {
    "lock": "1;25",
    "id": "20004037",
    "version": "1.250.086",
    "isShow": 0
  },
  {
    "lock": "1;25",
    "id": "20004038",
    "version": "1.250.086",
    "isShow": 0
  },
  {
    "lock": "1;25",
    "id": "20004039",
    "version": "1.250.088",
    "isShow": 0
  },
  {
    "lock": "1;9",
    "id": "20004040",
    "version": "1.250.088",
    "isShow": 0
  }
]);

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function showScienceRowAl(id) {
  const key=id==null ? "" : String(id).trim();
  const row=LAST_SHELTER_SHOW_SCIENCE_ARRAY.find(x=>x.id===key);
  return row ? clone(row) : null;
}

function showScienceArrayProjectionHazirla() {
  return clone(LAST_SHELTER_SHOW_SCIENCE_ARRAY);
}

function showScienceIdsAl() {
  return LAST_SHELTER_SHOW_SCIENCE_ARRAY.map(x=>x.id);
}

module.exports = {
  LAST_SHELTER_SHOW_SCIENCE_ARRAY,
  showScienceRowAl,
  showScienceArrayProjectionHazirla,
  showScienceIdsAl
};
