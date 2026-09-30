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
    Object.entries(recipe.materials).forEach(([id, quantity]) => window.Items.remove(id, quantity));
    window.GameState.data.gold -= recipe.gold;
    const instance = window.Items.add(recipe.resultId, 1, { source: "craft" }).instances[0];
    const craftedName = window.Items.displayName(instance);
    if (window.RecurringMissions) window.RecurringMissions.record("craft");
    window.GameState.addLog(`鍛冶屋で${craftedName}を製作しました。`, "success");
    window.GameState.save();
    return { ok: true, message: `${craftedName}を製作しました。`, instance };
  }

  function materialSources(itemId) {
    return Object.values(window.GameData.dungeons).filter(dungeon => dungeon.encounters.some(encounter => encounter.groups.some(group => group.some(id => (window.GameData.monsters[id].materialDrops || []).some(drop => drop.itemId === itemId))))).map(dungeon => dungeon.shortName);
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
  function unlockOrder(recipe) {
    if (!recipe.unlockAfter) return 0;
    const index = window.GameData.storyChapters.findIndex(chapter => chapter.id === recipe.unlockAfter);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index + 1;
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

  window.Blacksmith = { canCraft, craft, materialSources, result, recipeName, category, status, query, unlockOrder };
})();
