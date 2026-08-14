"use strict";

const hesabLoginModulu = require("./hesab_login_handler");
const { missiyaMesajiniEmalEt } = require("./missiya_handler");

require("./qehreman_recruit_qayda_override");

const { qehremanRecruitMesajiniEmalEt } = require("./qehreman_recruit_handler");
const { qehremanExpMesajiniEmalEt } = require("./qehreman_exp_handler");
const { qehremanTapshiriqMesajiniEmalEt } = require("./qehreman_tapshiriq_handler");
const { konvoyTutumTexnologiyaMesajiniEmalEt } = require("./konvoy_tutum_texnologiya_handler");
const { konvoyTexnologiyaMesajiniEmalEt } = require("./konvoy_texnologiya_handler");
const { konvoyMesajiniEmalEt } = require("./konvoy_handler");
const { dovletXeriteKataloqMesajiniEmalEt } = require("./dovlet_xerite_kataloq_handler");
const { xeriteResursToplamaMesajiniEmalEt } = require("./xerite_resurs_toplama_handler");
const { xeriteDusmenMesajiniEmalEt } = require("./xerite_dusmen_handler");
const { xeriteDusmenDoyusMesajiniEmalEt } = require("./xerite_dusmen_doyus_handler");
const { doyusRaportMesajiniEmalEt } = require("./doyus_raport_handler");
const { dovletLifecycleMesajiniEmalEt } = require("./dovlet_lifecycle_handler");
const { kesfiyyatMesajiniEmalEt } = require("./kesfiyyat_handler");
const { dusmenMovqeyiMesajiniEmalEt } = require("./dusmen_movqeyi_handler");
const { doyusMesajiniEmalEt } = require("./doyus_handler");

const esasHesabLoginMesajiniEmalEt = hesabLoginModulu.hesabLoginMesajiniEmalEt;

if (typeof esasHesabLoginMesajiniEmalEt !== "function") {
  throw new Error("hesab_login_handler.js daxilində hesabLoginMesajiniEmalEt tapılmadı.");
}

hesabLoginModulu.hesabLoginMesajiniEmalEt = async function(kontekst) {
  if (await missiyaMesajiniEmalEt(kontekst)) return true;
  if (await qehremanRecruitMesajiniEmalEt(kontekst)) return true;
  if (await qehremanExpMesajiniEmalEt(kontekst)) return true;
  if (await qehremanTapshiriqMesajiniEmalEt(kontekst)) return true;
  if (await konvoyTutumTexnologiyaMesajiniEmalEt(kontekst)) return true;
  if (await konvoyTexnologiyaMesajiniEmalEt(kontekst)) return true;
  if (await konvoyMesajiniEmalEt(kontekst)) return true;
  if (await dovletXeriteKataloqMesajiniEmalEt(kontekst)) return true;
  if (await xeriteResursToplamaMesajiniEmalEt(kontekst)) return true;
  if (await xeriteDusmenMesajiniEmalEt(kontekst)) return true;
  if (await xeriteDusmenDoyusMesajiniEmalEt(kontekst)) return true;
  if (await doyusRaportMesajiniEmalEt(kontekst)) return true;
  if (await dovletLifecycleMesajiniEmalEt(kontekst)) return true;
  if (await kesfiyyatMesajiniEmalEt(kontekst)) return true;
  if (await dusmenMovqeyiMesajiniEmalEt(kontekst)) return true;
  if (await doyusMesajiniEmalEt(kontekst)) return true;

  return await esasHesabLoginMesajiniEmalEt(kontekst);
};

const { dovletQaydalariniTetbiqEt } = require("./server_dovlet_patch");
dovletQaydalariniTetbiqEt();

require("./server_hesab_genisletme");
