(function () {
  "use strict";

  const data = window.GameData = window.GameData || {};
  const freezeNames = names => Object.freeze(names.slice());
  const tableManifest = Object.freeze({
    entities: freezeNames(["items", "monsters", "dungeons", "storyScenes", "storyCharacters", "companionProfiles", "skills", "jobs", "races", "births", "equipmentTypes", "elements", "statusEffects", "creatureFamilies", "portraits", "qualities", "equipmentSkills", "equipmentSets", "monsterSkills", "ultraRareTitles", "accessCodes", "dungeonDifficulties", "recruitmentTalents", "facilities"]),
    entityLists: freezeNames(["recipes", "storyChapters", "commissions", "achievements", "adventurerMilestones", "expeditionRumors", "observationNotes"]),
    configs: freezeNames(["equipmentBalance", "characterGrowth", "combatRules", "monsterLoot", "ultraRare", "classChanges", "partyProgression", "upgrades", "recruitment", "facilities", "companions", "affixes", "explorationEvents", "qualityTables", "recurringMissions", "shop", "skillCategories", "guildServices"]),
    relations: freezeNames([
      "companionSkillGrants", "companionProgressions", "companionStoryArcs",
      "itemSkillGrants", "monsterDifficultySkillGrants", "monsterDifficultyDropOverrides",
      "adventurerFamilies", "monsterFamilies", "monsterMaterialDrops", "monsterSignatureDrops",
      "dungeonStoryLinks", "dungeonPartyRestrictions", "equipmentAffinities", "upgradeSkillProgression", "skillGrants", "storySceneOverlays", "storySceneScripts"
    ]),
    relationLists: freezeNames(["storyTriggers", "chapterUnlockAdditions"]),
    derived: freezeNames(["weaponTypes", "armorTypes", "itemCombatStats", "monsterCombatStats", "monsterDifficultyDrops"])
  });
  const validatorManifest = freezeNames(["references"]);

  // マスターデータ本体と、別テーブル間の関係を明確に分ける。
  // entities: items / characters / dungeons など各ファイルが定義する本体
  // config: システム全体の上限や既定値
  // relations: ID同士を結ぶ付与・発火・制限条件
  // derived: 元の定義を変更せず、共通ルールで補完した参照用データ
  data.masterMeta = Object.freeze({ schemaVersion: 44, tables: tableManifest, validators: validatorManifest });
  data.config = data.config || {};
  data.relations = data.relations || {};
  data.derived = data.derived || {};

  Object.assign(data.relations, {
    companionSkillGrants: data.relations.companionSkillGrants || {},
    companionProgressions: data.relations.companionProgressions || {},
    companionStoryArcs: data.relations.companionStoryArcs || {},
    itemSkillGrants: data.relations.itemSkillGrants || {},
    monsterDifficultySkillGrants: data.relations.monsterDifficultySkillGrants || {},
    monsterDifficultyDropOverrides: data.relations.monsterDifficultyDropOverrides || {},
    adventurerFamilies: data.relations.adventurerFamilies || {},
    monsterFamilies: data.relations.monsterFamilies || {},
    monsterMaterialDrops: data.relations.monsterMaterialDrops || {},
    monsterSignatureDrops: data.relations.monsterSignatureDrops || {},
    dungeonStoryLinks: data.relations.dungeonStoryLinks || {},
    dungeonPartyRestrictions: data.relations.dungeonPartyRestrictions || {},
    equipmentAffinities: data.relations.equipmentAffinities || {},
    upgradeSkillProgression: data.relations.upgradeSkillProgression || {},
    skillGrants: data.relations.skillGrants || {},
    storySceneOverlays: data.relations.storySceneOverlays || {},
    storySceneScripts: data.relations.storySceneScripts || {},
    storyTriggers: data.relations.storyTriggers || [],
    chapterUnlockAdditions: data.relations.chapterUnlockAdditions || []
  });

  const entityTables = new Set(tableManifest.entities);
  const entityListTables = new Set(tableManifest.entityLists);
  const configTables = new Set(tableManifest.configs);
  const relationTables = new Set(tableManifest.relations);
  const relationListTables = new Set(tableManifest.relationLists);
  const derivedTables = new Set(tableManifest.derived);
  const registeredTables = {
    entities: new Set(),
    entityLists: new Set(),
    configs: new Set(),
    relations: new Set(),
    relationLists: new Set(),
    derived: new Set()
  };
  const validators = new Map();
  let finalized = false;
  function requireOpenRegistry() {
    if (finalized) throw new Error("マスターデータは確定済みです");
  }
  function registerEntities(tableName, entries) {
    requireOpenRegistry();
    if (!entityTables.has(tableName) || !entries || typeof entries !== "object" || Array.isArray(entries)) {
      throw new Error(`マスターデータの登録先が不正です: ${tableName}`);
    }
    const target = data[tableName] = data[tableName] || {};
    const registrations = Object.entries(entries);
    // すべての定義を先に検証し、1件でも不正なら何も登録しない。
    registrations.forEach(([id, entry]) => {
      if (!entry || entry.id !== id) throw new Error(`マスターIDが一致しません: ${tableName}.${id}`);
      if (Object.prototype.hasOwnProperty.call(target, id)) throw new Error(`マスターIDが重複しています: ${tableName}.${id}`);
    });
    registrations.forEach(([id, entry]) => {
      target[id] = entry;
    });
    registeredTables.entities.add(tableName);
    return entries;
  }
  function registerEntityList(tableName, entries) {
    requireOpenRegistry();
    if (!entityListTables.has(tableName) || !Array.isArray(entries)) {
      throw new Error(`マスターリストの登録先が不正です: ${tableName}`);
    }
    const target = data[tableName] = data[tableName] || [];
    if (!Array.isArray(target)) throw new Error(`マスターリストが初期化されていません: ${tableName}`);
    const registeredIds = new Set(target.map(entry => entry?.id));
    const batchIds = new Set();
    entries.forEach(entry => {
      if (!entry?.id) throw new Error(`マスターリストIDが不正です: ${tableName}`);
      if (registeredIds.has(entry.id) || batchIds.has(entry.id)) throw new Error(`マスターリストIDが重複しています: ${tableName}.${entry.id}`);
      batchIds.add(entry.id);
    });
    target.push(...entries);
    registeredTables.entityLists.add(tableName);
    return entries;
  }
  function registerRelations(tableName, entries) {
    requireOpenRegistry();
    if (!relationTables.has(tableName) || !entries || typeof entries !== "object" || Array.isArray(entries)) {
      throw new Error(`関係データの登録先が不正です: ${tableName}`);
    }
    const target = data.relations[tableName];
    const registrations = Object.entries(entries);
    registrations.forEach(([id]) => {
      if (Object.prototype.hasOwnProperty.call(target, id)) throw new Error(`関係IDが重複しています: ${tableName}.${id}`);
    });
    registrations.forEach(([id, relation]) => {
      target[id] = relation;
    });
    registeredTables.relations.add(tableName);
    return entries;
  }
  function registerRelationList(tableName, entries) {
    requireOpenRegistry();
    if (!relationListTables.has(tableName) || !Array.isArray(entries)) {
      throw new Error(`関係リストの登録先が不正です: ${tableName}`);
    }
    const target = data.relations[tableName];
    const registeredIds = new Set(target.map(entry => entry?.id));
    const batchIds = new Set();
    entries.forEach(entry => {
      if (!entry?.id) throw new Error(`関係リストIDが不正です: ${tableName}`);
      if (registeredIds.has(entry.id) || batchIds.has(entry.id)) throw new Error(`関係リストIDが重複しています: ${tableName}.${entry.id}`);
      batchIds.add(entry.id);
    });
    target.push(...entries);
    registeredTables.relationLists.add(tableName);
    return entries;
  }
  function registerConfig(configName, value) {
    requireOpenRegistry();
    if (!configTables.has(configName) || !value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`設定データの登録先が不正です: ${configName}`);
    }
    if (Object.prototype.hasOwnProperty.call(data.config, configName)) throw new Error(`設定データが重複しています: ${configName}`);
    data.config[configName] = value;
    registeredTables.configs.add(configName);
    return value;
  }
  function registerDerived(tableName, value) {
    requireOpenRegistry();
    if (!derivedTables.has(tableName) || !value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`参照データの登録先が不正です: ${tableName}`);
    }
    if (Object.prototype.hasOwnProperty.call(data.derived, tableName)) throw new Error(`参照データが重複しています: ${tableName}`);
    data.derived[tableName] = value;
    registeredTables.derived.add(tableName);
    return value;
  }
  function registerValidator(id, validate) {
    requireOpenRegistry();
    if (!validatorManifest.includes(id) || typeof validate !== "function") throw new Error(`検証規則が不正です: ${id}`);
    if (validators.has(id)) throw new Error(`検証規則が重複しています: ${id}`);
    validators.set(id, validate);
    return validate;
  }
  function validate() {
    return Array.from(validators, ([id, validator]) => {
      const result = validator(data);
      if (!Array.isArray(result)) return [`${id}: 検証結果が配列ではありません`];
      return result.map(message => `${id}: ${message}`);
    }).flat();
  }
  function deepFreeze(value, visited = new Set()) {
    if (!value || typeof value !== "object" || visited.has(value)) return value;
    visited.add(value);
    Object.values(value).forEach(child => deepFreeze(child, visited));
    return Object.freeze(value);
  }
  function missingTables() {
    return [
      ...tableManifest.entities.filter(name => !registeredTables.entities.has(name)).map(name => `entities.${name}`),
      ...tableManifest.entityLists.filter(name => !registeredTables.entityLists.has(name)).map(name => `entityLists.${name}`),
      ...tableManifest.configs.filter(name => !registeredTables.configs.has(name)).map(name => `configs.${name}`),
      ...tableManifest.relations.filter(name => !registeredTables.relations.has(name)).map(name => `relations.${name}`),
      ...tableManifest.relationLists.filter(name => !registeredTables.relationLists.has(name)).map(name => `relationLists.${name}`),
      ...tableManifest.derived.filter(name => !registeredTables.derived.has(name)).map(name => `derived.${name}`),
      ...validatorManifest.filter(name => !validators.has(name)).map(name => `validators.${name}`)
    ];
  }
  function finalize() {
    if (finalized) return data;
    const missing = missingTables();
    if (missing.length) throw new Error(`マスターデータが不足しています: ${missing.join(", ")}`);
    const errors = validate();
    if (errors.length) throw new Error(`マスターデータの参照が不正です: ${errors.join(" / ")}`);
    [...entityTables, ...entityListTables].forEach(tableName => deepFreeze(data[tableName]));
    deepFreeze(data.config);
    deepFreeze(data.relations);
    deepFreeze(data.derived);
    finalized = true;
    return data;
  }
  data.registry = Object.freeze({
    entities: registerEntities,
    entityList: registerEntityList,
    relations: registerRelations,
    relationList: registerRelationList,
    config: registerConfig,
    derived: registerDerived,
    validator: registerValidator,
    validate,
    finalize,
    missingTables,
    isFinalized: () => finalized
  });
})();
