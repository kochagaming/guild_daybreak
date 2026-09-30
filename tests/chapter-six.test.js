const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window, data = game.GameData, state = game.GameState.data;
const chapter = data.storyChapters.find(entry => entry.id === "clockwork_desert");
const routes = game.Story.chapterDungeons(chapter.id);
const required = routes.filter(dungeon => dungeon.requiredForStory), optional = routes.filter(dungeon => !dungeon.requiredForStory);

assert(chapter && chapter.number === 6 && chapter.recommendedLevelRange[1] === 46);
assert.deepStrictEqual(Array.from(required, dungeon => dungeon.id), ["tidal_gate", "white_sand_road", "stopped_clocktower", "royal_workshop", "hourglass_palace"]);
assert.deepStrictEqual(Array.from(optional, dungeon => dungeon.id), ["forgotten_titan_tomb"]);
assert.deepStrictEqual(Array.from(routes, dungeon => dungeon.recommendedLevel), [38, 40, 42, 44, 46, 50]);

require("./helpers").createCharacter(game, "時砂の攻略者", "warrior");
require("./helpers").completeThrough(game, "mirror_tide");
assert.strictEqual(game.Story.current().id, chapter.id);
assert(game.Story.canEnter("tidal_gate") && !game.Story.canEnter("white_sand_road") && !game.Story.canEnter("forgotten_titan_tomb"));
const rewardGold = state.gold;
required.forEach((dungeon, index) => {
  const completed = game.Story.recordResult({ success: true, dungeonId: dungeon.id });
  if (index < required.length - 1) assert(!completed.includes(chapter.id));
  else assert(completed.includes(chapter.id));
});
assert.strictEqual(state.gold, rewardGold + chapter.rewards.gold);
assert.strictEqual(game.Items.count("royal_spring"), 2);
assert(data.partyProgression.partySlots.unlocks.some(entry => entry.chapterNumber === 6 && entry.slot === 7));
assert.strictEqual(game.Party.availableLimit(), 7, "Chapter six grants the seventh party right without a code");
assert(game.Story.canEnter("forgotten_titan_tomb"));
game.Story.recordResult({ success: true, dungeonId: "forgotten_titan_tomb" });
assert(game.Story.optionalStories().some(entry => entry.scene.id === "forgotten_titan_clear"));

for (const id of ["time_sand", "brass_gear", "memory_glass", "royal_spring", "giant_core"]) {
  assert.strictEqual(data.items[id].type, "material");
  assert(Object.values(data.monsters).some(monster => (monster.materialDrops || []).some(drop => drop.itemId === id)), `${id} needs a monster source`);
}
for (const id of ["chronoglass_rapier", "brasswall_shield", "memory_robe"]) {
  const recipe = data.recipes.find(entry => entry.resultId === id);
  assert(data.items[id].craftOnly && data.items[id].tier === 7 && recipe.unlockAfter === chapter.id);
  assert(game.Story.canCraft(recipe));
}
assert.strictEqual(data.monsters.gear_king.bossDrop.itemId, "gear_king_blade");
assert.strictEqual(data.monsters.forgotten_titan.bossDrop.itemId, "titan_clock_armor");
assert(data.items.ember_bulwark.skillIds.includes("paralysis_resistance_20"), "a pre-chapter paralysis counter should be obtainable");
assert(data.items.brasswall_shield.skillIds.includes("paralysis_resistance_35"), "chapter-six crafting should provide a stronger paralysis counter");
const paralysisShield = game.Items.add("brasswall_shield", 1, { qualityId: "standard", source: "craft", modifiers: { hp: 0, attack: 0, defense: 0 } }).instances[0];
const paralysisStats = game.Characters.stats(game.Characters.get(state.characters[0].id), [paralysisShield]);
assert.strictEqual(paralysisStats.statusResistances.paralysis, .35);
for (const id of ["gate_colossus", "gear_king", "time_queen", "forgotten_titan"]) {
  assert.strictEqual(data.monsters[id].mechanic.kind, "telegraphed_burst", `${id} should expose a readable action cycle`);
}
for (const dungeon of routes) {
  assert(dungeon.openingStoryId && data.storyScenes[dungeon.openingStoryId], `${dungeon.id} needs an opening scene`);
  assert(dungeon.discoveryStoryId && data.storyScenes[dungeon.discoveryStoryId], `${dungeon.id} needs a discovery scene`);
}
for (const id of Object.keys(data.monsters).filter(id => ["gate_scarab", "tide_clockwork", "gate_colossus", "sand_jackal", "glass_nomad", "brass_basilisk", "minute_hand", "bell_wraith", "clock_warden", "gear_mason", "spring_guard", "gear_king", "memory_doll", "hourglass_knight", "time_queen", "forgotten_titan"].includes(id))) {
  assert(data.monsters[id].signatureDrops?.materials?.length && data.monsters[id].signatureDrops?.equipment?.itemId, `${id} needs signature loot`);
}
assert(data.upgrades.limits.some(entry => entry.chapterId === chapter.id && entry.maximum === 13));
const parsed = game.SaveTransfer.parse(JSON.stringify(state));
assert(parsed.ok, parsed.message);
console.log("Chapter six test passed: five main clockwork routes, optional titan, story discoveries, materials, recipes, signature loot, boss gear and upgrade cap");
