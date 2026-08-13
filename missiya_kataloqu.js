"use strict";

// ============================================================
// RDC ƏSAS MİSSİYA KATALOQU
// ------------------------------------------------------------
// Bu fayl yalnız missiya təriflərini saxlayır.
// Progress və mükafat server tərəfindən hesablanır.
// Client missiya şərtini və mükafat miqdarını müəyyən etmir.
// ============================================================

const MISSIYA_KATALOQU = [
  {
    missionId: "M001",
    order: 1,
    chapterId: "F01",
    title: "Komandanlıq Mərkəzi",
    description: "Əməliyyat bazasını yoxla və Komandanlıq Mərkəzi ilə tanış ol.",
    type: "hq_exists",
    requiredCount: 1,
    rewards: [
      { resourceId: "food", amount: 200 }
    ]
  },
  {
    missionId: "M002",
    order: 2,
    chapterId: "F01",
    title: "İlk Təchizat",
    description: "Baza davamlı işləməlidir. İlk resurs binasını qur.",
    type: "completed_building_group_count",
    targetIds: [
      "farm",
      "lumber_mill",
      "water_treatment_plant",
      "oil_well"
    ],
    requiredCount: 1,
    rewards: [
      { resourceId: "wood", amount: 300 }
    ]
  },
  {
    missionId: "M003",
    order: 3,
    chapterId: "F01",
    title: "İnfrastruktur",
    description: "Əməliyyat üçün əlavə təminat lazımdır. İkinci əsas binanı tamamla.",
    type: "completed_nonstarter_building_count",
    requiredCount: 2,
    rewards: [
      { resourceId: "money", amount: 200 }
    ]
  },
  {
    missionId: "M004",
    order: 4,
    chapterId: "F01",
    title: "Baza Nizamı",
    description: "Binaları düzgün yerləşdir və bazanı əməliyyata hazırla.",
    type: "server_event_count",
    eventId: "bina_yeri_deyisdirildi",
    requiredCount: 1,
    rewards: [
      { resourceId: "wood", amount: 200 }
    ]
  },
  {
    missionId: "M005",
    order: 5,
    chapterId: "F01",
    title: "Komandanlığı Gücləndir",
    description: "Yeni əməliyyatlar üçün qərargah genişləndirilməlidir.",
    type: "building_level_at_least",
    targetId: "hq",
    requiredLevel: 2,
    requiredCount: 1,
    rewards: [
      { resourceId: "wood", amount: 500 },
      { resourceId: "water", amount: 200 },
      { resourceId: "money", amount: 300 }
    ]
  },
  {
    missionId: "M006",
    order: 6,
    chapterId: "F01",
    title: "Sərhədi Genişləndir",
    description: "Bazanın ətrafında yeni fəaliyyət sahəsi aç.",
    type: "base_expansion_count",
    requiredCount: 1,
    rewards: [
      { resourceId: "wood", amount: 300 },
      { resourceId: "food", amount: 300 }
    ]
  },
  {
    missionId: "M007",
    order: 7,
    chapterId: "F01",
    title: "Müdafiə Xətti",
    description: "Bazanın müdafiəsiz qalmasına imkan vermə.",
    type: "completed_building_group_count",
    targetIds: [
      "bunker",
      "tower",
      "garrison"
    ],
    requiredCount: 1,
    rewards: [
      { resourceId: "iron", amount: 150 }
    ]
  },
  {
    missionId: "M008",
    order: 8,
    chapterId: "F01",
    title: "Giriş Nöqtəsi",
    description: "Əsas giriş xəttini hazır vəziyyətə gətir.",
    type: "server_event_count",
    eventId: "baza_girisi_aktivlesdi",
    requiredCount: 1,
    rewards: [
      { resourceId: "money", amount: 300 }
    ]
  },
  {
    missionId: "M009",
    order: 9,
    chapterId: "F02",
    title: "Hərbi Hazırlıq",
    description: "İlk döyüş bölmələrinin hazırlanması üçün hərbi obyekt qur.",
    type: "completed_building_group_count",
    targetIds: [
      "fighter_camp",
      "shooter_camp",
      "vehicle_factory",
      "barrack_1",
      "barrack_2",
      "barrack_3",
      "military"
    ],
    requiredCount: 1,
    rewards: [
      { resourceId: "wood", amount: 300 },
      { resourceId: "money", amount: 200 }
    ]
  },
  {
    missionId: "M010",
    order: 10,
    chapterId: "F02",
    title: "İlk Bölmə",
    description: "Əməliyyat üçün ilk hərbi bölməni hazırla.",
    type: "total_troop_count",
    requiredCount: 1,
    rewards: [
      { resourceId: "food", amount: 250 }
    ]
  },
  {
    missionId: "M011",
    order: 11,
    chapterId: "F02",
    title: "Komandir Lazımdır",
    description: "Bölmələrə rəhbərlik edəcək ilk qəhrəmanı əldə et.",
    type: "hero_count",
    requiredCount: 1,
    rewards: [
      { resourceId: "chips", amount: 50 }
    ]
  },
  {
    missionId: "M012",
    order: 12,
    chapterId: "F02",
    title: "Təcrübə",
    description: "Qəhrəmanın döyüş qabiliyyətini artır və onu səviyyə 2-yə çatdır.",
    type: "hero_max_level",
    requiredLevel: 2,
    requiredCount: 1,
    rewards: [
      { resourceId: "chips", amount: 50 }
    ]
  },
  {
    missionId: "M013",
    order: 13,
    chapterId: "F02",
    title: "Xüsusi Bacarıq",
    description: "Qəhrəmanın ilk bacarığını inkişaf etdir.",
    type: "hero_skill_level_at_least",
    slotIndex: 1,
    requiredSkillLevel: 2,
    requiredCount: 1,
    rewards: [
      { resourceId: "chips", amount: 75 }
    ]
  },
  {
    missionId: "M014",
    order: 14,
    chapterId: "F02",
    title: "Kiçik Dəstə",
    description: "Əməliyyata çıxmaq üçün ümumi 3 hərbi vahid hazırla.",
    type: "total_troop_count",
    requiredCount: 3,
    rewards: [
      { resourceId: "money", amount: 300 }
    ]
  },
  {
    missionId: "M015",
    order: 15,
    chapterId: "F02",
    title: "Kəşfiyyat",
    description: "Baza xaricində ilk kəşfiyyat əməliyyatını tamamla.",
    type: "server_event_count",
    eventId: "kesfiyyat_tamamlandi",
    requiredCount: 1,
    rewards: [
      { resourceId: "fuel", amount: 100 }
    ]
  },
  {
    missionId: "M016",
    order: 16,
    chapterId: "F03",
    title: "Düşmən Mövqeyi",
    description: "Kəşfiyyat nəticəsində ilk düşmən mövqeyini aşkar et.",
    type: "server_event_count",
    eventId: "dusmen_movqeyi_askarlandi",
    requiredCount: 1,
    rewards: [
      { resourceId: "food", amount: 300 }
    ]
  },
  {
    missionId: "M017",
    order: 17,
    chapterId: "F03",
    title: "İlk Əməliyyat",
    description: "Hazırladığın qüvvələri ilk döyüş əməliyyatına göndər.",
    type: "server_event_count",
    eventId: "doyus_basladildi",
    requiredCount: 1,
    rewards: []
  },
  {
    missionId: "M018",
    order: 18,
    chapterId: "F03",
    title: "İlk Qələbə",
    description: "İlk PvE döyüşünü qazan və mövqeni nəzarət altına al.",
    type: "server_event_count",
    eventId: "doyus_qazanildi",
    requiredCount: 1,
    rewards: [
      { resourceId: "money", amount: 500 },
      { resourceId: "iron", amount: 300 }
    ]
  },
  {
    missionId: "M019",
    order: 19,
    chapterId: "F03",
    title: "Əldə Edilən Təchizat",
    description: "Əməliyyatdan əldə olunan təchizatı bazanın inkişafına yönəlt.",
    type: "server_event_count",
    eventId: "doyus_mukafati_verildi",
    requiredCount: 1,
    rewards: [
      { resourceId: "food", amount: 500 },
      { resourceId: "wood", amount: 500 }
    ]
  },
  {
    missionId: "M020",
    order: 20,
    chapterId: "F03",
    title: "Növbəti Mərhələ",
    description: "Ərazi üzərində nəzarəti genişləndir və ilk xəritə zonasını aç.",
    type: "server_event_count",
    eventId: "xerite_zonasi_acildi",
    requiredCount: 1,
    rewards: [
      { resourceId: "chips", amount: 100 }
    ]
  }
];

function missiyaIdNormallasdir(deyer) {
  return String(deyer || "").trim().toLowerCase();
}

const MISSIYA_XERITESI = new Map(
  MISSIYA_KATALOQU.map(missiya => [
    missiyaIdNormallasdir(missiya.missionId),
    missiya
  ])
);

function butunMissiyalariAl() {
  return MISSIYA_KATALOQU.map(missiya => ({
    ...missiya,
    targetIds: Array.isArray(missiya.targetIds)
      ? [...missiya.targetIds]
      : undefined,
    rewards: Array.isArray(missiya.rewards)
      ? missiya.rewards.map(mukafat => ({ ...mukafat }))
      : []
  }));
}

function missiyaniTap(missiyaId) {
  return MISSIYA_XERITESI.get(
    missiyaIdNormallasdir(missiyaId)
  ) || null;
}

function evvelkiMissiyaniTap(missiyaId) {
  const missiya = missiyaniTap(missiyaId);
  if (!missiya || missiya.order <= 1) return null;

  return MISSIYA_KATALOQU.find(
    namized => namized.order === missiya.order - 1
  ) || null;
}

function novbetiMissiyaniTap(missiyaId) {
  const missiya = missiyaniTap(missiyaId);
  if (!missiya) return null;

  return MISSIYA_KATALOQU.find(
    namized => namized.order === missiya.order + 1
  ) || null;
}

module.exports = {
  MISSIYA_KATALOQU,
  missiyaIdNormallasdir,
  butunMissiyalariAl,
  missiyaniTap,
  evvelkiMissiyaniTap,
  novbetiMissiyaniTap
};
