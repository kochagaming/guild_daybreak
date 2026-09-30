const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window;
const hero = { id: "scaling-hero", name: "計測役", level: 1, jobId: "warrior", position: 0, weaponRange: "melee", skillIds: [], equipmentSkillIds: [], specialEquipment: [], actionRates: { attack: 100, technique: 0, spell: 0, healing: 0 }, stats: { hp: 9999, attack: 1, defense: 0, magicAttack: 1, magicDefense: 0, magicHealing: 1, speed: 1, attackCount: 1, hitRate: 1.2, evasionRate: 0, criticalRate: 0, skillPower: 1, healingPower: 1, physicalPower: 1, magicPower: 1 } };
const dungeon = (monsterId, monsterScaling) => ({ id: "scaling-test", name: "補正試験", difficultyId: "normal", encounters: [{ name: "試験戦闘", groups: [[monsterId]] }], rewards: { gold: [0, 0], exp: [0, 0] }, drops: [], monsterScaling });
const fight = target => game.Battle.resolve({ seed: 20260930, partyIds: [], partySnapshot: [hero] }, target);
const originalSlime = JSON.stringify(game.GameData.monsters.slime);
const baseline = fight(dungeon("slime"));
const scaled = fight(dungeon("slime", { regular: { hp: 2, attack: 2 }, boss: { hp: 1, attack: 1 } }));
assert(scaled.memberReports[0].damageTaken > baseline.memberReports[0].damageTaken, "route scaling should increase regular-monster pressure");
const bossBaseline = fight(dungeon("alpha_wolf"));
const bossUnchanged = fight(dungeon("alpha_wolf", { regular: { hp: 9, attack: 9 }, boss: { hp: 1, attack: 1 } }));
assert.strictEqual(bossUnchanged.memberReports[0].damageTaken, bossBaseline.memberReports[0].damageTaken, "regular scaling must not leak into bosses");
assert.strictEqual(JSON.stringify(game.GameData.monsters.slime), originalSlime, "route scaling must not mutate monster master data");
console.log("Dungeon scaling test passed: per-route regular/boss modifiers compose without mutating monster masters");
