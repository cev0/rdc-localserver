# Last Shelter miqrasiyasının vəziyyəti

Bu branch mövcud RDC serverinə mənbə kataloqlarını və aşağıda göstərilən davranışları
köçürür. Tam orijinal Java serveri ayrıca, faylları dəyişdirilmədən paketlənir.
Kataloqların mövcudluğu bütün oyun mexanikalarının Node.js-ə köçürüldüyü demək deyil.

## RDC serverinə daxil edilmiş hissə

- 364 XML kataloqu, 70 861 ItemSpec sətri; qruplar və təkrarlanan ID-lər saxlanılır.
- 4 596 elm səviyyəsi, 2 959 bina sətri, 1 066 əşya və 48 mağaza sətri.
- `science.research` və `science.upgrade`: server vaxtı, resurs/əşya xərcləri,
  səviyyə şərtləri, növbə və tamamlanma mövcud tranzaksiya sisteminə bağlanıb.
- HQ xərcləri orijinalın cari səviyyə sətrindən götürülür; bina şərtləri tətbiq edilir.
- Eyni mənbə təkrar import olunanda mövcud snapshot dəyişdirilmir.
- Şəxsi server, ödəniş və hesab XML-ləri Git-ə daxil edilmir.

`data/last_shelter/commands.json` orijinal qeydiyyat kodundakı 976 mümkün komanda
adını saxlayır. Şərti qeydiyyatlar da daxildir. Bunlardan yalnız `item.buy`,
`science.research`, `science.upgrade` hazırda eyni adla RDC-də qeydiyyatdadır.
RDC-nin öz gameplay komandaları ayrıca mövcuddur; bu rəqəm onların yoxluğu demək deyil.
Elm üçün qızılla çatışmayan resurs alma, birbaşa tamamlanma, EnergySkill həyat dövrü,
qəhrəman/VIP/təchizat effektləri və hadisə mükafatlarının tam portu qalıb.

## Olduğu kimi köçürüləcək orijinal server

Böyük mənbə arxivinin `0/` ağacı bərpa edilib. Ayrı verilmiş COK2 JAR-ı ilə
bu ağacdakı extension JAR-ının SHA-256 dəyərləri eynidir. Paketə daxildir:

- `52gmsy/SFS2X`: Java serveri, extension, XML-lər, kitabxanalar, zonalar və konfiqurasiya.
- `52gmsy/apache-apollo-1.7.1`: broker və onun arxivdəki məlumatları.
- `52gmsy/down`: JDK 8 paketi və MySQL sxemləri/başlanğıc məlumatları.
- `www/wwwroot/swlm`: orijinal PHP veb hissəsi.

Bu nüsxədəki `sfs2x-service`, `lib/mmo-server.jar` mövcud olduğu üçün
`com.mmobuilder.server.COKBootStrap` işə salır. `sfs2x.sh` başqa main class-a
istinad edir; həmin faylı təsadüfən əsas launcher kimi seçmək olmaz.
Orijinal təlimat Java 8, MySQL 5.6, Redis, Apache Apollo, PHP 5.6 və Nginx tələb edir.
Bu, mənbə mühitinin təsviridir; yeni versiyalarda uyğunluq təsdiqlənməyib.

Paket orijinal konfiqurasiyaları saxlayır və özəl saxlanmalıdır. Git-ə yalnız
köçürmə kodu daxil edilir. SQL-lərin əksəriyyəti sxemdir; bu paket canlı oyunun
cari oyunçu bazasının ayrıca backup-unu əvəz etmir.

Paket hazırlamaq (Python 3.10+):

```sh
python3 scripts/package_last_shelter_native.py /path/to/extracted/0 /private/LastShelter-native-server.tar.gz
```

Seçilmiş serverdə paketi şəxsi, boş qovluğa açın və onun içindən köçürün:

```sh
umask 077
mkdir /private/last-shelter-package
tar -xzf /private/LastShelter-native-server.tar.gz -C /private/last-shelter-package
python3 /private/last-shelter-package/restore_last_shelter_native.py /private/last-shelter-package /
```

Köçürücü əvvəlcə mənbə hash-lərini və hədəfdəki faylları müqayisə edir. Eyni faylı
ötürür; fərqli mövcud fayl varsa heç nə köçürmədən dayanır. Fayl silmir, mövcud
konfiqurasiyanı əvəz etmir, SQL import etmir və xidmət başlatmır. Yarımçıq köçürmə
eyni paketlə davam etdirilə bilər. Mövcud işlək serverə köçürmək üçün onun ünvanı,
giriş üsulu və hədəf qovluğu əvvəlcə məlum olmalıdır.

Yeni, boş MySQL bazaları üçün orijinal sxem sırası:

| Baza | `52gmsy/down/` daxilində mənbə faylları |
| --- | --- |
| `cokdb_global` | `cokdb_global.sql`, `server_info.sql`, `cokdb_global_serverlist.sql` |
| `cokdb2` | `cokdb2.sql` |
| `domain_db` | `domain_db.sql` |
| `cokdb_ingamemail` | `cokdb_ingamemail.sql` |
| `cokdb_record` | `cokdb_record.sql` |
| `cokdb_template` | `cokdb_template.sql` |
| `warfaredb` | `warfaredb.sql` |

Bu sxemlər mövcud oyunçu bazasına təkrar import edilməməlidir. Hədəf məlum olduqdan
sonra DB/Redis/broker ünvanları, giriş məlumatları, `servers.xml`, zone və veb
konfiqurasiyası həmin mühitə uyğunlaşdırılmalıdır. Hazırda canlı köçürmə və
xidmətlərin başladılması edilməyib.

## Unity-yə keçid

RDC JSON WebSocket protokolu ilə orijinal Java serverinin protokolu eyni deyil.
Mövcud Unity bağlantısını tam native serverə yönləndirmək üçün onun giriş və
mesaj formatı uyğunlaşdırılmalıdır. Tam orijinal server seçilirsə, davranışlar
JAR-da saxlanılır; Node.js portu seçilirsə, qalan handler-lər ayrıca köçürülməlidir.
Bu mərhələdə Unity inteqrasiyası və canlı cutover tamamlanmış sayılmır.

İstifadəçinin son göstərişinə uyğun əlavə test işə salınmır.
