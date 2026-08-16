"use strict";

const { pvpQorumaStateTeminEt } = require("./pvp_qoruma_sistemi");

const PVP_SHIELD_ITEMS = Object.freeze({
  peace_shield_8h: Object.freeze({ itemId: "peace_shield_8h", durationMs: 8 * 60 * 60 * 1000, displayName: "8 saatlıq Qoruma Qalxanı" }),
  peace_shield_12h: Object.freeze({ itemId: "peace_shield_12h", durationMs: 12 * 60 * 60 * 1000, displayName: "12 saatlıq Qoruma Qalxanı" }),
  peace_shield_3d: Object.freeze({ itemId: "peace_shield_3d", durationMs: 3 * 24 * 60 * 60 * 1000, displayName: "3 günlük Qoruma Qalxanı" })
});

function metnAl(v, max = 128) {
  return typeof v === "string" ? v.trim().slice(0, max).toLowerCase() : "";
}

function tamEded(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

function shieldInventariniTeminEt(state) {
  const p = pvpQorumaStateTeminEt(state);
  if (!p.shieldInventory || typeof p.shieldInventory !== "object" || Array.isArray(p.shieldInventory)) {
    p.shieldInventory = {};
  }
  for (const itemId of Object.keys(PVP_SHIELD_ITEMS)) {
    p.shieldInventory[itemId] = tamEded(p.shieldInventory[itemId]);
  }
  return p.shieldInventory;
}

function shieldItemKataloqunuAl(state = null) {
  const inventory = state ? shieldInventariniTeminEt(state) : {};
  return Object.values(PVP_SHIELD_ITEMS).map(item => ({
    itemId: item.itemId,
    displayName: item.displayName,
    durationMs: item.durationMs,
    count: state ? tamEded(inventory[item.itemId]) : 0
  }));
}

function shieldItemiElaveEt(state, itemId, count = 1) {
  const id = metnAl(itemId, 64);
  const item = PVP_SHIELD_ITEMS[id];
  const say = tamEded(count);
  if (!item || say <= 0) return { success: false, deyisdi: false, message: "Shield item məlumatı düzgün deyil." };
  const inventory = shieldInventariniTeminEt(state);
  inventory[id] = tamEded(inventory[id]) + say;
  return { success: true, deyisdi: true, itemId: id, count: inventory[id] };
}

function shieldIteminiAktivEt(state, itemId, nowMs = Date.now()) {
  const id = metnAl(itemId, 64);
  const item = PVP_SHIELD_ITEMS[id];
  if (!item) return { success: false, deyisdi: false, blocker: "unknown_shield_item", message: "Belə qoruma qalxanı yoxdur." };

  const now = tamEded(nowMs) || Date.now();
  const p = pvpQorumaStateTeminEt(state);
  const inventory = shieldInventariniTeminEt(state);
  const count = tamEded(inventory[id]);
  if (count <= 0) return { success: false, deyisdi: false, blocker: "shield_item_missing", message: "Bu qoruma qalxanı inventarda yoxdur." };

  if (p.shieldUntilMs > now) {
    return {
      success: false,
      deyisdi: false,
      blocker: "shield_already_active",
      message: "Aktiv qoruma qalxanı bitmədən başqa qalxan istifadə edilə bilməz.",
      shieldUntilMs: p.shieldUntilMs,
      remainingMs: p.shieldUntilMs - now
    };
  }

  inventory[id] = count - 1;
  p.shieldUntilMs = now + item.durationMs;
  p.lastShieldStartedAtMs = now;
  p.lastShieldEndedAtMs = 0;
  p.lastShieldItemId = id;

  return {
    success: true,
    deyisdi: true,
    itemId: id,
    durationMs: item.durationMs,
    shieldUntilMs: p.shieldUntilMs,
    remainingCount: inventory[id]
  };
}

module.exports = {
  PVP_SHIELD_ITEMS,
  shieldInventariniTeminEt,
  shieldItemKataloqunuAl,
  shieldItemiElaveEt,
  shieldIteminiAktivEt
};
