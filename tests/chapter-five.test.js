const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window, data = game.GameData, state = game.GameState.data;
const chapter = data.storyChapters.find(entry => entry.id === "mirror_tide");
const routes = game.Story.chapterDungeons(chapter.id);
const required = routes.filter(dungeon => dungeon.requiredForStory), optional = routes.filter(dungeon => !dungeon.requiredForStory);

assert(chapter && chapter.number === 5 && chapter.recommendedLevelRange[1] === 36);
assert.deepStrictEqual(Array.from(required, dungeon => dungeon.id), ["frost_coast", "drowned_archive", "blue_reef", "silent_fleet", "mirror_palace"]);
assert.deepStrictEqual(Array.from(optional, dungeon => dungeon.id), ["abyssal_trench"]);
assert.deepStrictEqual(Array.from(routes, dungeon => dungeon.recommendedLevel), [28, 30, 32, 34, 36, 40]);

require("./helpers").createCharacter(game, "鏡潮の攻略者", "warrior");
require("./helpers").completeThrough(game, "ember_crown");
assert.strictEqual(game.Story.current().id, "mirror_tide");
assert(game.Story.canEnter("frost_coast") && !game.Story.canEnter("drowned_archive") && !game.Story.canEnter("abyssal_trench"));
const rewardGold = state.gold;
required.forEach((dungeon, index) => {
  const completed = game.Story.recordResult({ success: true, dungeonId: dungeon.id });
  if (index < required.length - 1) assert(!completed.includes(chapter.id));
  else assert(completed.includes(chapter.id));
});
assert.strictEqual(state.gold, rewardGold + chapter.rewards.gold);
assert.strictEqual(game.Items.count("tide_heart"), 2);
assert(game.Story.canEnter("abyssal_trench"));
game.Story.recordResult({ success: true, dungeonId: "abyssal_trench" });
assert(game.Story.optionalStories().some(entry => entry.scene.id === "abyssal_trench_clear"));

for (const id of ["frost_pearl", "drowned_ink", "abyssal_iron", "mirror_scale", "tide_heart"]) {
  assert.strictEqual(data.items[id].type, "material");
  assert(Object.values(data.monsters).some(monster => (data.relations.monsterMaterialDrops[monster.id] || []).some(drop => drop.itemId === id)), `${id} needs a monster source`);
}
for (const id of ["tideglass_bow", "frostseal_robe", "abyssal_gauntlets"]) {
  const recipe = data.recipes.find(entry => entry.resultId === id);
  assert(data.items[id].craftOnly && data.items[id].tier === 6 && recipe.unlockAfter === chapter.id);
  assert(game.Story.canCraft(recipe));
}
assert.strictEqual(data.monsters.mirror_queen.bossDrop.itemId, "mirror_queen_rapier");
assert.strictEqual(data.monsters.abyss_whale.bossDrop.itemId, "abyss_whale_shield");
for (const id of ["frost_crab", "brine_wisp", "reef_guardian", "blue_reef_lord", "frost_admiral", "mirror_queen"]) {
  assert.strictEqual(data.monsters[id].statusAttack.statusId, "chill", `${id} should use the chapter-five chill mechanic`);
}
assert.strictEqual(data.statusEffects.chill.speedMultiplier, .7);
assert.strictEqual(data.statusEffects.chill.evasionMultiplier, .65);
assert.strictEqual(data.monsters.blue_reef_lord.targetStatusId, "chill");
assert.strictEqual(data.monsters.frost_admiral.targetRule, "rear_weighted");
assert.deepStrictEqual(Array.from(data.dungeons.silent_fleet.encounters.at(-1).groups[0]), ["frost_admiral", "drowned_knight", "lantern_jelly"]);
assert.strictEqual(data.monsters.mirror_queen.mechanic.statusAmplifier.statusId, "chill");
assert(data.monsters.mirror_queen.mechanic.statusAmplifier.multiplier > 1);
assert.strictEqual(data.monsters.mirror_queen.magicDefense, 140, "explicit chapter monster stats must survive default stat hydration");
for (const dungeon of required) assert(dungeon.encounters.at(-1).groups[0].length >= 2, `${dungeon.id} boss should fight with an escort`);
assert(data.relations.itemSkillGrants.frostseal_robe.includes("chill_resistance_35"));
assert(data.relations.itemSkillGrants.stormcloak.includes("chill_resistance_20"));
const frostRobe = game.Items.add("frostseal_robe", 1, { qualityId: "standard", source: "craft", modifiers: { hp: 0, attack: 0, defense: 0 } }).instances[0];
const counterCharacter = game.Characters.get(state.characters[0].id);
const counterStats = game.Characters.stats(counterCharacter, [frostRobe]);
assert.strictEqual(counterStats.statusResistances.chill, .35);
const dwarfId = require("./helpers").createCharacter(game, "耐寒試験", "warrior", "dwarf", "common").id;
const dwarfStats = game.Characters.stats(game.Characters.get(dwarfId), [frostRobe]);
assert(Math.abs(dwarfStats.statusResistances.chill - .4475) < 1e-9, "racial and equipment resistances should combine probabilistically");
assert(data.config.upgrades.limits.some(entry => entry.chapterId === "mirror_tide" && entry.maximum === 11));
assert(data.config.partyProgression.partySlots.unlocks.some(entry => entry.chapterNumber === 5 && entry.slot === 6));
const parsed = game.SaveTransfer.parse(JSON.stringify(state));
assert(parsed.ok, parsed.message);
console.log("Chapter five test passed: five main sea routes, optional trench, chill combat mechanic, stories, materials, recipes, boss gear, upgrade cap and sixth-party right");
