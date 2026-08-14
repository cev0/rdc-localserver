"use strict";

const hesabLoginModulu = require("./hesab_login_handler");
const { missiyaMesajiniEmalEt } = require("./missiya_handler");

require("./qehreman_recruit_qayda_override");

const { qehremanRecruitMesajiniEmalEt } = require("./qehreman_recruit_handler");
const { qehremanExpMesajiniEmalEt } = require("./qehreman_exp_handler");
const { konvoyTutumTexnologiyaMesajiniEmalEt } = require("./konvoy_tutum_texnologiya_handler");
const { konvoyTexnologiyaMesajiniEmalEt } = require("./konvoy_texnologiya_handler");
const { konvoyMesajiniEmalEt } = require("./konvoy_handler");
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
  if (await konvoyTutumTexnologiyaMesajiniEmalEt(kontekst)) return true;
  if (await konvoyTexnologiyaMesajiniEmalEt(kontekst)) return true;
  if (await konvoyMesajiniEmalEt(kontekst)) return true;
  if (await kesfiyyatMesajiniEmalEt(kontekst)) return true;
  if (await dusmenMovqeyiMesajiniEmalEt(kontekst)) return true;
  if (await doyusMesajiniEmalEt(kontekst)) return true;

  return await esasHesabLoginMesajiniEmalEt(kontekst);
};

const { dovletQaydalariniTetbiqEt } = require("./server_dovlet_patch");
dovletQaydalariniTetbiqEt();

require("./server_hesab_genisletme");
