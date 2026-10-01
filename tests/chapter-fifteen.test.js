const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window, data = game.GameData, state = game.GameState.data;
const chapter = data.storyChapters.find(entry => entry.id === "end_of_starless_night");
const routes = game.Story.chapterDungeons(chapter.id), required = routes.filter(entry => entry.requiredForStory), optional = routes.filter(entry => !entry.requiredForStory);
assert(chapter && chapter.number === 15 && chapter.recommendedLevelRange[0] === 100 && chapter.recommendedLevelRange[1] === 100);
assert.deepStrictEqual(Array.from(required, entry => entry.id), ["sky_gate_ascent", "broken_constellation", "first_light_archive", "throne_beyond_sky", "nameless_star_end"]);
assert.deepStrictEqual(Array.from(optional, entry => entry.id), ["afterstar_sanctum"]);
assert.deepStrictEqual(Array.from(routes, entry => entry.recommendedLevel), [100, 100, 100, 100, 100, 105]);

require("./helpers").createCharacter(game, "星なき夜の攻略者", "warrior");
require("./helpers").completeThrough(game, "returnless_capital");
assert.strictEqual(game.Story.current().id, chapter.id);
assert(game.Story.canEnter("sky_gate_ascent") && !game.Story.canEnter("broken_constellation") && !game.Story.canEnter("afterstar_sanctum"));
const rewardGold = state.gold;
required.forEach((dungeon, index) => {
  const completed = game.Story.recordResult({ success: true, dungeonId: dungeon.id });
  if (index < required.length - 1) assert(!completed.includes(chapter.id)); else assert(completed.includes(chapter.id));
});
assert.strictEqual(state.gold, rewardGold + chapter.rewards.gold);
assert.strictEqual(game.Items.count("nameless_star"), 2);
assert(game.Story.canEnter("afterstar_sanctum"));
game.Story.recordResult({ success: true, dungeonId: "afterstar_sanctum" });
assert(game.Story.optionalStories().some(entry => entry.scene.id === "afterstar_sanctum_clear"));

for (const id of ["sky_dust", "constellation_fragment", "first_light", "void_heart", "nameless_star"]) {
  assert.strictEqual(data.items[id].type, "material");
  assert(Object.values(data.monsters).some(monster => (monster.materialDrops || []).some(drop => drop.itemId === id)));
}
for (const id of ["heavensplit_rapier", "firstlight_robe", "constellation_leather"]) {
  const recipe = data.recipes.find(entry => entry.resultId === id);
  assert(data.items[id].craftOnly && data.items[id].tier === 16 && recipe.unlockAfter === chapter.id && game.Story.canCraft(recipe));
  assert(data.items[id].skillIds.length >= 4);
}
assert.strictEqual(data.monsters.lord_beyond_sky.bossDrop.itemId, "nameless_staff");
assert.strictEqual(data.monsters.afterstar_abomination.bossDrop.itemId, "afterstar_armor");
for (const monster of Object.values(data.monsters).filter(entry => data.monsterFamilies[entry.id] && routes.some(dungeon => dungeon.encounters.some(encounter => encounter.groups.flat().includes(entry.id))))) {
  assert(data.monsterFamilies[monster.id].length && monster.signatureDrops?.equipment, `${monster.id} has family and signature equipment`);
}
for (const id of ["sky_threshold_warden", "archive_of_dawn", "lord_beyond_sky", "afterstar_abomination"]) assert.strictEqual(data.monsters[id].mechanic.kind, "telegraphed_burst");
for (const dungeon of routes) assert(data.storyScenes[dungeon.openingStoryId] && data.storyScenes[dungeon.discoveryStoryId]);
assert(data.commissions.some(entry => entry.dungeonId === "nameless_star_end" && entry.type === "clear"));
assert(data.upgrades.limits.some(entry => entry.chapterId === chapter.id && entry.maximum === 31));
assert(data.shop.standardTiers.some(entry => entry.tier === 16 && entry.unlockAfter === chapter.id));
assert(data.equipmentSkills.celestial_slayer_15);
assert.strictEqual(game.Story.current(), undefined, "The main fifteen-chapter story is complete");
assert(game.SaveTransfer.parse(JSON.stringify(state)).ok);
console.log("Chapter fifteen test passed: five level-100 finale routes, optional post-story sanctum, ending, materials, recipes, commissions, boss gear and upgrade cap");
