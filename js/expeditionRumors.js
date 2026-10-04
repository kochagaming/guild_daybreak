(function () {
  "use strict";

  function dayKey(now = window.GameRuntime.now()) {
    const date = new Date(now);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function hash(text) {
    let value = 2166136261;
    for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
    return value >>> 0;
  }

  function candidates() {
    return Object.values(window.GameData.dungeons)
      .filter(dungeon => window.Story?.canEnter(dungeon.id))
      .sort((left, right) => left.id.localeCompare(right.id, "en"));
  }

  function current(now = window.GameRuntime.now()) {
    const routes = candidates(), rumors = window.GameData.expeditionRumors || [];
    if (!routes.length || !rumors.length) return null;
    const key = dayKey(now);
    const progressKey = (window.GameState.data.story?.facts?.clears || []).slice().sort().join("|");
    const dungeon = routes[hash(`${key}:route:${progressKey}`) % routes.length];
    const rumor = rumors[hash(`${key}:rumor`) % rumors.length];
    return Object.freeze({ id: rumor.id, dayKey: key, dungeonId: dungeon.id });
  }

  function definition(snapshot) {
    return snapshot ? (window.GameData.expeditionRumors || []).find(entry => entry.id === snapshot.id) || null : null;
  }

  function forDungeon(dungeonId, now = window.GameRuntime.now()) {
    const snapshot = current(now);
    return snapshot?.dungeonId === dungeonId ? snapshot : null;
  }

  function apply(bonuses, snapshot) {
    const result = window.AcquisitionSkills.normalize(bonuses), rumor = definition(snapshot);
    if (!rumor) return result;
    const effect = rumor.effect;
    const target = effect.metric === "experience" ? result.experience.party : result[effect.metric];
    if (!target) return result;
    if (effect.operation === "multiplier") target.multiplier *= effect.value;
    else target.flat += effect.value;
    return window.AcquisitionSkills.normalize(result);
  }

  window.ExpeditionRumors = { dayKey, current, definition, forDungeon, apply };
})();
