const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({
  window: {}, Date, Math, Blob, console,
  localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key)
  }
});
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file) || file.startsWith("js/ui/")) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window;
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.Battle.combatRulesFor({}))), {
  maxTurnsPerEncounter: 30,
  betweenEncounterRecovery: .12,
  minimumHitChance: .1,
  maximumHitChance: .99,
  criticalChanceCap: .95
});
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.Battle.combatRulesFor({ combatRules: { maxTurnsPerEncounter: 7, betweenEncounterRecovery: 0 } }))), {
  maxTurnsPerEncounter: 7,
  betweenEncounterRecovery: 0,
  minimumHitChance: .1,
  maximumHitChance: .99,
  criticalChanceCap: .95
});
const defaultRules = game.Battle.combatRulesFor({});
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.Battle.encounterOutcome([{ currentHp: 0 }], [{ currentHp: 0 }], 4, defaultRules))), {
  cleared: false, mutualDefeat: true, timedOut: false, survivingHeroes: 0, survivingMonsters: 0
});
assert.strictEqual(game.Battle.encounterOutcome([{ currentHp: 1 }], [{ currentHp: 0 }], 4, defaultRules).cleared, true);
assert.strictEqual(game.Battle.encounterOutcome([{ currentHp: 0 }], [{ currentHp: 1 }], 4, defaultRules).cleared, false);

game.GameRuntime.seededRandom = () => () => .97;
const dungeon = {
  id: "combat_rule_trial", name: "戦闘規則試験", combatRules: { maxTurnsPerEncounter: 2 },
  encounters: [{ name: "長期戦", groups: [["slime"]] }], rewards: { gold: [1, 1], exp: [1, 1] }, drops: []
};
const member = {
  id: "tester", name: "試験役", level: 1, jobId: "warrior", position: 0, weaponRange: "melee",
  actionRates: { attack: 0, technique: 100, spell: 0, healing: 0 }, skillIds: ["vital_strike"],
  stats: { hp: 9999, attack: 5, defense: 999, magicAttack: 1, magicDefense: 999, magicHealing: 1, hitRate: 1.2, evasionRate: 0, speed: 99, attackCount: 1, criticalRate: .8, physicalPower: 1, magicPower: 1, skillPower: 1, healingPower: 1 }
};
const result = game.Battle.resolve({ seed: 1, partySnapshot: [member] }, dungeon);
assert.strictEqual(result.success, false);
assert(result.defeatFacts[0].includes("2ターン終了時"), "ダンジョン固有のターン上限が戦闘と敗北事実へ反映される");
assert(result.defeatFacts[0].includes("敵「スライム」1体") && result.defeatFacts[0].includes("残りHP") && result.defeatFacts[0].includes("探索隊は1/1人"), "時間切れ時の敵味方の残存戦力を事実として残す");
assert(!result.battleLog.some(entry => entry.text.includes("【会心】")), "スキル補正を含む最終会心率にも上限が適用される");
assert.strictEqual(result.memberReports[0].techniqueActions, 1);
assert.strictEqual(result.memberReports[0].defendActions, 1, "クールタイム中の防御も行動実績へ記録される");
assert(result.defeatFacts.some(fact => fact.includes("通常攻撃0回、技1回") && fact.includes("防御1回")), "撤退時には助言ではなく実際の行動内訳を残す");
assert(result.defeatFacts.some(fact => fact.includes("物理命中1/1")), "撤退時の実際の命中数を残す");

console.log("Combat rules test passed: data-driven turn/recovery rules, dungeon overrides and capped critical chance");
