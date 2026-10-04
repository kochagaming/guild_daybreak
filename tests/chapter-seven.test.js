const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window, data = game.GameData, state = game.GameState.data;
const chapter = data.storyChapters.find(entry => entry.id === "blackwood_pilgrimage");
const routes = game.Story.chapterDungeons(chapter.id);
const required = routes.filter(dungeon => dungeon.requiredForStory), optional = routes.filter(dungeon => !dungeon.requiredForStory);

assert(chapter && chapter.number === 7 && chapter.recommendedLevelRange[1] === 56);
assert.deepStrictEqual(Array.from(required, dungeon => dungeon.id), ["blackwood_border", "whispering_roots", "witch_lantern_marsh", "thorn_cathedral", "night_bloom_sanctuary"]);
assert.deepStrictEqual(Array.from(optional, dungeon => dungeon.id), ["devouring_tree_pit"]);
assert.deepStrictEqual(Array.from(routes, dungeon => dungeon.recommendedLevel), [48, 50, 52, 54, 56, 60]);

require("./helpers").createCharacter(game, "黒樹海の攻略者", "warrior");
require("./helpers").completeThrough(game, "clockwork_desert");
assert.strictEqual(game.Story.current().id, chapter.id);
assert(game.Story.canEnter("blackwood_border") && !game.Story.canEnter("whispering_roots") && !game.Story.canEnter("devouring_tree_pit"));
const rewardGold = state.gold;
required.forEach((dungeon, index) => {
  const completed = game.Story.recordResult({ success: true, dungeonId: dungeon.id });
  if (index < required.length - 1) assert(!completed.includes(chapter.id));
  else assert(completed.includes(chapter.id));
});
assert.strictEqual(state.gold, rewardGold + chapter.rewards.gold);
assert.strictEqual(game.Items.count("saint_thorn"), 2);
assert(game.Story.canEnter("devouring_tree_pit"));
game.Story.recordResult({ success: true, dungeonId: "devouring_tree_pit" });
assert(game.Story.optionalStories().some(entry => entry.scene.id === "devouring_tree_pit_clear"));

for (const id of ["black_sap", "moonleaf", "witch_ember", "saint_thorn", "worldroot_seed"]) {
  assert.strictEqual(data.items[id].type, "material");
  assert(Object.values(data.monsters).some(monster => (data.relations.monsterMaterialDrops[monster.id] || []).some(drop => drop.itemId === id)), `${id} needs a monster source`);
}
for (const id of ["moonleaf_bow", "thornplate_gauntlets", "nightbloom_robe"]) {
  const recipe = data.recipes.find(entry => entry.resultId === id);
  assert(data.items[id].craftOnly && data.items[id].tier === 8 && recipe.unlockAfter === chapter.id);
  assert(game.Story.canCraft(recipe));
}
assert.strictEqual(data.monsters.thorn_saint.bossDrop.itemId, "saint_thorn_sword");
assert.strictEqual(data.monsters.worldroot_devourer.bossDrop.itemId, "worldroot_mail");
assert(data.relations.itemSkillGrants.memory_robe.includes("poison_resistance_20"));
assert(data.relations.itemSkillGrants.nightbloom_robe.includes("poison_resistance_35"));
assert(data.relations.itemSkillGrants.chronoglass_rapier.includes("plant_slayer_15"));
assert(data.relations.itemSkillGrants.memory_robe.includes("demon_slayer_15"));
assert(data.relations.itemSkillGrants.ashweave_mantle.includes("burn_resistance_20"));
assert(data.relations.itemSkillGrants.nightbloom_robe.includes("burn_resistance_35"));
const poisonRobe = game.Items.add("nightbloom_robe", 1, { qualityId: "standard", source: "craft", modifiers: { hp: 0, attack: 0, defense: 0 } }).instances[0];
const poisonStats = game.Characters.stats(game.Characters.get(state.characters[0].id), [poisonRobe]);
assert.strictEqual(poisonStats.statusResistances.poison, .35);
assert.strictEqual(poisonStats.statusResistances.burn, .35);
const plantRapier = game.Items.add("chronoglass_rapier", 1, { qualityId: "standard", source: "craft", modifiers: { hp: 0, attack: 0, defense: 0 } }).instances[0];
const plantStats = game.Characters.stats(game.Characters.get(state.characters[0].id), [plantRapier]);
assert.strictEqual(plantStats.slayerMultipliers.plant, 1.15);
for (const id of ["border_keeper", "ancient_treant", "thorn_saint", "nightbloom_oracle", "worldroot_devourer"]) assert.strictEqual(data.monsters[id].mechanic.kind, "telegraphed_burst");
for (const dungeon of routes) {
  const links = data.relations.dungeonStoryLinks[dungeon.id];
  assert(links?.openingStoryId && data.storyScenes[links.openingStoryId]);
  assert(links?.discoveryStoryId && data.storyScenes[links.discoveryStoryId]);
}
assert(data.config.upgrades.limits.some(entry => entry.chapterId === chapter.id && entry.maximum === 15));
const parsed = game.SaveTransfer.parse(JSON.stringify(state));
assert(parsed.ok, parsed.message);
console.log("Chapter seven test passed: five main blackwood routes, optional worldroot, poison counterplay, stories, materials, recipes, boss gear and upgrade cap");
