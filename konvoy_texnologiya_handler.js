"use strict";

const {
  KONVOY_TEXNOLOGIYA_ACARLARI
} = require("./konvoy_qaydalari");
const {
  oyunStateIniBerpaEt,
  oyuncuStateBerpaOlunub
} = require("./oyun_state_daimilik_korpu");

const LEGACY_KONVOY_TEXNOLOGIYALARI =
  Object.freeze([
    Object.freeze({
      techId:
        KONVOY_TEXNOLOGIYA_ACARLARI
          .IKINCI_QEHRAMAN_YERI,
      displayName:
        "Konvoy Qəhrəman Yeri II"
    }),
    Object.freeze({
      techId:
        KONVOY_TEXNOLOGIYA_ACARLARI
          .IKINCI_KONVOY,
      displayName:
        "İkinci Konvoy"
    }),
    Object.freeze({
      techId:
        KONVOY_TEXNOLOGIYA_ACARLARI
          .UCUNCU_QEHRAMAN_YERI,
      displayName:
        "Konvoy Qəhrəman Yeri III"
    })
  ]);

const LEGACY_TECH_IDLERI =
  new Set(
    LEGACY_KONVOY_TEXNOLOGIYALARI
      .map(row => row.techId)
  );

function metnAl(
  deyer,
  maksimum = 128
) {
  return typeof deyer === "string"
    ? deyer
        .trim()
        .slice(
          0,
          maksimum
        )
        .toLowerCase()
    : "";
}

function legacyTechnologyLevelAl(
  state,
  techId
) {
  const levels =
    state &&
    state.technology &&
    state.technology.levels;

  if (
    !levels ||
    typeof levels !== "object" ||
    Array.isArray(levels)
  ) {
    return 0;
  }

  const raw =
    Number(
      levels[
        metnAl(
          techId,
          128
        )
      ]
    );

  return Number.isFinite(raw)
    ? Math.max(
        0,
        Math.trunc(raw)
      )
    : 0;
}

function legacyTexnologiyaMelumatiniHazirla(
  state
) {
  return LEGACY_KONVOY_TEXNOLOGIYALARI
    .map(row => {
      const currentLevel =
        legacyTechnologyLevelAl(
          state,
          row.techId
        );

      return {
        techId:
          row.techId,
        displayName:
          row.displayName,
        currentLevel,
        completed:
          currentLevel > 0,
        legacyReadOnly:
          true,
        canResearch:
          false,
        gameplayAuthority:
          "last_shelter_runtime_pending_native_unlock_mapping",
        message:
          "Synthetic RDC convoy research deaktivdir. Yeni research yalnız təsdiqlənmiş Last Shelter qaydası ilə əlavə olunacaq."
      };
    });
}

async function konvoyTexnologiyaMesajiniEmalEt(
  kontekst
) {
  const type =
    metnAl(
      kontekst &&
      kontekst.type,
      128
    );
  const techId =
    metnAl(
      kontekst &&
      kontekst.msg &&
      kontekst.msg.techId,
      128
    );

  const infoIsteyi =
    type ===
    "convoy_technology_info_request";

  const legacyStartIsteyi =
    type ===
      "technology_research_start" &&
    LEGACY_TECH_IDLERI.has(
      techId
    );

  if (
    !infoIsteyi &&
    !legacyStartIsteyi
  ) {
    return false;
  }

  const playerId =
    metnAl(
      kontekst &&
      kontekst.ws &&
      kontekst.ws._authedPlayerId,
      128
    );

  if (!playerId) {
    kontekst.send(
      kontekst.ws,
      {
        type:
          infoIsteyi
            ? "convoy_technology_info_result"
            : "technology_research_result",
        success: false,
        message:
          "Autentifikasiya tələb olunur.",
        serverTimeUnixMs:
          kontekst.nowMs()
      }
    );

    return true;
  }

  try {
    if (
      !oyuncuStateBerpaOlunub(
        playerId
      )
    ) {
      await oyunStateIniBerpaEt(
        kontekst,
        playerId
      );
    }

    const state =
      kontekst
        .getOrCreatePlayerState(
          playerId
        );

    const technologies =
      legacyTexnologiyaMelumatiniHazirla(
        state
      );

    if (infoIsteyi) {
      kontekst.send(
        kontekst.ws,
        {
          type:
            "convoy_technology_info_result",
          success: true,
          playerId,
          technologies,
          legacyReadOnly: true,
          payloadJson:
            JSON.stringify(
              technologies
            ),
          serverTimeUnixMs:
            kontekst.nowMs()
        }
      );

      return true;
    }

    const info =
      technologies.find(
        row =>
          row.techId ===
          techId
      ) || null;

    kontekst.send(
      kontekst.ws,
      {
        type:
          "technology_research_result",
        success: false,
        playerId,
        techId,
        code:
          "LAST_SHELTER_SCIENCE_REQUIRED",
        legacyDisabled: true,
        info,
        message:
          "Synthetic convoy research deaktivdir; təsdiqlənmiş Last Shelter unlock qaydası tələb olunur.",
        serverTimeUnixMs:
          kontekst.nowMs()
      }
    );
  }
  catch (xeta) {
    console.error(
      "[KONVOY_TECH]",
      xeta
    );

    kontekst.send(
      kontekst.ws,
      {
        type:
          infoIsteyi
            ? "convoy_technology_info_result"
            : "technology_research_result",
        success: false,
        playerId,
        techId,
        message:
          "Konvoy texnologiyası compatibility məlumatı hazırlana bilmədi.",
        serverTimeUnixMs:
          kontekst.nowMs()
      }
    );
  }

  return true;
}

module.exports = {
  LEGACY_KONVOY_TEXNOLOGIYALARI,
  legacyTechnologyLevelAl,
  legacyTexnologiyaMelumatiniHazirla,
  konvoyTexnologiyaMesajiniEmalEt
};
