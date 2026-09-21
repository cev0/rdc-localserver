"use strict";

/*
 * Complete verified Last Shelter v1.250.102 init.store reward catalog.
 *
 * Source: reference-server init push. 401 store bundle rows are preserved
 * exactly as observed. Numeric reward type ids are intentionally kept raw
 * until the corresponding server enum mapping is independently verified.
 * This file is data-authoritative only; it does not invent purchase prices,
 * eligibility, claim limits, currencies, or unlock conditions.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return value;
}

const STORE_RESOURCE_REWARDS = deepFreeze({
  "200500": [
    {
      "value": {
        "id": "200331",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200301",
        "num": 2
      },
      "type": 7
    }
  ],
  "200501": [
    {
      "value": {
        "id": "200332",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200321",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200302",
        "num": 3
      },
      "type": 7
    }
  ],
  "200502": [
    {
      "value": {
        "id": "200333",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200303",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200322",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200311",
        "num": 2
      },
      "type": 7
    }
  ],
  "200505": [
    {
      "value": {
        "id": "200320",
        "num": 1
      },
      "type": 7
    }
  ],
  "200510": [
    {
      "value": {
        "id": "200200",
        "num": 1
      },
      "type": 7
    }
  ],
  "200511": [
    {
      "value": {
        "id": "200381",
        "num": 2
      },
      "type": 7
    }
  ],
  "200512": [
    {
      "value": {
        "id": "200202",
        "num": 2
      },
      "type": 7
    }
  ],
  "200550": [
    {
      "value": {
        "id": "200417",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200002",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200004",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200415",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200220",
        "num": 3
      },
      "type": 7
    }
  ],
  "200551": [
    {
      "value": {
        "id": "200417",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200002",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200415",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200450",
        "num": 1
      },
      "type": 7
    }
  ],
  "200552": [
    {
      "value": {
        "id": "200002",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200415",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200220",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200450",
        "num": 1
      },
      "type": 7
    }
  ],
  "200553": [
    {
      "value": {
        "id": "200200",
        "num": 15
      },
      "type": 7
    },
    {
      "value": {
        "id": "200333",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200303",
        "num": 2
      },
      "type": 7
    }
  ],
  "200560": [
    {
      "value": 2000,
      "type": 0
    },
    {
      "value": 2000,
      "type": 3
    }
  ],
  "200561": [
    {
      "value": 8000,
      "type": 0
    },
    {
      "value": 1300,
      "type": 2
    },
    {
      "value": 8000,
      "type": 3
    }
  ],
  "200562": [
    {
      "value": 20000,
      "type": 0
    },
    {
      "value": 800,
      "type": 1
    },
    {
      "value": 3300,
      "type": 2
    },
    {
      "value": 20000,
      "type": 3
    }
  ],
  "200563": [
    {
      "value": 100000,
      "type": 0
    },
    {
      "value": 4100,
      "type": 1
    },
    {
      "value": 16600,
      "type": 2
    },
    {
      "value": 100000,
      "type": 3
    }
  ],
  "200564": [
    {
      "value": 1000,
      "type": 0
    },
    {
      "value": 1000,
      "type": 3
    }
  ],
  "200565": [
    {
      "value": 2800,
      "type": 0
    },
    {
      "value": 400,
      "type": 2
    },
    {
      "value": 2800,
      "type": 3
    }
  ],
  "200566": [
    {
      "value": 6100,
      "type": 0
    },
    {
      "value": 200,
      "type": 1
    },
    {
      "value": 500,
      "type": 2
    },
    {
      "value": 6100,
      "type": 3
    }
  ],
  "200567": [
    {
      "value": 30500,
      "type": 0
    },
    {
      "value": 1000,
      "type": 1
    },
    {
      "value": 2500,
      "type": 2
    },
    {
      "value": 30500,
      "type": 3
    }
  ],
  "200570": [
    {
      "value": {
        "id": "200360",
        "num": 1
      },
      "type": 7
    }
  ],
  "200571": [
    {
      "value": {
        "id": "200374",
        "num": 1
      },
      "type": 7
    }
  ],
  "200572": [
    {
      "value": {
        "id": "200319",
        "num": 1
      },
      "type": 7
    }
  ],
  "200580": [
    {
      "value": {
        "id": "200300",
        "num": 1
      },
      "type": 7
    }
  ],
  "200581": [
    {
      "value": {
        "id": "200204",
        "num": 1
      },
      "type": 7
    }
  ],
  "200590": [
    {
      "value": {
        "id": "200200",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200201",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200564",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200380",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200373",
        "num": 1
      },
      "type": 7
    }
  ],
  "200591": [
    {
      "value": {
        "id": "200200",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200201",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200027",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200351",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200208",
        "num": 1
      },
      "type": 7
    }
  ],
  "200592": [
    {
      "value": {
        "id": "200028",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200200",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200201",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200206",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200208",
        "num": 2
      },
      "type": 7
    }
  ],
  "200593": [
    {
      "value": {
        "id": "200200",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200201",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200032",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200410",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200208",
        "num": 3
      },
      "type": 7
    }
  ],
  "200620": [
    {
      "value": {
        "id": "201032",
        "num": 1
      },
      "type": 7
    }
  ],
  "200621": [
    {
      "value": {
        "id": "201063",
        "num": 1
      },
      "type": 7
    }
  ],
  "200622": [
    {
      "value": {
        "id": "202155",
        "num": 1
      },
      "type": 7
    }
  ],
  "200623": [
    {
      "value": {
        "id": "202044",
        "num": 1
      },
      "type": 7
    }
  ],
  "200624": [],
  "200625": [],
  "200626": [
    {
      "value": {
        "id": "201061",
        "num": 1
      },
      "type": 7
    }
  ],
  "200630": [
    {
      "value": {
        "id": "2050502",
        "num": 1
      },
      "type": 7
    }
  ],
  "200631": [
    {
      "value": {
        "id": "2050004",
        "num": 1
      },
      "type": 7
    }
  ],
  "200632": [
    {
      "value": {
        "id": "2051103",
        "num": 1
      },
      "type": 7
    }
  ],
  "200633": [
    {
      "value": {
        "id": "2051304",
        "num": 1
      },
      "type": 7
    }
  ],
  "200634": [
    {
      "value": {
        "id": "203052",
        "num": 1
      },
      "type": 7
    }
  ],
  "200635": [
    {
      "value": {
        "id": "203104",
        "num": 1
      },
      "type": 7
    }
  ],
  "200636": [
    {
      "value": {
        "id": "203141",
        "num": 1
      },
      "type": 7
    }
  ],
  "200637": [
    {
      "value": {
        "id": "203062",
        "num": 1
      },
      "type": 7
    }
  ],
  "200638": [
    {
      "value": {
        "id": "203044",
        "num": 1
      },
      "type": 7
    }
  ],
  "200639": [
    {
      "value": {
        "id": "203033",
        "num": 1
      },
      "type": 7
    }
  ],
  "200640": [
    {
      "value": {
        "id": "203072",
        "num": 1
      },
      "type": 7
    }
  ],
  "200641": [
    {
      "value": {
        "id": "203124",
        "num": 1
      },
      "type": 7
    }
  ],
  "200642": [
    {
      "value": {
        "id": "203093",
        "num": 1
      },
      "type": 7
    }
  ],
  "200643": [
    {
      "value": {
        "id": "203182",
        "num": 1
      },
      "type": 7
    }
  ],
  "200644": [
    {
      "value": {
        "id": "203174",
        "num": 1
      },
      "type": 7
    }
  ],
  "200645": [
    {
      "value": {
        "id": "203193",
        "num": 1
      },
      "type": 7
    }
  ],
  "200646": [
    {
      "value": {
        "id": "203212",
        "num": 1
      },
      "type": 7
    }
  ],
  "200647": [
    {
      "value": {
        "id": "203214",
        "num": 1
      },
      "type": 7
    }
  ],
  "200648": [
    {
      "value": {
        "id": "203222",
        "num": 1
      },
      "type": 7
    }
  ],
  "200650": [
    {
      "value": 1000,
      "type": 10
    },
    {
      "value": 1000,
      "type": 11
    },
    {
      "value": {
        "id": "200390",
        "num": 2
      },
      "type": 7
    }
  ],
  "200651": [
    {
      "value": 3000,
      "type": 10
    },
    {
      "value": 3000,
      "type": 11
    },
    {
      "value": {
        "id": "200390",
        "num": 5
      },
      "type": 7
    }
  ],
  "200652": [
    {
      "value": 5000,
      "type": 10
    },
    {
      "value": 5000,
      "type": 11
    },
    {
      "value": {
        "id": "200302",
        "num": 2
      },
      "type": 7
    }
  ],
  "200653": [
    {
      "value": 7000,
      "type": 10
    },
    {
      "value": 7000,
      "type": 11
    },
    {
      "value": {
        "id": "200302",
        "num": 8
      },
      "type": 7
    }
  ],
  "200654": [
    {
      "value": 10000,
      "type": 10
    },
    {
      "value": 10000,
      "type": 11
    },
    {
      "value": {
        "id": "200364",
        "num": 5
      },
      "type": 7
    }
  ],
  "200655": [
    {
      "value": 1000,
      "type": 10
    },
    {
      "value": 1000,
      "type": 11
    },
    {
      "value": {
        "id": "200207",
        "num": 1
      },
      "type": 7
    }
  ],
  "200656": [
    {
      "value": 2000,
      "type": 10
    },
    {
      "value": 2000,
      "type": 11
    },
    {
      "value": {
        "id": "200306",
        "num": 5
      },
      "type": 7
    }
  ],
  "200657": [
    {
      "value": 3000,
      "type": 10
    },
    {
      "value": 3000,
      "type": 11
    },
    {
      "value": {
        "id": "200205",
        "num": 2
      },
      "type": 7
    }
  ],
  "200658": [
    {
      "value": 4000,
      "type": 10
    },
    {
      "value": 4000,
      "type": 11
    },
    {
      "value": {
        "id": "200326",
        "num": 12
      },
      "type": 7
    }
  ],
  "200659": [
    {
      "value": 5000,
      "type": 10
    },
    {
      "value": 5000,
      "type": 11
    },
    {
      "value": {
        "id": "200205",
        "num": 3
      },
      "type": 7
    }
  ],
  "200660": [
    {
      "value": {
        "id": "200320",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200205",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200410",
        "num": 1
      },
      "type": 7
    }
  ],
  "200661": [
    {
      "value": {
        "id": "200329",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200207",
        "num": 30
      },
      "type": 7
    },
    {
      "value": {
        "id": "200382",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200220",
        "num": 2
      },
      "type": 7
    }
  ],
  "200662": [
    {
      "value": {
        "id": "200200",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200206",
        "num": 8
      },
      "type": 7
    },
    {
      "value": {
        "id": "200392",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200301",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200450",
        "num": 5
      },
      "type": 7
    }
  ],
  "200663": [
    {
      "value": {
        "id": "200200",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200201",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200309",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200330",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200031",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200339",
        "num": 1
      },
      "type": 7
    }
  ],
  "200664": [
    {
      "value": {
        "id": "200200",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200201",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200215",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200309",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200390",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200216",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200330",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200031",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200339",
        "num": 1
      },
      "type": 7
    }
  ],
  "200665": [
    {
      "value": {
        "id": "200331",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200330",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200031",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200200",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200201",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200309",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200215",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200390",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200216",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200207",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200208",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200301",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200339",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 10
      },
      "type": 7
    }
  ],
  "200666": [
    {
      "value": {
        "id": "200427",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200320",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200331",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200330",
        "num": 8
      },
      "type": 7
    },
    {
      "value": {
        "id": "200031",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200329",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200200",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200201",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200391",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200309",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200215",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200390",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200207",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200216",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200208",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200301",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200339",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 10
      },
      "type": 7
    }
  ],
  "200667": [
    {
      "value": {
        "id": "200320",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200221",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200220",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200215",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200319",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200216",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200332",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200310",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200339",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200331",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200330",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200031",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200329",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200200",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200201",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200391",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200309",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200390",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200207",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200392",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200350",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200321",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200208",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200370",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200301",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200302",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 15
      },
      "type": 7
    }
  ],
  "200670": [
    {
      "value": {
        "id": "200045",
        "num": 2
      },
      "type": 7
    }
  ],
  "200671": [
    {
      "value": {
        "id": "200045",
        "num": 52
      },
      "type": 7
    }
  ],
  "200672": [
    {
      "value": {
        "id": "200045",
        "num": 100
      },
      "type": 7
    },
    {
      "value": {
        "id": "202071",
        "num": 2
      },
      "type": 7
    }
  ],
  "200673": [
    {
      "value": {
        "id": "202111",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200045",
        "num": 150
      },
      "type": 7
    }
  ],
  "200674": [
    {
      "value": {
        "id": "200045",
        "num": 201
      },
      "type": 7
    }
  ],
  "200801": [
    {
      "value": {
        "id": "200028",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200205",
        "num": 1
      },
      "type": 7
    }
  ],
  "200802": [
    {
      "value": {
        "id": "200201",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200393",
        "num": 8
      },
      "type": 7
    }
  ],
  "200803": [
    {
      "value": {
        "id": "200101",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200207",
        "num": 3
      },
      "type": 7
    }
  ],
  "200804": [
    {
      "value": {
        "id": "200215",
        "num": 4
      },
      "type": 7
    },
    {
      "value": {
        "id": "200207",
        "num": 3
      },
      "type": 7
    }
  ],
  "200805": [
    {
      "value": {
        "id": "200200",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200566",
        "num": 1
      },
      "type": 7
    }
  ],
  "200809": [
    {
      "value": {
        "id": "200424",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200393",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200306",
        "num": 8
      },
      "type": 7
    },
    {
      "value": {
        "id": "200316",
        "num": 8
      },
      "type": 7
    },
    {
      "value": {
        "id": "200336",
        "num": 8
      },
      "type": 7
    }
  ],
  "200810": [
    {
      "value": 150,
      "type": 0
    },
    {
      "value": 150,
      "type": 3
    }
  ],
  "200811": [
    {
      "value": {
        "id": "200200",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200215",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200393",
        "num": 8
      },
      "type": 7
    },
    {
      "value": {
        "id": "200836",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200866",
        "num": 10
      },
      "type": 7
    }
  ],
  "200813": [
    {
      "value": {
        "id": "200330",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200393",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200306",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200336",
        "num": 2
      },
      "type": 7
    }
  ],
  "200814": [
    {
      "value": 40000,
      "type": 5
    },
    {
      "value": {
        "id": "200394",
        "num": 100
      },
      "type": 7
    },
    {
      "value": {
        "id": "200820",
        "num": 30
      },
      "type": 7
    }
  ],
  "200820": [
    {
      "value": {
        "id": "200205",
        "num": 1
      },
      "type": 7
    }
  ],
  "200821": [
    {
      "value": {
        "id": "200831",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200836",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200361",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200866",
        "num": 1
      },
      "type": 7
    }
  ],
  "200823": [
    {
      "value": {
        "id": "200215",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200836",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200004",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200374",
        "num": 3
      },
      "type": 7
    }
  ],
  "200824": [
    {
      "value": {
        "id": "200215",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200205",
        "num": 2
      },
      "type": 7
    }
  ],
  "200825": [
    {
      "value": {
        "id": "200201",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200306",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200301",
        "num": 4
      },
      "type": 7
    },
    {
      "value": {
        "id": "200326",
        "num": 5
      },
      "type": 7
    }
  ],
  "200826": [
    {
      "value": {
        "id": "200046",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "203061",
        "num": 1
      },
      "type": 7
    }
  ],
  "200827": [
    {
      "value": {
        "id": "200046",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "203011",
        "num": 5
      },
      "type": 7
    }
  ],
  "200828": [
    {
      "value": {
        "id": "206004",
        "num": 8
      },
      "type": 7
    }
  ],
  "200867": [
    {
      "value": {
        "id": "200046",
        "num": 3
      },
      "type": 7
    }
  ],
  "200880": [
    {
      "value": 100,
      "type": 0
    },
    {
      "value": 100,
      "type": 3
    }
  ],
  "200881": [
    {
      "value": 100,
      "type": 0
    },
    {
      "value": 100,
      "type": 3
    }
  ],
  "200882": [
    {
      "value": 150,
      "type": 0
    },
    {
      "value": 150,
      "type": 3
    }
  ],
  "200883": [
    {
      "value": 150,
      "type": 0
    },
    {
      "value": 150,
      "type": 3
    }
  ],
  "200884": [
    {
      "value": 200,
      "type": 0
    },
    {
      "value": 200,
      "type": 3
    }
  ],
  "200885": [
    {
      "value": 200,
      "type": 0
    },
    {
      "value": 200,
      "type": 3
    }
  ],
  "200890": [
    {
      "value": 100,
      "type": 0
    },
    {
      "value": 100,
      "type": 3
    }
  ],
  "200891": [
    {
      "value": 150,
      "type": 0
    },
    {
      "value": 150,
      "type": 3
    }
  ],
  "200892": [
    {
      "value": 200,
      "type": 0
    },
    {
      "value": 200,
      "type": 3
    }
  ],
  "200893": [
    {
      "value": 100,
      "type": 0
    },
    {
      "value": 100,
      "type": 3
    }
  ],
  "200894": [
    {
      "value": 150,
      "type": 0
    },
    {
      "value": 150,
      "type": 3
    }
  ],
  "200895": [
    {
      "value": 200,
      "type": 0
    },
    {
      "value": 200,
      "type": 3
    }
  ],
  "200896": [
    {
      "value": {
        "id": "206008",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "206004",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200201",
        "num": 1
      },
      "type": 7
    }
  ],
  "200897": [
    {
      "value": {
        "id": "206003",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200330",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "206001",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 1
      },
      "type": 7
    }
  ],
  "200900": [
    {
      "value": {
        "id": "200331",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200301",
        "num": 2
      },
      "type": 7
    }
  ],
  "200901": [
    {
      "value": {
        "id": "200333",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200303",
        "num": 1
      },
      "type": 7
    }
  ],
  "200902": [
    {
      "value": {
        "id": "200323",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200334",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200304",
        "num": 3
      },
      "type": 7
    }
  ],
  "200903": [
    {
      "value": {
        "id": "200314",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200305",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200334",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200304",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200335",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200325",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200313",
        "num": 2
      },
      "type": 7
    }
  ],
  "200904": [
    {
      "value": {
        "id": "200305",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200315",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200335",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200325",
        "num": 5
      },
      "type": 7
    }
  ],
  "200905": [
    {
      "value": {
        "id": "200200",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200216",
        "num": 1
      },
      "type": 7
    }
  ],
  "200906": [
    {
      "value": {
        "id": "200200",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200216",
        "num": 2
      },
      "type": 7
    }
  ],
  "200907": [
    {
      "value": {
        "id": "200200",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200216",
        "num": 4
      },
      "type": 7
    },
    {
      "value": {
        "id": "200208",
        "num": 1
      },
      "type": 7
    }
  ],
  "200908": [
    {
      "value": {
        "id": "200202",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200200",
        "num": 30
      },
      "type": 7
    },
    {
      "value": {
        "id": "200216",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200208",
        "num": 5
      },
      "type": 7
    }
  ],
  "200909": [
    {
      "value": {
        "id": "200202",
        "num": 25
      },
      "type": 7
    },
    {
      "value": {
        "id": "200200",
        "num": 40
      },
      "type": 7
    },
    {
      "value": {
        "id": "200216",
        "num": 20
      },
      "type": 7
    },
    {
      "value": {
        "id": "200208",
        "num": 10
      },
      "type": 7
    }
  ],
  "200910": [
    {
      "value": {
        "id": "200392",
        "num": 1
      },
      "type": 7
    }
  ],
  "200911": [
    {
      "value": {
        "id": "200392",
        "num": 2
      },
      "type": 7
    }
  ],
  "200912": [
    {
      "value": {
        "id": "200392",
        "num": 3
      },
      "type": 7
    }
  ],
  "200952": [],
  "200953": [
    {
      "value": {
        "id": "200366",
        "num": 0
      },
      "type": 7
    },
    {
      "value": {
        "id": "200956",
        "num": 300
      },
      "type": 7
    },
    {
      "value": {
        "id": "200206",
        "num": 8
      },
      "type": 7
    },
    {
      "value": {
        "id": "200303",
        "num": 4
      },
      "type": 7
    },
    {
      "value": {
        "id": "200221",
        "num": 0
      },
      "type": 7
    },
    {
      "value": {
        "id": "200462",
        "num": 1
      },
      "type": 7
    }
  ],
  "200954": [
    {
      "value": {
        "id": "200366",
        "num": 0
      },
      "type": 7
    },
    {
      "value": {
        "id": "200956",
        "num": 600
      },
      "type": 7
    },
    {
      "value": {
        "id": "200206",
        "num": 15
      },
      "type": 7
    },
    {
      "value": {
        "id": "200333",
        "num": 8
      },
      "type": 7
    },
    {
      "value": {
        "id": "200460",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200221",
        "num": 0
      },
      "type": 7
    }
  ],
  "200955": [
    {
      "value": {
        "id": "200366",
        "num": 0
      },
      "type": 7
    },
    {
      "value": {
        "id": "200956",
        "num": 1200
      },
      "type": 7
    },
    {
      "value": {
        "id": "200200",
        "num": 60
      },
      "type": 7
    },
    {
      "value": {
        "id": "200323",
        "num": 15
      },
      "type": 7
    },
    {
      "value": {
        "id": "200221",
        "num": 0
      },
      "type": 7
    },
    {
      "value": {
        "id": "200462",
        "num": 1
      },
      "type": 7
    }
  ],
  "200968": [
    {
      "value": {
        "id": "200956",
        "num": 100
      },
      "type": 7
    }
  ],
  "200969": [
    {
      "value": {
        "id": "200956",
        "num": 500
      },
      "type": 7
    }
  ],
  "200970": [
    {
      "value": {
        "id": "200956",
        "num": 1000
      },
      "type": 7
    }
  ],
  "200971": [
    {
      "value": {
        "id": "200956",
        "num": 2000
      },
      "type": 7
    }
  ],
  "200972": [
    {
      "value": {
        "id": "200956",
        "num": 3000
      },
      "type": 7
    }
  ],
  "200973": [
    {
      "value": {
        "id": "200956",
        "num": 7000
      },
      "type": 7
    }
  ],
  "200974": [
    {
      "value": {
        "id": "200956",
        "num": 12000
      },
      "type": 7
    }
  ],
  "204100": [
    {
      "value": {
        "id": "1000714",
        "num": 1
      },
      "type": 14
    }
  ],
  "204101": [
    {
      "value": {
        "id": "1000724",
        "num": 1
      },
      "type": 14
    }
  ],
  "204102": [
    {
      "value": {
        "id": "1000734",
        "num": 1
      },
      "type": 14
    }
  ],
  "204103": [
    {
      "value": {
        "id": "1000744",
        "num": 1
      },
      "type": 14
    }
  ],
  "204104": [
    {
      "value": {
        "id": "1000754",
        "num": 1
      },
      "type": 14
    }
  ],
  "204105": [
    {
      "value": {
        "id": "1000764",
        "num": 1
      },
      "type": 14
    }
  ],
  "204106": [
    {
      "value": {
        "id": "1000774",
        "num": 1
      },
      "type": 14
    }
  ],
  "204107": [
    {
      "value": {
        "id": "1000715",
        "num": 1
      },
      "type": 14
    }
  ],
  "204108": [
    {
      "value": {
        "id": "1000725",
        "num": 1
      },
      "type": 14
    }
  ],
  "204109": [
    {
      "value": {
        "id": "1000735",
        "num": 1
      },
      "type": 14
    }
  ],
  "204110": [
    {
      "value": {
        "id": "1000745",
        "num": 1
      },
      "type": 14
    }
  ],
  "204111": [
    {
      "value": {
        "id": "1000755",
        "num": 1
      },
      "type": 14
    }
  ],
  "204112": [
    {
      "value": {
        "id": "1000765",
        "num": 1
      },
      "type": 14
    }
  ],
  "204113": [
    {
      "value": {
        "id": "1000775",
        "num": 1
      },
      "type": 14
    }
  ],
  "204114": [
    {
      "value": {
        "id": "1000744",
        "num": 1
      },
      "type": 14
    }
  ],
  "204115": [
    {
      "value": {
        "id": "1000745",
        "num": 1
      },
      "type": 14
    }
  ],
  "204116": [
    {
      "value": {
        "id": "1000814",
        "num": 1
      },
      "type": 14
    }
  ],
  "204117": [
    {
      "value": {
        "id": "1000824",
        "num": 1
      },
      "type": 14
    }
  ],
  "204118": [
    {
      "value": {
        "id": "1000834",
        "num": 1
      },
      "type": 14
    }
  ],
  "204119": [
    {
      "value": {
        "id": "1000844",
        "num": 1
      },
      "type": 14
    }
  ],
  "204120": [
    {
      "value": {
        "id": "1000854",
        "num": 1
      },
      "type": 14
    }
  ],
  "204121": [
    {
      "value": {
        "id": "1000864",
        "num": 1
      },
      "type": 14
    }
  ],
  "204122": [
    {
      "value": {
        "id": "1000874",
        "num": 1
      },
      "type": 14
    }
  ],
  "204123": [
    {
      "value": {
        "id": "1000815",
        "num": 1
      },
      "type": 14
    }
  ],
  "204124": [
    {
      "value": {
        "id": "1000825",
        "num": 1
      },
      "type": 14
    }
  ],
  "204125": [
    {
      "value": {
        "id": "1000835",
        "num": 1
      },
      "type": 14
    }
  ],
  "204126": [
    {
      "value": {
        "id": "1000845",
        "num": 1
      },
      "type": 14
    }
  ],
  "204127": [
    {
      "value": {
        "id": "1000855",
        "num": 1
      },
      "type": 14
    }
  ],
  "204128": [
    {
      "value": {
        "id": "1000865",
        "num": 1
      },
      "type": 14
    }
  ],
  "204129": [
    {
      "value": {
        "id": "1000875",
        "num": 1
      },
      "type": 14
    }
  ],
  "204130": [
    {
      "value": {
        "id": "1000844",
        "num": 1
      },
      "type": 14
    }
  ],
  "204131": [
    {
      "value": {
        "id": "1000875",
        "num": 1
      },
      "type": 14
    }
  ],
  "204132": [
    {
      "value": {
        "id": "1000914",
        "num": 1
      },
      "type": 14
    }
  ],
  "204133": [
    {
      "value": {
        "id": "1000924",
        "num": 1
      },
      "type": 14
    }
  ],
  "204134": [
    {
      "value": {
        "id": "1000934",
        "num": 1
      },
      "type": 14
    }
  ],
  "204135": [
    {
      "value": {
        "id": "1000944",
        "num": 1
      },
      "type": 14
    }
  ],
  "204136": [
    {
      "value": {
        "id": "1000954",
        "num": 1
      },
      "type": 14
    }
  ],
  "204137": [
    {
      "value": {
        "id": "1000964",
        "num": 1
      },
      "type": 14
    }
  ],
  "204138": [
    {
      "value": {
        "id": "1000974",
        "num": 1
      },
      "type": 14
    }
  ],
  "204139": [
    {
      "value": {
        "id": "1000915",
        "num": 1
      },
      "type": 14
    }
  ],
  "204140": [
    {
      "value": {
        "id": "1000925",
        "num": 1
      },
      "type": 14
    }
  ],
  "204141": [
    {
      "value": {
        "id": "1000935",
        "num": 1
      },
      "type": 14
    }
  ],
  "204142": [
    {
      "value": {
        "id": "1000945",
        "num": 1
      },
      "type": 14
    }
  ],
  "204143": [
    {
      "value": {
        "id": "1000955",
        "num": 1
      },
      "type": 14
    }
  ],
  "204144": [
    {
      "value": {
        "id": "1000965",
        "num": 1
      },
      "type": 14
    }
  ],
  "204145": [
    {
      "value": {
        "id": "1000975",
        "num": 1
      },
      "type": 14
    }
  ],
  "204146": [
    {
      "value": {
        "id": "1000944",
        "num": 1
      },
      "type": 14
    }
  ],
  "204147": [
    {
      "value": {
        "id": "1000945",
        "num": 1
      },
      "type": 14
    }
  ],
  "204148": [
    {
      "value": {
        "id": "1001014",
        "num": 1
      },
      "type": 14
    }
  ],
  "204149": [
    {
      "value": {
        "id": "1001024",
        "num": 1
      },
      "type": 14
    }
  ],
  "204150": [
    {
      "value": {
        "id": "1001034",
        "num": 1
      },
      "type": 14
    }
  ],
  "204151": [
    {
      "value": {
        "id": "1001044",
        "num": 1
      },
      "type": 14
    }
  ],
  "204152": [
    {
      "value": {
        "id": "1001054",
        "num": 1
      },
      "type": 14
    }
  ],
  "204153": [
    {
      "value": {
        "id": "1001064",
        "num": 1
      },
      "type": 14
    }
  ],
  "204154": [
    {
      "value": {
        "id": "1001074",
        "num": 1
      },
      "type": 14
    }
  ],
  "204155": [
    {
      "value": {
        "id": "1001015",
        "num": 1
      },
      "type": 14
    }
  ],
  "204156": [
    {
      "value": {
        "id": "1001025",
        "num": 1
      },
      "type": 14
    }
  ],
  "204157": [
    {
      "value": {
        "id": "1001035",
        "num": 1
      },
      "type": 14
    }
  ],
  "204158": [
    {
      "value": {
        "id": "1001045",
        "num": 1
      },
      "type": 14
    }
  ],
  "204159": [
    {
      "value": {
        "id": "1001055",
        "num": 1
      },
      "type": 14
    }
  ],
  "204160": [
    {
      "value": {
        "id": "1001065",
        "num": 1
      },
      "type": 14
    }
  ],
  "204161": [
    {
      "value": {
        "id": "1001075",
        "num": 1
      },
      "type": 14
    }
  ],
  "204162": [
    {
      "value": {
        "id": "1001034",
        "num": 1
      },
      "type": 14
    }
  ],
  "204163": [
    {
      "value": {
        "id": "1001075",
        "num": 1
      },
      "type": 14
    }
  ],
  "204164": [
    {
      "value": {
        "id": "1001114",
        "num": 1
      },
      "type": 14
    }
  ],
  "204165": [
    {
      "value": {
        "id": "1001124",
        "num": 1
      },
      "type": 14
    }
  ],
  "204166": [
    {
      "value": {
        "id": "1001134",
        "num": 1
      },
      "type": 14
    }
  ],
  "204167": [
    {
      "value": {
        "id": "1001144",
        "num": 1
      },
      "type": 14
    }
  ],
  "204168": [
    {
      "value": {
        "id": "1001154",
        "num": 1
      },
      "type": 14
    }
  ],
  "204169": [
    {
      "value": {
        "id": "1001164",
        "num": 1
      },
      "type": 14
    }
  ],
  "204170": [
    {
      "value": {
        "id": "1001174",
        "num": 1
      },
      "type": 14
    }
  ],
  "204171": [
    {
      "value": {
        "id": "1001115",
        "num": 1
      },
      "type": 14
    }
  ],
  "204172": [
    {
      "value": {
        "id": "1001125",
        "num": 1
      },
      "type": 14
    }
  ],
  "204173": [
    {
      "value": {
        "id": "1001135",
        "num": 1
      },
      "type": 14
    }
  ],
  "204174": [
    {
      "value": {
        "id": "1001145",
        "num": 1
      },
      "type": 14
    }
  ],
  "204175": [
    {
      "value": {
        "id": "1001155",
        "num": 1
      },
      "type": 14
    }
  ],
  "204176": [
    {
      "value": {
        "id": "1001165",
        "num": 1
      },
      "type": 14
    }
  ],
  "204177": [
    {
      "value": {
        "id": "1001175",
        "num": 1
      },
      "type": 14
    }
  ],
  "204178": [
    {
      "value": {
        "id": "1001114",
        "num": 1
      },
      "type": 14
    }
  ],
  "204179": [
    {
      "value": {
        "id": "1001145",
        "num": 1
      },
      "type": 14
    }
  ],
  "204180": [
    {
      "value": {
        "id": "1000713",
        "num": 1
      },
      "type": 14
    }
  ],
  "204181": [
    {
      "value": {
        "id": "1000723",
        "num": 1
      },
      "type": 14
    }
  ],
  "204182": [
    {
      "value": {
        "id": "1000733",
        "num": 1
      },
      "type": 14
    }
  ],
  "204183": [
    {
      "value": {
        "id": "1000743",
        "num": 1
      },
      "type": 14
    }
  ],
  "204184": [
    {
      "value": {
        "id": "1000753",
        "num": 1
      },
      "type": 14
    }
  ],
  "204185": [
    {
      "value": {
        "id": "1000763",
        "num": 1
      },
      "type": 14
    }
  ],
  "204186": [
    {
      "value": {
        "id": "1000773",
        "num": 1
      },
      "type": 14
    }
  ],
  "204187": [
    {
      "value": {
        "id": "1000813",
        "num": 1
      },
      "type": 14
    }
  ],
  "204188": [
    {
      "value": {
        "id": "1000823",
        "num": 1
      },
      "type": 14
    }
  ],
  "204189": [
    {
      "value": {
        "id": "1000833",
        "num": 1
      },
      "type": 14
    }
  ],
  "204190": [
    {
      "value": {
        "id": "1000843",
        "num": 1
      },
      "type": 14
    }
  ],
  "204191": [
    {
      "value": {
        "id": "1000853",
        "num": 1
      },
      "type": 14
    }
  ],
  "204192": [
    {
      "value": {
        "id": "1000863",
        "num": 1
      },
      "type": 14
    }
  ],
  "204193": [
    {
      "value": {
        "id": "1000873",
        "num": 1
      },
      "type": 14
    }
  ],
  "204194": [
    {
      "value": {
        "id": "1000913",
        "num": 1
      },
      "type": 14
    }
  ],
  "204195": [
    {
      "value": {
        "id": "1000923",
        "num": 1
      },
      "type": 14
    }
  ],
  "204196": [
    {
      "value": {
        "id": "1000933",
        "num": 1
      },
      "type": 14
    }
  ],
  "204197": [
    {
      "value": {
        "id": "1000943",
        "num": 1
      },
      "type": 14
    }
  ],
  "204198": [
    {
      "value": {
        "id": "1000953",
        "num": 1
      },
      "type": 14
    }
  ],
  "204199": [
    {
      "value": {
        "id": "1000963",
        "num": 1
      },
      "type": 14
    }
  ],
  "204200": [
    {
      "value": {
        "id": "1000973",
        "num": 1
      },
      "type": 14
    }
  ],
  "204201": [
    {
      "value": {
        "id": "1001013",
        "num": 1
      },
      "type": 14
    }
  ],
  "204202": [
    {
      "value": {
        "id": "1001023",
        "num": 1
      },
      "type": 14
    }
  ],
  "204203": [
    {
      "value": {
        "id": "1001033",
        "num": 1
      },
      "type": 14
    }
  ],
  "204204": [
    {
      "value": {
        "id": "1001043",
        "num": 1
      },
      "type": 14
    }
  ],
  "204205": [
    {
      "value": {
        "id": "1001053",
        "num": 1
      },
      "type": 14
    }
  ],
  "204206": [
    {
      "value": {
        "id": "1001063",
        "num": 1
      },
      "type": 14
    }
  ],
  "204207": [
    {
      "value": {
        "id": "1001073",
        "num": 1
      },
      "type": 14
    }
  ],
  "204208": [
    {
      "value": {
        "id": "1001113",
        "num": 1
      },
      "type": 14
    }
  ],
  "204209": [
    {
      "value": {
        "id": "1001123",
        "num": 1
      },
      "type": 14
    }
  ],
  "204210": [
    {
      "value": {
        "id": "1001133",
        "num": 1
      },
      "type": 14
    }
  ],
  "204211": [
    {
      "value": {
        "id": "1001143",
        "num": 1
      },
      "type": 14
    }
  ],
  "204212": [
    {
      "value": {
        "id": "1001153",
        "num": 1
      },
      "type": 14
    }
  ],
  "204213": [
    {
      "value": {
        "id": "1001163",
        "num": 1
      },
      "type": 14
    }
  ],
  "204214": [
    {
      "value": {
        "id": "1001173",
        "num": 1
      },
      "type": 14
    }
  ],
  "204215": [
    {
      "value": {
        "id": "1001213",
        "num": 1
      },
      "type": 14
    }
  ],
  "204216": [
    {
      "value": {
        "id": "1001223",
        "num": 1
      },
      "type": 14
    }
  ],
  "204217": [
    {
      "value": {
        "id": "1001233",
        "num": 1
      },
      "type": 14
    }
  ],
  "204218": [
    {
      "value": {
        "id": "1001243",
        "num": 1
      },
      "type": 14
    }
  ],
  "204219": [
    {
      "value": {
        "id": "1001253",
        "num": 1
      },
      "type": 14
    }
  ],
  "204220": [
    {
      "value": {
        "id": "1001263",
        "num": 1
      },
      "type": 14
    }
  ],
  "204221": [
    {
      "value": {
        "id": "1001273",
        "num": 1
      },
      "type": 14
    }
  ],
  "204222": [
    {
      "value": {
        "id": "1001214",
        "num": 1
      },
      "type": 14
    }
  ],
  "204223": [
    {
      "value": {
        "id": "1001224",
        "num": 1
      },
      "type": 14
    }
  ],
  "204224": [
    {
      "value": {
        "id": "1001234",
        "num": 1
      },
      "type": 14
    }
  ],
  "204225": [
    {
      "value": {
        "id": "1001244",
        "num": 1
      },
      "type": 14
    }
  ],
  "204226": [
    {
      "value": {
        "id": "1001254",
        "num": 1
      },
      "type": 14
    }
  ],
  "204227": [
    {
      "value": {
        "id": "1001264",
        "num": 1
      },
      "type": 14
    }
  ],
  "204228": [
    {
      "value": {
        "id": "1001274",
        "num": 1
      },
      "type": 14
    }
  ],
  "204229": [
    {
      "value": {
        "id": "1001215",
        "num": 1
      },
      "type": 14
    }
  ],
  "204230": [
    {
      "value": {
        "id": "1001225",
        "num": 1
      },
      "type": 14
    }
  ],
  "204231": [
    {
      "value": {
        "id": "1001235",
        "num": 1
      },
      "type": 14
    }
  ],
  "204232": [
    {
      "value": {
        "id": "1001245",
        "num": 1
      },
      "type": 14
    }
  ],
  "204233": [
    {
      "value": {
        "id": "1001255",
        "num": 1
      },
      "type": 14
    }
  ],
  "204234": [
    {
      "value": {
        "id": "1001265",
        "num": 1
      },
      "type": 14
    }
  ],
  "204235": [
    {
      "value": {
        "id": "1001275",
        "num": 1
      },
      "type": 14
    }
  ],
  "204236": [
    {
      "value": {
        "id": "1001244",
        "num": 1
      },
      "type": 14
    }
  ],
  "204237": [
    {
      "value": {
        "id": "1001235",
        "num": 1
      },
      "type": 14
    }
  ],
  "204238": [
    {
      "value": {
        "id": "1001313",
        "num": 1
      },
      "type": 14
    }
  ],
  "204239": [
    {
      "value": {
        "id": "1001323",
        "num": 1
      },
      "type": 14
    }
  ],
  "204240": [
    {
      "value": {
        "id": "1001333",
        "num": 1
      },
      "type": 14
    }
  ],
  "204241": [
    {
      "value": {
        "id": "1001343",
        "num": 1
      },
      "type": 14
    }
  ],
  "204242": [
    {
      "value": {
        "id": "1001353",
        "num": 1
      },
      "type": 14
    }
  ],
  "204243": [
    {
      "value": {
        "id": "1001363",
        "num": 1
      },
      "type": 14
    }
  ],
  "204244": [
    {
      "value": {
        "id": "1001373",
        "num": 1
      },
      "type": 14
    }
  ],
  "204245": [
    {
      "value": {
        "id": "1001314",
        "num": 1
      },
      "type": 14
    }
  ],
  "204246": [
    {
      "value": {
        "id": "1001324",
        "num": 1
      },
      "type": 14
    }
  ],
  "204247": [
    {
      "value": {
        "id": "1001334",
        "num": 1
      },
      "type": 14
    }
  ],
  "204248": [
    {
      "value": {
        "id": "1001344",
        "num": 1
      },
      "type": 14
    }
  ],
  "204249": [
    {
      "value": {
        "id": "1001354",
        "num": 1
      },
      "type": 14
    }
  ],
  "204250": [
    {
      "value": {
        "id": "1001364",
        "num": 1
      },
      "type": 14
    }
  ],
  "204251": [
    {
      "value": {
        "id": "1001374",
        "num": 1
      },
      "type": 14
    }
  ],
  "204252": [
    {
      "value": {
        "id": "1001315",
        "num": 1
      },
      "type": 14
    }
  ],
  "204253": [
    {
      "value": {
        "id": "1001325",
        "num": 1
      },
      "type": 14
    }
  ],
  "204254": [
    {
      "value": {
        "id": "1001335",
        "num": 1
      },
      "type": 14
    }
  ],
  "204255": [
    {
      "value": {
        "id": "1001345",
        "num": 1
      },
      "type": 14
    }
  ],
  "204256": [
    {
      "value": {
        "id": "1001355",
        "num": 1
      },
      "type": 14
    }
  ],
  "204257": [
    {
      "value": {
        "id": "1001365",
        "num": 1
      },
      "type": 14
    }
  ],
  "204258": [
    {
      "value": {
        "id": "1001375",
        "num": 1
      },
      "type": 14
    }
  ],
  "204259": [
    {
      "value": {
        "id": "1001324",
        "num": 1
      },
      "type": 14
    }
  ],
  "204260": [
    {
      "value": {
        "id": "1001335",
        "num": 1
      },
      "type": 14
    }
  ],
  "204261": [
    {
      "value": {
        "id": "1001413",
        "num": 1
      },
      "type": 14
    }
  ],
  "204262": [
    {
      "value": {
        "id": "1001423",
        "num": 1
      },
      "type": 14
    }
  ],
  "204263": [
    {
      "value": {
        "id": "1001433",
        "num": 1
      },
      "type": 14
    }
  ],
  "204264": [
    {
      "value": {
        "id": "1001443",
        "num": 1
      },
      "type": 14
    }
  ],
  "204265": [
    {
      "value": {
        "id": "1001453",
        "num": 1
      },
      "type": 14
    }
  ],
  "204266": [
    {
      "value": {
        "id": "1001463",
        "num": 1
      },
      "type": 14
    }
  ],
  "204267": [
    {
      "value": {
        "id": "1001473",
        "num": 1
      },
      "type": 14
    }
  ],
  "204268": [
    {
      "value": {
        "id": "1001414",
        "num": 1
      },
      "type": 14
    }
  ],
  "204269": [
    {
      "value": {
        "id": "1001424",
        "num": 1
      },
      "type": 14
    }
  ],
  "204270": [
    {
      "value": {
        "id": "1001434",
        "num": 1
      },
      "type": 14
    }
  ],
  "204271": [
    {
      "value": {
        "id": "1001444",
        "num": 1
      },
      "type": 14
    }
  ],
  "204272": [
    {
      "value": {
        "id": "1001454",
        "num": 1
      },
      "type": 14
    }
  ],
  "204273": [
    {
      "value": {
        "id": "1001464",
        "num": 1
      },
      "type": 14
    }
  ],
  "204274": [
    {
      "value": {
        "id": "1001474",
        "num": 1
      },
      "type": 14
    }
  ],
  "204275": [
    {
      "value": {
        "id": "1001415",
        "num": 1
      },
      "type": 14
    }
  ],
  "204276": [
    {
      "value": {
        "id": "1001425",
        "num": 1
      },
      "type": 14
    }
  ],
  "204277": [
    {
      "value": {
        "id": "1001435",
        "num": 1
      },
      "type": 14
    }
  ],
  "204278": [
    {
      "value": {
        "id": "1001445",
        "num": 1
      },
      "type": 14
    }
  ],
  "204279": [
    {
      "value": {
        "id": "1001455",
        "num": 1
      },
      "type": 14
    }
  ],
  "204280": [
    {
      "value": {
        "id": "1001465",
        "num": 1
      },
      "type": 14
    }
  ],
  "204281": [
    {
      "value": {
        "id": "1001475",
        "num": 1
      },
      "type": 14
    }
  ],
  "204282": [
    {
      "value": {
        "id": "1001444",
        "num": 1
      },
      "type": 14
    }
  ],
  "204283": [
    {
      "value": {
        "id": "1001415",
        "num": 1
      },
      "type": 14
    }
  ],
  "204284": [
    {
      "value": {
        "id": "1001513",
        "num": 1
      },
      "type": 14
    }
  ],
  "204285": [
    {
      "value": {
        "id": "1001523",
        "num": 1
      },
      "type": 14
    }
  ],
  "204286": [
    {
      "value": {
        "id": "1001533",
        "num": 1
      },
      "type": 14
    }
  ],
  "204287": [
    {
      "value": {
        "id": "1001543",
        "num": 1
      },
      "type": 14
    }
  ],
  "204288": [
    {
      "value": {
        "id": "1001553",
        "num": 1
      },
      "type": 14
    }
  ],
  "204289": [
    {
      "value": {
        "id": "1001563",
        "num": 1
      },
      "type": 14
    }
  ],
  "204290": [
    {
      "value": {
        "id": "1001573",
        "num": 1
      },
      "type": 14
    }
  ],
  "204291": [
    {
      "value": {
        "id": "1001514",
        "num": 1
      },
      "type": 14
    }
  ],
  "204292": [
    {
      "value": {
        "id": "1001524",
        "num": 1
      },
      "type": 14
    }
  ],
  "204293": [
    {
      "value": {
        "id": "1001534",
        "num": 1
      },
      "type": 14
    }
  ],
  "204294": [
    {
      "value": {
        "id": "1001544",
        "num": 1
      },
      "type": 14
    }
  ],
  "204295": [
    {
      "value": {
        "id": "1001554",
        "num": 1
      },
      "type": 14
    }
  ],
  "204296": [
    {
      "value": {
        "id": "1001564",
        "num": 1
      },
      "type": 14
    }
  ],
  "204297": [
    {
      "value": {
        "id": "1001574",
        "num": 1
      },
      "type": 14
    }
  ],
  "204298": [
    {
      "value": {
        "id": "1001515",
        "num": 1
      },
      "type": 14
    }
  ],
  "204299": [
    {
      "value": {
        "id": "1001525",
        "num": 1
      },
      "type": 14
    }
  ],
  "204300": [
    {
      "value": {
        "id": "1001535",
        "num": 1
      },
      "type": 14
    }
  ],
  "204301": [
    {
      "value": {
        "id": "1001545",
        "num": 1
      },
      "type": 14
    }
  ],
  "204302": [
    {
      "value": {
        "id": "1001555",
        "num": 1
      },
      "type": 14
    }
  ],
  "204303": [
    {
      "value": {
        "id": "1001565",
        "num": 1
      },
      "type": 14
    }
  ],
  "204304": [
    {
      "value": {
        "id": "1001575",
        "num": 1
      },
      "type": 14
    }
  ],
  "204305": [
    {
      "value": {
        "id": "1001524",
        "num": 1
      },
      "type": 14
    }
  ],
  "204306": [
    {
      "value": {
        "id": "1001525",
        "num": 1
      },
      "type": 14
    }
  ],
  "207000": [
    {
      "value": {
        "id": "203001",
        "num": 1
      },
      "type": 7
    }
  ],
  "207001": [
    {
      "value": {
        "id": "203011",
        "num": 1
      },
      "type": 7
    }
  ],
  "207002": [
    {
      "value": {
        "id": "203081",
        "num": 1
      },
      "type": 7
    }
  ],
  "207020": [
    {
      "value": {
        "id": "200366",
        "num": 20
      },
      "type": 7
    },
    {
      "value": {
        "id": "200002",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200875",
        "num": 4
      },
      "type": 7
    },
    {
      "value": {
        "id": "200371",
        "num": 2
      },
      "type": 7
    }
  ],
  "207021": [
    {
      "value": {
        "id": "200364",
        "num": 37
      },
      "type": 7
    }
  ],
  "207049": [
    {
      "value": {
        "id": "206008",
        "num": 7
      },
      "type": 7
    },
    {
      "value": {
        "id": "200201",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200215",
        "num": 2
      },
      "type": 7
    }
  ],
  "207050": [
    {
      "value": {
        "id": "200306",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200321",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200336",
        "num": 5
      },
      "type": 7
    }
  ],
  "207051": [
    {
      "value": {
        "id": "200047",
        "num": 15
      },
      "type": 7
    },
    {
      "value": {
        "id": "200048",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200320",
        "num": 1
      },
      "type": 7
    }
  ],
  "207052": [
    {
      "value": {
        "id": "200226",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200321",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200312",
        "num": 2
      },
      "type": 7
    }
  ],
  "207053": [
    {
      "value": {
        "id": "200329",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200320",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200201",
        "num": 30
      },
      "type": 7
    },
    {
      "value": {
        "id": "200309",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200330",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200319",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200226",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200364",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200310",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200339",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 10
      },
      "type": 7
    }
  ],
  "207054": [
    {
      "value": {
        "id": "200329",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200320",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200201",
        "num": 25
      },
      "type": 7
    },
    {
      "value": {
        "id": "200309",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200330",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200319",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200226",
        "num": 15
      },
      "type": 7
    },
    {
      "value": {
        "id": "200364",
        "num": 4
      },
      "type": 7
    },
    {
      "value": {
        "id": "200310",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200339",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 15
      },
      "type": 7
    }
  ],
  "207055": [
    {
      "value": {
        "id": "200329",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200320",
        "num": 15
      },
      "type": 7
    },
    {
      "value": {
        "id": "200201",
        "num": 25
      },
      "type": 7
    },
    {
      "value": {
        "id": "200309",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200330",
        "num": 15
      },
      "type": 7
    },
    {
      "value": {
        "id": "200319",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200226",
        "num": 20
      },
      "type": 7
    },
    {
      "value": {
        "id": "200364",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200310",
        "num": 15
      },
      "type": 7
    },
    {
      "value": {
        "id": "200339",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 20
      },
      "type": 7
    }
  ],
  "207056": [
    {
      "value": {
        "id": "200320",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200331",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200330",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200226",
        "num": 20
      },
      "type": 7
    },
    {
      "value": {
        "id": "200200",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200329",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200201",
        "num": 15
      },
      "type": 7
    },
    {
      "value": {
        "id": "200309",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200319",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200364",
        "num": 9
      },
      "type": 7
    },
    {
      "value": {
        "id": "200321",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200301",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200310",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200311",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200339",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 6
      },
      "type": 7
    }
  ],
  "207057": [
    {
      "value": {
        "id": "200366",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200365",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200320",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200331",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200330",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200226",
        "num": 30
      },
      "type": 7
    },
    {
      "value": {
        "id": "200200",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200329",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200309",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200319",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200321",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200301",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200310",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200311",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200339",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 6
      },
      "type": 7
    }
  ],
  "207058": [
    {
      "value": {
        "id": "200366",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200320",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200331",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200330",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200226",
        "num": 30
      },
      "type": 7
    },
    {
      "value": {
        "id": "200200",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200329",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200309",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200319",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200364",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200321",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200301",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200310",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200311",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200339",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 6
      },
      "type": 7
    }
  ],
  "209001": [
    {
      "value": {
        "id": "209000",
        "num": 20
      },
      "type": 7
    }
  ],
  "209002": [
    {
      "value": {
        "id": "209000",
        "num": 200
      },
      "type": 7
    }
  ],
  "209003": [
    {
      "value": {
        "id": "209000",
        "num": 1000
      },
      "type": 7
    }
  ],
  "209008": [
    {
      "value": {
        "id": "200206",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "203031",
        "num": 1
      },
      "type": 7
    }
  ],
  "209172": [
    {
      "value": {
        "id": "200317",
        "num": 1
      },
      "type": 7
    }
  ],
  "209173": [
    {
      "value": {
        "id": "200337",
        "num": 1
      },
      "type": 7
    }
  ],
  "209175": [
    {
      "value": {
        "id": "200322",
        "num": 1
      },
      "type": 7
    }
  ],
  "209176": [
    {
      "value": {
        "id": "200200",
        "num": 10
      },
      "type": 7
    },
    {
      "value": {
        "id": "200714",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200332",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200002",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200411",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200322",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200302",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200313",
        "num": 1
      },
      "type": 7
    }
  ],
  "209177": [
    {
      "value": {
        "id": "200031",
        "num": 1
      },
      "type": 7
    }
  ],
  "209179": [
    {
      "value": {
        "id": "200361",
        "num": 1
      },
      "type": 7
    }
  ],
  "209180": [
    {
      "value": {
        "id": "200047",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200215",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200205",
        "num": 2
      },
      "type": 7
    }
  ],
  "209181": [
    {
      "value": {
        "id": "200201",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200331",
        "num": 4
      },
      "type": 7
    },
    {
      "value": {
        "id": "200306",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200326",
        "num": 5
      },
      "type": 7
    }
  ],
  "209182": [
    {
      "value": {
        "id": "200424",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200393",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200306",
        "num": 8
      },
      "type": 7
    },
    {
      "value": {
        "id": "200316",
        "num": 8
      },
      "type": 7
    },
    {
      "value": {
        "id": "200336",
        "num": 8
      },
      "type": 7
    }
  ],
  "209500": [
    {
      "value": {
        "id": "200331",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200301",
        "num": 2
      },
      "type": 7
    }
  ],
  "209564": [
    {
      "value": 1000,
      "type": 0
    },
    {
      "value": 1000,
      "type": 3
    }
  ],
  "209565": [
    {
      "value": 2800,
      "type": 0
    },
    {
      "value": 400,
      "type": 2
    },
    {
      "value": 2800,
      "type": 3
    }
  ],
  "209566": [
    {
      "value": 6100,
      "type": 0
    },
    {
      "value": 200,
      "type": 1
    },
    {
      "value": 500,
      "type": 2
    },
    {
      "value": 6100,
      "type": 3
    }
  ],
  "209567": [
    {
      "value": 30500,
      "type": 0
    },
    {
      "value": 1000,
      "type": 1
    },
    {
      "value": 2500,
      "type": 2
    },
    {
      "value": 30500,
      "type": 3
    }
  ],
  "209586": [
    {
      "value": {
        "id": "200207",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200393",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200306",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 1
      },
      "type": 7
    }
  ],
  "209587": [
    {
      "value": {
        "id": "200207",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200393",
        "num": 2
      },
      "type": 7
    },
    {
      "value": {
        "id": "200351",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 2
      },
      "type": 7
    }
  ],
  "209588": [
    {
      "value": {
        "id": "200207",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200393",
        "num": 3
      },
      "type": 7
    },
    {
      "value": {
        "id": "200306",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 3
      },
      "type": 7
    }
  ],
  "209589": [
    {
      "value": {
        "id": "200207",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200393",
        "num": 4
      },
      "type": 7
    },
    {
      "value": {
        "id": "200306",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 4
      },
      "type": 7
    }
  ],
  "209590": [
    {
      "value": {
        "id": "200207",
        "num": 6
      },
      "type": 7
    },
    {
      "value": {
        "id": "200393",
        "num": 5
      },
      "type": 7
    },
    {
      "value": {
        "id": "200306",
        "num": 1
      },
      "type": 7
    },
    {
      "value": {
        "id": "200300",
        "num": 5
      },
      "type": 7
    }
  ],
  "209591": [
    {
      "value": {
        "id": "200031",
        "num": 1
      },
      "type": 7
    }
  ],
  "209592": [
    {
      "value": {
        "id": "200300",
        "num": 1
      },
      "type": 7
    }
  ],
  "209593": [
    {
      "value": {
        "id": "200320",
        "num": 1
      },
      "type": 7
    }
  ],
  "209594": [
    {
      "value": {
        "id": "200320",
        "num": 1
      },
      "type": 7
    }
  ],
  "209595": [
    {
      "value": {
        "id": "200320",
        "num": 1
      },
      "type": 7
    }
  ],
  "209596": [
    {
      "value": {
        "id": "203242",
        "num": 1
      },
      "type": 7
    }
  ],
  "209597": [
    {
      "value": {
        "id": "203314",
        "num": 2
      },
      "type": 7
    }
  ],
  "209598": [
    {
      "value": {
        "id": "203262",
        "num": 1
      },
      "type": 7
    }
  ],
  "209599": [
    {
      "value": {
        "id": "203101",
        "num": 1
      },
      "type": 7
    }
  ],
  "209600": [
    {
      "value": {
        "id": "203002",
        "num": 1
      },
      "type": 7
    }
  ],
  "209601": [
    {
      "value": {
        "id": "203053",
        "num": 1
      },
      "type": 7
    }
  ],
  "209602": [
    {
      "value": {
        "id": "203194",
        "num": 1
      },
      "type": 7
    }
  ],
  "209603": [
    {
      "value": {
        "id": "203105",
        "num": 1
      },
      "type": 7
    }
  ],
  "209604": [
    {
      "value": {
        "id": "203292",
        "num": 1
      },
      "type": 7
    }
  ],
  "209605": [
    {
      "value": {
        "id": "203284",
        "num": 2
      },
      "type": 7
    }
  ],
  "209606": [
    {
      "value": {
        "id": "203232",
        "num": 1
      },
      "type": 7
    }
  ],
  "209607": [
    {
      "value": {
        "id": "203332",
        "num": 1
      },
      "type": 7
    }
  ],
  "209608": [
    {
      "value": {
        "id": "203254",
        "num": 2
      },
      "type": 7
    }
  ],
  "209609": [
    {
      "value": {
        "id": "203321",
        "num": 1
      },
      "type": 7
    }
  ],
  "209610": [
    {
      "value": {
        "id": "203352",
        "num": 1
      },
      "type": 7
    }
  ],
  "209611": [
    {
      "value": {
        "id": "203384",
        "num": 1
      },
      "type": 7
    }
  ],
  "209612": [
    {
      "value": {
        "id": "203362",
        "num": 1
      },
      "type": 7
    }
  ]
});

function cloneRewardValue(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(cloneRewardValue);
  }

  const copy = {};
  for (const [key, child] of Object.entries(value)) {
    copy[key] = cloneRewardValue(child);
  }
  return copy;
}

function getVerifiedStoreReward(id) {
  const reward =
    STORE_RESOURCE_REWARDS[String(id)];

  return reward
    ? cloneRewardValue(reward)
    : null;
}

function getVerifiedStoreRewardIds() {
  return Object.keys(
    STORE_RESOURCE_REWARDS
  );
}

module.exports = {
  STORE_RESOURCE_REWARDS,
  getVerifiedStoreReward,
  getVerifiedStoreRewardIds
};
