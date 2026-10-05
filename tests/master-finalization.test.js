const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scripts = Array.from(html.matchAll(/<script defer src="([^"]+)"/g), match => match[1]);
const validationIndex = scripts.indexOf("data/masterValidation.js");
const finalizerIndex = scripts.indexOf("data/masterFinalize.js");
const runtimeIndex = scripts.indexOf("js/runtime.js");
assert(finalizerIndex > 0, "The master finalizer must be loaded");
assert(validationIndex > 0 && validationIndex < finalizerIndex, "Reference validation must run before finalization");
assert(finalizerIndex < runtimeIndex, "Master data must be finalized before runtime code starts");

const context = vm.createContext({ window: {} });
scripts.slice(0, finalizerIndex).forEach(file => {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
});

const data = context.window.GameData;
assert.deepStrictEqual(Array.from(data.registry.validate()), []);
const woodenSwordGrants = data.relations.itemSkillGrants.wooden_sword;
data.relations.itemSkillGrants.wooden_sword = ["missing_equipment_skill"];
assert(data.registry.validate().some(message => message.includes("missing_equipment_skill")));
assert.throws(() => data.registry.finalize(), /マスターデータの参照が不正です/);
data.relations.itemSkillGrants.wooden_sword = woodenSwordGrants;
const woodenSwordWeight = data.items.wooden_sword.weight;
data.items.wooden_sword.weight = 0;
assert(data.registry.validate().some(message => message.includes("items.wooden_sword.weight")), "Equipment must have a positive equipping weight.");
data.items.wooden_sword.weight = woodenSwordWeight;
const woodenSwordSalvage = data.items.wooden_sword.salvage;
data.items.wooden_sword.salvage = { itemId: "wooden_sword", quantity: 1 };
assert(data.registry.validate().some(message => message.includes("items.wooden_sword.salvage.itemId") && message.includes("素材")), "Equipment salvage must produce materials rather than equipment.");
data.items.wooden_sword.salvage = woodenSwordSalvage;
const tempestEffectKind = data.items.tempest_bow.specialEffects[0].kind;
data.items.tempest_bow.specialEffects[0].kind = "unknownSpecialEffect";
assert(data.registry.validate().some(message => message.includes("items.tempest_bow.specialEffects.0.kind") && message.includes("unknownSpecialEffect")), "Unique equipment effects must be implemented before being published.");
data.items.tempest_bow.specialEffects[0].kind = tempestEffectKind;
const ironSwordRecipe = data.recipes.find(recipe => recipe.id === "forge_iron_sword");
const ironSwordOreCost = ironSwordRecipe.materials.iron_ore;
ironSwordRecipe.materials.iron_ore = 0;
assert(data.registry.validate().some(message => message.includes("recipes.forge_iron_sword.materials.iron_ore")), "Recipe material costs must be positive integers.");
ironSwordRecipe.materials.iron_ore = ironSwordOreCost;
const meadowDuration = data.dungeons.meadow.duration;
data.dungeons.meadow.duration = 0;
assert(data.registry.validate().some(message => message.includes("dungeons.meadow.duration")), "Dungeon duration must remain playable and positive.");
data.dungeons.meadow.duration = meadowDuration;
const brookRequirement = data.dungeons.whispering_brook.unlockRequirements[0];
data.dungeons.whispering_brook.unlockRequirements[0] = { type: "dungeonClear", dungeonId: "whispering_brook" };
assert(data.registry.validate().some(message => message.includes("dungeons.whispering_brook.unlockRequirements.0.dungeonId") && message.includes("自分自身")), "Dungeon progression must reject self-locking routes.");
data.dungeons.whispering_brook.unlockRequirements[0] = brookRequirement;
const meadowGoldRange = data.dungeons.meadow.rewards.gold;
data.dungeons.meadow.rewards.gold = [100, 50];
assert(data.registry.validate().some(message => message.includes("dungeons.meadow.rewards.gold")), "Dungeon reward ranges must remain ordered.");
data.dungeons.meadow.rewards.gold = meadowGoldRange;
const roadsideLevelRange = data.storyChapters.find(chapter => chapter.id === "roadside").recommendedLevelRange;
data.storyChapters.find(chapter => chapter.id === "roadside").recommendedLevelRange = [7, 1];
assert(data.registry.validate().some(message => message.includes("storyChapters.roadside.recommendedLevelRange")), "Chapter level ranges must remain ordered.");
data.storyChapters.find(chapter => chapter.id === "roadside").recommendedLevelRange = roadsideLevelRange;
const attackMultiplierStat = data.equipmentSkills.attack_105.effects[0].stat;
data.equipmentSkills.attack_105.effects[0].stat = "unknownStat";
assert(data.registry.validate().some(message => message.includes("equipmentSkills.attack_105.effects.0.stat") && message.includes("unknownStat")), "Equipment multipliers must target a stat consumed by combat calculations.");
data.equipmentSkills.attack_105.effects[0].stat = attackMultiplierStat;
const conversionSource = data.equipmentSkills.attack_to_hp_1.effects[0].source;
data.equipmentSkills.attack_to_hp_1.effects[0].source = "unknownSource";
assert(data.registry.validate().some(message => message.includes("equipmentSkills.attack_to_hp_1.effects.0.source") && message.includes("unknownSource")), "Equipment conversions must use calculable source stats.");
data.equipmentSkills.attack_to_hp_1.effects[0].source = conversionSource;
const swordUpgradeLevel = data.relations.upgradeSkillProgression.sword[0].level;
data.relations.upgradeSkillProgression.sword[0].level = 0;
assert(data.registry.validate().some(message => message.includes("relations.upgradeSkillProgression.sword.0.level")), "Equipment upgrade skills need positive ascending milestones.");
data.relations.upgradeSkillProgression.sword[0].level = swordUpgradeLevel;
const powerStrikeEffects = data.skills.power_strike.effects;
data.skills.power_strike.effects = [{ type: "applyStatus", statusId: "burn", chance: 1, duration: 1 }];
assert(data.registry.validate().some(message => message.includes("power_strike") && message.includes("実行できる主効果")), "Active skills without an executable primary effect must fail before publishing master data.");
data.skills.power_strike.effects = powerStrikeEffects;
const powerStrikeMultiplier = powerStrikeEffects[0].multiplier;
powerStrikeEffects[0].multiplier = 0;
assert(data.registry.validate().some(message => message.includes("skills.power_strike.effects.0.multiplier")), "Non-positive damage multipliers must fail before combat.");
powerStrikeEffects[0].multiplier = powerStrikeMultiplier;
const powerStrikeActivation = data.skills.power_strike.activation;
data.skills.power_strike.activation = { ...powerStrikeActivation, cooldownTurns: 0 };
assert(data.registry.validate().some(message => message.includes("power_strike.activation.cooldownTurns")), "Invalid hero cooldowns must be rejected before they can permanently lock a used skill.");
data.skills.power_strike.activation = powerStrikeActivation;
data.skills.power_strike.effects = [...powerStrikeEffects, { type: "counter", chance: 1, multiplier: 1 }];
assert(data.registry.validate().some(message => message.includes("skills.power_strike.counter") && message.includes("パッシブ")), "Passive-only effects must not be attached to always-available active skills.");
data.skills.power_strike.effects = powerStrikeEffects;
const powerStrikeTargeting = data.skills.power_strike.targeting;
data.skills.power_strike.targeting = { scope: "unimplementedTarget" };
assert(data.registry.validate().some(message => message.includes("power_strike.targeting.scope")), "Unimplemented target scopes must not silently reach combat.");
data.skills.power_strike.targeting = powerStrikeTargeting;
const detoxActivation = data.skills.instant_detox.activation;
data.skills.instant_detox.activation = { ...detoxActivation, trigger: "unknownReaction" };
assert(data.registry.validate().some(message => message.includes("instant_detox.activation.trigger")), "Unsupported reaction triggers must fail master validation.");
data.skills.instant_detox.activation = detoxActivation;
const detoxCount = data.skills.instant_detox.effects[0].count;
data.skills.instant_detox.effects[0].count = 0;
assert(data.registry.validate().some(message => message.includes("skills.instant_detox.effects.0.count")), "A cleanse that cannot remove any status must fail before combat.");
data.skills.instant_detox.effects[0].count = detoxCount;
const poisonPriority = data.statusEffects.poison.cleansePriority;
data.statusEffects.poison.cleansePriority = -1;
assert(data.registry.validate().some(message => message.includes("statusEffects.poison.cleansePriority")), "Status cleanse priority must be valid before combat AI relies on it.");
data.statusEffects.poison.cleansePriority = poisonPriority;
const dwarfPoisonResistance = data.races.dwarf.statusResistances.poison;
data.races.dwarf.statusResistances.poison = 2;
assert(data.registry.validate().some(message => message.includes("races.dwarf.statusResistances.poison")), "Origin status resistances must stay within probability bounds.");
data.races.dwarf.statusResistances.poison = dwarfPoisonResistance;
const warriorInitialFlag = data.relations.skillGrants.job.warrior[0].initial;
data.relations.skillGrants.job.warrior[0].initial = false;
assert(data.registry.validate().some(message => message.includes("relations.skillGrants.job.warrior") && message.includes("初期スキル")), "Every origin must retain exactly four initial skills.");
data.relations.skillGrants.job.warrior[0].initial = warriorInitialFlag;
const warriorSwordAffinity = data.relations.equipmentAffinities.job.warrior.sword;
data.relations.equipmentAffinities.job.warrior.sword = 0;
assert(data.registry.validate().some(message => message.includes("relations.equipmentAffinities.job.warrior.sword")), "Equipment affinities must remain positive multipliers.");
data.relations.equipmentAffinities.job.warrior.sword = warriorSwordAffinity;
const minaBaseHp = data.companionProfiles.mina.baseStats.hp;
data.companionProfiles.mina.baseStats.hp = 0;
assert(data.registry.validate().some(message => message.includes("companionProfiles.mina.baseStats.hp")), "Story companions must have usable initial combat stats.");
data.companionProfiles.mina.baseStats.hp = minaBaseHp;
const minaStagePrevious = data.relations.companionProgressions.mina.stages.free_hammer.previousStageId;
data.relations.companionProgressions.mina.stages.free_hammer.previousStageId = "free_hammer";
assert(data.registry.validate().some(message => message.includes("companionProgressions.mina.free_hammer") && message.includes("初期段階")), "Companion progression cycles must be rejected.");
data.relations.companionProgressions.mina.stages.free_hammer.previousStageId = minaStagePrevious;
const joinMinaTriggerType = data.relations.storyTriggers.find(trigger => trigger.id === "join_companion_mina").when.type;
data.relations.storyTriggers.find(trigger => trigger.id === "join_companion_mina").when.type = "unknownStoryTrigger";
assert(data.registry.validate().some(message => message.includes("storyTriggers.join_companion_mina.when.type")), "Unsupported story trigger conditions must fail before story runtime.");
data.relations.storyTriggers.find(trigger => trigger.id === "join_companion_mina").when.type = joinMinaTriggerType;
const ailmentTriage = data.observationNotes.find(note => note.id === "ailment_triage");
const ailmentTriageUnlock = ailmentTriage.unlock;
ailmentTriage.unlock = { type: "chapterCompleted", chapterId: "missing_chapter" };
assert(data.registry.validate().some(message => message.includes("observationNotes.ailment_triage.unlock.chapterId") && message.includes("missing_chapter")), "Observation notes must not publish with a missing unlock reference.");
ailmentTriage.unlock = ailmentTriageUnlock;
const ailmentTriageFindings = ailmentTriage.findings;
ailmentTriage.findings = [];
assert(data.registry.validate().some(message => message.includes("observationNotes.ailment_triage.findings")), "Observation notes must keep at least one readable finding.");
ailmentTriage.findings = ailmentTriageFindings;
const meadowCommission = data.commissions.find(commission => commission.id === "first_meadow");
const meadowRewards = meadowCommission.rewards;
meadowCommission.rewards = { gold: 10, materials: { missing_material: 1 } };
assert(data.registry.validate().some(message => message.includes("commissions.first_meadow.rewards.materials") && message.includes("missing_material")), "Commission rewards must reference a known material.");
meadowCommission.rewards = meadowRewards;
const secretAchievement = data.achievements.find(achievement => achievement.id === "five_reaches_wedge");
const secretCondition = secretAchievement.condition;
secretAchievement.condition = { type: "specificDungeonClear", dungeonId: "missing_dungeon", target: 1 };
assert(data.registry.validate().some(message => message.includes("achievements.five_reaches_wedge.condition.dungeonId") && message.includes("missing_dungeon")), "Specific-dungeon achievements must point to an existing dungeon.");
secretAchievement.condition = secretCondition;
const dailyPinnedIds = data.config.recurringMissions.groups[0].selection.pinnedIds;
data.config.recurringMissions.groups[0].selection.pinnedIds = ["missing_mission"];
assert(data.registry.validate().some(message => message.includes("config.recurringMissions.groups.daily.selection.pinnedIds") && message.includes("missing_mission")), "Pinned recurring missions must exist in their own group.");
data.config.recurringMissions.groups[0].selection.pinnedIds = dailyPinnedIds;
const dropQualityId = data.config.qualityTables.drop[0][0];
data.config.qualityTables.drop[0][0] = "missing_quality";
assert(data.registry.validate().some(message => message.includes("config.qualityTables.drop.0") && message.includes("missing_quality")), "Quality tables must only contain published quality IDs.");
data.config.qualityTables.drop[0][0] = dropQualityId;
const worldbreakerSkillId = data.ultraRareTitles.worldbreaker.skillId;
data.ultraRareTitles.worldbreaker.skillId = "missing_equipment_skill";
assert(data.registry.validate().some(message => message.includes("ultraRareTitles.worldbreaker.skillId") && message.includes("missing_equipment_skill")), "Ultra-rare titles must provide an existing equipment skill.");
data.ultraRareTitles.worldbreaker.skillId = worldbreakerSkillId;
const abyssUnlockAfter = data.dungeonDifficulties.abyss.unlockAfter;
data.dungeonDifficulties.abyss.unlockAfter = "missing_difficulty";
assert(data.registry.validate().some(message => message.includes("dungeonDifficulties.abyss.unlockAfter") && message.includes("missing_difficulty")), "Difficulty progression must reference an existing previous tier.");
data.dungeonDifficulties.abyss.unlockAfter = abyssUnlockAfter;
const slimeMaterialChance = data.relations.monsterMaterialDrops.slime[0].chance;
data.relations.monsterMaterialDrops.slime[0].chance = 2;
assert(data.registry.validate().some(message => message.includes("relations.monsterMaterialDrops.slime.0.chance")), "Monster material chances must stay within probability bounds.");
data.relations.monsterMaterialDrops.slime[0].chance = slimeMaterialChance;
const slimeSignatureEquipmentId = data.relations.monsterSignatureDrops.slime.equipment.itemId;
data.relations.monsterSignatureDrops.slime.equipment.itemId = "sticky_fluid";
assert(data.registry.validate().some(message => message.includes("relations.monsterSignatureDrops.slime.equipment.itemId") && message.includes("装備")), "Signature equipment drops must not reference materials.");
data.relations.monsterSignatureDrops.slime.equipment.itemId = slimeSignatureEquipmentId;
const slimeAbyssQuantity = data.derived.monsterDifficultyDrops.slime.abyss.materials[0].quantity;
data.derived.monsterDifficultyDrops.slime.abyss.materials[0].quantity = [2, 1];
assert(data.registry.validate().some(message => message.includes("derived.monsterDifficultyDrops.slime.abyss.materials.0.quantity")), "Resolved difficulty drops must keep an ordered quantity range.");
data.derived.monsterDifficultyDrops.slime.abyss.materials[0].quantity = slimeAbyssQuantity;
const jobFieldTable = data.config.recruitment.fields[0].table;
data.config.recruitment.fields[0].table = "missing_recruitment_table";
assert(data.registry.validate().some(message => message.includes("config.recruitment.fields.jobId.table") && message.includes("missing_recruitment_table")), "Recruitment fields must point to a published option table.");
data.config.recruitment.fields[0].table = jobFieldTable;
const hardyBonus = data.recruitmentTalents.hardy.bonus;
data.recruitmentTalents.hardy.bonus = { speed: 3 };
assert(data.registry.validate().some(message => message.includes("recruitmentTalents.hardy.bonus.speed")), "Recruitment talents must only modify applicant base stats.");
data.recruitmentTalents.hardy.bonus = hardyBonus;
const qualityCode = data.accessCodes.double_quality_trial.code;
data.accessCodes.double_quality_trial.code = data.accessCodes.double_gold_trial.code;
assert(data.registry.validate().some(message => message.includes("accessCodes.double_quality_trial.code") && message.includes("重複")), "Feature codes must remain unique.");
data.accessCodes.double_quality_trial.code = qualityCode;
const mineSpeedInterval = data.facilities.mine.upgrades.speed[2].interval;
data.facilities.mine.upgrades.speed[2].interval = 123;
assert(data.registry.validate().some(message => message.includes("facilities.mine.upgrades.speed.2") && message.includes("1時間")), "Facility speed levels must follow the advertised one-hour divisor curve.");
data.facilities.mine.upgrades.speed[2].interval = mineSpeedInterval;
const mineUpgradeCost = data.facilities.mine.upgrades.production[1].cost;
data.facilities.mine.upgrades.production[1].cost = { wooden_sword: 1 };
assert(data.registry.validate().some(message => message.includes("facilities.mine.upgrades.production.1.cost.wooden_sword") && message.includes("素材")), "Facility upgrades must consume materials rather than equipment.");
data.facilities.mine.upgrades.production[1].cost = mineUpgradeCost;
const mineRareChance = data.facilities.mine.upgrades.production[1].chanceRewards[0].chance;
data.facilities.mine.upgrades.production[1].chanceRewards[0].chance = 1;
assert(data.registry.validate().some(message => message.includes("facilities.mine.upgrades.production.1.chanceRewards.0.chance")), "Facility chance rewards must remain probabilistic.");
data.facilities.mine.upgrades.production[1].chanceRewards[0].chance = mineRareChance;
const slimeHp = data.monsters.slime.hp;
data.monsters.slime.hp = 0;
assert(data.registry.validate().some(message => message.includes("monsters.slime.hp")), "Monsters must have positive combat health.");
data.monsters.slime.hp = slimeHp;
const spiderPoisonChance = data.monsters.cave_spider.statusAttack.chance;
data.monsters.cave_spider.statusAttack.chance = 2;
assert(data.registry.validate().some(message => message.includes("monsters.cave_spider.statusAttack.chance")), "Monster status chances must remain valid probabilities.");
data.monsters.cave_spider.statusAttack.chance = spiderPoisonChance;
const alphaBossDrop = data.monsters.alpha_wolf.bossDrop;
data.monsters.alpha_wolf.bossDrop = { itemId: "wooden_sword", chance: .1 };
assert(data.registry.validate().some(message => message.includes("monsters.alpha_wolf.bossDrop.itemId") && message.includes("固有装備")), "Boss-exclusive drops must stay tied to unique equipment.");
data.monsters.alpha_wolf.bossDrop = alphaBossDrop;
const memorySealDuration = data.monsterSkills.memory_seal.statusAttack.duration;
data.monsterSkills.memory_seal.statusAttack.duration = 0;
assert(data.registry.validate().some(message => message.includes("monsterSkills.memory_seal.statusAttack.duration")), "Monster skill ailments must have a usable duration.");
data.monsterSkills.memory_seal.statusAttack.duration = memorySealDuration;
const stormMechanic = data.monsters.storm_regent.mechanic;
data.monsters.storm_regent.mechanic = { ...stormMechanic, period: 2 };
assert(data.registry.validate().some(message => message.includes("storm_regent.mechanic.period") && message.includes("標準フェーズ")), "The built-in charge/burst/exposed cycle must not accept an impossible two-turn period.");
data.monsters.storm_regent.mechanic = {
  ...stormMechanic,
  period: 3,
  phases: [
    { id: "charge", warnsBurst: true, allowNormalActions: false },
    { id: "release", unleashesBurst: true, allowNormalActions: false }
  ]
};
assert(data.registry.validate().some(message => message.includes("storm_regent.mechanic.phases") && message.includes("period")), "A custom boss cycle must agree with its declared period.");
data.monsters.storm_regent.mechanic = {
  ...stormMechanic,
  period: 2,
  phases: [
    { id: "charge", warnsBurst: true, allowNormalActions: false },
    { id: "rest", allowNormalActions: true }
  ]
};
assert(data.registry.validate().some(message => message.includes("storm_regent.mechanic.phases") && message.includes("発動")), "A telegraphed boss cycle must contain the promised burst.");
data.monsters.storm_regent.mechanic = stormMechanic;
const viscousWavePeriod = data.monsterSkills.viscous_wave.period;
data.monsterSkills.viscous_wave.period = 0;
assert(data.registry.validate().some(message => message.includes("monsterSkills.viscous_wave.period")), "Invalid monster skill periods must be rejected before combat.");
data.monsterSkills.viscous_wave.period = viscousWavePeriod;
assert.deepStrictEqual(Array.from(data.registry.validate()), []);
vm.runInContext(fs.readFileSync(path.join(root, "data/masterFinalize.js"), "utf8"), context, { filename: "data/masterFinalize.js" });
assert.strictEqual(data.registry.isFinalized(), true);
assert.deepStrictEqual(Array.from(data.registry.missingTables()), []);
assert(Object.isFrozen(data.masterMeta.tables));
Object.values(data.masterMeta.tables).forEach(names => assert(Object.isFrozen(names)));
for (const value of [
  data.items,
  data.items.wooden_sword,
  data.storyChapters,
  data.config,
  data.config.shop.standardTiers,
  data.relations,
  data.relations.monsterMaterialDrops,
  data.derived,
  data.derived.itemCombatStats
]) assert(Object.isFrozen(value), "Published master data must be deeply frozen");

assert.throws(
  () => vm.runInContext('"use strict"; window.GameData.items.wooden_sword.name = "変更";', context),
  /read only property/
);
assert.throws(
  () => data.registry.entities("items", { late_item: { id: "late_item", name: "遅延登録" } }),
  /マスターデータは確定済みです/
);

console.log("Master finalization test passed: all master namespaces are immutable before runtime starts");
