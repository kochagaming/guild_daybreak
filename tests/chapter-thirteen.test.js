const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window, data = game.GameData, state = game.GameState.data;
const chapter = data.storyChapters.find(entry => entry.id === "northern_star_tomb");
const routes = game.Story.chapterDungeons(chapter.id), required = routes.filter(entry => entry.requiredForStory), optional = routes.filter(entry => !entry.requiredForStory);
assert(chapter && chapter.number === 13 && chapter.recommendedLevelRange[1] === 97);
assert.deepStrictEqual(Array.from(required, entry => entry.id), ["frozen_starsea_shore", "black_aurora_field", "fallen_star_grave", "vessel_fortress", "northstar_cradle"]);
assert.deepStrictEqual(Array.from(optional, entry => entry.id), ["worldscar_glacier"]);
assert.deepStrictEqual(Array.from(routes, entry => entry.recommendedLevel), [95, 95, 96, 96, 97, 98]);

require("./helpers").createCharacter(game, "北天星墓の攻略者", "warrior");
require("./helpers").completeThrough(game, "starsea_corridor");
assert.strictEqual(game.Story.current().id, chapter.id);
assert(game.Story.canEnter("frozen_starsea_shore") && !game.Story.canEnter("black_aurora_field") && !game.Story.canEnter("worldscar_glacier"));
const rewardGold = state.gold;
required.forEach((dungeon, index) => {
  const completed = game.Story.recordResult({ success: true, dungeonId: dungeon.id });
  if (index < required.length - 1) assert(!completed.includes(chapter.id)); else assert(completed.includes(chapter.id));
});
assert.strictEqual(state.gold, rewardGold + chapter.rewards.gold);
assert.strictEqual(game.Items.count("northstar_core"), 2);
assert(game.Story.canEnter("worldscar_glacier"));
game.Story.recordResult({ success: true, dungeonId: "worldscar_glacier" });
assert(game.Story.optionalStories().some(entry => entry.scene.id === "worldscar_glacier_clear"));

for (const id of ["black_ice", "aurora_ore", "star_sinew", "vessel_fragment", "northstar_core"]) {
  assert.strictEqual(data.items[id].type, "material");
  assert(Object.values(data.monsters).some(monster => (monster.materialDrops || []).some(drop => drop.itemId === id)));
}
for (const id of ["northstar_katana", "aurora_heavy", "vessel_shield"]) {
  const recipe = data.recipes.find(entry => entry.resultId === id);
  assert(data.items[id].craftOnly && data.items[id].tier === 14 && recipe.unlockAfter === chapter.id && game.Story.canCraft(recipe));
  assert(data.items[id].skillIds.length >= 4);
}
assert.strictEqual(data.monsters.sleeping_vessel.bossDrop.itemId, "sleeper_crown");
assert.strictEqual(data.monsters.worldscar_dragon.bossDrop.itemId, "worldscar_bow");
for (const monster of Object.values(data.monsters).filter(entry => data.monsterFamilies[entry.id] && routes.some(dungeon => dungeon.encounters.some(encounter => encounter.groups.flat().includes(entry.id))))) {
  assert(data.monsterFamilies[monster.id].length && monster.signatureDrops?.equipment, `${monster.id} has family and signature equipment`);
}
for (const id of ["shore_warden", "grave_colossus", "sleeping_vessel", "worldscar_dragon"]) assert.strictEqual(data.monsters[id].mechanic.kind, "telegraphed_burst");
for (const dungeon of routes) assert(data.storyScenes[dungeon.openingStoryId] && data.storyScenes[dungeon.discoveryStoryId]);
assert(data.commissions.some(entry => entry.dungeonId === "northstar_cradle" && entry.type === "clear"));
assert(data.upgrades.limits.some(entry => entry.chapterId === chapter.id && entry.maximum === 27));
assert(data.shop.standardTiers.some(entry => entry.tier === 14 && entry.unlockAfter === chapter.id));
assert(game.SaveTransfer.parse(JSON.stringify(state)).ok);
console.log("Chapter thirteen test passed: five northern-star routes, optional worldscar glacier, stories, materials, recipes, commissions, boss gear and upgrade cap");
