const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1]).filter(file => !["js/ui.js", "js/main.js"].includes(file));
scripts.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));
const game = context.window, data = game.GameData;
const has = (table, id) => Object.prototype.hasOwnProperty.call(table || {}, id);
const validStoryEffect = effect => effect?.type === "joinCompanion"
  ? has(data.companionProfiles, effect.companionId)
  : effect?.type === "advanceCompanion"
    && has(data.companionProfiles, effect.companionId)
    && has(data.relations.companionProgressions?.[effect.companionId]?.stages, effect.stageId);
const growth = data.config.characterGrowth;
assert.deepStrictEqual(Object.keys(growth.attributes.powerMultipliers).sort(), ["healingPower", "healingReceived", "magicPower", "physicalPower"]);
Object.values(growth.attributes.powerMultipliers).forEach(rule => {
  assert(growth.attributes.order.includes(rule.attribute));
  assert(Number.isFinite(rule.coefficient) && rule.coefficient > 0 && rule.minimum > 0 && rule.maximum >= rule.minimum);
});
assert(growth.attributes.statusInfliction.intelligencePerChartPoint > 0 && growth.attributes.statusInfliction.maximumBonus <= .3, "Status-infliction growth must be bounded master data");
assert.deepStrictEqual(Array.from(growth.skillMasteryRanks, rank => [rank.id, rank.minimumUses]), [["familiar", 10], ["trusted", 50], ["signature", 200]], "Skill-use mastery ranks are explicit, ascending master data");
const actualAverageWeight = growth.averageEquipmentWeight;
assert(Number.isFinite(actualAverageWeight) && actualAverageWeight > 0, "Reference equipment weight must remain an explicit, stable balance constant");
assert.strictEqual(data.config.equipmentBalance.efficiencyGrowthPerTier, .04, "Tier equipment efficiency growth must be an explicit balance constant");
for (const [typeId, expected] of Object.entries(data.config.equipmentBalance.referenceEfficiency)) {
  const tierOneId = data.config.shop.standardTiers.find(entry => entry.tier === 1).itemIds.find(id => (data.items[id].weaponType || data.items[id].armorType) === typeId);
  assert(tierOneId, `${typeId} needs a Tier 1 standard reference item`);
  const reference = game.Items.template(tierOneId);
  assert(Math.abs(game.Items.performanceScore(reference) / reference.weight - expected) < 1e-9, `${typeId} reference efficiency must match its Tier 1 standard item`);
}
assert.deepStrictEqual(Array.from(growth.equipmentCapacityMilestones, entry => entry[0]), [1, 3, 6, 9, 12, 16, 20, 25, 30, 36, 42, 49, 58, 67, 77, 89, 102, 118, 134, 150, 166, 183, 200]);
assert.deepStrictEqual(Array.from(growth.equipmentWeightUnitMilestones, entry => entry[0]), [1, 20, 49, 89]);
growth.equipmentCapacityMilestones.forEach(([level, items]) => assert.strictEqual(game.Characters.baseMaxWeight(level), items * game.Characters.equipmentWeightUnitAtLevel(level)));
assert.strictEqual(game.Characters.equipmentWeightUnitAtLevel(1), 3);
assert.strictEqual(game.Characters.equipmentWeightUnitAtLevel(89), actualAverageWeight);
assert.strictEqual(game.Characters.equipmentWeightUnitAtLevel(200), actualAverageWeight);
assert(game.Characters.baseMaxWeight(1) < actualAverageWeight && game.Characters.baseMaxWeight(20) < 7 * actualAverageWeight, "Early weight capacity should no longer use the all-tier average");
assert.strictEqual(game.Characters.equipmentCapacityAtLevel(285), 28);
assert.strictEqual(game.Characters.equipmentCapacityAtLevel(1000), 28, "Post-200 capacity is capped at 28 average items");
const namedTables = [data.items, data.skills, data.jobs, data.races, data.births, data.monsters, data.dungeons, data.equipmentTypes, data.elements, data.statusEffects, data.storyScenes, data.storyCharacters];

for (const table of namedTables) for (const [key, entry] of Object.entries(table)) {
  assert.strictEqual(entry.id, key, `object key and id differ: ${key}`);
  assert(typeof entry.name === "string" && entry.name.trim(), `${key} needs a display name`);
}

for (const item of Object.values(data.items).filter(item => item.type === "weapon" || item.type === "armor")) {
  const typeId = item.type === "weapon" ? item.weaponType : item.armorType;
  assert(typeof typeId === "string" && has(data.equipmentTypes, typeId), `${item.id} needs a defined equipment type`);
  assert.strictEqual(data.equipmentTypes[typeId].category, item.type, `${item.id} equipment type category differs`);
  if (item.type === "weapon") assert(["melee", "ranged"].includes(item.range), `${item.id} needs a weapon range`);
  const skillIds = data.relations.itemSkillGrants[item.id];
  assert(Array.isArray(skillIds) && skillIds.length > 0 && new Set(skillIds).size === skillIds.length, `${item.id} needs unique fixed equipment skills`);
  skillIds.forEach(id => assert(has(data.equipmentSkills, id), `${item.id} references unknown equipment skill ${id}`));
  assert(!Object.prototype.hasOwnProperty.call(item, "skillIds"), `${item.id} must not mix skill relations into its item record`);
  const combatStats = data.derived.itemCombatStats[item.id];
  assert(combatStats && ["magicAttack", "magicDefense", "magicHealing"].every(key => Number.isFinite(combatStats[key])), `${item.id} needs complete derived combat stats`);
  const resolvedItem = game.Items.template(item.id);
  assert(["magicAttack", "magicDefense", "magicHealing"].every(key => resolvedItem[key] === combatStats[key]), `${item.id} must resolve the shared combat projection`);
  const effect = game.Items.standardEffects(item.id);
  const effectiveTemplate = { ...item, ...effect };
  assert(game.Items.performanceScore(effectiveTemplate) / effect.weight + 1e-9 >= game.Items.performanceFloor(item), `${item.id} falls below its Tier ${item.tier} performance-per-weight floor`);
  assert(game.Items.tierEfficiencyMultiplier(item) <= data.config.equipmentBalance.maximumAutomaticAdjustment, `${item.id} needs an excessive automatic efficiency adjustment`);
}
assert(!Object.prototype.hasOwnProperty.call(data.items.wooden_sword, "magicAttack"), "Derived item stats must not mutate the source item record");
assert(!Object.prototype.hasOwnProperty.call(data.items.cloth_clothes, "magicDefense"), "Derived armor stats must not mutate the source item record");

for (const type of Object.values(data.equipmentTypes)) {
  const standard = data.config.shop.standardTiers.map(entry => entry.itemIds.find(id => (data.items[id].weaponType || data.items[id].armorType) === type.id));
  standard.slice(1).forEach((itemId, index) => {
    const previous = game.Items.performancePerWeight(data.items[standard[index]]);
    const current = game.Items.performancePerWeight(data.items[itemId]);
    assert(current > previous, `${type.id} Tier ${index + 2} must improve performance per weight over the previous Tier`);
  });
}

const equipmentEffectTypes = new Set(["multiplier", "bonus", "conversion", "power", "healingPower", "slayer", "statusResistance"]);
for (const [id, skill] of Object.entries(data.equipmentSkills)) {
  assert.strictEqual(skill.id, id);
  assert(typeof skill.name === "string" && skill.name.trim() && typeof skill.description === "string" && skill.description.trim());
  assert(Array.isArray(skill.effects) && skill.effects.length && skill.effects.every(effect => equipmentEffectTypes.has(effect.type)), `${id} has invalid equipment effects`);
  skill.effects.filter(effect => effect.type === "slayer").forEach(effect => assert(has(data.creatureFamilies, effect.familyId) && effect.value > 1, `${id} has an invalid slayer target`));
  skill.effects.filter(effect => effect.type === "statusResistance").forEach(effect => assert(has(data.statusEffects, effect.statusId) && effect.value > 0 && effect.value <= 1, `${id} has an invalid status resistance`));
}

for (const [id, skill] of Object.entries(data.monsterSkills || {})) {
  assert.strictEqual(skill.id, id);
  assert(typeof skill.name === "string" && skill.name.trim() && typeof skill.description === "string" && skill.description.trim());
  assert(Number.isInteger(skill.period) && skill.period >= 2 && ["single", "all"].includes(skill.target));
  assert(["physical", "magic"].includes(skill.damageType) && Number.isFinite(skill.multiplier) && skill.multiplier > 0);
  if (skill.statusAttack) assert(has(data.statusEffects, skill.statusAttack.statusId));
}
for (const [monsterId, grants] of Object.entries(data.relations.monsterDifficultySkillGrants || {})) {
  assert(has(data.monsters, monsterId), `${monsterId} difficulty skills reference an unknown monster`);
  for (const [difficultyId, skillIds] of Object.entries(grants)) {
    assert(["abyss", "divine"].includes(difficultyId), `${monsterId} has an invalid skill difficulty`);
    assert(Array.isArray(skillIds) && skillIds.length && new Set(skillIds).size === skillIds.length, `${monsterId}:${difficultyId} needs unique skill grants`);
    skillIds.forEach(id => assert(has(data.monsterSkills, id), `${monsterId}:${difficultyId} references unknown monster skill ${id}`));
  }
}
for (const [monsterId, overrides] of Object.entries(data.relations.monsterDifficultyDropOverrides || {})) {
  assert(has(data.monsters, monsterId), `${monsterId} drop overrides reference an unknown monster`);
  assert(Object.keys(overrides).every(id => ["abyss", "divine"].includes(id)), `${monsterId} has an invalid drop difficulty override`);
}
for (const monster of Object.values(data.monsters)) for (const difficultyId of ["abyss", "divine"]) {
  const drops = data.derived.monsterDifficultyDrops?.[monster.id]?.[difficultyId];
  assert(drops && Array.isArray(drops.materials) && drops.materials.length && drops.equipment, `${monster.id}:${difficultyId} needs complete resolved drops`);
  drops.materials.forEach(drop => assert(has(data.items, drop.itemId) && data.items[drop.itemId].type === "material", `${monster.id}:${difficultyId} has an invalid derived material drop`));
  assert(has(data.items, drops.equipment.itemId) && ["weapon", "armor"].includes(data.items[drops.equipment.itemId].type), `${monster.id}:${difficultyId} has an invalid derived equipment drop`);
}
for (const difficulty of Object.values(data.dungeonDifficulties || {})) {
  assert(Number.isInteger(difficulty.order) && difficulty.order >= 0 && difficulty.durationMultiplier >= 1 && difficulty.rewardMultiplier >= 1);
  if (difficulty.id === "normal") assert.strictEqual(difficulty.firstClearReward, null);
  else {
    assert(difficulty.firstClearReward && Number.isInteger(difficulty.firstClearReward.gold) && difficulty.firstClearReward.gold >= 0);
    assert(Object.entries(difficulty.firstClearReward.materials).every(([id, quantity]) => has(data.items, id) && Number.isInteger(quantity) && quantity > 0));
  }
}
assert.deepStrictEqual(Object.keys(data.relations.upgradeSkillProgression).sort(), Object.keys(data.equipmentTypes).sort(), "Every equipment type needs upgrade skill progression");
Object.values(data.equipmentTypes).forEach(type => assert(type.basicDamageType == null || ["physical", "magic"].includes(type.basicDamageType), `${type.id} has an invalid basic damage type`));
for (const [typeId, progression] of Object.entries(data.relations.upgradeSkillProgression)) {
  assert(has(data.equipmentTypes, typeId) && Array.isArray(progression) && progression.length === 2);
  assert.deepStrictEqual(Array.from(progression, entry => entry.level), [3, 6]);
  progression.forEach(entry => assert(has(data.equipmentSkills, entry.skillId)));
}
assert(data.config.ultraRare.dropChance > 0 && data.config.ultraRare.dropChance <= .001 && data.config.ultraRare.statMultiplier === 2);
for (const [id, title] of Object.entries(data.ultraRareTitles)) {
  assert.strictEqual(title.id, id);
  assert(typeof title.name === "string" && title.name.trim() && has(data.equipmentSkills, title.skillId));
}

const legacySkillFields = ["kind", "effect", "multiplier", "hits", "damageType", "defensePenetration", "criticalBonus", "threshold", "healFraction", "cooldown", "level"];
const effectTypes = new Set(["damage", "heal", "guard", "counter", "statMultiplier", "rearProtection", "combatModifier", "applyStatus", "cleanse", "slayer", "acquisitionModifier"]);
for (const skill of Object.values(data.skills)) {
  assert(data.config.skillCategories[skill.category], `${skill.id} has an invalid category`);
  assert(skill.activation && ["active", "passive", "reaction"].includes(skill.activation.type), `${skill.id} has an invalid activation`);
  if (skill.activation.type === "active") {
    assert(Number.isInteger(skill.activation.cooldownTurns) && skill.activation.cooldownTurns >= 1 && skill.activation.cooldownTurns <= 30, `${skill.id} needs an individual cooldown`);
  } else {
    assert(!Object.prototype.hasOwnProperty.call(skill.activation, "cooldownTurns"), `${skill.id} cannot have an active cooldown`);
  }
  assert(skill.targeting && typeof skill.targeting.scope === "string", `${skill.id} needs targeting`);
  assert(Array.isArray(skill.effects) && skill.effects.length, `${skill.id} needs effects`);
  assert(skill.effects.every(effect => effectTypes.has(effect.type)), `${skill.id} has an unknown effect`);
  skill.effects.filter(effect => effect.type === "damage" && effect.element).forEach(effect => assert(has(data.elements, effect.element), `${skill.id} has an unknown element`));
  skill.effects.filter(effect => effect.type === "applyStatus").forEach(effect => assert(has(data.statusEffects, effect.statusId) && effect.chance > 0 && effect.chance <= 1 && effect.duration > 0, `${skill.id} has invalid status data`));
  skill.effects.filter(effect => effect.type === "cleanse" && effect.statusIds !== "all").forEach(effect => effect.statusIds.forEach(id => assert(has(data.statusEffects, id), `${skill.id} cleanses an unknown status`)));
  skill.effects.filter(effect => effect.type === "slayer").forEach(effect => assert(has(data.creatureFamilies, effect.familyId) && effect.value > 1, `${skill.id} has an invalid slayer target`));
  skill.effects.filter(effect => effect.type === "combatModifier").forEach(effect => {
    const allowed = new Set(["outgoingPhysical", "outgoingMagic", "incomingPhysical", "incomingMagic", "healing", "hitBonus", "evasionBonus", "criticalBonus", "rearTargeting"]);
    assert(effect.modifiers && Object.entries(effect.modifiers).every(([key, value]) => allowed.has(key) && Number.isFinite(value) && (key.endsWith("Bonus") || value > 0)), `${skill.id} has invalid combat modifiers`);
  });
  skill.effects.filter(effect => effect.type === "acquisitionModifier").forEach(effect => {
    assert(["gold", "experience", "qualityRate", "itemRate", "explorationTime"].includes(effect.metric), `${skill.id} has an invalid acquisition metric`);
    assert(["multiplier", "flat"].includes(effect.operation) && Number.isFinite(effect.value), `${skill.id} has an invalid acquisition operation`);
    assert(["self", "party"].includes(effect.scope) && effect.stacking === (effect.scope === "party" ? "uniqueSkill" : "personal"), `${skill.id} has invalid acquisition stacking`);
    assert(effect.scope !== "self" || effect.metric === "experience", `${skill.id} uses unsupported personal acquisition effect`);
  });
  legacySkillFields.forEach(field => assert(!Object.prototype.hasOwnProperty.call(skill, field), `${skill.id} still uses legacy field ${field}`));
}
assert(new Set(Object.values(data.skills).filter(skill => skill.activation.type === "active").map(skill => skill.activation.cooldownTurns)).size >= 5, "Active skill cooldowns must not collapse to one shared value");

const owners = { job: data.jobs, race: data.races, birth: data.births };
for (const [ownerType, table] of Object.entries(owners)) {
  assert.deepStrictEqual(Object.keys(data.relations.skillGrants[ownerType]).sort(), Object.keys(table).sort(), `${ownerType} skill grants must be complete`);
  assert.deepStrictEqual(Object.keys(data.relations.equipmentAffinities[ownerType]).sort(), Object.keys(table).sort(), `${ownerType} affinities must be complete`);
  for (const entry of Object.values(table)) {
    assert(!("skills" in entry) && !("weaponAffinity" in entry) && !("armorAffinity" in entry), `${entry.id} mixes relations into its master record`);
    const grants = data.relations.skillGrants[ownerType][entry.id];
    const expectedLevels = { job: [10, 40, 70, 100], race: [1, 30, 60, 100], birth: [1, 20, 60, 100] }[ownerType];
    assert.strictEqual(grants.filter(grant => grant.initial).length, 4, `${ownerType}:${entry.id} needs four starting skills`);
    assert.deepStrictEqual(Array.from(grants.filter(grant => !grant.initial), grant => grant.level), expectedLevels, `${ownerType}:${entry.id} has invalid progression milestones`);
    grants.forEach(grant => {
      assert(has(data.skills, grant.skillId) && typeof grant.initial === "boolean" && Number.isInteger(grant.level) && grant.level > 0, `${ownerType}:${entry.id} has an invalid grant`);
      assert(!grant.initial || grant.level === 1, `${ownerType}:${entry.id} starting skill must use level 1 internally`);
    });
    Object.entries(data.relations.equipmentAffinities[ownerType][entry.id]).forEach(([type, multiplier]) => {
      assert(has(data.equipmentTypes, type) && Number.isFinite(multiplier) && multiplier > 0, `${ownerType}:${entry.id} has an invalid affinity`);
    });
    Object.entries(entry.elementModifiers || {}).forEach(([id, multiplier]) => assert(has(data.elements, id) && multiplier > 0, `${ownerType}:${entry.id} has an invalid element modifier`));
    Object.entries(entry.statusResistances || {}).forEach(([id, resistance]) => assert(has(data.statusEffects, id) && resistance >= 0 && resistance <= 1, `${ownerType}:${entry.id} has an invalid status resistance`));
  }
}

const pricing = data.config.recruitment.pricing;
assert(pricing && pricing.base >= 0 && pricing.roundTo > 0, "Recruitment pricing needs base and rounding rules");
assert(Array.isArray(pricing.foundingSubsidies) && pricing.foundingSubsidies.length === 3 && pricing.foundingSubsidies.every((value, index, values) => value >= 0 && (!index || value < values[index - 1])), "Recruitment needs three decreasing founding subsidies");
assert.deepStrictEqual(Object.keys(pricing.jobCosts).sort(), Object.keys(data.jobs).sort(), "Every job needs a recruitment cost");
assert.deepStrictEqual(Object.keys(pricing.raceCosts).sort(), Object.keys(data.races).sort(), "Every race needs a recruitment cost");
Object.values(pricing.jobCosts).concat(Object.values(pricing.raceCosts)).forEach(value => assert(Number.isFinite(value) && value >= 0));
assert.deepStrictEqual(Object.keys(pricing.abilityWeights).sort(), Object.keys(pricing.abilityBaselines).sort(), "Recruitment ability pricing fields must match");
const posting = data.config.recruitment.postingCost;
assert(has(data.items, posting.itemId) && data.items[posting.itemId].type === "material", "Recruitment posting needs a material");
assert(Number.isInteger(posting.baseQuantity) && posting.baseQuantity > 0 && Number.isInteger(posting.quantityPerSelection) && posting.quantityPerSelection > 0);
assert(Array.isArray(posting.brackets) && posting.brackets.length && posting.brackets.every(entry => Number.isInteger(entry.maximumSelections) && entry.applicants.length === 2 && entry.applicants[0] >= 2 && entry.applicants[1] <= 5));

for (const recipe of data.recipes) {
  assert(has(data.items, recipe.resultId), `${recipe.id} has an unknown result`);
  Object.keys(recipe.materials).forEach(id => assert(has(data.items, id) && data.items[id].type === "material", `${recipe.id} has an invalid material`));
  assert(!recipe.unlockAfter || data.storyChapters.some(chapter => chapter.id === recipe.unlockAfter) || has(data.dungeons, recipe.unlockAfter), `${recipe.id} has an invalid unlock reference`);
}
for (const dungeon of Object.values(data.dungeons)) {
  assert(data.storyChapters.some(chapter => chapter.id === dungeon.chapterId), `${dungeon.id} has an invalid chapter`);
  assert(Number.isInteger(dungeon.orderInChapter) && dungeon.orderInChapter > 0, `${dungeon.id} needs an order within its chapter`);
  assert(typeof dungeon.requiredForStory === "boolean" && Array.isArray(dungeon.unlockRequirements), `${dungeon.id} needs progression metadata`);
  if (dungeon.monsterScaling) {
    assert.deepStrictEqual(Array.from(Object.keys(dungeon.monsterScaling).sort()), ["boss", "regular"], `${dungeon.id} has incomplete monster scaling`);
    for (const [kind, modifiers] of Object.entries(dungeon.monsterScaling)) {
      assert(Object.keys(modifiers).every(key => ["hp", "attack", "defense"].includes(key)), `${dungeon.id}:${kind} has an unknown monster scaling field`);
      assert(Object.values(modifiers).every(value => Number.isFinite(value) && value > 0), `${dungeon.id}:${kind} has invalid monster scaling`);
    }
  }
  if (dungeon.clearStoryId) assert(has(data.storyScenes, dungeon.clearStoryId), `${dungeon.id} has an invalid clear story`);
  const storyLinks = data.relations.dungeonStoryLinks[dungeon.id];
  assert(storyLinks && has(data.storyScenes, storyLinks.openingStoryId), `${dungeon.id} needs an opening story relation`);
  assert(has(data.storyScenes, storyLinks.discoveryStoryId), `${dungeon.id} needs an exploration discovery story relation`);
  assert(!Object.prototype.hasOwnProperty.call(dungeon, "openingStoryId") && !Object.prototype.hasOwnProperty.call(dungeon, "discoveryStoryId"), `${dungeon.id} must not mix story links into its entity record`);
  if (dungeon.optionalStoryId) assert(!dungeon.requiredForStory && has(data.storyScenes, dungeon.optionalStoryId), `${dungeon.id} has an invalid optional story`);
  dungeon.unlockRequirements.forEach(requirement => {
    assert(["chapterCompleted", "dungeonClear", "characters", "departure", "itemOwned"].includes(requirement.type), `${dungeon.id} has an unknown unlock requirement`);
    if (requirement.type === "chapterCompleted") assert(data.storyChapters.some(chapter => chapter.id === requirement.chapterId));
    if (requirement.type === "dungeonClear") assert(has(data.dungeons, requirement.dungeonId));
    if (requirement.type === "itemOwned") assert(has(data.items, requirement.itemId));
  });
  dungeon.encounters.flatMap(encounter => encounter.groups.flat()).forEach(id => assert(has(data.monsters, id), `${dungeon.id} references unknown monster ${id}`));
  dungeon.drops.forEach(drop => assert(has(data.items, drop.itemId), `${dungeon.id} references unknown item ${drop.itemId}`));
  assert(!Object.prototype.hasOwnProperty.call(dungeon, "partyRestrictions"), `${dungeon.id} must not mix party restrictions into its entity record`);
  (data.relations.dungeonPartyRestrictions[dungeon.id] || []).forEach(rule => {
    assert(["allowedRaces", "onlyCompanions", "requiredCompanions"].includes(rule.type), `${dungeon.id} has an unknown party restriction`);
    if (rule.type === "allowedRaces") assert(Array.isArray(rule.raceIds) && rule.raceIds.length && rule.raceIds.every(id => has(data.races, id)), `${dungeon.id} has invalid allowed races`);
    if (["onlyCompanions", "requiredCompanions"].includes(rule.type)) assert(Array.isArray(rule.companionIds) && rule.companionIds.length && rule.companionIds.every(id => has(data.companionProfiles, id)), `${dungeon.id} has invalid companion restrictions`);
    if (rule.type === "requiredCompanions") assert([undefined, "all", "any"].includes(rule.match), `${dungeon.id} has an invalid companion match mode`);
  });
}
data.storyChapters.forEach((chapter, index) => {
  assert(chapter.order === index && Number.isInteger(chapter.number), `${chapter.id} has an invalid chapter order`);
  assert(has(data.storyScenes, chapter.openingStoryId) && has(data.storyScenes, chapter.clearStoryId), `${chapter.id} has invalid story scene references`);
  assert(Array.isArray(chapter.recommendedLevelRange) && chapter.recommendedLevelRange.length === 2 && chapter.recommendedLevelRange[0] <= chapter.recommendedLevelRange[1]);
  assert(Array.isArray(chapter.entryRequirements) && chapter.rewards && Number.isFinite(chapter.rewards.gold) && chapter.rewards.materials, `${chapter.id} needs progression and reward data`);
  assert(!Object.prototype.hasOwnProperty.call(chapter, "entryEffects") && !Object.prototype.hasOwnProperty.call(chapter, "effects"), `${chapter.id} must not mix story triggers into its chapter record`);
});
for (const [id, companion] of Object.entries(data.companionProfiles)) {
  const identity = data.storyCharacters[companion.characterId];
  assert(companion.id === id && companion.characterId === id && identity, `${id} has an invalid stable character identity`);
  assert(has(data.jobs, companion.jobId) && has(data.races, companion.raceId) && has(data.births, companion.birthId) && has(data.portraits, identity.portraitId), `${id} has invalid combat profile references`);
  assert(["name", "title", "description", "portraitId"].every(field => !Object.prototype.hasOwnProperty.call(companion, field)), `${id} must not duplicate story identity fields in its combat profile`);
  assert(Number.isInteger(companion.initialLevel) && companion.initialLevel >= 1 && data.config.characterGrowth.attributes.order.every(key => companion.attributes[key] > 0), `${id} has invalid initial ability data`);
  const grants = data.relations.companionSkillGrants[id];
  assert(Array.isArray(grants) && grants.length && grants.every(grant => grant.initial && grant.level === 1 && has(data.skills, grant.skillId)), `${id} has invalid personal skill grants`);
  const progression = data.relations.companionProgressions[id];
  assert(progression && progression.companionId === id && has(progression.stages, progression.initialStageId), `${id} needs a valid progression track`);
  for (const [stageId, stage] of Object.entries(progression.stages)) {
    assert(stage.id === stageId && typeof stage.name === "string" && stage.name, `${id}:${stageId} has invalid stage identity`);
    assert(stage.previousStageId === null || has(progression.stages, stage.previousStageId), `${id}:${stageId} has an invalid previous stage`);
    assert(Array.isArray(stage.addSkillIds) && stage.addSkillIds.every(skillId => has(data.skills, skillId)), `${id}:${stageId} has invalid added skills`);
    assert(Object.entries(stage.replacements || {}).every(([fromId, toId]) => has(data.skills, fromId) && has(data.skills, toId)), `${id}:${stageId} has invalid skill replacements`);
  }
}
assert.strictEqual(data.masterMeta.schemaVersion, 50, "The master schema version is explicit");
assert(data.storyCharacters.road_warden_karl && !data.companionProfiles.road_warden_karl, "A named story character may exist before receiving a recruitable combat profile");
assert.strictEqual(game.Companions.definition("mina").name, data.storyCharacters.mina.name, "Recruitable definitions merge identity and combat profile through one stable character ID");
assert.strictEqual(data.config.guildServices.pages.blacksmith.unlock.sceneId, "meadow_clear", "Facility availability is driven by story readership");
assert(game.GuildServices.unlocked("home") && !game.GuildServices.unlocked("shop"), "Only core navigation is available before the story introduces staff");
game.GameState.data.story.readSceneIds.push("prologue_opening", "meadow_clear", "whispering_brook_clear", "roadside_clear");
assert.deepStrictEqual(Array.from(game.GuildServices.unlockedIds()).filter(id => ["shop", "blacksmith", "archives", "guild"].includes(id)), ["shop", "blacksmith", "archives", "guild"], "Reading staff introductions unlocks each matching facility");
assert.strictEqual(Object.keys(data.equipmentSets).length, 17, "Crafted equipment families through the postgame publish data-driven set bonuses");
for (const definition of Object.values(data.equipmentSets)) {
  assert(definition.itemIds.length === 3 && definition.itemIds.every(id => has(data.items, id)), `${definition.id} references three equipment templates`);
  assert.deepStrictEqual(Array.from(definition.bonuses, bonus => bonus.count), [2, 3], `${definition.id} has two-piece and complete-set thresholds`);
  assert(definition.bonuses.every(bonus => has(data.equipmentSkills, bonus.skillId)), `${definition.id} references valid set skills`);
}
for (const addition of data.relations.chapterUnlockAdditions) {
  assert(addition.id && has(Object.fromEntries(data.storyChapters.map(chapter => [chapter.id, chapter])), addition.chapterId));
  assert(typeof addition.text === "string" && addition.text.trim());
}
assert.strictEqual(data.config.companions.rosterLimit, 8, "The current story companion roster limit is explicit");
assert(Object.keys(data.companionProfiles).length <= data.config.companions.rosterLimit, "Story companion definitions fit the current roster limit");
assert.strictEqual(data.config.explorationEvents.companionBondReward.itemId, "guild_seal", "Completed travel bonds grant the shared guild currency");
assert(Number.isInteger(data.config.explorationEvents.companionBondReward.quantity) && data.config.explorationEvents.companionBondReward.quantity > 0, "Travel bond rewards use a positive quantity");
assert.strictEqual(data.config.explorationEvents.routeMastery.successes, 3, "Three successful observations establish reusable route knowledge");
assert(data.config.explorationEvents.routeMastery.successChanceBonus > 0 && data.config.explorationEvents.routeMastery.successChanceBonus <= .25, "Route mastery grants a bounded future success bonus");
const routeFamiliarityTiers = data.config.explorationEvents.routeFamiliarity.tiers;
assert(routeFamiliarityTiers.length === 3 && new Set(routeFamiliarityTiers.map(tier => tier.id)).size === 3 && routeFamiliarityTiers.every((tier, index) => tier.minimumClears > (routeFamiliarityTiers[index - 1]?.minimumClears || 0) && tier.successChanceBonus > (routeFamiliarityTiers[index - 1]?.successChanceBonus || 0) && tier.successChanceBonus <= .05 && tier.label && tier.growthText), "Repeated destination clears advance through ordered narrative familiarity tiers");
assert(data.config.explorationEvents.routeFamiliarity.maximumBonus >= routeFamiliarityTiers[0].successChanceBonus && data.config.explorationEvents.routeFamiliarity.maximumBonus <= .15, "Destination familiarity grants a small party-wide bounded bonus");
assert.strictEqual(data.config.explorationEvents.routeMentorship.guideTierId, routeFamiliarityTiers.at(-1).id, "The highest route-familiarity rank can teach newcomers the road");
assert(data.config.explorationEvents.routeMentorship.successChanceBonus > 0 && data.config.explorationEvents.routeMentorship.successChanceBonus <= .05, "Route mentorship grants a small bounded field bonus");
assert(data.config.explorationEvents.routeMentorship.lineageSuccessChanceBonus > 0 && data.config.explorationEvents.routeMentorship.successChanceBonus + data.config.explorationEvents.routeMentorship.inheritedSuccessChanceBonus + data.config.explorationEvents.routeMentorship.lineageSuccessChanceBonus <= .05, "Three-generation route guidance remains a small bounded field bonus");
const routeTraditionTiers = data.config.explorationEvents.routeTradition.tiers;
assert(routeTraditionTiers.length === 3 && routeTraditionTiers[0].minimumAssists === 0 && new Set(routeTraditionTiers.map(tier => tier.id)).size === routeTraditionTiers.length && routeTraditionTiers.every((tier, index) => tier.minimumAssists >= 0 && (!index || tier.minimumAssists > routeTraditionTiers[index - 1].minimumAssists) && tier.successChanceBonus > (routeTraditionTiers[index - 1]?.successChanceBonus || 0) && tier.successChanceBonus <= .03 && tier.label && tier.description), "Guild route markers mature through ordered bounded tiers as later expeditions use them");
assert.strictEqual(data.config.explorationEvents.personalPractice.successes, 5, "Five personal successes establish route-event expertise");
assert(data.config.explorationEvents.personalPractice.successChanceBonus > 0 && data.config.explorationEvents.personalPractice.successChanceBonus <= .15, "Personal route expertise grants a smaller bounded bonus than shared field knowledge");
const bondRouteSupport = data.config.explorationEvents.adventurerBondRouteSupport;
assert(Array.isArray(bondRouteSupport) && bondRouteSupport.length >= 2, "Repeated travel defines multiple data-driven relationship support tiers");
assert(bondRouteSupport.every((tier, index) => Number.isInteger(tier.minimumSharedSorties) && tier.minimumSharedSorties > (bondRouteSupport[index - 1]?.minimumSharedSorties || 0) && tier.successChanceBonus > 0 && tier.successChanceBonus <= .1 && typeof tier.label === "string" && tier.label), "Relationship support tiers use ordered thresholds, bounded bonuses and narrative labels");
const bondBattleSupport = data.config.explorationEvents.adventurerBondBattleSupport;
assert(Array.isArray(bondBattleSupport) && bondBattleSupport.length >= 2, "Repeated travel defines multiple formation-support tiers");
assert(bondBattleSupport.every((tier, index) => Number.isInteger(tier.minimumSharedSorties) && tier.minimumSharedSorties > (bondBattleSupport[index - 1]?.minimumSharedSorties || 0) && tier.statMultiplier > 1 && tier.statMultiplier <= 1.1 && typeof tier.label === "string" && tier.label), "Formation support remains ordered, small and narratively named");
assert(data.config.explorationEvents.rumorWeightMultiplier > 1 && data.config.explorationEvents.rumorWeightMultiplier <= 5, "Field rumors favor a matching route event without making it certain");
assert.strictEqual(data.config.explorationEvents.rumorConfirmationReward.itemId, "guild_seal", "First rumor confirmations reward the shared guild currency");
assert(Number.isInteger(data.config.explorationEvents.rumorConfirmationReward.quantity) && data.config.explorationEvents.rumorConfirmationReward.quantity > 0, "Rumor confirmation rewards use a positive quantity");
assert.deepStrictEqual([...new Set(Array.from(data.config.explorationEvents.routeEvents, event => event.kind))].sort(), ["camp", "gather", "hazard", "lore", "secret"], "Exploration keeps five readable non-combat route-event families while allowing multiple scenes per family");
assert(data.config.explorationEvents.routeEvents.length >= 6, "Exploration includes more scenes than its five broad event families");
assert(data.config.explorationEvents.attributeAptitude.maximumBonus > 0 && data.config.explorationEvents.attributeAptitude.maximumBonus <= .25, "Primary attributes give exploration a small bounded contribution");
for (const event of data.config.explorationEvents.routeEvents) {
  assert(typeof event.recordLabel === "string" && event.recordLabel.length > 0, `${event.id} needs a personal-record label`);
  const aptitude = data.config.explorationEvents.aptitudes[event.aptitudeId];
  assert(event.name && typeof event.name === "string", `${event.id} has a player-facing name`);
  assert(event.maximumChance > event.baseChance && aptitude, `${event.id} references a valid aptitude and bounded success range`);
  assert(aptitude.jobIds.every(id => has(data.jobs, id)) && aptitude.raceIds.every(id => has(data.races, id)) && aptitude.birthIds.every(id => has(data.births, id)), `${event.id} aptitude only references known character traits`);
  assert(Math.abs(Object.values(aptitude.attributeWeights).reduce((sum, weight) => sum + weight, 0) - 1) < .000001 && Object.keys(aptitude.attributeWeights).every(id => data.config.characterGrowth.attributes.order.includes(id)), `${event.id} aptitude has normalized primary-attribute weights`);
}
const routeEventIds = new Set(data.config.explorationEvents.routeEvents.map(event => event.id));
const teamSurvey = data.config.explorationEvents.teamSurvey;
assert(Number.isInteger(teamSurvey.specialtyCount) && teamSurvey.specialtyCount >= 2 && teamSurvey.specialtyCount <= routeEventIds.size && Number.isInteger(teamSurvey.memberCount) && teamSurvey.memberCount >= 2 && Number.isInteger(teamSurvey.extraEvents) && teamSurvey.extraEvents > 0, "Specialist team surveys use bounded data-driven coverage requirements");
const routeSpecialistMilestones = data.adventurerMilestones.filter(milestone => milestone.condition.type === "routeEventRecord");
assert.deepStrictEqual(new Set(routeSpecialistMilestones.map(milestone => milestone.condition.routeEventId)), routeEventIds, "Every route event has one matching adventurer specialist medal");
assert(routeSpecialistMilestones.every(milestone => milestone.condition.minimum === 5), "Route-event specialist medals share a clear five-success target");
const fieldSpecialtyMilestones = data.adventurerMilestones.filter(milestone => milestone.condition.type === "specialtyCount");
assert.deepStrictEqual(Array.from(fieldSpecialtyMilestones, milestone => milestone.condition.minimum), [3, routeEventIds.size + 1], "Composite explorer medals derive their targets from the available field specialties");
for (const [environmentId, environment] of Object.entries(data.config.explorationEvents.environments)) {
  assert.deepStrictEqual(new Set(Object.keys(environment.eventWeights)), routeEventIds, `${environmentId} weights every route event exactly once`);
  assert(Object.values(environment.eventWeights).every(weight => Number.isFinite(weight) && weight > 0), `${environmentId} uses positive route-event weights`);
  assert(environment.rumors.every(rumor => routeEventIds.has(rumor.eventId) && rumor.text && !rumor.text.includes("%")), `${environmentId} links each narrative rumor to a valid event without exposing exact odds`);
}
const routeObservationNotes = data.observationNotes.filter(note => note.unlock?.type === "routeEventEncountered");
assert.deepStrictEqual(Array.from(routeObservationNotes, note => note.unlock.routeEventId).sort(), Array.from(data.config.explorationEvents.routeEvents, event => event.id).sort(), "Every route event has one observation-journal entry");
const practicedRouteObservationNotes = data.observationNotes.filter(note => note.unlock?.type === "routeEventMastered");
assert.deepStrictEqual(Array.from(practicedRouteObservationNotes, note => note.unlock.routeEventId).sort(), Array.from(data.config.explorationEvents.routeEvents, event => event.id).sort(), "Every route event has one deeper field-practice entry");
assert(practicedRouteObservationNotes.every(note => Number.isInteger(note.unlock.successes) && note.unlock.successes >= 2), "Field-practice entries require repeated successful observations");
assert(Array.isArray(data.config.explorationEvents.companionMoments) && data.config.explorationEvents.companionMoments.length >= Object.keys(data.companionProfiles).length, "Every companion can have a travel moment");
for (const moment of data.config.explorationEvents.companionMoments) {
  assert(typeof moment.id === "string" && moment.id && typeof moment.title === "string" && moment.title, "Companion moments have stable IDs and readable titles");
  assert(moment.companionIds.length >= 1 && moment.companionIds.length <= 2 && new Set(moment.companionIds).size === moment.companionIds.length, "Companion moment casts are compact and unique");
  assert(moment.companionIds.every(id => has(data.companionProfiles, id)), "Companion moments only reference known companions");
  assert(Object.entries(moment.requiredStages || {}).every(([companionId, stageId]) => moment.companionIds.includes(companionId) && has(data.relations.companionProgressions[companionId].stages, stageId)), "Companion moment growth requirements reference its cast and known stages");
  assert(moment.lines.length && moment.lines.every(line => typeof line === "string" && line.trim()), "Companion moments contain readable lines");
}
for (const [id, arc] of Object.entries(data.relations.companionStoryArcs)) {
  assert.strictEqual(id, arc.id);
  assert(has(data.companionProfiles, arc.companionId), `${id} references a known companion`);
  const joinChapter = data.storyChapters.find(chapter => chapter.id === arc.joinChapterId);
  assert(joinChapter && data.relations.storyTriggers.some(trigger => trigger.when.type === "chapterActive" && trigger.when.chapterId === joinChapter.id && trigger.effects.some(effect => effect.type === "joinCompanion" && effect.companionId === arc.companionId)), `${id} has a valid chapter-active join trigger`);
  arc.featuredChapterIds.forEach(chapterId => assert(data.storyChapters.some(chapter => chapter.id === chapterId), `${id} references a known featured chapter`));
}
for (const [sceneId, overlay] of Object.entries(data.relations.storySceneOverlays)) {
  assert(has(data.storyScenes, sceneId), `${sceneId} overlay references a known story scene`);
  const scene = Object.assign({}, data.storyScenes[sceneId], overlay);
  if (scene.protagonistId) assert(has(data.storyCharacters, scene.protagonistId), `${scene.id} has a known named protagonist`);
  if (scene.castIds) assert(Array.isArray(scene.castIds) && new Set(scene.castIds).size === scene.castIds.length && scene.castIds.every(id => has(data.storyCharacters, id)), `${scene.id} has a valid named cast`);
}
for (const [sceneId, script] of Object.entries(data.relations.storySceneScripts)) {
  assert(has(data.storyScenes, sceneId) && script.sceneId === sceneId, `${sceneId} script references its story scene`);
  assert(Array.isArray(script.blocks) && script.blocks.length >= 3, `${sceneId} has a substantial story script`);
  assert(script.blocks.every(block => ["setting", "narration", "dialogue"].includes(block.kind) && typeof block.text === "string" && block.text.trim()), `${sceneId} has valid story blocks`);
  assert(script.blocks.filter(block => block.kind === "dialogue").every(block => block.speakerId && block.speakerName && block.speakerRole), `${sceneId} dialogue identifies its speaker`);
  const dialogue = script.blocks.filter(block => block.kind === "dialogue");
  assert.strictEqual(script.blocks[0].kind, "setting", `${sceneId} opens by placing the reader in a scene`);
  assert.strictEqual(script.blocks.at(-1).kind, "narration", `${sceneId} closes with narrative consequence rather than a disconnected remark`);
  assert(script.blocks.some(block => block.kind === "narration") && dialogue.length >= 3 && new Set(dialogue.map(block => block.speakerId)).size >= 2, `${sceneId} balances scenery, narration and an actual exchange`);
}
const allStoryDialogue = Object.values(data.relations.storySceneScripts).flatMap(script => script.blocks.filter(block => block.kind === "dialogue"));
assert(!allStoryDialogue.some(block => block.speakerId === "expedition_leader"), "Story dialogue never substitutes an unnamed expedition leader for player adventurers");
assert(allStoryDialogue.every(block => block.speakerId === "guild_leader" || has(data.storyCharacters, block.speakerId)), "Every speaking character has one shared story-character identity record");
for (const repeatedTemplate of ["では道標を最初の確認地点にします", "通信紙にも同じ印を書きました", "では『成功』の一行だけで閉じません"]) {
  assert(!allStoryDialogue.some(block => block.text.includes(repeatedTemplate)), `Route stories replace repeated stock dialogue: ${repeatedTemplate}`);
}
for (const sceneId of ["meadow_opening", "meadow_discovery", "meadow_clear", "whispering_brook_opening", "whispering_brook_discovery", "whispering_brook_clear", "brigand_pass_opening", "brigand_pass_discovery", "brigand_pass_clear", "abandoned_station_opening", "abandoned_station_discovery", "abandoned_station_clear", "moonfang_den_opening", "moonfang_den_discovery", "roadside_clear"]) {
  assert(data.relations.storySceneScripts[sceneId].blocks.filter(block => block.kind === "dialogue").length >= 2, `${sceneId} advances through an actual named-character exchange`);
}
const prologueOpening = data.relations.storySceneScripts.prologue_opening.blocks;
const prologueEnding = data.relations.storySceneScripts.prologue_clear.blocks;
const roadsideOpening = data.relations.storySceneScripts.roadside_opening.blocks;
const roadsideEnding = data.relations.storySceneScripts.roadside_clear.blocks;
assert(prologueOpening.some(block => block.speakerId === "receptionist_rina" && block.text.includes("町役場では三か月もたない")), "Rina explains why she chose the uncertain new guild");
assert(prologueOpening.some(block => block.speakerId === "guild_leader" && block.text.includes("帰ってきた者の名")), "The player establishes return records as the guild's first principle");
assert(prologueEnding.some(block => block.speakerId === "guild_leader" && block.text.includes("勝つことではなく帰ること")), "The first departure states the guild's promise without inventing an expedition captain");
assert(roadsideOpening.some(block => block.kind === "narration" && block.text === data.storyScenes.roadside_opening.text), "Chapter one opens with the same readable synopsis used by the archive");
assert(roadsideOpening.some(block => block.speakerId === "road_warden_karl" && block.text.includes("商隊が戻らなければ")), "Karl defines success by the missing people's return rather than kill count");
assert(roadsideEnding.some(block => block.speakerId === "miller_judit" && block.text.includes("パンを焼けました")), "Chapter one closes the baker's everyday stake introduced in the prologue");
assert.deepStrictEqual(new Set(Object.keys(data.relations.storySceneScripts)), new Set(Object.keys(data.storyScenes)), "Every story scene has a reader script");
const sealRouteScenes = ["cave", "fungal_depths", "crystal_vein", "sealed_workshop", "earthpulse_altar"];
for (const dungeonId of sealRouteScenes) {
  const links = data.relations.dungeonStoryLinks[dungeonId];
  for (const sceneId of [links.openingStoryId, links.discoveryStoryId].filter(Boolean)) {
    const speakers = data.relations.storySceneScripts[sceneId].blocks
      .filter(block => block.kind === "dialogue")
      .map(block => block.speakerId);
    assert(speakers.includes("foreman_oskar") && speakers.includes("mina"), `${sceneId} develops the chapter through Oskar and Mina's exchange`);
  }
}
for (const phrase of ["退避命令と封鎖命令", "深層班長の目印", "封印へ送る力の目盛り", "交代が来ない作業員", "星路が閉じるまで地脈を保て"]) {
  assert(
    Object.values(data.relations.storySceneScripts).some(script => script.blocks.some(block => block.text.includes(phrase))),
    `Chapter two keeps its route-specific story beat: ${phrase}`
  );
}
const sealOpening = data.relations.storySceneScripts.seal_opening.blocks;
const sealEnding = data.relations.storySceneScripts.seal_clear.blocks;
assert(sealOpening.some(block => block.speakerId === "foreman_oskar" && block.text.includes("下にいる者の空気")), "Oskar directly challenges the cost of delaying rescue");
assert(sealOpening.some(block => block.speakerId === "mina" && block.text.includes("両方とも迎えに")), "Mina commits to rescuing miners and machines without equating their urgency");
assert(sealEnding.some(block => block.speakerId === "blacksmith_gregor" && block.text.includes("修理の終わり")), "Gregor distinguishes stopping a machine from restoring its agency");
assert(sealEnding.some(block => block.speakerId === "mina" && block.text.includes("直される側が何になりたいか")), "Mina defines a workshop built around mutual choice");
const starfallRouteScenes = ["ruins", "lunar_archive", "inverted_cloister", "stargrave_corridor", "astral_core"];
for (const dungeonId of starfallRouteScenes) {
  const links = data.relations.dungeonStoryLinks[dungeonId];
  for (const sceneId of [links.openingStoryId, links.discoveryStoryId].filter(Boolean)) {
    const speakers = data.relations.storySceneScripts[sceneId].blocks
      .filter(block => block.kind === "dialogue")
      .map(block => block.speakerId);
    assert(speakers.includes("copyist_cecil") && speakers.includes("elena"), `${sceneId} develops the chapter through Cecil and Elena's exchange`);
  }
}
for (const phrase of ["削られた幅と道具の跡", "読む者が変わるたび", "天井は王朝の空、床は今夜の空", "誰が代価を払ったか", "名なき者の記録を示せ"]) {
  assert(
    Object.values(data.relations.storySceneScripts).some(script => script.blocks.some(block => block.text.includes(phrase))),
    `Chapter three keeps its route-specific story beat: ${phrase}`
  );
}
const starfallOpening = data.relations.storySceneScripts.starfall_opening.blocks;
const starfallEnding = data.relations.storySceneScripts.starfall_clear.blocks;
const observatoryEnding = data.relations.storySceneScripts.observatory_clear.blocks;
assert(starfallOpening.some(block => block.speakerId === "copyist_cecil" && block.text.includes("同じ行数だけ欠けている")), "Cecil identifies deliberate censorship through copied records");
assert(starfallOpening.some(block => block.speakerId === "elena" && block.text.includes("知らなかったか")), "Elena records the limits of her own knowledge");
assert(starfallEnding.some(block => block.speakerId === "mina" && block.text.includes("誰が代価を払ったか")), "Mina questions the cost of the newly activated bridge");
assert(observatoryEnding.some(block => block.speakerId === "elena" && block.text.includes("止めていたものまで動かしました")), "The observatory ending preserves responsibility for activating the star road");
const emberRouteScenes = ["skyfall_road", "glasswood", "ember_mine", "ash_fortress", "cinder_throne", "elder_dragon_crater"];
for (const dungeonId of emberRouteScenes) {
  const links = data.relations.dungeonStoryLinks[dungeonId];
  for (const sceneId of [links.openingStoryId, links.discoveryStoryId].filter(Boolean)) {
    const speakers = data.relations.storySceneScripts[sceneId].blocks
      .filter(block => block.kind === "dialogue")
      .map(block => block.speakerId);
    assert(speakers.includes("refugee_frieda") && speakers.includes("garm"), `${sceneId} develops the chapter through Frieda and Garm's exchange`);
  }
}
for (const phrase of ["峠を守った騎士", "二本の道が町を救った", "火を返せ", "王を城外へ出すな", "終わった後にも生きた証", "返すまでに百年かかった火"]) {
  assert(
    Object.values(data.relations.storySceneScripts).some(script => script.blocks.some(block => block.text.includes(phrase))),
    `Chapter four keeps its route-specific story beat: ${phrase}`
  );
}
const tideRouteScenes = ["frost_coast", "drowned_archive", "blue_reef", "silent_fleet", "mirror_palace", "abyssal_trench"];
for (const dungeonId of tideRouteScenes) {
  assert(data.relations.storyRouteConversations[dungeonId], `${dungeonId} keeps route dialogue in the dedicated story relation`);
  const links = data.relations.dungeonStoryLinks[dungeonId];
  for (const sceneId of [links.openingStoryId, links.discoveryStoryId].filter(Boolean)) {
    const speakers = data.relations.storySceneScripts[sceneId].blocks
      .filter(block => block.kind === "dialogue")
      .map(block => block.speakerId);
    assert(speakers.includes("fisher_nils") && speakers.includes("shia"), `${sceneId} develops the chapter through Nils and Shia's exchange`);
  }
}
for (const phrase of ["名前がなくても", "最後の書庫", "懐かしさは証拠ではない", "百年ずっと", "呼ぶ人の声", "何千人分もの帰りたい声"]) {
  assert(
    Object.values(data.relations.storySceneScripts).some(script => script.blocks.some(block => block.text.includes(phrase))),
    `Chapter five keeps its route-specific story beat: ${phrase}`
  );
}
const clockworkRouteScenes = ["tidal_gate", "white_sand_road", "stopped_clocktower", "royal_workshop", "hourglass_palace", "forgotten_titan_tomb"];
for (const dungeonId of clockworkRouteScenes) {
  assert(data.relations.storyRouteConversations[dungeonId], `${dungeonId} keeps route dialogue in the dedicated story relation`);
  const links = data.relations.dungeonStoryLinks[dungeonId];
  for (const sceneId of [links.openingStoryId, links.discoveryStoryId].filter(Boolean)) {
    const speakers = data.relations.storySceneScripts[sceneId].blocks
      .filter(block => block.kind === "dialogue")
      .map(block => block.speakerId);
    assert(speakers.includes("caravan_zara") && speakers.includes("tio"), `${sceneId} develops the chapter through Zara and Tio's exchange`);
  }
}
for (const phrase of ["記憶の流出を止める堤", "繰り返しは完全ではありません", "終わらせ方を選ぶ権利", "一歯ずつ形が違います", "覚えたまま次の一秒", "避難都市の設計"]) {
  assert(
    Object.values(data.relations.storySceneScripts).some(script => script.blocks.some(block => block.text.includes(phrase))),
    `Chapter six keeps its route-specific story beat: ${phrase}`
  );
}
const blackwoodRouteScenes = ["blackwood_border", "whispering_roots", "witch_lantern_marsh", "thorn_cathedral", "night_bloom_sanctuary", "devouring_tree_pit"];
for (const dungeonId of blackwoodRouteScenes) {
  assert(data.relations.storyRouteConversations[dungeonId], `${dungeonId} keeps route dialogue in the dedicated story relation`);
  const links = data.relations.dungeonStoryLinks[dungeonId];
  for (const sceneId of [links.openingStoryId, links.discoveryStoryId].filter(Boolean)) {
    const speakers = data.relations.storySceneScripts[sceneId].blocks
      .filter(block => block.kind === "dialogue")
      .map(block => block.speakerId);
    assert(speakers.includes("herbalist_olga") && speakers.includes("rize"), `${sceneId} develops the chapter through Olga and Rize's exchange`);
  }
}
for (const phrase of ["花粉を町へ向かわせない", "持ち主へ尋ねず永遠に閉じれば", "話せない間も本人のもの", "次の朝まで", "出口のない檻", "人が飢えを与えた道具"]) {
  assert(
    Object.values(data.relations.storySceneScripts).some(script => script.blocks.some(block => block.text.includes(phrase))),
    `Chapter seven keeps its route-specific story beat: ${phrase}`
  );
}
const thunderSnowRouteScenes = ["snowbound_foothill", "frozen_sky_bridge", "thunder_nest", "cloud_monastery", "aurora_summit", "white_dragon_roost"];
for (const dungeonId of thunderSnowRouteScenes) {
  assert(data.relations.storyRouteConversations[dungeonId], `${dungeonId} keeps route dialogue in the dedicated story relation`);
  const links = data.relations.dungeonStoryLinks[dungeonId];
  for (const sceneId of [links.openingStoryId, links.discoveryStoryId].filter(Boolean)) {
    const speakers = data.relations.storySceneScripts[sceneId].blocks
      .filter(block => block.kind === "dialogue")
      .map(block => block.speakerId);
    assert(speakers.includes("pilgrim_hein") && speakers.includes("kai"), `${sceneId} develops the chapter through Hein and Kai's exchange`);
  }
}
for (const phrase of ["黒い羽が落ちた斜面", "持ち続ける理由", "噂どおりの敵", "足元の声", "進路を曲げる網", "七つの集落"]) {
  assert(
    Object.values(data.relations.storySceneScripts).some(script => script.blocks.some(block => block.text.includes(phrase))),
    `Chapter eight keeps its route-specific story beat: ${phrase}`
  );
}
const skyCastleRouteScenes = ["starroad_gate", "broken_sky_garden", "blackwing_cloister", "fallen_star_foundry", "eclipsed_throne", "void_star_prison"];
for (const dungeonId of skyCastleRouteScenes) {
  assert(data.relations.storyRouteConversations[dungeonId], `${dungeonId} keeps route dialogue in the dedicated story relation`);
  const links = data.relations.dungeonStoryLinks[dungeonId];
  for (const sceneId of [links.openingStoryId, links.discoveryStoryId].filter(Boolean)) {
    const speakers = data.relations.storySceneScripts[sceneId].blocks
      .filter(block => block.kind === "dialogue")
      .map(block => block.speakerId);
    assert(speakers.includes("watcher_lutz") && speakers.includes("elena"), `${sceneId} develops the chapter through Lutz and Elena's exchange`);
  }
}
for (const phrase of ["井戸の数と人口", "空城の食料と空気", "確かめる手段", "城が飢えます", "二つの故郷", "空白を空白のまま"]) {
  assert(
    Object.values(data.relations.storySceneScripts).some(script => script.blocks.some(block => block.text.includes(phrase))),
    `Chapter nine keeps its route-specific story beat: ${phrase}`
  );
}
const blackMoonRouteScenes = ["moonshadow_dock", "sealed_memory_ward", "silver_chain_gallery", "dream_eater_spire", "blackmoon_core", "exiled_king_crypt"];
for (const dungeonId of blackMoonRouteScenes) {
  assert(data.relations.storyRouteConversations[dungeonId], `${dungeonId} keeps route dialogue in the dedicated story relation`);
  const links = data.relations.dungeonStoryLinks[dungeonId];
  for (const sceneId of [links.openingStoryId, links.discoveryStoryId].filter(Boolean)) {
    const speakers = data.relations.storySceneScripts[sceneId].blocks
      .filter(block => block.kind === "dialogue")
      .map(block => block.speakerId);
    assert(speakers.includes("dreamer_irma") && speakers.includes("tio"), `${sceneId} develops the chapter through Irma and Tio's exchange`);
  }
}
for (const phrase of ["罪がないと読める部分", "現在のイルマ", "本人が外せる留め具", "夢の向き", "使者の犠牲を完成させません", "未来へ残すもの"]) {
  assert(
    Object.values(data.relations.storySceneScripts).some(script => script.blocks.some(block => block.text.includes(phrase))),
    `Chapter ten keeps its route-specific story beat: ${phrase}`
  );
}
const primordialRouteScenes = ["primal_root_gate", "starseed_nursery", "memory_moss_woods", "ancestor_altar", "origin_tree_heart", "star_eater_rootpit"];
for (const dungeonId of primordialRouteScenes) {
  assert(data.relations.storyRouteConversations[dungeonId], `${dungeonId} keeps route dialogue in the dedicated story relation`);
  const links = data.relations.dungeonStoryLinks[dungeonId];
  for (const sceneId of [links.openingStoryId, links.discoveryStoryId].filter(Boolean)) {
    const speakers = data.relations.storySceneScripts[sceneId].blocks
      .filter(block => block.kind === "dialogue")
      .map(block => block.speakerId);
    assert(speakers.includes("woodcutter_bram") && speakers.includes("rize"), `${sceneId} develops the chapter through Bram and Rize's exchange`);
  }
}
for (const phrase of ["利益を受け継いだ者", "結果ではなく過程", "書かない選択", "次代へ代価", "記憶を鍵として消費しません", "これは私の頁"]) {
  assert(
    Object.values(data.relations.storySceneScripts).some(script => script.blocks.some(block => block.text.includes(phrase))),
    `Chapter eleven keeps its route-specific story beat: ${phrase}`
  );
}
const starseaRouteScenes = ["rootsea_descent", "drowned_chartroom", "stellar_reef", "submerged_temple", "starsea_nucleus", "leviathan_trench"];
for (const dungeonId of starseaRouteScenes) {
  assert(data.relations.storyRouteConversations[dungeonId], `${dungeonId} keeps route dialogue in the dedicated story relation`);
  const links = data.relations.dungeonStoryLinks[dungeonId];
  for (const sceneId of [links.openingStoryId, links.discoveryStoryId].filter(Boolean)) {
    const speakers = data.relations.storySceneScripts[sceneId].blocks
      .filter(block => block.kind === "dialogue")
      .map(block => block.speakerId);
    assert(speakers.includes("boatman_ren") && speakers.includes("shia"), `${sceneId} develops the chapter through Ren and Shia's exchange`);
  }
}
for (const phrase of ["往路と帰路を同じ歌", "歌える者だけの道", "死んだ王都への配分", "一人の正しい声", "心珠は海を命令する", "帰る港がなくても"]) {
  assert(
    Object.values(data.relations.storySceneScripts).some(script => script.blocks.some(block => block.text.includes(phrase))),
    `Chapter twelve keeps its route-specific story beat: ${phrase}`
  );
}
const northernStarRouteScenes = ["frozen_starsea_shore", "black_aurora_field", "fallen_star_grave", "vessel_fortress", "northstar_cradle", "worldscar_glacier"];
for (const dungeonId of northernStarRouteScenes) {
  assert(data.relations.storyRouteConversations[dungeonId], `${dungeonId} keeps route dialogue in the dedicated story relation`);
  const links = data.relations.dungeonStoryLinks[dungeonId];
  for (const sceneId of [links.openingStoryId, links.discoveryStoryId].filter(Boolean)) {
    const speakers = data.relations.storySceneScripts[sceneId].blocks
      .filter(block => block.kind === "dialogue")
      .map(block => block.speakerId);
    assert(speakers.includes("astronomer_adel") && speakers.includes("noah"), `${sceneId} develops the chapter through Adel and Noah's exchange`);
  }
}
for (const phrase of ["番号だけだったことには", "同じ部屋で眠った人", "空から来なかった偽物", "本人が開門を選んだ", "番号しかなかった時の自分", "拒めた"] ) {
  assert(
    Object.values(data.relations.storySceneScripts).some(script => script.blocks.some(block => block.text.includes(phrase))),
    `Chapter thirteen keeps its route-specific story beat: ${phrase}`
  );
}
const returnlessRouteScenes = ["north_return_road", "silent_outer_city", "royal_memory_vault", "skykey_spire", "usurper_throne", "hollow_coronation"];
for (const dungeonId of returnlessRouteScenes) {
  assert(data.relations.storyRouteConversations[dungeonId], `${dungeonId} keeps route dialogue in the dedicated story relation`);
  const links = data.relations.dungeonStoryLinks[dungeonId];
  for (const sceneId of [links.openingStoryId, links.discoveryStoryId].filter(Boolean)) {
    const speakers = data.relations.storySceneScripts[sceneId].blocks
      .filter(block => block.kind === "dialogue")
      .map(block => block.speakerId);
    assert(speakers.includes("refugee_marek") && speakers.includes("garm"), `${sceneId} develops the chapter through Marek and Garm's exchange`);
  }
}
for (const phrase of ["今ここで生きる人", "暮らしは合図", "一人ずつ別の人生", "一つの声で開けない門", "一人が悪名", "冠より先に守るもの"]) {
  assert(
    Object.values(data.relations.storySceneScripts).some(script => script.blocks.some(block => block.text.includes(phrase))),
    `Chapter fourteen keeps its route-specific story beat: ${phrase}`
  );
}
const starlessRouteScenes = ["sky_gate_ascent", "broken_constellation", "first_light_archive", "throne_beyond_sky", "nameless_star_end", "afterstar_sanctum"];
for (const dungeonId of starlessRouteScenes) {
  assert(data.relations.storyRouteConversations[dungeonId], `${dungeonId} keeps route dialogue in the dedicated story relation`);
  const links = data.relations.dungeonStoryLinks[dungeonId];
  for (const sceneId of [links.openingStoryId, links.discoveryStoryId].filter(Boolean)) {
    const speakers = data.relations.storySceneScripts[sceneId].blocks
      .filter(block => block.kind === "dialogue")
      .map(block => block.speakerId);
    assert(speakers.includes("bell_keeper_anna") && speakers.includes("noah"), `${sceneId} develops the chapter through Anna and Noah's exchange`);
  }
}
for (const phrase of ["いつでも帰れる時刻", "世界の終わりを所有者", "自然な贈与", "一つの収穫へ変換", "各世界へ返します", "征服先ではなく"]) {
  assert(
    Object.values(data.relations.storySceneScripts).some(script => script.blocks.some(block => block.text.includes(phrase))),
    `Chapter fifteen keeps its route-specific story beat: ${phrase}`
  );
}
const afterstarRouteScenes = ["gray_ash_sea", "inverted_glass_canyon", "worldskin_garden", "silent_iron_city", "distant_observatory", "five_reaches_nest"];
for (const dungeonId of afterstarRouteScenes) {
  assert(data.relations.storyRouteConversations[dungeonId], `${dungeonId} keeps route dialogue in the dedicated story relation`);
  const links = data.relations.dungeonStoryLinks[dungeonId];
  for (const sceneId of [links.openingStoryId, links.discoveryStoryId].filter(Boolean)) {
    const speakers = data.relations.storySceneScripts[sceneId].blocks
      .filter(block => block.kind === "dialogue")
      .map(block => block.speakerId);
    assert(speakers.includes("reach_guide_rine") && speakers.includes("elena"), `${sceneId} develops the postgame region through Rine and Elena's exchange`);
  }
}
for (const phrase of ["往路と帰路を同じ太さ", "見られる側へ余白", "今育っている菌糸", "どちらも選んだ時", "記録を閉じる権利", "別々のまま返事"]) {
  assert(
    Object.values(data.relations.storySceneScripts).some(script => script.blocks.some(block => block.text.includes(phrase))),
    `The first afterstar region keeps its route-specific story beat: ${phrase}`
  );
}
assert(data.relations.storyMysteries.length >= 6, "Long-running story mysteries connect distant chapters");
for (const mystery of data.relations.storyMysteries) {
  assert(mystery.id && mystery.title && mystery.clue && mystery.resolution, `${mystery.id} has complete mystery text`);
  assert(has(data.storyScenes, mystery.openedBySceneId) && has(data.storyScenes, mystery.resolvedBySceneId) && mystery.openedBySceneId !== mystery.resolvedBySceneId, `${mystery.id} has valid opening and resolution scenes`);
  assert(mystery.evidence.length >= 2 && mystery.evidence[0].sceneId === mystery.openedBySceneId && mystery.evidence.at(-1).sceneId === mystery.resolvedBySceneId, `${mystery.id} has an ordered evidence trail`);
  assert(mystery.evidence.every(entry => has(data.storyScenes, entry.sceneId) && entry.note), `${mystery.id} evidence references valid scenes and readable notes`);
}
const storyTriggerIds = data.relations.storyTriggers.map(trigger => trigger.id);
assert.strictEqual(new Set(storyTriggerIds).size, storyTriggerIds.length, "Story trigger IDs must be unique");
data.relations.storyTriggers.forEach(trigger => {
  assert(["chapterActive", "chapterCompleted", "dungeonOpened", "dungeonDiscovered", "dungeonCleared"].includes(trigger.when?.type), `${trigger.id} has an invalid trigger condition`);
  if (trigger.when.type.startsWith("chapter")) assert(data.storyChapters.some(chapter => chapter.id === trigger.when.chapterId), `${trigger.id} references an unknown chapter`);
  if (trigger.when.type.startsWith("dungeon")) assert(has(data.dungeons, trigger.when.dungeonId), `${trigger.id} references an unknown dungeon`);
  assert(Array.isArray(trigger.effects) && trigger.effects.length && trigger.effects.every(validStoryEffect), `${trigger.id} has invalid story effects`);
});
Object.keys(data.relations.dungeonPartyRestrictions).forEach(dungeonId => assert(has(data.dungeons, dungeonId), `${dungeonId} restrictions reference an unknown dungeon`));
Object.keys(data.relations.dungeonStoryLinks).forEach(dungeonId => assert(has(data.dungeons, dungeonId), `${dungeonId} story links reference an unknown dungeon`));
for (const monster of Object.values(data.monsters)) {
  const defaults = data.derived.monsterCombatStats[monster.id];
  assert(defaults && ["magicAttack", "magicDefense", "hitRate", "evasionRate"].every(key => Number.isFinite(defaults[key])), `${monster.id} needs complete derived combat defaults`);
  assert(Array.isArray(data.relations.monsterFamilies[monster.id]) && data.relations.monsterFamilies[monster.id].length, `${monster.id} needs creature classification`);
  data.relations.monsterFamilies[monster.id].forEach(id => assert(has(data.creatureFamilies, id), `${monster.id} has an unknown creature family`));
  (data.relations.monsterMaterialDrops[monster.id] || []).forEach(drop => assert(has(data.items, drop.itemId) && data.items[drop.itemId].type === "material"));
  assert(!Object.prototype.hasOwnProperty.call(monster, "materialDrops"), `${monster.id} must not mix material drops into combat data`);
  const signature = data.relations.monsterSignatureDrops[monster.id];
  assert(signature && Array.isArray(signature.materials) && signature.materials.length, `${monster.id} needs fixed material drops`);
  signature.materials.forEach(drop => assert(has(data.items, drop.itemId) && data.items[drop.itemId].type === "material" && drop.chance > 0 && drop.chance < .2, `${monster.id} has invalid fixed material drop`));
  assert(has(data.items, signature.equipment.itemId) && ["weapon", "armor"].includes(data.items[signature.equipment.itemId].type) && !data.items[signature.equipment.itemId].unique && (data.items[signature.equipment.itemId].craftOnly || data.items[signature.equipment.itemId].dropOnly) && signature.equipment.chance > 0 && signature.equipment.chance < .1, `${monster.id} has invalid fixed equipment drop`);
  assert(!Object.prototype.hasOwnProperty.call(monster, "signatureDrops"), `${monster.id} must not mix signature loot into its combat record`);
  if (monster.bossDrop) assert(has(data.items, monster.bossDrop.itemId));
  if (monster.element) assert(has(data.elements, monster.element));
  Object.keys(monster.elementModifiers || {}).forEach(id => assert(has(data.elements, id)));
  Object.keys(monster.statusResistances || {}).forEach(id => assert(has(data.statusEffects, id)));
  if (monster.statusAttack) assert(has(data.statusEffects, monster.statusAttack.statusId));
}
for (const race of Object.values(data.races)) {
  assert(Array.isArray(data.relations.adventurerFamilies[race.id]) && data.relations.adventurerFamilies[race.id].length, `${race.id} needs creature classification`);
  data.relations.adventurerFamilies[race.id].forEach(id => assert(has(data.creatureFamilies, id), `${race.id} has an unknown creature family`));
}
for (const [jobId, rule] of Object.entries(data.config.classChanges)) assert(has(data.jobs, jobId) && has(data.skills, rule.masterSkillId));

assert(Array.isArray(data.config.facilities.order) && new Set(data.config.facilities.order).size === data.config.facilities.order.length, "Facility order must contain unique IDs");
assert.deepStrictEqual(Object.keys(data.config.facilities.upgradeGoldByTargetLevel).map(Number), [2, 3, 4, 5]);
assert(Object.values(data.config.facilities.upgradeGoldByTargetLevel).every((value, index, values) => value > 0 && (!index || value > values[index - 1])), "Facility gold costs must rise with level");
data.config.facilities.order.forEach(id => {
  const facility = data.facilities[id];
  assert(facility?.id === id, `${id} needs matching facility ID and definition`);
  assert(Number.isFinite(facility.goldCostMultiplier) && facility.goldCostMultiplier > 0, `${id} needs a gold-cost multiplier`);
  data.config.facilities.trackOrder.forEach(trackId => {
    const levels = facility.upgrades[trackId];
    assert(Array.isArray(levels) && levels.length >= 1, `${id}.${trackId} needs upgrade levels`);
    levels.forEach((entry, index) => Object.keys(entry.cost || {}).forEach(itemId => assert(has(data.items, itemId) && data.items[itemId].type === "material", `${id}.${trackId} Lv.${index + 1} has invalid cost`)));
  });
  facility.upgrades.production.forEach(entry => {
    Object.keys(entry.rewards?.materials || {}).forEach(itemId => assert(has(data.items, itemId) && data.items[itemId].type === "material", `${id} produces an invalid material`));
    (entry.periodicRewards || []).forEach(periodic => assert(has(data.items, periodic.itemId) && data.items[periodic.itemId].type === "material" && periodic.everyCycles >= 1 && periodic.quantity >= 1, `${id} has invalid periodic production`));
    (entry.chanceRewards || []).forEach(bonus => assert(has(data.items, bonus.itemId) && data.items[bonus.itemId].type === "material" && bonus.chance > 0 && bonus.chance < 1 && bonus.quantity >= 1, `${id} has invalid chance production`));
  });
  facility.upgrades.speed.forEach((entry, index) => assert.strictEqual(entry.interval, Math.floor(60 * 60 * 1000 / (index + 1)), `${id} speed Lv.${index + 1} must be one hour divided by level`));
  facility.upgrades.storage.forEach((entry, index, levels) => assert(index === 0 ? entry.duration === 60 * 60 * 1000 : entry.duration > levels[index - 1].duration, `${id} storage levels must start at one hour and increase`));
});

const state = game.GameState.data;
for (const masterKey of ["items", "skills", "jobs", "races", "births", "recipes", "dungeons", "monsters"]) assert(!(masterKey in state), `save state contains master table ${masterKey}`);
state.inventory.equipment.forEach(instance => ["name", "type", "price", "attack", "defense", "weight", "equipmentSkills"].forEach(key => assert(!(key in instance), `equipment instance duplicates master field ${key}`)));
state.characters.forEach(character => ["job", "race", "birth", "skills"].forEach(key => assert(!(key in character), `character duplicates master field ${key}`)));
assert.strictEqual(state.version, 12);
assert.strictEqual(game.GameData.config.partyProgression.partySlots.maximum, 8);
assert.deepStrictEqual(Array.from(game.GameData.config.partyProgression.partySlots.unlocks.filter(entry => !entry.codeOnly), entry => entry.chapterNumber), [1, 2, 3, 4, 5, 6]);
assert.strictEqual(game.GameData.config.partyProgression.partySlots.unlocks.filter(entry => entry.codeOnly).length, 1);
const partyRules = game.GameData.config.partyProgression.partySlots;
assert.strictEqual(partyRules.unlocks.length, partyRules.maximum - partyRules.initial);
partyRules.unlocks.forEach((entry, index) => {
  assert.strictEqual(entry.slot, partyRules.initial + index + 1);
  assert(entry.gold >= 0 && entry.seals >= 0);
});
assert.deepStrictEqual(Array.from(partyRules.unlocks, entry => entry.gold), [10000, 100000, 500000, 2000000, 8000000, 30000000, 100000000]);
game.GameState.ensurePartyCapacity(state);
assert.strictEqual(game.Party.maximum(), 8);
assert.strictEqual(state.parties.length, 8);
assert.strictEqual(state.expeditions.length, 8);
assert.strictEqual(state.partyResults.length, 8);
assert.strictEqual(state.partyHistory.length, 8);
assert.strictEqual(state.partyPlans.length, 8);
assert.strictEqual(state.partyNames.length, 8);
const codeDefinitions = Object.values(game.GameData.accessCodes);
assert.strictEqual(new Set(codeDefinitions.map(entry => entry.id)).size, codeDefinitions.length);
assert.strictEqual(new Set(codeDefinitions.map(entry => entry.inputArea)).size, codeDefinitions.length);
assert.strictEqual(new Set(codeDefinitions.map(entry => entry.code)).size, codeDefinitions.length);
codeDefinitions.forEach(entry => assert(entry.effects.length > 0 && entry.name && entry.description));
console.log("Master data test passed: stable IDs/display names, normalized skills/grants/affinities, valid references, and master/save separation");
