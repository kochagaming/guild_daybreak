const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["data/masterFinalize.js", "js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window, data = game.GameData, state = game.GameState.data;
const chapter = data.storyChapters.find(entry => entry.id === "ember_crown");
const routes = game.Story.chapterDungeons(chapter.id);
const required = routes.filter(dungeon => dungeon.requiredForStory);
const optional = routes.filter(dungeon => !dungeon.requiredForStory);
assert(chapter && chapter.order === 4 && chapter.recommendedLevelRange[1] === 27);
assert.deepStrictEqual(Array.from(required, dungeon => dungeon.id), ["skyfall_road", "glasswood", "ember_mine", "ash_fortress", "cinder_throne"]);
assert.deepStrictEqual(Array.from(optional, dungeon => dungeon.id), ["elder_dragon_crater"]);
assert.deepStrictEqual(Array.from(routes, dungeon => dungeon.recommendedLevel), [21, 22, 24, 26, 27, 30]);

require("./helpers").createCharacter(game, "灰冠の攻略者", "warrior");
require("./helpers").completeThrough(game, "starfall");
assert.strictEqual(game.Story.current().id, "ember_crown");
assert(game.Story.canEnter("skyfall_road") && !game.Story.canEnter("glasswood") && !game.Story.canEnter("elder_dragon_crater"));
const rewardGold = state.gold;
required.forEach((dungeon, index) => {
  const completed = game.Story.recordResult({ success: true, dungeonId: dungeon.id });
  if (index < required.length - 1) {
    assert(!completed.includes("ember_crown"));
    assert(!game.Story.canEnter(required[index + 1].id), "The next route waits for its home story episode");
    assert(game.Story.readPending().ok);
    assert(game.Story.canEnter(required[index + 1].id));
  } else {
    assert(completed.includes("ember_crown"));
  }
});
while (game.Story.pendingEpisode()) game.Story.readPending();
assert.strictEqual(state.gold, rewardGold + chapter.rewards.gold);
assert.strictEqual(game.Items.count("crown_core"), 2);
assert(game.Story.canEnter("elder_dragon_crater"));
assert.strictEqual(game.Story.routeStories().filter(entry => entry.dungeon.chapterId === chapter.id).length, 4);
assert.strictEqual(game.Story.optionalStories().some(entry => entry.dungeon.id === "elder_dragon_crater"), false);
game.Story.recordResult({ success: true, dungeonId: "elder_dragon_crater" });
assert(game.Story.optionalStories().some(entry => entry.scene.id === "elder_dragon_clear"));
assert.strictEqual(state.gold, rewardGold + chapter.rewards.gold, "任意攻略で章報酬を再付与しない");

for (const id of ["skyglass", "ashwood", "ember_ore", "crown_core", "elder_scale"]) {
  assert(data.items[id]?.type === "material");
  assert(Object.values(data.monsters).some(monster => (data.relations.monsterMaterialDrops[monster.id] || []).some(drop => drop.itemId === id)), `${id} needs a monster source`);
}
for (const id of ["dawn_rapier", "ember_bulwark", "ashweave_mantle"]) {
  const item = data.items[id], recipe = data.recipes.find(entry => entry.resultId === id);
  assert(item.craftOnly && item.tier === 5 && recipe.unlockAfter === "ember_crown");
  assert(game.Story.canCraft(recipe));
}
assert(data.monsters.cinder_sovereign.bossDrop.itemId === "ash_crown_plate");
assert(data.monsters.elder_ash_dragon.bossDrop.itemId === "elder_wyrm_blade");

data.monsters.cinder_sovereign.bossDrop.chance = 1;
const result = game.Battle.resolve({ seed: 404, partyIds: [], partySnapshot: [{ id: "test", name: "試験者", level: 27, jobId: "warrior", position: 0, weaponRange: "melee", skillIds: [], equipmentSkillIds: [], specialEquipment: [], actionRates: { attack: 100, technique: 0, spell: 0, healing: 0 }, stats: { hp: 999999, attack: 99999, defense: 9999, magicAttack: 1, magicDefense: 9999, magicHealing: 1, speed: 99, attackCount: 1, hitRate: 1.2, evasionRate: 0, criticalRate: 0, skillPower: 1, healingPower: 1, physicalPower: 1, magicPower: 1 } }] }, data.dungeons.cinder_throne);
assert(result.success && result.drops.some(drop => drop.itemId === "ash_crown_plate"));
assert(game.SaveTransfer.parse(JSON.stringify(state)).ok);
console.log("Chapter four test passed: five ordered main routes, optional dragon challenge, chapter stories, materials, recipes, boss gear and save validation");
