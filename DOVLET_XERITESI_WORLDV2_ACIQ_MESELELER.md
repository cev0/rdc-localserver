# Dövlət Xəritəsi WorldV2 — Açıq Məsələlər

Bu sənəd yalnız hələ qərar verilməyən və ya production authoritative mənbəyi hazır olmayan WorldV2 hissələrini saxlayır. Artıq serverdə rəsmiləşdirilmiş qaydalar burada "açıq məsələ" kimi göstərilmir.

## Həll olunmuş əsas qaydalar

Aşağıdakılar artıq server-authoritative qaydadır və yenidən gameplay qərarı tələb etmir:

- xəritə koordinat domeni: `0..1200` × `0..1200`;
- Dövlət mərkəzi: `600:600`;
- Dövlət lifecycle: 60 gün;
- Prezident mərkəzinin açılması: Dövlət başladıqdan 30 gün sonra;
- Prezident mərkəzi müdafiə slotları:
  - `yuxari` → `596:596`
  - `sag` → `605:596`
  - `sol` → `596:605`
  - `asagi` → `605:605`
- Yaxın LOD sərhəd keçidi:
  - yalnız server-authoritative qonşu topologiyası istifadə olunur;
  - keçid yalnız açıq qonşuya mümkündür;
  - qarşı Dövlətə giriş nöqtəsi sərhəddən `24` world/server vahidi içəridədir;
  - sərhədə paralel koordinat qorunur;
  - keçid read-only baxışdır və Ev Dövlət `worldPlacement` mutasiya edilmir;
- Qlobal xəritə layout V1:
  - `normalized_0_1` koordinat sahəsi;
  - origin `bottom_left`;
  - fon `worldv2_qlobal_fon_v1`;
  - 91 stabil Dövlət node tutumu;
  - yalnız açılmış Dövlətlər və hər iki ucu açılmış əlaqələr client payload-a daxil edilir;
- WorldV2 baza layer-i PostgreSQL baza kataloqundan production payload-a qoşulub;
- WorldV2 əlfəcinləri serverdə persistent player-state mutasiyası ilə list/add/remove olunur, koordinat və limit yoxlamaları serverdə edilir.

---

## 1. Real Dövlət qonşuluq topologiyası

Hazırdır:

- dörd sərhəd istiqaməti: `simal`, `serq`, `cenub`, `qerb`;
- qonşu yoxdursa `null`;
- açıq/bağlı State statusu 60 günlük lifecycle-dan hesablanır;
- qarşılıqlı qonşuluğu yoxlayan validator mövcuddur.

Hələ müəyyən edilməyib:

- State #1-in real qonşu State ID-ləri;
- sonrakı Dövlətlərin real local-State sərhəd topologiyası.

Test fixture-lərindəki State `1..4` əlaqələri gameplay qaydası deyil.

---

## 2. Qonşu Dövlətə keçəndə giriş koordinatı

Bu hissə həll olunub və artıq açıq gameplay məsələsi deyil.

Server qaydası:

- bağlı və ya mövcud olmayan qonşuya keçid yoxdur;
- açıq qonşuya keçid server-authoritative topologiya/lifecycle yoxlamasından keçir;
- client `neighborStateId` və giriş koordinatını özü yarada bilməz;
- Şimala çıxış → qonşunun Cənub kənarından `y = 1176`;
- Cənuba çıxış → qonşunun Şimal kənarından `y = 24`;
- Şərqə çıxış → qonşunun Qərb kənarından `x = 24`;
- Qərbə çıxış → qonşunun Şərq kənarından `x = 1176`;
- digər ox üzrə çıxış koordinatı qorunur;
- `entryCoordinate` yalnız keçidə icazə varsa server tərəfindən qaytarılır;
- sərhəd keçidi Ev Dövlət `worldPlacement` sahələrini dəyişdirmir.

---

## 3. Stabil ittifaq identifikatoru — uzaq zoom filtri üçün blocker

Təsdiqlənən gameplay qaydası:

Daha uzaq local-State zoom səviyyəsində öz baza və eyni ittifaqdakı bazalar görünə bilər; resurslar və adi düşmənlər gizlənə bilər.

Hazır production baza kataloqunda `allianceName` mövcuddur, lakin stabil server-authoritative `allianceId` mənbəyi hələ yoxdur.

### Qərar

WorldV2 eyni ittifaq filtrini ada görə qurmayacaq. İttifaq adı texniki ID kimi istifadə edilmir. Stabil `allianceId` mənbəyi gələnə qədər bu müqayisə fail-closed qalır.

---

## 4. Müharibə hədəfi markerləri

Əlfəcinlərin authoritative saxlanması artıq həll olunub. Açıq qalan hissə müharibə hədəfi sistemidir.

Hələ müəyyən edilməyib:

- war-target üçün stabil authoritative identifikator və storage mənbəyi;
- marker priority;
- eyni obyekt həm alliance, həm war-target, həm də bookmark olduqda vizual prioritet.

War-target qaydası təsdiqlənmədən server filtri və ya saxta identifikator yaradılmamalıdır.

---

## 5. Resurs və düşmənlərin WorldV2 placement qaydası

Legacy xəritədə olan `1024×1024` radius və spawn sayları yeni `1200×1200` xəritəyə avtomatik scale edilmir.

Hələ müəyyən edilməlidir:

- terrain/biom gameplay zonalarının dəqiq sərhədləri;
- hər zonada resurs sıxlığı və sayı;
- düşmən sayı və səviyyə bölgüsü;
- spawn məsafələri;
- Prezident mərkəzi ətrafında resurs/düşmən qaydası;
- bazalardan minimum məsafə.

Mövcud PostgreSQL respawn/runtime mexanizmi saxlanıla bilər, lakin V2 placement qaydası ayrıca qərar tələb edir.

---

## 6. State Overview vizual forması

Server üçün təsdiqlənən qayda:

- Overview eyni `0..1200` koordinat domenindən istifadə edir;
- client klik koordinatını local-State koordinatına çevirir;
- 3D xəritəyə həmin koordinatda qayıdır.

Client vizualı üçün hələ müəyyən edilməyib:

- konkret State konturu;
- coğrafi xəritə teksturası;
- biom konturlarının final forması;
- overview-da hansı strateji markerlərin qalacağı.

Bunlar server coordinate contract-ını dəyişməməlidir.

---

## 7. Qlobal xəritə Prezident/ad/bayraq metadata mənbəyi

Qlobal node layout artıq həll olunub və server-authoritative V1-dən gəlir. Açıq qalan məsələ Dövlət metadata-sının real production mənbəyidir.

Hələ müəyyən edilməyib:

- real Prezident capture datasının hansı stabil storage modelindən gələcəyi;
- Dövlət display adının authoritative mənbəyi;
- `flagId` üçün stabil qayda/mənbə.

Mənbə hazır deyilsə `displayName`, Prezident və bayraq sahələri uydurulmur və `null` qala bilər.

---

## 8. CI və test prinsipi

WorldV2 test runner:

```bash
npm run xerite:worldv2-test
```

GitHub Actions workflow-u bu runner-i PR-lərdə işlətmək üçün mövcuddur. Production `main`-ə WorldV2 dəyişiklikləri yalnız uyğun CI yoxlamaları uğurla tamamlandıqdan sonra merge edilməlidir.

---

## Unity inteqrasiyası üçün dəyişməyən server prinsipi

Unity vizualı server coordinate contract-ına uyğunlaşdırılır. Server shared-world vəziyyətinin authoritative mənbəyi olaraq qalır. Client bağlı Dövlət, saxta qlobal node, saxta ittifaq ID-si və ya placement balansı icad etməməlidir. Sərhəd giriş koordinatı server tərəfindən hesablanır; client onu yalnız təqdimat/naviqasiya üçün istifadə edir.
