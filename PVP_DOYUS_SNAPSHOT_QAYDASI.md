# PvP döyüş snapshot qaydası

Bu mərhələ real PvP döyüşünü aktiv etmir. Məqsəd gələcək resolver üçün server-authoritative döyüş girişlərini sabitləşdirməkdir.

## Hücumçu

- Hücumçu konvoyunun qoşunu, formasiyası və qəhrəman ID-ləri hücum başlananda snapshot olunur.
- Snapshot kilidləndikdən sonra sonrakı UI və lokal dəyişikliklər həmin hücumun döyüş girişini dəyişmir.
- Qoşun gücü hazırda mövcud PvE qoşun gücü formulası ilə hesablanır.
- Qəhrəman gücü bu mərhələdə döyüş gücünə əlavə edilmir.

## Müdafiəçi

- Müdafiəçi snapshot-u hücum konvoyu kilidlənmiş koordinata çatanda yaradılacaq.
- Aktiv səfərdə olan konvoyların qoşunları baza müdafiəsindən çıxılır.
- Aktiv səfərdə olan konvoyların qəhrəmanları baza müdafiəsindən çıxılır.
- Sadəcə konvoya təyin edilmiş, amma bazadan çıxmamış idle konvoy qoşunları və qəhrəmanları bazada sayılır.

## Yerdəyişmə qaydası

Bu modul mövcud baza yerdəyişmə qaydasını dəyişmir:

- hədəf koordinatı hücum başlananda kilidlənir;
- müdafiəçi teleport edərsə hücum yeni bazanı izləmir;
- köhnə koordinata çatan konvoy döyüşə girmir və `camping_at_abandoned_target` vəziyyətinə keçir.

## Hələ aktiv olmayan hissələr

- real PvP resolver;
- iki oyunçunun state mutation-larının atomik PostgreSQL tranzaksiyası;
- PvP itki balansı;
- PvP loot/mükafat balansı;
- kamp müddəti və kampdan geri dönüş qaydası.

Bu hissələr tamamlanmadan `pvpEnabled` və `canAttack` aktiv edilməməlidir.
