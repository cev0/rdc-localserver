# V5 server qeydi

`dovlet_xerite_worldv2_resurs_sahe.js` yeni moduludur. Digər üç fayl mövcud faylları əvəz edir. `server.js` dəyişmir: yaxın sahə sorğuları mövcud və autentifikasiyalı WorldV2 obyekt handlerindən keçir.

| Parametr | V5 |
|---|---|
| Dövlət üzrə yaxın sahə rejiminin hədəf sayı | 80 000 |
| Yeni resursların minimum mərkəz məsafəsi | 2 koordinat |
| Yeni resursun bazadan minimum məsafəsi | 5 koordinat |
| Teleportda resursdan minimum məsafə | 3 koordinat |
| Bazalararası teleport məsafəsi | 8 koordinat |
| Bir sorğunun maksimum sahəsi | 128×128 koordinat fərqi, sərhədlər daxil |
| Bir cavabda maksimum resurs | 4 096 |
| Serverdə saxlanan yaxın sahə keşləri | ən çox 4 Dövlət |
| Klientin sakit kamerada yeniləmə aralığı | 3 saniyə |

Başlanğıc sıxlıq V4 ölçüsünə uyğun sınaq dəyəridir; referans oyunun daxili resurs sayı videodan məlum deyil. Öz serverində bu dəyəri dəyişmək üçün mühitə `WORLDV2_RESOURCE_DENSE_COUNT=80000` verə bilərsən. İcazəli konfiqurasiya 600..100000-dir; düzgün dəyər verilməzsə 80000 istifadə olunur. Yeni rejimdə köhnə Inspector `Gosterilecek Resurs Sayi` sahəsi bütöv xəritəni telefona yüklətmir.

Sıxlığı sonradan azaltmaq canlı node-ları silmir. Mövcud konvoy hədəflərini qorumaq üçün saxlanmış resurslar qalır; konfiqurasiya yeni kataloq üçün hədəfdir. Keçid mövcud audit runtime-ına əlavə node-lar yazır. Sadəcə kodu V4-ə qaytarmaq əlavə edilmiş node-ları bazadan silmir.

Sahə cache-i son audit sətrinin ID-si ilə yoxlanılır. Toplama və rezerv əməliyyatları auditə yazıldıqda köhnə görünüş yenilənir. Respawn vaxtı audit ID-si dəyişməsə də cache yenidən hazırlanır. Cache-in revision-u eyni transaction-da oxunan/yazılan ID-dən alınır.

İlk kataloq qurularkən mövcud canlı node-lar tam indekslənir. Kiçik legacy sorğu yuxarı indeksdəki node-u unutmur; təbii respawn da yuxarı indeksdəki canlı resursun üstünə yerləşmir. Köhnə tam obyekt sorğularının cavab sayı uyğunluq üçün əvvəlki kimi qalır; teleport yoxlaması ayrıca bütün node-ları tələb edir.

Mövcud DB arxitekturası bütün runtime-ı audit JSON-u kimi saxlayır. 80 000 node serverin yaddaş və DB yazı həcmini artırır; bir real resurs dəyişikliyi cache-in yenidən qurulmasına səbəb olur. Telefon tərəfdə sahə paketləri və obyekt limiti var, amma bu dəyişiklik per-node SQL saxlanmasına keçid deyil. Çoxlu eyni vaxtda oyunçu üçün yük ölçülməsi ayrıca lazımdır.


Viewport regression: `node dovlet_xerite_worldv2_resurs_sahe_testi.js`; included in `npm run xerite:worldv2-test`.
