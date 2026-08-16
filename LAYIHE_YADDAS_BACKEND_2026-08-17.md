# RDC layihəsi — Backend yaddaş qeydləri

Bu fayl yeni söhbətdə backend işini sıfırdan başlamamaq üçün yaradılıb. Son yenilənmə: 2026-08-17.

## Ümumi prinsip

- Server-authoritative gameplay əsas qaydadır. Client nəticə, reward, level, timer, tutum və döyüş qalibiyyətini özü diktə etmir.
- Oyunçuya görünən adlar Azərbaycan dilində olmalıdır. Texniki ID-lər server daxilində ingiliscə qala bilər.
- Təsdiqlənməmiş balans rəqəmləri uydurulmur.

## Konvoy

- 3 sıra formasiya mövcuddur: sira_1, sira_2, sira_3.
- Qoşun rezervi başqa konvoyda təkrar istifadə edilə bilməz.
- Konvoy xəritə tapşırığında/döyüşdə olduqda qəhrəman və qoşun tərkibi dəyişdirilmir.
- Müdafiədə iştirak etməsi bina/konvoy ayarı ilə aktiv/deaktiv edilə bilir; deaktiv konvoy müdafiəyə qoşulmur və həmin döyüşdən itki almır.
- Konvoy tutumu serverdə hesablanır. Skill 6, Skill 1 liderlik tutumunu faizlə gücləndirir.
- Konvoy tutum texnologiyası progression: 5000 → 7500 → 10000 → 15000 → 20000.

## Dövlət xəritəsi

- Shared resource node runtime, gathering timer, occupation, respawn və pending reward sistemi var.
- Shared enemy scout/small enemy runtime var.
- Enemy battle server-authoritative işləyir.
- PvP baza döyüşü, settlement, report, city durability, zeroing, resource plunder, storage protection və shield sistemləri mərhələli şəkildə qurulub.

## Hero əsas qaydaları

- Hero maksimum Lv50.
- Lv1→50 ümumi EXP progression: 94,172,800.
- Skill maksimum Lv10.
- Rarity: Yaşıl, Göy/Mavi, Bənövşəyi, Narıncı.
- Release class ayrıca saxlanır: NORMAL, S, SP.
- S rarity deyil. SP rarity deyil.
- S: bilet/xüsusi kampaniya. SP: yalnız pullu acquisition.

### Skill slot sayı — oyun ekranlarından təsdiqlənib

- Yaşıl: 3 skill
- Mavi: 4 skill
- Bənövşəyi: 6 skill
- Narıncı döyüş: 8 skill
- Narıncı İnkişaf qəhrəmanları üçün 8 skill ola bildiyi araşdırmada təsdiqlənib; konkret qəhrəman data-sı ayrıca kataloqda saxlanmalıdır.

### Skill Lv1→10 Hikmət/Wisdom xərcləri

- Yaşıl: 5,10,15,20,30,40,60,90,125 = 395
- Mavi: 10,15,20,30,40,60,85,120,175 = 555
- Bənövşəyi: 15,20,30,40,60,90,125,180,270 = 830
- Narıncı: 20,30,45,60,90,130,200,270,400 = 1245

### Narıncı NORMAL döyüş unlock

- Skill 2: Lv6 + 200K + 50 Wisdom
- Skill 3: Lv12 + 300K + 100 Wisdom + 3 Nadir
- Skill 4: Lv20 + 400K + 10 Mükəmməl + 5 Nadir
- Skill 5: Lv25 + 600K + 1 Əfsanəvi + 7 Nadir
- Skill 6: Lv35 + 1M + 1 duplicate + 10 Nadir
- Skill 7: Lv45 + 2M + 2 Mükəmməl
- Skill 8: Lv50 + 4M + 3 Əfsanəvi

### S/SP seasonal döyüş fərqi

- Skill 7: Lv45 + 2M + 1 duplicate + 1 Əfsanəvi
- Skill 8: Lv50 + 4M + 1 duplicate + 2 Əfsanəvi

### Aşağı rarity unlock

- Yaşıl/Mavi/Bənövşəyi üçün tam pul/material unlock cədvəlləri hələ tam etibarlı şəkildə bağlanmayıb.
- Slot sayı və skill-upgrade Wisdom xərcləri təsdiqlidir.
- Server təsdiqlənməmiş unlock rəqəmi uydurmamalıdır.

## Hero adlandırma qaydası

- Kartda konkret ad-soyad yox, ləqəb görünəcək.
- "Haqqında" bölməsində ləqəbin aid olduğu real qəhrəmanın ad-soyadı və yoxlanılmış tarixçəsi verilə bilər.
- Uydurma ləqəb/tarixçə yazılmamalıdır.
- Təsdiqlənmiş ləqəb hovuzu: Qartal, Qurd, Yaquar, Topçu, Qorxmaz, Əjdaha, Snayper, Qara, Desant, Murov Qartalı, Kobra, Qara Qartal, Canavar, Sərçə, Maestro, Mixaylo.
- Əvvəlki mappinglərdən əsas təsdiqlənənlər: Iron Guard→Qartal, Militant→Qurd, Razor→Yaquar, Arsenal→Topçu, Reaper→Qorxmaz, Destroya→Əjdaha, Shoota Man→Snayper, Forsaken One→Qara, War Hound→Desant, Dawn Guardian→Murov Qartalı. Atıcı→Sərrast, Ruh Daşıyıcı→Kölgə, Drill Master/Antrenör→Komando əvvəl təsdiqlənmişdi, amma real-ləqəb qaydasına görə gələcəkdə yenidən yoxlanmalıdır.

## İnkişaf qəhrəmanları

İnkişaf qəhrəmanı uyğun binaya təyin olunur və yalnız həmin binada bonus verir.

Dəstəklənəcək sahələr:
- Texnologiya
- Tikinti
- Resurs istehsalı
- Qoşun təlimi
- Xəstəxana
- Ticarət

Dəstəklənəcək effekt tipləri:
- Tədqiqat sürəti
- Tədqiqat xərclərinin azalması
- Tikinti sürəti
- Tikinti xərclərinin azalması
- İstehsal artımı
- Təlim sürəti
- Təlim tutumu
- Təlim xərclərinin azalması
- Müalicə sürəti
- Müalicə xərclərinin azalması
- Xəstəxana tutumu
- Ticarət yük tutumu
- Ticarət qiyməti

Təsdiqlənməmiş faizlər serverə aktiv edilməməlidir.

## Görülən İnkişaf backend işləri

### PR #102 — development hero engine

- qehreman_inkisaf_sistemi.js əlavə edildi.
- İnkişaf sahələri və effekt növləri Azərbaycan dilində display adı ilə data-driven quruldu.
- qehreman_tapshiriq_sistemi.js version 2-yə keçirildi; generic development assignment state əlavə edildi.
- Eyni qəhrəmanın konvoy/texnologiya/resurs/inkişaf tapşırıqlarında təkrar istifadəsi bloklanır.
- Yalnız qəhrəman kataloqunda təsdiqlənmiş allowedBuildingIds olan qəhrəman uyğun tamamlanmış binaya təyin edilə bilər.
- development_hero_assign_request / development_hero_remove_request əlavə edildi.
- Rarity üzrə skill slot limitləri serverdə tətbiq edildi: 3/4/6/8.
- Təsdiqlənməmiş aşağı-rarity unlock qiymətləri yenə bloklanır.
- CI uğurla keçdi və PR main-ə merge edildi.

### PR #103 — Texnologiya İnkişaf körpüsü

- texnologiya_inkisaf_korpu.js əlavə edildi.
- Tamamlanmış və yol çıxışı olan Institute-lardan əsas Institute deterministik seçilir: ən yüksək level, bərabərlikdə instanceId sırası.
- Tədqiqat sürəti bonusunu effektiv müddətə çevirmək üçün server funksiyası əlavə edildi: müddət / (1 + faiz/100).
- Hazırda kataloqda təsdiqlənmiş İnkişaf qəhrəmanı effekti olmadığı üçün mövcud gameplay müddəti dəyişmir; uydurma faiz aktiv edilməyib.
- Xüsusi test əlavə edildi və bütün mövcud CI testləri ilə birlikdə uğurla keçdi.
- PR #103 main-ə merge edildi. Merge commit: 6b2f0556f102e6dd521fdec4f958515d6b617bc0.
- Növbəti mərhələ: bu bridge-i research start hesablamasına bağlamaq; sonra eyni pattern ilə tikinti/təlim/müalicə körpüləri qurmaq.

## Növbəti təhlükəsiz backend addımları

1. texnologiya_inkisaf_korpu.js-ni konvoy_texnologiya_handler.js research start müddətinə server-authoritative şəkildə bağlamaq; heç bir hero faizi əlavə etmədən yalnız mövcud modifier datasını tətbiq etmək.
2. Eyni pattern ilə Tikinti, Qoşun təlimi və Xəstəxana hesablamaları üçün İnkişaf modifier körpüləri əlavə etmək.
3. Qəhrəman kataloqunda real İnkişaf qəhrəman ID-ləri və allowedBuildingIds mapping-i yalnız təsdiqlənəndə əlavə etmək.
4. Konkret skill effect faizlərini yalnız təsdiqlənmiş data ilə kataloqa yazmaq.
5. Green/Blue/Purple unlock material cədvəllərini etibarlı mənbə və ya oyun screenshot-u ilə tamamlamaq.
6. Hero medal acquisition/conversion sistemi və Starter Wisdom məsələsini ayrıca bağlamaq.
7. Konvoy üçün vahid mission state: idle → marching → gathering/battle → returning → idle.
