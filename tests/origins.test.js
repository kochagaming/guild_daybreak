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
  ["data/masterSchema.js", "data/items.js", "data/facilities.js", "data/qualities.js", "data/equipmentSkills.js", "data/skills.js", "data/jobs.js", "data/characterGrowth.js", "data/origins.js", "data/affinities.js", "data/progressionSkills.js", "data/skillGrants.js", "data/skillCategories.js", "data/monsters.js", "data/dungeons.js", "data/combatEffects.js", "js/runtime.js", "js/storage.js", "js/save.js", "js/gameState.js", "js/equipmentSkills.js", "js/characters.js", "js/items.js", "js/party.js", "js/monsterLoot.js", "js/exploration.js", "js/skillCombat.js", "js/statusCombat.js", "js/combatMath.js", "js/combatDecision.js", "js/battle.js", "js/dungeon.js"].forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context));
  return context.window;
}
let game = load();
let count = 0;
assert.strictEqual(Object.keys(game.GameData.races).length, 15);
assert.strictEqual(Object.keys(game.GameData.jobs).length, 15);
assert.strictEqual(Object.keys(game.GameData.births).length, 15);
for (const job of Object.values(game.GameData.jobs)) {
  const grants = game.GameData.relations.skillGrants.job[job.id];
  assert.strictEqual(grants.filter(entry => entry.initial).length, 4, `${job.name} should have four starting skills`);
  assert.deepStrictEqual(Array.from(grants.filter(entry => !entry.initial), entry => entry.level), [10, 40, 70, 100]);
  grants.forEach(entry => assert(game.GameData.skills[entry.skillId] && game.GameData.config.skillCategories[game.GameData.skills[entry.skillId].category]));
}
for (const race of Object.values(game.GameData.races)) {
  const grants = game.GameData.relations.skillGrants.race[race.id];
  assert.strictEqual(grants.filter(entry => entry.initial).length, 4);
  assert.deepStrictEqual(Array.from(grants.filter(entry => !entry.initial), entry => entry.level), [1, 30, 60, 100]);
}
for (const birth of Object.values(game.GameData.births)) {
  const grants = game.GameData.relations.skillGrants.birth[birth.id];
  assert.strictEqual(grants.filter(entry => entry.initial).length, 4);
  assert(grants.filter(entry => entry.initial).every(entry => game.GameData.skills[entry.skillId].effects.some(effect => effect.type === "combatModifier")), `${birth.name} should provide starting traits`);
  assert.deepStrictEqual(Array.from(grants.filter(entry => !entry.initial), entry => entry.level), [1, 20, 60, 100]);
}
for (const group of ["race", "birth"]) Object.values(game.GameData.relations.skillGrants[group]).flat().forEach(entry => {
  assert(game.GameData.skills[entry.skillId], `${group} has an invalid skill`);
});
for (const race of Object.keys(game.GameData.races)) {
  for (const job of Object.keys(game.GameData.jobs)) {
    for (const birth of Object.keys(game.GameData.births)) {
      const character = { id: "combination", name: "組み合わせ", jobId: job, raceId: race, birthId: birth, level: 1, exp: 0, attributes: { vitality: 10, strength: 10, fortitude: 10, intelligence: 10, spirit: 10, dexterity: 10, agility: 10, luck: 10 }, equipment: [], career: null };
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
const milestone = { id: "milestone", name: "節目", jobId: "warrior", raceId: "human", birthId: "common", level: 1, exp: 0, attributes: { vitality: 10, strength: 10, fortitude: 10, intelligence: 10, spirit: 10, dexterity: 10, agility: 10, luck: 10 }, equipment: [], career: null };
assert.deepStrictEqual(Array.from(game.Characters.attributeKeys()), ["vitality", "strength", "fortitude", "intelligence", "spirit", "dexterity", "agility", "luck"]);
const chart = game.Characters.attributeChart(milestone);
assert(Object.values(chart.total).every(value => value >= 0 && value <= 100), "Radar values stay within the display scale");
const withAttribute = (key, value) => ({ ...milestone, attributes: { ...milestone.attributes, [key]: value } });
assert(game.Characters.stats(withAttribute("strength", 14)).physicalPower > game.Characters.stats(withAttribute("strength", 8)).physicalPower, "Strength should increase final physical power");
assert(game.Characters.stats(withAttribute("intelligence", 14)).magicPower > game.Characters.stats(withAttribute("intelligence", 8)).magicPower, "Intelligence should increase final spell power");
assert(game.Characters.stats(withAttribute("spirit", 14)).healingPower > game.Characters.stats(withAttribute("spirit", 8)).healingPower, "Spirit should increase final healing power");
assert(game.Characters.stats(withAttribute("vitality", 14)).healingReceived > game.Characters.stats(withAttribute("vitality", 8)).healingReceived, "Vitality should increase recovery received from allies and rests");
assert(game.Characters.stats(withAttribute("vitality", 1000)).healingReceived <= game.GameData.config.characterGrowth.attributes.powerMultipliers.healingReceived.maximum, "Recovery received stays bounded");
assert(game.Characters.stats(withAttribute("intelligence", 20)).statusChanceBonus > game.Characters.stats(withAttribute("intelligence", 8)).statusChanceBonus, "Intelligence should improve status-infliction success without changing skill data");
assert(game.Characters.stats(withAttribute("luck", 20)).statusChanceBonus > game.Characters.stats(withAttribute("luck", 8)).statusChanceBonus, "Luck should remain a second route to status-infliction success");
assert(game.Characters.stats(withAttribute("intelligence", 1000)).statusChanceBonus <= game.GameData.config.characterGrowth.attributes.statusInfliction.maximumBonus, "Attribute status-infliction bonuses stay bounded");
assert(game.Characters.stats(withAttribute("strength", 1000)).physicalPower <= game.GameData.config.characterGrowth.attributes.powerMultipliers.physicalPower.maximum, "Attribute power bonuses stay bounded");
const sturdy = game.Characters.stats(withAttribute("fortitude", 20));
const frail = game.Characters.stats(withAttribute("fortitude", 8));
assert(["poison", "burn", "chill"].every(id => sturdy.statusResistances[id] > (frail.statusResistances[id] || 0)), "Fortitude above the level baseline should resist bodily ailments");
assert(game.Characters.stats(withAttribute("spirit", 20)).statusResistances.paralysis > (game.Characters.stats(withAttribute("spirit", 8)).statusResistances.paralysis || 0), "Spirit above the level baseline should resist paralysis");
assert(game.Characters.stats(withAttribute("fortitude", 1000)).statusResistances.poison <= game.GameData.config.characterGrowth.attributes.statusResistances.maximum, "Attribute status resistance stays bounded");
const rareBow = game.Items.createInstance("wolf_fang_bow", { source: "drop", qualityId: "standard", modifiers: {} });
const rareBreakdown = game.Characters.attributeBreakdown(milestone, [rareBow]);
assert.strictEqual(rareBreakdown.equipment.dexterity, 1);
assert.strictEqual(rareBreakdown.equipment.luck, 1);
const rarePlate = game.Items.createInstance("golem_plate", { source: "drop", qualityId: "standard", modifiers: {} });
assert(game.Characters.stats(milestone, [rarePlate]).statusResistances.poison > (game.Characters.stats(milestone).statusResistances.poison || 0), "Rare primary-attribute gear should also improve its derived ailment resistance");
assert(Object.keys(game.GameData.items.tempest_bow.attributeBonuses || {}).length, "Early boss equipment should carry role-matched primary attributes");
assert.strictEqual(game.GameData.items.wooden_sword.attributeBonuses, undefined, "Ordinary equipment does not alter primary attributes");
const lucky = { ...milestone, attributes: { ...milestone.attributes, luck: 20 } };
assert(game.Characters.luckAcquisitionMultiplier([lucky]) > 1 && game.Characters.luckAcquisitionMultiplier([lucky]) <= 1.1, "Party-average luck provides a bounded acquisition bonus");
const startingWeightUnit = game.Characters.equipmentWeightUnitAtLevel(1);
assert(game.Characters.maxWeight(milestone) > game.Characters.maxWeight({ ...milestone, jobId: "mage" }), "Strength and fortitude should give warriors more capacity than mages");
assert(game.Characters.maxWeight(milestone) < game.Characters.averageEquipmentWeight(), "Lv.1 warrior should no longer receive an all-tier equipment weight allowance");
const learnedAt = level => { milestone.level = level; return new Set(game.Characters.learnedSkills(milestone).map(skill => skill.id)); };
assert(!learnedAt(1).has("power_strike") && learnedAt(1).has("adaptive_strike") && learnedAt(1).has("birth_common_resolve"));
assert(!learnedAt(1).has("race_human_adapt") && learnedAt(30).has("race_human_adapt"));
assert(learnedAt(10).has("power_strike") && !learnedAt(10).has("rear_protection"));
assert(learnedAt(20).has("progression_birth_common_growth20"));
assert(learnedAt(40).has("rear_protection"));
const knight = { ...milestone, id: "knight-milestone", jobId: "knight", level: 10 };
assert(game.Characters.learnedSkills(knight).some(skill => skill.id === "knight_guard"), "knights should learn an active guard before telegraphed bosses appear");
const noviceCleric = { ...milestone, id: "novice-cleric", jobId: "cleric", level: 1 };
const novicePrayer = game.Characters.learnedSkills(noviceCleric).find(skill => skill.id === "initial_job_cleric_specialty");
assert(novicePrayer && novicePrayer.category === "healing", "clerics should be able to perform their role before the level 10 job milestone");
assert.strictEqual(novicePrayer.effects.find(effect => effect.type === "heal").multiplier, .72);
assert(!game.Characters.learnedSkills(noviceCleric).some(skill => skill.id === "heal"), "the stronger level 10 healing skill should remain a milestone reward");
assert(learnedAt(60).has("progression_birth_common_growth60") && learnedAt(60).has("progression_race_human_awakening"));
assert(learnedAt(70).has("iron_guard"));
assert(learnedAt(100).has("progression_job_warrior_mastery") && learnedAt(100).has("progression_race_human_trueblood") && learnedAt(100).has("progression_birth_common_legacy"));
const elf = game.Characters.get(require("./helpers").createCharacter(game, "弓使い", "thief", "elf", "hunter").id);
assert(Math.abs(game.Characters.profile(elf).weaponAffinity.bow - 1.518) < 1e-9);
assert(game.Characters.stats(elf).speed > game.Characters.stats(milestone).speed);
assert(game.Characters.stats(elf).criticalRate > game.Characters.stats(milestone).criticalRate);
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
const healerPower = game.Characters.stats(healer).healingPower;
assert(healerPower > 1.2, "Spirit and sacred-origin healing bonuses should stack");
game.Party.toggle(healer.id);
assert(game.Dungeon.start("meadow").ok);
assert(game.GameState.data.expeditions[0].partySnapshot[0].skillIds.includes("heal"));
assert.strictEqual(game.GameState.data.expeditions[0].partySnapshot[0].stats.healingPower, healerPower);
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

