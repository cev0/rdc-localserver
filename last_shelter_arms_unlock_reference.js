"use strict";

const {
  sourceCatalog
} = require("./last_shelter_source_catalog");

function tokenAl(value) {
  return value == null
    ? ""
    : String(value).trim();
}

function buildingUnlockTokeniniAc(value) {
  const token =
    tokenAl(value);

  if (!/^\d+$/.test(token)) {
    return null;
  }

  const numeric =
    Number(token);

  if (!Number.isSafeInteger(numeric)) {
    return null;
  }

  const buildingTypeId =
    String(
      Math.floor(
        numeric / 1000
      ) * 1000
    );
  const requiredLevel =
    numeric -
    Number(buildingTypeId);

  if (requiredLevel <= 0) {
    return null;
  }

  return Object.freeze({
    token,
    buildingTypeId,
    requiredLevel
  });
}

function scienceUnlockIdAl(value) {
  const token =
    tokenAl(value);

  return /^\d+$/.test(token)
    ? token
    : null;
}

const TROOP_ARMS_UNLOCK =
  Object.freeze(
    Object.fromEntries(
      sourceCatalog
        .rows("arms")
        .filter(
          row =>
            /^107[012]\d{2}$/.test(
              tokenAl(
                row &&
                row.id
              )
            )
        )
        .map(
          row => {
            const id =
              tokenAl(row.id);

            return [
              id,
              Object.freeze({
                lastShelterArmyId:
                  id,
                sourceLevel:
                  Number(row.level) || 0,
                building:
                  buildingUnlockTokeniniAc(
                    row.building
                  ),
                scienceId:
                  scienceUnlockIdAl(
                    row.science
                  ),
                sourceAttributes:
                  Object.freeze({
                    ...row
                  })
              })
            ];
          }
        )
    )
  );

sourceCatalog.release("arms");

function troopArmsUnlockMelumatiniAl(
  armyId
) {
  const id =
    tokenAl(armyId);

  const row =
    TROOP_ARMS_UNLOCK[id];

  if (!row) {
    return null;
  }

  return {
    lastShelterArmyId:
      row.lastShelterArmyId,
    sourceLevel:
      row.sourceLevel,
    building:
      row.building
        ? { ...row.building }
        : null,
    scienceId:
      row.scienceId,
    sourceAttributes:
      { ...row.sourceAttributes }
  };
}

module.exports = {
  TROOP_ARMS_UNLOCK,
  buildingUnlockTokeniniAc,
  scienceUnlockIdAl,
  troopArmsUnlockMelumatiniAl
};
