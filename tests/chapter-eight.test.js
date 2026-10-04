const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window, data = game.GameData, state = game.GameState.data;
const chapter = data.storyChapters.find(entry => entry.id === "thunder_snow_peaks");
const routes = game.Story.chapterDungeons(chapter.id), required = routes.filter(entry => entry.requiredForStory), optional = routes.filter(entry => !entry.requiredForStory);
assert(chapter && chapter.number === 8 && chapter.recommendedLevelRange[1] === 66);
assert.deepStrictEqual(Array.from(required, entry => entry.id), ["snowbound_foothill", "frozen_sky_bridge", "thunder_nest", "cloud_monastery", "aurora_summit"]);
assert.deepStrictEqual(Array.from(optional, entry => entry.id), ["white_dragon_roost"]);
assert.deepStrictEqual(Array.from(routes, entry => entry.recommendedLevel), [58, 60, 62, 64, 66, 70]);

require("./helpers").createCharacter(game, "雷雪の攻略者", "warrior");
require("./helpers").completeThrough(game, "blackwood_pilgrimage");
assert.strictEqual(game.Story.current().id, chapter.id);
assert(game.Story.canEnter("snowbound_foothill") && !game.Story.canEnter("frozen_sky_bridge") && !game.Story.canEnter("white_dragon_roost"));
const rewardGold = state.gold;
required.forEach((dungeon, index) => {
  const completed = game.Story.recordResult({ success: true, dungeonId: dungeon.id });
  if (index < required.length - 1) assert(!completed.includes(chapter.id)); else assert(completed.includes(chapter.id));
});
assert.strictEqual(state.gold, rewardGold + chapter.rewards.gold);
assert.strictEqual(game.Items.count("aurora_feather"), 2);
assert(game.Story.canEnter("white_dragon_roost"));
game.Story.recordResult({ success: true, dungeonId: "white_dragon_roost" });
assert(game.Story.optionalStories().some(entry => entry.scene.id === "white_dragon_roost_clear"));

for (const id of ["frost_steel", "thunder_crystal", "cloud_wool", "aurora_feather", "white_dragon_scale"]) {
  assert.strictEqual(data.items[id].type, "material");
  assert(Object.values(data.monsters).some(monster => (data.relations.monsterMaterialDrops[monster.id] || []).some(drop => drop.itemId === id)));
}
for (const id of ["thundersteel_katana", "cloudweave_mantle", "aurora_staff"]) {
  const recipe = data.recipes.find(entry => entry.resultId === id);
  assert(data.items[id].craftOnly && data.items[id].tier === 9 && recipe.unlockAfter === chapter.id && game.Story.canCraft(recipe));
}
assert.strictEqual(data.monsters.sky_monk.bossDrop.itemId, "sky_monk_gauntlets");
assert.strictEqual(data.monsters.white_dragon.bossDrop.itemId, "white_dragon_shield");
assert(data.relations.itemSkillGrants.cloudweave_mantle.includes("chill_resistance_35"));
assert(data.relations.itemSkillGrants.aurora_staff.includes("paralysis_resistance_35"));
for (const id of ["pass_colossus", "thunder_rook", "sky_monk", "aurora_warden", "white_dragon"]) assert.strictEqual(data.monsters[id].mechanic.kind, "telegraphed_burst");
for (const dungeon of routes) {
  const links = data.relations.dungeonStoryLinks[dungeon.id];
  assert(data.storyScenes[links.openingStoryId] && data.storyScenes[links.discoveryStoryId]);
}
assert(data.config.upgrades.limits.some(entry => entry.chapterId === chapter.id && entry.maximum === 17));
assert(game.SaveTransfer.parse(JSON.stringify(state)).ok);
console.log("Chapter eight test passed: five main mountain routes, optional white dragon, chill/paralysis counterplay, stories, materials, recipes, boss gear and upgrade cap");
