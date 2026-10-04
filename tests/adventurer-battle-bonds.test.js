const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), context = vm.createContext({ window: {}, console, Date, Math, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const game = context.window;
function member(id, name, position, sharedSorties) {
  const partnerId = id === "bond-a" ? "bond-b" : "bond-a";
  return {
    id, name, level: 10, jobId: "warrior", raceId: "human", birthId: "common", position,
    sharedSorties: sharedSorties ? { [partnerId]: sharedSorties } : {},
    actionRates: { healing: 0, spell: 0, technique: 0, attack: 100 }, weaponRange: "melee", basicDamageType: "physical",
    skillIds: [], equipmentSkillIds: [], equipmentSetBonuses: [], specialEquipment: [],
    stats: { hp: 500, attack: 60, defense: 20, magicAttack: 5, magicDefense: 10, magicHealing: 5, hitRate: 1, evasionRate: .05, speed: 10, attackCount: 1, criticalRate: 0, skillPower: 1, healingPower: 1, physicalPower: 1, magicPower: 1, slayerMultipliers: {} }
  };
}

assert.strictEqual(game.Battle.bondFormationPairs([member("bond-a", "アルト", 0, 4), member("bond-b", "ベル", 1, 4)]).length, 0, "Four shared sorties do not yet create a battle formation bond");
const familiarPair = game.Battle.bondFormationPairs([member("bond-a", "アルト", 0, 5), member("bond-b", "ベル", 1, 5)]);
assert.strictEqual(familiarPair.length, 1, "Five shared sorties create one adjacent formation bond");
assert.strictEqual(familiarPair[0].tier.label, "合図の通る間合い");
assert.strictEqual(game.Battle.bondFormationPairs([member("bond-a", "アルト", 0, 20), member("bond-b", "ベル", 2, 20)]).length, 0, "A familiar pair must stand next to each other to coordinate in battle");
const trustedPair = game.Battle.bondFormationPairs([member("bond-a", "アルト", 0, 20), member("bond-b", "ベル", 1, 20)]);
assert.strictEqual(trustedPair[0].tier.label, "背中を預ける布陣", "Twenty shared sorties use the deeper formation tier");

const expedition = {
  seed: 82521, timeMultiplier: 1, partyIds: ["bond-a", "bond-b"],
  partySnapshot: [member("bond-a", "アルト", 0, 20), member("bond-b", "ベル", 1, 20)]
};
const dungeon = {
  id: "bond_trial", name: "連携試験場", color: "green", duration: 1,
  encounters: [{ name: "連携試験", groups: [["slime"]] }],
  rewards: { gold: [1, 1], exp: [1, 1] }, drops: [], combatRules: { maxTurnsPerEncounter: 20, betweenEncounterRecovery: 0 }
};
const before = JSON.stringify(expedition.partySnapshot);
const result = game.Battle.resolve(expedition, dungeon);
assert.strictEqual(JSON.stringify(expedition.partySnapshot), before, "Formation support never mutates the saved departure snapshot");
assert.strictEqual(result.bondFormations.length, 1, "The applied battle bond is preserved as structured result data");
assert.deepStrictEqual(Array.from(result.bondFormations[0].memberNames), ["アルト", "ベル"]);
assert.deepStrictEqual(Array.from(result.bondFormations[0].positions), [0, 1]);
assert.strictEqual(result.bondFormations[0].sharedSorties, 20);
assert.strictEqual(result.bondFormations[0].label, "背中を預ける布陣");
const bondLogs = result.battleLog.filter(entry => entry.kind === "formation" && entry.text.includes("【旅仲間・"));
assert.strictEqual(bondLogs.length, 1, "One bonded adjacent pair produces one readable formation log per encounter");
assert(bondLogs[0].text.includes("背中を預ける布陣") && bondLogs[0].text.includes("アルト") && bondLogs[0].text.includes("ベル") && !bondLogs[0].text.includes("%"), "The battle log reveals the relationship and positioning clue without exposing its numeric modifier");
const resultPanel = game.GameUIViews.results.bondFormationPanel(result, { escape: value => String(value) });
assert(resultPanel.includes("戦列で息を合わせた仲間") && resultPanel.includes("アルトとベル") && resultPanel.includes("背中を預ける布陣") && resultPanel.includes("1列・2列") && !resultPanel.includes("%"), "The return report summarizes the bonded formation without exposing internal numeric modifiers");

const unfamiliarResult = game.Battle.resolve({ ...expedition, partySnapshot: [member("bond-a", "アルト", 0, 4), member("bond-b", "ベル", 1, 4)] }, dungeon);
assert(!unfamiliarResult.battleLog.some(entry => entry.text.includes("【旅仲間・")), "An unfamiliar adjacent pair receives no hidden formation benefit");
console.log("Adventurer battle bond test passed: repeated travel, adjacent formation, structured result, readable report/logs and snapshot isolation");
