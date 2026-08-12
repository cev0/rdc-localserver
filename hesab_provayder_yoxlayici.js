"use strict";

const crypto = require("crypto");

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
const HTTP_TIMEOUT_MS = 8000;
const JWT_SAAT_FERQI_SANIYE = 60;
const GAME_CENTER_IMZA_MUDDETI_MS = 5 * 60 * 1000;

const jwksKes = new Map();
const sertifikatKes = new Map();

function metnAl(deyer, maksimum = 4096) {
  if (typeof deyer !== "string") return "";
  return deyer.trim().slice(0, maksimum);
}

function envSiyahisiniAl(ad) {
  return String(process.env[ad] || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

function base64UrlBufferAl(deyer) {
  const metn = String(deyer || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const qaliq = metn.length % 4;
  const tamamlanmis = qaliq === 0
    ? metn
    : metn + "=".repeat(4 - qaliq);

  return Buffer.from(tamamlanmis, "base64");
}

function base64UrlJsonAl(deyer) {
  try {
    return JSON.parse(base64UrlBufferAl(deyer).toString("utf8"));
  }
  catch {
    return null;
  }
}

function jwtHisseleriniAl(token) {
  const temizToken = metnAl(token, 20000);
  const hisseler = temizToken.split(".");

  if (hisseler.length !== 3) {
    return null;
  }

  const basliq = base64UrlJsonAl(hisseler[0]);
  const yuk = base64UrlJsonAl(hisseler[1]);

  if (!basliq || !yuk) {
    return null;
  }

  return {
    token: temizToken,
    basliq,
    yuk,
    imzalananMetn: `${hisseler[0]}.${hisseler[1]}`,
    imza: base64UrlBufferAl(hisseler[2])
  };
}

function cacheMuddetiniAl(cavab, standartMs = 60 * 60 * 1000) {
  const cacheControl = String(cavab.headers.get("cache-control") || "");
  const uygunluq = cacheControl.match(/max-age=(\d+)/i);

  if (!uygunluq) {
    return standartMs;
  }

  const saniye = Number(uygunluq[1]);
  if (!Number.isFinite(saniye) || saniye <= 0) {
    return standartMs;
  }

  return Math.min(saniye * 1000, 24 * 60 * 60 * 1000);
}

async function jsonGetir(url, ayarlar = {}) {
  const cavab = await fetch(url, {
    method: ayarlar.method || "GET",
    headers: ayarlar.headers || {},
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS)
  });

  const xam = await cavab.text();
  let json = null;

  try {
    json = xam ? JSON.parse(xam) : null;
  }
  catch {
    json = null;
  }

  if (!cavab.ok || !json) {
    const xeta = new Error(`Xarici autentifikasiya xidməti cavab vermədi (${cavab.status}).`);
    xeta.statusCode = cavab.status;
    throw xeta;
  }

  return { cavab, json };
}

async function jwksAl(url) {
  const movcud = jwksKes.get(url);

  if (movcud && Date.now() < movcud.bitmeVaxtiMs) {
    return movcud.keys;
  }

  const { cavab, json } = await jsonGetir(url);
  const keys = Array.isArray(json.keys) ? json.keys : [];

  if (keys.length === 0) {
    throw new Error("İmza yoxlama açarları tapılmadı.");
  }

  jwksKes.set(url, {
    keys,
    bitmeVaxtiMs: Date.now() + cacheMuddetiniAl(cavab)
  });

  return keys;
}

function audDuzgundur(aud, icazeliAud) {
  const audlar = Array.isArray(aud) ? aud : [aud];
  return audlar.some(x => icazeliAud.includes(String(x || "")));
}

function jwtVaxtiniYoxla(yuk) {
  const indi = Math.floor(Date.now() / 1000);
  const exp = Number(yuk && yuk.exp);

  if (!Number.isFinite(exp) || exp + JWT_SAAT_FERQI_SANIYE < indi) {
    return false;
  }

  if (yuk && yuk.nbf != null) {
    const nbf = Number(yuk.nbf);
    if (Number.isFinite(nbf) && nbf - JWT_SAAT_FERQI_SANIYE > indi) {
      return false;
    }
  }

  return true;
}

function jwtImzasiniYoxla(jwt, jwk) {
  const alg = metnAl(jwt.basliq.alg, 16);
  const aciqAcar = crypto.createPublicKey({
    key: jwk,
    format: "jwk"
  });

  const data = Buffer.from(jwt.imzalananMetn, "utf8");

  if (alg === "RS256") {
    return crypto.verify(
      "RSA-SHA256",
      data,
      aciqAcar,
      jwt.imza
    );
  }

  if (alg === "ES256") {
    return crypto.verify(
      "sha256",
      data,
      {
        key: aciqAcar,
        dsaEncoding: "ieee-p1363"
      },
      jwt.imza
    );
  }

  return false;
}

async function jwtProvayderTokeniniYoxla({
  token,
  jwksUrl,
  icazeliAlgoritmler,
  icazeliIssuerler,
  icazeliAudience,
  nonce
}) {
  const jwt = jwtHisseleriniAl(token);

  if (!jwt) {
    return { success: false, message: "Provayder tokeni düzgün deyil." };
  }

  const alg = metnAl(jwt.basliq.alg, 16);
  const kid = metnAl(jwt.basliq.kid, 256);

  if (!icazeliAlgoritmler.includes(alg) || !kid) {
    return { success: false, message: "Provayder tokeninin imza məlumatı düzgün deyil." };
  }

  const issuer = metnAl(jwt.yuk.iss, 512);
  if (!icazeliIssuerler.includes(issuer)) {
    return { success: false, message: "Provayder tokeninin mənbəyi düzgün deyil." };
  }

  if (!audDuzgundur(jwt.yuk.aud, icazeliAudience)) {
    return { success: false, message: "Provayder tokeni bu oyun üçün verilməyib." };
  }

  if (!jwtVaxtiniYoxla(jwt.yuk)) {
    return { success: false, message: "Provayder tokeninin vaxtı bitib." };
  }

  if (nonce) {
    const tokenNonce = metnAl(jwt.yuk.nonce, 256);
    const nonceHash = crypto
      .createHash("sha256")
      .update(String(nonce), "utf8")
      .digest("hex");

    if (tokenNonce !== nonce && tokenNonce !== nonceHash) {
      return { success: false, message: "Provayder təhlükəsizlik nonce-u uyğun deyil." };
    }
  }

  let keys;

  try {
    keys = await jwksAl(jwksUrl);
  }
  catch (xeta) {
    console.error("[PROVAYDER] JWKS alınmadı:", xeta.message);
    return { success: false, temporary: true, message: "Provayder yoxlama xidməti müvəqqəti əlçatan deyil." };
  }

  const jwk = keys.find(x => String(x && x.kid || "") === kid);

  if (!jwk) {
    jwksKes.delete(jwksUrl);

    try {
      keys = await jwksAl(jwksUrl);
    }
    catch {
      return { success: false, temporary: true, message: "Provayder açarı yenilənə bilmədi." };
    }
  }

  const sonAcar = keys.find(x => String(x && x.kid || "") === kid);
  if (!sonAcar) {
    return { success: false, message: "Provayder imza açarı tapılmadı." };
  }

  let imzaDuzgundur = false;

  try {
    imzaDuzgundur = jwtImzasiniYoxla(jwt, sonAcar);
  }
  catch (xeta) {
    console.error("[PROVAYDER] JWT imza yoxlama xətası:", xeta.message);
  }

  if (!imzaDuzgundur) {
    return { success: false, message: "Provayder tokeninin imzası düzgün deyil." };
  }

  return {
    success: true,
    payload: jwt.yuk
  };
}

async function googleTokeniniYoxla(msg) {
  const clientIdler = envSiyahisiniAl("GOOGLE_CLIENT_IDS");

  if (clientIdler.length === 0) {
    return { success: false, notConfigured: true, message: "Google giriş serverdə konfiqurasiya edilməyib." };
  }

  const yoxlama = await jwtProvayderTokeniniYoxla({
    token: metnAl(msg.idToken, 20000),
    jwksUrl: GOOGLE_JWKS_URL,
    icazeliAlgoritmler: ["RS256"],
    icazeliIssuerler: ["accounts.google.com", "https://accounts.google.com"],
    icazeliAudience: clientIdler,
    nonce: ""
  });

  if (!yoxlama.success) return yoxlama;

  const sub = metnAl(yoxlama.payload.sub, 512);
  if (!sub) {
    return { success: false, message: "Google istifadəçi ID-si tapılmadı." };
  }

  return {
    success: true,
    provider: "google",
    providerUserId: sub,
    email: metnAl(yoxlama.payload.email, 320),
    emailVerified: yoxlama.payload.email_verified === true,
    displayName: metnAl(yoxlama.payload.name, 160)
  };
}

async function appleTokeniniYoxla(msg) {
  const clientIdler = envSiyahisiniAl("APPLE_CLIENT_IDS");

  if (clientIdler.length === 0) {
    return { success: false, notConfigured: true, message: "Apple giriş serverdə konfiqurasiya edilməyib." };
  }

  const yoxlama = await jwtProvayderTokeniniYoxla({
    token: metnAl(msg.idToken, 20000),
    jwksUrl: APPLE_JWKS_URL,
    icazeliAlgoritmler: ["RS256", "ES256"],
    icazeliIssuerler: ["https://appleid.apple.com"],
    icazeliAudience: clientIdler,
    nonce: metnAl(msg.nonce, 256)
  });

  if (!yoxlama.success) return yoxlama;

  const sub = metnAl(yoxlama.payload.sub, 512);
  if (!sub) {
    return { success: false, message: "Apple istifadəçi ID-si tapılmadı." };
  }

  return {
    success: true,
    provider: "apple",
    providerUserId: sub,
    email: metnAl(yoxlama.payload.email, 320),
    emailVerified: yoxlama.payload.email_verified === true || yoxlama.payload.email_verified === "true",
    displayName: ""
  };
}

async function facebookTokeniniYoxla(msg) {
  const appId = metnAl(process.env.FACEBOOK_APP_ID, 256);
  const appSecret = metnAl(process.env.FACEBOOK_APP_SECRET, 512);
  const graphVersion = metnAl(process.env.FACEBOOK_GRAPH_VERSION, 32);

  if (!appId || !appSecret) {
    return { success: false, notConfigured: true, message: "Facebook giriş serverdə konfiqurasiya edilməyib." };
  }

  const accessToken = metnAl(msg.accessToken, 20000);
  if (!accessToken) {
    return { success: false, message: "Facebook giriş tokeni yoxdur." };
  }

  const versiyaHissesi = graphVersion
    ? `/${encodeURIComponent(graphVersion)}`
    : "";

  const url =
    `https://graph.facebook.com${versiyaHissesi}/debug_token?input_token=${encodeURIComponent(accessToken)}`;

  let json;

  try {
    const netice = await jsonGetir(url, {
      headers: {
        "Authorization": `Bearer ${appId}|${appSecret}`
      }
    });
    json = netice.json;
  }
  catch (xeta) {
    console.error("[PROVAYDER] Facebook token yoxlama xətası:", xeta.message);
    return { success: false, temporary: true, message: "Facebook yoxlama xidməti müvəqqəti əlçatan deyil." };
  }

  const data = json && json.data ? json.data : null;
  const userId = metnAl(data && data.user_id, 512);

  if (
    !data ||
    data.is_valid !== true ||
    String(data.app_id || "") !== appId ||
    !userId
  ) {
    return { success: false, message: "Facebook giriş tokeni etibarsızdır." };
  }

  const expiresAt = Number(data.expires_at || 0);
  if (expiresAt > 0 && expiresAt * 1000 <= Date.now()) {
    return { success: false, message: "Facebook giriş tokeninin vaxtı bitib." };
  }

  return {
    success: true,
    provider: "facebook",
    providerUserId: userId,
    email: "",
    emailVerified: false,
    displayName: ""
  };
}

function appleHostudur(hostname) {
  const temiz = String(hostname || "").toLowerCase();
  return temiz === "apple.com" || temiz.endsWith(".apple.com");
}

async function gameCenterSertifikatiAl(publicKeyUrl) {
  const movcud = sertifikatKes.get(publicKeyUrl);
  if (movcud && Date.now() < movcud.bitmeVaxtiMs) {
    return movcud.aciqAcar;
  }

  const url = new URL(publicKeyUrl);

  if (url.protocol !== "https:" || !appleHostudur(url.hostname)) {
    throw new Error("Game Center açar URL-i icazəli deyil.");
  }

  const cavab = await fetch(publicKeyUrl, {
    method: "GET",
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    redirect: "error"
  });

  if (!cavab.ok) {
    throw new Error(`Game Center açarı alınmadı (${cavab.status}).`);
  }

  const buf = Buffer.from(await cavab.arrayBuffer());
  let aciqAcar;

  try {
    aciqAcar = new crypto.X509Certificate(buf).publicKey;
  }
  catch {
    aciqAcar = crypto.createPublicKey(buf);
  }

  sertifikatKes.set(publicKeyUrl, {
    aciqAcar,
    bitmeVaxtiMs: Date.now() + cacheMuddetiniAl(cavab)
  });

  return aciqAcar;
}

async function gameCenterImzasiniYoxla(msg) {
  const icazeliBundleIdler = envSiyahisiniAl("GAME_CENTER_BUNDLE_IDS");

  if (icazeliBundleIdler.length === 0) {
    return { success: false, notConfigured: true, message: "Game Center giriş serverdə konfiqurasiya edilməyib." };
  }

  const playerId = metnAl(
    msg.teamPlayerId || msg.gamePlayerId || msg.playerId,
    512
  );
  const bundleId = metnAl(msg.bundleId, 512);
  const publicKeyUrl = metnAl(msg.publicKeyUrl, 2048);
  const saltMetni = metnAl(msg.salt, 8192);
  const imzaMetni = metnAl(msg.signature, 16384);
  const timestamp = Number(msg.timestamp || 0);

  if (!playerId || !bundleId || !publicKeyUrl || !saltMetni || !imzaMetni) {
    return { success: false, message: "Game Center imza məlumatları natamamdır." };
  }

  if (!icazeliBundleIdler.includes(bundleId)) {
    return { success: false, message: "Game Center bundle ID bu oyun üçün icazəli deyil." };
  }

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return { success: false, message: "Game Center timestamp düzgün deyil." };
  }

  const ferq = Date.now() - timestamp;
  if (ferq < -60 * 1000 || ferq > GAME_CENTER_IMZA_MUDDETI_MS) {
    return { success: false, message: "Game Center imzasının vaxtı keçib. Yenidən giriş edin." };
  }

  let salt;
  let imza;

  try {
    salt = Buffer.from(saltMetni, "base64");
    imza = Buffer.from(imzaMetni, "base64");
  }
  catch {
    return { success: false, message: "Game Center imzası düzgün kodlanmayıb." };
  }

  if (salt.length === 0 || imza.length === 0) {
    return { success: false, message: "Game Center imza məlumatı boşdur." };
  }

  const timestampBuffer = Buffer.alloc(8);

  try {
    timestampBuffer.writeBigUInt64BE(BigInt(Math.trunc(timestamp)));
  }
  catch {
    return { success: false, message: "Game Center timestamp çevrilə bilmədi." };
  }

  const imzalananData = Buffer.concat([
    Buffer.from(playerId, "utf8"),
    Buffer.from(bundleId, "utf8"),
    timestampBuffer,
    salt
  ]);

  let aciqAcar;

  try {
    aciqAcar = await gameCenterSertifikatiAl(publicKeyUrl);
  }
  catch (xeta) {
    console.error("[PROVAYDER] Game Center açar xətası:", xeta.message);
    return { success: false, temporary: true, message: "Game Center yoxlama xidməti müvəqqəti əlçatan deyil." };
  }

  let duzgundur = false;

  try {
    duzgundur = crypto.verify(
      "RSA-SHA256",
      imzalananData,
      aciqAcar,
      imza
    );
  }
  catch (xeta) {
    console.error("[PROVAYDER] Game Center imza yoxlama xətası:", xeta.message);
  }

  if (!duzgundur) {
    return { success: false, message: "Game Center imzası etibarsızdır." };
  }

  return {
    success: true,
    provider: "game_center",
    providerUserId: playerId,
    email: "",
    emailVerified: false,
    displayName: metnAl(msg.displayName, 160)
  };
}

async function provayderMelumatiniYoxla(provayder, msg) {
  const temiz = metnAl(provayder, 32).toLowerCase();

  if (temiz === "google") {
    return await googleTokeniniYoxla(msg || {});
  }

  if (temiz === "apple") {
    return await appleTokeniniYoxla(msg || {});
  }

  if (temiz === "facebook") {
    return await facebookTokeniniYoxla(msg || {});
  }

  if (temiz === "game_center") {
    return await gameCenterImzasiniYoxla(msg || {});
  }

  return {
    success: false,
    message: "Dəstəklənməyən hesab provayderidir."
  };
}

function provayderKonfiqurasiyaStatusu() {
  return {
    google: envSiyahisiniAl("GOOGLE_CLIENT_IDS").length > 0,
    apple: envSiyahisiniAl("APPLE_CLIENT_IDS").length > 0,
    facebook: Boolean(
      metnAl(process.env.FACEBOOK_APP_ID, 256) &&
      metnAl(process.env.FACEBOOK_APP_SECRET, 512)
    ),
    gameCenter: envSiyahisiniAl("GAME_CENTER_BUNDLE_IDS").length > 0
  };
}

module.exports = {
  provayderMelumatiniYoxla,
  provayderKonfiqurasiyaStatusu
};
