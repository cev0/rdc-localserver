"use strict";

const hesabLoginModulu = require("./hesab_login_handler");
const {
  gameplayNeticesiniIzlemeyeHazirla
} = require("./missiya_gameplay_musahide");

const evvelkiEmalEt = hesabLoginModulu.hesabLoginMesajiniEmalEt;

if (typeof evvelkiEmalEt !== "function") {
  throw new Error("Hesab login mesaj handler-i tapılmadı.");
}

hesabLoginModulu.hesabLoginMesajiniEmalEt = async function(kontekst) {
  gameplayNeticesiniIzlemeyeHazirla(kontekst);
  return await evvelkiEmalEt(kontekst);
};
