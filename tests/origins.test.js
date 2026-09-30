const fs = require("fs");
const vm = require("vm");
const path = require("path");
const assert = require("assert");
const root = path.resolve(__dirname, "..");
let saved = null;
function load() {
  const context = vm.createContext({ console, Date, Math, window: {}, localStorage: {
    getItem: () => saved, setItem: (key, value) => { saved = value; }, removeItem: () => { saved = null; }
  } });
  ["data/items.js", "data/facilities.js", "data/qualities.js", "data/equipmentSkills.js", "data/skills.js", "data/jobs.js", "data/characterGrowth.js", "data/origins.js", "data/affinities.js", "data/progressionSkills.js", "data/skillGrants.js", "data/skillCategories.js", "data/monsters.js", "data/dungeons.js", "data/combatEffects.js", "js/runtime.js", "js/storage.js", "js/save.js", "js/gameState.js", "js/equipmentSkills.js", "js/characters.js", "js/items.js", "js/party.js", "js/exploration.js", "js/skillCombat.js", "js/statusCombat.js", "js/battle.js", "js/dungeon.js"].forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context));
  return context.window;
}
let game = load();
let count = 0;
assert.strictEqual(Object.keys(game.GameData.races).length, 15);
assert.strictEqual(Object.keys(game.GameData.jobs).length, 15);
assert.strictEqual(Object.keys(game.GameData.births).length, 15);
for (const job of Object.values(game.GameData.jobs)) {
  const grants = game.GameData.skillGrants.job[job.id];
  assert.strictEqual(grants.filter(entry => entry.initial).length, 4, `${job.name} should have four starting skills`);
  assert.deepStrictEqual(Array.from(grants.filter(entry => !entry.initial), entry => entry.level), [10, 40, 70, 100]);
  grants.forEach(entry => assert(game.GameData.skills[entry.skillId] && game.GameData.skillCategories[game.GameData.skills[entry.skillId].category]));
}
for (const race of Object.values(game.GameData.races)) {
  const grants = game.GameData.skillGrants.race[race.id];
  assert.strictEqual(grants.filter(entry => entry.initial).length, 4);
  assert.deepStrictEqual(Array.from(grants.filter(entry => !entry.initial), entry => entry.level), [1, 30, 60, 100]);
}
for (const birth of Object.values(game.GameData.births)) {
  const grants = game.GameData.skillGrants.birth[birth.id];
  assert.strictEqual(grants.filter(entry => entry.initial).length, 4);
  assert(grants.filter(entry => entry.initial).every(entry => game.GameData.skills[entry.skillId].effects.some(effect => effect.type === "combatModifier")), `${birth.name} should provide starting traits`);
  assert.deepStrictEqual(Array.from(grants.filter(entry => !entry.initial), entry => entry.level), [1, 20, 60, 100]);
}
for (const group of ["race", "birth"]) Object.values(game.GameData.skillGrants[group]).flat().forEach(entry => {
  assert(game.GameData.skills[entry.skillId], `${group} has an invalid skill`);
});
for (const race of Object.keys(game.GameData.races)) {
  for (const job of Object.keys(game.GameData.jobs)) {
    for (const birth of Object.keys(game.GameData.births)) {
      const character = { id: "combination", name: "組み合わせ", jobId: job, raceId: race, birthId: birth, level: 1, exp: 0, base: { hp: 50, attack: 10, defense: 8 }, equipment: [], career: null };
      const stats = game.Characters.stats(character);
      Object.values(stats).filter(value => typeof value === "number").forEach(value => assert(Number.isFinite(value) && value >= 0));
      Object.values(stats.elementModifiers).forEach(value => assert(Number.isFinite(value) && value > 0));
      Object.values(stats.statusResistances).forEach(value => assert(Number.isFinite(value) && value >= 0 && value <= 1));
      assert(game.Characters.maxWeight(character) > 0);
      const skills = game.Characters.skillProgression(character);
      assert.strictEqual(new Set(skills.map(skill => skill.id)).size, skills.length);
      count++;
    }
  }
}
assert.strictEqual(count, 3375);
const milestone = { id: "milestone", name: "節目", jobId: "warrior", raceId: "human", birthId: "common", level: 1, exp: 0, base: { hp: 50, attack: 10, defense: 8 }, equipment: [], career: null };
const averageWeight = game.Characters.averageEquipmentWeight();
assert.strictEqual(game.Characters.maxWeight(milestone), Math.round(averageWeight * game.GameData.jobs.warrior.weightMultiplier * 10) / 10, "Lv.1 warrior capacity should exceed one average item through its job bonus");
assert.strictEqual(game.Characters.maxWeight({ ...milestone, jobId: "mage" }), Math.round(averageWeight * game.GameData.jobs.mage.weightMultiplier * 10) / 10, "Lv.1 mage capacity should stay below one average item");
const learnedAt = level => { milestone.level = level; return new Set(game.Characters.learnedSkills(milestone).map(skill => skill.id)); };
assert(!learnedAt(1).has("power_strike") && learnedAt(1).has("adaptive_strike") && learnedAt(1).has("birth_common_resolve"));
assert(!learnedAt(1).has("race_human_adapt") && learnedAt(30).has("race_human_adapt"));
assert(learnedAt(10).has("power_strike") && !learnedAt(10).has("rear_protection"));
assert(learnedAt(20).has("progression_birth_common_growth20"));
assert(learnedAt(40).has("rear_protection"));
const knight = { ...milestone, id: "knight-milestone", jobId: "knight", level: 10 };
assert(game.Characters.learnedSkills(knight).some(skill => skill.id === "knight_guard"), "knights should learn an active guard before telegraphed bosses appear");
assert(learnedAt(60).has("progression_birth_common_growth60") && learnedAt(60).has("progression_race_human_awakening"));
assert(learnedAt(70).has("iron_guard"));
assert(learnedAt(100).has("progression_job_warrior_mastery") && learnedAt(100).has("progression_race_human_trueblood") && learnedAt(100).has("progression_birth_common_legacy"));
const elf = game.Characters.get(require("./helpers").createCharacter(game, "弓使い", "thief", "elf", "hunter").id);
assert(Math.abs(game.Characters.profile(elf).weaponAffinity.bow - 1.518) < 1e-9);
assert.strictEqual(game.Characters.stats(elf).speed, 19);
assert(Math.abs(game.Characters.stats(elf).criticalRate - .25) < 1e-9);
const bow = game.Items.createInstance("short_bow", { source: "shop" });
assert.strictEqual(game.Characters.equipmentEffects(elf, bow).attack, Math.round(game.Items.effects(bow).attack * 1.518));
assert.strictEqual(game.Characters.equipmentEffects(elf, bow).weight, game.Items.effects(bow).weight);
const warrior = game.Characters.get(require("./helpers").createCharacter(game, "衛兵", "warrior", "dwarf", "guard").id);
warrior.level = 20;
const strike = game.Characters.learnedSkills(warrior).find(skill => skill.id === "power_strike");
assert.strictEqual(strike.level, 10);
assert.strictEqual(strike.sources.length, 2);
assert(Math.abs(game.Characters.profile(warrior).armorAffinity.heavy - 1.584) < 1e-9);
const healer = game.Characters.get(require("./helpers").createCharacter(game, "回復魔術師", "mage", "elf", "sacred").id);
healer.level = 20;
assert(game.Characters.learnedSkills(healer).some(skill => skill.id === "heal"));
assert.strictEqual(game.Characters.stats(healer).healingPower, 1.2);
game.Party.toggle(healer.id);
assert(game.Dungeon.start("meadow").ok);
assert(game.GameState.data.expeditions[0].partySnapshot[0].skillIds.includes("heal"));
assert.strictEqual(game.GameState.data.expeditions[0].partySnapshot[0].stats.healingPower, 1.2);
assert(game.GameState.data.expeditions[0].partySnapshot[0].skillIds.includes("birth_sacred_care"));
const veteran = game.Characters.get(require("./helpers").createCharacter(game, "古参", "warrior", "giantkin", "mercenary").id);
veteran.level = 70;
const veteranSkillIds = game.Characters.learnedSkills(veteran).map(skill => skill.id);
assert(veteranSkillIds.includes("iron_guard") && veteranSkillIds.includes("race_giantkin_force") && veteranSkillIds.includes("birth_mercenary_habit"));
const veteranHero = { currentHp: 100, skillIds: veteranSkillIds };
assert(game.SkillCombat.combatMultiplier(veteranHero, "outgoingPhysical") > 1);
assert(game.SkillCombat.combatMultiplier(veteranHero, "incomingPhysical") < 1);
assert(Number.isFinite(game.SkillCombat.combatBonus(veteranHero, "hitBonus")));
game = load();
assert.strictEqual(game.Characters.get(healer.id).raceId, "elf");
assert.strictEqual(game.Characters.get(healer.id).birthId, "sacred");
console.log("Origins test passed: 15 races × 15 jobs × 15 births (3375 combinations), staged job/race/birth traits, battle modifiers, affinities, snapshots and persistence");

