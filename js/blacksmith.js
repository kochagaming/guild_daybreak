(function () {
  "use strict";

  function canCraft(recipe) {
    if (window.Story && !window.Story.canCraft(recipe)) return false;
    const state = window.GameState.data;
    if (state.gold < recipe.gold) return false;
    return Object.entries(recipe.materials).every(([id, quantity]) => window.Items.count(id) >= quantity);
  }

  function craft(recipeId) {
    const recipe = window.GameData.recipes.find((entry) => entry.id === recipeId);
    if (!recipe) return { ok: false, message: "レシピが見つかりません。" };
    if (window.Story && !window.Story.canCraft(recipe)) return { ok: false, message: window.Story.recipeCondition(recipe) };
    if (!canCraft(recipe)) return { ok: false, message: "素材または所持金が足りません。" };
    const completedCraftingTarget = window.Encyclopedia?.craftingTarget?.() === recipe.id;
    const knownSetCounts = window.EquipmentSkills?.discoveryCounts?.() || {};
    Object.entries(recipe.materials).forEach(([id, quantity]) => window.Items.remove(id, quantity));
    window.GameState.data.gold -= recipe.gold;
    const instance = window.Items.add(recipe.resultId, 1, { source: "craft" }).instances[0];
    const craftedName = window.Items.displayName(instance);
    if (completedCraftingTarget) {
      const tracked = window.Encyclopedia.trackedTarget();
      window.Encyclopedia.setCraftingTarget(null);
      if (tracked && Object.prototype.hasOwnProperty.call(recipe.materials, tracked.itemId) && tracked.progress >= tracked.quantity) window.Encyclopedia.setTrackedItem(null);
    }
    if (window.RecurringMissions) window.RecurringMissions.record("craft");
    window.GameState.addLog(`鍛冶屋で${craftedName}を製作しました。`, "success");
    window.GameState.save();
    return { ok: true, message: `${craftedName}を製作しました。${completedCraftingTarget ? " 製作目標を達成しました。" : ""}`, instance, completedCraftingTarget, setDiscoveries: window.EquipmentSkills?.discoveryAdvances?.(knownSetCounts) || [] };
  }

  function materialSources(itemId) {
    return Object.values(window.GameData.dungeons).filter(dungeon => dungeon.encounters.some(encounter => encounter.groups.some(group => group.some(id => window.MonsterLoot.materialDrops(id).some(drop => drop.itemId === itemId))))).map(dungeon => dungeon.shortName);
  }

  function result(recipe) { return window.GameData.items[recipe.resultId]; }
  function recipeName(recipe) { return recipe.name || `${result(recipe).name}の製作`; }
  function category(recipe) {
    const item = result(recipe);
    return `${item.type}:${item.weaponType || item.armorType}`;
  }
  function status(recipe) {
    if (window.Story && !window.Story.canCraft(recipe)) return "locked";
    return canCraft(recipe) ? "ready" : "missing";
  }
  function materialNeeds(recipe) {
    return Object.entries(recipe?.materials || {}).map(([itemId, required]) => {
      const owned = window.Items.count(itemId);
      return { itemId, required, owned, missing: Math.max(0, required - owned) };
    });
  }
  function craftingPlan(recipeId) {
    const recipe = window.GameData.recipes.find(entry => entry.id === recipeId);
    if (!recipe || status(recipe) === "locked") return null;
    const needs = materialNeeds(recipe);
    const missing = needs.filter(need => need.missing > 0)
      .sort((left, right) => right.missing - left.missing
        || window.GameData.items[left.itemId].name.localeCompare(window.GameData.items[right.itemId].name, "ja"));
    const goldMissing = Math.max(0, recipe.gold - window.GameState.data.gold);
    return {
      recipeId: recipe.id,
      resultId: recipe.resultId,
      ready: missing.length === 0 && goldMissing === 0,
      needs,
      nextNeed: missing[0] || null,
      gold: recipe.gold,
      goldMissing,
      materialMet: needs.filter(need => need.missing === 0).length,
      totalMaterials: needs.length
    };
  }
  function relatedMaterialPlan(itemId, preferredRecipeId = window.Encyclopedia?.craftingTarget?.()) {
    const plans = window.GameData.recipes
      .filter(recipe => Object.prototype.hasOwnProperty.call(recipe.materials, itemId) && status(recipe) !== "locked")
      .map(recipe => {
        const directPlan = craftingPlan(recipe.id);
        const needs = directPlan.needs;
        const trackedNeed = needs.find(need => need.itemId === itemId);
        const missing = needs.filter(need => need.missing > 0);
        const otherMissing = missing.filter(need => need.itemId !== itemId)
          .sort((left, right) => right.missing - left.missing || window.GameData.items[left.itemId].name.localeCompare(window.GameData.items[right.itemId].name, "ja"));
        return {
          recipe,
          needs,
          trackedShortage: trackedNeed?.missing || 0,
          missing,
          otherMissing,
          missingUnits: missing.reduce((sum, need) => sum + need.missing, 0),
          goldMissing: directPlan.goldMissing
        };
      })
      .sort((left, right) => Number(left.recipe.id !== preferredRecipeId) - Number(right.recipe.id !== preferredRecipeId)
        || Number(status(left.recipe) !== "ready") - Number(status(right.recipe) !== "ready")
        || left.trackedShortage - right.trackedShortage
        || left.missing.length - right.missing.length
        || left.missingUnits - right.missingUnits
        || (result(left.recipe).tier || 0) - (result(right.recipe).tier || 0)
        || result(left.recipe).name.localeCompare(result(right.recipe).name, "ja"));
    const plan = plans[0];
    if (!plan) return null;
    return {
      recipeId: plan.recipe.id,
      resultId: plan.recipe.resultId,
      ready: status(plan.recipe) === "ready",
      needs: plan.needs,
      nextNeed: plan.otherMissing[0] || null,
      goldMissing: plan.goldMissing
    };
  }
  function unlockOrder(recipe) {
    if (!recipe.unlockAfter) return 0;
    const chapterIndex = window.GameData.storyChapters.findIndex(chapter => chapter.id === recipe.unlockAfter);
    if (chapterIndex >= 0) return (chapterIndex + 1) * 100 + 99;
    const dungeon = window.GameData.dungeons[recipe.unlockAfter];
    if (!dungeon) return Number.MAX_SAFE_INTEGER;
    const dungeonChapterIndex = window.GameData.storyChapters.findIndex(chapter => chapter.id === dungeon.chapterId);
    return dungeonChapterIndex < 0 ? Number.MAX_SAFE_INTEGER : (dungeonChapterIndex + 1) * 100 + dungeon.orderInChapter;
  }
  function query(options) {
    const settings = Object.assign({ query: "", category: "all", material: "all", status: "all", sort: "ready" }, options || {});
    const words = settings.query.trim().toLocaleLowerCase("ja").split(/\s+/).filter(Boolean);
    const entries = window.GameData.recipes.filter(recipe => {
      const item = result(recipe);
      const haystack = [recipe.id, recipeName(recipe), item.name, ...Object.keys(recipe.materials).map(id => window.GameData.items[id].name)].join(" ").toLocaleLowerCase("ja");
      const matchesCategory = settings.category === "all" || settings.category === item.type || settings.category === category(recipe);
      const matchesMaterial = settings.material === "all" || Object.prototype.hasOwnProperty.call(recipe.materials, settings.material);
      return words.every(word => haystack.includes(word)) && matchesCategory && matchesMaterial && (settings.status === "all" || settings.status === status(recipe));
    });
    const readyRank = recipe => ({ ready: 0, missing: 1, locked: 2 })[status(recipe)];
    return entries.sort((a, b) => {
      const itemA = result(a), itemB = result(b);
      if (settings.sort === "tierAsc") return (itemA.tier || 0) - (itemB.tier || 0) || itemA.name.localeCompare(itemB.name, "ja");
      if (settings.sort === "tierDesc") return (itemB.tier || 0) - (itemA.tier || 0) || itemA.name.localeCompare(itemB.name, "ja");
      if (settings.sort === "unlock") return unlockOrder(a) - unlockOrder(b) || (itemA.tier || 0) - (itemB.tier || 0) || itemA.name.localeCompare(itemB.name, "ja");
      if (settings.sort === "name") return itemA.name.localeCompare(itemB.name, "ja");
      return readyRank(a) - readyRank(b) || (itemA.tier || 0) - (itemB.tier || 0) || itemA.name.localeCompare(itemB.name, "ja");
    });
  }

  function lockedRecipePreviews() {
    const sourceOrder = new Map(window.GameData.recipes.map((recipe, index) => [recipe.id, index]));
    const previews = new Map();
    window.GameData.recipes
      .filter(recipe => status(recipe) === "locked")
      .sort((a, b) => unlockOrder(a) - unlockOrder(b)
        || (result(a).tier || 0) - (result(b).tier || 0)
        || sourceOrder.get(a.id) - sourceOrder.get(b.id))
      .forEach(recipe => {
        const categoryId = category(recipe);
        if (!previews.has(categoryId)) previews.set(categoryId, recipe);
      });
    return previews;
  }

  function catalog(options) {
    const previewIds = new Set(Array.from(lockedRecipePreviews().values(), recipe => recipe.id));
    return query(options).filter(recipe => status(recipe) !== "locked" || previewIds.has(recipe.id));
  }

  function hiddenLockedCount(categoryId) {
    const lockedCount = window.GameData.recipes.filter(recipe => status(recipe) === "locked" && category(recipe) === categoryId).length;
    return Math.max(0, lockedCount - (lockedRecipePreviews().has(categoryId) ? 1 : 0));
  }

  window.Blacksmith = { canCraft, craft, materialSources, result, recipeName, category, status, materialNeeds, craftingPlan, relatedMaterialPlan, query, catalog, lockedRecipePreviews, hiddenLockedCount, unlockOrder };
})();
