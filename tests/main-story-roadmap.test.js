const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window, data = game.GameData;
const chapters = data.storyChapters.filter(chapter => chapter.number >= 1).sort((a, b) => a.number - b.number);
assert.deepStrictEqual(Array.from(chapters, chapter => chapter.number), Array.from({ length: 15 }, (_, index) => index + 1), "Main story chapter numbers must be continuous from 1 to 15");
assert.strictEqual(chapters.at(-1).recommendedLevelRange[1], 100, "Chapter 15 must culminate at recommended level 100");

let priorMaximum = 0;
for (const chapter of chapters) {
  assert(data.storyScenes[chapter.openingStoryId] && data.storyScenes[chapter.clearStoryId], `${chapter.id} needs opening and ending scenes`);
  assert(chapter.recommendedLevelRange[0] >= priorMaximum || chapter.number === 1, `${chapter.id} level range must not move backwards`);
  assert(chapter.recommendedLevelRange[1] >= chapter.recommendedLevelRange[0]);
  priorMaximum = chapter.recommendedLevelRange[1];

  const routes = game.Story.chapterDungeons(chapter.id);
  const required = routes.filter(route => route.requiredForStory);
  const optional = routes.filter(route => !route.requiredForStory);
  assert.strictEqual(required.length, 5, `${chapter.id} needs five main routes`);
  assert.deepStrictEqual(Array.from(required, route => route.orderInChapter), [1, 2, 3, 4, 5]);
  required.forEach((route, index) => {
    assert(route.encounters.length && route.rewards?.gold && route.rewards?.exp, `${route.id} needs battles and rewards`);
    assert(data.storyScenes[route.openingStoryId] && data.storyScenes[route.discoveryStoryId] && data.storyScenes[route.clearStoryId], `${route.id} needs opening, discovery and ending scenes`);
    if (index > 0) assert(route.unlockRequirements.some(requirement => requirement.type === "dungeonClear" && requirement.dungeonId === required[index - 1].id), `${route.id} must follow ${required[index - 1].id}`);
  });
  if (chapter.number >= 4) {
    assert.strictEqual(optional.length, 1, `${chapter.id} needs one optional high-difficulty route`);
    assert(optional[0].unlockRequirements.some(requirement => requirement.type === "chapterCompleted" && requirement.chapterId === chapter.id));
    assert(data.storyScenes[optional[0].openingStoryId] && data.storyScenes[optional[0].discoveryStoryId] && data.storyScenes[optional[0].optionalStoryId]);
  }

  const shopTier = data.shop.standardTiers.find(entry => entry.unlockAfter === chapter.id);
  assert(shopTier && shopTier.tier === chapter.number + 1, `${chapter.id} must unlock standard shop Tier ${chapter.number + 1}`);
  const upgrade = data.upgrades.limits.find(entry => entry.chapterId === chapter.id);
  assert(upgrade && upgrade.maximum === chapter.number * 2 + 1, `${chapter.id} must unlock the expected odd-numbered upgrade cap`);
  if (chapter.number >= 4) {
    const recipes = data.recipes.filter(recipe => recipe.unlockAfter === chapter.id);
    assert.strictEqual(recipes.length, 3, `${chapter.id} needs three chapter crafting recipes`);
    assert(recipes.every(recipe => data.items[recipe.resultId]?.craftOnly), `${chapter.id} recipes must produce craft-only gear`);
  }
}

const finale = chapters.at(-1), finaleRoutes = game.Story.chapterDungeons(finale.id);
assert(finaleRoutes.filter(route => route.requiredForStory).every(route => route.recommendedLevel === 100));
assert(finaleRoutes.some(route => !route.requiredForStory && route.recommendedLevel > 100), "The finale needs a post-story challenge beyond level 100");
console.log("Main story roadmap test passed: chapters 1-15, five-route chains, optional challenges, Lv100 finale, shop tiers, crafting and upgrade caps");
