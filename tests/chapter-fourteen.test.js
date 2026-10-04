const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window, data = game.GameData, state = game.GameState.data;
const chapter = data.storyChapters.find(entry => entry.id === "returnless_capital");
const routes = game.Story.chapterDungeons(chapter.id), required = routes.filter(entry => entry.requiredForStory), optional = routes.filter(entry => !entry.requiredForStory);
assert(chapter && chapter.number === 14 && chapter.recommendedLevelRange[1] === 99);
assert.deepStrictEqual(Array.from(required, entry => entry.id), ["north_return_road", "silent_outer_city", "royal_memory_vault", "skykey_spire", "usurper_throne"]);
assert.deepStrictEqual(Array.from(optional, entry => entry.id), ["hollow_coronation"]);
assert.deepStrictEqual(Array.from(routes, entry => entry.recommendedLevel), [98, 98, 99, 99, 99, 100]);

require("./helpers").createCharacter(game, "帰都の攻略者", "warrior");
require("./helpers").completeThrough(game, "northern_star_tomb");
assert.strictEqual(game.Story.current().id, chapter.id);
assert(game.Story.canEnter("north_return_road") && !game.Story.canEnter("silent_outer_city") && !game.Story.canEnter("hollow_coronation"));
const rewardGold = state.gold;
required.forEach((dungeon, index) => {
  const completed = game.Story.recordResult({ success: true, dungeonId: dungeon.id });
  if (index < required.length - 1) assert(!completed.includes(chapter.id)); else assert(completed.includes(chapter.id));
});
assert.strictEqual(state.gold, rewardGold + chapter.rewards.gold);
assert.strictEqual(game.Items.count("throne_star_core"), 2);
assert(game.Story.canEnter("hollow_coronation"));
game.Story.recordResult({ success: true, dungeonId: "hollow_coronation" });
assert(game.Story.optionalStories().some(entry => entry.scene.id === "hollow_coronation_clear"));

for (const id of ["eclipse_glass", "starblood_crystal", "royal_memory", "skykey_fragment", "throne_star_core"]) {
  assert.strictEqual(data.items[id].type, "material");
  assert(Object.values(data.monsters).some(monster => (data.relations.monsterMaterialDrops[monster.id] || []).some(drop => drop.itemId === id)));
}
for (const id of ["eclipse_sword", "starveil_cloth", "skykey_gauntlet"]) {
  const recipe = data.recipes.find(entry => entry.resultId === id);
  assert(data.items[id].craftOnly && data.items[id].tier === 15 && recipe.unlockAfter === chapter.id && game.Story.canCraft(recipe));
  assert(data.relations.itemSkillGrants[id].length >= 4);
}
assert.strictEqual(data.monsters.starbound_usurper.bossDrop.itemId, "regent_staff");
assert.strictEqual(data.monsters.hollow_king.bossDrop.itemId, "hollow_throne_shield");
for (const monster of Object.values(data.monsters).filter(entry => data.relations.monsterFamilies[entry.id] && routes.some(dungeon => dungeon.encounters.some(encounter => encounter.groups.flat().includes(entry.id))))) {
  assert(data.relations.monsterFamilies[monster.id].length && data.relations.monsterSignatureDrops[monster.id]?.equipment, `${monster.id} has family and signature equipment`);
}
for (const id of ["fallen_gate_captain", "archive_sentinel", "starbound_usurper", "hollow_king"]) assert.strictEqual(data.monsters[id].mechanic.kind, "telegraphed_burst");
for (const dungeon of routes) {
  const links = data.relations.dungeonStoryLinks[dungeon.id];
  assert(data.storyScenes[links.openingStoryId] && data.storyScenes[links.discoveryStoryId]);
}
assert(data.commissions.some(entry => entry.dungeonId === "usurper_throne" && entry.type === "clear"));
assert(data.config.upgrades.limits.some(entry => entry.chapterId === chapter.id && entry.maximum === 29));
assert(data.config.shop.standardTiers.some(entry => entry.tier === 15 && entry.unlockAfter === chapter.id));
assert(game.SaveTransfer.parse(JSON.stringify(state)).ok);
console.log("Chapter fourteen test passed: five returnless-capital routes, optional hollow coronation, stories, materials, recipes, commissions, boss gear and upgrade cap");
