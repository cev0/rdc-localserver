"use strict";

const crypto = require("crypto");

/*
 * Verified Last Shelter v1.250.102 hero reference from the real init payload.
 *
 * heroTemplates are preserved as server-supplied template fields. Numeric/
 * string semantics that are not independently mapped stay raw. The legacy RDC
 * qehreman catalog is NOT used as a source of Last Shelter values here.
 */

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const LAST_SHELTER_HERO_TEMPLATES = deepFreeze([
  {
    "unlock_type": "0",
    "id": "240030",
    "power": "500",
    "is_star": "0",
    "pic": "hero0"
  },
  {
    "skill_id_new": "670101;670201;680001;670401;690002",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero1",
    "unlock_type": "1",
    "compose": "206001",
    "rate": "100",
    "is_advance": "0",
    "skill_id": "680001;690002",
    "level_min": "15",
    "id": "240031",
    "power": "1500",
    "is_star": "1",
    "unlock_para": "9"
  },
  {
    "skill_id_new": "670102;670202;690003;670402;680002",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero2",
    "unlock_type": "1",
    "compose": "206002",
    "rate": "100",
    "is_advance": "0",
    "skill_id": "680002;690003",
    "level_min": "25",
    "id": "240032",
    "power": "1750",
    "is_star": "1",
    "unlock_para": "13"
  },
  {
    "skill_id_new": "670103;670203;680003;670403;690001",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero3",
    "unlock_type": "1",
    "compose": "206003",
    "rate": "100",
    "is_advance": "0",
    "skill_id": "680003;690001",
    "level_min": "20",
    "id": "240033",
    "power": "1500",
    "is_star": "1",
    "unlock_para": "3"
  },
  {
    "skill_id_new": "670104;670204;680005;670404;680004",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero4",
    "unlock_type": "1",
    "compose": "206004",
    "rate": "100",
    "is_advance": "0",
    "skill_id": "680004;680005",
    "level_min": "10",
    "id": "240034",
    "power": "1250",
    "is_star": "1",
    "unlock_para": "4"
  },
  {
    "skill_id_new": "670105;670205;690004;670405;680006",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero5",
    "unlock_type": "1",
    "compose": "206005",
    "rate": "100",
    "is_advance": "0",
    "skill_id": "680006;690004",
    "level_min": "20",
    "id": "240035",
    "power": "2500",
    "is_star": "1",
    "unlock_para": "14"
  },
  {
    "skill_id_new": "670106;670206;690005;670406;680007",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero6",
    "unlock_type": "1",
    "compose": "206006",
    "rate": "100",
    "is_advance": "0",
    "skill_id": "680007;690005",
    "level_min": "20",
    "id": "240036",
    "power": "3000",
    "is_star": "1",
    "unlock_para": "16"
  },
  {
    "is_visible": "close",
    "skill_id_new": "670107;670207;680009;670407;680008",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero7",
    "unlock_type": "2",
    "compose": "206007",
    "is_advance": "0",
    "skill_id": "680008;680009",
    "level_min": "15",
    "id": "240037",
    "power": "2000",
    "is_star": "1",
    "unlock_para": "0"
  },
  {
    "skill_id_new": "670108;670208;690006;670408;680010",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero8",
    "unlock_type": "1",
    "compose": "206008",
    "rate": "100",
    "is_advance": "0",
    "skill_id": "690006;680010",
    "level_min": "15",
    "id": "240038",
    "power": "1500",
    "is_star": "1",
    "unlock_para": "15"
  },
  {
    "skill_id_new": "670109;670209;680011;670409;690007",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero9",
    "unlock_type": "1",
    "compose": "206009",
    "rate": "100",
    "is_advance": "0",
    "skill_id": "690007;680011",
    "level_min": "20",
    "id": "240039",
    "power": "3000",
    "is_star": "1",
    "unlock_para": "18"
  },
  {
    "skill_id_new": "670110;670210;680012;670410;690008",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero10",
    "unlock_type": "1",
    "compose": "206010",
    "rate": "100",
    "is_advance": "0",
    "skill_id": "690008;680012",
    "level_min": "20",
    "id": "240040",
    "power": "3000",
    "is_star": "1",
    "unlock_para": "19"
  },
  {
    "is_visible": "close",
    "skill_id_new": "670111;670211;680013;670411;690009",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero11",
    "unlock_type": "1",
    "compose": "206011",
    "is_advance": "1",
    "skill_id": "690009;680013",
    "level_min": "15",
    "id": "240041",
    "power": "2000",
    "is_star": "1",
    "unlock_para": "1"
  },
  {
    "skill_id_new": "670112;670212;680016;670412;680017",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero12",
    "unlock_type": "1",
    "compose": "206012",
    "rate": "100",
    "is_advance": "0",
    "skill_id": "680017;680016",
    "level_min": "20",
    "id": "240042",
    "power": "3000",
    "is_star": "1",
    "unlock_para": "10"
  },
  {
    "is_visible": "close",
    "skill_id_new": "670113;670213;680019;670413;680018",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero13",
    "unlock_type": "1",
    "compose": "206013",
    "is_advance": "0",
    "online": "close",
    "skill_id": "680018;680019",
    "level_min": "20",
    "id": "240043",
    "power": "3000",
    "is_star": "1",
    "unlock_para": "0"
  },
  {
    "skill_id_new": "670114;670214;690012;670414;680020",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero14",
    "unlock_type": "1",
    "compose": "206014",
    "rate": "100",
    "is_advance": "0",
    "skill_id": "680020;690012",
    "level_min": "20",
    "id": "240044",
    "power": "2500",
    "is_star": "1",
    "unlock_para": "16"
  },
  {
    "skill_id_new": "670115;670215;680022;670415;680021",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero15",
    "unlock_type": "1",
    "compose": "206015",
    "rate": "100",
    "is_advance": "0",
    "skill_id": "680021;680022",
    "level_min": "20",
    "id": "240045",
    "power": "3000",
    "is_star": "1",
    "unlock_para": "13"
  },
  {
    "skill_id_new": "690013;680025;680023;680026;680027",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero16",
    "unlock_type": "1",
    "compose": "206016",
    "is_advance": "0",
    "skill_id": "680023;690013",
    "level_min": "20",
    "id": "240046",
    "power": "2000",
    "is_star": "1",
    "unlock_para": "5"
  },
  {
    "skill_id_new": "670117;670417;680024;670217;690014",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero17",
    "unlock_type": "1",
    "compose": "206017",
    "rate": "100",
    "is_advance": "0",
    "skill_id": "690014;680024",
    "level_min": "20",
    "id": "240047",
    "power": "3000",
    "is_star": "1",
    "unlock_para": "24"
  },
  {
    "skill_id_new": "680028;680029;690015;680030;680031",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero18",
    "unlock_type": "1",
    "compose": "206018",
    "rate": "100",
    "is_advance": "0",
    "skill_id": "690015;680028",
    "level_min": "20",
    "id": "240048",
    "power": "4000",
    "is_star": "1",
    "unlock_para": "22"
  },
  {
    "skill_id_new": "680034;680032;680033;680035;690016",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero19",
    "unlock_type": "1",
    "compose": "206019",
    "is_advance": "0",
    "skill_id": "690035;690016",
    "level_min": "20",
    "id": "240049",
    "power": "4000",
    "is_star": "1",
    "unlock_para": "17"
  },
  {
    "skill_id_new": "680036;680037;680038;680039;690017",
    "num_new": "300;500;1000;1800;2800",
    "num": "6000",
    "pic": "hero20",
    "unlock_type": "1",
    "compose": "206020",
    "rate": "0",
    "is_advance": "0",
    "skill_id": "680039;690017",
    "level_min": "20",
    "id": "240050",
    "power": "3000",
    "is_star": "1",
    "unlock_para": "19"
  }
]);

const LAST_SHELTER_HERO_DATA_CONFIG = deepFreeze({
  "hero": {
    "k1": "10",
    "k2": "20",
    "k3": "40",
    "k4": "80",
    "k5": "200"
  },
  "heroUp": {
    "k1": "8",
    "k2": "8",
    "k3": "20"
  },
  "heroSkillPoint": {
    "k1": "3",
    "k2": "3",
    "k3": "3",
    "k4": "3",
    "k5": "3",
    "k6": "3"
  },
  "heroNumber": {
    "k1": "16",
    "k2": "3",
    "k3": "3",
    "k4": "2000|4000|6000"
  },
  "flags": {
    "newHeroSwitch": 1,
    "heroRestSwitch": 1,
    "heroSkillLvup": 1,
    "heroInformation": 1,
    "heroCd": 1,
    "emptySkillSlot": 1
  },
  "onlineDurationRecruitHero": "240041"
});

const LAST_SHELTER_STARTER_GENERAL = deepFreeze({
  generalId: "240020",
  level: 1,
  att: 0,
  defence: 0,
  status: 1,
  skill: [],
  ability: []
});

function rawList(raw) {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw.split(";").map(x => x.trim()).filter(Boolean);
}

function heroTemplateAl(heroId) {
  const id = heroId == null ? "" : String(heroId).trim();
  const found = LAST_SHELTER_HERO_TEMPLATES.find(x => String(x.id) === id);
  return found ? JSON.parse(JSON.stringify(found)) : null;
}

function heroTemplateIdsAl() {
  return LAST_SHELTER_HERO_TEMPLATES.map(x => String(x.id));
}

function heroTemplateProjectionHazirla(heroId) {
  const raw = heroTemplateAl(heroId);
  if (!raw) return null;

  const intOrNull = value => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };

  return {
    id: String(raw.id),
    pic: raw.pic || "",
    power: intOrNull(raw.power),
    unlockType: intOrNull(raw.unlock_type),
    unlockPara: raw.unlock_para == null ? "" : String(raw.unlock_para),
    levelMin: intOrNull(raw.level_min),
    composeItemId: raw.compose == null ? "" : String(raw.compose),
    composeCount: intOrNull(raw.num),
    rate: intOrNull(raw.rate),
    isStar: intOrNull(raw.is_star),
    isAdvance: intOrNull(raw.is_advance),
    isVisible: raw.is_visible == null ? "" : String(raw.is_visible),
    online: raw.online == null ? "" : String(raw.online),
    skillIds: rawList(raw.skill_id),
    newSkillIds: rawList(raw.skill_id_new),
    newSkillNums: rawList(raw.num_new).map(x => Number(x)).filter(Number.isFinite)
  };
}

function starterGeneralHazirla(uuidFactory) {
  const uuid = typeof uuidFactory === "function"
    ? String(uuidFactory())
    : crypto.randomBytes(16).toString("hex");

  return {
    ...LAST_SHELTER_STARTER_GENERAL,
    skill: [],
    ability: [],
    uuid
  };
}

function lastShelterHeroRuntimeTeminEt(state, uuidFactory) {
  if (!state || typeof state !== "object") return null;

  if (
    !state.lastShelterHeroRuntime ||
    typeof state.lastShelterHeroRuntime !== "object" ||
    Array.isArray(state.lastShelterHeroRuntime)
  ) {
    state.lastShelterHeroRuntime = {
      generals: [
        starterGeneralHazirla(uuidFactory)
      ]
    };
  }

  if (!Array.isArray(state.lastShelterHeroRuntime.generals)) {
    state.lastShelterHeroRuntime.generals = [];
  }

  return state.lastShelterHeroRuntime;
}

module.exports = {
  LAST_SHELTER_HERO_TEMPLATES,
  LAST_SHELTER_HERO_DATA_CONFIG,
  LAST_SHELTER_STARTER_GENERAL,
  rawList,
  heroTemplateAl,
  heroTemplateIdsAl,
  heroTemplateProjectionHazirla,
  starterGeneralHazirla,
  lastShelterHeroRuntimeTeminEt
};
