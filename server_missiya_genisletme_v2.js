"use strict";

const hesabLoginModulu = require("./hesab_login_handler");
const { missiyaMesajiniEmalEt } = require("./missiya_handler");
const {
  oyuncuMutasiyaKilidiIleIcraEt
} = require("./server_oyuncu_mutasiya_kilidi");

require("./qehreman_recruit_qayda_override");

const { qehremanRecruitMesajiniEmalEt } = require("./qehreman_recruit_handler");
const { qehremanExpMesajiniEmalEt } = require("./qehreman_exp_handler");
const { qehremanTapshiriqMesajiniEmalEt } = require("./qehreman_tapshiriq_handler");
const { konvoyTexnologiyaMesajiniEmalEt } = require("./konvoy_texnologiya_handler");
const { konvoyMesajiniEmalEt } = require("./konvoy_handler");
const { konvoyEmeliyyatMesajiniEmalEt } = require("./konvoy_emeliyyat_handler");
const { dovletXeriteKataloqMesajiniEmalEt } = require("./dovlet_xerite_kataloq_handler");
const { pvpBazaPreviewMesajiniEmalEt } = require("./pvp_baza_preview_handler");
const { xeriteResursToplamaMesajiniEmalEt } = require("./xerite_resurs_toplama_handler");
const { xeriteDusmenMesajiniEmalEt } = require("./xerite_dusmen_handler");
const { xeriteDusmenDoyusMesajiniEmalEt } = require("./xerite_dusmen_doyus_handler");
const { doyusRaportMesajiniEmalEt } = require("./doyus_raport_handler");
const { xestexanaMesajiniEmalEt } = require("./xestexana_handler");
const { dovletLifecycleMesajiniEmalEt } = require("./dovlet_lifecycle_handler");
const { kesfiyyatMesajiniEmalEt } = require("./kesfiyyat_handler");
const { dusmenMovqeyiMesajiniEmalEt } = require("./dusmen_movqeyi_handler");
const { doyusMesajiniEmalEt } = require("./doyus_handler");

const OYUNCU_MUTASIYA_MESAJLARI = new Set([
  // Missiya / mükafat
  "mission_reward_claim_request",

  // Hero recruit / progression / assignment
  "hero_recruit_single_request",
  "hero_recruit_x10_request",
  "hero_exp_item_use_request",
  "hero_tutorial_skill_upgrade_request",
  "technology_hero_assign_request",
  "technology_hero_remove_request",

  // Texnologiya
  "research_start",
  "technology_research_start",

  // Konvoy quruluşu və əməliyyat
  "convoy_hero_assign_request",
  "convoy_hero_remove_request",
  "convoy_troops_set_request",
  "convoy_formation_set_request",
  "convoy_operation_start_request",

  // Legacy resurs toplama mutation-ları
  "convoy_gather_start_request",
  "convoy_gather_status_request",
  "convoy_gather_claim_request",

  // Döyüş / raport / mükafat
  "battle_start_request",
  "battle_resolve_request",
  "battle_reward_claim_request",
  "battle_report_claim_reward_request",
  "battle_report_mark_read_request",
  "battle_report_save_request",
  "battle_report_delete_request",

  // Xəstəxana
  "xestexana_sagaltma_request",

  // Legacy/core gameplay state mutation-ları
  "expand_area_request",
  "expand_base",
  "build_request",
  "train_unit_request",
  "upgrade_request",
  "base_teleport_request",
  "move_request",
  "connect_road_request",
  "start_construction_request"
]);

const esasHesabLoginMesajiniEmalEt = hesabLoginModulu.hesabLoginMesajiniEmalEt;

if (typeof esasHesabLoginMesajiniEmalEt !== "function") {
  throw new Error("hesab_login_handler.js daxilində hesabLoginMesajiniEmalEt tapılmadı.");
}

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

async function gameplayMesajZenciriniIcraEt(kontekst) {
  if (await missiyaMesajiniEmalEt(kontekst)) return true;
  if (await qehremanRecruitMesajiniEmalEt(kontekst)) return true;
  if (await qehremanExpMesajiniEmalEt(kontekst)) return true;
  if (await qehremanTapshiriqMesajiniEmalEt(kontekst)) return true;
  if (await konvoyTexnologiyaMesajiniEmalEt(kontekst)) return true;
  if (await konvoyMesajiniEmalEt(kontekst)) return true;
  if (await konvoyEmeliyyatMesajiniEmalEt(kontekst)) return true;
  if (await dovletXeriteKataloqMesajiniEmalEt(kontekst)) return true;
  if (await pvpBazaPreviewMesajiniEmalEt(kontekst)) return true;
  if (await xeriteResursToplamaMesajiniEmalEt(kontekst)) return true;
  if (await xeriteDusmenMesajiniEmalEt(kontekst)) return true;
  if (await xeriteDusmenDoyusMesajiniEmalEt(kontekst)) return true;
  if (await doyusRaportMesajiniEmalEt(kontekst)) return true;
  if (await xestexanaMesajiniEmalEt(kontekst)) return true;
  if (await dovletLifecycleMesajiniEmalEt(kontekst)) return true;
  if (await kesfiyyatMesajiniEmalEt(kontekst)) return true;
  if (await dusmenMovqeyiMesajiniEmalEt(kontekst)) return true;
  if (await doyusMesajiniEmalEt(kontekst)) return true;

  return await esasHesabLoginMesajiniEmalEt(kontekst);
}

hesabLoginModulu.hesabLoginMesajiniEmalEt = async function(kontekst) {
  const type = metnAl(kontekst && kontekst.type, 128);
  const playerId = metnAl(
    kontekst && kontekst.ws && kontekst.ws._authedPlayerId,
    128
  );

  if (!playerId || !OYUNCU_MUTASIYA_MESAJLARI.has(type)) {
    return await gameplayMesajZenciriniIcraEt(kontekst);
  }

  return await oyuncuMutasiyaKilidiIleIcraEt(
    playerId,
    async () => await gameplayMesajZenciriniIcraEt(kontekst)
  );
};

const { dovletQaydalariniTetbiqEt } = require("./server_dovlet_patch");
dovletQaydalariniTetbiqEt();

require("./server_hesab_genisletme");

module.exports = {
  OYUNCU_MUTASIYA_MESAJLARI
};
