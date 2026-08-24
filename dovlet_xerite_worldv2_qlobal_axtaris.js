'use strict';

function dovletKodunuNormallasdir(deyer) {
  if (Number.isInteger(deyer) && deyer > 0) return deyer;

  if (typeof deyer !== 'string') {
    throw new Error(`Etibarsız Dövlət kodu: ${deyer}`);
  }

  const metn = deyer.trim();
  const uygun = metn.match(/^(?:state\s*#?\s*)?(\d+)$/i);
  if (!uygun) {
    throw new Error(`Etibarsız Dövlət kodu: ${deyer}`);
  }

  const stateId = Number(uygun[1]);
  if (!Number.isInteger(stateId) || stateId <= 0) {
    throw new Error(`Etibarsız Dövlət kodu: ${deyer}`);
  }

  return stateId;
}

function qlobalDovletAxtar({ payload, stateCode } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Qlobal Dövlət axtarışı üçün payload tələb olunur.');
  }

  if (!Array.isArray(payload.states)) {
    throw new Error('Qlobal Dövlət payload.states massivi tələb olunur.');
  }

  const stateId = dovletKodunuNormallasdir(stateCode);
  const dovlet = payload.states.find((x) => Number(x && x.stateId) === stateId) || null;

  if (!dovlet) {
    return {
      version: 2,
      stateId,
      found: false,
      opened: false,
      globalNode: null,
      state: null,
    };
  }

  return {
    version: 2,
    stateId,
    found: true,
    opened: dovlet.opened === true,
    globalNode: dovlet.globalNode && typeof dovlet.globalNode === 'object'
      ? { ...dovlet.globalNode }
      : null,
    state: { ...dovlet },
  };
}

module.exports = {
  dovletKodunuNormallasdir,
  qlobalDovletAxtar,
};
