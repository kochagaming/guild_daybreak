const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, Date, Math, Blob, console });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["data/masterFinalize.js", "js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => 1700000000000, random: () => .5 });
  if (file === "js/storage.js") context.window.SaveStorage.use({ get: key => storage.get(key) || null, set: (key, value) => storage.set(key, value), remove: key => storage.delete(key) });
}
const game = context.window, create = require("./helpers").createCharacter;

assert.deepStrictEqual(JSON.parse(JSON.stringify(game.GameData.config.combatRules.attackCountProgression)), {
  minimum: 1, maximum: 8, speedBaseline: 8, speedPerAdditionalAttack: 8,
  speedWeights: { job: 1, level: 1, profile: 1, equipment: 1, equipmentSkills: 1 }, jobBonuses: {}
});
assert.strictEqual(game.Characters.attackCountForSpeed(8, "warrior", 0), 1);
assert.strictEqual(game.Characters.attackCountForSpeed(16, "thief", 0), 2);
assert.strictEqual(game.Characters.attackCountFor({ jobId: "warrior", job: 8, level: 33, profile: 0, equipment: 0, equipmentSkills: 0, explicitBonus: 0 }), 5, "現行のLv100相当値は構造整理後も維持する");

assert.strictEqual(game.Battle.attackAccuracyMultiplier(0), 1);
assert.strictEqual(game.Battle.attackAccuracyMultiplier(1), .6);
assert(Math.abs(game.Battle.attackAccuracyMultiplier(2) - .54) < 1e-9);
assert.strictEqual(game.Battle.attackDamageMultiplier(0), 1);
assert.strictEqual(game.Battle.attackDamageMultiplier(1), 1);
assert(Math.abs(game.Battle.attackDamageMultiplier(2) - .9) < 1e-9);

game.GameRuntime.seededRandom = () => () => .05;
game.GameData.monsters.slime.hp = 999999;
game.GameData.monsters.slime.attack = 1;
game.GameData.monsters.slime.defense = 0;
game.GameData.monsters.slime.evasionRate = 0;
const dungeon = { id: "meadow", name: "連撃試験", encounters: [{ name: "訓練場", groups: [["slime"]] }], rewards: { gold: [1, 1], exp: [1, 1] }, drops: [] };
function fight(attackCount) {
  const member = { id: "adventurer-1", name: "連撃役", level: 1, jobId: "thief", position: 0, weaponRange: "melee", actionRates: { attack: 100, technique: 0, spell: 0, healing: 0 }, skillIds: [], stats: { hp: 99999, attack: 30, defense: 100, magicAttack: 1, magicDefense: 100, magicHealing: 1, hitRate: 1.2, evasionRate: 0, speed: 100, criticalRate: 0, attackCount } };
  return game.Battle.resolve({ seed: 1, partyIds: [member.id], partySnapshot: [member] }, dungeon);
}
const one = fight(1), three = fight(3);
const oneAction = one.battleLog.find(entry => entry.kind === "hero");
const threeAction = three.battleLog.find(entry => entry.kind === "hero");
assert(oneAction.text.includes("1回攻撃、1回命中"));
assert(threeAction.text.includes("3回攻撃、3回命中"));
assert(three.memberReports[0].damageDealt > one.memberReports[0].damageDealt * 2);
assert(three.memberReports[0].damageDealt < one.memberReports[0].damageDealt * 3);
assert.strictEqual(three.memberReports[0].attackAttempts, 90);
assert.strictEqual(three.memberReports[0].attackHits, 90);

game.GameState.reset();
const warriorId = create(game, "戦士", "warrior").id;
const thiefId = create(game, "盗賊", "thief").id;
const warrior = game.Characters.get(warriorId), thief = game.Characters.get(thiefId);
assert(game.Characters.stats(thief).attackCount > game.Characters.stats(warrior).attackCount, "Speed-oriented thief starts with more attacks");
const bow = game.Items.add("short_bow", 1, { source: "shop", modifiers: { hp: 0, attack: 0, defense: 0 }, equipmentSkills: [] }).instances[0];
const before = game.Characters.stats(warrior).attackCount;
assert(game.Items.equip(warriorId, bow.id).ok);
assert.strictEqual(game.Characters.stats(warrior).attackCount, before + 1);
game.Party.toggle(warriorId);
game.Dungeon.start("meadow");
assert.strictEqual(game.GameState.data.expeditions[0].partySnapshot[0].stats.attackCount, before + 1);
assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
const invalid = JSON.parse(JSON.stringify(game.GameState.data));
invalid.expeditions[0].partySnapshot[0].stats.attackCount = 9;
assert(!game.SaveTransfer.parse(JSON.stringify(invalid)).ok);
console.log("Attack count test passed: speed/equipment growth, 8-hit model, accuracy/damage decay, aggregated logs, reports and snapshot validation");
