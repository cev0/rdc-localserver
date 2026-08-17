"use strict";

const assert = require("assert");

const EMAIL_MODULLARI = [
  {
    yol: "./email_gonderici",
    funksiya: "tesdiqKoduEmailiGonder"
  },
  {
    yol: "./hesab_pin_berpa_email_gonderici",
    funksiya: "pinBerpaKoduEmailiGonder"
  },
  {
    yol: "./sifre_sifirlama_email_gonderici",
    funksiya: "sifreSifirlamaKoduEmailiGonder"
  }
];

function envYedeyiniAl(ad) {
  return {
    varIdi: Object.prototype.hasOwnProperty.call(process.env, ad),
    deyer: process.env[ad]
  };
}

function enviBerpaEt(ad, yedek) {
  if (yedek.varIdi) process.env[ad] = yedek.deyer;
  else delete process.env[ad];
}

function moduluTezeYukle(yol) {
  const tamYol = require.resolve(yol);
  delete require.cache[tamYol];
  return require(yol);
}

async function modulUcunTestEt(tesvir) {
  const envYedekleri = {
    NODE_ENV: envYedeyiniAl("NODE_ENV"),
    EMAIL_DEV_LOG_CODE: envYedeyiniAl("EMAIL_DEV_LOG_CODE"),
    RESEND_API_KEY: envYedeyiniAl("RESEND_API_KEY"),
    EMAIL_FROM: envYedeyiniAl("EMAIL_FROM")
  };
  const esasConsoleLog = console.log;

  try {
    process.env.NODE_ENV = "production";
    process.env.EMAIL_DEV_LOG_CODE = "true";
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;

    const productionLoglari = [];
    console.log = (...hisseler) => productionLoglari.push(hisseler);

    const productionModulu = moduluTezeYukle(tesvir.yol);
    const productionNeticesi = await productionModulu[tesvir.funksiya](
      "test@example.com",
      "123456"
    );

    assert.strictEqual(
      productionNeticesi.success,
      false,
      `${tesvir.yol} production-da dev-log-u uğurlu email kimi saymamalıdır.`
    );
    assert.ok(
      String(productionNeticesi.message || "").includes("RESEND_API_KEY"),
      `${tesvir.yol} production-da normal email konfiqurasiyası tələb etməlidir.`
    );
    assert.strictEqual(
      productionLoglari.length,
      0,
      `${tesvir.yol} production-da təsdiq kodunu log etməməlidir.`
    );

    process.env.NODE_ENV = "test";
    process.env.EMAIL_DEV_LOG_CODE = "true";

    const testLoglari = [];
    console.log = (...hisseler) => testLoglari.push(hisseler);

    const testModulu = moduluTezeYukle(tesvir.yol);
    const testNeticesi = await testModulu[tesvir.funksiya](
      "test@example.com",
      "654321"
    );

    assert.strictEqual(
      testNeticesi.success,
      true,
      `${tesvir.yol} test mühitində açıq dev-log rejimini saxlamalıdır.`
    );
    assert.ok(
      testLoglari.some(hisseler =>
        JSON.stringify(hisseler).includes("654321")
      ),
      `${tesvir.yol} test mühitində dev kodunu yalnız tutulmuş loga yazmalıdır.`
    );
  }
  finally {
    console.log = esasConsoleLog;
    for (const [ad, yedek] of Object.entries(envYedekleri)) {
      enviBerpaEt(ad, yedek);
    }
    delete require.cache[require.resolve(tesvir.yol)];
  }
}

(async function testleriIcraEt() {
  for (const tesvir of EMAIL_MODULLARI) {
    await modulUcunTestEt(tesvir);
  }

  console.log(
    "[EMAIL_DEV_LOG_QORUMA_TEST] Production təsdiq kodu log qoruması uğurludur."
  );
})().catch(xeta => {
  console.error("[EMAIL_DEV_LOG_QORUMA_TEST] Uğursuz:", xeta);
  process.exitCode = 1;
});
