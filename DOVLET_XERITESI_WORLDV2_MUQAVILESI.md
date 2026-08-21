# Dövlət Xəritəsi WorldV2 — Server/Unity Müqaviləsi

Bu sənəd `WorldV2` Dövlət xəritəsinin server və Unity arasında əsas texniki müqaviləsidir.

> Status: hazırlıq mərhələsi. Bu sənəd mövcud `1024x1024` production xəritə handler-lərini dəyişmir. Yeni sistem ayrıca hazırlanır və Unity tərəfi hazır olduqdan sonra mərhələli qoşulacaq.

## 1. Əsas koordinat sahəsi

Yeni Dövlət xəritəsinin gameplay koordinat sahəsi:

- minimum X: `0`
- maksimum X: `1200`
- minimum Y: `0`
- maksimum Y: `1200`
- mərkəz: `600:600`

Künclər:

- yuxarı: `0:0`
- sağ: `1200:0`
- sol: `0:1200`
- aşağı: `1200:1200`

Server protokolunda Dövlət xəritəsi koordinatı `(x, y)` kimi saxlanılır. Unity-də bu koordinat 3D world-space üzərinə çevrilərkən server `y` koordinatı Unity `z` oxuna xəritələnir.

### Vacib qeyd — koordinat və hüceyrə indeksi eyni anlayış deyil

İstifadəçi tərəfindən xəritənin kənar koordinatları açıq şəkildə `1200` müəyyən edildiyi üçün WorldV2 koordinat domeni `[0, 1200]` daxil olmaqla qəbul edilir. Gələcəkdə xəritə ayrıca diskret hüceyrələrə bölünərsə, hüceyrə indekslərinin sayı və indeks aralığı ayrıca müəyyən ediləcək. Bu müqavilə həmin qərarı qabaqcadan məcbur etmir.

## 2. Prezident mərkəzi

Prezident binasının authoritative mərkəz koordinatı:

```text
600:600
```

Prezident binasının dörd tərəfində 4 müdafiə/top binası olmalıdır:

- Şimal
- Şərq
- Cənub
- Qərb

Bu müdafiə binalarının dəqiq koordinat offset-ləri hələ müəyyən edilməyib. Server və Unity kodunda offset rəqəmləri özbaşına yazılmamalıdır.

Prezident mərkəzinin açılma qaydası mövcud oyun qaydasına uyğun olaraq Dövlət başladıqdan `30 gün` sonra server tərəfindən authoritative hesablanır.

## 3. Oyunçu Dövlət xəritəsinə daxil olduqda

Unity Dövlət xəritəsini açanda başlanğıc kamera mövqeyi xəritənin mərkəzi olmamalıdır.

Server oyunçunun cari Dövlətini və həmin Dövlətdəki baza koordinatını qaytarmalıdır. Unity kamera fokusunu həmin baza koordinatına qoymalıdır.

Minimum tələb olunan məlumat:

```json
{
  "stateId": 1,
  "playerBase": {
    "x": 0,
    "y": 0
  }
}
```

Yuxarıdakı `0,0` yalnız payload format nümunəsidir, konkret oyunçu mövqeyi deyil.

## 4. Zoom / LOD qaydası

Close, orta və uzaq görünüş üçün server ayrıca üç fərqli Dövlət xəritəsi yaratmır. Eyni authoritative State obyektləri istifadə olunur. Unity zoom səviyyəsinə görə render və marker filtrini dəyişir.

### 4.1 Ən yaxın 3D görünüş

Göstərilə bilər:

- bazalar
- resurs obyektləri
- düşmən/zombi obyektləri
- NPC kampları
- Prezident mərkəzi və müdafiəsi
- konvoylar və digər gameplay obyektləri

### 4.2 Bir qədər uzaq görünüş

Eyni obyektlər qalır, lakin Unity daha sadə LOD/model/marker təqdimatına keçir.

### 4.3 Daha uzaq strateji marker görünüşü

Unity bu səviyyədə xırda obyektləri gizlədir:

- resurslar gizlənir
- adi düşmənlər gizlənir
- xırda NPC obyektləri gizlənir

Qalacaq əsas məlumatlar:

- oyunçunun öz bazası
- eyni ittifaq üzvlərinin bazaları
- uyğun yer imləri
- uyğun müharibə hədəfləri

Server ittifaq və müharibə kimi authoritative əlaqələri təmin edir; hansı prefab/marker-in necə göstərilməsi Unity məsuliyyətidir.

## 5. Dövlət Overview görünüşü

Müəyyən zoom həddindən sonra Unity qısa bulud/duman keçidi ilə State Overview təqdimatına keçir.

Overview ayrıca gameplay koordinat sistemi yaratmır. Yenə eyni `0..1200` Dövlət koordinat domenindən istifadə edir.

Unity overview xəritəsində klik edilmiş nöqtəni State koordinatına çevirir. 3D xəritəyə qayıdanda:

1. seçilmiş koordinata fokuslanır;
2. overview-a keçməzdən əvvəlki son 3D zoom məsafəsini bərpa edir.

Server obyekt mövqelərinin authoritative mənbəyi olaraq qalır. Kamera zoom-u və bulud keçidi client vizual vəziyyətidir.

## 6. Dövlət sərhədi və qonşu Dövlətlər

Dövlət xəritəsinin hər sərhəd istiqaməti üçün server qonşu Dövlət barədə authoritative məlumat verə bilməlidir.

İstiqamətlər:

- `simal`
- `serq`
- `cenub`
- `qerb`

Qonşu üçün minimum məntiqi statuslar:

- qonşu mövcuddur/mövcud deyil;
- Dövlət açılıb/açılmayıb;
- keçidə hazırda icazə var/yoxdur.

Konkret qonşu Dövlət ID-ləri bu sənəddə təyin edilmir.

### Bağlı qonşu

Unity sərhəddə dayanmalıdır, qara world-space arakəsməni göstərməlidir və istifadəçiyə `Sərhədə çatdınız!` tipli xəbərdarlıq verməlidir. Kamera xəritədən kənara sürüşməməlidir.

### Açıq qonşu

Oyunçu sərhədi keçmək istədikdə Unity serverdən/son authoritative State məlumatından keçid icazəsini yoxlayır. İcazə təsdiqləndikdən sonra qonşu Dövlət xəritəsi yüklənir və oyunçu uyğun qarşı tərəf sərhədindən həmin Dövlətə keçir.

Client özbaşına bağlı Dövləti açıq saya bilməz.

## 7. Qlobal Dövlət xəritəsi

Qlobal xəritə pinch/zoom ardıcıllığının davamı deyil.

Yalnız qlobus düyməsi ilə ayrıca rejim kimi açılır.

Server Qlobal xəritə üçün açıq Dövlətlər barədə yığcam məlumat verməlidir. Məsələn:

- `stateId`
- açıq/aktiv status
- Prezident məlumatı
- bayraq/status üçün lazım olan authoritative identifikatorlar
- qlobal xəritədə yerləşdirmə üçün ayrıca qlobal node/slot məlumatı (dəqiq format sonradan müəyyən ediləcək)

Bağlı Dövlətlərin göstərilib-göstərilməməsi hələ final qərar deyil.

## 8. Server authoritative olan hissələr

Server aşağıdakı məlumatların həqiqət mənbəyidir:

- Dövlət ID-si və statusu
- Dövlətin açıq/bağlı olması
- qonşu Dövlət əlaqələri və keçid icazəsi
- oyunçu bazalarının koordinatları
- resurs koordinatları və səviyyələri
- düşmən koordinatları və səviyyələri
- kamp, konvoy və digər shared-world obyektlərinin koordinatları
- Prezident mərkəzinin vaxt/status/capture məlumatı
- ittifaq üzvlüyü və müharibə əlaqələri

## 9. Unity məsuliyyətində olan hissələr

Unity aşağıdakıları vizual/client tərəfdə idarə edir:

- izometrik kamera
- pan və pinch zoom
- zoom-a görə LOD
- markerlərin göstərilməsi/gizlədilməsi
- bulud/duman keçidi
- qara sərhəd arakəsməsinin render-i
- overview xəritəsinin vizual forması
- server `(x,y)` koordinatının Unity `(x,z)` world-space mövqeyinə çevrilməsi
- UI və xəbərdarlıq mesajları

## 10. Legacy `1024x1024` sistemindən keçid

Mövcud production serverdə ən azı aşağıdakı legacy sabitlər mövcuddur:

```text
width = 1024
height = 1024
centerX = 512
centerY = 512
maksimum indeks clamp = 1023
```

Bunlar birbaşa dəyişdirilməyəcək. WorldV2 əvvəlcə ayrıca config və validatorlarla hazırlanacaq. Unity WorldV2 hazır olduqdan sonra handler-lər mərhələli olaraq yeni müqaviləyə keçiriləcək.

Əsas məqsəd: köhnə işləyən xəritə sistemini sındırmadan yeni State sistemi üçün təhlükəsiz migrasiya yolu saxlamaq.
