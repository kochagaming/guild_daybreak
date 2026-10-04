(function () {
  "use strict";

  function blankObservations() { return { incomingAttempts: 0, incomingHits: 0, enemyTurns: 0, maxAttackCount: 0, magicAttack: false, rearTargeting: false, attackElements: [], statusAttacks: [], elementWeaknesses: [], elementResistances: [], statusResisted: [], statusLanded: [], burstRounds: [], difficultySkillIds: [], drops: [] }; }
  function blankDifficulty() { return { encountered: 0, defeated: 0, drops: [], skillIds: [] }; }
  function blankMonster() { return { encountered: 0, defeated: 0, observations: blankObservations(), difficulties: {} }; }
  function blank() { return { version: 9, items: {}, bestQualities: {}, ultraRareTitles: [], monsters: {}, unreadItems: [], unreadUltraRareTitles: [], unreadMonsters: [], itemTarget: null }; }
  function normalizeMonster(entry) {
    const normalized = Object.assign(blankMonster(), entry || {});
    normalized.observations = Object.assign(blankObservations(), entry?.observations || {});
    normalized.difficulties = Object.fromEntries(Object.entries(entry?.difficulties || {}).map(([id, value]) => [id, Object.assign(blankDifficulty(), value || {})]));
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
    } else if (state.encyclopedia.version !== 9 || !state.encyclopedia.bestQualities || !Array.isArray(state.encyclopedia.ultraRareTitles) || !Array.isArray(state.encyclopedia.unreadUltraRareTitles) || !Array.isArray(state.encyclopedia.unreadItems) || !Array.isArray(state.encyclopedia.unreadMonsters) || !(state.encyclopedia.itemTarget === null || typeof state.encyclopedia.itemTarget === "object")) {
      const legacyTargetId = state.encyclopedia.trackedItemId;
      state.encyclopedia.version = 9;
      state.encyclopedia.items = state.encyclopedia.items || {};
      state.encyclopedia.bestQualities = state.encyclopedia.bestQualities || {};
      state.encyclopedia.ultraRareTitles = Array.isArray(state.encyclopedia.ultraRareTitles) ? state.encyclopedia.ultraRareTitles : [];
      state.encyclopedia.monsters = state.encyclopedia.monsters || {};
      state.encyclopedia.unreadItems = Array.isArray(state.encyclopedia.unreadItems) ? state.encyclopedia.unreadItems : [];
      state.encyclopedia.unreadUltraRareTitles = Array.isArray(state.encyclopedia.unreadUltraRareTitles) ? state.encyclopedia.unreadUltraRareTitles : [];
      state.encyclopedia.unreadMonsters = Array.isArray(state.encyclopedia.unreadMonsters) ? state.encyclopedia.unreadMonsters : [];
      state.encyclopedia.itemTarget = window.GameData.items[legacyTargetId] && state.encyclopedia.items[legacyTargetId] ? { itemId: legacyTargetId, quantity: 1, progress: 0 } : null;
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
    });
    Object.entries(itemMinimums).forEach(([id, quantity]) => { book.items[id] = Math.max(book.items[id] || 0, quantity); });
    (state.story?.facts?.clears || []).forEach(dungeonId => {
      dungeonMonsterIds(dungeonId).forEach(id => {
        const entry = normalizeMonster(book.monsters[id]);
        entry.encountered = Math.max(entry.encountered, 1);
        if (window.GameData.monsters[id].boss) entry.defeated = Math.max(entry.defeated, 1);
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
  function recordQuality(itemId, qualityId) { return considerQuality(ensure(), itemId, qualityId); }
  function recordUltraRareTitle(titleId) { return discoverUltraRareTitle(ensure(), titleId, true); }
  function recordBattle(encounters, defeats, observations, difficultyId = "normal") {
    const book = ensure();
    Object.entries(encounters || {}).forEach(([id, count]) => addMonster(book, id, count, 0));
    Object.entries(defeats || {}).forEach(([id, count]) => addMonster(book, id, 0, count));
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
    const target = ensure().itemTarget;
    if (!target || target.itemId !== itemId || !Number.isInteger(quantity) || quantity <= 0) return null;
    target.progress = Math.min(Number.MAX_SAFE_INTEGER, target.progress + quantity);
    return Object.assign({}, target);
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
  function monsterDungeons(id) {
    return Object.values(window.GameData.dungeons)
      .filter(dungeon => dungeonMonsterIds(dungeon.id).includes(id))
      .map(dungeon => dungeon.shortName);
  }

  ensure();
  window.Encyclopedia = { ensure, recordItem, recordQuality, recordUltraRareTitle, battleInsights, recordBattle, item, bestQuality, ultraRareTitle, monster, unreadItems, unreadUltraRareTitles, unreadMonsters, trackedItem, trackedTarget, setTrackedItem, recordTargetProgress, markItemsRead, markMonstersRead, itemAcquisitionSources, itemSources, monsterDungeons };
})();
