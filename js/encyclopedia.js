(function () {
  "use strict";

  const HUNT_MARKS = Object.freeze([
    Object.freeze({ threshold: 10, icon: "十", name: "十討の印", sealReward: 1, fixedLootMultiplier: 1.1, description: "同じ魔物を十体討ち、その動きを見慣れ始めた記録。固有品を探す目も少し鍛えられる。" }),
    Object.freeze({ threshold: 30, icon: "巡", name: "三十討の札", sealReward: 1, fixedLootMultiplier: 1.25, description: "幾度も同じ魔物と相対し、生息地の癖まで覚えた記録。痕跡から固有品を見つけやすくなる。" }),
    Object.freeze({ threshold: 100, icon: "征", name: "百討の章", sealReward: 2, fixedLootMultiplier: 1.5, description: "百体の討伐を重ね、一冊の狩猟記録を結んだ証。狩り場を読み、固有品を取りこぼしにくくなる。" })
  ]);

  function blankObservations() { return { incomingAttempts: 0, incomingHits: 0, enemyTurns: 0, maxAttackCount: 0, magicAttack: false, rearTargeting: false, attackElements: [], statusAttacks: [], elementWeaknesses: [], elementResistances: [], statusResisted: [], statusLanded: [], burstRounds: [], difficultySkillIds: [], drops: [] }; }
  function blankDifficulty() { return { encountered: 0, defeated: 0, drops: [], skillIds: [] }; }
  function blankHabitat() { return { encountered: 0, defeated: 0 }; }
  function blankMonster() { return { encountered: 0, defeated: 0, firstDefeat: null, observations: blankObservations(), difficulties: {}, habitats: {} }; }
  function blank() { return { version: 14, items: {}, itemDiscoveries: {}, bestQualities: {}, ultraRareTitles: [], monsters: {}, unreadItems: [], unreadUltraRareTitles: [], unreadMonsters: [], itemTarget: null, monsterTarget: null, craftingTargetId: null }; }
  function normalizeMonster(entry) {
    const normalized = Object.assign(blankMonster(), entry || {});
    normalized.observations = Object.assign(blankObservations(), entry?.observations || {});
    normalized.difficulties = Object.fromEntries(Object.entries(entry?.difficulties || {}).map(([id, value]) => [id, Object.assign(blankDifficulty(), value || {})]));
    normalized.habitats = Object.fromEntries(Object.entries(entry?.habitats || {}).map(([dungeonId, difficulties]) => [dungeonId,
      Object.fromEntries(Object.entries(difficulties || {}).map(([difficultyId, value]) => [difficultyId, Object.assign(blankHabitat(), value || {})]))
    ]));
    if (!normalized.difficulties.normal && normalized.encountered) normalized.difficulties.normal = { encountered: normalized.encountered, defeated: normalized.defeated, drops: normalized.observations.drops.slice(), skillIds: [] };
    return normalized;
  }
  function ensure() {
    const state = window.GameState.data;
    if (!state.encyclopedia) {
      state.encyclopedia = blank();
      // This is an additive extension of the current save format. Persist it on startup.
      window.GameState.needsInitialSave = true;
      bootstrap(state.encyclopedia);
    } else if (state.encyclopedia.version !== 14 || !state.encyclopedia.itemDiscoveries || !state.encyclopedia.bestQualities || !Array.isArray(state.encyclopedia.ultraRareTitles) || !Array.isArray(state.encyclopedia.unreadUltraRareTitles) || !Array.isArray(state.encyclopedia.unreadItems) || !Array.isArray(state.encyclopedia.unreadMonsters) || !(state.encyclopedia.itemTarget === null || typeof state.encyclopedia.itemTarget === "object") || !(state.encyclopedia.monsterTarget === null || typeof state.encyclopedia.monsterTarget === "object") || !(state.encyclopedia.craftingTargetId === null || typeof state.encyclopedia.craftingTargetId === "string")) {
      const legacyTargetId = state.encyclopedia.trackedItemId;
      const currentTarget = state.encyclopedia.itemTarget;
      const currentCraftingTargetId = state.encyclopedia.craftingTargetId;
      state.encyclopedia.version = 14;
      state.encyclopedia.items = state.encyclopedia.items || {};
      state.encyclopedia.itemDiscoveries = state.encyclopedia.itemDiscoveries || {};
      state.encyclopedia.bestQualities = state.encyclopedia.bestQualities || {};
      state.encyclopedia.ultraRareTitles = Array.isArray(state.encyclopedia.ultraRareTitles) ? state.encyclopedia.ultraRareTitles : [];
      state.encyclopedia.monsters = state.encyclopedia.monsters || {};
      state.encyclopedia.unreadItems = Array.isArray(state.encyclopedia.unreadItems) ? state.encyclopedia.unreadItems : [];
      state.encyclopedia.unreadUltraRareTitles = Array.isArray(state.encyclopedia.unreadUltraRareTitles) ? state.encyclopedia.unreadUltraRareTitles : [];
      state.encyclopedia.unreadMonsters = Array.isArray(state.encyclopedia.unreadMonsters) ? state.encyclopedia.unreadMonsters : [];
      state.encyclopedia.itemTarget = currentTarget && window.GameData.items[currentTarget.itemId]
        ? { itemId: currentTarget.itemId, quantity: currentTarget.quantity || 1, progress: currentTarget.progress || 0 }
        : window.GameData.items[legacyTargetId] && state.encyclopedia.items[legacyTargetId]
          ? { itemId: legacyTargetId, quantity: 1, progress: 0 }
          : null;
      state.encyclopedia.monsterTarget = state.encyclopedia.monsterTarget && window.GameData.monsters[state.encyclopedia.monsterTarget.monsterId] && state.encyclopedia.monsters[state.encyclopedia.monsterTarget.monsterId]
        ? { monsterId: state.encyclopedia.monsterTarget.monsterId, quantity: state.encyclopedia.monsterTarget.quantity || 1, progress: state.encyclopedia.monsterTarget.progress || 0 }
        : null;
      state.encyclopedia.craftingTargetId = window.GameData.recipes.some(recipe => recipe.id === currentCraftingTargetId) ? currentCraftingTargetId : null;
      delete state.encyclopedia.trackedItemId;
      Object.keys(state.encyclopedia.monsters || {}).forEach(id => { state.encyclopedia.monsters[id] = normalizeMonster(state.encyclopedia.monsters[id]); });
      bootstrap(state.encyclopedia);
      window.GameState.needsInitialSave = true;
    }
    return state.encyclopedia;
  }
  function addItem(book, id, quantity) {
    if (!window.GameData.items[id] || !Number.isInteger(quantity) || quantity <= 0) return;
    if (!book.items[id] && !book.unreadItems.includes(id)) book.unreadItems.push(id);
    book.items[id] = (book.items[id] || 0) + quantity;
  }
  function qualityRank(id) { return window.GameData.qualities[id]?.rank ?? -1; }
  function considerQuality(book, itemId, qualityId) {
    const item = window.GameData.items[itemId];
    if (!["weapon", "armor"].includes(item?.type) || !window.GameData.qualities[qualityId]) return false;
    const previous = book.bestQualities[itemId];
    if (previous && qualityRank(previous) >= qualityRank(qualityId)) return false;
    book.bestQualities[itemId] = qualityId;
    return true;
  }
  function discoverUltraRareTitle(book, titleId, unread) {
    if (!window.GameData.ultraRareTitles[titleId] || book.ultraRareTitles.includes(titleId)) return false;
    book.ultraRareTitles.push(titleId);
    if (unread && !book.unreadUltraRareTitles.includes(titleId)) book.unreadUltraRareTitles.push(titleId);
    return true;
  }
  function addMonster(book, id, encountered, defeated) {
    if (!window.GameData.monsters[id]) return;
    if (!book.monsters[id] && !book.unreadMonsters.includes(id)) book.unreadMonsters.push(id);
    const entry = normalizeMonster(book.monsters[id]);
    entry.encountered += Math.max(0, encountered || 0);
    entry.defeated += Math.max(0, defeated || 0);
    entry.encountered = Math.max(entry.encountered, entry.defeated);
    book.monsters[id] = entry;
  }
  function dungeonMonsterIds(dungeonId) {
    const dungeon = window.GameData.dungeons[dungeonId];
    return dungeon ? Array.from(new Set(dungeon.encounters.flatMap(encounter => encounter.groups.flat()))) : [];
  }
  function recordHabitat(entry, monsterId, dungeonId, difficultyId, encountered, defeated, additive = true) {
    if (!window.GameData.dungeons[dungeonId] || !dungeonMonsterIds(dungeonId).includes(monsterId)) return;
    if (!entry.habitats[dungeonId]) entry.habitats[dungeonId] = {};
    const habitat = Object.assign(blankHabitat(), entry.habitats[dungeonId][difficultyId] || {});
    const encounteredCount = Math.max(0, encountered || 0), defeatedCount = Math.max(0, defeated || 0);
    habitat.encountered = additive ? habitat.encountered + encounteredCount : Math.max(habitat.encountered, encounteredCount);
    habitat.defeated = additive ? habitat.defeated + defeatedCount : Math.max(habitat.defeated, defeatedCount);
    habitat.encountered = Math.max(habitat.encountered, habitat.defeated);
    if (habitat.encountered) entry.habitats[dungeonId][difficultyId] = habitat;
  }
  function mergeRecordedObservation(entry, incoming) {
    const target = entry.observations;
    ["incomingAttempts", "incomingHits", "enemyTurns"].forEach(key => { target[key] += Math.max(0, incoming[key] || 0); });
    target.maxAttackCount = Math.max(target.maxAttackCount, incoming.maxAttackCount || 0);
    target.magicAttack = target.magicAttack || Boolean(incoming.magicAttack);
    target.rearTargeting = target.rearTargeting || Boolean(incoming.rearTargeting);
    ["attackElements", "statusAttacks", "elementWeaknesses", "elementResistances", "statusResisted", "statusLanded", "burstRounds", "difficultySkillIds", "drops"].forEach(key => {
      target[key] = Array.from(new Set(target[key].concat(incoming[key] || [])));
    });
  }
  function battleInsights(observations) {
    const book = ensure();
    const arrayKeys = ["attackElements", "statusAttacks", "elementWeaknesses", "elementResistances", "statusResisted", "statusLanded", "difficultySkillIds"];
    return Object.entries(observations || {}).map(([monsterId, incoming]) => {
      if (!window.GameData.monsters[monsterId]) return null;
      const stored = book.monsters[monsterId];
      const previous = normalizeMonster(stored);
      const insight = {
        monsterId,
        firstEncounter: !stored || previous.encountered <= 0,
        magicAttack: Boolean(incoming.magicAttack && !previous.observations.magicAttack),
        rearTargeting: Boolean(incoming.rearTargeting && !previous.observations.rearTargeting),
        maxAttackCount: (incoming.maxAttackCount || 0) > previous.observations.maxAttackCount ? incoming.maxAttackCount : null,
        burstRounds: (incoming.burstRounds || []).length && !(previous.observations.burstRounds || []).length ? Array.from(new Set(incoming.burstRounds)) : []
      };
      arrayKeys.forEach(key => {
        const known = new Set(previous.observations[key] || []);
        insight[key] = Array.from(new Set(incoming[key] || [])).filter(value => !known.has(value));
      });
      const discovered = insight.firstEncounter || insight.magicAttack || insight.rearTargeting || insight.maxAttackCount != null
        || insight.burstRounds.length || arrayKeys.some(key => insight[key].length);
      return discovered ? insight : null;
    }).filter(Boolean);
  }
  function habitatInsights(encounters, dungeonId, difficultyId = "normal") {
    if (!window.GameData.dungeons[dungeonId]) return [];
    return Object.entries(encounters || {}).filter(([monsterId, count]) => window.GameData.monsters[monsterId] && count > 0
      && dungeonMonsterIds(dungeonId).includes(monsterId)
      && !monsterHabitats(monsterId).some(habitat => habitat.dungeonId === dungeonId && habitat.difficultyId === difficultyId))
      .map(([monsterId, count]) => ({ monsterId, dungeonId, difficultyId, encountered: Math.max(1, Math.round(count)) }));
  }
  function bootstrap(book) {
    const state = window.GameState.data, itemMinimums = {};
    state.inventory.equipment.forEach(instance => {
      itemMinimums[instance.templateId] = (itemMinimums[instance.templateId] || 0) + 1;
      considerQuality(book, instance.templateId, instance.qualityId || "standard");
      if (instance.ultraRareTitleId) discoverUltraRareTitle(book, instance.ultraRareTitleId, false);
    });
    Object.entries(state.inventory.materials).forEach(([id, quantity]) => { itemMinimums[id] = quantity; });
    const results = Array.from(new Map([state.lastResult, ...(state.partyResults || [])].filter(Boolean).map(result => [result.id, result])).values());
    results.forEach(result => {
      const difficultyId = result.difficultyId || "normal";
      (result.drops || []).forEach(drop => {
        itemMinimums[drop.itemId] = Math.max(itemMinimums[drop.itemId] || 0, drop.quantity);
        if (drop.qualityId) considerQuality(book, drop.itemId, drop.qualityId);
        if (drop.ultraRareTitleId) discoverUltraRareTitle(book, drop.ultraRareTitleId, false);
      });
      (result.autoSold || []).forEach(drop => considerQuality(book, drop.itemId, drop.qualityId));
      Object.entries(result.monsterEncounters || {}).forEach(([id, count]) => {
        const entry = normalizeMonster(book.monsters[id]);
        entry.encountered = Math.max(entry.encountered, count); book.monsters[id] = entry;
      });
      Object.entries(result.monsterCounts || {}).forEach(([id, count]) => {
        const entry = normalizeMonster(book.monsters[id]);
        entry.defeated = Math.max(entry.defeated, count); entry.encountered = Math.max(entry.encountered, entry.defeated); book.monsters[id] = entry;
      });
      if (window.GameData.dungeons[result.dungeonId]) {
        Array.from(new Set([...Object.keys(result.monsterEncounters || {}), ...Object.keys(result.monsterCounts || {})])).forEach(id => {
          if (!window.GameData.monsters[id]) return;
          const entry = normalizeMonster(book.monsters[id]);
          recordHabitat(entry, id, result.dungeonId, difficultyId, result.monsterEncounters?.[id] || 0, result.monsterCounts?.[id] || 0, false);
          book.monsters[id] = entry;
        });
      }
      Object.entries(result.monsterObservations || {}).forEach(([id, observation]) => {
        if (!window.GameData.monsters[id]) return;
        const entry = normalizeMonster(book.monsters[id]);
        mergeRecordedObservation(entry, observation);
        const difficulty = Object.assign(blankDifficulty(), entry.difficulties[difficultyId] || {});
        difficulty.encountered = Math.max(difficulty.encountered, result.monsterEncounters?.[id] || 0);
        difficulty.defeated = Math.max(difficulty.defeated, result.monsterCounts?.[id] || 0);
        difficulty.drops = Array.from(new Set(difficulty.drops.concat(observation.drops || [])));
        difficulty.skillIds = Array.from(new Set(difficulty.skillIds.concat(observation.difficultySkillIds || [])));
        entry.difficulties[difficultyId] = difficulty;
        book.monsters[id] = entry;
      });
      const reaction = result.lootReaction;
      if (reaction?.reason === "初めて持ち帰った品" && reaction.characterId && reaction.name && window.GameData.items[reaction.itemId] && window.GameData.dungeons[result.dungeonId] && Number.isFinite(result.completedAt) && !book.itemDiscoveries[reaction.itemId]) {
        book.itemDiscoveries[reaction.itemId] = {
          characterId: reaction.characterId,
          name: reaction.name,
          roleTitle: reaction.roleTitle || null,
          dungeonId: result.dungeonId,
          difficultyId,
          completedAt: result.completedAt
        };
      }
    });
    Object.entries(itemMinimums).forEach(([id, quantity]) => { book.items[id] = Math.max(book.items[id] || 0, quantity); });
    (state.story?.facts?.clears || []).forEach(dungeonId => {
      dungeonMonsterIds(dungeonId).forEach(id => {
        const entry = normalizeMonster(book.monsters[id]);
        entry.encountered = Math.max(entry.encountered, 1);
        if (window.GameData.monsters[id].boss) entry.defeated = Math.max(entry.defeated, 1);
        recordHabitat(entry, id, dungeonId, "normal", 1, window.GameData.monsters[id].boss ? 1 : 0, false);
        book.monsters[id] = entry;
      });
    });
    (state.story?.facts?.difficultyClears || []).forEach(key => {
      const separator = key.lastIndexOf(":"), dungeonId = key.slice(0, separator), difficultyId = key.slice(separator + 1);
      if (separator < 1 || !window.GameData.dungeons[dungeonId]) return;
      dungeonMonsterIds(dungeonId).forEach(id => {
        const entry = normalizeMonster(book.monsters[id]);
        recordHabitat(entry, id, dungeonId, difficultyId, 1, window.GameData.monsters[id].boss ? 1 : 0, false);
        book.monsters[id] = entry;
      });
    });
    for (const quest of window.GameData.commissions || []) {
      if (!quest.monsterId) continue;
      const progress = state.commissions?.progress?.[quest.id] || 0;
      if (progress) {
        const entry = normalizeMonster(book.monsters[quest.monsterId]);
        entry.defeated = Math.max(entry.defeated, progress); entry.encountered = Math.max(entry.encountered, entry.defeated); book.monsters[quest.monsterId] = entry;
      }
    }
  }
  function recordItem(id, quantity) { addItem(ensure(), id, quantity); }
  function recordItemDiscovery(itemId, discovery) {
    const book = ensure();
    if (!window.GameData.items[itemId] || !book.items[itemId] || book.itemDiscoveries[itemId] || !discovery?.characterId || !discovery?.name || !window.GameData.dungeons[discovery.dungeonId]) return null;
    const entry = {
      characterId: String(discovery.characterId),
      name: String(discovery.name),
      roleTitle: discovery.roleTitle ? String(discovery.roleTitle) : null,
      dungeonId: discovery.dungeonId,
      difficultyId: (window.DungeonDifficulty?.ids?.() || ["normal", "abyss", "divine"]).includes(discovery.difficultyId) ? discovery.difficultyId : "normal",
      completedAt: Math.max(0, Math.round(Number(discovery.completedAt) || window.GameRuntime.now()))
    };
    book.itemDiscoveries[itemId] = entry;
    return { ...entry };
  }
  function itemDiscovery(itemId) {
    const entry = ensure().itemDiscoveries[itemId];
    return entry ? { ...entry } : null;
  }
  function itemDiscoveriesByCharacter(characterId) {
    return recentItemDiscoveries().filter(entry => entry.characterId === characterId);
  }
  function recentItemDiscoveries(limit = Number.MAX_SAFE_INTEGER) {
    const maximum = Number.isInteger(limit) && limit >= 0 ? limit : Number.MAX_SAFE_INTEGER;
    return Object.entries(ensure().itemDiscoveries)
      .map(([itemId, entry]) => ({ itemId, ...entry }))
      .sort((left, right) => right.completedAt - left.completedAt || left.itemId.localeCompare(right.itemId))
      .slice(0, maximum);
  }
  function monsterFirstDefeatsByCharacter(characterId) {
    return Object.entries(ensure().monsters)
      .filter(([, entry]) => entry?.firstDefeat?.members?.some(member => member.characterId === characterId))
      .map(([monsterId, entry]) => ({ monsterId, ...entry.firstDefeat }))
      .sort((left, right) => right.completedAt - left.completedAt || left.monsterId.localeCompare(right.monsterId));
  }
  function recentMonsterFirstDefeats(limit = Number.MAX_SAFE_INTEGER) {
    const maximum = Number.isInteger(limit) && limit >= 0 ? limit : Number.MAX_SAFE_INTEGER;
    return Object.entries(ensure().monsters)
      .filter(([, entry]) => entry?.firstDefeat)
      .map(([monsterId, entry]) => ({ monsterId, ...entry.firstDefeat }))
      .sort((left, right) => right.completedAt - left.completedAt || left.monsterId.localeCompare(right.monsterId))
      .slice(0, maximum);
  }
  function huntMarks(monsterId) {
    const defeated = Math.max(0, Number(monster(monsterId)?.defeated) || 0);
    return HUNT_MARKS.map(mark => ({ ...mark, defeated, achieved: defeated >= mark.threshold }));
  }
  function huntFamiliarity(monsterId, defeatedOverride = null) {
    const defeated = defeatedOverride == null ? Math.max(0, Number(monster(monsterId)?.defeated) || 0) : Math.max(0, Number(defeatedOverride) || 0);
    const achieved = HUNT_MARKS.filter(mark => defeated >= mark.threshold);
    const current = achieved[achieved.length - 1] || null;
    return {
      monsterId,
      defeated,
      rank: achieved.length,
      name: current?.name || "未習熟",
      fixedLootMultiplier: current?.fixedLootMultiplier || 1
    };
  }
  function crossedHuntMarks(monsterId, previousDefeated, currentDefeated) {
    const previous = Math.max(0, Number(previousDefeated) || 0), current = Math.max(previous, Number(currentDefeated) || 0);
    return HUNT_MARKS.filter(mark => previous < mark.threshold && current >= mark.threshold)
      .map(mark => ({ monsterId, threshold: mark.threshold, sealReward: mark.sealReward }));
  }
  function recordQuality(itemId, qualityId) { return considerQuality(ensure(), itemId, qualityId); }
  function recordUltraRareTitle(titleId) { return discoverUltraRareTitle(ensure(), titleId, true); }
  function recordBattle(encounters, defeats, observations, difficultyId = "normal", expedition = null) {
    const book = ensure();
    const newFirstDefeats = [];
    const pendingFirstDefeats = new Map();
    Object.entries(defeats || {}).forEach(([id, count]) => {
      if (!window.GameData.monsters[id] || count <= 0) return;
      const previous = normalizeMonster(book.monsters[id]);
      if (previous.firstDefeat || previous.defeated > 0 || !expedition?.dungeonId || !Array.isArray(expedition.members) || !expedition.members.length) return;
      const firstDefeat = {
        partyIndex: Math.max(0, Number(expedition.partyIndex) || 0),
        partyName: String(expedition.partyName || `第${(Number(expedition.partyIndex) || 0) + 1}隊`),
        members: expedition.members.map(member => ({ characterId: String(member.characterId), name: String(member.name), roleTitle: member.roleTitle ? String(member.roleTitle) : null })),
        dungeonId: expedition.dungeonId,
        difficultyId: (window.DungeonDifficulty?.ids?.() || ["normal", "abyss", "divine"]).includes(difficultyId) ? difficultyId : "normal",
        completedAt: Math.max(0, Math.round(Number(expedition.completedAt) || window.GameRuntime.now()))
      };
      pendingFirstDefeats.set(id, firstDefeat);
      newFirstDefeats.push({ monsterId: id, ...firstDefeat });
    });
    Object.entries(encounters || {}).forEach(([id, count]) => addMonster(book, id, count, 0));
    Object.entries(defeats || {}).forEach(([id, count]) => addMonster(book, id, 0, count));
    if (window.GameData.dungeons[expedition?.dungeonId]) {
      Array.from(new Set([...Object.keys(encounters || {}), ...Object.keys(defeats || {})])).forEach(id => {
        if (!window.GameData.monsters[id]) return;
        const entry = normalizeMonster(book.monsters[id]);
        recordHabitat(entry, id, expedition.dungeonId, difficultyId, encounters?.[id] || 0, defeats?.[id] || 0);
        book.monsters[id] = entry;
      });
    }
    pendingFirstDefeats.forEach((firstDefeat, id) => {
      const entry = normalizeMonster(book.monsters[id]);
      entry.firstDefeat = firstDefeat;
      book.monsters[id] = entry;
    });
    Object.entries(observations || {}).forEach(([id, incoming]) => {
      if (!window.GameData.monsters[id]) return;
      const entry = normalizeMonster(book.monsters[id]);
      mergeRecordedObservation(entry, incoming);
      const difficulty = Object.assign(blankDifficulty(), entry.difficulties[difficultyId] || {});
      difficulty.encountered += Math.max(0, encounters?.[id] || 0);
      difficulty.defeated += Math.max(0, defeats?.[id] || 0);
      difficulty.encountered = Math.max(difficulty.encountered, difficulty.defeated);
      difficulty.drops = Array.from(new Set(difficulty.drops.concat(incoming.drops || [])));
      difficulty.skillIds = Array.from(new Set(difficulty.skillIds.concat(incoming.difficultySkillIds || [])));
      entry.difficulties[difficultyId] = difficulty;
      book.monsters[id] = entry;
    });
    return newFirstDefeats;
  }
  function item(id) { return ensure().items[id] || 0; }
  function bestQuality(id) { return ensure().bestQualities[id] || null; }
  function ultraRareTitle(id) { return ensure().ultraRareTitles.includes(id); }
  function monster(id) { return ensure().monsters[id] || null; }
  function unreadItems() { return ensure().unreadItems.slice(); }
  function unreadUltraRareTitles() { return ensure().unreadUltraRareTitles.slice(); }
  function unreadMonsters() { return ensure().unreadMonsters.slice(); }
  function trackedTarget() { const target = ensure().itemTarget; return target ? Object.assign({}, target) : null; }
  function trackedItem() { return trackedTarget()?.itemId || null; }
  function craftingTarget() { return ensure().craftingTargetId || null; }
  function setCraftingTarget(recipeId) {
    const book = ensure();
    if (recipeId === null) {
      book.craftingTargetId = null;
      window.GameState.save();
      return { ok: true, message: "製作目標を解除しました。" };
    }
    const recipe = window.GameData.recipes.find(entry => entry.id === recipeId);
    if (!recipe || window.Story && !window.Story.canCraft(recipe)) return { ok: false, message: "まだ選べない製作記録です。" };
    book.craftingTargetId = recipe.id;
    const needs = Object.entries(recipe.materials).map(([itemId, quantity]) => ({ itemId, quantity: Math.max(0, quantity - window.Items.count(itemId)) }))
      .filter(entry => entry.quantity > 0)
      .sort((left, right) => right.quantity - left.quantity || window.GameData.items[left.itemId].name.localeCompare(window.GameData.items[right.itemId].name, "ja"));
    const next = needs[0] || null;
    if (next) book.itemTarget = { itemId: next.itemId, quantity: next.quantity, progress: 0 };
    window.GameState.save();
    const result = window.GameData.items[recipe.resultId];
    return { ok: true, message: `${result.name}を製作目標にしました。${next ? `${window.GameData.items[next.itemId].name}×${next.quantity}を次の探索目標にします。` : "必要な素材は揃っています。"}`, itemId: next?.itemId || null, targetQuantity: next?.quantity || 0 };
  }
  function targetKnown(book, itemId) {
    if (book.items[itemId]) return true;
    const story = window.GameState.data.story;
    return (window.GameData.recipes || []).some(recipe => recipe.materials?.[itemId] && (!recipe.unlockAfter || story.completed.includes(recipe.unlockAfter) || story.facts.clears.includes(recipe.unlockAfter)));
  }
  function setTrackedItem(itemId, targetQuantity = 1, resetProgress = false) {
    const book = ensure();
    if (itemId === null) {
      book.itemTarget = null;
      window.GameState.save();
      return { ok: true, message: "探索目標を解除しました。" };
    }
    const template = window.GameData.items[itemId];
    if (!template || !targetKnown(book, itemId)) return { ok: false, message: "未発見で、製作記録にもない品は探索目標にできません。" };
    if (!Number.isInteger(targetQuantity) || targetQuantity < 1 || targetQuantity > 999) return { ok: false, message: "必要数は1〜999で指定してください。" };
    const progress = !resetProgress && book.itemTarget?.itemId === itemId ? book.itemTarget.progress : 0;
    book.itemTarget = { itemId, quantity: targetQuantity, progress };
    window.GameState.save();
    return { ok: true, message: `${template.name}×${targetQuantity}を探索目標に設定しました。` };
  }
  function recordTargetProgress(itemId, quantity) {
    const book = ensure();
    const target = book.itemTarget;
    if (!target || target.itemId !== itemId || !Number.isInteger(quantity) || quantity <= 0) return null;
    target.progress = Math.min(Number.MAX_SAFE_INTEGER, target.progress + quantity);
    const recorded = Object.assign({}, target);
    if (target.progress < target.quantity || !book.craftingTargetId) return recorded;
    const recipe = window.GameData.recipes.find(entry => entry.id === book.craftingTargetId);
    if (!recipe || !Object.prototype.hasOwnProperty.call(recipe.materials, itemId) || window.Items.count(itemId) < recipe.materials[itemId]) return recorded;
    const remaining = Object.entries(recipe.materials)
      .map(([requiredItemId, required]) => ({ itemId: requiredItemId, quantity: Math.max(0, required - window.Items.count(requiredItemId)) }))
      .filter(entry => entry.quantity > 0)
      .sort((left, right) => right.quantity - left.quantity || window.GameData.items[left.itemId].name.localeCompare(window.GameData.items[right.itemId].name, "ja"));
    const next = remaining[0] || null;
    book.itemTarget = next ? { itemId: next.itemId, quantity: next.quantity, progress: 0 } : null;
    recorded.craftingAdvance = {
      recipeId: recipe.id,
      resultId: recipe.resultId,
      completedItemId: itemId,
      nextItemId: next?.itemId || null,
      nextQuantity: next?.quantity || 0,
      materialsReady: !next
    };
    return recorded;
  }
  function trackedMonsterTarget() { const target = ensure().monsterTarget; return target ? Object.assign({}, target) : null; }
  function setTrackedMonster(monsterId, targetQuantity = 1, resetProgress = false) {
    const book = ensure();
    if (monsterId === null) {
      book.monsterTarget = null;
      window.GameState.save();
      return { ok: true, message: "討伐目標を解除しました。" };
    }
    const monster = window.GameData.monsters[monsterId];
    if (!monster || !book.monsters[monsterId]) return { ok: false, message: "まだ遭遇していない魔物は討伐目標にできません。" };
    if (!Number.isInteger(targetQuantity) || targetQuantity < 1 || targetQuantity > 999) return { ok: false, message: "目標数は1〜999で指定してください。" };
    const progress = !resetProgress && book.monsterTarget?.monsterId === monsterId ? book.monsterTarget.progress : 0;
    book.monsterTarget = { monsterId, quantity: targetQuantity, progress };
    window.GameState.save();
    return { ok: true, message: `${monster.name}×${targetQuantity}体を討伐目標に設定しました。` };
  }
  function recordMonsterTargetProgress(monsterId, quantity) {
    const target = ensure().monsterTarget;
    if (!target || target.monsterId !== monsterId || !Number.isInteger(quantity) || quantity <= 0) return null;
    target.progress = Math.min(Number.MAX_SAFE_INTEGER, target.progress + quantity);
    return Object.assign({}, target);
  }
  function setTrackedHarvest(itemId, monsterId) {
    const book = ensure();
    const item = window.GameData.items[itemId], monsterDefinition = window.GameData.monsters[monsterId];
    const monsterRecord = book.monsters[monsterId];
    if (!item || !targetKnown(book, itemId) || !monsterDefinition || !monsterRecord) return { ok: false, message: "まだ結び付けられない探索記録です。" };
    const observedFixedDrop = Object.entries(monsterRecord.difficulties || {}).some(([difficultyId, entry]) =>
      (entry?.drops || []).includes(itemId) && window.MonsterLoot?.fixedDropIds?.(monsterId, difficultyId).includes(itemId));
    if (!observedFixedDrop) return { ok: false, message: "この魔物から得た固有品として、まだ確認されていません。" };
    const previousItemTarget = book.itemTarget, previousMonsterTarget = book.monsterTarget;
    const nextHuntMark = huntMarks(monsterId).find(mark => !mark.achieved);
    book.itemTarget = previousItemTarget?.itemId === itemId
      ? previousItemTarget
      : { itemId, quantity: 1, progress: 0 };
    book.monsterTarget = previousMonsterTarget?.monsterId === monsterId
      ? previousMonsterTarget
      : { monsterId, quantity: nextHuntMark ? Math.max(1, nextHuntMark.threshold - monsterRecord.defeated) : 100, progress: 0 };
    window.GameState.save();
    return { ok: true, message: `${monsterDefinition.name}を追い、${item.name}を探す記録を結びました。` };
  }
  function markItemsRead() { const book = ensure(); if (book.unreadItems.length || book.unreadUltraRareTitles.length) { book.unreadItems = []; book.unreadUltraRareTitles = []; window.GameState.save(); } return { ok: true }; }
  function markMonstersRead() { const book = ensure(); if (book.unreadMonsters.length) { book.unreadMonsters = []; window.GameState.save(); } return { ok: true }; }
  function itemAcquisitionSources(id) {
    const template = window.GameData.items[id];
    if (!template) return { shop: false, recipes: [], treasures: [], monsters: [] };
    const equipment = ["weapon", "armor"].includes(template.type);
    const shop = equipment && !template.unique && !template.craftOnly && !template.dropOnly;
    const recipes = (window.GameData.recipes || []).filter(recipe => recipe.resultId === id).map(recipe => ({ id: recipe.id, name: recipe.name }));
    const treasures = Object.values(window.GameData.dungeons).filter(dungeon => (dungeon.drops || []).some(drop => drop.itemId === id)).map(dungeon => ({ dungeonId: dungeon.id, dungeonName: dungeon.name }));
    const monsters = [];
    Object.values(window.GameData.dungeons).forEach(dungeon => {
      const residents = Array.from(new Set(dungeon.encounters.flatMap(encounter => encounter.groups.flat())));
      residents.forEach(monsterId => {
        const baseMonster = window.GameData.monsters[monsterId];
        window.DungeonDifficulty.ids().forEach(difficultyId => {
          const variantDungeon = window.DungeonDifficulty.variant(dungeon, difficultyId);
          const variantMonster = window.DungeonDifficulty.monster(baseMonster, difficultyId);
          const fixed = window.MonsterLoot.materialDrops(baseMonster).some(drop => drop.itemId === id)
            || (variantMonster.signatureDropTiers || []).some(entry => (entry.drops.materials || []).some(drop => drop.itemId === id) || entry.drops.equipment?.itemId === id)
            || baseMonster.bossDrop?.itemId === id;
          const standard = equipment && window.MonsterLoot.preview(variantDungeon, baseMonster).some(candidate => candidate.id === id);
          if (!fixed && !standard) return;
          monsters.push({
            dungeonId: dungeon.id, difficultyId, monsterId,
            dungeonName: variantDungeon.name, monsterName: variantMonster.name,
            kind: fixed ? "fixed" : "standard"
          });
        });
      });
    });
    return { shop, recipes, treasures, monsters };
  }
  function itemSources(id) {
    const detail = itemAcquisitionSources(id), sources = [];
    if (detail.shop) sources.push("商店");
    if (detail.recipes.length) sources.push("鍛冶屋");
    detail.treasures.forEach(entry => sources.push(`${entry.dungeonName}の宝箱`));
    detail.monsters.forEach(entry => sources.push(entry.monsterName));
    return Array.from(new Set(sources));
  }
  function monsterHabitats(id) {
    const entry = monster(id);
    if (!entry) return [];
    return Object.entries(entry.habitats || {}).flatMap(([dungeonId, difficulties]) => Object.entries(difficulties || {})
      .filter(([, habitat]) => habitat?.encountered > 0)
      .map(([difficultyId, habitat]) => ({ dungeonId, difficultyId, encountered: habitat.encountered, defeated: habitat.defeated || 0 })));
  }
  function habitatSurvey(dungeonId, difficultyId = "normal") {
    const monsterIds = dungeonMonsterIds(dungeonId);
    const confirmed = monsterIds.filter(monsterId => monsterHabitats(monsterId).some(habitat => habitat.dungeonId === dungeonId && habitat.difficultyId === difficultyId)).length;
    return { dungeonId, difficultyId, confirmed, total: monsterIds.length, complete: Boolean(monsterIds.length && confirmed === monsterIds.length) };
  }
  function monsterDungeons(id) {
    return Array.from(new Set(monsterHabitats(id).map(habitat => window.GameData.dungeons[habitat.dungeonId]?.shortName).filter(Boolean)));
  }

  ensure();
  window.Encyclopedia = { ensure, recordItem, recordItemDiscovery, recordQuality, recordUltraRareTitle, battleInsights, habitatInsights, habitatSurvey, recordBattle, item, itemDiscovery, itemDiscoveriesByCharacter, recentItemDiscoveries, monsterFirstDefeatsByCharacter, recentMonsterFirstDefeats, huntMarks, huntFamiliarity, crossedHuntMarks, bestQuality, ultraRareTitle, monster, monsterHabitats, unreadItems, unreadUltraRareTitles, unreadMonsters, trackedItem, trackedTarget, setTrackedItem, recordTargetProgress, craftingTarget, setCraftingTarget, trackedMonsterTarget, setTrackedMonster, recordMonsterTargetProgress, setTrackedHarvest, markItemsRead, markMonstersRead, itemAcquisitionSources, itemSources, monsterDungeons };
})();
