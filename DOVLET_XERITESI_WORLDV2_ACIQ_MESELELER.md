# Dövlət Xəritəsi WorldV2 — Açıq Məsələlər

Bu sənəd WorldV2 hazırlığında qəsdən qərar verilməyən və istifadəçi qaydası / mövcud server sistemi dəqiqləşmədən production koduna çevrilməyəcək hissələri saxlayır.

## 1. Prezident müdafiə binalarının dəqiq koordinatları

Təsdiqlənən qayda:

- Prezident binası: `600:600`
- dörd müdafiə/top binası:
  - Şimal
  - Şərq
  - Cənub
  - Qərb

Hələ müəyyən edilməyib:

- Prezident binasından neçə koordinat uzaqda olacaqlar;
- hər müdafiə binasının footprint ölçüsü;
- həmin sahəyə başqa obyektlərin nə qədər yaxınlaşa biləcəyi.

WorldV2 payload-da `defenseCoordinates` buna görə hazırda `null` saxlanır.

---

## 2. Real Dövlət qonşuluq topologiyası

Hazırdır:

- dörd sərhəd istiqaməti: `simal`, `serq`, `cenub`, `qerb`;
- qonşu yoxdursa `null`;
- açıq/bağlı State statusu mövcud 60 günlük lifecycle-dan hesablanır;
- qarşılıqlı qonşuluğu yoxlayan `dovlet_xerite_worldv2_topologiya.js` validatoru.

Hələ müəyyən edilməyib:

- State #1-in konkret qonşuları;
- sonrakı Dövlətlərin konkret coğrafi/topoloji yerləşməsi;
- Dövlət sayı artdıqca qlobal topologiyanın necə genişlənəcəyi.

Test fayllarındakı State `1..4` əlaqələri yalnız test fixture-idir və oyun qaydası deyil.

---

## 3. Qonşu Dövlətə keçəndə giriş koordinatı

Təsdiqlənən qayda:

- bağlı qonşuya keçid yoxdur;
- açıq qonşu Dövlətə sərhədi sürüşdürməklə keçmək mümkündür;
- keçid server-authoritative olmalıdır.

Hələ müəyyən edilməyib:

- məsələn şərq sərhədindən çıxan `y=742` oyunçusu qonşu Dövlətdə hansı dəqiq `x/y` koordinatında açılacaq;
- kənardan təhlükəsizlik payı neçə vahid olacaq;
- qarşı sərhəddə eyni ox koordinatı qorunacaqmı.

Buna görə `entryCoordinate` hazırda `null` saxlanır.

---

## 4. İttifaq identifikatoru — uzaq zoom üçün bloklayıcı məsələ

Təsdiqlənən gameplay qaydası:

Daha uzaq local-State zoom səviyyəsində:

- öz baza görünür;
- eyni ittifaqdakı bazalar görünür;
- resurslar və adi düşmənlər gizlənir.

Server auditinin nəticəsi:

`dovlet_baza_kataloqu_postgres.js` public baza elementində hazırda:

```text
allianceName
```

var, lakin stabil:

```text
allianceId
```

yoxdur.

`server.js` oyunçu profilində də hazırda server-authoritative olaraq əsasən:

```text
ittifaqAdi
```

saxlayır.

### Qərar

WorldV2 eyni ittifaq filtri **ittifaq adına görə yazılmayacaq**.

Səbəblər:

- eyni adlı iki ittifaq ola bilər;
- ittifaq adı dəyişə bilər;
- localization/display adı stabil texniki identifikator deyil.

Uzaq zoom ittifaq filtri üçün gələcək ittifaq sistemində stabil `allianceId` authoritative sahəsi olmalıdır. Bu sahə hazır olduqdan sonra WorldV2 baza payload-ına əlavə ediləcək.

`allianceId` hazır deyilsə fail-closed yanaşması üstün tutulacaq: client başqa oyunçunu yalnız ada görə eyni ittifaq saymayacaq.

---

## 5. Müharibə hədəfi və yer imi markerləri

Təsdiqlənən vizual qayda:

uzaq zoom-da uyğun olduqda:

- yer imləri;
- müharibə hədəfləri

qala bilər.

Hələ müəyyən edilməyib:

- bookmark authoritative saxlanma modeli;
- war-target identifikatoru;
- marker priority;
- eyni obyekt həm alliance, həm war/bookmark olduqda hansı markerin üstün olması.

Bunlar hazır olmadan WorldV2 server filtri yazılmır.

---

## 6. Resurs və düşmənlərin yeni WorldV2 placement qaydası

Legacy serverdə hazırda:

```text
1024×1024
center 512:512
innerRadius 140
middleRadius 280
outerRadius 460
18 resurs
17 düşmən
```

və köhnə level band-ləri var.

Yeni `1200×1200` xəritəyə bunlar avtomatik scale edilməyəcək.

Hələ müəyyən edilməlidir:

- yeni terrain/biom gameplay zonalarının dəqiq sərhədləri;
- hər zonada resurs sıxlığı;
- resurs sayı;
- düşmən sayı;
- spawn məsafələri;
- Prezident mərkəzində resurs/düşmən qaydası;
- baza ilə minimum məsafə.

Mövcud PostgreSQL respawn/runtime mexanizmini saxlamaq, yalnız placement qatını V2 etmək planlanır.

---

## 7. State Overview vizual forması

Server üçün təsdiqlənən qayda:

- Overview eyni `0..1200` koordinat domenindən istifadə edir;
- client klik koordinatını local State koordinatına çevirir;
- 3D xəritəyə həmin koordinatda qayıdır.

Client vizualı üçün hələ müəyyən edilməyib:

- konkret State konturu;
- coğrafi xəritə teksturası;
- biom konturlarının final forması;
- overview-da hansı strateji obyektlərin marker qalacağı.

Bunlar server koordinat sistemini dəyişməməlidir.

---

## 8. Qlobal xəritə metadata-sı

Hazırdır:

- `dovlet_xerite_worldv2_qlobal_payload.js`
- yalnız lifecycle-a görə açılmış Dövlətlər daxil edilir;
- future/bağlı Dövlət metadata-da olsa belə siyahıya daxil edilmir;
- metadata yoxdursa sahələr uydurulmur.

Hazırda metadata üçün nəzərdə tutulan optional sahələr:

```text
presidentPlayerId
presidentAllianceId
flagId
globalNode.nodeId
```

Hələ müəyyən edilməyib:

- real Prezident capture datasının hansı stabil storage modelindən gələcəyi;
- bayraq ID qaydası;
- qlobal node/slot siyahısı;
- qlobal xəritədə Dövlətlərin konkret coğrafi yerləşməsi;
- bağlı Dövlətlərin ümumiyyətlə görünüb-görünməyəcəyi.

Qlobal node üçün hazır builder qəsdən `x/y` uydurmur, yalnız gələcəkdə serverdə təyin edilmiş `nodeId` qəbul edir.

---

## 9. CI statusu

Branch-də:

```text
.github/workflows/worldv2-xerite-test.yml
```

əlavə edilib və `npm run xerite:worldv2-test` çalışdırmaq üçün hazırlanıb.

Cari GitHub connector push-trigger workflow run siyahısını göstərmədiyi üçün CI-nin keçdiyi təsdiqlənməyib. Buna görə sənəddə və cavablarda testlər GitHub Actions-da keçib kimi təqdim edilməməlidir.

Sabah kompüter açıldıqda lokal olaraq da:

```bash
npm run xerite:worldv2-test
```

çalışdırılmalıdır.

---

## 10. Sabah Unity açıldıqda ilk inteqrasiya sırası

1. Mövcud `WorldV2` scene və scriptləri yoxla.
2. Legacy `1024` Grid dəyərlərini birbaşa production sistemə yaymadan yeni Grid-i `0..1200` müqaviləsinə uyğunlaşdır.
3. `600:600` mərkəz çevirməsini test et.
4. Küncləri test et:
   - `0:0`
   - `1200:0`
   - `0:1200`
   - `1200:1200`
5. Test baza koordinatı serverdən alındıqda kamera həmin koordinatda açılsın.
6. Yalnız bundan sonra sərhəd clamp və qara arakəsmə sistemi qurulsun.
7. Qonşu Dövlət transition-u real topologiya təsdiqlənəndən sonra qoşulsun.
8. Resurs/düşmən V2 placement ayrıca mərhələdə edilsin.

Əsas prinsip: vizual sistem server coordinate contract-ına uyğunlaşdırılır; server shared-world koordinatının authoritative mənbəyi olaraq qalır.
