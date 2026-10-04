const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1]).filter(file => !["js/ui.js", "js/main.js"].includes(file));
scripts.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));
const game = context.window, data = game.GameData;
const has = (table, id) => Object.prototype.hasOwnProperty.call(table || {}, id);
const validStoryEffect = effect => effect?.type === "joinCompanion"
  ? has(data.companions, effect.companionId)
  : effect?.type === "advanceCompanion"
    && has(data.companions, effect.companionId)
    && has(data.relations.companionProgressions?.[effect.companionId]?.stages, effect.stageId);
const growth = data.config.characterGrowth;
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
const namedTables = [data.items, data.skills, data.jobs, data.races, data.births, data.monsters, data.dungeons, data.equipmentTypes, data.elements, data.statusEffects, data.storyScenes, data.companions];

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
    if (["onlyCompanions", "requiredCompanions"].includes(rule.type)) assert(Array.isArray(rule.companionIds) && rule.companionIds.length && rule.companionIds.every(id => has(data.companions, id)), `${dungeon.id} has invalid companion restrictions`);
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
for (const [id, companion] of Object.entries(data.companions)) {
  assert(has(data.jobs, companion.jobId) && has(data.races, companion.raceId) && has(data.births, companion.birthId) && has(data.portraits, companion.portraitId), `${id} has invalid identity references`);
  assert(Number.isInteger(companion.initialLevel) && companion.initialLevel >= 1 && companion.baseStats.hp > 0, `${id} has invalid initial ability data`);
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
assert.strictEqual(data.masterMeta.schemaVersion, 41, "The master schema version is explicit");
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
assert(Object.keys(data.companions).length <= data.config.companions.rosterLimit, "Story companion definitions fit the current roster limit");
assert.strictEqual(data.config.explorationEvents.companionBondReward.itemId, "guild_seal", "Completed travel bonds grant the shared guild currency");
assert(Number.isInteger(data.config.explorationEvents.companionBondReward.quantity) && data.config.explorationEvents.companionBondReward.quantity > 0, "Travel bond rewards use a positive quantity");
assert.strictEqual(data.config.explorationEvents.routeMastery.successes, 3, "Three successful observations establish reusable route knowledge");
assert(data.config.explorationEvents.routeMastery.successChanceBonus > 0 && data.config.explorationEvents.routeMastery.successChanceBonus <= .25, "Route mastery grants a bounded future success bonus");
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
for (const event of data.config.explorationEvents.routeEvents) {
  assert(typeof event.recordLabel === "string" && event.recordLabel.length > 0, `${event.id} needs a personal-record label`);
  const aptitude = data.config.explorationEvents.aptitudes[event.aptitudeId];
  assert(event.name && typeof event.name === "string", `${event.id} has a player-facing name`);
  assert(event.maximumChance > event.baseChance && aptitude, `${event.id} references a valid aptitude and bounded success range`);
  assert(aptitude.jobIds.every(id => has(data.jobs, id)) && aptitude.raceIds.every(id => has(data.races, id)) && aptitude.birthIds.every(id => has(data.births, id)), `${event.id} aptitude only references known character traits`);
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
assert(Array.isArray(data.config.explorationEvents.companionMoments) && data.config.explorationEvents.companionMoments.length >= Object.keys(data.companions).length, "Every companion can have a travel moment");
for (const moment of data.config.explorationEvents.companionMoments) {
  assert(typeof moment.id === "string" && moment.id && typeof moment.title === "string" && moment.title, "Companion moments have stable IDs and readable titles");
  assert(moment.companionIds.length >= 1 && moment.companionIds.length <= 2 && new Set(moment.companionIds).size === moment.companionIds.length, "Companion moment casts are compact and unique");
  assert(moment.companionIds.every(id => has(data.companions, id)), "Companion moments only reference known companions");
  assert(Object.entries(moment.requiredStages || {}).every(([companionId, stageId]) => moment.companionIds.includes(companionId) && has(data.relations.companionProgressions[companionId].stages, stageId)), "Companion moment growth requirements reference its cast and known stages");
  assert(moment.lines.length && moment.lines.every(line => typeof line === "string" && line.trim()), "Companion moments contain readable lines");
}
for (const [id, arc] of Object.entries(data.relations.companionStoryArcs)) {
  assert.strictEqual(id, arc.id);
  assert(has(data.companions, arc.companionId), `${id} references a known companion`);
  const joinChapter = data.storyChapters.find(chapter => chapter.id === arc.joinChapterId);
  assert(joinChapter && data.relations.storyTriggers.some(trigger => trigger.when.type === "chapterActive" && trigger.when.chapterId === joinChapter.id && trigger.effects.some(effect => effect.type === "joinCompanion" && effect.companionId === arc.companionId)), `${id} has a valid chapter-active join trigger`);
  arc.featuredChapterIds.forEach(chapterId => assert(data.storyChapters.some(chapter => chapter.id === chapterId), `${id} references a known featured chapter`));
}
for (const [sceneId, overlay] of Object.entries(data.relations.storySceneOverlays)) {
  assert(has(data.storyScenes, sceneId), `${sceneId} overlay references a known story scene`);
  const scene = Object.assign({}, data.storyScenes[sceneId], overlay);
  if (scene.protagonistId) assert(has(data.companions, scene.protagonistId), `${scene.id} has a known companion protagonist`);
  if (scene.castIds) assert(Array.isArray(scene.castIds) && new Set(scene.castIds).size === scene.castIds.length && scene.castIds.every(id => has(data.companions, id)), `${scene.id} has a valid companion cast`);
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
assert.strictEqual(state.version, 11);
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
