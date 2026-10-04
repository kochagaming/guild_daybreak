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
    if (condition.type === "equipmentSetCompletions") {
      const discovered = state.encyclopedia?.items || {};
      return Object.values(window.GameData.equipmentSets || {}).filter(definition => definition.itemIds.every(id => (discovered[id] || 0) > 0)).length;
    }
    if (condition.type === "companionMemories") return (facts.companionMoments || []).length;
    if (condition.type === "companionPairMemories") {
      const moments = new Map((window.GameData.config.explorationEvents?.companionMoments || []).map(moment => [moment.id, moment]));
      return (facts.companionMoments || []).filter(key => moments.get(String(key).slice(0, String(key).lastIndexOf(":")))?.companionIds.length > 1).length;
    }
    if (condition.type === "companionBonds") {
      const memories = new Set(facts.companionMoments || []);
      return (window.GameData.config.explorationEvents?.companionMoments || []).filter(moment => moment.companionIds.length > 1
        && moment.lines.every((line, lineIndex) => memories.has(`${moment.id}:${lineIndex}`))).length;
    }
    if (condition.type === "routeEventEncounters") {
      const records = facts.routeEvents || {};
      return (window.GameData.config.explorationEvents?.routeEvents || []).filter(event => (records[event.id]?.encounters || 0) > 0).length;
    }
    if (condition.type === "routeRumorConfirmations") {
      const records = facts.routeEvents || {};
      return (window.GameData.config.explorationEvents?.routeEvents || []).filter(event => (records[event.id]?.rumorMatches || 0) > 0).length;
    }
    if (condition.type === "routeEventMasteries") {
      const records = facts.routeEvents || {};
      const required = window.GameData.config.explorationEvents?.routeMastery?.successes || 3;
      return (window.GameData.config.explorationEvents?.routeEvents || []).filter(event => (records[event.id]?.successes || 0) >= required).length;
    }
    if (condition.type === "teamSurveys") return Math.max(0, Number(facts.teamSurveys) || 0);
    if (condition.type === "treasureTierMasteries") {
      const records = facts.treasureTiers || {};
      const required = window.GameData.config.explorationEvents?.treasureMastery?.openings || 3;
      return (window.GameData.config.explorationEvents?.treasure?.types || []).filter(tier => tier.challenge && (records[tier.id]?.openings || 0) >= required).length;
    }
    if (condition.type === "ultraRareOwned") return (state.inventory?.equipment || []).filter(item => item.ultraRareTitleId).length;
    if (condition.type === "facilityUpgrades") {
      const trackIds = window.GameData.config.facilities?.trackOrder || [];
      return (window.GameData.config.facilities?.order || []).reduce((total, id) => total + trackIds.reduce((sum, trackId) => sum + Math.max(0, (state.facilities?.[id]?.levels?.[trackId] || 1) - 1), 0), 0);
    }
    return 0;
  }

  function entry(definition, state = window.GameState.data) {
    const current = count(definition.condition, state);
    const dynamicTargets = {
      routeEventEncounters: () => (window.GameData.config.explorationEvents?.routeEvents || []).length,
      routeRumorConfirmations: () => (window.GameData.config.explorationEvents?.routeEvents || []).length,
      routeEventMasteries: () => (window.GameData.config.explorationEvents?.routeEvents || []).length,
      treasureTierMasteries: () => (window.GameData.config.explorationEvents?.treasure?.types || []).filter(tier => tier.challenge).length
    };
    const target = definition.condition.target === "all" ? Math.max(1, dynamicTargets[definition.condition.type]?.() || 1) : definition.condition.target;
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
