"use strict";

const hesabLoginModulu = require("./hesab_login_handler");
const {
  qehremanExpMesajiniEmalEt
} = require("./qehreman_exp_handler");

const esasHandler = hesabLoginModulu.hesabLoginMesajiniEmalEt;

if (typeof esasHandler !== "function") {
  throw new Error("Hesab login handler tapılmadı.");
}

hesabLoginModulu.hesabLoginMesajiniEmalEt = async function(kontekst) {
  const expEmalOlundu = await qehremanExpMesajiniEmalEt(kontekst);
  if (expEmalOlundu) return true;
  return await esasHandler(kontekst);
};

require("./server_missiya_genisletme");
