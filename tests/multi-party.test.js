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
assert.strictEqual(game.Party.limit(), 1);
assert(!game.Party.select(1).ok);
assert(!game.Dungeon.start("meadow", 1).ok);
assert(!game.Party.unlockQuote(2).chapterReady);
const first = require("./helpers").createCharacter(game, "攻略隊", "warrior").id;
const second = require("./helpers").createCharacter(game, "収集隊", "cleric").id;
game.Party.toggle(first);
game.Story.recordDeparture("meadow");
game.Story.recordResult({ success: true, dungeonId: "meadow" });
assert.strictEqual(game.Party.availableLimit(), 2);
assert.strictEqual(game.Party.limit(), 1, "Chapter clear only grants the right to expand");
game.GameState.data.gold = 20000;
game.GameState.data.inventory.materials.guild_seal = 10;
assert(game.Party.unlock(2).ok);
assert.strictEqual(game.Party.limit(), 2);
assert.strictEqual(game.GameState.data.gold, 10000);
assert.strictEqual(game.Items.count("guild_seal"), 8);
game.Story.recordResult({ success: true, dungeonId: "cave" });
assert.strictEqual(game.Party.availableLimit(), 3);
assert.strictEqual(game.Party.limit(), 2, "The next chapter grants another purchase right, not a free party");
assert(game.Party.select(1).ok);
assert(!game.Party.toggle(first).ok);
assert(game.Party.toggle(second).ok);
assert(game.Dungeon.start("meadow").ok);
assert(!game.Party.toggle(second).ok);
assert(!game.Party.move(second, -1).ok);
assert(game.Party.select(0).ok);
assert(game.Dungeon.start("cave").ok);
assert.strictEqual(game.Dungeon.activeCount(), 2);
assert(!game.Dungeon.start("meadow").ok);
assert(game.Dungeon.remaining(0) > game.Dungeon.remaining(1));
Object.assign(game.GameState.data.expeditions[0].partySnapshot[0].stats, { hp: 9999, attack: 9999, defense: 9999, speed: 99, criticalRate: 0 });
Object.assign(game.GameState.data.expeditions[1].partySnapshot[0].stats, { hp: 9999, attack: 9999, defense: 9999, speed: 99, criticalRate: 0 });
game.GameState.save();
assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
const invalid = mutate => { const state = JSON.parse(JSON.stringify(game.GameState.data)); mutate(state); assert(!game.SaveTransfer.parse(JSON.stringify(state)).ok); };
invalid(state => { state.parties[1] = state.parties[0]; });
invalid(state => { state.expeditions[1].partySnapshot[0].skillIds = ["missing"]; });
invalid(state => { state.expeditions[1].seed = -1; });
invalid(state => { state.expeditions[1].partyIds = state.expeditions[0].partyIds; });
invalid(state => { state.activeParty = 2; });
invalid(state => { state.partyResults[1] = { dungeonId: "missing" }; });
// Offline: both deadlines elapsed. Seeded outcomes and rewards survive reload.
game = load();
const time = Math.max(game.GameState.data.expeditions[0].endsAt, game.GameState.data.expeditions[1].endsAt);
const gold = game.GameState.data.gold;
const outcome = game.Dungeon.completeIfReady(time);
assert.strictEqual(outcome.partyIndex, 0); // Cave finishes after meadow.
assert.strictEqual(game.Dungeon.activeCount(), 0);
const reports = game.GameState.data.partyResults;
assert(reports[0].success && reports[1].success);
assert.strictEqual(game.GameState.data.gold, gold + reports[0].gold + reports[1].gold);
assert.strictEqual(reports[0].partyNames[0], "攻略隊");
assert.strictEqual(reports[1].partyNames[0], "収集隊");
assert(game.Characters.get(first).exp > 0 || game.Characters.get(first).level > 1);
assert(game.Characters.get(second).exp > 0 || game.Characters.get(second).level > 1);
assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
game = load();
const savedGold = game.GameState.data.gold;
assert.strictEqual(game.Dungeon.completeIfReady(time + 1), null);
assert.strictEqual(game.GameState.data.gold, savedGold);
assert(game.GameState.data.partyResults.slice(0, 2).every(Boolean));
assert(game.Party.select(1).ok && game.Party.toggle(second).ok);
assert(game.Party.select(0).ok && game.Party.toggle(first).ok && game.Party.toggle(second).ok);
game.GameState.reset();
assert.strictEqual(game.Party.limit(), 1);
assert.strictEqual(game.Dungeon.activeCount(), 0);
console.log("Multi-party test passed: chapter unlock, disjoint rosters, busy protection, parallel offline rewards once, per-party reports, backup validation");

