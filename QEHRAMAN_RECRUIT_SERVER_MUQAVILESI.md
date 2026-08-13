# Qəhrəman Recruit — Unity / Server Müqaviləsi

Bu sənəd mobil RTS layihəsində Qəhrəman Recruit sisteminin server-authoritative müqaviləsini saxlayır.

## Əsas prinsip

Unity yalnız UI, animasiya və nəticənin göstərilməsinə cavabdehdir.

Client bunları müəyyən etmir:

- düşən hero
- rarity
- RNG
- free draw qalıqları
- ticket balansı
- duplicate sayı
- Hero EXP reward miqdarı

Server `ws._authedPlayerId` əsasında oyunçunu müəyyən edir.

## Unity ilə eyni Hero ID-lər

| heroId | Görünən ad | Rarity kodu | Rarity |
|---|---|---:|---|
| `doyuscu` | Doyuscu | 0 | Green |
| `war_master` | War Master | 1 | Blue |
| `iron_maiden` | Iron Maiden | 2 | Purple |
| `feroman` | Feroman | 3 | Orange |
| `qiz` | Qiz | 3 | Orange |
| `qiz2` | Qiz2 | 3 | Orange |

Rarity enum Unity `HeroRarity` ilə eynidir:

- Green = 0
- Blue = 1
- Purple = 2
- Orange = 3

## Banner ID-lər

- `banner_normal`
- `banner_advanced`
- `banner_super`

## V1 balans qərarı

### Normal

- gündə 3 pulsuz single recruit
- single ticket cost: 1 Normal Ticket
- x10 cost: 10 Normal Ticket
- x10 minimum rarity guarantee yoxdur

### Advanced

- daily free yoxdur
- single ticket cost: 1 Advanced Ticket
- x10 cost: 10 Advanced Ticket

### Super

- daily free yoxdur
- single ticket cost: 1 Super Ticket
- x10 cost: 10 Super Ticket
- x10 nəticələrində ən az 1 Purple və ya Orange Hero zəmanəti

## Daily reset

Free draw reset server UTC gününə görə aparılır.

`utcDateKey` formatı:

```text
YYYYMMDD
```

Client cihaz saatı authoritative deyil.

## İlk recruit zəmanəti

Oyunçunun serverdə `totalDraws == 0` olduqda ilk real recruit nəticəsi Hero olmalıdır.

Səbəb:

- tutorial / campaign M011 ilk hero əldə etmə missiyasıdır
- oyunçu ilk üç pulsuz draw-da yalnız EXP item alaraq campaign-də ilişməməlidir

Bu zəmanət rarity zəmanəti deyil. Sadəcə nəticə növünün Hero olmasını təmin edir.

## Mixed reward növləri

V1:

```text
hero
hero_exp_item
```

Random medal reward V1-də aktiv deyil.

EXP item ID-lər:

| rewardId | EXP / item |
|---|---:|
| `hero_exp_kicik` | 100 |
| `hero_exp_orta` | 500 |
| `hero_exp_boyuk` | 1000 |

## Duplicate qaydası

Hero ilk dəfə düşəndə `state.heroes` daxilində owned state yaranır.

Eyni hero yenidən düşəndə:

```text
duplicateCopies += 1
```

V1-də duplicate avtomatik medal reward vermir.

Duplicate copy-lər gələcəkdə Hero skill slot 6 və 8 unlock üçün server tərəfindən istifadə ediləcək.

## Server state

Canonical owned hero list:

```json
{
  "heroes": [
    {
      "heroId": "war_master",
      "level": 1,
      "exp": 0,
      "duplicateCopies": 0,
      "obtainedAtMs": 0
    }
  ]
}
```

Recruit runtime:

```json
{
  "heroRecruit": {
    "version": 1,
    "tickets": {
      "normal": 0,
      "advanced": 0,
      "super": 0
    },
    "expItems": {
      "hero_exp_kicik": 0,
      "hero_exp_orta": 0,
      "hero_exp_boyuk": 0
    },
    "dailyFree": {
      "utcDateKey": "20260813",
      "usedByBanner": {
        "banner_normal": 0,
        "banner_advanced": 0,
        "banner_super": 0
      }
    },
    "stats": {
      "totalDraws": 0,
      "firstHeroGuaranteedUsed": false
    }
  }
}
```

## WebSocket API

### Recruit məlumatı

Request:

```json
{
  "type": "hero_recruit_info_request"
}
```

Result:

```json
{
  "type": "hero_recruit_info_result",
  "success": true,
  "playerId": "...",
  "utcDateKey": "20260813",
  "tickets": {
    "normal": 0,
    "advanced": 0,
    "super": 0
  },
  "banners": [],
  "heroes": [],
  "expItems": [],
  "totalDraws": 0
}
```

### Single Recruit

Request:

```json
{
  "type": "hero_recruit_single_request",
  "bannerId": "banner_normal"
}
```

Client nəticə və rarity göndərmir.

Result type:

```text
hero_recruit_single_result
```

### X10 Recruit

Request:

```json
{
  "type": "hero_recruit_x10_request",
  "bannerId": "banner_super"
}
```

Result type:

```text
hero_recruit_x10_result
```

## Recruit result entry

Hero nümunəsi:

```json
{
  "rewardKind": "hero",
  "rewardKindCode": 0,
  "rewardId": "iron_maiden",
  "rewardDisplayName": "Iron Maiden",
  "rewardCount": 1,
  "heroId": "iron_maiden",
  "heroName": "Iron Maiden",
  "rarity": 2,
  "wasDuplicate": false,
  "duplicateCopiesAfter": 0,
  "expValuePerItem": 0
}
```

EXP nümunəsi:

```json
{
  "rewardKind": "hero_exp_item",
  "rewardKindCode": 1,
  "rewardId": "hero_exp_kicik",
  "rewardDisplayName": "Kiçik Qəhrəman EXP",
  "rewardCount": 1,
  "expValuePerItem": 100
}
```

## Persistence

Uğurlu recruit-dən sonra dəyişən state PostgreSQL gameplay snapshot-a yazılmalıdır.

DB yazısı uğursuz olarsa server RAM-da:

- ticket dəyişməsini
- free draw istifadəsini
- hero nəticəsini
- EXP item nəticəsini

geri qaytarmalı və client-ə uğursuz nəticə göndərməlidir.

## Missiya inteqrasiyası

M011 ayrıca client event-i tələb etmir.

Server missiya progressi:

```text
state.heroes.length >= 1
```

olduqda M011 tamamlanmış sayılır.

M012 hero level state-dən hesablanacaq.

M013 skill upgrade server əməliyyatı uğurlu olduqdan sonra `qehreman_bacarigi_artdi` server mission event-i yazacaq.

## Cari inteqrasiya statusu

Server data/runtime/handler modulları hazırlanıb:

- `qehreman_kataloqu.js`
- `qehreman_recruit_qaydalari.js`
- `qehreman_recruit_sistemi.js`
- `qehreman_recruit_handler.js`

Lakin canlı server entry-point-ə Recruit handler qoşulması hazırda GitHub connector təhlükəsizlik yoxlaması tərəfindən bloklandığı üçün bu WS API hələ aktiv deyil.

Mövcud işləyən Mission, Account, Google və gameplay server axını dəyişdirilməyib.
