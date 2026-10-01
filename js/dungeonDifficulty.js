(function () {
  "use strict";

  const ids = () => Object.values(window.GameData.dungeonDifficulties || {}).sort((a, b) => a.order - b.order).map(tier => tier.id);
  function tier(id) { return window.GameData.dungeonDifficulties[id] || window.GameData.dungeonDifficulties.normal; }
  function clearKey(dungeonId, difficultyId) { return `${dungeonId}:${difficultyId}`; }
  function ensureClears(state = window.GameState.data) {
    const facts = state.story.facts;
    if (!Array.isArray(facts.difficultyClears)) facts.difficultyClears = [];
    return facts.difficultyClears;
  }
  function cleared(dungeonId, difficultyId = "normal", state = window.GameState.data) {
    if (difficultyId === "normal") return state.story.facts.clears.includes(dungeonId);
    return ensureClears(state).includes(clearKey(dungeonId, difficultyId));
  }
  function unlocked(dungeonId, difficultyId = "normal", state = window.GameState.data) {
    const definition = tier(difficultyId);
    if (!window.GameData.dungeons[dungeonId] || !window.Story.canEnter(dungeonId, state)) return false;
    return !definition.unlockAfter || cleared(dungeonId, definition.unlockAfter, state);
  }
  function recordClear(dungeonId, difficultyId = "normal", state = window.GameState.data) {
    if (difficultyId === "normal") return false;
    const key = clearKey(dungeonId, difficultyId), clears = ensureClears(state);
    if (clears.includes(key)) return false;
    clears.push(key);
    return true;
  }
  function firstClearReward(difficultyId = "normal") {
    const reward = tier(difficultyId).firstClearReward;
    return reward ? { gold: reward.gold || 0, materials: { ...(reward.materials || {}) } } : null;
  }
  function available(dungeonId, state = window.GameState.data) {
    return ids().filter(id => unlocked(dungeonId, id, state));
  }
  function displayName(dungeon, difficultyId = "normal") {
    return `${tier(difficultyId).namePrefix}${dungeon.name}`;
  }
  function variant(dungeonOrId, difficultyId = "normal") {
    const dungeon = typeof dungeonOrId === "string" ? window.GameData.dungeons[dungeonOrId] : dungeonOrId;
    if (!dungeon) return null;
    const definition = tier(difficultyId);
    const reward = definition.rewardMultiplier;
    return {
      ...dungeon,
      baseDungeonId: dungeon.id,
      difficultyId: definition.id,
      difficultyTier: definition,
      name: displayName(dungeon, definition.id),
      shortName: `${definition.namePrefix}${dungeon.shortName}`,
      duration: Math.ceil(dungeon.duration * definition.durationMultiplier),
      recommendedLevel: Math.min(100, Math.max(1, Math.ceil(dungeon.recommendedLevel * definition.recommendedLevelMultiplier))),
      difficulty: Math.ceil((dungeon.difficulty || 1) * definition.monsterModifiers.hp),
      rewards: {
        gold: dungeon.rewards.gold.map(value => Math.ceil(value * reward)),
        exp: dungeon.rewards.exp.map(value => Math.ceil(value * reward))
      }
    };
  }
  function monster(sourceOrId, difficultyId = "normal") {
    const source = typeof sourceOrId === "string" ? window.GameData.monsters[sourceOrId] : sourceOrId;
    if (!source) return null;
    const definition = tier(difficultyId), modifier = definition.monsterModifiers;
    const profile = window.GameData.monsterDifficultyProfiles?.[source.id] || {};
    const inheritedIds = ids().filter(id => tier(id).order <= definition.order);
    const titleProfiles = inheritedIds.filter(id => id !== "normal").map(id => ({ id, profile: profile[id] })).filter(entry => Boolean(entry.profile));
    const combatOverrides = Object.assign({}, ...titleProfiles.map(entry => entry.profile.combatOverrides || {}));
    const result = {
      ...source,
      ...combatOverrides,
      baseMonsterId: source.id,
      difficultyId: definition.id,
      name: `${definition.namePrefix}${source.name}`,
      hp: Math.max(1, Math.round(source.hp * modifier.hp)),
      attack: Math.max(1, Math.round(source.attack * modifier.attack)),
      defense: Math.max(0, Math.round(source.defense * modifier.defense)),
      magicAttack: Math.max(1, Math.round((source.magicAttack ?? source.attack) * modifier.magicAttack)),
      magicDefense: Math.max(0, Math.round((source.magicDefense ?? source.defense) * modifier.magicDefense)),
      speed: Math.max(1, Math.round((source.speed || 9) * modifier.speed)),
      hitRate: Math.min(.99, (source.hitRate ?? .95) * modifier.hitRate),
      evasionRate: Math.min(.65, (source.evasionRate ?? .03) * modifier.evasionRate),
      difficultySkillIds: titleProfiles.flatMap(entry => entry.profile.skillIds || []),
      signatureDropTiers: []
    };
    if (source.signatureDrops) result.signatureDropTiers.push({ difficultyId: "normal", drops: source.signatureDrops });
    titleProfiles.forEach(entry => {
      if (entry.profile.signatureDrops) result.signatureDropTiers.push({ difficultyId: entry.id, drops: entry.profile.signatureDrops });
    });
    return result;
  }

  window.DungeonDifficulty = { available, cleared, clearKey, displayName, ensureClears, firstClearReward, ids, monster, recordClear, tier, unlocked, variant };
})();
