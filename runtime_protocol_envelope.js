"use strict";

function requestIdAl(message) {
  const raw =
    message &&
    typeof message.requestId === "string"
      ? message.requestId.trim()
      : "";

  if (!raw) {
    return "";
  }

  return raw.slice(0, 128);
}

function correlatedSendYarat(
  baseSend,
  requestId
) {
  if (typeof baseSend !== "function") {
    throw new Error(
      "Base send funksiyasi yoxdur."
    );
  }

  const rid =
    typeof requestId === "string"
      ? requestId.trim().slice(0, 128)
      : "";

  if (!rid) {
    return baseSend;
  }

  return function correlatedSend(
    ws,
    payload
  ) {
    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      Object.prototype.hasOwnProperty.call(
        payload,
        "requestId"
      )
    ) {
      return baseSend(
        ws,
        payload
      );
    }

    return baseSend(
      ws,
      {
        ...payload,
        requestId: rid
      }
    );
  };
}

module.exports = {
  requestIdAl,
  correlatedSendYarat
};
