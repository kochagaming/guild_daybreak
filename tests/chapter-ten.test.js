const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window, data = game.GameData, state = game.GameState.data;
const chapter = data.storyChapters.find(entry => entry.id === "black_moon_prison");
const routes = game.Story.chapterDungeons(chapter.id), required = routes.filter(entry => entry.requiredForStory), optional = routes.filter(entry => !entry.requiredForStory);
assert(chapter && chapter.number === 10 && chapter.recommendedLevelRange[1] === 86);
assert.deepStrictEqual(Array.from(required, entry => entry.id), ["moonshadow_dock", "sealed_memory_ward", "silver_chain_gallery", "dream_eater_spire", "blackmoon_core"]);
assert.deepStrictEqual(Array.from(optional, entry => entry.id), ["exiled_king_crypt"]);
assert.deepStrictEqual(Array.from(routes, entry => entry.recommendedLevel), [78, 80, 82, 84, 86, 90]);

require("./helpers").createCharacter(game, "黒月の攻略者", "warrior");
require("./helpers").completeThrough(game, "falling_sky_castle");
assert.strictEqual(game.Story.current().id, chapter.id);
assert(game.Story.canEnter("moonshadow_dock") && !game.Story.canEnter("sealed_memory_ward") && !game.Story.canEnter("exiled_king_crypt"));
const rewardGold = state.gold;
required.forEach((dungeon, index) => {
  const completed = game.Story.recordResult({ success: true, dungeonId: dungeon.id });
  if (index < required.length - 1) assert(!completed.includes(chapter.id)); else assert(completed.includes(chapter.id));
});
assert.strictEqual(state.gold, rewardGold + chapter.rewards.gold);
assert.strictEqual(game.Items.count("royal_eclipse_fragment"), 2);
assert(game.Story.canEnter("exiled_king_crypt"));
game.Story.recordResult({ success: true, dungeonId: "exiled_king_crypt" });
assert(game.Story.optionalStories().some(entry => entry.scene.id === "exiled_king_crypt_clear"));

for (const id of ["moon_silver", "sealed_memory", "dream_dust", "chain_core", "royal_eclipse_fragment"]) {
  assert.strictEqual(data.items[id].type, "material");
  assert(Object.values(data.monsters).some(monster => (monster.materialDrops || []).some(drop => drop.itemId === id)));
}
for (const id of ["moonchain_katana", "dreamweave_robe", "jailer_shield"]) {
  const recipe = data.recipes.find(entry => entry.resultId === id);
  assert(data.items[id].craftOnly && data.items[id].tier === 11 && recipe.unlockAfter === chapter.id && game.Story.canCraft(recipe));
  assert(data.items[id].skillIds.length >= 4);
}
assert.strictEqual(data.monsters.chain_matriarch.bossDrop.itemId, "moonwarden_gauntlets");
assert.strictEqual(data.monsters.exiled_king.bossDrop.itemId, "exiled_king_blade");
for (const monster of Object.values(data.monsters).filter(entry => data.monsterFamilies[entry.id] && routes.some(dungeon => dungeon.encounters.some(encounter => encounter.groups.flat().includes(entry.id))))) {
  assert(data.monsterFamilies[monster.id].length && monster.signatureDrops?.equipment, `${monster.id} has family and signature equipment`);
}
for (const id of ["mooring_warden", "chain_matriarch", "blackmoon_heart", "exiled_king"]) assert.strictEqual(data.monsters[id].mechanic.kind, "telegraphed_burst");
for (const dungeon of routes) assert(data.storyScenes[dungeon.openingStoryId] && data.storyScenes[dungeon.discoveryStoryId]);
assert(data.commissions.some(entry => entry.dungeonId === "blackmoon_core" && entry.type === "clear"));
assert(data.upgrades.limits.some(entry => entry.chapterId === chapter.id && entry.maximum === 21));
assert(game.SaveTransfer.parse(JSON.stringify(state)).ok);
console.log("Chapter ten test passed: five black-moon routes, optional royal crypt, memory/formation threats, stories, materials, recipes, commissions, boss gear and upgrade cap");
