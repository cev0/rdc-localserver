# Dövlət Xəritəsi WorldV2 — Server Migrasiya Auditi

Bu sənəd `rdc-localserver` daxilində Dövlət xəritəsinin legacy `1024×1024` sistemindən WorldV2 `1200×1200` sisteminə keçid statusunu izləyir. Buradakı məqsəd gameplay qaydası yaratmaq deyil; artıq serverdə rəsmiləşdirilmiş və hələ qəsdən açıq saxlanılan hissələri ayırmaqdır.

## Təhlükəsizlik qaydası

Legacy xəritə endpoint-ləri birbaşa `1024 → 1200` çevrilmir. WorldV2 ayrıca versiyalı contract və handler-lərlə işləyir. WorldV2 üçün production-a qoşulan hissələr yalnız server-authoritative mənbədən gəlir; həll olunmamış gameplay qərarları `null`/unresolved saxlanılır və client tərəfindən uydurulmur.

---

# 1. Hazırda server-authoritative və production-a qoşulmuş hissələr

Aşağıdakılar artıq yalnız hazırlıq branch-ində deyil, `main` daxilində versiyalanmış WorldV2 server sistemidir:

- koordinat domeni `0..1200` × `0..1200`;
- mərkəz `600:600`;
- persistent baza sahələri `baseX/baseZ`, protokolda `x/y`, Unity-də `x/z` çevirməsi;
- WorldV2 başlanğıc/map info contract-ı;
- WorldV2 baza obyekt layer-i PostgreSQL `dovlet_baza_kataloqu_postgres` mənbəyindən production payload-a qoşulub;
- baza marker public sahələri server↔Unity müqaviləsində rəsmiləşdirilib;
- Yaxın LOD sərhəd push keçidi production routing-ə qoşulub: authoritative topology/lifecycle yoxlaması, read-only `viewedStateId`, qarşı sərhəddə 24 vahid içəri giriş koordinatı və persistent Ev Dövlət placement qoruması;
- 60 günlük Dövlət lifecycle və Dövlət başladıqdan 30 gün sonra Prezident mərkəzinin açılması;
- Prezident mərkəzi `600:600` və dörd server-authoritative müdafiə slotu:
  - `yuxari` → `596:596`
  - `sag` → `605:596`
  - `sol` → `596:605`
  - `asagi` → `605:605`
- `global_states_v2_request/result` production handler-i;
- Qlobal xəritə Layout V1:
  - `normalized_0_1`;
  - origin `bottom_left`;
  - fon ID `worldv2_qlobal_fon_v1`;
  - fon aspekti `9:16`;
  - 91 stabil Dövlət node tutumu;
  - yalnız açılmış Dövlətlər və hər iki ucu açılmış əlaqələr payload-a daxil edilir;
- WorldV2 əlfəcin list/add/remove əməliyyatları persistent player-state üzərində saxlanılır.

Legacy endpoint-lərin saxlanması hələ də vacibdir; WorldV2 production handler-lərinin mövcud olması legacy sistemin avtomatik ləğvi demək deyil.

---

# 2. Legacy placement sistemləri

## `xerite_movqe_sistemi.js`

Legacy sistem resurs/düşmən deterministic mövqelərini `1024×1024` xəritə və köhnə radiuslarla yaradır:

```text
centerX      = 512
centerZ      = 512
innerRadius  = 140
middleRadius = 280
outerRadius  = 460
```

Bu rəqəmlər WorldV2-yə avtomatik scale edilmir. Seed/RNG çağırış ardıcıllığını dəyişmək köhnə deterministic mövqeləri dəyişə biləcəyi üçün legacy generatora toxunmaq yüksək risklidir.

### WorldV2 statusu

`worldV2ResourcePlacement` və `worldV2EnemyPlacement` hələ qəsdən unresolved-dur. Yeni terrain/biom zonaları, spawn sıxlığı, say və level band-ləri təsdiqlənmədən ayrıca V2 placement generatoru yazılmır.

---

# 3. Resurs runtime

`xerite_resurs_toplama_sistemi.js` legacy xəritədə 18 node və köhnə zone bölgüsündən istifadə edir. PostgreSQL occupied/respawn/toplama transaction mexanizmi placement-dan ayrılıb saxlanıla bilər, amma WorldV2 resurs sayı və yerləşimi hələ final gameplay qaydası deyil.

Açıq qalan qərarlar:

- V2 resurs sayı və sıxlığı;
- zone/biom sərhədləri;
- level bölgüsü;
- Prezident mərkəzi ətrafında resurs qaydası;
- bazalardan minimum spawn məsafəsi.

---

# 4. Düşmən runtime

`xerite_dusmen_sistemi.js` legacy xəritədə 17 düşmən və köhnə zone/level bölgüsündən istifadə edir. Server-authoritative defeat/respawn runtime saxlanıla bilər, lakin WorldV2 placement və descriptor qaydası ayrıca qərar tələb edir.

---

# 5. Baza kataloqu və persistent koordinatlar

`dovlet_baza_kataloqu_postgres.js` WorldV2 baza obyekt payload-ının production mənbəyidir. Persistent sahələr birbaşa rename edilmir:

```text
persistent baseX -> protocol x -> Unity x
persistent baseZ -> protocol y -> Unity z
```

Bu adapter qaydası server↔Unity contract-da qorunur.

### Stabil ittifaq ID-si blocker-i

Baza kataloqunda `allianceName` mövcuddur, lakin stabil server-authoritative `allianceId` mənbəyi hələ yoxdur. İttifaq adı texniki ID kimi istifadə edilmir. Uzaq zoom alliance filtri üçün `stableAllianceIdForBaseLodFiltering` unresolved qalır və fail-closed davranış qorunur.

---

# 6. Konvoy runtime

`dovlet_konvoy_runtime_postgres.js` shared convoy/PvP kamp runtime və server-vaxtı interpolasiyasını saxlayır. Runtime mexanizmi xəritə ölçüsündən əsasən müstəqildir.

WorldV2 üçün yeni əməliyyatların koordinat girişləri V2 validatorundan keçməlidir. Sərhəd keçidi üçün giriş koordinatı isə ayrıca WorldV2 sərhəd production handler-i tərəfindən authoritative hesablanır.

---

# 7. Sərhəd və real Dövlət topologiyası

Hazır server qaydaları:

- istiqamətlər yalnız `simal`, `serq`, `cenub`, `qerb`;
- qonşu statusu fail-closed yoxlanır;
- client sərhəd keçidini lokal olaraq məcbur edə bilməz;
- açılmamış Dövlətə keçid yoxdur;
- sərhəd keçidi `state_map_v2_border_transition_request/result` ilə production routing-də read-only işləyir;
- Ev Dövlət `worldPlacement` mutasiya edilmir;
- server keçid icazəsi varsa qarşı sərhəddə `24` vahid təhlükəsizlik payı ilə `entryCoordinate` qaytarır;
- paralel ox koordinatı saxlanılır:
  - Şimal → `y=1176`;
  - Cənub → `y=24`;
  - Şərq → `x=24`;
  - Qərb → `x=1176`.

Hələ qəsdən unresolved:

- real State qonşuluq ID-ləri (`realStateTopologyIds`).

`borderEntryCoordinates` artıq unresolved deyil.

---

# 8. Qlobal xəritə

Qlobal node layout artıq unresolved deyil. Layout V1 server-authoritative olaraq Dövlət node mövqelərini və açılmış Dövlətlər arasındakı əlaqə qrafını verir.

Hələ açıq qalan hissə Qlobal Dövlət metadata-sının real production mənbəyidir:

- Dövlət display adı;
- Prezident capture datası;
- Prezident ittifaq ID-si;
- `flagId`.

Bu mənbələr hazır olmayanda `displayName`, Prezident və bayraq sahələri uydurulmur və `null` qala bilər.

Qlobal xəritədə future/bağlı Dövlətlərin client tərəfindən yaradılması qadağandır; server yalnız açılmış Dövlətləri qaytarır.

---

# 9. Test və merge qaydası

WorldV2 server test runner:

```bash
npm run xerite:worldv2-test
```

WorldV2 dəyişiklikləri ayrıca branch/PR üzərindən aparılır və uyğun GitHub Actions yoxlamaları uğurla keçmədən production `main`-ə merge edilmir.

Contract, guard, production handler və sənəd consistency testləri server-authoritative qaydaların drift etməməsini yoxlayır.

---

# 10. Hazırda qəsdən edilməyən dəyişikliklər

Aşağıdakılar istifadəçi/gameplay qərarı və ya real authoritative data mənbəyi olmadan yazılmır:

- yeni biom/zone radiusları;
- WorldV2 resurs sayı və placement;
- WorldV2 düşmən sayı və placement;
- resource/enemy level band-ləri;
- real State qonşuluq ID-ləri;
- `allianceName`-dən saxta stabil ittifaq ID-si;
- war-target identifikator/storage qaydası;
- Qlobal Prezident/ad/bayraq metadata mənbəyi.

Prezident müdafiə koordinatları, sərhəd giriş koordinatı və Qlobal Layout V1 artıq bu siyahıya daxil deyil; onlar server-authoritative olaraq həll olunub.
