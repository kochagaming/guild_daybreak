const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, Date, Math, Blob, console });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["data/masterFinalize.js", "js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => 1700000000000, random: () => .5 });
}
const game = context.window;
const hero = {
  hp: 200, currentHp: 200, attack: 80, magicAttack: 100, magicHealing: 40,
  defense: 20, magicDefense: 20, hitRate: 1.1, criticalRate: .05,
  physicalPower: 1, magicPower: 1, skillPower: 1, healingPower: 1,
  skillIds: [], currentHp: 200, side: "hero", position: 0, formationSize: 3
};
const enemy = overrides => ({
  hp: 300, currentHp: 300, defense: 20, magicDefense: 20, evasionRate: 0,
  elementModifiers: {}, magicVulnerability: 1, ...overrides
});

const fireball = game.GameData.skills.fireball;
const burst = game.GameData.skills.arcane_burst;
assert.strictEqual(game.CombatDecision.selectDamageSkill([fireball, burst], hero, [enemy()]).id, "fireball", "単体には単体魔法を選ぶ");
assert.strictEqual(game.CombatDecision.selectDamageSkill([fireball, burst], hero, [enemy(), enemy(), enemy()]).id, "arcane_burst", "敵集団には総期待値の高い全体魔法を選ぶ");

const healer = { ...hero, magicHealing: 80 };
const healthy = [{ hp: 200, currentHp: 199, statuses: {} }, { hp: 200, currentHp: 200, statuses: {} }];
assert.strictEqual(game.CombatDecision.shouldHeal([game.GameData.skills.heal], healer, healthy), false, "軽傷だけなら回復で行動を潰さない");
const wounded = [{ hp: 200, currentHp: 90, statuses: {} }, { hp: 200, currentHp: 200, statuses: {} }];
assert.strictEqual(game.CombatDecision.shouldHeal([game.GameData.skills.heal], healer, wounded), true);
assert.strictEqual(game.CombatDecision.selectHealingSkill([game.GameData.skills.heal, game.GameData.skills.prayer], healer, wounded).id, "heal", "単体の重傷には単体回復を選ぶ");
const groupWounded = [{ hp: 200, currentHp: 120, statuses: {} }, { hp: 200, currentHp: 120, statuses: {} }, { hp: 200, currentHp: 120, statuses: {} }];
assert.strictEqual(game.CombatDecision.selectHealingSkill([game.GameData.skills.heal, game.GameData.skills.prayer], healer, groupWounded).id, "prayer", "複数の負傷には実回復量の高い全体回復を選ぶ");
const poisoned = [{ hp: 200, currentHp: 200, statuses: { poison: { duration: 2 } } }];
assert.strictEqual(game.CombatDecision.shouldHeal([game.GameData.skills.prayer], healer, poisoned), true, "負傷がなくても解除可能な状態異常には対応する");
assert.strictEqual(game.CombatDecision.shouldHeal([game.GameData.skills.nature_mend], healer, poisoned), true, "毒・火傷専用の回復は毒に対応する");
const paralyzed = [{ hp: 200, currentHp: 200, statuses: { paralysis: { duration: 1 } } }];
assert.strictEqual(game.CombatDecision.shouldHeal([game.GameData.skills.nature_mend], healer, paralyzed), false, "毒・火傷専用の回復を麻痺だけの味方へ浪費しない");
assert.strictEqual(game.CombatDecision.shouldHeal([game.GameData.skills.prayer], healer, paralyzed), true, "全状態解除は麻痺に対応する");
const mixedAilments = [{ hp: 200, currentHp: 200, statuses: { paralysis: { duration: 1 } } }, { hp: 200, currentHp: 200, statuses: { poison: { duration: 2 } } }];
assert.strictEqual(game.CombatDecision.healingTargets(game.GameData.skills.nature_mend, healer, mixedAilments)[0], mixedAilments[1], "限定解除は実際に治せる味方だけを対象にする");

const threatened = [{ hp: 100, currentHp: 100, mechanicPhase: "charge" }];
assert.strictEqual(game.CombatDecision.selectGuardSkill([game.GameData.skills.power_strike, game.GameData.skills.iron_guard], hero, threatened).id, "iron_guard");
assert.strictEqual(game.CombatDecision.selectGuardSkill([game.GameData.skills.iron_guard], hero, [enemy()]), null, "平常時の健康なキャラクターは防御技を浪費しない");

console.log("Combat decision test passed: contextual damage, meaningful healing, cleansing and threat-aware guard selection");
