# Dövlət Xəritəsi WorldV2 — Server Migrasiya Auditi

Bu sənəd `rdc-localserver` daxilində mövcud Dövlət xəritəsi kodunun WorldV2 `1200×1200` sisteminə keçidi üçün audit nəticəsidir.

## Təhlükəsizlik qaydası

Hazırda production `main` branch-də işləyən legacy xəritə birbaşa dəyişdirilmir.

WorldV2 hazırlığı yalnız:

```text
worldv2-server-hazirliq
```

branch-ində aparılır.

Unity WorldV2 tərəfi hazır və test edilənə qədər legacy handler-lərin `1024 → 1200` kimi birbaşa dəyişdirilməsi qadağandır.

---

# 1. Əsas legacy asılılıqlar

## `dovlet_xerite_kataloq_handler.js`

Cari rolu:

- `state_map_objects_request`
- `state_map_objects_result`
- `state_base_detail_request`
- bazaları, resursları, düşmənləri, konvoyları və PvP kamplarını bir payload-da yığır.

Cari map metadata:

```text
width   = 1024
height  = 1024
centerX = 512
centerZ = 512
```

### WorldV2-də dəyişəcək

Birbaşa rəqəmlər yazılmayacaq. V2 config-dən gələcək:

```text
0..1200
mərkəz 600:600
```

### Risk

YÜKSƏK.

Bu handler Unity-nin hazırda istifadə edə biləcəyi əsas obyekt payload-larından biridir. Erkən dəyişiklik köhnə client xəritəsini poza bilər.

### Migrasiya qaydası

Legacy `state_map_objects_request` saxlanılır.
WorldV2 üçün əvvəl ayrıca versiyalı contract/handler hazırlanır. Unity WorldV2 yeni mesaj tipinə qoşulduqdan sonra köhnə endpoint mərhələli ləğv edilə bilər.

---

# 2. `xerite_movqe_sistemi.js`

Cari rolu:

- resursların deterministic mövqelərini yaradır;
- düşmənlərin deterministic mövqelərini yaradır;
- radius/halqa əsasında zone seçir.

Legacy config:

```text
width        = 1024
height       = 1024
centerX      = 512
centerZ      = 512
innerRadius  = 140
middleRadius = 280
outerRadius  = 460
```

Clamp:

```text
0 .. width - 1
0 .. height - 1
```

yəni faktiki maksimum `1023`.

### WorldV2-də dəyişəcək

Yeni xəritə koordinat domeni `0..1200` daxil olmaqla qəbul edilir.

Ancaq köhnə radiuslar və resurs/düşmən halqaları avtomatik olaraq miqyaslanmayacaq. Yeni terrain/biom gameplay zonaları istifadəçi tərəfindən dəqiqləşdirildikdən sonra ayrıca V2 placement qaydası yaradılacaq.

### Risk

ÇOX YÜKSƏK.

Bu faylın seed/RNG çağırış ardıcıllığı resursların və düşmənlərin restartdan sonra eyni koordinatda qalmasına təsir edir. Mövcud faylı dəyişmək bütün köhnə deterministic mövqeləri dəyişə bilər.

### Migrasiya qaydası

Bu fayla toxunmaq əvəzinə ayrıca:

```text
dovlet_xerite_worldv2_movqe_sistemi.js
```

hazırlanmalıdır.

Legacy seed generatoru yalnız lazım olduğu qədər referans kimi istifadə ediləcək.

---

# 3. `xerite_resurs_toplama_sistemi.js`

Cari rolu:

- 18 resurs node-u yaradır;
- node ID və level qaydasını saxlayır;
- toplama/runtime/respawn əməliyyatlarını PostgreSQL runtime ilə idarə edir.

Cari hard-coded gameplay bölgüsü:

```text
1..10  -> outer
11..15 -> middle
16..17 -> inner_green
18     -> president_center
```

Cari node sayı:

```text
RESURS_SAYI = 18
```

### WorldV2 qərarı

Bu rəqəmlər yeni xəritə dizaynı üçün final sayılmır.

Xüsusilə:

- resurs sayı;
- hər zonadakı resurs sayı;
- level aralıqları;
- Prezident mərkəzində resurs olub-olmaması

istifadəçi tərəfindən yeni xəritə qaydaları tam dəqiqləşdirilmədən dəyişdirilməyəcək.

### Saxlanıla biləcək hissə

PostgreSQL runtime, occupied/respawn və toplama transaction məntiqi böyük ehtimalla saxlanıla bilər. Placement/descriptor qatından ayrılmalıdır.

### Risk

ORTA/YÜKSƏK.

---

# 4. `xerite_dusmen_sistemi.js`

Cari rolu:

- 17 düşmən descriptor-u yaradır;
- zone və level seçir;
- defeat/respawn state-ni PostgreSQL-də saxlayır.

Cari bölgü:

```text
1..10  -> outer
11..15 -> middle
16..17 -> inner_green
```

Cari say:

```text
DUSMEN_SAYI = 17
```

### WorldV2 qərarı

Düşmən sayı və zone/level bölgüsü hələ yeni xəritə üçün final deyil. Köhnə rəqəmlər WorldV2-yə avtomatik daşınmır.

### Saxlanıla biləcək hissə

Düşmənin server-authoritative defeat/respawn runtime mexanizmi saxlanıla bilər. Yeni placement və descriptor qatına bağlanacaq.

### Risk

ORTA/YÜKSƏK.

---

# 5. `dovlet_baza_kataloqu_postgres.js`

Cari rolu:

- offline və online oyunçu bazalarının son snapshot-larını Dövlət xəritəsi üçün oxuyur;
- baza `worldPlacement` koordinatını public map elementinə çevirir;
- mərkəzə məsafə və zone hesablayır;
- qısa cache istifadə edir.

Cari kritik asılılıq:

```js
const { XERITE } = require("./xerite_movqe_sistemi");
```

və:

- `XERITE.centerX`
- `XERITE.centerZ`
- `XERITE.innerRadius`
- `XERITE.middleRadius`

ilə zone/distance hesablanır.

### WorldV2-də dəyişəcək

Baza koordinatı WorldV2-də ayrıca V2 validator/config tərəfindən yoxlanmalıdır.

Yeni Dövlət xəritəsində oyunçu daxil olanda kamera məhz bu authoritative baza koordinatından açılacaq.

### Vacib data problemi

Mövcud `worldPlacement` sahələri əsasən:

```text
baseX
baseZ
```

şəklindədir.

Yeni server müqaviləsi xaricə `(x,y)` Dövlət koordinatı deyə bilər, amma mövcud persistent data bir dəfəyə rename edilməməlidir. Təhlükəsiz adapter qatında:

```text
server persistent baseZ <-> protocol y <-> Unity world z
```

çevrilməsi edilməlidir.

### Risk

YÜKSƏK.

Persist edilmiş oyunçu mövqelərinə toxunduğu üçün migration ayrıca versiyalanmalıdır.

---

# 6. `dovlet_konvoy_runtime_postgres.js`

Cari rolu:

- shared active convoy runtime saxlayır;
- PvP kamp statusunu saxlayır;
- hərəkətdə olan konvoyun `fromX/fromZ -> targetX/targetZ` interpolasiyasını server vaxtına görə hesablayır.

### WorldV2 təsiri

Konvoyun runtime/transaction mexanizmi xəritə ölçüsündən əsasən müstəqildir.

Ancaq yeni əməliyyat başlananda verilən:

```text
fromX/fromZ
targetX/targetZ
```

koordinatlarının V2 xəritə sərhədinə uyğun validator-dan keçməsi tələb olunacaq.

### Risk

ORTA.

Runtime mexanizmini dəyişmək lazım deyil; giriş koordinatlarının mənbəyi dəyişəcək.

---

# 7. `dovlet_xerite_layer_handler.js`

Cari rolu:

- `state_map_static_request`
- `state_map_dynamic_request`

layer-lərini qaytarır.

Legacy map metadata `1024×1024 / 512` sisteminə bağlıdır.

Prezident mərkəzi üçün 30 günlük aktivləşmə məntiqi burada da mövcuddur.

### WorldV2 qərarı

30 günlük qayda saxlanır, koordinat `600:600` olur.

Köhnə static/dynamic layer endpoint-ləri birbaşa dəyişdirilməməlidir; onların nə qədərinin WorldV2 client-də lazım olacağı Unity inteqrasiyası zamanı müəyyən ediləcək.

### Risk

ORTA/YÜKSƏK.

---

# 8. Server tərəfindən saxlanmalı əsas sistemlər

WorldV2 yeni xəritə ölçüsü deməkdir; aşağıdakı işlək server mexanizmlərinin sıfırdan yazılması tələb olunmur:

- PostgreSQL runtime transaction pattern;
- Dövlət üzrə `stateId` ayrımı;
- offline baza snapshot oxuma;
- convoy shared runtime;
- resource occupied/respawn runtime;
- enemy defeated/respawn runtime;
- server-authoritative vaxt;
- Prezidentin 30 günlük vaxt qaydası.

Dəyişməli əsas qatlar:

- map config;
- coordinate validator;
- placement generator;
- zone/terrain gameplay bölgüsü;
- client payload contract;
- neighbor/border contract;
- Global State summary contract.

---

# 9. Tövsiyə olunan migrasiya sırası

## Mərhələ A — hazırda təhlükəsiz görülə bilər

1. WorldV2 müqaviləsi
2. `0..1200` validator
3. Prezident mərkəzi `600:600`
4. qonşu Dövlət status modeli
5. unit testlər
6. payload builder-lər

Production handler-ə qoşulmur.

## Mərhələ B — Unity WorldV2 açılanda

1. Unity `DovletXeriteGridSistemi` 1200 sisteminə keçirilir
2. server `(x,y)` ↔ Unity `(x,z)` çevirməsi test edilir
3. test oyunçunun baza koordinatında kamera açılır
4. ayrıca WorldV2 map info endpoint qoşulur
5. sərhəd/qonşu Dövlət transition-u test edilir

## Mərhələ C — gameplay obyektləri

1. yeni V2 resurs placement
2. yeni V2 düşmən placement
3. bazaların V2 validation/migration qaydası
4. konvoy coordinate validation
5. kamplar

## Mərhələ D — strateji görünüşlər

1. Alliance/war marker server contract
2. State Overview payload
3. Global States payload

---

# 10. Hazırda qəsdən edilməyən dəyişikliklər

Aşağıdakılar final gameplay qaydası verilmədən yazılmır:

- yeni biom radiusları;
- yeni resurs node sayı;
- yeni düşmən sayı;
- resource/enemy level band-ləri;
- Prezident müdafiə toplarının dəqiq offset-ləri;
- konkret State qonşuluq ID-ləri;
- locked State-in Global xəritədə görünüş qaydası.

Bu yanaşma serverdə yanlış fərziyyələri production qaydasına çevirməmək üçündür.
