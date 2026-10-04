const fs = require("fs");
const vm = require("vm");
const path = require("path");

const root = path.resolve(__dirname, "..");
const context = vm.createContext({ console, window: {} });
context.window.window = context.window;
["data/masterSchema.js", "data/skills.js", "data/jobs.js", "data/monsters.js", "data/dungeons.js", "data/combatEffects.js", "js/runtime.js", "js/monsterLoot.js", "js/exploration.js", "data/skillCategories.js", "js/skillCombat.js", "js/statusCombat.js", "js/combatMath.js", "js/combatDecision.js", "js/battle.js"].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
});

function member(name, jobId, position, weaponRange, stats, skillIds) {
  return { id: name, name, jobId, level: stats.level, position, weaponRange, skillIds, stats };
}

function winRate(dungeonId, partySnapshot) {
  let wins = 0;
  const { monsterScaling, ...baselineDungeon } = context.window.GameData.dungeons[dungeonId];
  for (let seed = 1; seed <= 200; seed += 1) {
    const result = context.window.Battle.resolve({ seed, partySnapshot, partyIds: [] }, baselineDungeon);
    if (result.success) wins += 1;
  }
  return Math.round(wins / 2);
}

const meadowParty = [member("戦士", "warrior", 0, "melee", { level: 1, hp: 64, attack: 14, defense: 10, speed: 8, attackCount: 1, criticalRate: 0.05 }, [])];
const caveParty = [
  member("戦士", "warrior", 0, "melee", { level: 3, hp: 86, attack: 22, defense: 16, speed: 8, attackCount: 1, criticalRate: 0.05 }, ["power_strike"]),
  member("盗賊", "thief", 1, "melee", { level: 3, hp: 66, attack: 20, defense: 11, speed: 16, attackCount: 2, criticalRate: 0.18 }, ["vital_strike"]),
  member("魔術師", "mage", 2, "ranged", { level: 3, hp: 54, attack: 27, defense: 9, speed: 11, attackCount: 1, criticalRate: 0.08 }, ["fireball"])
];
const ruinsParty = [
  member("戦士", "warrior", 0, "melee", { level: 5, hp: 109, attack: 29, defense: 21, speed: 9, attackCount: 1, criticalRate: 0.05 }, ["power_strike", "iron_guard"]),
  member("僧侶", "cleric", 1, "ranged", { level: 5, hp: 87, attack: 27, defense: 17, speed: 11, attackCount: 1, criticalRate: 0.05 }, ["heal", "prayer"]),
  member("魔術師", "mage", 2, "ranged", { level: 5, hp: 68, attack: 39, defense: 12, speed: 12, attackCount: 1, criticalRate: 0.08 }, ["fireball", "arcane_burst"])
];

const rates = { meadow: winRate("meadow", meadowParty), cave: winRate("cave", caveParty), ruins: winRate("ruins", ruinsParty) };
// Campaign-specific scaling is intentionally removed here. These fixed fixtures guard the
// common cooldown, attack-count, targeting and status rules; campaign balance has its own report.
if (rates.meadow < 37 || rates.meadow > 57 || rates.cave < 54 || rates.cave > 74 || rates.ruins < 40 || rates.ruins > 60) {
  throw new Error(`現行ルールの固定編成標本が回帰範囲外です: ${JSON.stringify(rates)}`);
}
console.log(`Balance sample passed: 草原 ${rates.meadow}% / 洞窟 ${rates.cave}% / 遺跡 ${rates.ruins}%`);
