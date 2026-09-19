"use strict";

/*
 * Last Shelter Survival v1.250.102 resource contract.
 *
 * Canonical resource ids are taken from the verified new-account server
 * response preserved in last_shelter_baslangic_resurslari.js.  RDC legacy
 * names remain explicit aliases only; they are not new Last Shelter values.
 */

const { LAST_SHELTER_BASLANGIC_RESURSLARI } = require("./last_shelter_baslangic_resurslari");

const LAST_SHELTER_RESURS_IDLERI = Object.freeze(
  Object.keys(LAST_SHELTER_BASLANGIC_RESURSLARI)
);

const RDC_LEGACY_RESURS_ALIASLARI = Object.freeze({
  chips: "chip"
});

const RDC_LEGACY_ONLY_RESURSLAR = Object.freeze([
  "fuel"
]);

function metnAl(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function canonicalResursIdAl(resourceId) {
  const id = metnAl(resourceId);
  if (!id) return null;
  const canonical = RDC_LEGACY_RESURS_ALIASLARI[id] || id;
  return LAST_SHELTER_RESURS_IDLERI.includes(canonical) ? canonical : null;
}

function lastShelterResursudur(resourceId) {
  return canonicalResursIdAl(resourceId) !== null;
}

function legacyOnlyResursdur(resourceId) {
  return RDC_LEGACY_ONLY_RESURSLAR.includes(metnAl(resourceId));
}

function canonicalResursObyektiHazirla(rawResources) {
  const result = {};
  for (const id of LAST_SHELTER_RESURS_IDLERI) result[id] = 0;

  if (!rawResources || typeof rawResources !== "object") return result;

  for (const [rawId, rawAmount] of Object.entries(rawResources)) {
    const id = canonicalResursIdAl(rawId);
    if (!id) continue;
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount)) continue;
    result[id] += amount;
  }

  return result;
}

function clientUcunResursContractiniAl() {
  return {
    canonicalIds: [...LAST_SHELTER_RESURS_IDLERI],
    legacyAliases: { ...RDC_LEGACY_RESURS_ALIASLARI },
    legacyOnlyIds: [...RDC_LEGACY_ONLY_RESURSLAR]
  };
}

module.exports = {
  LAST_SHELTER_RESURS_IDLERI,
  RDC_LEGACY_RESURS_ALIASLARI,
  RDC_LEGACY_ONLY_RESURSLAR,
  canonicalResursIdAl,
  lastShelterResursudur,
  legacyOnlyResursdur,
  canonicalResursObyektiHazirla,
  clientUcunResursContractiniAl
};
