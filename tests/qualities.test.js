const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, console, Date, Math, Blob, setTimeout, clearTimeout, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1])
  .filter(file => !file.startsWith("js/ui") && !["js/main.js", "js/portraitPress.js", "js/recruitmentReveal.js"].includes(file));
scripts.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));
const game = context.window, qualities = game.GameData.qualities;

assert.strictEqual(Object.keys(qualities).length, 13);
for (const id of ["crude", "wellmade", "refined", "exquisite", "legendary"]) assert(qualities[id], `Added quality ${id} exists`);
assert.strictEqual(qualities.exquisite.prefix, "極上の");
assert.strictEqual(qualities.legendary.statMultiplier, 4.5);
assert.strictEqual(Math.max(...Object.values(qualities).map(quality => quality.statMultiplier)), 5, "Quality stat multiplier is capped at 5x");
assert(Object.values(qualities).every(quality => Number.isInteger(quality.statMultiplier * 2)), "Every quality stat multiplier uses 0.5 steps");
assert(Object.values(qualities).every(quality => Number.isInteger(quality.weightMultiplier * 2)), "Every quality weight multiplier uses 0.5 steps");
assert(Object.values(qualities).every(quality => quality.valueMultiplier === quality.statMultiplier), "Quality value follows the same 0.5-step ladder as performance");
const ranks = Object.values(qualities).map(entry => entry.rank);
assert(ranks.every(Number.isFinite) && new Set(ranks).size === ranks.length, "Every quality has a stable unique sort rank");
for (const [source, table] of Object.entries(game.GameData.qualityTables)) {
  assert.strictEqual(table.reduce((sum, [, weight]) => sum + weight, 0), 100, `${source} quality weights total 100`);
  assert(table.every(([id, weight]) => qualities[id] && weight > 0), `${source} references only valid positive qualities`);
}
const zero = { hp: 0, attack: 0, defense: 0 };
const refined = game.Items.createInstance("iron_sword", { source: "drop", qualityId: "refined", modifiers: zero });
const legendary = game.Items.createInstance("iron_sword", { source: "drop", qualityId: "legendary", modifiers: zero });
assert.strictEqual(game.Items.effects(refined).attack, Math.round(game.GameData.items.iron_sword.attack * 2.5));
assert.strictEqual(game.Items.effects(refined).weight, game.GameData.items.iron_sword.weight);
assert.strictEqual(game.Items.effects(legendary).attack, Math.round(game.GameData.items.iron_sword.attack * 4.5));
assert.strictEqual(game.Items.qualityDescription("divine"), "品質：神がかった（性能×5）");
assert.strictEqual(game.Items.qualityDescription("featherlight"), "品質：羽根のような（性能×0.5・重量×0.5）");
assert.strictEqual(game.Items.qualityCompact("hefty"), "ずっしりとした ×4・重×2");

console.log("Quality test passed: 13 qualities, ranks, source tables and new stat/weight multipliers");
