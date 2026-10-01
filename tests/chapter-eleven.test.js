const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window, data = game.GameData, state = game.GameState.data;
const chapter = data.storyChapters.find(entry => entry.id === "primordial_forest");
const routes = game.Story.chapterDungeons(chapter.id), required = routes.filter(entry => entry.requiredForStory), optional = routes.filter(entry => !entry.requiredForStory);
assert(chapter && chapter.number === 11 && chapter.recommendedLevelRange[1] === 91);
assert.deepStrictEqual(Array.from(required, entry => entry.id), ["primal_root_gate", "starseed_nursery", "memory_moss_woods", "ancestor_altar", "origin_tree_heart"]);
assert.deepStrictEqual(Array.from(optional, entry => entry.id), ["star_eater_rootpit"]);
assert.deepStrictEqual(Array.from(routes, entry => entry.recommendedLevel), [87, 88, 89, 90, 91, 93]);

require("./helpers").createCharacter(game, "始原樹海の攻略者", "warrior");
require("./helpers").completeThrough(game, "black_moon_prison");
assert.strictEqual(game.Story.current().id, chapter.id);
assert(game.Story.canEnter("primal_root_gate") && !game.Story.canEnter("starseed_nursery") && !game.Story.canEnter("star_eater_rootpit"));
const rewardGold = state.gold;
required.forEach((dungeon, index) => {
  const completed = game.Story.recordResult({ success: true, dungeonId: dungeon.id });
  if (index < required.length - 1) assert(!completed.includes(chapter.id)); else assert(completed.includes(chapter.id));
});
assert.strictEqual(state.gold, rewardGold + chapter.rewards.gold);
assert.strictEqual(game.Items.count("first_star_core"), 2);
assert(game.Story.canEnter("star_eater_rootpit"));
game.Story.recordResult({ success: true, dungeonId: "star_eater_rootpit" });
assert(game.Story.optionalStories().some(entry => entry.scene.id === "star_eater_rootpit_clear"));

for (const id of ["primordial_bark", "star_seed", "memory_moss", "origin_amber", "first_star_core"]) {
  assert.strictEqual(data.items[id].type, "material");
  assert(Object.values(data.monsters).some(monster => (monster.materialDrops || []).some(drop => drop.itemId === id)));
}
for (const id of ["originwood_bow", "starroot_staff", "ancestor_leather"]) {
  const recipe = data.recipes.find(entry => entry.resultId === id);
  assert(data.items[id].craftOnly && data.items[id].tier === 12 && recipe.unlockAfter === chapter.id && game.Story.canCraft(recipe));
  assert(data.items[id].skillIds.length >= 4);
}
assert.strictEqual(data.monsters.first_priestess.bossDrop.itemId, "first_priestess_circlet");
assert.strictEqual(data.monsters.primordial_devourer.bossDrop.itemId, "firststar_sword");
for (const monster of Object.values(data.monsters).filter(entry => data.monsterFamilies[entry.id] && routes.some(dungeon => dungeon.encounters.some(encounter => encounter.groups.flat().includes(entry.id))))) {
  assert(data.monsterFamilies[monster.id].length && monster.signatureDrops?.equipment, `${monster.id} has family and signature equipment`);
}
for (const id of ["ancient_gatekeeper", "first_priestess", "origin_heart", "primordial_devourer"]) assert.strictEqual(data.monsters[id].mechanic.kind, "telegraphed_burst");
for (const dungeon of routes) assert(data.storyScenes[dungeon.openingStoryId] && data.storyScenes[dungeon.discoveryStoryId]);
assert(data.commissions.some(entry => entry.dungeonId === "origin_tree_heart" && entry.type === "clear"));
assert(data.upgrades.limits.some(entry => entry.chapterId === chapter.id && entry.maximum === 23));
assert(data.shop.standardTiers.some(entry => entry.tier === 12 && entry.unlockAfter === chapter.id));
assert(game.SaveTransfer.parse(JSON.stringify(state)).ok);
console.log("Chapter eleven test passed: five primordial-forest routes, optional star-eater rootpit, stories, materials, recipes, commissions, boss gear and upgrade cap");
