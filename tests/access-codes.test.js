const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: {
  getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key)
} });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window;
assert.strictEqual(game.Party.availableLimit(), 1);
assert(!game.AccessCodes.redeem("party_expansion_trial", "9999").ok);
const hero = require("./helpers").createCharacter(game, "短時間探索隊").id;
require("./helpers").completeThrough(game, "clockwork_desert");
assert.strictEqual(game.Party.availableLimit(), 7, "Story progression alone grants at most seven party slots");
assert(game.AccessCodes.redeem("party_expansion_trial", "0000").ok);
assert.strictEqual(game.Party.availableLimit(), 8, "The code adds the eighth party slot");
assert(!game.AccessCodes.redeem("party_expansion_trial", "0000").ok);
game.GameState.data.gold = 5000;
game.GameState.data.inventory.materials.guild_seal = 10;
assert(game.Party.unlock(2).ok);
assert.strictEqual(game.Party.limit(), 2);
game.GameState.data.gold = 1000000;
game.GameState.data.inventory.materials.guild_seal = 100;
for (let slot = 3; slot <= 8; slot++) assert(game.Party.unlock(slot).ok, `Party slot ${slot} can be purchased after its right is unlocked`);
assert.strictEqual(game.Party.limit(), 8);
assert(game.AccessCodes.redeem("half_exploration_trial", "0001").ok);
assert(!game.AccessCodes.redeem("double_experience_trial", "0003").ok, "A code only works in its matching feature input");
assert(game.AccessCodes.redeem("double_experience_trial", "0002").ok);
assert(game.AccessCodes.redeem("double_gold_trial", "0003").ok);
assert(game.AccessCodes.redeem("double_quality_trial", "0004").ok);
assert(game.AccessCodes.redeem("double_item_rate_trial", "0005").ok);
assert(game.Party.toggle(hero, 0).ok);
assert(game.Dungeon.start("meadow", 0).ok);
const expedition = game.GameState.data.expeditions[0];
assert.strictEqual(expedition.accessDurationMultiplier, .5);
assert.strictEqual(expedition.endsAt - expedition.startedAt, 15000);
assert.strictEqual(expedition.acquisitionBonuses.experience.party.multiplier, 2);
assert.strictEqual(expedition.acquisitionBonuses.gold.multiplier, 2);
assert.strictEqual(expedition.acquisitionBonuses.qualityRate.multiplier, 2);
assert.strictEqual(expedition.acquisitionBonuses.itemRate.multiplier, 2);
const parsed = game.SaveTransfer.parse(JSON.stringify(game.GameState.data));
assert(parsed.ok, parsed.message);
console.log("Access codes test passed: separate codes, invalid/reuse guards, bonus party right, paid expansion, half-duration snapshot and save validation");
