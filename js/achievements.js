(function () {
  "use strict";

  function count(condition, state) {
    const story = state.story || { completed: [], facts: {} };
    const facts = story.facts || {};
    if (condition.type === "characters") return (state.characters || []).length;
    if (condition.type === "partyMembers") return Math.max(0, ...(state.parties || []).map(party => party.length));
    if (condition.type === "chapters") return (story.completed || []).filter(id => window.GameData.storyChapters.some(chapter => chapter.id === id && chapter.number >= 1 && chapter.kind !== "postgame")).length;
    if (condition.type === "postgameChapters") return (story.completed || []).filter(id => window.GameData.storyChapters.some(chapter => chapter.id === id && chapter.kind === "postgame")).length;
    if (condition.type === "specificDungeonClear") return (facts.clears || []).includes(condition.dungeonId) ? 1 : 0;
    if (condition.type === "dungeonClears") return (facts.clears || []).length;
    if (condition.type === "optionalClears") return (facts.clears || []).filter(id => window.GameData.dungeons[id] && !window.GameData.dungeons[id].requiredForStory).length;
    if (condition.type === "divineClears") return (facts.difficultyClears || []).filter(key => String(key).endsWith(":divine")).length;
    if (condition.type === "monsterSpecies") return Object.values(state.encyclopedia?.monsters || {}).filter(record => (record.defeated || 0) > 0).length;
    if (condition.type === "monsterDefeats") return Object.values(state.encyclopedia?.monsters || {}).reduce((total, record) => total + Math.max(0, record.defeated || 0), 0);
    if (condition.type === "itemTypes") return Object.keys(state.encyclopedia?.items || {}).filter(id => (state.encyclopedia.items[id] || 0) > 0).length;
    if (condition.type === "ultraRareOwned") return (state.inventory?.equipment || []).filter(item => item.ultraRareTitleId).length;
    if (condition.type === "facilityUpgrades") {
      const trackIds = window.GameData.facilities?.trackOrder || [];
      return (window.GameData.facilities?.order || []).reduce((total, id) => total + trackIds.reduce((sum, trackId) => sum + Math.max(0, (state.facilities?.[id]?.levels?.[trackId] || 1) - 1), 0), 0);
    }
    return 0;
  }

  function entry(definition, state = window.GameState.data) {
    const current = count(definition.condition, state);
    const target = definition.condition.target;
    return Object.freeze({ ...definition, current, target, complete: current >= target, ratio: target ? Math.min(1, current / target) : 1 });
  }

  function entries(state = window.GameState.data) {
    return window.GameData.achievements.map(definition => entry(definition, state));
  }

  function summary(state = window.GameState.data) {
    const all = entries(state), completed = all.filter(value => value.complete).length;
    return Object.freeze({ completed, total: all.length, ratio: all.length ? completed / all.length : 1 });
  }

  window.Achievements = { count, entry, entries, summary };
})();
