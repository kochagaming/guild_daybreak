(function () {
  "use strict";

  const handlers = {
    joinCompanion(effect) { return window.Companions.join(effect.companionId); },
    advanceCompanion(effect) { return window.Companions.advance(effect.companionId, effect.stageId); }
  };
  function apply(effect) {
    const handler = effect && handlers[effect.type];
    return handler ? handler(effect) : { ok: false, changed: false, message: "未対応の物語効果です。" };
  }
  function applyAll(effects) {
    const results = (effects || []).map(apply);
    return { changed: results.some(result => result.changed), results };
  }

  window.StoryEffects = { apply, applyAll };
})();
