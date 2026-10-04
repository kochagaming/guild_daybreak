const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window, data = game.GameData, state = game.GameState.data;
const chapter = data.storyChapters.find(entry => entry.id === "starsea_corridor");
const routes = game.Story.chapterDungeons(chapter.id), required = routes.filter(entry => entry.requiredForStory), optional = routes.filter(entry => !entry.requiredForStory);
assert(chapter && chapter.number === 12 && chapter.recommendedLevelRange[1] === 94);
assert.deepStrictEqual(Array.from(required, entry => entry.id), ["rootsea_descent", "drowned_chartroom", "stellar_reef", "submerged_temple", "starsea_nucleus"]);
assert.deepStrictEqual(Array.from(optional, entry => entry.id), ["leviathan_trench"]);
assert.deepStrictEqual(Array.from(routes, entry => entry.recommendedLevel), [92, 92, 93, 93, 94, 96]);

require("./helpers").createCharacter(game, "星海の攻略者", "warrior");
require("./helpers").completeThrough(game, "primordial_forest");
assert.strictEqual(game.Story.current().id, chapter.id);
assert(game.Story.canEnter("rootsea_descent") && !game.Story.canEnter("drowned_chartroom") && !game.Story.canEnter("leviathan_trench"));
const rewardGold = state.gold;
required.forEach((dungeon, index) => {
  const completed = game.Story.recordResult({ success: true, dungeonId: dungeon.id });
  if (index < required.length - 1) assert(!completed.includes(chapter.id)); else assert(completed.includes(chapter.id));
});
assert.strictEqual(state.gold, rewardGold + chapter.rewards.gold);
assert.strictEqual(game.Items.count("starsea_heart"), 2);
assert(game.Story.canEnter("leviathan_trench"));
const leviathanResult = { success: true, dungeonId: "leviathan_trench" };
game.Story.recordResult(leviathanResult);
assert(game.Story.optionalStories().some(entry => entry.scene.id === "leviathan_trench_clear"));
assert.deepStrictEqual(JSON.parse(JSON.stringify(leviathanResult.companionAdvancements)), [{ companionId: "shia", stageId: "starsea_song", previousStageId: "base" }]);
assert.strictEqual(game.Companions.stageId("shia"), "starsea_song");
const shiaSkills = game.Characters.learnedSkills(game.Companions.character("shia"));
assert(shiaSkills.some(skill => skill.id === "companion_shia_starsea_hymn") && shiaSkills.some(skill => skill.id === "companion_shia_true_name_chorus"));
assert(!shiaSkills.some(skill => skill.id === "companion_shia_homecoming_song"));

for (const id of ["abyssal_salt", "blue_star_sand", "tide_memory", "sea_glass_core", "starsea_heart"]) {
  assert.strictEqual(data.items[id].type, "material");
  assert(Object.values(data.monsters).some(monster => (data.relations.monsterMaterialDrops[monster.id] || []).some(drop => drop.itemId === id)));
}
for (const id of ["starsea_rapier", "abyssal_robe", "navigator_gauntlet"]) {
  const recipe = data.recipes.find(entry => entry.resultId === id);
  assert(data.items[id].craftOnly && data.items[id].tier === 13 && recipe.unlockAfter === chapter.id && game.Story.canCraft(recipe));
  assert(data.relations.itemSkillGrants[id].length >= 4);
}
assert.strictEqual(data.monsters.temple_warden.bossDrop.itemId, "tide_oracle_staff");
assert.strictEqual(data.monsters.abyssal_leviathan.bossDrop.itemId, "leviathan_aegis");
for (const monster of Object.values(data.monsters).filter(entry => data.relations.monsterFamilies[entry.id] && routes.some(dungeon => dungeon.encounters.some(encounter => encounter.groups.flat().includes(entry.id))))) {
  assert(data.relations.monsterFamilies[monster.id].length && data.relations.monsterSignatureDrops[monster.id]?.equipment, `${monster.id} has family and signature equipment`);
}
for (const id of ["tide_gatekeeper", "temple_warden", "starsea_core", "abyssal_leviathan"]) assert.strictEqual(data.monsters[id].mechanic.kind, "telegraphed_burst");
for (const dungeon of routes) {
  const links = data.relations.dungeonStoryLinks[dungeon.id];
  assert(data.storyScenes[links.openingStoryId] && data.storyScenes[links.discoveryStoryId]);
}
assert(data.commissions.some(entry => entry.dungeonId === "starsea_nucleus" && entry.type === "clear"));
assert(data.config.upgrades.limits.some(entry => entry.chapterId === chapter.id && entry.maximum === 25));
assert(data.config.shop.standardTiers.some(entry => entry.tier === 13 && entry.unlockAfter === chapter.id));
assert(data.equipmentSkills.spirit_slayer_15 && data.equipmentSkills.dragon_slayer_15);
assert(game.SaveTransfer.parse(JSON.stringify(state)).ok);
console.log("Chapter twelve test passed: five starsea routes, Shia-required leviathan growth, stories, materials, recipes, slayer skills, commissions, boss gear and upgrade cap");
