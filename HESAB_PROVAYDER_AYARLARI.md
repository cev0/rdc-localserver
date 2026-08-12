# Hesab provayder ayarları

Bu sənəd Google, Apple, Facebook və Game Center girişinin server tərəfi üçün tələb olunan mühit dəyişənlərini göstərir.

## Ümumi təhlükəsizlik qaydası

Unity provayderdən aldığı giriş sübutunu serverə göndərir. Server provayder sübutunu özü yoxlamadan heç vaxt `playerId`, `accountId` və ya sessiya yaratmır.

Provayder access/id tokenləri PostgreSQL-də saxlanılmır və loga yazılmır.

## Google

Koyeb mühit dəyişəni:

```text
GOOGLE_CLIENT_IDS=com.google.client.id1,com.google.client.id2
```

Birdən çox Android/iOS/Web client ID varsa vergüllə ayrılır.

Unity request:

```json
{
  "type": "account_provider_login_request",
  "provider": "google",
  "idToken": "...",
  "cihazId": "..."
}
```

Server Google JWT imzasını, issuer-i, audience-i və vaxtını yoxlayır. Hesab identifikasiyası üçün token daxilindəki stabil `sub` istifadə olunur.

## Apple

Koyeb mühit dəyişəni:

```text
APPLE_CLIENT_IDS=com.company.game
```

Service ID də istifadə olunursa siyahıya əlavə edilə bilər:

```text
APPLE_CLIENT_IDS=com.company.game,com.company.game.web
```

Unity request:

```json
{
  "type": "account_provider_login_request",
  "provider": "apple",
  "idToken": "...",
  "nonce": "...",
  "cihazId": "..."
}
```

Server Apple JWKS ilə token imzasını, issuer-i, audience-i, vaxtı və göndərilibsə nonce-u yoxlayır.

## Facebook

Koyeb mühit dəyişənləri:

```text
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_GRAPH_VERSION=vXX.X
```

`FACEBOOK_GRAPH_VERSION` boş qala bilər. App secret heç vaxt Unity-yə verilməməlidir.

Unity request:

```json
{
  "type": "account_provider_login_request",
  "provider": "facebook",
  "accessToken": "...",
  "cihazId": "..."
}
```

Server access token-i Meta `debug_token` yoxlamasından keçirir və tokenin həmin app-a aid olduğunu təsdiqləyir.

## Game Center

Koyeb mühit dəyişəni:

```text
GAME_CENTER_BUNDLE_IDS=com.company.game
```

Unity/native request:

```json
{
  "type": "account_provider_login_request",
  "provider": "game_center",
  "teamPlayerId": "...",
  "bundleId": "com.company.game",
  "timestamp": 0,
  "salt": "BASE64",
  "signature": "BASE64",
  "publicKeyUrl": "https://...apple.com/...",
  "cihazId": "..."
}
```

Server yalnız HTTPS Apple hostundan public key qəbul edir, timestamp təzəliyini yoxlayır və imzanı serverdə təsdiqləyir.

## Yeni oyun

Request:

```json
{
  "type": "account_new_game_request",
  "confirmation": "YENI_OYUN"
}
```

Server yeni `guest_...` playerId yaradır. Əvvəlki hesab və server tərəqqisi silinmir. Cari hesab sessiyası varsa bağlanır. Client uğurlu cavabdan sonra lokal refresh token-i təmizləməlidir.

## Hesab məlumatı

Request:

```json
{
  "type": "account_info_request"
}
```

Cavab həm köhnə Unity uyğunluğu üçün `isBound`, həm də yeni sistem üçün `linked`, `providers`, `hasPassword`, `hasPin` və `providerConfig` qaytarır.

## Deploy sonrası

Yeni provayder DB sütunlarını yaratmaq üçün bir dəfə:

```bash
npm run db:migrate
```

Əsas smoke test:

```bash
npm run server:hesab-genisletme-test
```

Real Google/Apple/Facebook/Game Center giriş testi yalnız müvafiq platformadan real giriş tokeni alındıqdan sonra aparılmalıdır.
