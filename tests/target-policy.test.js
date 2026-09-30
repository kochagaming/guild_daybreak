const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, Date, Math, Blob, console });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window;
game.GameData.monsters.slime.hp = 99999;
const member = skills => ({ id: "hero", name: "狙撃役", level: 99, jobId: "ranger", position: 0, actionRates: { attack: 100, technique: 0, spell: 0, healing: 0 }, weaponRange: "ranged", skillIds: skills, stats: { hp: 99999, attack: 10, defense: 999, magicAttack: 1, magicDefense: 999, magicHealing: 1, hitRate: 1.2, evasionRate: 0, speed: 100, criticalRate: 0 } });
const dungeon = { id: "test", name: "隊列試験", encounters: [{ name: "三列", groups: [["slime", "slime", "slime"]] }], rewards: { gold: [0, 0], exp: [0, 0] }, drops: [] };
const result = game.Battle.resolve({ seed: 4, partyIds: [], partySnapshot: [member(["job_ranger_eagle_eye"])] }, dungeon);
assert(result.battleLog.some(entry => entry.kind === "encounter" && entry.text.includes("隊列を組んで")));
assert.strictEqual(result.battleLog.filter(entry => entry.kind === "formation").length, 4);
assert(game.SkillCombat.combatBonus({ currentHp: 1, skillIds: ["job_ranger_eagle_eye"] }, "rearTargeting") > 0);
assert(game.Battle.formationMultiplier({ weaponRange: "melee", position: 2, formationSize: 3 }) < 1);
assert(game.Battle.formationMultiplier({ weaponRange: "ranged", position: 0, formationSize: 3 }) < 1);
const frontSamples = Array.from({ length: 240 }, (_, seed) => game.Battle.resolve({ seed: seed + 1, partyIds: [], partySnapshot: [member([]), Object.assign({}, member([]), { id: "rear", name: "後列", position: 2 })] }, dungeon));
const frontHits = frontSamples.reduce((sum, sample) => sum + sample.memberReports.find(entry => entry.id === "hero").damageTaken, 0);
const rearHits = frontSamples.reduce((sum, sample) => sum + sample.memberReports.find(entry => entry.id === "rear").damageTaken, 0);
assert(frontHits > rearHits, "ordinary enemies should prefer front rows while rear-targeting remains a special trait");
game.GameData.monsters.slime.targetRule = "rear_weighted";
const rearWeightedSamples = Array.from({ length: 240 }, (_, seed) => game.Battle.resolve({ seed: seed + 500, partyIds: [], partySnapshot: [member([]), Object.assign({}, member([]), { id: "rear", name: "後列", position: 2 })] }, dungeon));
const weightedFrontHits = rearWeightedSamples.reduce((sum, sample) => sum + sample.memberReports.find(entry => entry.id === "hero").damageTaken, 0);
const weightedRearHits = rearWeightedSamples.reduce((sum, sample) => sum + sample.memberReports.find(entry => entry.id === "rear").damageTaken, 0);
assert(weightedRearHits > weightedFrontHits, "rear-weighted enemies should favor rear rows without fixing every attack to the last row");
console.log("Enemy formation test passed: enemy rows, automatic targeting and rear-targeting job skill");
