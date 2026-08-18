"use strict";

// ============================================================
// YOL BAĞLANTI QORUYUCUSU
// ------------------------------------------------------------
// server.js daxilində yol A* hazırlığı zamanı istifadə olunan
// isReservedResourceCell(...) helper-i əvvəl mövcud deyildi.
// Bu səbəbdən connect_road_request zamanı ReferenceError yaranır
// və WebSocket bağlantısı qapanırdı.
//
// Bu modul server.js-i böyük şəkildə dəyişmədən həmin çatışmayan
// helper-i global scope-a təhlükəsiz formada əlavə edir.
// ============================================================

function reqemdir(deyer) {
  return Number.isFinite(Number(deyer));
}

function eyniXana(ax, az, bx, bz) {
  if (!reqemdir(ax) || !reqemdir(az) || !reqemdir(bx) || !reqemdir(bz)) {
    return false;
  }

  return Number(ax) === Number(bx) && Number(az) === Number(bz);
}

function rezervResursXanasidir(state, x, z) {
  if (!state) {
    return false;
  }

  // Resurs node-un mərkəz xanası yol üçün rezervdir.
  if (Array.isArray(state.resourceNodes)) {
    for (const node of state.resourceNodes) {
      if (!node) continue;

      if (eyniXana(node.x, node.z, x, z)) {
        return true;
      }

      // Köhnə state-lərdə ayrıca resourceSlots olmaya bilər.
      // Ona görə node daxilindəki slotları da yoxlayırıq.
      if (Array.isArray(node.slots)) {
        for (const slot of node.slots) {
          if (!slot) continue;

          if (eyniXana(slot.x, slot.z, x, z)) {
            return true;
          }
        }
      }
    }
  }

  // Cari state strukturunda bütün resurs slotları ayrıca saxlanılır.
  if (Array.isArray(state.resourceSlots)) {
    for (const slot of state.resourceSlots) {
      if (!slot) continue;

      if (eyniXana(slot.x, slot.z, x, z)) {
        return true;
      }
    }
  }

  return false;
}

// Mövcud və ya gələcək server versiyası helper-i özü verərsə
// onu override etmirik.
if (typeof global.isReservedResourceCell !== "function") {
  global.isReservedResourceCell = function isReservedResourceCell(state, x, z) {
    return rezervResursXanasidir(state, x, z);
  };
}

module.exports = {
  rezervResursXanasidir
};
