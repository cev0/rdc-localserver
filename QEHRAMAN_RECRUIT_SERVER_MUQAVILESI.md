# Qəhrəman Recruit — Unity / Server Müqaviləsi

Bu sənəd mobil RTS layihəsində Qəhrəman Recruit sisteminin server-authoritative müqaviləsini saxlayır.

## Əsas prinsip

Unity yalnız UI, animasiya və server nəticəsinin göstərilməsinə cavabdehdir.

Client bunları müəyyən etmir:

- düşən qəhrəman və ya EXP item
- rarity
- RNG
- günlük free qalıqları
- ticket balansı
- duplicate sayı
- reward miqdarı

Server oyunçunu `ws._authedPlayerId` əsasında müəyyən edir.

## Rarity sırası

Unity `HeroRarity` ilə eynidir:

- Green = 0
- Blue = 1
- Purple = 2
- Orange = 3

Final recruit qəhrəman planı:

- Göy: 15 qəhrəman
- Bənövşəyi: 10 qəhrəman
- Narıncı: 5 qəhrəman

Hazırkı `doyuscu`, `war_master`, `iron_maiden`, `feroman`, `qiz`, `qiz2` yalnız test qəhrəmanlarıdır. Final hero sayı artanda server mexanikası dəyişməyəcək; yalnız kataloq və pool datası genişlənəcək.

## Banner uyğunluğu

Unity-də hazır texniki ID-lər saxlanılır:

- `banner_normal` = Göy Recruitment
- `banner_advanced` = Bənövşəyi Recruitment
- `banner_super` = Narıncı Recruitment

Bu yanaşma mövcud UI/prefab inteqrasiyasını sındırmadan rarity əsaslı sistemi qurmağa imkan verir.

## Günlük pulsuz recruit

Hər UTC gündə:

- Göy recruit: 1 dəfə FREE
- Bənövşəyi recruit: 1 dəfə FREE
- Narıncı recruit: 1 dəfə FREE

Cəmi: gündə 3 pulsuz recruit.

Free istifadə olunmasa növbəti günə yığılmır. UTC gün dəyişəndə hər üç banner yenidən `1` free alır.

`utcDateKey` formatı:

```text
YYYYMMDD
```

Client cihaz saatı authoritative deyil.

## Ödənişli recruit

Free bitdikdən sonra hazır V1 ticket sistemi qalır:

- single = 1 uyğun ticket
- x10 = 10 uyğun ticket

Texniki ticket növləri mövcud uyğunluq üçün `normal`, `advanced`, `super` olaraq qalır. Unity UI-də bunlar sonradan Göy/Bənövşəyi/Narıncı vizualları ilə göstərilə bilər.

## İlk recruit zəmanəti

Serverdə `totalDraws == 0` olduqda ilk real recruit nəticəsi Hero olmalıdır.

Bu qayda M011 campaign missiyasının EXP nəticəsinə görə bloklanmamasını təmin edir.

## Mixed reward növləri

V1:

```text
hero
hero_exp_item
```

Random medal reward hələ aktiv deyil.

EXP item ID-lər:

- `hero_exp_kicik` = 100 EXP
- `hero_exp_orta` = 500 EXP
- `hero_exp_boyuk` = 1000 EXP

Hazır pool weight-ləri test balansıdır. Final 15/10/5 hero kataloqu hazırlananda ayrıca balans ediləcək.

## Duplicate qaydası

Hero ilk dəfə düşəndə `state.heroes` daxilində owned state yaranır.

Eyni hero yenidən düşəndə:

```text
duplicateCopies += 1
```

V1-də duplicate avtomatik medal reward vermir. Duplicate copy-lər gələcəkdə skill slot 6 və 8 unlock üçün istifadə olunacaq.

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
{ "type": "hero_recruit_info_request" }
```

Result:

```text
hero_recruit_info_result
```

### Single recruit

```json
{
  "type": "hero_recruit_single_request",
  "bannerId": "banner_normal"
}
```

Result:

```text
hero_recruit_single_result
```

Server həmin banner üçün free qalıbsa əvvəl free istifadə edir. Free qalmayıbsa uyğun ticket qaydası tətbiq olunur.

### X10 recruit

```json
{
  "type": "hero_recruit_x10_request",
  "bannerId": "banner_super"
}
```

Result:

```text
hero_recruit_x10_result
```

## Persistence

Uğurlu recruit-dən sonra dəyişən state PostgreSQL gameplay snapshot-a yazılır.

DB yazısı uğursuz olarsa RAM-dakı:

- ticket dəyişməsi
- free istifadə vəziyyəti
- hero nəticəsi
- EXP item nəticəsi

geri qaytarılır və client-ə uğursuz cavab göndərilir.

## Missiya inteqrasiyası

M011 ayrıca client event-i tələb etmir.

Server missiya progressi:

```text
state.heroes.length >= 1
```

olduqda M011 tamamlanır.

M012 hero level state-dən hesablanacaq. M013 skill upgrade server əməliyyatı uğurlu olduqdan sonra server mission event-i ilə artırılacaq.

## Cari status

Server modulları hazırdır və canlı entry-point-ə qoşulub:

- `qehreman_kataloqu.js`
- `qehreman_recruit_qaydalari.js`
- `qehreman_recruit_qayda_override.js`
- `qehreman_recruit_sistemi.js`
- `qehreman_recruit_handler.js`
- `server_missiya_genisletme.js`

Cari server qaydası: Göy/Bənövşəyi/Narıncı hərəsinə gündə 1 free recruit.
