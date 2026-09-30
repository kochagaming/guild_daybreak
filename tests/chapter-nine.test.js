const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window, data = game.GameData, state = game.GameState.data;
const chapter = data.storyChapters.find(entry => entry.id === "falling_sky_castle");
const routes = game.Story.chapterDungeons(chapter.id), required = routes.filter(entry => entry.requiredForStory), optional = routes.filter(entry => !entry.requiredForStory);
assert(chapter && chapter.number === 9 && chapter.recommendedLevelRange[1] === 76);
assert.deepStrictEqual(Array.from(required, entry => entry.id), ["starroad_gate", "broken_sky_garden", "blackwing_cloister", "fallen_star_foundry", "eclipsed_throne"]);
assert.deepStrictEqual(Array.from(optional, entry => entry.id), ["void_star_prison"]);
assert.deepStrictEqual(Array.from(routes, entry => entry.recommendedLevel), [68, 70, 72, 74, 76, 80]);

require("./helpers").createCharacter(game, "空城の攻略者", "warrior");
require("./helpers").completeThrough(game, "thunder_snow_peaks");
assert.strictEqual(game.Story.current().id, chapter.id);
assert(game.Story.canEnter("starroad_gate") && !game.Story.canEnter("broken_sky_garden") && !game.Story.canEnter("void_star_prison"));
const rewardGold = state.gold;
required.forEach((dungeon, index) => {
  const completed = game.Story.recordResult({ success: true, dungeonId: dungeon.id });
  if (index < required.length - 1) assert(!completed.includes(chapter.id)); else assert(completed.includes(chapter.id));
});
assert.strictEqual(state.gold, rewardGold + chapter.rewards.gold);
assert.strictEqual(game.Items.count("eclipse_shard"), 2);
assert(game.Story.canEnter("void_star_prison"));
game.Story.recordResult({ success: true, dungeonId: "void_star_prison" });
assert(game.Story.optionalStories().some(entry => entry.scene.id === "void_star_prison_clear"));

for (const id of ["fallen_star_iron", "black_wing_feather", "floating_core", "eclipse_shard", "void_star_crystal"]) {
  assert.strictEqual(data.items[id].type, "material");
  assert(Object.values(data.monsters).some(monster => (monster.materialDrops || []).some(drop => drop.itemId === id)));
}
for (const id of ["starpiercer_rapier", "blackwing_plate", "eclipse_staff"]) {
  const recipe = data.recipes.find(entry => entry.resultId === id);
  assert(data.items[id].craftOnly && data.items[id].tier === 10 && recipe.unlockAfter === chapter.id && game.Story.canCraft(recipe));
}
assert.strictEqual(data.monsters.blackwing_marquis.bossDrop.itemId, "winglord_bow");
assert.strictEqual(data.monsters.void_archon.bossDrop.itemId, "void_archon_robe");
assert(data.items.eclipse_staff.skillIds.includes("burn_resistance_35"));
for (const id of ["starroad_gatekeeper", "blackwing_marquis", "foundry_keeper", "eclipse_regent", "void_archon"]) assert.strictEqual(data.monsters[id].mechanic.kind, "telegraphed_burst");
for (const dungeon of routes) assert(data.storyScenes[dungeon.openingStoryId] && data.storyScenes[dungeon.discoveryStoryId]);
assert(data.upgrades.limits.some(entry => entry.chapterId === chapter.id && entry.maximum === 19));
assert(game.SaveTransfer.parse(JSON.stringify(state)).ok);
console.log("Chapter nine test passed: five main sky-castle routes, optional void prison, rear-line/burn counterplay, stories, materials, recipes, boss gear and upgrade cap");
