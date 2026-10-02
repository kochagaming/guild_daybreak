const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1]).filter(file => !["js/ui.js", "js/main.js"].includes(file));
scripts.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));
const game = context.window, data = game.GameData;
const has = (table, id) => Object.prototype.hasOwnProperty.call(table || {}, id);
const growth = data.characterGrowth;
const actualAverageWeight = growth.averageEquipmentWeight;
assert(Number.isFinite(actualAverageWeight) && actualAverageWeight > 0, "Reference equipment weight must remain an explicit, stable balance constant");
assert.strictEqual(data.equipmentBalance.efficiencyGrowthPerTier, .04, "Tier equipment efficiency growth must be an explicit balance constant");
for (const [typeId, expected] of Object.entries(data.equipmentBalance.referenceEfficiency)) {
  const tierOneId = data.shop.standardTiers.find(entry => entry.tier === 1).itemIds.find(id => (data.items[id].weaponType || data.items[id].armorType) === typeId);
  assert(tierOneId, `${typeId} needs a Tier 1 standard reference item`);
  const reference = data.items[tierOneId];
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
const namedTables = [data.items, data.skills, data.jobs, data.races, data.births, data.monsters, data.dungeons, data.equipmentTypes, data.elements, data.statusEffects, data.storyScenes];

for (const table of namedTables) for (const [key, entry] of Object.entries(table)) {
  assert.strictEqual(entry.id, key, `object key and id differ: ${key}`);
  assert(typeof entry.name === "string" && entry.name.trim(), `${key} needs a display name`);
}

for (const item of Object.values(data.items).filter(item => item.type === "weapon" || item.type === "armor")) {
  const typeId = item.type === "weapon" ? item.weaponType : item.armorType;
  assert(typeof typeId === "string" && has(data.equipmentTypes, typeId), `${item.id} needs a defined equipment type`);
  assert.strictEqual(data.equipmentTypes[typeId].category, item.type, `${item.id} equipment type category differs`);
  if (item.type === "weapon") assert(["melee", "ranged"].includes(item.range), `${item.id} needs a weapon range`);
  assert(Array.isArray(item.skillIds) && item.skillIds.length > 0 && new Set(item.skillIds).size === item.skillIds.length, `${item.id} needs unique fixed equipment skills`);
  item.skillIds.forEach(id => assert(has(data.equipmentSkills, id), `${item.id} references unknown equipment skill ${id}`));
  const effect = game.Items.standardEffects(item.id);
  const effectiveTemplate = { ...item, ...effect };
  assert(game.Items.performanceScore(effectiveTemplate) / effect.weight + 1e-9 >= game.Items.performanceFloor(item), `${item.id} falls below its Tier ${item.tier} performance-per-weight floor`);
  assert(game.Items.tierEfficiencyMultiplier(item) <= data.equipmentBalance.maximumAutomaticAdjustment, `${item.id} needs an excessive automatic efficiency adjustment`);
}

for (const type of Object.values(data.equipmentTypes)) {
  const standard = data.shop.standardTiers.map(entry => entry.itemIds.find(id => (data.items[id].weaponType || data.items[id].armorType) === type.id));
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
for (const profile of Object.values(data.monsterDifficultyProfiles || {})) for (const tier of ["abyss", "divine"]) {
  (profile[tier]?.skillIds || []).forEach(id => assert(has(data.monsterSkills, id), `Monster difficulty profile references unknown skill ${id}`));
}
for (const difficulty of Object.values(data.dungeonDifficulties || {})) {
  assert(Number.isInteger(difficulty.order) && difficulty.order >= 0 && difficulty.durationMultiplier >= 1 && difficulty.rewardMultiplier >= 1);
  if (difficulty.id === "normal") assert.strictEqual(difficulty.firstClearReward, null);
  else {
    assert(difficulty.firstClearReward && Number.isInteger(difficulty.firstClearReward.gold) && difficulty.firstClearReward.gold >= 0);
    assert(Object.entries(difficulty.firstClearReward.materials).every(([id, quantity]) => has(data.items, id) && Number.isInteger(quantity) && quantity > 0));
  }
}
assert.deepStrictEqual(Object.keys(data.upgradeSkillProgression).sort(), Object.keys(data.equipmentTypes).sort(), "Every equipment type needs upgrade skill progression");
Object.values(data.equipmentTypes).forEach(type => assert(type.basicDamageType == null || ["physical", "magic"].includes(type.basicDamageType), `${type.id} has an invalid basic damage type`));
for (const [typeId, progression] of Object.entries(data.upgradeSkillProgression)) {
  assert(has(data.equipmentTypes, typeId) && Array.isArray(progression) && progression.length === 2);
  assert.deepStrictEqual(Array.from(progression, entry => entry.level), [3, 6]);
  progression.forEach(entry => assert(has(data.equipmentSkills, entry.skillId)));
}
assert(data.ultraRareConfig.dropChance > 0 && data.ultraRareConfig.dropChance <= .001 && data.ultraRareConfig.statMultiplier === 2);
for (const [id, title] of Object.entries(data.ultraRareTitles)) {
  assert.strictEqual(title.id, id);
  assert(typeof title.name === "string" && title.name.trim() && has(data.equipmentSkills, title.skillId));
}

const legacySkillFields = ["kind", "effect", "multiplier", "hits", "damageType", "defensePenetration", "criticalBonus", "threshold", "healFraction", "cooldown", "level"];
const effectTypes = new Set(["damage", "heal", "guard", "counter", "statMultiplier", "rearProtection", "combatModifier", "applyStatus", "cleanse", "slayer", "acquisitionModifier"]);
for (const skill of Object.values(data.skills)) {
  assert(data.skillCategories[skill.category], `${skill.id} has an invalid category`);
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
  assert.deepStrictEqual(Object.keys(data.skillGrants[ownerType]).sort(), Object.keys(table).sort(), `${ownerType} skill grants must be complete`);
  assert.deepStrictEqual(Object.keys(data.equipmentAffinities[ownerType]).sort(), Object.keys(table).sort(), `${ownerType} affinities must be complete`);
  for (const entry of Object.values(table)) {
    assert(!("skills" in entry) && !("weaponAffinity" in entry) && !("armorAffinity" in entry), `${entry.id} mixes relations into its master record`);
    const grants = data.skillGrants[ownerType][entry.id];
    const expectedLevels = { job: [10, 40, 70, 100], race: [1, 30, 60, 100], birth: [1, 20, 60, 100] }[ownerType];
    assert.strictEqual(grants.filter(grant => grant.initial).length, 4, `${ownerType}:${entry.id} needs four starting skills`);
    assert.deepStrictEqual(Array.from(grants.filter(grant => !grant.initial), grant => grant.level), expectedLevels, `${ownerType}:${entry.id} has invalid progression milestones`);
    grants.forEach(grant => {
      assert(has(data.skills, grant.skillId) && typeof grant.initial === "boolean" && Number.isInteger(grant.level) && grant.level > 0, `${ownerType}:${entry.id} has an invalid grant`);
      assert(!grant.initial || grant.level === 1, `${ownerType}:${entry.id} starting skill must use level 1 internally`);
    });
    Object.entries(data.equipmentAffinities[ownerType][entry.id]).forEach(([type, multiplier]) => {
      assert(has(data.equipmentTypes, type) && Number.isFinite(multiplier) && multiplier > 0, `${ownerType}:${entry.id} has an invalid affinity`);
    });
    Object.entries(entry.elementModifiers || {}).forEach(([id, multiplier]) => assert(has(data.elements, id) && multiplier > 0, `${ownerType}:${entry.id} has an invalid element modifier`));
    Object.entries(entry.statusResistances || {}).forEach(([id, resistance]) => assert(has(data.statusEffects, id) && resistance >= 0 && resistance <= 1, `${ownerType}:${entry.id} has an invalid status resistance`));
  }
}

const pricing = data.recruitment.pricing;
assert(pricing && pricing.base >= 0 && pricing.roundTo > 0, "Recruitment pricing needs base and rounding rules");
assert(Array.isArray(pricing.foundingSubsidies) && pricing.foundingSubsidies.length === 3 && pricing.foundingSubsidies.every((value, index, values) => value >= 0 && (!index || value < values[index - 1])), "Recruitment needs three decreasing founding subsidies");
assert.deepStrictEqual(Object.keys(pricing.jobCosts).sort(), Object.keys(data.jobs).sort(), "Every job needs a recruitment cost");
assert.deepStrictEqual(Object.keys(pricing.raceCosts).sort(), Object.keys(data.races).sort(), "Every race needs a recruitment cost");
Object.values(pricing.jobCosts).concat(Object.values(pricing.raceCosts)).forEach(value => assert(Number.isFinite(value) && value >= 0));
assert.deepStrictEqual(Object.keys(pricing.abilityWeights).sort(), Object.keys(pricing.abilityBaselines).sort(), "Recruitment ability pricing fields must match");
const posting = data.recruitment.postingCost;
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
  assert(has(data.storyScenes, dungeon.openingStoryId), `${dungeon.id} needs an opening story`);
  assert(has(data.storyScenes, dungeon.discoveryStoryId), `${dungeon.id} needs an exploration discovery story`);
  if (dungeon.optionalStoryId) assert(!dungeon.requiredForStory && has(data.storyScenes, dungeon.optionalStoryId), `${dungeon.id} has an invalid optional story`);
  dungeon.unlockRequirements.forEach(requirement => {
    assert(["chapterCompleted", "dungeonClear", "characters", "departure", "itemOwned"].includes(requirement.type), `${dungeon.id} has an unknown unlock requirement`);
    if (requirement.type === "chapterCompleted") assert(data.storyChapters.some(chapter => chapter.id === requirement.chapterId));
    if (requirement.type === "dungeonClear") assert(has(data.dungeons, requirement.dungeonId));
    if (requirement.type === "itemOwned") assert(has(data.items, requirement.itemId));
  });
  dungeon.encounters.flatMap(encounter => encounter.groups.flat()).forEach(id => assert(has(data.monsters, id), `${dungeon.id} references unknown monster ${id}`));
  dungeon.drops.forEach(drop => assert(has(data.items, drop.itemId), `${dungeon.id} references unknown item ${drop.itemId}`));
}
data.storyChapters.forEach((chapter, index) => {
  assert(chapter.order === index && Number.isInteger(chapter.number), `${chapter.id} has an invalid chapter order`);
  assert(has(data.storyScenes, chapter.openingStoryId) && has(data.storyScenes, chapter.clearStoryId), `${chapter.id} has invalid story scene references`);
  assert(Array.isArray(chapter.recommendedLevelRange) && chapter.recommendedLevelRange.length === 2 && chapter.recommendedLevelRange[0] <= chapter.recommendedLevelRange[1]);
  assert(Array.isArray(chapter.entryRequirements) && chapter.rewards && Number.isFinite(chapter.rewards.gold) && chapter.rewards.materials, `${chapter.id} needs progression and reward data`);
});
for (const monster of Object.values(data.monsters)) {
  assert(Array.isArray(data.monsterFamilies[monster.id]) && data.monsterFamilies[monster.id].length, `${monster.id} needs creature classification`);
  data.monsterFamilies[monster.id].forEach(id => assert(has(data.creatureFamilies, id), `${monster.id} has an unknown creature family`));
  (monster.materialDrops || []).forEach(drop => assert(has(data.items, drop.itemId) && data.items[drop.itemId].type === "material"));
  assert(monster.signatureDrops && Array.isArray(monster.signatureDrops.materials) && monster.signatureDrops.materials.length, `${monster.id} needs fixed material drops`);
  monster.signatureDrops.materials.forEach(drop => assert(has(data.items, drop.itemId) && data.items[drop.itemId].type === "material" && drop.chance > 0 && drop.chance < .2, `${monster.id} has invalid fixed material drop`));
  assert(has(data.items, monster.signatureDrops.equipment.itemId) && ["weapon", "armor"].includes(data.items[monster.signatureDrops.equipment.itemId].type) && !data.items[monster.signatureDrops.equipment.itemId].unique && (data.items[monster.signatureDrops.equipment.itemId].craftOnly || data.items[monster.signatureDrops.equipment.itemId].dropOnly) && monster.signatureDrops.equipment.chance > 0 && monster.signatureDrops.equipment.chance < .1, `${monster.id} has invalid fixed equipment drop`);
  if (monster.bossDrop) assert(has(data.items, monster.bossDrop.itemId));
  if (monster.element) assert(has(data.elements, monster.element));
  Object.keys(monster.elementModifiers || {}).forEach(id => assert(has(data.elements, id)));
  Object.keys(monster.statusResistances || {}).forEach(id => assert(has(data.statusEffects, id)));
  if (monster.statusAttack) assert(has(data.statusEffects, monster.statusAttack.statusId));
}
for (const race of Object.values(data.races)) {
  assert(Array.isArray(data.adventurerFamilies[race.id]) && data.adventurerFamilies[race.id].length, `${race.id} needs creature classification`);
  data.adventurerFamilies[race.id].forEach(id => assert(has(data.creatureFamilies, id), `${race.id} has an unknown creature family`));
}
for (const [jobId, rule] of Object.entries(data.classChanges)) assert(has(data.jobs, jobId) && has(data.skills, rule.masterSkillId));

assert(Array.isArray(data.facilities.order) && new Set(data.facilities.order).size === data.facilities.order.length, "Facility order must contain unique IDs");
assert.deepStrictEqual(Object.keys(data.facilities.upgradeGoldByTargetLevel).map(Number), [2, 3, 4, 5]);
assert(Object.values(data.facilities.upgradeGoldByTargetLevel).every((value, index, values) => value > 0 && (!index || value > values[index - 1])), "Facility gold costs must rise with level");
data.facilities.order.forEach(id => {
  const facility = data.facilities.definitions[id];
  assert(facility?.id === id, `${id} needs matching facility ID and definition`);
  assert(Number.isFinite(facility.goldCostMultiplier) && facility.goldCostMultiplier > 0, `${id} needs a gold-cost multiplier`);
  data.facilities.trackOrder.forEach(trackId => {
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
assert.strictEqual(game.GameData.partyProgression.partySlots.maximum, 8);
assert.deepStrictEqual(Array.from(game.GameData.partyProgression.partySlots.unlocks.filter(entry => !entry.codeOnly), entry => entry.chapterNumber), [1, 2, 3, 4, 5, 6]);
assert.strictEqual(game.GameData.partyProgression.partySlots.unlocks.filter(entry => entry.codeOnly).length, 1);
const partyRules = game.GameData.partyProgression.partySlots;
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
