const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, setTimeout, clearTimeout, localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1])
  .filter(file => !file.startsWith("js/ui") && !["js/main.js", "js/portraitPress.js", "js/recruitmentReveal.js"].includes(file));
scripts.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));
const game = context.window;

assert.strictEqual(game.GameData.shop.standardTiers.length, 16, "Standard stock supports all fifteen main-story chapters and the post-clear tier");
game.GameData.shop.standardTiers.forEach(entry => {
  const items = game.Shop.standardTier(entry.tier);
  assert.strictEqual(items.length, 10, `Tier ${entry.tier} should cover all five weapon and five armor types`);
  assert.strictEqual(new Set(items.map(item => item.weaponType || item.armorType)).size, 10);
  assert(items.every(item => item.tier === entry.tier && !item.unique && !item.craftOnly && !item.dropOnly));
});
assert.strictEqual(game.GameData.items.standard_t1_staff.skillIds.length, 1);
assert.strictEqual(game.GameData.items.standard_t3_rapier.skillIds.length, 2);
assert.strictEqual(game.GameData.items.standard_t7_staff.skillIds.length, 3);
assert.deepStrictEqual(Array.from(game.GameData.items.standard_t7_staff.skillIds), ["magic_attack_105", "magic_power_3", "magic_healing_105"], "Standard equipment gains fixed type-specific skills at Tier 3 and Tier 7");

assert.strictEqual(game.Shop.standardStock().length, 10);
assert(game.Shop.standardStock().every(item => item.tier === 1), "A new guild starts with only Tier 1 standard equipment");
assert(!game.Shop.buy("standard_t2_staff").ok, "A direct action cannot buy story-locked stock");
game.GameState.data.story.completed.push("roadside");
assert.strictEqual(game.Shop.standardStock().length, 20);
assert(game.Shop.standardStock().some(item => item.id === "standard_t2_staff"));
game.GameState.data.gold = 999999;
assert(game.Shop.buy("standard_t2_staff").ok, "Chapter completion unlocks the next standard tier for purchase");

const normal = game.GameData.dungeons.skyfall_road;
const abyss = game.DungeonDifficulty.variant(normal, "abyss");
const divine = game.DungeonDifficulty.variant(normal, "divine");
assert(game.MonsterLoot.standardPool(normal).every(item => item.tier === 4), "Chapter 4 normal routes drop Tier 4 standard equipment");
assert(game.MonsterLoot.standardPool(abyss).every(item => item.tier === 5), "Abyss routes can drop one standard tier ahead");
assert(game.MonsterLoot.standardPool(divine).every(item => item.tier === 6), "Divine routes can drop two standard tiers ahead");

console.log("Shop progression test passed: sixteen tiers with ten types each, chapter-gated stock, protected purchases and difficulty-ahead drops");
