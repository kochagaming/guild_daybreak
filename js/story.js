(function () {
  "use strict";
  const chapters = () => window.GameData.storyChapters;
  const mainChapters = () => chapters().filter(chapter => chapter.kind !== "postgame");
  const postgameChapters = () => chapters().filter(chapter => chapter.kind === "postgame");
  const dungeons = () => Object.values(window.GameData.dungeons);
  function ensure() {
    const story = window.GameState.data.story;
    if (!Array.isArray(story.facts.discoveries)) story.facts.discoveries = [];
    if (!Array.isArray(story.facts.companionMoments)) story.facts.companionMoments = [];
    if (Array.isArray(story.facts.routeEvents)) story.facts.routeEvents = Object.fromEntries(story.facts.routeEvents.map(id => [id, { encounters: 1, successes: 0, rumorMatches: 0 }]));
    else if (!story.facts.routeEvents || typeof story.facts.routeEvents !== "object") story.facts.routeEvents = {};
    Object.values(story.facts.routeEvents).forEach(record => { if (record.rumorMatches == null) record.rumorMatches = 0; });
    if (!story.facts.treasureTiers || typeof story.facts.treasureTiers !== "object" || Array.isArray(story.facts.treasureTiers)) story.facts.treasureTiers = {};
    if (!Number.isInteger(story.facts.teamSurveys) || story.facts.teamSurveys < 0) story.facts.teamSurveys = 0;
    if (typeof story.facts.retryPreparationObserved !== "boolean") story.facts.retryPreparationObserved = false;
    if (typeof story.facts.retryPreparationOvercome !== "boolean") story.facts.retryPreparationOvercome = false;
    if (!Array.isArray(story.joinedCompanionIds)) story.joinedCompanionIds = [];
    if (!Array.isArray(story.readSceneIds)) story.readSceneIds = [];
    return story;
  }
  function scene(id) {
    const base = window.GameData.storyScenes[id];
    const overlay = window.GameData.relations?.storySceneOverlays?.[id];
    const script = window.GameData.relations?.storySceneScripts?.[id];
    if (!base) return base;
    return Object.assign({}, base, overlay || {}, script ? { script: script.blocks } : {});
  }
  function chapterUnlockText(chapterOrId) {
    const chapter = typeof chapterOrId === "string" ? chapters().find(entry => entry.id === chapterOrId) : chapterOrId;
    if (!chapter) return "";
    const additions = (window.GameData.relations?.chapterUnlockAdditions || []).filter(entry => entry.chapterId === chapter.id).map(entry => entry.text);
    return [chapter.unlockText, ...additions].filter(Boolean).join("、");
  }
  function chapterDungeons(chapterId) {
    return dungeons().filter(dungeon => dungeon.chapterId === chapterId).sort((a, b) => a.orderInChapter - b.orderInChapter);
  }
  function requirementSatisfied(requirement, state = window.GameState.data, completedIds = null) {
    const story = state.story;
    if (requirement.type === "characters") return state.characters.length >= requirement.minimum;
    if (requirement.type === "departure") return story.facts.departed;
    if (requirement.type === "dungeonClear") return story.facts.clears.includes(requirement.dungeonId);
    if (requirement.type === "difficultyClear") return (story.facts.difficultyClears || []).some(key => {
      const [dungeonId, difficultyId] = String(key).split(":");
      return difficultyId === requirement.difficultyId && (!requirement.dungeonId || dungeonId === requirement.dungeonId);
    });
    if (requirement.type === "difficultyChapterCompleted") {
      const cleared = new Set(story.facts.difficultyClears || []);
      const completedChapterCount = mainChapters().filter(chapter => {
        const requiredRoutes = chapterDungeons(chapter.id).filter(dungeon => dungeon.requiredForStory);
        return requiredRoutes.length && requiredRoutes.every(dungeon => cleared.has(`${dungeon.id}:${requirement.difficultyId}`));
      }).length;
      return completedChapterCount >= (requirement.target || 1);
    }
    if (requirement.type === "chapterCompleted") return (completedIds || story.completed).includes(requirement.chapterId);
    if (requirement.type === "itemOwned") {
      const materialCount = state.inventory?.materials?.[requirement.itemId] || 0;
      const equipmentCount = (state.inventory?.equipment || []).filter(item => item.templateId === requirement.itemId).length;
      return materialCount + equipmentCount >= (requirement.quantity || 1);
    }
    if (requirement.type === "itemDiscovered") return (state.encyclopedia?.items?.[requirement.itemId] || 0) >= (requirement.quantity || 1);
    if (requirement.type === "routeEventEncountered") return (story.facts.routeEvents?.[requirement.routeEventId]?.encounters || 0) > 0;
    if (requirement.type === "routeEventMastered") return (story.facts.routeEvents?.[requirement.routeEventId]?.successes || 0) >= requirement.successes;
    if (requirement.type === "treasureTierEncountered") return (story.facts.treasureTiers?.[requirement.treasureTierId]?.encounters || 0) > 0;
    if (requirement.type === "treasureTierMastered") return (story.facts.treasureTiers?.[requirement.treasureTierId]?.openings || 0) >= requirement.openings;
    if (requirement.type === "retryPreparation") return story.facts.retryPreparationObserved;
    if (requirement.type === "retryPreparationOvercome") return story.facts.retryPreparationOvercome;
    if (requirement.type === "sharedSorties") return Math.max(0, ...Object.values(state.adventurerBonds?.pairs || {}).map(count => Number(count) || 0)) >= requirement.minimum;
    if (requirement.type === "routeMentorship") return (state.characters || []).some(character => (character.expeditionRecord?.routeMentorships || []).some(entry => entry?.role === "mentor"));
    if (requirement.type === "routeMentorshipLineage") return window.Characters.routeMentorshipLineageCount(state) > 0;
    if (requirement.type === "skillMastery") {
      const rank = (window.GameData.config.characterGrowth?.skillMasteryRanks || []).find(entry => entry.id === requirement.rankId);
      return Boolean(rank && (state.characters || []).some(character => Object.values(character.expeditionRecord?.skillRecords || {}).some(record => Number(record.uses || 0) >= rank.minimumUses)));
    }
    if (requirement.type === "targetedHarvestPractice") {
      const tier = (window.GameData.config.explorationEvents?.targetedHarvestPractice || []).find(entry => entry.id === requirement.tierId);
      return Boolean(tier && (state.characters || []).some(character => Object.values(character.expeditionRecord?.targetedHarvestRecords || {}).some(record => Number(record.successes || 0) >= tier.minimumSuccesses)));
    }
    if (requirement.type === "targetedHarvestPersistence") {
      const tier = (window.GameData.config.explorationEvents?.targetedHarvestPersistence || []).find(entry => entry.id === requirement.tierId);
      return Boolean(tier && (state.characters || []).some(character => Object.values(character.expeditionRecord?.targetedHarvestRecords || {}).some(record => Math.max(0, Number(record.attempts || 0) - Number(record.successes || 0)) >= tier.minimumMisses)));
    }
    if (requirement.type === "targetedHarvestConsultation") {
      const practiceMinimum = Math.min(...(window.GameData.config.explorationEvents?.targetedHarvestPractice || []).map(entry => entry.minimumSuccesses));
      const persistenceMinimum = Math.min(...(window.GameData.config.explorationEvents?.targetedHarvestPersistence || []).map(entry => entry.minimumMisses));
      const practices = new Map(), persistences = new Map();
      (state.characters || []).forEach(character => Object.entries(character.expeditionRecord?.targetedHarvestRecords || {}).forEach(([key, record]) => {
        if (Number(record.successes || 0) >= practiceMinimum) (practices.get(key) || practices.set(key, []).get(key)).push(character.id);
        if (Math.max(0, Number(record.attempts || 0) - Number(record.successes || 0)) >= persistenceMinimum) (persistences.get(key) || persistences.set(key, []).get(key)).push(character.id);
      }));
      return [...practices].some(([key, practicedIds]) => practicedIds.some(practicedId => (persistences.get(key) || []).some(persistentId => persistentId !== practicedId)));
    }
    return false;
  }
  function requirementsMet(requirements, state, completedIds = null) { return (requirements || []).every(requirement => requirementSatisfied(requirement, state, completedIds)); }
  function hasReadScene(sceneId, state = window.GameState.data) { return !sceneId || (state.story.readSceneIds || []).includes(sceneId); }
  function baseChapterSatisfied(chapter, state = window.GameState.data, completedIds = null) {
    const requiredRoutes = chapterDungeons(chapter.id).filter(dungeon => dungeon.requiredForStory);
    return requirementsMet(chapter.entryRequirements, state, completedIds) && requiredRoutes.every(dungeon => state.story.facts.clears.includes(dungeon.id));
  }
  function satisfied(chapter, state = window.GameState.data) {
    return baseChapterSatisfied(chapter, state);
  }
  function triggerSatisfied(trigger, state = window.GameState.data) {
    const when = trigger?.when;
    if (!when) return false;
    if (when.type === "chapterActive") return state.story.completed.includes(when.chapterId) || current()?.id === when.chapterId;
    if (when.type === "chapterCompleted") return state.story.completed.includes(when.chapterId);
    if (when.type === "dungeonOpened") return canEnter(when.dungeonId, state);
    if (when.type === "dungeonDiscovered") return state.story.facts.discoveries.includes(when.dungeonId);
    if (when.type === "dungeonCleared") return state.story.facts.clears.includes(when.dungeonId);
    return false;
  }
  function applyStoryTriggers(state = window.GameState.data) {
    const results = (window.GameData.relations?.storyTriggers || [])
      .filter(trigger => triggerSatisfied(trigger, state))
      .map(trigger => ({ triggerId: trigger.id, result: window.StoryEffects?.applyAll(trigger.effects) }));
    return { changed: results.some(entry => entry.result?.changed), results };
  }
  function sync() {
    const story = ensure(), newlyCompleted = [];
    let effectsChanged = false;
    for (const chapter of chapters()) {
      if (story.completed.includes(chapter.id)) continue;
      if (!satisfied(chapter)) break;
      story.completed.push(chapter.id);
      window.GameState.data.gold += chapter.rewards.gold;
      Object.entries(chapter.rewards.materials).forEach(([id, quantity]) => window.Items.add(id, quantity));
      window.GameState.addLog(`${chapter.title}達成。${scene(chapter.clearStoryId).text} 解放・報酬：${chapterUnlockText(chapter)}`, "success");
      newlyCompleted.push(chapter.id);
    }
    if (applyStoryTriggers().changed) effectsChanged = true;
    newlyCompleted.changed = newlyCompleted.length > 0 || effectsChanged;
    return newlyCompleted;
  }
  function recordDeparture(dungeonId) { if (dungeonId === "meadow") ensure().facts.departed = true; return sync(); }
  function recordResult(result) {
    const story = ensure();
    if (!result.success && result.retryPreparationGrowth) story.facts.retryPreparationObserved = true;
    if (result.success && result.retryPreparation) {
      story.facts.retryPreparationObserved = true;
      story.facts.retryPreparationOvercome = true;
    }
    const companionsBefore = new Set(story.joinedCompanionIds);
    const companionStagesBefore = Object.assign({}, story.companionStages || {});
    const recipeUnlocksBefore = new Set(window.GameData.recipes.filter(canCraft).map(recipe => recipe.id));
    const difficultyId = result.difficultyId || "normal";
    const firstClear = result.success && difficultyId === "normal" && !story.facts.clears.includes(result.dungeonId);
    const unlockedBefore = new Set(dungeons().filter(dungeon => canEnter(dungeon.id)).map(dungeon => dungeon.id));
    const storyMoments = [];
    const dungeon = window.GameData.dungeons[result.dungeonId];
    const companionMomentMap = new Map((window.GameData.config.explorationEvents?.companionMoments || []).map(moment => [moment.id, moment]));
    const companionMemoriesBefore = new Set(story.facts.companionMoments);
    const newCompanionMomentKeys = [];
    const newRumorConfirmationIds = [];
    (result.battleLog || []).filter(entry => entry.routeEventId).forEach(entry => {
      const record = story.facts.routeEvents[entry.routeEventId] || { encounters: 0, successes: 0, rumorMatches: 0 };
      record.encounters += 1;
      if (entry.routeEventSuccess) record.successes += 1;
      if (entry.routeRumorMatched) {
        if (!record.rumorMatches) newRumorConfirmationIds.push(entry.routeEventId);
        record.rumorMatches += 1;
      }
      story.facts.routeEvents[entry.routeEventId] = record;
    });
    if (newRumorConfirmationIds.length) {
      result.newRumorConfirmationIds = [...new Set(newRumorConfirmationIds)];
      const reward = window.GameData.config.explorationEvents.rumorConfirmationReward;
      const quantity = reward.quantity * result.newRumorConfirmationIds.length;
      window.Items.add(reward.itemId, quantity);
      result.rumorConfirmationReward = { itemId: reward.itemId, quantity };
      window.GameState.addLog(`噂の照合記録を持ち帰り、${window.GameData.items[reward.itemId].name}×${quantity}を受け取りました。`, "success");
    }
    (result.battleLog || []).filter(entry => entry.kind === "treasure" && entry.treasureTierId).forEach(entry => {
      const record = story.facts.treasureTiers[entry.treasureTierId] || { encounters: 0, openings: 0 };
      record.encounters += 1;
      if (entry.treasureOpened !== false) record.openings += 1;
      story.facts.treasureTiers[entry.treasureTierId] = record;
    });
    story.facts.teamSurveys += (result.battleLog || []).filter(entry => entry.routeTeamSurveyApplied).length;
    (result.battleLog || []).filter(entry => entry.kind === "companion" && entry.momentId && Number.isInteger(entry.companionLineIndex)).forEach(entry => {
      const key = `${entry.momentId}:${entry.companionLineIndex}`;
      if (!story.facts.companionMoments.includes(key)) {
        story.facts.companionMoments.push(key);
        newCompanionMomentKeys.push(key);
      }
    });
    if (newCompanionMomentKeys.length) result.newCompanionMomentKeys = newCompanionMomentKeys;
    const completedCompanionBonds = [...new Set(newCompanionMomentKeys.map(key => key.slice(0, key.lastIndexOf(":"))))].map(momentId => {
      const moment = companionMomentMap.get(momentId);
      if (!moment || moment.companionIds.length < 2) return null;
      const keys = moment.lines.map((line, lineIndex) => `${moment.id}:${lineIndex}`);
      if (keys.every(key => companionMemoriesBefore.has(key)) || !keys.every(key => story.facts.companionMoments.includes(key))) return null;
      const reward = window.GameData.config.explorationEvents.companionBondReward;
      window.Items.add(reward.itemId, reward.quantity);
      window.GameState.addLog(`${moment.title}――二人の同行記録が結ばれ、${window.GameData.items[reward.itemId].name}×${reward.quantity}を受け取りました。`, "success");
      return { momentId: moment.id, companionIds: [...moment.companionIds], rewardItemId: reward.itemId, rewardQuantity: reward.quantity };
    }).filter(Boolean);
    if (completedCompanionBonds.length) result.completedCompanionBonds = completedCompanionBonds;
    const foundDiscovery = result.battleLog?.some(entry => entry.kind === "story" && entry.sceneId === dungeonStoryLinks(dungeon).discoveryStoryId);
    if (foundDiscovery && !story.facts.discoveries.includes(result.dungeonId)) {
      story.facts.discoveries.push(result.dungeonId);
      const discovery = dungeonDiscoveryScene(dungeon);
      if (discovery) {
        storyMoments.push({ kind: "discovery", dungeonId: dungeon.id, sceneId: discovery.id });
        window.GameState.addLog(`${dungeon.name}の探索で手掛かりを発見。${discovery.text}`, "info");
      }
    }
    if (firstClear) {
      story.facts.clears.push(result.dungeonId);
      const ending = dungeonEndingScene(dungeon);
      if (ending) {
        storyMoments.push({ kind: "ending", dungeonId: dungeon.id, sceneId: ending.id });
        window.GameState.addLog(`${dungeon.name}を攻略。${ending.text}`, "success");
      }
    }
    if (result.success && difficultyId !== "normal" && window.DungeonDifficulty) window.DungeonDifficulty.recordClear(result.dungeonId, difficultyId);
    const completed = sync();
    const newCompanionIds = story.joinedCompanionIds.filter(id => !companionsBefore.has(id));
    if (newCompanionIds.length) result.newCompanionIds = newCompanionIds;
    const companionAdvancements = Object.entries(story.companionStages || {}).filter(([id, stageId]) => companionStagesBefore[id] && companionStagesBefore[id] !== stageId).map(([companionId, stageId]) => ({ companionId, stageId, previousStageId: companionStagesBefore[companionId] }));
    if (companionAdvancements.length) result.companionAdvancements = companionAdvancements;
    if (firstClear) dungeons().filter(dungeon => !unlockedBefore.has(dungeon.id) && canEnter(dungeon.id)).forEach(dungeon => {
      const opening = dungeonOpeningScene(dungeon);
      if (opening) {
        storyMoments.push({ kind: "opening", dungeonId: dungeon.id, sceneId: opening.id });
        window.GameState.addLog(`${dungeon.name}が解放されました。${opening.text}`, "info");
      }
    });
    if (storyMoments.length) result.storyMoments = storyMoments;
    const newRecipeIds = window.GameData.recipes.filter(recipe => canCraft(recipe) && !recipeUnlocksBefore.has(recipe.id)).map(recipe => recipe.id);
    if (newRecipeIds.length) {
      result.newRecipeIds = newRecipeIds;
      const names = newRecipeIds.map(id => window.GameData.recipes.find(recipe => recipe.id === id)).filter(Boolean).map(recipe => window.GameData.items[recipe.resultId]?.name || recipe.id);
      window.GameState.addLog(`鍛冶屋に新しい製作記録が加わりました。${names.join("、")}`, "success");
    }
    return completed;
  }
  function rawCanEnter(id, state = window.GameState.data, completedIds = null) {
    const dungeon = window.GameData.dungeons[id];
    return Boolean(dungeon && requirementsMet(dungeon.unlockRequirements, state, completedIds));
  }
  function canEnter(id, state = window.GameState.data) {
    const dungeon = window.GameData.dungeons[id];
    if (!dungeon || !rawCanEnter(id, state)) return false;
    if (dungeon.id === "meadow") return true;
    if (dungeon.requiredForStory === false) return true;
    return hasReadScene(dungeonStoryLinks(dungeon).openingStoryId, state);
  }
  function canCraft(recipe) {
    if (!recipe.unlockAfter) return true;
    const story = ensure();
    return story.completed.includes(recipe.unlockAfter) || story.facts.clears.includes(recipe.unlockAfter);
  }
  function requirementText(requirement) {
    if (requirement.type === "chapterCompleted") return `${chapters().find(chapter => chapter.id === requirement.chapterId)?.title || "指定章"}の達成`;
    if (requirement.type === "dungeonClear") return `${window.GameData.dungeons[requirement.dungeonId]?.name || "指定ダンジョン"}の攻略`;
    if (requirement.type === "characters") return `冒険者${requirement.minimum}人の雇用`;
    if (requirement.type === "departure") return "最初の出発";
    if (requirement.type === "itemOwned") return `${window.GameData.items[requirement.itemId]?.name || "指定アイテム"}×${requirement.quantity || 1}の所持`;
    return "物語の進行";
  }
  function dungeonCondition(id) {
    const dungeon = window.GameData.dungeons[id];
    if (!dungeon) return "存在しない攻略先です";
    if (rawCanEnter(id) && !canEnter(id)) return "ホームで物語を読み終えると解放";
    return `${dungeon.unlockRequirements.map(requirementText).join("・")}で解放`;
  }
  function recipeCondition(recipe) {
    const chapter = chapters().find(candidate => candidate.id === recipe.unlockAfter);
    const dungeon = window.GameData.dungeons[recipe.unlockAfter];
    if (chapter) return `${chapter.title}達成で解放`;
    if (dungeon) return `${dungeon.name}攻略で解放`;
    return recipe.unlockAfter ? "物語の依頼達成で解放" : "解放済み";
  }
  function current() { return mainChapters().find(chapter => !ensure().completed.includes(chapter.id)); }
  function mainComplete() { return mainChapters().every(chapter => ensure().completed.includes(chapter.id)); }
  function dungeonStoryLinks(dungeon) { return dungeon ? window.GameData.relations?.dungeonStoryLinks?.[dungeon.baseDungeonId || dungeon.id] || {} : {}; }
  function dungeonOpeningScene(dungeon) { const id = dungeonStoryLinks(dungeon).openingStoryId; return id ? scene(id) : null; }
  function dungeonDiscoveryScene(dungeon) { const id = dungeonStoryLinks(dungeon).discoveryStoryId; return id ? scene(id) : null; }
  function dungeonEndingScene(dungeon) { return dungeon ? scene(dungeon.clearStoryId || dungeon.optionalStoryId) : null; }
  function projectedCompleted(state = window.GameState.data) {
    const projected = [...state.story.completed];
    for (const chapter of chapters()) {
      if (projected.includes(chapter.id)) continue;
      if (!baseChapterSatisfied(chapter, state, projected)) break;
      projected.push(chapter.id);
    }
    return projected;
  }
  function pendingEpisode(state = window.GameState.data) {
    const read = new Set(state.story.readSceneIds || []), projected = projectedCompleted(state);
    const orderedChapters = [...chapters()].sort((a, b) => a.order - b.order);
    const orderedRoutes = orderedChapters.flatMap(chapter => chapterDungeons(chapter.id).filter(dungeon => dungeon.requiredForStory));
    const target = orderedRoutes.find(dungeon => !state.story.facts.clears.includes(dungeon.id) && rawCanEnter(dungeon.id, state, projected)) || null;
    const currentChapter = current();
    const frontierOrder = target
      ? orderedChapters.find(chapter => chapter.id === target.chapterId)?.order ?? 0
      : currentChapter?.order ?? orderedChapters.at(-1)?.order ?? 0;
    const entries = [], added = new Set();
    const add = (kind, label, sourceScene, chapter, dungeon = null) => {
      if (!sourceScene || read.has(sourceScene.id) || added.has(sourceScene.id)) return;
      added.add(sourceScene.id);
      entries.push({ kind, label, scene: sourceScene, chapter, dungeon });
    };
    let reachedTarget = false;
    for (const chapter of orderedChapters) {
      if (chapter.order > frontierOrder) break;
      add("chapterOpening", "章の始まり", scene(chapter.openingStoryId), chapter);
      for (const dungeon of chapterDungeons(chapter.id).filter(route => route.requiredForStory)) {
        if (!rawCanEnter(dungeon.id, state, projected) && !state.story.facts.clears.includes(dungeon.id)) continue;
        add("dungeonOpening", "次の探索地", dungeonOpeningScene(dungeon), chapter, dungeon);
        if (state.story.facts.discoveries.includes(dungeon.id)) add("dungeonDiscovery", "探索で判明", dungeonDiscoveryScene(dungeon), chapter, dungeon);
        if (state.story.facts.clears.includes(dungeon.id)) add("dungeonEnding", "攻略後", dungeonEndingScene(dungeon), chapter, dungeon);
        if (target?.id === dungeon.id) { reachedTarget = true; break; }
      }
      if (baseChapterSatisfied(chapter, state, projected)) add("chapterEnding", "章の終わり", scene(chapter.clearStoryId), chapter);
      if (reachedTarget) break;
    }
    if (!entries.length) return null;
    const destination = target && entries.some(entry => entry.dungeon?.id === target.id && entry.kind === "dungeonOpening") ? target : null;
    const chapter = entries.at(-1).chapter;
    return {
      id: entries.map(entry => entry.scene.id).join("+"), entries, chapter, destination,
      title: destination ? `${destination.name}へ向かう前に` : `${chapter.title}の物語`,
      subtitle: destination ? `読み終えると「${destination.name}」が解放されます` : "物語の続きを記録します"
    };
  }
  function pendingEpisodeForResult(result, state = window.GameState.data) {
    if (!result) return null;
    const resultMoments = Array.isArray(result.storyMoments) ? result.storyMoments : [];
    const completedChapterIds = new Set(Array.isArray(result.storyCompleted) ? result.storyCompleted : []);
    if (!resultMoments.length && !completedChapterIds.size) return null;
    const episode = pendingEpisode(state);
    if (!episode) return null;
    const resultSceneIds = new Set(resultMoments.map(moment => moment.sceneId).filter(Boolean));
    return episode.entries.some(entry => resultSceneIds.has(entry.scene.id) || completedChapterIds.has(entry.chapter?.id)) ? episode : null;
  }
  function nextRouteAfterResult(result, state = window.GameState.data) {
    if (!result?.success || (result.difficultyId || "normal") !== "normal") return null;
    if (pendingEpisodeForResult(result, state)) return null;
    const progressed = (Array.isArray(result.storyMoments) && result.storyMoments.some(moment => moment.kind === "ending" || moment.kind === "opening"))
      || (Array.isArray(result.storyCompleted) && result.storyCompleted.length > 0);
    if (!progressed) return null;
    const orderedRoutes = [...chapters()].sort((left, right) => left.order - right.order)
      .flatMap(chapter => chapterDungeons(chapter.id).filter(dungeon => dungeon.requiredForStory));
    const currentIndex = orderedRoutes.findIndex(dungeon => dungeon.id === result.dungeonId);
    if (currentIndex < 0) return null;
    return orderedRoutes.slice(currentIndex + 1).find(dungeon => canEnter(dungeon.id, state) && !state.story.facts.clears.includes(dungeon.id)) || null;
  }
  function readPending(expectedEpisodeId = null) {
    const episode = pendingEpisode();
    if (!episode) return { ok: false, message: "今読むべき新しい物語はありません。" };
    if (expectedEpisodeId && episode.id !== expectedEpisodeId) return { ok: false, message: "探索の帰還で物語が進みました。いったん閉じて、最新の物語を開き直してください。" };
    const story = ensure(), before = new Set(dungeons().filter(dungeon => canEnter(dungeon.id)).map(dungeon => dungeon.id));
    episode.entries.forEach(entry => { if (!story.readSceneIds.includes(entry.scene.id)) story.readSceneIds.push(entry.scene.id); });
    const completed = sync();
    const unlockedDungeonIds = dungeons().filter(dungeon => !before.has(dungeon.id) && canEnter(dungeon.id)).map(dungeon => dungeon.id);
    window.GameState.addLog(`${episode.title}を読了しました。${unlockedDungeonIds.length ? `${unlockedDungeonIds.map(id => window.GameData.dungeons[id].name).join("、")}が解放されました。` : ""}`, "info");
    window.GameState.save();
    return { ok: true, message: unlockedDungeonIds.length ? `${window.GameData.dungeons[unlockedDungeonIds[0]].name}へ進めるようになりました。` : "物語を読み終えました。", sceneIds: episode.entries.map(entry => entry.scene.id), completed: [...completed], unlockedDungeonIds };
  }
  function chapterTimeline(chapterId) {
    const chapter = chapters().find(entry => entry.id === chapterId);
    if (!chapter) return [];
    const story = ensure(), completed = story.completed.includes(chapterId), events = [];
    events.push({ id: `chapter:${chapter.id}:opening`, kind: "chapterOpening", label: "章の始まり", scene: scene(chapter.openingStoryId), chapter });
    chapterDungeons(chapterId).forEach(dungeon => {
      if (!canEnter(dungeon.id) && !story.facts.clears.includes(dungeon.id)) return;
      const opening = dungeonOpeningScene(dungeon);
      if (opening) events.push({ id: `dungeon:${dungeon.id}:opening`, kind: "dungeonOpening", label: "探索地の解放", scene: opening, dungeon, chapter });
      if (story.facts.discoveries.includes(dungeon.id)) {
        const discovery = dungeonDiscoveryScene(dungeon);
        if (discovery) events.push({ id: `dungeon:${dungeon.id}:discovery`, kind: "dungeonDiscovery", label: "探索で判明", scene: discovery, dungeon, chapter });
      }
      if (story.facts.clears.includes(dungeon.id)) {
        const ending = dungeonEndingScene(dungeon);
        if (ending) events.push({ id: `dungeon:${dungeon.id}:ending`, kind: dungeon.requiredForStory ? "dungeonEnding" : "optionalEnding", label: dungeon.requiredForStory ? "攻略" : "任意攻略", scene: ending, dungeon, chapter });
      }
    });
    const ending = scene(chapter.clearStoryId);
    if (completed && ending && !events.some(event => event.kind.includes("Ending") && event.scene?.id === ending.id)) {
      events.push({ id: `chapter:${chapter.id}:ending`, kind: "chapterEnding", label: "章の終わり", scene: ending, chapter });
    }
    return events;
  }
  function sceneCharacterIds(sourceScene) {
    const source = typeof sourceScene === "string" ? scene(sourceScene) : sourceScene;
    if (!source) return [];
    const ids = [source.protagonistId, ...(source.castIds || []), ...(source.script || []).filter(block => block.kind === "dialogue").map(block => block.speakerId)];
    return [...new Set(ids.filter(id => id && window.GameData.storyCharacters?.[id]))];
  }
  function sceneCharacters(sourceScene) {
    return sceneCharacterIds(sourceScene).map(id => window.GameData.storyCharacters[id]);
  }
  function readTimeline() {
    const story = ensure(), read = new Set(story.readSceneIds || []), seen = new Set(), events = [];
    [...chapters()].sort((a, b) => a.order - b.order).forEach(chapter => {
      chapterTimeline(chapter.id).forEach(event => {
        if (!event.scene || !read.has(event.scene.id) || seen.has(event.scene.id)) return;
        seen.add(event.scene.id);
        events.push(event);
      });
    });
    return events;
  }
  function searchReadScenes(query, limit = 40) {
    const needle = String(query || "").normalize("NFKC").trim().toLocaleLowerCase("ja");
    const timeline = readTimeline();
    const matches = timeline.map(event => {
      const characters = sceneCharacters(event.scene);
      const script = Array.isArray(event.scene?.script) ? event.scene.script : [];
      const fields = [event.scene?.name, event.scene?.text, event.label, event.chapter?.title, event.dungeon?.name,
        ...characters.flatMap(character => [character.name, character.title]), ...script.map(block => block.text)].filter(Boolean);
      if (needle && !fields.some(value => String(value).normalize("NFKC").toLocaleLowerCase("ja").includes(needle))) return null;
      const matchingBlock = needle ? script.find(block => String(block.text || "").normalize("NFKC").toLocaleLowerCase("ja").includes(needle)) : null;
      return { ...event, characters, excerpt: matchingBlock?.text || event.scene.text };
    }).filter(Boolean).reverse();
    return matches.slice(0, Math.max(1, Math.min(100, Number(limit) || 40)));
  }
  function episodeCharacters(episode = pendingEpisode()) {
    if (!episode) return [];
    const ids = episode.entries.flatMap(entry => sceneCharacterIds(entry.scene));
    return [...new Set(ids)].map(id => window.GameData.storyCharacters[id]).filter(Boolean);
  }
  function characterChronicles() {
    const timeline = readTimeline(), records = new Map(), order = new Map(timeline.map((event, index) => [event.scene.id, index]));
    timeline.forEach(event => sceneCharacterIds(event.scene).forEach(characterId => {
      const record = records.get(characterId) || { character: window.GameData.storyCharacters[characterId], events: [] };
      if (!record.events.some(known => known.scene.id === event.scene.id)) record.events.push(event);
      records.set(characterId, record);
    }));
    return [...records.values()].filter(record => record.character).sort((a, b) => {
      const latestA = order.get(a.events.at(-1)?.scene.id) ?? -1;
      const latestB = order.get(b.events.at(-1)?.scene.id) ?? -1;
      return latestB - latestA || b.events.length - a.events.length || a.character.name.localeCompare(b.character.name, "ja");
    });
  }
  function storyGuide() {
    const timeline = readTimeline(), episode = pendingEpisode(), latest = timeline.at(-1) || null;
    return {
      latest,
      recent: timeline.slice(-3),
      episode,
      cast: episodeCharacters(episode),
      nextScene: episode?.entries?.[0] || null,
      readCount: timeline.length
    };
  }
  function deriveMysteries(read) {
    return (window.GameData.relations?.storyMysteries || []).filter(mystery => read.has(mystery.openedBySceneId)).map(mystery => {
      const evidence = (mystery.evidence || []).map((entry, index) => ({
        ...entry,
        index,
        scene: scene(entry.sceneId),
        discovered: read.has(entry.sceneId)
      }));
      const discoveredEvidence = evidence.filter(entry => entry.discovered);
      const resolved = read.has(mystery.resolvedBySceneId);
      return {
        ...mystery,
        resolved,
        evidence,
        discoveredEvidence,
        latestEvidence: discoveredEvidence.at(-1) || null,
        evidenceCount: discoveredEvidence.length,
        evidenceTotal: evidence.length,
        openingScene: scene(mystery.openedBySceneId),
        resolutionScene: resolved ? scene(mystery.resolvedBySceneId) : null
      };
    });
  }
  function mysteries() { return deriveMysteries(new Set(ensure().readSceneIds || [])); }
  function mysteryUpdates(sceneIds = []) {
    const relevant = new Set(sceneIds.filter(Boolean));
    if (!relevant.size) return [];
    const projectedRead = new Set([...(ensure().readSceneIds || []), ...relevant]);
    return deriveMysteries(projectedRead).map(mystery => {
      const updatedEvidence = mystery.discoveredEvidence.filter(entry => relevant.has(entry.sceneId));
      return {
        ...mystery,
        updatedEvidence,
        evidenceCountAtUpdate: updatedEvidence.length ? Math.max(...updatedEvidence.map(entry => entry.index + 1)) : 0,
        resolvedByUpdate: updatedEvidence.some(entry => entry.sceneId === mystery.resolvedBySceneId)
      };
    }).filter(mystery => mystery.updatedEvidence.length);
  }
  function focus() {
    const chapter = current();
    if (!chapter) {
      const last = mainChapters().at(-1);
      return { chapter: last, dungeon: null, scene: scene(last.clearStoryId), label: "現在公開されている物語を読了", cleared: 0, total: 0 };
    }
    const routes = chapterDungeons(chapter.id).filter(dungeon => dungeon.requiredForStory);
    const target = routes.find(dungeon => !ensure().facts.clears.includes(dungeon.id) && rawCanEnter(dungeon.id, window.GameState.data, projectedCompleted()));
    return {
      chapter,
      dungeon: target || null,
      scene: target ? dungeonOpeningScene(target) : scene(chapter.openingStoryId),
      label: target ? "現在の探索地" : "章の始まり",
      cleared: routes.filter(dungeon => ensure().facts.clears.includes(dungeon.id)).length,
      total: routes.length
    };
  }
  function optionalStories() {
    return dungeons().filter(dungeon => dungeon.optionalStoryId && ensure().facts.clears.includes(dungeon.id)).map(dungeon => ({ dungeon, scene: scene(dungeon.optionalStoryId) }));
  }
  function routeStories() {
    return dungeons().filter(dungeon => {
      if (!dungeon.clearStoryId || !ensure().facts.clears.includes(dungeon.id)) return false;
      return !chapters().some(chapter => chapter.id === dungeon.chapterId && chapter.clearStoryId === dungeon.clearStoryId);
    }).map(dungeon => ({ dungeon, scene: scene(dungeon.clearStoryId) }));
  }
  window.Story = { ensure, sync, recordDeparture, recordResult, rawCanEnter, canEnter, canCraft, current, focus, satisfied, requirementsMet, requirementSatisfied, dungeonCondition, recipeCondition, scene, chapterUnlockText, chapterDungeons, chapterTimeline, sceneCharacterIds, sceneCharacters, readTimeline, searchReadScenes, episodeCharacters, characterChronicles, storyGuide, mysteries, mysteryUpdates, dungeonStoryLinks, dungeonOpeningScene, dungeonDiscoveryScene, dungeonEndingScene, pendingEpisode, pendingEpisodeForResult, nextRouteAfterResult, readPending, hasReadScene, optionalStories, routeStories, mainChapters, postgameChapters, mainComplete, triggerSatisfied, applyStoryTriggers };
})();
