const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const storage = new Map();
function load() {
  const context = vm.createContext({ window: {}, Date, Math, Blob, localStorage: {
    getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key)
  } });
  ["data/items.js", "data/facilities.js", "data/qualities.js", "data/equipmentSkills.js", "data/skills.js", "data/jobs.js", "data/origins.js", "data/affinities.js", "data/skillGrants.js", "data/portraits.js", "data/monsters.js", "data/dungeons.js", "data/recipes.js", "data/story.js", "js/runtime.js", "js/storage.js", "js/save.js", "js/gameState.js", "js/equipmentSkills.js", "js/characters.js", "js/items.js", "js/shop.js", "js/party.js", "js/exploration.js", "data/skillCategories.js", "js/skillCombat.js", "js/statusCombat.js", "js/battle.js", "js/dungeon.js", "js/blacksmith.js", "js/story.js", "js/saveTransfer.js"].forEach(file => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context));
  return context.window;
}
let game = load();
assert(game.Story.canEnter("meadow") && !game.Story.canEnter("cave") && !game.Story.canEnter("ruins"));
assert(!game.Dungeon.start("cave").ok);
assert(!game.Blacksmith.craft("forge_iron_sword").ok);
assert(game.Story.canCraft(game.GameData.recipes.find(recipe => recipe.id === "forge_hide_robe")));
const hero = game.Characters.get(require("./helpers").createCharacter(game, "物語の主役", "warrior").id);
game.Party.toggle(hero.id);
const initialGold = game.GameState.data.gold;
assert(game.Dungeon.start("meadow").ok);
assert.strictEqual(game.GameState.data.gold, initialGold + 50);
assert.strictEqual(game.Items.count("beast_hide"), 2);
assert.deepStrictEqual(Array.from(game.GameState.data.story.completed), ["prologue"]);
const before = JSON.stringify(game.GameState.data);
assert.strictEqual(game.Story.sync().length, 0);
assert.strictEqual(JSON.stringify(game.GameState.data), before);
game.Story.recordResult({ success: false, dungeonId: "meadow" });
assert(!game.Story.canEnter("cave"));
// 保存済みの出発を再起動・オフライン完了経路で処理。
game = load();
assert.strictEqual(game.GameState.data.story.completed.length, 1);
Object.assign(game.GameState.data.expeditions[0].partySnapshot[0].stats, { hp: 9999, attack: 9999, defense: 9999, speed: 99, criticalRate: 0 });
game.GameState.data.expeditions[0].endsAt = Date.now() - 1;
const gold = game.GameState.data.gold;
const result = game.Dungeon.completeIfReady();
assert(result.success && result.storyCompleted.includes("roadside"));
assert.strictEqual(game.GameState.data.gold, gold + result.gold + 150);
assert(game.Story.canEnter("cave") && !game.Story.canEnter("ruins"));
assert.strictEqual(game.Dungeon.completeIfReady(), null);
assert(game.Story.canCraft(game.GameData.recipes.find(recipe => recipe.id === "forge_fang_blade")));
game.Characters.get(hero.id).level = 99;
game.Dungeon.start("cave");
game.GameState.data.expeditions[0].endsAt = Date.now() - 1;
assert(game.Dungeon.completeIfReady().success);
assert(game.Story.canEnter("ruins"));
assert.strictEqual(game.Story.current().id, "starfall");
assert(game.Story.canCraft(game.GameData.recipes.find(recipe => recipe.id === "forge_spirit_staff")));
const completedGold = game.GameState.data.gold;
game.Story.recordResult({ success: true, dungeonId: "cave" });
assert.strictEqual(game.GameState.data.gold, completedGold);
assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
const bad = JSON.parse(JSON.stringify(game.GameState.data));
bad.story.completed = ["seal"];
assert(!game.SaveTransfer.parse(JSON.stringify(bad)).ok);
game.GameState.reset();
assert(!game.Story.canEnter("cave"));
assert.strictEqual(game.GameState.data.story.completed.length, 0);
// 初期資金だけで3人に基本装備を用意でき、序盤を過度な周回なしで突破できる。
for (const [index, job] of ["warrior", "thief", "cleric"].entries()) {
  const created = require("./helpers").createCharacter(game, `新米${index}`, job);
  const weapon = index === 0 ? "item-1" : game.Shop.buy("wooden_sword").instance.id;
  const armor = index === 0 ? "item-2" : game.Shop.buy("cloth_clothes").instance.id;
  assert(game.Items.equip(created.id, weapon).ok);
  assert(game.Items.equip(created.id, armor).ok);
  game.Party.toggle(created.id);
}
assert(game.GameState.data.gold >= 0);
game.Dungeon.start("meadow");
let wins = 0;
for (let seed = 1; seed <= 200; seed++) {
  const expedition = { ...game.GameState.data.expeditions[0], seed };
  wins += Number(game.Battle.resolve(expedition, game.GameData.dungeons.meadow).success);
}
assert(wins >= 150, `基本編成での草原突破率が低すぎます: ${wins}/200`);
console.log(`Early progression sample: initial 3-member party meadow victories ${wins}/200`);
console.log("Story test passed: ordered progression, locks, chapter rewards once, offline completion, recipe unlocks, backup validation");

