const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const context = vm.createContext({ window: {} });
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "..", "data/masterSchema.js"), "utf8"),
  context
);

const data = context.window.GameData;
assert(Object.isFrozen(data.masterMeta.tables));
assert(Object.isFrozen(data.masterMeta.tables.entities));
assert(data.registry.missingTables().includes("entities.items"));
assert(data.registry.missingTables().includes("validators.references"));
assert.throws(() => data.registry.validator("unknownValidator", () => []), /検証規則が不正です/);
data.registry.entities("items", {
  registry_test_sword: { id: "registry_test_sword", name: "登録試験の剣" }
});
assert.strictEqual(data.items.registry_test_sword.name, "登録試験の剣");

assert.throws(
  () => data.registry.entities("items", {
    registry_test_sword: { id: "registry_test_sword", name: "重複する剣" }
  }),
  /マスターIDが重複しています/
);

const itemIdsBeforeInvalidBatch = Object.keys(data.items);
assert.throws(
  () => data.registry.entities("items", {
    valid_but_not_registered: { id: "valid_but_not_registered", name: "登録されない剣" },
    mismatched_key: { id: "different_id", name: "IDが不正な剣" }
  }),
  /マスターIDが一致しません/
);
assert.deepStrictEqual(
  Object.keys(data.items),
  itemIdsBeforeInvalidBatch,
  "不正な一括登録では、検証済みの定義も部分登録しない"
);

assert.throws(
  () => data.registry.entities("unknownTable", {}),
  /マスターデータの登録先が不正です/
);

data.recipes = [];
data.registry.entityList("recipes", [
  { id: "registry_test_recipe", resultId: "registry_test_sword" }
]);
assert.strictEqual(data.recipes[0].id, "registry_test_recipe");
assert.throws(
  () => data.registry.entityList("recipes", [{ id: "registry_test_recipe" }]),
  /マスターリストIDが重複しています/
);
const recipeCountBeforeInvalidBatch = data.recipes.length;
assert.throws(
  () => data.registry.entityList("recipes", [{ id: "duplicate_recipe" }, { id: "duplicate_recipe" }]),
  /マスターリストIDが重複しています/
);
assert.strictEqual(data.recipes.length, recipeCountBeforeInvalidBatch);
assert.throws(
  () => data.registry.entityList("unknownList", []),
  /マスターリストの登録先が不正です/
);

data.registry.relations("monsterMaterialDrops", {
  registry_test_slime: [{ itemId: "registry_test_gel", chance: 1, quantity: [1, 1] }]
});
assert.strictEqual(data.relations.monsterMaterialDrops.registry_test_slime[0].itemId, "registry_test_gel");
assert.throws(
  () => data.registry.relations("monsterMaterialDrops", {
    registry_test_slime: [{ itemId: "duplicate_gel", chance: 1, quantity: [1, 1] }]
  }),
  /関係IDが重複しています/
);
const relationIdsBeforeInvalidBatch = Object.keys(data.relations.monsterMaterialDrops);
assert.throws(
  () => data.registry.relations("monsterMaterialDrops", {
    valid_relation_not_registered: [],
    registry_test_slime: []
  }),
  /関係IDが重複しています/
);
assert.deepStrictEqual(Object.keys(data.relations.monsterMaterialDrops), relationIdsBeforeInvalidBatch);
assert.throws(
  () => data.registry.relations("unknownRelation", {}),
  /関係データの登録先が不正です/
);

data.registry.relationList("storyTriggers", [
  { id: "registry_test_trigger", when: { type: "chapterActive" }, effects: [] }
]);
assert.strictEqual(data.relations.storyTriggers[0].id, "registry_test_trigger");
assert.throws(
  () => data.registry.relationList("storyTriggers", [{ id: "registry_test_trigger" }]),
  /関係リストIDが重複しています/
);
const triggerCountBeforeInvalidBatch = data.relations.storyTriggers.length;
assert.throws(
  () => data.registry.relationList("storyTriggers", [{ id: "duplicate_in_batch" }, { id: "duplicate_in_batch" }]),
  /関係リストIDが重複しています/
);
assert.strictEqual(data.relations.storyTriggers.length, triggerCountBeforeInvalidBatch);
assert.throws(
  () => data.registry.relationList("unknownList", []),
  /関係リストの登録先が不正です/
);

data.registry.config("combatRules", { actionPriority: ["attack"] });
assert.deepStrictEqual(Array.from(data.config.combatRules.actionPriority), ["attack"]);
assert.throws(
  () => data.registry.config("combatRules", { actionPriority: [] }),
  /設定データが重複しています/
);
assert.throws(
  () => data.registry.config("unknownConfig", {}),
  /設定データの登録先が不正です/
);

data.registry.derived("weaponTypes", { registry_test_weapon: "登録試験武器" });
assert.strictEqual(data.derived.weaponTypes.registry_test_weapon, "登録試験武器");
assert.throws(
  () => data.registry.derived("weaponTypes", {}),
  /参照データが重複しています/
);
assert.throws(
  () => data.registry.derived("unknownDerived", {}),
  /参照データの登録先が不正です/
);

const contentFiles = [
  "data/chapters/earlyExpansion.js",
  ...Array.from({ length: 12 }, (_, index) => `data/chapters/chapter${index + 4}.js`),
  "data/postgame/afterstarReaches.js"
];
contentFiles.forEach(file => {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  assert(source.includes("data.registry.entities("), `${file} must register add-on entities through the registry`);
  assert(
    !/data\.(?:items|monsters|dungeons|storyScenes)(?:\[[^\]]+\]|\.[A-Za-z0-9_]+)\s*=/.test(source),
    `${file} must not assign an add-on entity directly`
  );
  assert(
    !/data\.(?:monsters|dungeons)(?:\[[^\]]+\]|\.[A-Za-z0-9_]+)\.(?:materialDrops|recommendedLevel|difficulty|rewards|monsterScaling)\s*=/.test(source),
    `${file} must not patch registered monster or dungeon data`
  );
  assert(
    !/Object\.assign\(data\.(?:items|monsters|dungeons|storyScenes)(?:\[[^\]]+\]|\.[A-Za-z0-9_]+)/.test(source),
    `${file} must not patch a registered entity with Object.assign`
  );
  assert(
    !/data\.relations\.[A-Za-z0-9_]+(?:\[[^\]]+\]|\.[A-Za-z0-9_]+)\s*=/.test(source),
    `${file} must not overwrite a registered relation directly`
  );
  assert(!/data\.(?:recipes|storyChapters)\.push\(/.test(source), `${file} must register ordered master entries through entityList`);
  assert(
    !/\b(?:dungeon|route)\.(?:openingStoryId|discoveryStoryId)\s*=/.test(source),
    `${file} must not patch dungeon story links into an entity`
  );
});

["data/monsters.js", "data/shop.js", "data/monsterDrops.js", "data/itemSkills.js", "data/companions.js", "data/companionStories.js", "data/dungeonDifficulties.js", "data/dungeonPartyRestrictions.js", "data/monsterSkills.js", "data/creatureFamilies.js"].forEach(file => {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  assert(
    !/data\.relations\.[A-Za-z0-9_]+(?:\[[^\]]+\]|\.[A-Za-z0-9_]+)\s*=/.test(source),
    `${file} must not overwrite a relation directly`
  );
});

["data/items.js", "data/monsters.js", "data/dungeons.js", "data/shop.js", "data/dungeonStories.js", "data/companions.js", "data/skills.js", "data/progressionSkills.js"].forEach(file => {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  assert(
    !/(?:window\.)?(?:GameData|data)\.(?:items|monsters|dungeons|storyScenes|companions|skills)(?:\[[^\]]+\]|\.[A-Za-z0-9_]+)\s*=/.test(source),
    `${file} must publish its base master only after construction is complete`
  );
  assert(
    !/(?:window\.)?(?:GameData|data)\.(?:items|monsters|dungeons|storyScenes|companions|skills)(?:\[[^\]]+\]|\.[A-Za-z0-9_]+)\.[A-Za-z0-9_]+\s*=/.test(source),
    `${file} must not patch a published base entity`
  );
  assert(
    !/\bdungeon\.(?:openingStoryId|discoveryStoryId)\s*=/.test(source),
    `${file} must store dungeon story links in the relation table`
  );
});

for (const [file, expectedCall] of [
  ["data/companions.js", "data.registry.entities(\"companions\""],
  ["data/companionStories.js", "data.registry.relationList(\"storyTriggers\""],
  ["data/storyDialogues.js", "data.registry.relations(\"storySceneScripts\""],
  ["data/dungeonDifficulties.js", "data.registry.relations(\"monsterDifficultyDropOverrides\""],
  ["data/dungeonPartyRestrictions.js", "data.registry.relations(\"dungeonPartyRestrictions\""],
  ["data/monsterSkills.js", "data.registry.relations(\"monsterDifficultySkillGrants\""],
  ["data/creatureFamilies.js", "data.registry.relations(\"monsterFamilies\""],
  ["data/affinities.js", "data.registry.relations(\"equipmentAffinities\""],
  ["data/equipmentSkills.js", "data.registry.relations(\"upgradeSkillProgression\""],
  ["data/skillGrants.js", "data.registry.relations(\"skillGrants\""],
  ["data/commissions.js", "GameData.registry.entityList(\"commissions\""]
]) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  assert(source.includes(expectedCall), `${file} must use the matching registry API`);
  assert(!/relations\.(?:companionSkillGrants|companionProgressions|companionStoryArcs|storySceneOverlays)\s*=/.test(source), `${file} must not replace a relation table`);
  assert(!/relations\.storyTriggers\.push\(/.test(source), `${file} must not append story triggers outside the registry`);
}

{
  const source = fs.readFileSync(path.join(__dirname, "..", "data/creatureFamilies.js"), "utf8");
  assert(!/data\.(?:monsterFamilies|adventurerFamilies)\s*=/.test(source), "Creature classifications must live in relation tables");
}

[...Array.from({ length: 12 }, (_, index) => `data/chapters/chapter${index + 4}.js`), "data/postgame/afterstarReaches.js"].forEach(file => {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  assert(source.includes("data.registry.entityList(\"recipes\""), `${file} must register recipes through entityList`);
  assert(source.includes("data.registry.entityList(\"storyChapters\""), `${file} must register chapters through entityList`);
});

for (const file of ["data/skills.js", "data/progressionSkills.js"]) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  assert(source.includes("data.registry.entities(\"skills\""), `${file} must register skills through the registry`);
  assert(!/data\.skills(?:\[[^\]]+\]|\.[A-Za-z0-9_]+)\s*=/.test(source), `${file} must not assign skills directly`);
}

for (const [file, tableName] of [["data/items.js", "items"], ["data/monsters.js", "monsters"], ["data/dungeons.js", "dungeons"], ["data/jobs.js", "jobs"]]) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  assert(source.includes(`registry.entities("${tableName}"`), `${file} must register its completed base master through the registry`);
  assert(!new RegExp(`(?:GameData|data)\\.${tableName}\\s*=`).test(source), `${file} must not publish its base master by direct replacement`);
}

for (const [file, tableNames] of [
  ["data/affinities.js", ["equipmentTypes"]],
  ["data/combatEffects.js", ["elements", "statusEffects"]],
  ["data/creatureFamilies.js", ["creatureFamilies"]],
  ["data/portraits.js", ["portraits"]],
  ["data/qualities.js", ["qualities"]],
  ["data/equipmentSkills.js", ["equipmentSkills"]],
  ["data/monsterSkills.js", ["monsterSkills"]],
  ["data/ultraRareTitles.js", ["ultraRareTitles"]],
  ["data/accessCodes.js", ["accessCodes"]],
  ["data/dungeonDifficulties.js", ["dungeonDifficulties"]],
  ["data/recruitment.js", ["recruitmentTalents"]],
  ["data/facilities.js", ["facilities"]]
]) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  for (const tableName of tableNames) {
    assert(source.includes(`registry.entities("${tableName}"`), `${file} must register ${tableName} through the registry`);
    assert(!new RegExp(`(?:GameData|data)\\.${tableName}\\s*=`).test(source), `${file} must not publish ${tableName} by direct replacement`);
  }
}

{
  const source = fs.readFileSync(path.join(__dirname, "..", "data/affinities.js"), "utf8");
  for (const tableName of ["weaponTypes", "armorTypes"]) {
    assert(source.includes(`registry.derived("${tableName}"`), `data/affinities.js must register derived ${tableName}`);
    assert(!new RegExp(`(?:GameData|data)\\.${tableName}\\s*=`).test(source), `data/affinities.js must not publish derived ${tableName} at the master root`);
  }
}

for (const [file, tableNames] of [
  ["data/combatStats.js", ["itemCombatStats", "monsterCombatStats"]],
  ["data/dungeonDifficulties.js", ["monsterDifficultyDrops"]]
]) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  for (const tableName of tableNames) {
    assert(source.includes(`registry.derived("${tableName}"`), `${file} must register derived ${tableName}`);
    assert(!new RegExp(`data\\.derived\\.${tableName}(?:\\[[^\\]]+\\]|\\.[A-Za-z0-9_]+)\\s*=`).test(source), `${file} must not mutate derived ${tableName} entry by entry`);
  }
}

{
  const source = fs.readFileSync(path.join(__dirname, "..", "data/origins.js"), "utf8");
  for (const tableName of ["races", "births"]) assert(source.includes(`registry.entities("${tableName}"`), `data/origins.js must register ${tableName} through the registry`);
  assert(!/data\.(?:races|births)\s*=/.test(source), "data/origins.js must not publish origin tables by direct replacement");
}

for (const [file, tableName] of [["data/recipes.js", "recipes"], ["data/story.js", "storyChapters"]]) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  assert(source.includes(`registry.entityList("${tableName}"`), `${file} must register its ordered base master through entityList`);
}

for (const [file, tableName] of [["data/achievements.js", "achievements"], ["data/observationNotes.js", "observationNotes"]]) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  assert(source.includes(`registry.entityList("${tableName}"`), `${file} must register its ordered entries through entityList`);
  assert(!new RegExp(`(?:GameData|data)\\.${tableName}\\s*=`).test(source), `${file} must not publish ${tableName} by direct replacement`);
}

for (const [file, configName] of [
  ["data/items.js", "equipmentBalance"],
  ["data/characterGrowth.js", "characterGrowth"],
  ["data/skills.js", "combatRules"],
  ["data/creatureFamilies.js", "monsterLoot"],
  ["data/ultraRareTitles.js", "ultraRare"],
  ["data/classChanges.js", "classChanges"],
  ["data/partyProgression.js", "partyProgression"],
  ["data/upgrades.js", "upgrades"],
  ["data/recruitment.js", "recruitment"],
  ["data/facilities.js", "facilities"],
  ["data/companions.js", "companions"],
  ["data/affixes.js", "affixes"],
  ["data/explorationEvents.js", "explorationEvents"],
  ["data/qualities.js", "qualityTables"],
  ["data/recurringMissions.js", "recurringMissions"],
  ["data/shop.js", "shop"],
  ["data/skillCategories.js", "skillCategories"]
]) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  assert(source.includes(`registry.config("${configName}"`), `${file} must register ${configName} through config`);
}

for (const file of ["data/partyProgression.js", "data/upgrades.js", "data/recruitment.js"]) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  assert(source.includes('registry.relationList("chapterUnlockAdditions"'), `${file} must register chapter unlock additions as relations`);
  assert(!/chapter\.unlockText\s*\+=/.test(source), `${file} must not patch registered chapter text`);
}

for (const [file, tableName] of [["data/recipes.js", "recipes"], ["data/story.js", "storyChapters"], ["data/commissions.js", "commissions"]]) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  assert(!new RegExp(`(?:GameData|data)\\.${tableName}\\s*=\\s*\\[\\]`).test(source), `${file} must let entityList initialize ${tableName}`);
}
{
  const source = fs.readFileSync(path.join(__dirname, "..", "data/story.js"), "utf8");
  assert(source.includes("registry.entities(\"storyScenes\""), "data/story.js must register base scenes through the registry");
}

console.log("master registry tests passed");
