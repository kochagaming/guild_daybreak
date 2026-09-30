(function () {
  "use strict";
  const state = () => window.GameState.data.accessCodes;
  const definitions = () => window.GameData.accessCodes || {};
  function redeemed(id) { return state().redeemedIds.includes(id); }
  function redeemedDefinitions() { return state().redeemedIds.map(id => definitions()[id]).filter(Boolean); }
  function effects(type) {
    return state().redeemedIds.flatMap(id => definitions()[id]?.effects || []).filter(effect => effect.type === type);
  }
  function partySlotBonus() {
    return effects("partySlotRight").reduce((total, effect) => total + Math.max(0, Number(effect.amount) || 0), 0);
  }
  function explorationDurationMultiplier() {
    return effects("explorationDurationMultiplier").reduce((total, effect) => total * Math.max(.01, Number(effect.multiplier) || 1), 1);
  }
  function applyAcquisitionBonuses(value) {
    const normalize = window.AcquisitionSkills?.normalize || (entry => entry);
    const result = normalize(value);
    effects("acquisitionModifier").forEach(effect => {
      const target = effect.metric === "experience" ? result.experience.party : result[effect.metric];
      if (!target) return;
      if (effect.operation === "multiplier") target.multiplier *= Number(effect.value) || 1;
      else target.flat += Number(effect.value) || 0;
    });
    return normalize(result);
  }
  function redeem(featureId, rawCode) {
    const definition = definitions()[featureId];
    if (!definition) return { ok: false, message: "この機能のコード入力先が見つかりません。" };
    if (redeemed(featureId)) return { ok: false, message: `${definition.name}はすでに解放済みです。` };
    const code = String(rawCode || "").trim();
    if (code !== definition.code) return { ok: false, message: "コードが正しくありません。" };
    state().redeemedIds.push(featureId);
    window.GameState.ensurePartyCapacity(window.GameState.data);
    window.GameState.addLog(`コード特典「${definition.name}」を解放しました。`, "success");
    window.GameState.save();
    return { ok: true, message: `${definition.name}を解放しました。` };
  }
  window.AccessCodes = { redeem, redeemed, redeemedDefinitions, partySlotBonus, explorationDurationMultiplier, applyAcquisitionBonuses };
})();
