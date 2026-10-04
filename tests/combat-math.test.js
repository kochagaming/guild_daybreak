const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {} });
for (const file of ["data/masterSchema.js", "data/skills.js", "js/combatMath.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const math = context.window.CombatMath;
assert.strictEqual(math.attackAccuracyMultiplier(0), 1);
assert.strictEqual(math.attackAccuracyMultiplier(1), .6);
assert(Math.abs(math.attackAccuracyMultiplier(2) - .54) < 1e-9);
assert.strictEqual(math.attackDamageMultiplier(0), 1);
assert.strictEqual(math.attackDamageMultiplier(1), 1);
assert(Math.abs(math.attackDamageMultiplier(2) - .9) < 1e-9);
assert.strictEqual(math.hitChance({ attackerHitRate: 1, defenderEvasionRate: .2, sequenceIndex: 0 }), .8);
assert.strictEqual(math.hitChance({ attackerHitRate: 0, defenderEvasionRate: 1 }), .1);
assert.strictEqual(math.criticalChance(.9, .2, .1), .95);
assert.strictEqual(math.rawDamage({ attack: 100, defense: 50, variance: 1 }), 74);
assert.strictEqual(math.rawDamage({ attack: 100, defense: 50, defensePenetration: .5, variance: 1 }), 87);
assert.strictEqual(math.expectedCriticalMultiplier(.5), 1.325);
assert.strictEqual(math.rolledCriticalMultiplier(true), 1.65);
console.log("Combat math test passed: shared accuracy, multi-hit, defense, penetration and critical formulas");
