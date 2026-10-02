(function () {
  "use strict";
  const chapters = () => window.GameData.storyChapters;
  const mainChapters = () => chapters().filter(chapter => chapter.kind !== "postgame");
  const postgameChapters = () => chapters().filter(chapter => chapter.kind === "postgame");
  const dungeons = () => Object.values(window.GameData.dungeons);
  function ensure() {
    const story = window.GameState.data.story;
    if (!Array.isArray(story.facts.discoveries)) story.facts.discoveries = [];
    return story;
  }
  function scene(id) { return window.GameData.storyScenes[id]; }
  function chapterDungeons(chapterId) {
    return dungeons().filter(dungeon => dungeon.chapterId === chapterId).sort((a, b) => a.orderInChapter - b.orderInChapter);
  }
  function requirementSatisfied(requirement, state = window.GameState.data) {
    const story = state.story;
    if (requirement.type === "characters") return state.characters.length >= requirement.minimum;
    if (requirement.type === "departure") return story.facts.departed;
    if (requirement.type === "dungeonClear") return story.facts.clears.includes(requirement.dungeonId);
    if (requirement.type === "chapterCompleted") return story.completed.includes(requirement.chapterId);
    if (requirement.type === "itemOwned") {
      const materialCount = state.inventory?.materials?.[requirement.itemId] || 0;
      const equipmentCount = (state.inventory?.equipment || []).filter(item => item.templateId === requirement.itemId).length;
      return materialCount + equipmentCount >= (requirement.quantity || 1);
    }
    if (requirement.type === "itemDiscovered") return (state.encyclopedia?.items?.[requirement.itemId] || 0) >= (requirement.quantity || 1);
    return false;
  }
  function requirementsMet(requirements, state) { return (requirements || []).every(requirement => requirementSatisfied(requirement, state)); }
  function satisfied(chapter, state = window.GameState.data) {
    const requiredRoutes = chapterDungeons(chapter.id).filter(dungeon => dungeon.requiredForStory);
    return requirementsMet(chapter.entryRequirements, state) && requiredRoutes.every(dungeon => state.story.facts.clears.includes(dungeon.id));
  }
  function sync() {
    const story = ensure(), newlyCompleted = [];
    for (const chapter of chapters()) {
      if (story.completed.includes(chapter.id)) continue;
      if (!satisfied(chapter)) break;
      story.completed.push(chapter.id);
      window.GameState.data.gold += chapter.rewards.gold;
      Object.entries(chapter.rewards.materials).forEach(([id, quantity]) => window.Items.add(id, quantity));
      window.GameState.addLog(`${chapter.title}達成。${scene(chapter.clearStoryId).text} 解放・報酬：${chapter.unlockText}`, "success");
      newlyCompleted.push(chapter.id);
    }
    return newlyCompleted;
  }
  function recordDeparture(dungeonId) { if (dungeonId === "meadow") ensure().facts.departed = true; return sync(); }
  function recordResult(result) {
    const story = ensure();
    const recipeUnlocksBefore = new Set(window.GameData.recipes.filter(canCraft).map(recipe => recipe.id));
    const difficultyId = result.difficultyId || "normal";
    const firstClear = result.success && difficultyId === "normal" && !story.facts.clears.includes(result.dungeonId);
    const unlockedBefore = new Set(dungeons().filter(dungeon => canEnter(dungeon.id)).map(dungeon => dungeon.id));
    const storyMoments = [];
    const dungeon = window.GameData.dungeons[result.dungeonId];
    const foundDiscovery = result.battleLog?.some(entry => entry.kind === "story" && entry.sceneId === dungeon?.discoveryStoryId);
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
  function canEnter(id, state = window.GameState.data) {
    const dungeon = window.GameData.dungeons[id];
    return Boolean(dungeon && requirementsMet(dungeon.unlockRequirements, state));
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
    return dungeon ? `${dungeon.unlockRequirements.map(requirementText).join("・")}で解放` : "存在しない攻略先です";
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
  function dungeonOpeningScene(dungeon) { return dungeon?.openingStoryId ? scene(dungeon.openingStoryId) : null; }
  function dungeonDiscoveryScene(dungeon) { return dungeon?.discoveryStoryId ? scene(dungeon.discoveryStoryId) : null; }
  function dungeonEndingScene(dungeon) { return dungeon ? scene(dungeon.clearStoryId || dungeon.optionalStoryId) : null; }
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
  function focus() {
    const chapter = current();
    if (!chapter) {
      const last = mainChapters().at(-1);
      return { chapter: last, dungeon: null, scene: scene(last.clearStoryId), label: "現在公開されている物語を読了", cleared: 0, total: 0 };
    }
    const routes = chapterDungeons(chapter.id).filter(dungeon => dungeon.requiredForStory);
    const target = routes.find(dungeon => !ensure().facts.clears.includes(dungeon.id) && canEnter(dungeon.id));
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
  window.Story = { ensure, sync, recordDeparture, recordResult, canEnter, canCraft, current, focus, satisfied, requirementsMet, requirementSatisfied, dungeonCondition, recipeCondition, scene, chapterDungeons, chapterTimeline, dungeonOpeningScene, dungeonDiscoveryScene, dungeonEndingScene, optionalStories, routeStories, mainChapters, postgameChapters, mainComplete };
})();
