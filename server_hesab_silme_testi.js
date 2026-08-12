"use strict";

const crypto = require("crypto");
const WebSocket = require("ws");

const {
  proqramHovuzunuAl,
  hovuzlariBagla
} = require("./verilenler_bazasi");

const TEST_ID = crypto.randomBytes(8).toString("hex");
const TEST_PLAYER_ID = `sil_test_player_${TEST_ID}`;
const TEST_EMAIL = `sil_test_${TEST_ID}@example.test`;
const TEST_SIFRE = "TestSifre_12345";
const TEST_CIHAZ = `sil_test_cihaz_${TEST_ID}`;

function websocketUrlAl() {
  const manual = String(process.env.TEST_WS_URL || "").trim();
  if (manual) return manual;

  const publicDomain = String(process.env.KOYEB_PUBLIC_DOMAIN || "").trim();
  if (publicDomain) {
    const temiz = publicDomain
      .replace(/^https?:\/\//i, "")
      .replace(/^wss?:\/\//i, "")
      .replace(/\/$/, "");

    return `wss://${temiz}`;
  }

  const port = Number(process.env.PORT || 8000);
  return `ws://127.0.0.1:${port}`;
}

function acilmaniGozle(ws, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      temizle();
      reject(new Error("WebSocket vaxtında açılmadı."));
    }, timeoutMs);

    function temizle() {
      clearTimeout(timer);
      ws.off("open", acildi);
      ws.off("error", xeta);
    }

    function acildi() {
      temizle();
      resolve();
    }

    function xeta(err) {
      temizle();
      reject(err);
    }

    ws.on("open", acildi);
    ws.on("error", xeta);
  });
}

function mesajGozle(ws, tip, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      temizle();
      reject(new Error(`${tip} cavabı vaxtında gəlmədi.`));
    }, timeoutMs);

    function temizle() {
      clearTimeout(timer);
      ws.off("message", mesaj);
      ws.off("error", xeta);
    }

    function xeta(err) {
      temizle();
      reject(err);
    }

    function mesaj(data) {
      let obyekt;

      try {
        obyekt = JSON.parse(data.toString());
      }
      catch {
        return;
      }

      if (obyekt && obyekt.type === tip) {
        temizle();
        resolve(obyekt);
      }
    }

    ws.on("message", mesaj);
    ws.on("error", xeta);
  });
}

async function websocketAc() {
  const ws = new WebSocket(websocketUrlAl());
  await acilmaniGozle(ws);
  return ws;
}

async function testMelumatlariniTemizle() {
  const hovuz = proqramHovuzunuAl();

  const tapilan = await hovuz.query(
    `SELECT hesab_id FROM hesablar WHERE oyuncu_id = $1 LIMIT 1`,
    [TEST_PLAYER_ID]
  );

  if (tapilan.rows && tapilan.rows.length === 1) {
    const hesabId = tapilan.rows[0].hesab_id;

    await hovuz.query(`DELETE FROM sifre_sifirlama_sorqulari WHERE hesab_id = $1`, [hesabId]);
    await hovuz.query(`DELETE FROM email_tesdiqleri WHERE hesab_id = $1`, [hesabId]);
    await hovuz.query(`DELETE FROM hesab_sessiyalari WHERE hesab_id = $1`, [hesabId]);
    await hovuz.query(`DELETE FROM hesab_provayderleri WHERE hesab_id = $1`, [hesabId]);
    await hovuz.query(`DELETE FROM hesab_audit_jurnali WHERE hesab_id = $1`, [hesabId]);
    await hovuz.query(`DELETE FROM hesablar WHERE hesab_id = $1`, [hesabId]);
  }
}

async function testiBaslat() {
  let wsGuest = null;
  let wsLogin = null;
  let wsKohneLogin = null;
  let wsGuestSonra = null;

  console.log("[HESAB_SIL_TEST] Test başlayır...");

  try {
    await testMelumatlariniTemizle();

    // 1. Guest player yaradılır və email hesabına bağlanır.
    wsGuest = await websocketAc();

    const ackPromise = mesajGozle(wsGuest, "ack");
    wsGuest.send(JSON.stringify({
      type: "auth",
      playerId: TEST_PLAYER_ID
    }));
    await ackPromise;

    const bindPromise = mesajGozle(wsGuest, "account_bind_result");
    wsGuest.send(JSON.stringify({
      type: "account_bind_request",
      playerId: TEST_PLAYER_ID,
      email: TEST_EMAIL,
      sifre: TEST_SIFRE
    }));

    const bind = await bindPromise;
    if (bind.success !== true) {
      throw new Error(`Hesab bağlanmadı: ${JSON.stringify(bind)}`);
    }

    wsGuest.close();
    wsGuest = null;

    console.log("[HESAB_SIL_TEST] Test hesabı yaradıldı.");

    // 2. Real account login edilir.
    wsLogin = await websocketAc();

    const loginPromise = mesajGozle(wsLogin, "account_login_result");
    wsLogin.send(JSON.stringify({
      type: "account_login_request",
      email: TEST_EMAIL,
      sifre: TEST_SIFRE,
      cihazId: TEST_CIHAZ
    }));

    const login = await loginPromise;
    if (login.success !== true || login.playerId !== TEST_PLAYER_ID) {
      throw new Error(`Login uğursuzdur: ${JSON.stringify(login)}`);
    }

    console.log("[HESAB_SIL_TEST] Account login uğurludur.");

    // 3. Server-side confirmation olmadan silmə rədd edilməlidir.
    const sehvTesdiqPromise = mesajGozle(wsLogin, "account_delete_result");
    wsLogin.send(JSON.stringify({
      type: "account_delete_request",
      confirmation: "YANLIS"
    }));

    const sehvTesdiq = await sehvTesdiqPromise;
    if (sehvTesdiq.success !== false) {
      throw new Error("Səhv confirmation ilə hesab silindi.");
    }

    console.log("[HESAB_SIL_TEST] Server-side SIL təsdiqi işləyir.");

    // 4. Hesab silinir.
    const silPromise = mesajGozle(wsLogin, "account_delete_result");
    wsLogin.send(JSON.stringify({
      type: "account_delete_request",
      confirmation: "SIL"
    }));

    const sil = await silPromise;
    if (sil.success !== true || sil.playerId !== TEST_PLAYER_ID) {
      throw new Error(`Hesab silinmədi: ${JSON.stringify(sil)}`);
    }

    console.log("[HESAB_SIL_TEST] Hesab credential-ları silindi.");

    // 5. Eyni socket guest kimi gameplay/account_info istifadə edə bilməlidir.
    const infoPromise = mesajGozle(wsLogin, "account_info_result");
    wsLogin.send(JSON.stringify({
      type: "account_info_request",
      playerId: TEST_PLAYER_ID
    }));

    const info = await infoPromise;
    if (info.success !== true || info.isBound !== false) {
      throw new Error(`Silinmədən sonra guest account_info düzgün deyil: ${JSON.stringify(info)}`);
    }

    console.log("[HESAB_SIL_TEST] PlayerId guest rejimində saxlanıldı.");

    // 6. Köhnə email + şifrə artıq işləməməlidir.
    wsKohneLogin = await websocketAc();

    const kohneLoginPromise = mesajGozle(wsKohneLogin, "account_login_result");
    wsKohneLogin.send(JSON.stringify({
      type: "account_login_request",
      email: TEST_EMAIL,
      sifre: TEST_SIFRE,
      cihazId: TEST_CIHAZ
    }));

    const kohneLogin = await kohneLoginPromise;
    if (kohneLogin.success !== false) {
      throw new Error("Silinmiş hesab email + şifrə ilə yenidən açıldı.");
    }

    console.log("[HESAB_SIL_TEST] Köhnə email login düzgün rədd edildi.");

    // 7. Eyni playerId artıq hesaba bağlı olmadığı üçün guest auth yenidən işləməlidir.
    wsGuestSonra = await websocketAc();

    const sonAckPromise = mesajGozle(wsGuestSonra, "ack");
    wsGuestSonra.send(JSON.stringify({
      type: "auth",
      playerId: TEST_PLAYER_ID
    }));

    const sonAck = await sonAckPromise;
    if (sonAck.playerId !== TEST_PLAYER_ID) {
      throw new Error("PlayerId guest auth ilə bərpa olunmadı.");
    }

    console.log("[HESAB_SIL_TEST] Gameplay playerId qorundu.");
    console.log("[HESAB_SIL_TEST] Bütün hesab silmə testləri uğurludur.");
  }
  catch (xeta) {
    console.error("[HESAB_SIL_TEST] Test uğursuz oldu:", xeta);
    process.exitCode = 1;
  }
  finally {
    for (const ws of [
      wsGuest,
      wsLogin,
      wsKohneLogin,
      wsGuestSonra
    ]) {
      if (!ws) continue;
      try {
        ws.close();
      }
      catch {
      }
    }

    try {
      await testMelumatlariniTemizle();
    }
    catch {
    }

    try {
      await hovuzlariBagla();
    }
    catch {
    }
  }
}

testiBaslat();
