const fs = require("fs");
const vm = require("vm");
const path = require("path");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ console, window: {} });
context.window.window = context.window;
["data/skills.js", "data/jobs.js", "data/monsters.js", "data/dungeons.js", "js/runtime.js", "js/exploration.js", "data/skillCategories.js", "js/skillCombat.js", "js/statusCombat.js", "js/battle.js"].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
});

const battle = context.window.Battle;
function assert(condition, message) { if (!condition) throw new Error(message); }
assert(battle.formationMultiplier({ weaponRange: "melee", position: 0 }) === 1, "近接武器は前衛で100%になること");
assert(battle.formationMultiplier({ weaponRange: "melee", position: 2 }) === 0.62, "近接武器は後衛で弱くなること");
assert(battle.formationMultiplier({ weaponRange: "ranged", position: 0 }) === 0.62, "遠距離武器は前衛で弱くなること");
assert(battle.formationMultiplier({ weaponRange: "ranged", position: 2 }) === 1, "遠距離武器は後衛で100%になること");

const partySnapshot = [
  { id: "warrior", name: "戦士", jobId: "warrior", level: 5, position: 0, weaponRange: "melee", actionRates: { attack: 25, technique: 75, spell: 0, healing: 0 }, skillIds: ["power_strike", "iron_guard"], stats: { hp: 109, attack: 29, defense: 21, speed: 9, criticalRate: 0.05 } },
  { id: "cleric", name: "僧侶", jobId: "cleric", level: 5, position: 1, weaponRange: "ranged", actionRates: { attack: 20, technique: 0, spell: 0, healing: 80 }, skillIds: ["heal", "prayer"], stats: { hp: 87, attack: 27, defense: 17, speed: 11, criticalRate: 0.05 } },
  { id: "thief", name: "盗賊", jobId: "thief", level: 5, position: 2, weaponRange: "ranged", actionRates: { attack: 25, technique: 75, spell: 0, healing: 0 }, skillIds: ["vital_strike", "twin_strike"], stats: { hp: 82, attack: 31, defense: 15, speed: 17, criticalRate: 0.18 } }
];

let sawSkill = false;
let sawHeal = false;
let sawCritical = false;
for (let seed = 1; seed <= 80; seed += 1) {
  const result = battle.resolve({ seed, partySnapshot, partyIds: [] }, context.window.GameData.dungeons.ruins);
  sawSkill ||= result.battleLog.some((entry) => entry.kind === "skill");
  sawHeal ||= result.battleLog.some((entry) => entry.kind === "heal");
  sawCritical ||= result.battleLog.some((entry) => entry.text.includes("【会心】"));
}
assert(sawSkill, "職業スキルが戦闘ログに記録されること");
assert(sawHeal, "僧侶の回復が戦闘ログに記録されること");
assert(sawCritical, "会心が戦闘ログに記録されること");

const sample = battle.resolve({ seed: 7, partySnapshot, partyIds: [] }, context.window.GameData.dungeons.meadow);
const firstRound = sample.battleLog.findIndex((entry) => entry.kind === "round");
const firstAction = sample.battleLog.slice(firstRound + 1).find((entry) => ["hero", "skill", "heal", "enemy"].includes(entry.kind));
assert(firstAction && firstAction.text.includes("盗賊"), "行動速度が高いキャラクターから行動すること");
assert(sample.battleLog.filter((entry) => entry.kind === "formation").length >= 3, "味方と敵の隊列補正が戦闘ログに記録されること");
console.log("Job battle test passed: formation → speed order → skills → healing → critical logs");
