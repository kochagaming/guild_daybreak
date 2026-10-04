(function () {
  "use strict";
  const MAX_BYTES = 2 * 1024 * 1024;
  const backupKey = `${window.SaveSystem.exportKey}_before_import`;
  function check(condition, message) { if (!condition) throw new Error(message || "セーブの内容が不正です。"); }
  const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const number = value => Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER;
  const integer = value => number(value) && Number.isInteger(value);
  const text = value => typeof value === "string" && value.length <= 10000;
  const known = (table, id) => typeof id === "string" && Object.prototype.hasOwnProperty.call(table || {}, id);
  const validRates = rates => object(rates) && ["attack", "technique", "spell", "healing"].every(key => integer(rates[key]) && rates[key] <= 100);
  function fieldSpecialtyCount(record, data) {
    if (!record) return 0;
    const routeThreshold = data.config.explorationEvents?.personalPractice?.successes || 5;
    const treasureThreshold = data.config.explorationEvents?.treasurePersonalPractice?.openings || 10;
    return Object.values(record.routeEventSuccesses || {}).filter(count => Number(count) >= routeThreshold).length
      + (Number(record.treasureOpenings || 0) >= treasureThreshold ? 1 : 0);
  }
  function milestoneProgress(record, milestone, data, state = null, characterId = null) {
    if (!record || !milestone) return 0;
    if (milestone.condition.type === "routeEventRecord") return Number(record.routeEventSuccesses?.[milestone.condition.routeEventId]) || 0;
    if (milestone.condition.type === "specialtyCount") return fieldSpecialtyCount(record, data);
    if (milestone.condition.type === "sharedSorties") return Object.entries(state?.adventurerBonds?.pairs || {}).reduce((maximum, [key, count]) => {
      const ids = key.split("::");
      return ids.includes(characterId) ? Math.max(maximum, Number(count) || 0) : maximum;
    }, 0);
    return Number(record[milestone.condition.field]) || 0;
  }
  const validPartySetup = (setup, data) => Array.isArray(setup) && setup.length <= 6 && setup.every((member, index) => object(member)
    && text(member.id) && text(member.name) && known(data.jobs, member.jobId) && integer(member.level) && member.level > 0 && member.position === index
    && validRates(member.actionRates) && integer(member.equipmentCount) && Array.isArray(member.equipmentNames) && member.equipmentNames.length <= 8
    && member.equipmentNames.length <= member.equipmentCount && member.equipmentNames.every(text) && number(member.equipmentWeight) && number(member.maximumWeight)
    && member.equipmentWeight <= member.maximumWeight);
  function validBondFormations(formations, data, characters = null) {
    if (!Array.isArray(formations) || formations.length > 3) return false;
    const occupiedPositions = [], occupiedMembers = [];
    const tiers = [...(data.config.explorationEvents?.adventurerBondBattleSupport || [])].sort((a, b) => b.minimumSharedSorties - a.minimumSharedSorties);
    const valid = formations.every(formation => {
      if (!object(formation) || !Array.isArray(formation.memberNames) || formation.memberNames.length !== 2 || !formation.memberNames.every(text)
        || !Array.isArray(formation.positions) || formation.positions.length !== 2 || !formation.positions.every(position => integer(position) && position < 6)
        || Math.abs(formation.positions[0] - formation.positions[1]) !== 1 || !integer(formation.sharedSorties)) return false;
      const tier = tiers.find(candidate => formation.sharedSorties >= candidate.minimumSharedSorties);
      if (!tier || formation.label !== tier.label) return false;
      occupiedPositions.push(...formation.positions);
      if (characters) {
        if (!Array.isArray(formation.memberIds) || formation.memberIds.length !== 2 || new Set(formation.memberIds).size !== 2
          || !formation.memberIds.every(id => text(id) && characters.has(id))) return false;
        occupiedMembers.push(...formation.memberIds);
      }
      return true;
    });
    return valid && new Set(occupiedPositions).size === occupiedPositions.length && (!characters || new Set(occupiedMembers).size === occupiedMembers.length);
  }
  function validBondTierProgress(entries, data, characters, bonds) {
    if (!Array.isArray(entries) || entries.length > 15) return false;
    const routeTiers = data.config.explorationEvents?.adventurerBondRouteSupport || [];
    const battleTiers = data.config.explorationEvents?.adventurerBondBattleSupport || [];
    const seen = new Set();
    return entries.every(entry => {
      if (!object(entry) || !Array.isArray(entry.memberIds) || entry.memberIds.length !== 2 || new Set(entry.memberIds).size !== 2
        || !entry.memberIds.every(id => text(id) && characters.has(id)) || !Array.isArray(entry.memberNames) || entry.memberNames.length !== 2 || !entry.memberNames.every(text)
        || !integer(entry.sharedSorties)) return false;
      const routeTier = entry.routeLabel == null ? null : routeTiers.find(tier => tier.label === entry.routeLabel);
      const battleTier = entry.battleLabel == null ? null : battleTiers.find(tier => tier.label === entry.battleLabel);
      if (!routeTier && !battleTier) return false;
      const thresholds = [routeTier?.minimumSharedSorties, battleTier?.minimumSharedSorties].filter(Number.isInteger);
      if (new Set(thresholds).size !== 1 || entry.sharedSorties !== thresholds[0]) return false;
      const key = [...entry.memberIds].sort().join("::"), identity = `${key}:${entry.sharedSorties}`;
      if (seen.has(identity) || (Number(bonds.pairs[key]) || 0) < entry.sharedSorties) return false;
      seen.add(identity);
      return true;
    });
  }
  function safeTree(value, depth) {
    check(depth < 32, "データの階層が深すぎます。");
    if (value && typeof value === "object") Object.entries(value).forEach(([key, child]) => {
      check(!["__proto__", "prototype", "constructor"].includes(key), "安全でないデータを含んでいます。");
      safeTree(child, depth + 1);
    });
  }
  function validate(state) {
    const data = window.GameData;
    check(object(state) && state.version === 11, "対応するセーブ形式はバージョン11です。");
    window.GameState.ensureStory(state);
    window.GameState.ensureCharacterSources(state);
    window.GameState.ensureFacilities(state);
    check(object(state.facilities) && state.facilities.version === 3, "施設データが不正です。");
    check(Object.keys(state.facilities).every(key => key === "version" || data.config.facilities.order.includes(key)), "未知の施設データが含まれています。");
    for (const id of data.config.facilities.order) {
      const facility = state.facilities[id];
      const definition = data.facilities[id];
      check(object(facility) && number(facility.startedAt) && number(facility.storedDuration) && integer(facility.gold)
        && object(facility.materials) && object(facility.bonusProgress) && object(facility.levels), "施設の蓄積データが不正です。");
      check(facility.activatedAt === null || number(facility.activatedAt), "施設の解放時刻が不正です。");
      data.config.facilities.trackOrder.forEach(trackId => check(integer(facility.levels[trackId]) && facility.levels[trackId] >= 1
        && facility.levels[trackId] <= definition.upgrades[trackId].length, "施設レベルが不正です。"));
      const capacity = definition.upgrades.storage[facility.levels.storage - 1].duration;
      const production = definition.upgrades.production[facility.levels.production - 1];
      const allowedMaterials = new Set(definition.upgrades.production.flatMap(entry => [
        ...Object.keys(entry.rewards?.materials || {}), ...(entry.periodicRewards || []).map(periodic => periodic.itemId), ...(entry.chanceRewards || []).map(bonus => bonus.itemId)
      ]));
      const periodicRules = new Map(definition.upgrades.production.flatMap(entry => entry.periodicRewards || []).map(periodic => [periodic.id, periodic]));
      check(facility.storedDuration <= capacity && facility.gold <= 1000000);
      check(Object.entries(facility.materials).every(([key, amount]) => allowedMaterials.has(key) && integer(amount) && amount <= 100000));
      check(Object.entries(facility.bonusProgress).every(([key, amount]) => periodicRules.has(key) && integer(amount)
        && amount < ((production.periodicRewards || []).find(periodic => periodic.id === key)?.everyCycles || periodicRules.get(key).everyCycles)));
    }
    check(object(state.presets) && state.presets.version === 1 && Array.isArray(state.presets.slots) && state.presets.slots.length === 6, "プリセットの保存枠が不正です。");
    state.presets.slots.forEach(preset => {
      if (preset === null) return;
      check(object(preset) && text(preset.name) && preset.name.trim().length > 0 && preset.name.length <= 24 && number(preset.savedAt));
      check(Array.isArray(preset.members) && preset.members.length >= 1 && preset.members.length <= 6 && new Set(preset.members.map(entry => entry.characterId)).size === preset.members.length);
      const equipped = new Set();
      preset.members.forEach(entry => {
        check(object(entry) && /^adventurer-[1-9]\d*$/.test(entry.characterId) && validRates(entry.actionRates) && Array.isArray(entry.equipment));
        entry.equipment.forEach(id => { check(typeof id === "string" && /^item-[1-9]\d*$/.test(id) && !equipped.has(id)); equipped.add(id); });
      });
    });
    const story = state.story;
    const chapterDefinitions = data.storyChapters || [{ id: "prologue", entryRequirements: [{ type: "characters", minimum: 1 }, { type: "departure" }] }, { id: "roadside" }, { id: "seal" }, { id: "starfall" }];
    const chapterIds = chapterDefinitions.map(chapter => chapter.id);
    const requirementSatisfied = requirement => {
      if (requirement.type === "characters") return state.characters.length >= requirement.minimum;
      if (requirement.type === "departure") return story.facts.departed;
      if (requirement.type === "dungeonClear") return story.facts.clears.includes(requirement.dungeonId);
      if (requirement.type === "chapterCompleted") return story.completed.includes(requirement.chapterId);
      if (requirement.type === "itemOwned") return (state.inventory?.materials?.[requirement.itemId] || 0) + (state.inventory?.equipment || []).filter(item => item.templateId === requirement.itemId).length >= (requirement.quantity || 1);
      return false;
    };
    const requirementsMet = requirements => (requirements || []).every(requirementSatisfied);
    const chapterSatisfied = chapter => requirementsMet(chapter.entryRequirements) && Object.values(data.dungeons).filter(dungeon => dungeon.chapterId === chapter.id && dungeon.requiredForStory).every(dungeon => story.facts.clears.includes(dungeon.id));
    const dungeonUnlocked = dungeon => {
      const openingId = data.relations?.dungeonStoryLinks?.[dungeon.baseDungeonId || dungeon.id]?.openingStoryId;
      return requirementsMet(dungeon.unlockRequirements) && (dungeon.id === "meadow" || dungeon.requiredForStory === false || !openingId || story.readSceneIds.includes(openingId));
    };
    check(object(story) && story.version === 1 && Array.isArray(story.completed) && story.completed.length <= chapterIds.length && story.completed.every((id, index) => id === chapterIds[index]), "物語の進行データが不正です。");
    check(Array.isArray(story.readSceneIds) && new Set(story.readSceneIds).size === story.readSceneIds.length && story.readSceneIds.every(id => known(data.storyScenes, id)), "物語の読了記録が不正です。");
    check(Array.isArray(story.joinedCompanionIds) && new Set(story.joinedCompanionIds).size === story.joinedCompanionIds.length
      && story.joinedCompanionIds.every(id => known(data.companions, id)), "物語加入者の記録が不正です。");
    check(story.joinedCompanionIds.length <= (data.config?.companions?.rosterLimit ?? Number.MAX_SAFE_INTEGER), "物語加入者の上限を超えています。");
    check(object(story.companionStages) && Object.entries(story.companionStages).every(([companionId, stageId]) => story.joinedCompanionIds.includes(companionId) && data.relations?.companionProgressions?.[companionId]?.stages?.[stageId]), "物語加入者の成長段階が不正です。");
    check(story.joinedCompanionIds.every(companionId => typeof story.companionStages[companionId] === "string"), "物語加入者の成長段階が不足しています。");
    check(object(story.facts) && typeof story.facts.departed === "boolean" && Array.isArray(story.facts.clears) && new Set(story.facts.clears).size === story.facts.clears.length && story.facts.clears.every(id => known(data.dungeons, id)));
    if (story.facts.discoveries != null) check(Array.isArray(story.facts.discoveries) && new Set(story.facts.discoveries).size === story.facts.discoveries.length && story.facts.discoveries.every(id => known(data.dungeons, id)));
    if (story.facts.companionMoments != null) {
      const momentMap = new Map((data.config.explorationEvents?.companionMoments || []).map(moment => [moment.id, moment]));
      check(Array.isArray(story.facts.companionMoments) && new Set(story.facts.companionMoments).size === story.facts.companionMoments.length && story.facts.companionMoments.every(key => {
        const split = typeof key === "string" ? key.lastIndexOf(":") : -1;
        const moment = split > 0 ? momentMap.get(key.slice(0, split)) : null, lineIndex = split > 0 ? Number(key.slice(split + 1)) : NaN;
        return Boolean(moment && Number.isInteger(lineIndex) && lineIndex >= 0 && lineIndex < moment.lines.length);
      }), "人物の旅の記憶が不正です。");
    }
    if (story.facts.routeEvents != null) {
      const routeEventIds = new Set((data.config.explorationEvents?.routeEvents || []).map(event => event.id));
      check(object(story.facts.routeEvents) && Object.entries(story.facts.routeEvents).every(([id, record]) => routeEventIds.has(id)
        && object(record) && integer(record.encounters) && record.encounters > 0 && integer(record.successes) && record.successes <= record.encounters
        && integer(record.rumorMatches) && record.rumorMatches <= record.encounters), "道中の観察記録が不正です。");
    }
    if (story.facts.treasureTiers != null) {
      const treasureTierIds = new Set((data.config.explorationEvents?.treasure?.types || [{ id: "weathered" }]).map(tier => tier.id));
      check(object(story.facts.treasureTiers) && Object.entries(story.facts.treasureTiers).every(([id, record]) => treasureTierIds.has(id)
        && object(record) && integer(record.encounters) && record.encounters > 0 && integer(record.openings) && record.openings >= 0 && record.openings <= record.encounters), "宝箱の観察記録が不正です。");
    }
    check(integer(story.facts.teamSurveys), "連携探索の記録が不正です。");
    if (story.facts.difficultyClears != null) check(Array.isArray(story.facts.difficultyClears) && new Set(story.facts.difficultyClears).size === story.facts.difficultyClears.length && story.facts.difficultyClears.every(key => {
      const [dungeonId, difficultyId] = String(key).split(":");
      return known(data.dungeons, dungeonId) && ["abyss", "divine"].includes(difficultyId);
    }), "高難易度の攻略記録が不正です。");
    check(story.completed.every(id => chapterSatisfied(chapterDefinitions.find(chapter => chapter.id === id))), "物語の達成条件と進行状況が一致しません。");
    const commissions = state.commissions, quests = data.commissions || [];
    check(object(commissions) && commissions.version === 1 && object(commissions.progress) && Array.isArray(commissions.claimed), "依頼の進行データが不正です。");
    check(Object.entries(commissions.progress).every(([id, amount]) => { const quest = quests.find(quest => quest.id === id); return quest && integer(amount) && amount <= quest.target; }), "依頼の討伐数・攻略数が不正です。");
    check(new Set(commissions.claimed).size === commissions.claimed.length && commissions.claimed.every(id => { const quest = quests.find(quest => quest.id === id); return quest && commissions.progress[id] === quest.target; }), "依頼の受け取り状況が不正です。");
    const recurring = state.recurringMissions, recurringDefinitions = data.config.recurringMissions?.groups;
    check(object(recurring) && recurring.version === 1 && object(recurring.groups), "定期依頼の進行データが不正です。");
    if (Array.isArray(recurringDefinitions)) {
      check(Object.keys(recurring.groups).every(id => recurringDefinitions.some(group => group.id === id)), "未知の定期依頼区分が含まれています。");
      recurringDefinitions.forEach(group => {
        const current = recurring.groups[group.id], missionIds = new Set(group.missions.map(entry => entry.id));
        // 新しい定期依頼区分は次回同期で生成する。既存区分の内容は厳密に検証する。
        if (current == null) return;
        check(object(current) && /^\d{4}-\d{2}-\d{2}$/.test(current.periodKey) && Array.isArray(current.selectedIds) && object(current.progress) && Array.isArray(current.claimed), "定期依頼の期間データが不正です。");
        check(current.selectedIds.length === Math.min(group.selection.count, group.missions.length) && new Set(current.selectedIds).size === current.selectedIds.length && current.selectedIds.every(id => missionIds.has(id)), "定期依頼の抽選結果が不正です。");
        check(Object.entries(current.progress).every(([id, amount]) => { const entry = group.missions.find(candidate => candidate.id === id); return current.selectedIds.includes(id) && entry && integer(amount) && amount <= entry.target; }), "定期依頼の達成数が不正です。");
        check(new Set(current.claimed).size === current.claimed.length && current.claimed.every(id => { const entry = group.missions.find(candidate => candidate.id === id); return current.selectedIds.includes(id) && entry && current.progress[id] === entry.target; }), "定期依頼の受け取り状況が不正です。");
      });
    } else check(Object.values(recurring.groups).every(current => object(current) && Array.isArray(current.selectedIds) && object(current.progress) && Array.isArray(current.claimed)), "定期依頼の進行データが不正です。");
    const encyclopedia = state.encyclopedia;
    check(object(encyclopedia) && encyclopedia.version === 9 && object(encyclopedia.items) && object(encyclopedia.bestQualities) && Array.isArray(encyclopedia.ultraRareTitles) && object(encyclopedia.monsters) && Array.isArray(encyclopedia.unreadItems) && Array.isArray(encyclopedia.unreadUltraRareTitles) && Array.isArray(encyclopedia.unreadMonsters), "図鑑データが不正です。");
    check(Object.entries(encyclopedia.items).every(([id, count]) => known(data.items, id) && integer(count) && count > 0), "アイテム図鑑が不正です。");
    check(Object.entries(encyclopedia.bestQualities).every(([id, qualityId]) => known(data.items, id) && ["weapon", "armor"].includes(data.items[id].type) && known(data.qualities, qualityId) && encyclopedia.items[id] > 0), "アイテム図鑑の最高品質記録が不正です。");
    check(new Set(encyclopedia.ultraRareTitles).size === encyclopedia.ultraRareTitles.length && encyclopedia.ultraRareTitles.every(id => known(data.ultraRareTitles, id)), "超レア称号の発見記録が不正です。");
    check(new Set(encyclopedia.unreadUltraRareTitles).size === encyclopedia.unreadUltraRareTitles.length && encyclopedia.unreadUltraRareTitles.every(id => encyclopedia.ultraRareTitles.includes(id)), "超レア称号の新着情報が不正です。");
    check(new Set(encyclopedia.unreadItems).size === encyclopedia.unreadItems.length && encyclopedia.unreadItems.every(id => known(data.items, id) && encyclopedia.items[id] > 0), "アイテム図鑑の新着情報が不正です。");
    const targetKnown = itemId => encyclopedia.items[itemId] > 0 || data.recipes.some(recipe => recipe.materials?.[itemId] && (!recipe.unlockAfter || story.completed.includes(recipe.unlockAfter) || story.facts.clears.includes(recipe.unlockAfter)));
    check(encyclopedia.itemTarget === null || (object(encyclopedia.itemTarget) && known(data.items, encyclopedia.itemTarget.itemId) && targetKnown(encyclopedia.itemTarget.itemId) && integer(encyclopedia.itemTarget.quantity) && encyclopedia.itemTarget.quantity >= 1 && encyclopedia.itemTarget.quantity <= 999 && integer(encyclopedia.itemTarget.progress) && encyclopedia.itemTarget.progress >= 0), "探索目標の記録が不正です。");
    check(new Set(encyclopedia.unreadMonsters).size === encyclopedia.unreadMonsters.length && encyclopedia.unreadMonsters.every(id => known(data.monsters, id) && encyclopedia.monsters[id]), "モンスター図鑑の新着情報が不正です。");
    check(Object.entries(encyclopedia.monsters).every(([id, entry]) => {
      if (!known(data.monsters, id) || !object(entry) || !integer(entry.encountered) || entry.encountered <= 0 || !integer(entry.defeated) || entry.defeated > entry.encountered || !object(entry.observations)) return false;
      const observed = entry.observations;
      if (!["incomingAttempts", "incomingHits", "enemyTurns", "maxAttackCount"].every(key => integer(observed[key])) || observed.incomingHits > observed.incomingAttempts || typeof observed.magicAttack !== "boolean" || typeof observed.rearTargeting !== "boolean") return false;
      if (!["attackElements", "statusAttacks", "elementWeaknesses", "elementResistances", "statusResisted", "statusLanded", "burstRounds", "difficultySkillIds", "drops"].every(key => Array.isArray(observed[key]) && new Set(observed[key]).size === observed[key].length)) return false;
      if (!observed.difficultySkillIds.every(id => known(data.monsterSkills, id))) return false;
      if (!object(entry.difficulties)) return false;
      return Object.entries(entry.difficulties).every(([difficultyId, difficulty]) => ["normal", "abyss", "divine"].includes(difficultyId) && object(difficulty)
        && integer(difficulty.encountered) && difficulty.encountered > 0 && integer(difficulty.defeated) && difficulty.defeated <= difficulty.encountered
        && Array.isArray(difficulty.drops) && new Set(difficulty.drops).size === difficulty.drops.length && difficulty.drops.every(id => known(data.items, id))
        && Array.isArray(difficulty.skillIds) && new Set(difficulty.skillIds).size === difficulty.skillIds.length && difficulty.skillIds.every(id => known(data.monsterSkills, id)));
    }), "モンスター図鑑が不正です。");
    const observationJournal = state.observationJournal;
    const observationIds = new Set((data.observationNotes || []).map(entry => entry.id));
    check(object(observationJournal) && observationJournal.version === 1 && Array.isArray(observationJournal.readIds)
      && new Set(observationJournal.readIds).size === observationJournal.readIds.length
      && observationJournal.readIds.every(id => observationIds.has(id)), "観察日記の既読情報が不正です。");
    const dailyShop = state.dailyShop, dailyOfferCount = data.config.shop?.daily?.offerCount || 10;
    check(object(dailyShop) && dailyShop.version === 1 && Array.isArray(dailyShop.offers), "日替わり商店のデータが不正です。");
    check(dailyShop.dateKey === null || typeof dailyShop.dateKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dailyShop.dateKey), "日替わり商店の日付が不正です。");
    check(dailyShop.dateKey === null ? dailyShop.offers.length === 0 : dailyShop.offers.length === dailyOfferCount, "日替わり商品の販売数が不正です。");
    dailyShop.offers.forEach((offer, index) => {
      check(object(offer) && offer.id === `daily-${dailyShop.dateKey}-${index + 1}` && typeof offer.purchased === "boolean", "日替わり商品の識別情報が不正です。");
      check(known(data.items, offer.templateId) && ["weapon", "armor"].includes(data.items[offer.templateId].type)
        && integer(encyclopedia.items[offer.templateId]) && encyclopedia.items[offer.templateId] > 0, "未入手の装備が日替わり商品に含まれています。");
      check(known(data.qualities, offer.qualityId) && offer.ultraRareTitleId === null && offer.upgradeLevel === 0 && offer.source === "daily_shop", "日替わり商品の性能情報が不正です。");
      check(object(offer.modifiers) && ["hp", "attack", "defense"].every(key => integer(offer.modifiers[key])), "日替わり商品の追加性能が不正です。");
      ["magicAttack", "magicDefense", "magicHealing", "speed"].forEach(key => check(offer.modifiers[key] == null || integer(offer.modifiers[key])));
      ["hitRate", "evasionRate"].forEach(key => check(offer.modifiers[key] == null || integer(offer.modifiers[key]) && offer.modifiers[key] <= 100));
      check(offer.modifiers.attackCount == null || integer(offer.modifiers.attackCount) && offer.modifiers.attackCount <= 3, "日替わり商品の攻撃回数が不正です。");
      check(integer(offer.price) && offer.price > 0, "日替わり商品の価格が不正です。");
    });
    const autoSell = state.autoSell;
    check(object(autoSell) && autoSell.version === 2 && typeof autoSell.enabled === "boolean" && integer(autoSell.nextId) && autoSell.nextId > 0 && Array.isArray(autoSell.rules), "自動売却設定が不正です。");
    const autoSellIds = new Set();
    autoSell.rules.forEach(rule => {
      check(object(rule) && typeof rule.id === "string" && /^auto-sell-[1-9]\d*$/.test(rule.id) && !autoSellIds.has(rule.id), "自動売却ルールのIDが不正です。");
      autoSellIds.add(rule.id);
      check(Number(rule.id.split("-").pop()) < autoSell.nextId && window.AutoSell.validRule(rule), "自動売却ルールの条件が不正です。");
    });
    check(integer(state.gold) && Array.isArray(state.characters) && state.characters.length <= 10000);
    check(object(state.inventory) && Array.isArray(state.inventory.equipment) && state.inventory.equipment.length <= 10000 && object(state.inventory.materials));
    const characters = new Map(), equipment = new Map(), used = new Set(), companionCharacters = new Set();
    state.inventory.equipment.forEach(item => {
      check(object(item) && typeof item.locked === "boolean", "装備のロック設定が不正です。");
      const maximum = (data.config.upgrades?.limits || []).reduce((amount, entry) => story.completed.includes(entry.chapterId) ? Math.max(amount, entry.maximum) : amount, 0);
      check(integer(item.upgradeLevel) && item.upgradeLevel <= maximum, "装備の強化段階または物語上限が不正です。");
      check(object(item) && /^item-[1-9]\d*$/.test(item.id) && !equipment.has(item.id));
      check(known(data.items, item.templateId) && data.items[item.templateId].type !== "material" && known(data.qualities, item.qualityId));
      check(object(item.modifiers) && ["hp", "attack", "defense"].every(key => integer(item.modifiers[key])) && number(item.acquiredAt));
      check(item.ultraRareTitleId === null || known(data.ultraRareTitles, item.ultraRareTitleId), "超レア称号が不正です。");
      check(!Object.prototype.hasOwnProperty.call(item, "equipmentSkills"), "装備個体に旧式のスキル情報が残っています。");
      ["magicAttack", "magicDefense", "magicHealing"].forEach(key => check(item.modifiers[key] == null || integer(item.modifiers[key])));
      ["hitRate", "evasionRate"].forEach(key => check(item.modifiers[key] == null || integer(item.modifiers[key]) && item.modifiers[key] <= 100, "追加性能の命中・回避が不正です。"));
      check(item.modifiers.speed == null || integer(item.modifiers.speed), "追加性能の速度が不正です。");
      check(item.modifiers.attackCount == null || integer(item.modifiers.attackCount) && item.modifiers.attackCount <= 3, "追加性能の攻撃回数が不正です。");
      equipment.set(item.id, item);
    });
    Object.entries(state.inventory.materials).forEach(([id, amount]) => check(known(data.items, id) && data.items[id].type === "material" && integer(amount)));
    state.characters.forEach(character => {
      check(object(character) && /^adventurer-[1-9]\d*$/.test(character.id) && !characters.has(character.id));
      check(text(character.name) && character.name.trim().length > 0 && character.name.length <= 16 && integer(character.level) && character.level >= 1 && character.level <= 100000 && integer(character.exp) && character.exp < window.Characters.expToNext(character.level));
      check(object(character.source) && ["recruitment", "companion"].includes(character.source.type), "冒険者の加入経路が不正です。");
      if (character.source.type === "companion") {
        const companion = data.companions?.[character.source.companionId];
        check(companion && !companionCharacters.has(companion.id) && story.joinedCompanionIds.includes(companion.id), "物語加入者の参照または重複が不正です。");
        check(!Object.prototype.hasOwnProperty.call(character, "base"), "物語加入者にマスター能力が重複保存されています。");
        companionCharacters.add(companion.id);
      } else {
        check(object(character.base) && ["hp", "attack", "defense"].every(key => integer(character.base[key])) && character.base.hp > 0, "冒険者の基礎能力が不正です。");
        ["magicAttack", "magicDefense", "magicHealing"].forEach(key => check(character.base[key] == null || integer(character.base[key])));
        check(character.source.recruitmentId == null || character.source.recruitmentId === character.recruitmentId, "募集記録の参照が不正です。");
      }
      check(Array.isArray(character.equipment));
      check(known(data.jobs, character.jobId) && known(data.races, character.raceId) && known(data.births, character.birthId));
      check(character.gender == null || ["male", "female"].includes(character.gender), "冒険者の性別情報が不正です。");
      check(character.nameCulture == null || Object.prototype.hasOwnProperty.call(data.config.recruitment?.nameCultures || {}, character.nameCulture), "冒険者の名前系統が不正です。");
      check(character.career === null || object(character.career) && known(data.jobs, character.career.previousJobId) && Array.isArray(character.career.retainedSkillIds) && new Set(character.career.retainedSkillIds).size === character.career.retainedSkillIds.length && character.career.retainedSkillIds.every(id => known(data.skills, id)) && typeof character.career.master === "boolean" && integer(character.career.levelBefore) && character.career.levelBefore >= 1 && number(character.career.changedAt), "転職履歴が不正です。");
      if (character.career) {
        const allowedFormerSkills = new Set((data.relations.skillGrants.job[character.career.previousJobId] || []).filter(entry => entry.initial).map(entry => entry.skillId));
        check(character.career.retainedSkillIds.length === allowedFormerSkills.size && character.career.retainedSkillIds.every(id => allowedFormerSkills.has(id)), "前職から引き継いだスキルが不正です。");
      }
      if (character.career?.master) check(character.career.previousJobId === character.jobId && character.career.levelBefore >= 50, "マスター職の履歴が不正です。");
      if (character.expeditionRecord != null) {
        const record = character.expeditionRecord;
        const countKeys = ["sorties", "victories", "retreats", "encounterClears", "routeSuccesses", "treasureOpenings", "teamSurveys", "damageDealt", "healingDone", "damageTaken", "criticalHits", "knockouts", "bestDamage", "bestHealing", "bestEndurance"];
        check(object(record) && countKeys.every(key => integer(record[key])) && record.sorties === record.victories + record.retreats
          && record.knockouts <= record.sorties
          && object(record.routeEventSuccesses) && Object.entries(record.routeEventSuccesses).every(([id, count]) => (data.config.explorationEvents?.routeEvents || []).some(event => event.id === id) && integer(count) && count > 0)
          && Object.values(record.routeEventSuccesses).reduce((sum, count) => sum + count, 0) <= record.routeSuccesses
          && (record.lastAt === null && record.sorties === 0 || number(record.lastAt) && record.sorties > 0), "冒険者の遠征記録が不正です。");
      }
      if (character.recordTitleId != null) {
        const milestone = (data.adventurerMilestones || []).find(entry => entry.id === character.recordTitleId);
        const progress = milestoneProgress(character.expeditionRecord, milestone, data, state, character.id);
        check(Boolean(milestone && Number(progress || 0) >= milestone.condition.minimum), "冒険者の表示記章が不正です。");
      }
      check(validRates(character.actionRates), "行動率の設定が不正です。");
      check(known(data.portraits, character.portraitId));
      let weight = 0;
      character.equipment.forEach(id => {
        check(equipment.has(id) && !used.has(id), "装備の参照・重複が不正です。");
        used.add(id);
        weight += window.Items.effects(equipment.get(id)).weight;
      });
      check(weight <= window.Characters.maxWeight(character) + .001, "装備が重量超過です。");
      characters.set(character.id, character);
    });
    const bonds = state.adventurerBonds;
    check(object(bonds) && bonds.version === 1 && object(bonds.pairs) && object(bonds.memories) && Object.entries(bonds.pairs).every(([key, count]) => {
      const ids = key.split("::");
      return ids.length === 2 && ids[0] < ids[1] && characters.has(ids[0]) && characters.has(ids[1]) && integer(count) && count > 0;
    }) && Object.entries(bonds.memories).every(([key, momentIds]) => {
      const count = bonds.pairs[key], definitions = new Map((data.config.explorationEvents?.adventurerBondMoments || []).map(moment => [moment.id, moment]));
      return integer(count) && Array.isArray(momentIds) && momentIds.length > 0 && new Set(momentIds).size === momentIds.length
        && momentIds.every(id => definitions.has(id) && count >= definitions.get(id).minimumSharedSorties);
    }), "冒険者の同行記録が不正です。");
    const recruitment = state.recruitment;
    const talents = data.recruitmentTalents || { hardy: true, striker: true, steady: true };
    const talentIds = Object.keys(talents);
    const optionUnlocked = (table, id) => known(table, id) && (!table[id].unlockAfter || story.completed.includes(table[id].unlockAfter));
    check(object(recruitment) && recruitment.version === 2 && integer(recruitment.nextId) && recruitment.nextId > 0, "募集データが不正です。");
    state.characters.forEach(character => {
      check(character.talentId == null || talentIds.includes(character.talentId));
      if (character.recruitmentId != null) {
        check(typeof character.recruitmentId === "string" && /^recruitment-[1-9]\d*$/.test(character.recruitmentId));
        check(Number(character.recruitmentId.split("-")[1]) < recruitment.nextId);
      }
    });
    if (recruitment.pending !== null) {
      const pending = recruitment.pending;
      check(object(pending) && typeof pending.id === "string" && /^recruitment-[1-9]\d*$/.test(pending.id) && number(pending.createdAt) && integer(pending.seed) && pending.seed > 0 && pending.seed < 2147483647);
      const batch = Number(pending.id.split("-")[1]);
      check(batch < recruitment.nextId && !state.characters.some(character => character.recruitmentId === pending.id), "雇用済みの募集が残っています。");
      const definitions = data.config.recruitment?.fields || [{ id: "jobId", table: "jobs", unlockAfter: null }, { id: "raceId", table: "races", unlockAfter: "roadside" }, { id: "birthId", table: "births", unlockAfter: "seal" }, { id: "focus", table: "recruitmentTalents", unlockAfter: "starfall" }];
      check(object(pending.requirements) && Object.keys(pending.requirements).length === definitions.length);
      const fields = definitions.map(field => [field.id, field.table === "recruitmentTalents" ? talents : data[field.table], field.unlockAfter]);
      fields.forEach(([key, table, unlockAfter]) => check(pending.requirements[key] === "any" || (optionUnlocked(table, pending.requirements[key]) && (!unlockAfter || story.completed.includes(unlockAfter))), "募集条件が未解放または不正です。"));
      check(Array.isArray(pending.candidates) && pending.candidates.length >= 1 && pending.candidates.length <= 5);
      pending.candidates.forEach((candidate, index) => {
        check(object(candidate) && candidate.id === `applicant-${batch}-${index + 1}` && text(candidate.name) && candidate.name.trim().length > 0 && candidate.name.length <= 16);
        check(["male", "female"].includes(candidate.gender) && Object.prototype.hasOwnProperty.call(data.config.recruitment.names[candidate.gender], candidate.nameCulture), "応募者の名前情報が不正です。");
        check(data.config.recruitment.names[candidate.gender][candidate.nameCulture].includes(candidate.name), "応募者名が名前候補と一致しません。");
        check(optionUnlocked(data.jobs, candidate.jobId) && optionUnlocked(data.races, candidate.raceId) && optionUnlocked(data.births, candidate.birthId) && known(data.portraits, candidate.portraitId) && talentIds.includes(candidate.talentId));
        check(object(candidate.base) && integer(candidate.base.hp) && candidate.base.hp >= 45 && candidate.base.hp <= 60 && integer(candidate.base.attack) && candidate.base.attack >= 8 && candidate.base.attack <= 13 && integer(candidate.base.defense) && candidate.base.defense >= 6 && candidate.base.defense <= 11);
        ["magicAttack", "magicDefense", "magicHealing"].forEach(key => check(candidate.base[key] == null || integer(candidate.base[key])));
      });
      check(pending.requirements.jobId === "any" || pending.candidates.some(candidate => candidate.jobId === pending.requirements.jobId), "希望職業の応募者が不足しています。");
    }
    const accessCodes = state.accessCodes, codeDefinitions = data.accessCodes || {};
    check(object(accessCodes) && accessCodes.version === 1 && Array.isArray(accessCodes.redeemedIds), "コード解放データが不正です。");
    check(new Set(accessCodes.redeemedIds).size === accessCodes.redeemedIds.length && accessCodes.redeemedIds.every(id => known(codeDefinitions, id)), "未知または重複したコード特典が含まれています。");
    const partySlotBonus = accessCodes.redeemedIds.flatMap(id => codeDefinitions[id].effects || []).filter(effect => effect.type === "partySlotRight").reduce((total, effect) => total + effect.amount, 0);
    const capacity = window.Party ? window.Party.memberLimit(story.completed) : (story.completed.includes("starfall") ? 6 : story.completed.includes("seal") ? 5 : story.completed.includes("roadside") ? 4 : 3);
    const party = ids => Array.isArray(ids) && ids.length <= capacity && new Set(ids).size === ids.length && ids.every(id => characters.has(id));
    const slotRules = data.config.partyProgression?.partySlots || {
      initial: 1,
      maximum: Math.max(1, state.parties?.length || 1),
      unlocks: Array.from({ length: Math.max(0, (state.parties?.length || 1) - 1) }, (_, index) => ({ slot: index + 2, chapterNumber: index + 1 }))
    };
    const storyAvailableParties = slotRules.unlocks.filter(entry => !entry.codeOnly).reduce((count, entry) => {
      const chapter = chapterDefinitions.find(candidate => candidate.number === entry.chapterNumber || candidate.order === entry.chapterNumber);
      return chapter && story.completed.includes(chapter.id) ? Math.max(count, entry.slot) : count;
    }, slotRules.initial);
    const availableParties = Math.min(slotRules.maximum, storyAvailableParties + partySlotBonus);
    check(integer(state.unlockedPartyCount) && state.unlockedPartyCount >= slotRules.initial && state.unlockedPartyCount <= availableParties, "パーティの増設状況が不正です。");
    check(Array.isArray(state.parties) && state.parties.length >= state.unlockedPartyCount && state.parties.length <= slotRules.maximum && state.parties.every(party), "パーティ編成が不正です。");
    check(new Set(state.parties.flat()).size === state.parties.flat().length, "パーティ間で冒険者が重複しています。");
    check(state.parties.slice(state.unlockedPartyCount).every(ids => ids.length === 0), "未増設のパーティに冒険者がいます。");
    check(integer(state.activeParty) && state.activeParty < state.unlockedPartyCount, "未増設のパーティが選択されています。");
    check(Array.isArray(state.expeditions) && state.expeditions.length === state.parties.length && state.expeditions.slice(state.unlockedPartyCount).every(entry => entry === null), "探索枠が不正です。");
    check(Array.isArray(state.partyResults) && state.partyResults.length === state.parties.length);
    if (state.partyHistory != null) {
      check(Array.isArray(state.partyHistory) && state.partyHistory.length === state.parties.length, "探索履歴のパーティ数が不正です。");
      state.partyHistory.forEach((history, partyIndex) => {
        check(Array.isArray(history) && history.length <= 10, "探索履歴の件数が不正です。");
        history.forEach(entry => {
          check(object(entry) && text(entry.id) && number(entry.completedAt) && known(data.dungeons, entry.dungeonId) && ["normal", "abyss", "divine"].includes(entry.difficultyId) && typeof entry.success === "boolean" && integer(entry.gold) && integer(entry.exp));
          if (entry.timeMultiplier != null) check(integer(entry.timeMultiplier) && entry.timeMultiplier >= 1 && entry.timeMultiplier <= 6, "探索履歴の時間倍率が不正です。");
          if (entry.battle != null) {
            const battleKeys = ["encountersCleared", "totalEncounters", "monstersDefeated", "damageDealt", "damageTaken", "healingDone", "attackHits", "attackAttempts", "knockouts"];
            check(object(entry.battle) && battleKeys.every(key => integer(entry.battle[key]))
              && entry.battle.encountersCleared <= entry.battle.totalEncounters
              && entry.battle.attackHits <= entry.battle.attackAttempts, "探索履歴の戦績が不正です。");
          }
          if (entry.partySetup != null) check(validPartySetup(entry.partySetup, data), "探索履歴の編成記録が不正です。");
          if (entry.storyMoments != null) check(Array.isArray(entry.storyMoments) && entry.storyMoments.every(moment => object(moment)
            && ["opening", "discovery", "ending"].includes(moment.kind) && known(data.dungeons, moment.dungeonId) && known(data.storyScenes, moment.sceneId)), "探索履歴の物語記録が不正です。");
          if (entry.routeEvents != null) {
            const routeEvents = data.config.explorationEvents?.routeEvents || [];
            check(Array.isArray(entry.routeEvents) && entry.routeEvents.length <= routeEvents.length && new Set(entry.routeEvents.map(event => event.id)).size === entry.routeEvents.length && entry.routeEvents.every(event => {
              const definition = object(event) ? routeEvents.find(candidate => candidate.id === event.id) : null;
              const bondNames = event.bondSupportMemberNames || [];
              const bondLabels = new Set((data.config.explorationEvents?.adventurerBondRouteSupport || []).map(tier => tier.label));
              return Boolean(definition && event.kind === definition.kind && typeof event.success === "boolean" && typeof event.masteryApplied === "boolean" && (event.personalPracticeApplied == null || typeof event.personalPracticeApplied === "boolean") && (event.teamSurveyApplied == null || typeof event.teamSurveyApplied === "boolean") && Array.isArray(event.teamSurveyMemberNames || []) && (event.teamSurveyMemberNames || []).length <= 6 && (event.teamSurveyMemberNames || []).every(text) && (event.bondSupportApplied == null || typeof event.bondSupportApplied === "boolean") && Array.isArray(bondNames) && (!event.bondSupportApplied || bondNames.length === 2 && bondNames.every(text) && bondLabels.has(event.bondSupportLabel)) && typeof event.rumorMatched === "boolean" && text(event.text));
            }), "探索履歴の道中記録が不正です。");
          }
          if (entry.adventurerBondMoments != null) {
            const momentMap = new Map((data.config.explorationEvents?.adventurerBondMoments || []).map(moment => [moment.id, moment]));
            check(Array.isArray(entry.adventurerBondMoments) && entry.adventurerBondMoments.length <= 1 && entry.adventurerBondMoments.every(moment => {
              const definition = object(moment) ? momentMap.get(moment.id) : null;
              return Boolean(definition && Array.isArray(moment.memberNames) && moment.memberNames.length === 2 && moment.memberNames.every(text)
                && integer(moment.sharedSorties) && moment.sharedSorties >= definition.minimumSharedSorties && text(moment.text));
            }), "探索履歴の旅仲間記録が不正です。");
          }
          if (entry.newAdventurerBondTiers != null) check(validBondTierProgress(entry.newAdventurerBondTiers, data, characters, bonds), "探索履歴の旅仲間成長が不正です。");
          if (entry.bondFormations != null) check(validBondFormations(entry.bondFormations, data), "探索履歴の戦列連携が不正です。");
          if (entry.routeMasteryIds != null) {
            const routeEventIds = new Set((data.config.explorationEvents?.routeEvents || []).map(event => event.id));
            const required = data.config.explorationEvents?.routeMastery?.successes || 3;
            check(Array.isArray(entry.routeMasteryIds) && new Set(entry.routeMasteryIds).size === entry.routeMasteryIds.length && entry.routeMasteryIds.every(id => routeEventIds.has(id) && (story.facts.routeEvents?.[id]?.successes || 0) >= required), "探索履歴の道中知見が不正です。");
          }
          if (entry.memberHighlights != null) check(Array.isArray(entry.memberHighlights) && entry.memberHighlights.length <= 4
            && new Set(entry.memberHighlights.map(highlight => highlight.kind)).size === entry.memberHighlights.length
            && entry.memberHighlights.every(highlight => object(highlight) && ["exploration", "damage", "healing", "endurance"].includes(highlight.kind)
              && text(highlight.memberId) && text(highlight.name) && integer(highlight.value) && highlight.value > 0
              && (highlight.kind !== "exploration" || integer(highlight.routeSuccesses) && integer(highlight.chestsOpened) && highlight.routeSuccesses + highlight.chestsOpened === highlight.value)
              && (highlight.kind !== "endurance" || integer(highlight.remainingHp) && integer(highlight.maxHp) && highlight.remainingHp > 0 && highlight.remainingHp <= highlight.maxHp)), "探索履歴の冒険者活躍記録が不正です。");
          if (entry.growth != null) check(Array.isArray(entry.growth) && entry.growth.every(growth => object(growth) && text(growth.name) && integer(growth.level) && growth.level >= 1
            && Array.isArray(growth.newSkillIds) && new Set(growth.newSkillIds).size === growth.newSkillIds.length && growth.newSkillIds.every(id => known(data.skills, id))
            && (growth.statChanges == null || object(growth.statChanges) && Object.entries(growth.statChanges).every(([key, value]) => ["hp", "attack", "defense", "magicAttack", "magicDefense", "magicHealing", "speed", "maxWeight"].includes(key) && number(value) && value > 0))), "探索履歴の成長記録が不正です。");
          check(Array.isArray(entry.equipment) && entry.equipment.every(item => object(item) && known(data.items, item.itemId) && text(item.name) && integer(item.quantity) && item.quantity >= 1 && (item.autoSold == null || typeof item.autoSold === "boolean")));
          check(Array.isArray(entry.materials) && entry.materials.every(item => object(item) && known(data.items, item.itemId) && data.items[item.itemId].type === "material" && integer(item.quantity) && item.quantity >= 1));
          check(!state.partyHistory.some((other, index) => index !== partyIndex && other.some(candidate => candidate.id === entry.id)), "探索履歴が別のパーティと重複しています。");
        });
        check(new Set(history.map(entry => entry.id)).size === history.length, "探索履歴が重複しています。");
      });
    }
    if (state.partyPlans != null) {
      check(Array.isArray(state.partyPlans) && state.partyPlans.length === state.parties.length, "出撃先設定のパーティ数が不正です。");
      state.partyPlans.forEach((plan, index) => {
        if (plan === null) return;
        check(index < state.unlockedPartyCount && object(plan) && known(data.dungeons, plan.dungeonId) && ["normal", "abyss", "divine"].includes(plan.difficultyId) && integer(plan.timeMultiplier) && plan.timeMultiplier >= 1 && plan.timeMultiplier <= 6, "出撃先設定が不正です。");
        check(dungeonUnlocked(data.dungeons[plan.dungeonId]), "出撃先設定に未解放の探索地が含まれています。");
        if (plan.difficultyId === "abyss") check(story.facts.clears.includes(plan.dungeonId), "魔境の出撃先設定が未解放です。");
        if (plan.difficultyId === "divine") check(story.facts.difficultyClears.includes(`${plan.dungeonId}:abyss`), "神域の出撃先設定が未解放です。");
      });
    }
    if (state.partyNames != null) check(Array.isArray(state.partyNames) && state.partyNames.length === state.parties.length && state.partyNames.every((name, index) => name === null || index < state.unlockedPartyCount && typeof name === "string" && name.trim() === name && name.length >= 1 && name.length <= 20 && !/[\u0000-\u001f\u007f]/.test(name)), "パーティ名が不正です。");
    check(object(state.meta) && integer(state.meta.nextCharacterId) && integer(state.meta.nextItemId) && number(state.meta.updatedAt));
    check(state.meta.nextCharacterId > Math.max(0, ...Array.from(characters.keys(), id => Number(id.split("-")[1]))) && state.meta.nextItemId > Math.max(0, ...Array.from(equipment.keys(), id => Number(id.split("-")[1]))));
    state.presets.slots.filter(Boolean).forEach(preset => preset.members.forEach(entry => {
      check(Number(entry.characterId.split("-")[1]) < state.meta.nextCharacterId, "プリセットの冒険者IDが不正です。");
      entry.equipment.forEach(id => check(Number(id.split("-")[1]) < state.meta.nextItemId, "プリセットの装備IDが不正です。"));
    }));
    check(Array.isArray(state.logs) && state.logs.length <= 100 && state.logs.every(log => object(log) && text(log.text) && number(log.at) && ["info", "success", "danger"].includes(log.tone)));
    for (const [partyIndex, expedition] of state.expeditions.entries()) {
      if (expedition === null) continue;
      check(object(expedition) && known(data.dungeons, expedition.dungeonId) && party(expedition.partyIds) && expedition.partyIds.length > 0);
      check(dungeonUnlocked(data.dungeons[expedition.dungeonId]), "探索先の解放条件を満たしていません。");
      check(expedition.partyIndex === partyIndex);
      check(integer(expedition.timeMultiplier) && expedition.timeMultiplier >= 1 && expedition.timeMultiplier <= 6, "探索時間倍率が不正です。");
      const difficultyId = expedition.difficultyId || "normal";
      check(["normal", "abyss", "divine"].includes(difficultyId), "探索難易度が不正です。");
      const duration = window.DungeonDifficulty ? window.DungeonDifficulty.variant(expedition.dungeonId, difficultyId).duration : data.dungeons[expedition.dungeonId].duration;
      if (expedition.rumor != null) check(object(expedition.rumor) && expedition.rumor.dungeonId === expedition.dungeonId && /^\d{4}-\d{2}-\d{2}$/.test(expedition.rumor.dayKey) && (data.expeditionRumors || []).some(rumor => rumor.id === expedition.rumor.id), "探索時の旅人の噂が不正です。");
      if (window.AcquisitionSkills) check(object(expedition.acquisitionBonuses), "探索時の獲得補正がありません。");
      const acquisition = window.AcquisitionSkills?.normalize(expedition.acquisitionBonuses);
      check(number(expedition.accessDurationMultiplier) && expedition.accessDurationMultiplier > 0 && expedition.accessDurationMultiplier <= 1, "コードによる探索時間補正が不正です。");
      const normalDuration = window.AcquisitionSkills ? window.AcquisitionSkills.durationMs(duration, expedition.timeMultiplier, acquisition) : duration * expedition.timeMultiplier * 1000;
      const expectedDuration = Math.max(1000, Math.round(normalDuration * expedition.accessDurationMultiplier));
      check(expedition.endsAt - expedition.startedAt === expectedDuration, "探索時間と倍率が一致しません。");
      check(partyIndex < state.unlockedPartyCount, "未増設のパーティが探索しています。");
      check(!expedition.partyIds.some(id => state.parties.some((ids, index) => index !== partyIndex && ids.includes(id))), "探索中の冒険者が別のパーティに所属しています。");
      check(!state.expeditions.some((other, index) => index < partyIndex && other && expedition.partyIds.some(id => other.partyIds.includes(id))), "同じ冒険者が複数の探索に参加しています。");
      check(number(expedition.startedAt) && number(expedition.endsAt) && expedition.endsAt > expedition.startedAt && integer(expedition.seed) && expedition.seed > 0 && expedition.seed < 2147483647);
      check(number(expedition.power));
      if (expedition.trackedItemId != null) check(known(data.items, expedition.trackedItemId) && (expedition.trackedItemGoal == null || integer(expedition.trackedItemGoal) && expedition.trackedItemGoal >= 1 && expedition.trackedItemGoal <= 999), "探索中の目標品が不正です。");
      else check(expedition.trackedItemGoal == null, "探索中の目標数が不正です。");
      {
        check(Array.isArray(expedition.partySnapshot) && expedition.partySnapshot.length === expedition.partyIds.length);
        if (expedition.knownCompanionMomentKeys != null) {
          const momentMap = new Map((data.config.explorationEvents?.companionMoments || []).map(moment => [moment.id, moment]));
          check(Array.isArray(expedition.knownCompanionMomentKeys) && new Set(expedition.knownCompanionMomentKeys).size === expedition.knownCompanionMomentKeys.length && expedition.knownCompanionMomentKeys.every(key => {
            const split = typeof key === "string" ? key.lastIndexOf(":") : -1;
            const moment = split > 0 ? momentMap.get(key.slice(0, split)) : null, lineIndex = split > 0 ? Number(key.slice(split + 1)) : NaN;
            return Boolean(moment && Number.isInteger(lineIndex) && lineIndex >= 0 && lineIndex < moment.lines.length);
          }), "探索開始時の人物記憶が不正です。");
        }
        if (expedition.knownRouteMasteryIds != null) {
          const routeEventIds = new Set((data.config.explorationEvents?.routeEvents || []).map(event => event.id));
          check(Array.isArray(expedition.knownRouteMasteryIds) && new Set(expedition.knownRouteMasteryIds).size === expedition.knownRouteMasteryIds.length && expedition.knownRouteMasteryIds.every(id => routeEventIds.has(id)), "探索開始時の道中知見が不正です。");
        }
        if (expedition.knownTreasureMasteryIds != null) {
          const treasureTierIds = new Set((data.config.explorationEvents?.treasure?.types || []).map(tier => tier.id));
          check(Array.isArray(expedition.knownTreasureMasteryIds) && new Set(expedition.knownTreasureMasteryIds).size === expedition.knownTreasureMasteryIds.length && expedition.knownTreasureMasteryIds.every(id => treasureTierIds.has(id)), "探索開始時の宝箱知見が不正です。");
        }
        expedition.partySnapshot.forEach((member, index) => {
          check(object(member));
          check(object(member) && member.id === expedition.partyIds[index] && text(member.name) && integer(member.level) && member.level > 0 && member.position === index
            && known(data.jobs, member.jobId) && known(data.races, member.raceId) && known(data.births, member.birthId));
          if (member.companionId != null) {
            check(known(data.companions, member.companionId), "探索中の物語人物参照が不正です。");
            if (member.companionStageId != null) check(Boolean(data.relations?.companionProgressions?.[member.companionId]?.stages?.[member.companionStageId]), "探索中の人物成長段階が不正です。");
          } else check(member.companionStageId == null, "一般冒険者に人物成長段階が設定されています。");
          check(["melee", "ranged", "mixed"].includes(member.weaponRange) && Array.isArray(member.skillIds) && member.skillIds.every(id => known(data.skills, id)) && new Set(member.skillIds).size === member.skillIds.length);
          if (member.basicDamageType != null) check(["physical", "magic"].includes(member.basicDamageType), "探索中の通常攻撃種別が不正です。");
          if (member.routeEventSuccesses != null) check(object(member.routeEventSuccesses) && Object.entries(member.routeEventSuccesses).every(([id, count]) => (data.config.explorationEvents?.routeEvents || []).some(event => event.id === id) && integer(count) && count > 0), "探索開始時の個人道中経験が不正です。");
          if (member.treasureOpenings != null) check(integer(member.treasureOpenings) && member.treasureOpenings >= 0, "探索開始時の個人開錠経験が不正です。");
          if (member.sharedSorties != null) check(object(member.sharedSorties) && Object.entries(member.sharedSorties).every(([id, count]) => id !== member.id && characters.has(id) && integer(count) && count > 0), "探索開始時の同行記録が不正です。");
          if (member.bondMomentIds != null) check(object(member.bondMomentIds) && Object.entries(member.bondMomentIds).every(([id, momentIds]) => id !== member.id && characters.has(id) && Array.isArray(momentIds) && momentIds.length > 0 && new Set(momentIds).size === momentIds.length && momentIds.every(momentId => (data.config.explorationEvents?.adventurerBondMoments || []).some(moment => moment.id === momentId) && bonds.memories[[member.id, id].sort().join("::")]?.includes(momentId))), "探索開始時の旅仲間記憶が不正です。");
          if (member.equipmentSkillIds != null) check(Array.isArray(member.equipmentSkillIds) && member.equipmentSkillIds.length <= Object.keys(data.equipmentSkills).length && new Set(member.equipmentSkillIds).size === member.equipmentSkillIds.length && member.equipmentSkillIds.every(id => known(data.equipmentSkills, id)), "探索中の装備スキルが不正です。");
          if (member.equipmentSetBonuses != null) check(Array.isArray(member.equipmentSetBonuses)
            && new Set(member.equipmentSetBonuses.map(entry => entry.setId)).size === member.equipmentSetBonuses.length
            && member.equipmentSetBonuses.every(entry => {
              const definition = object(entry) ? data.equipmentSets?.[entry.setId] : null;
              if (!definition || !integer(entry.count) || entry.count < 1 || entry.count > definition.itemIds.length || !Array.isArray(entry.skillIds) || !entry.skillIds.length || new Set(entry.skillIds).size !== entry.skillIds.length) return false;
              const expected = definition.bonuses.filter(bonus => bonus.count <= entry.count).map(bonus => bonus.skillId);
              return entry.skillIds.length === expected.length && entry.skillIds.every(id => expected.includes(id) && member.equipmentSkillIds?.includes(id));
            }), "探索中の装備組合せ記録が不正です。");
          check(object(member.stats) && ["hp", "attack", "defense", "speed", "criticalRate"].every(key => number(member.stats[key])) && member.stats.hp > 0 && member.stats.criticalRate <= 1);
          ["magicAttack", "magicDefense", "magicHealing"].forEach(key => check(number(member.stats[key])));
          ["hitRate", "evasionRate"].forEach(key => check(number(member.stats[key]) && member.stats[key] <= (key === "hitRate" ? 1.2 : .6)));
          check(member.stats.attackCount == null || integer(member.stats.attackCount) && member.stats.attackCount >= 1 && member.stats.attackCount <= 8, "探索中の攻撃回数が不正です。");
          ["skillPower", "healingPower"].forEach(key => check(member.stats[key] == null || number(member.stats[key])));
          ["physicalPower", "magicPower"].forEach(key => check(member.stats[key] == null || number(member.stats[key]) && member.stats[key] >= 1 && member.stats[key] <= 3));
          check(validRates(member.actionRates), "探索中の行動率が不正です。");
          if (member.specialEquipment != null) check(Array.isArray(member.specialEquipment) && new Set(member.specialEquipment).size === member.specialEquipment.length && member.specialEquipment.every(id => known(data.items, id) && data.items[id].unique));
          if (member.loadout != null) check(object(member.loadout) && integer(member.loadout.equipmentCount) && number(member.loadout.equipmentWeight) && number(member.loadout.maximumWeight)
            && member.loadout.equipmentWeight <= member.loadout.maximumWeight && Array.isArray(member.loadout.equipmentNames) && member.loadout.equipmentNames.length <= 8 && member.loadout.equipmentNames.every(text), "探索中の装備記録が不正です。");
        });
      }
    }
    for (const result of [state.lastResult, ...state.partyResults]) {
      if (result === null) continue;
      check(object(result));
      check(result.partyIndex == null || integer(result.partyIndex) && result.partyIndex < slotRules.maximum);
      check(result.difficultyId == null || ["normal", "abyss", "divine"].includes(result.difficultyId), "探索結果の難易度が不正です。");
      check(result.timeMultiplier == null || integer(result.timeMultiplier) && result.timeMultiplier >= 1 && result.timeMultiplier <= 6);
      if (result.storyCompleted != null) check(Array.isArray(result.storyCompleted) && result.storyCompleted.length <= chapterIds.length && result.storyCompleted.every(id => chapterIds.includes(id)));
      if (result.newCompanionIds != null) check(Array.isArray(result.newCompanionIds) && new Set(result.newCompanionIds).size === result.newCompanionIds.length && result.newCompanionIds.every(id => story.joinedCompanionIds.includes(id) && known(data.companions, id)), "探索結果の物語加入者が不正です。");
      if (result.companionAdvancements != null) check(Array.isArray(result.companionAdvancements) && result.companionAdvancements.every(entry => object(entry) && story.joinedCompanionIds.includes(entry.companionId) && data.relations?.companionProgressions?.[entry.companionId]?.stages?.[entry.stageId] && typeof entry.previousStageId === "string"), "探索結果の人物成長記録が不正です。");
      if (result.storyMoments != null) check(Array.isArray(result.storyMoments) && result.storyMoments.every(moment => object(moment) && ["opening", "discovery", "ending"].includes(moment.kind) && known(data.dungeons, moment.dungeonId) && known(data.storyScenes, moment.sceneId)));
      if (result.newRecipeIds != null) check(Array.isArray(result.newRecipeIds) && new Set(result.newRecipeIds).size === result.newRecipeIds.length && result.newRecipeIds.every(id => data.recipes.some(recipe => recipe.id === id)), "探索結果の解放レシピが不正です。");
      if (result.newObservationIds != null) check(Array.isArray(result.newObservationIds) && new Set(result.newObservationIds).size === result.newObservationIds.length && result.newObservationIds.every(id => (data.observationNotes || []).some(note => note.id === id)));
      if (result.newRouteMasteryIds != null) {
        const routeEvents = data.config.explorationEvents?.routeEvents || [], routeEventIds = new Set(routeEvents.map(event => event.id));
        const required = data.config.explorationEvents?.routeMastery?.successes || 3;
        check(Array.isArray(result.newRouteMasteryIds) && new Set(result.newRouteMasteryIds).size === result.newRouteMasteryIds.length && result.newRouteMasteryIds.every(id => routeEventIds.has(id) && (story.facts.routeEvents?.[id]?.successes || 0) >= required), "探索結果の道中知見が不正です。");
      }
      if (result.newRumorConfirmationIds != null) {
        const routeEventIds = new Set((data.config.explorationEvents?.routeEvents || []).map(event => event.id));
        check(Array.isArray(result.newRumorConfirmationIds) && new Set(result.newRumorConfirmationIds).size === result.newRumorConfirmationIds.length && result.newRumorConfirmationIds.every(id => routeEventIds.has(id) && (story.facts.routeEvents?.[id]?.rumorMatches || 0) > 0), "探索結果の噂照合記録が不正です。");
        const reward = data.config.explorationEvents?.rumorConfirmationReward;
        if (result.rumorConfirmationReward != null) check(object(result.rumorConfirmationReward) && result.rumorConfirmationReward.itemId === reward?.itemId && result.rumorConfirmationReward.quantity === reward?.quantity * result.newRumorConfirmationIds.length, "探索結果の噂照合報酬が不正です。");
      }
      else check(result.rumorConfirmationReward == null, "噂照合のない探索に報酬が記録されています。");
      if (result.newTreasureMasteryIds != null) {
        const treasureTiers = data.config.explorationEvents?.treasure?.types || [], treasureTierIds = new Set(treasureTiers.map(tier => tier.id));
        const required = data.config.explorationEvents?.treasureMastery?.openings || 3;
        check(Array.isArray(result.newTreasureMasteryIds) && new Set(result.newTreasureMasteryIds).size === result.newTreasureMasteryIds.length && result.newTreasureMasteryIds.every(id => treasureTierIds.has(id) && (story.facts.treasureTiers?.[id]?.openings || 0) >= required), "探索結果の宝箱知見が不正です。");
      }
      if (result.newMonsterInsights != null) check(Array.isArray(result.newMonsterInsights) && new Set(result.newMonsterInsights.map(entry => entry.monsterId)).size === result.newMonsterInsights.length && result.newMonsterInsights.every(entry => object(entry) && known(data.monsters, entry.monsterId)
        && typeof entry.firstEncounter === "boolean" && typeof entry.magicAttack === "boolean" && typeof entry.rearTargeting === "boolean"
        && (entry.maxAttackCount === null || integer(entry.maxAttackCount) && entry.maxAttackCount > 0)
        && ["attackElements", "statusAttacks", "elementWeaknesses", "elementResistances", "statusResisted", "statusLanded", "difficultySkillIds", "burstRounds"].every(key => Array.isArray(entry[key]) && new Set(entry[key]).size === entry[key].length)
        && entry.statusAttacks.every(id => known(data.statusEffects, id)) && entry.statusResisted.every(id => known(data.statusEffects, id)) && entry.statusLanded.every(id => known(data.statusEffects, id))
        && entry.difficultySkillIds.every(id => known(data.monsterSkills, id)) && entry.burstRounds.every(round => integer(round) && round > 0)), "探索結果の敵新発見が不正です。");
      if (result.firstClearReward != null) check(object(result.firstClearReward) && ["abyss", "divine"].includes(result.firstClearReward.difficultyId) && integer(result.firstClearReward.gold) && Array.isArray(result.firstClearReward.materials) && result.firstClearReward.materials.every(entry => object(entry) && known(data.items, entry.itemId) && integer(entry.quantity) && entry.quantity > 0));
      check(object(result) && known(data.dungeons, result.dungeonId) && typeof result.success === "boolean" && integer(result.gold) && integer(result.exp) && number(result.completedAt));
      check(result.viewed == null || typeof result.viewed === "boolean", "探索結果の既読状態が不正です。");
      if (result.trackedItemId != null) check(known(data.items, result.trackedItemId) && integer(result.trackedItemQuantity) && result.trackedItemQuantity >= 0 && (result.trackedItemGoal == null || integer(result.trackedItemGoal) && result.trackedItemGoal >= 1 && result.trackedItemGoal <= 999) && (result.trackedItemProgress == null || integer(result.trackedItemProgress) && result.trackedItemProgress >= 0), "探索結果の目標品が不正です。");
      else check((result.trackedItemQuantity == null || result.trackedItemQuantity === 0) && result.trackedItemGoal == null && result.trackedItemProgress == null, "探索結果の目標品数が不正です。");
      if (result.experienceGains != null) check(Array.isArray(result.experienceGains) && result.experienceGains.every(entry => object(entry) && text(entry.id) && text(entry.name) && integer(entry.amount) && entry.amount >= 0));
      check(Array.isArray(result.partyNames) && result.partyNames.every(text) && Array.isArray(result.levelUps) && result.levelUps.every(entry => object(entry) && text(entry.name) && integer(entry.level)
        && (entry.newSkillIds == null || Array.isArray(entry.newSkillIds) && new Set(entry.newSkillIds).size === entry.newSkillIds.length && entry.newSkillIds.every(id => known(data.skills, id)))
        && (entry.statChanges == null || object(entry.statChanges) && Object.entries(entry.statChanges).every(([key, value]) => ["hp", "attack", "defense", "magicAttack", "magicDefense", "magicHealing", "speed", "maxWeight"].includes(key) && number(value) && value > 0))));
      if (result.partySetup != null) check(validPartySetup(result.partySetup, data), "探索結果の編成記録が不正です。");
      check(Array.isArray(result.drops) && result.drops.every(drop => object(drop) && known(data.items, drop.itemId) && integer(drop.quantity) && (drop.displayName == null || text(drop.displayName)) && (drop.qualityId == null || known(data.qualities, drop.qualityId)) && (drop.newDiscovery == null || typeof drop.newDiscovery === "boolean") && (drop.newBest == null || typeof drop.newBest === "boolean") && (drop.newUltraRareTitle == null || typeof drop.newUltraRareTitle === "boolean") && (drop.ultraRareTitleId == null || ["weapon", "armor"].includes(data.items[drop.itemId].type) && known(data.ultraRareTitles, drop.ultraRareTitleId))));
      if (result.newItemIds != null) check(Array.isArray(result.newItemIds) && new Set(result.newItemIds).size === result.newItemIds.length && result.newItemIds.every(id => known(data.items, id)));
      if (result.newSetDiscoveries != null) check(Array.isArray(result.newSetDiscoveries)
        && new Set(result.newSetDiscoveries.map(entry => entry.setId)).size === result.newSetDiscoveries.length
        && result.newSetDiscoveries.every(entry => {
          const definition = object(entry) ? data.equipmentSets?.[entry.setId] : null;
          if (!definition || !integer(entry.previousCount) || !integer(entry.count) || entry.previousCount < 0 || entry.count <= entry.previousCount || entry.count > definition.itemIds.length || typeof entry.complete !== "boolean" || entry.complete !== (entry.count === definition.itemIds.length)) return false;
          const bonusIds = new Set(definition.bonuses.map(bonus => bonus.skillId));
          return Array.isArray(entry.newBonusSkillIds) && new Set(entry.newBonusSkillIds).size === entry.newBonusSkillIds.length
            && entry.newBonusSkillIds.every(id => bonusIds.has(id))
            && definition.bonuses.filter(bonus => entry.previousCount < bonus.count && entry.count >= bonus.count).every(bonus => entry.newBonusSkillIds.includes(bonus.skillId))
            && entry.newBonusSkillIds.every(id => {
              const bonus = definition.bonuses.find(entryBonus => entryBonus.skillId === id);
              return bonus && entry.previousCount < bonus.count && entry.count >= bonus.count;
            });
        }), "探索結果の装備組合せ記録が不正です。");
      if (result.newBestQualities != null) check(Array.isArray(result.newBestQualities) && new Set(result.newBestQualities.map(entry => entry.itemId)).size === result.newBestQualities.length && result.newBestQualities.every(entry => object(entry) && known(data.items, entry.itemId) && ["weapon", "armor"].includes(data.items[entry.itemId].type) && known(data.qualities, entry.qualityId)));
      if (result.newUltraRareTitleIds != null) check(Array.isArray(result.newUltraRareTitleIds) && new Set(result.newUltraRareTitleIds).size === result.newUltraRareTitleIds.length && result.newUltraRareTitleIds.every(id => known(data.ultraRareTitles, id)));
      if (result.newAchievementIds != null) check(Array.isArray(result.newAchievementIds) && new Set(result.newAchievementIds).size === result.newAchievementIds.length && result.newAchievementIds.every(id => data.achievements.some(achievement => achievement.id === id)), "探索結果の実績記録が不正です。");
      if (result.rumor != null) check(object(result.rumor) && result.rumor.dungeonId === result.dungeonId && /^\d{4}-\d{2}-\d{2}$/.test(result.rumor.dayKey) && (data.expeditionRumors || []).some(rumor => rumor.id === result.rumor.id), "探索結果の旅人の噂が不正です。");
      if (result.newAdventurerMilestones != null) {
        const milestoneMap = new Map((data.adventurerMilestones || []).map(milestone => [milestone.id, milestone]));
        const characterMap = new Map(state.characters.map(character => [character.id, character]));
        check(Array.isArray(result.newAdventurerMilestones) && result.newAdventurerMilestones.length <= 6
          && new Set(result.newAdventurerMilestones.map(entry => entry.characterId)).size === result.newAdventurerMilestones.length
          && result.newAdventurerMilestones.every(entry => {
            const character = object(entry) ? characterMap.get(entry.characterId) : null;
            const record = character?.expeditionRecord;
            return Boolean(character && text(entry.name) && Array.isArray(entry.milestoneIds) && entry.milestoneIds.length
              && new Set(entry.milestoneIds).size === entry.milestoneIds.length
              && entry.milestoneIds.every(id => {
                const milestone = milestoneMap.get(id);
                if (!milestone) return false;
                const progress = milestoneProgress(record, milestone, data, state, character.id);
                return Number(progress || 0) >= milestone.condition.minimum;
              }));
          }), "探索結果の冒険者記章が不正です。");
      }
      if (result.newAdventurerRecords != null) {
        const recordFields = new Set(["bestDamage", "bestHealing", "bestEndurance"]), characterMap = new Map(state.characters.map(character => [character.id, character]));
        check(Array.isArray(result.newAdventurerRecords) && result.newAdventurerRecords.length <= 6
          && new Set(result.newAdventurerRecords.map(entry => entry.characterId)).size === result.newAdventurerRecords.length
          && result.newAdventurerRecords.every(entry => {
            const character = object(entry) ? characterMap.get(entry.characterId) : null;
            return Boolean(character && text(entry.name) && Array.isArray(entry.improvements) && entry.improvements.length >= 1 && entry.improvements.length <= 3
              && new Set(entry.improvements.map(improvement => improvement.field)).size === entry.improvements.length
              && entry.improvements.every(improvement => object(improvement) && recordFields.has(improvement.field)
                && integer(improvement.previous) && integer(improvement.value) && improvement.previous >= 0 && improvement.value > improvement.previous
                && Number(character.expeditionRecord?.[improvement.field] || 0) >= improvement.value));
          }), "探索結果の冒険者最高記録が不正です。");
      }
      if (result.newAdventurerBondMomentIds != null) {
        const definitions = new Set((data.config.explorationEvents?.adventurerBondMoments || []).map(moment => moment.id));
        const logged = new Set((result.battleLog || []).filter(entry => entry.kind === "bond").map(entry => entry.adventurerBondMomentId));
        check(Array.isArray(result.newAdventurerBondMomentIds) && result.newAdventurerBondMomentIds.length <= 1 && new Set(result.newAdventurerBondMomentIds).size === result.newAdventurerBondMomentIds.length
          && result.newAdventurerBondMomentIds.every(id => definitions.has(id) && logged.has(id) && Object.values(bonds.memories).some(momentIds => momentIds.includes(id))), "探索結果の旅仲間記憶が不正です。");
      }
      if (result.newAdventurerBondTiers != null) check(validBondTierProgress(result.newAdventurerBondTiers, data, characters, bonds), "探索結果の旅仲間成長が不正です。");
      if (result.newCompanionMomentKeys != null) {
        const momentMap = new Map((data.config.explorationEvents?.companionMoments || []).map(moment => [moment.id, moment]));
        check(Array.isArray(result.newCompanionMomentKeys) && new Set(result.newCompanionMomentKeys).size === result.newCompanionMomentKeys.length && result.newCompanionMomentKeys.every(key => {
          const split = typeof key === "string" ? key.lastIndexOf(":") : -1;
          const moment = split > 0 ? momentMap.get(key.slice(0, split)) : null, lineIndex = split > 0 ? Number(key.slice(split + 1)) : NaN;
          return Boolean(moment && Number.isInteger(lineIndex) && lineIndex >= 0 && lineIndex < moment.lines.length && story.facts.companionMoments.includes(key));
        }), "探索結果の人物記憶が不正です。");
      }
      if (result.completedCompanionBonds != null) {
        const momentMap = new Map((data.config.explorationEvents?.companionMoments || []).map(moment => [moment.id, moment]));
        const reward = data.config.explorationEvents?.companionBondReward;
        check(Array.isArray(result.completedCompanionBonds) && new Set(result.completedCompanionBonds.map(entry => entry.momentId)).size === result.completedCompanionBonds.length && result.completedCompanionBonds.every(entry => {
          const moment = object(entry) ? momentMap.get(entry.momentId) : null;
          return Boolean(moment && moment.companionIds.length > 1 && Array.isArray(entry.companionIds) && entry.companionIds.length === moment.companionIds.length
            && entry.companionIds.every((id, index) => id === moment.companionIds[index]) && entry.rewardItemId === reward?.itemId && entry.rewardQuantity === reward?.quantity
            && moment.lines.every((line, lineIndex) => story.facts.companionMoments.includes(`${moment.id}:${lineIndex}`)));
        }), "探索結果の同行関係報酬が不正です。");
      }
      if (result.autoSellGold != null) check(integer(result.autoSellGold));
      if (result.autoSold != null) check(Array.isArray(result.autoSold) && result.autoSold.every(entry => object(entry) && known(data.items, entry.itemId) && text(entry.displayName) && known(data.qualities, entry.qualityId) && integer(entry.value) && typeof entry.ruleId === "string" && /^auto-sell-[1-9]\d*$/.test(entry.ruleId)));
      if (result.battleLog != null) check(Array.isArray(result.battleLog) && result.battleLog.length <= 10000 && result.battleLog.every(entry => {
        if (!object(entry) || !text(entry.text) || !["system", "formation", "encounter", "round", "hero", "skill", "heal", "guard", "enemy", "victory", "defeat", "recovery", "warning", "burst", "weakness", "status", "arrival", "explore", "story", "companion", "bond", "secret", "camp", "hazard", "lore", "gather", "treasure", "treasureGold", "treasureItem", "stairs"].includes(entry.kind)) return false;
        if (["treasure", "treasureGold", "treasureItem"].includes(entry.kind) && entry.treasureTierId != null) {
          const treasureTiers = data.config.explorationEvents?.treasure?.types || [{ id: "weathered", rank: 0 }];
          const tier = treasureTiers.find(candidate => candidate.id === entry.treasureTierId);
          if (!tier || entry.treasureTierRank !== tier.rank) return false;
          if (entry.treasureOpened != null && typeof entry.treasureOpened !== "boolean") return false;
          if (entry.treasureMasteryApplied != null && typeof entry.treasureMasteryApplied !== "boolean") return false;
          if (entry.treasurePersonalPracticeApplied != null && typeof entry.treasurePersonalPracticeApplied !== "boolean") return false;
        }
        if (entry.explorationActorId != null || entry.explorationActorName != null) {
          if (!text(entry.explorationActorId) || !text(entry.explorationActorName)) return false;
        }
        if (entry.routeEventId != null) {
          const memberIds = entry.routeTeamSurveyMemberIds || [], memberNames = entry.routeTeamSurveyMemberNames || [];
          const bondIds = entry.routeBondSupportMemberIds || [], bondNames = entry.routeBondSupportMemberNames || [];
          const bondLabels = new Set((data.config.explorationEvents?.adventurerBondRouteSupport || []).map(tier => tier.label));
          return (data.config.explorationEvents?.routeEvents || []).some(event => event.id === entry.routeEventId && event.kind === entry.kind) && typeof entry.routeEventSuccess === "boolean" && typeof entry.routeRumorMatched === "boolean" && (entry.routeEventMasteryApplied == null || typeof entry.routeEventMasteryApplied === "boolean") && (entry.routeEventPersonalPracticeApplied == null || typeof entry.routeEventPersonalPracticeApplied === "boolean") && (entry.routeTeamSurveyApplied == null || typeof entry.routeTeamSurveyApplied === "boolean")
            && Array.isArray(memberIds) && Array.isArray(memberNames) && memberIds.length === memberNames.length && memberIds.length <= 6 && memberIds.every(text) && memberNames.every(text)
            && (!entry.routeTeamSurveyApplied || memberIds.length >= 2)
            && (entry.routeBondSupportApplied == null || typeof entry.routeBondSupportApplied === "boolean")
            && Array.isArray(bondIds) && Array.isArray(bondNames) && bondIds.length === bondNames.length
            && (!entry.routeBondSupportApplied || bondIds.length === 2 && new Set(bondIds).size === 2 && bondIds.every(text) && bondNames.every(text) && bondLabels.has(entry.routeBondSupportLabel));
        }
        if (entry.kind === "bond") {
          const definition = (data.config.explorationEvents?.adventurerBondMoments || []).find(candidate => candidate.id === entry.adventurerBondMomentId);
          return Boolean(definition && Array.isArray(entry.adventurerBondMemberIds) && Array.isArray(entry.adventurerBondMemberNames)
            && entry.adventurerBondMemberIds.length === 2 && new Set(entry.adventurerBondMemberIds).size === 2 && entry.adventurerBondMemberIds.every(text)
            && entry.adventurerBondMemberNames.length === 2 && entry.adventurerBondMemberNames.every(text)
            && integer(entry.sharedSorties) && entry.sharedSorties >= definition.minimumSharedSorties
            && entry.text === String(definition.text).replace(/\{(\w+)\}/g, (match, key) => ({ left: entry.adventurerBondMemberNames[0], right: entry.adventurerBondMemberNames[1] })[key] ?? match));
        }
        if (entry.kind !== "companion") return true;
        const moment = (data.config.explorationEvents?.companionMoments || []).find(candidate => candidate.id === entry.momentId);
        return Boolean(moment && Array.isArray(entry.companionIds) && entry.companionIds.length === moment.companionIds.length && entry.companionIds.every((id, index) => id === moment.companionIds[index]) && Number.isInteger(entry.companionLineIndex) && entry.companionLineIndex >= 0 && entry.companionLineIndex < moment.lines.length && entry.text === moment.lines[entry.companionLineIndex]);
      }));
      if (result.defeatFacts != null) check(Array.isArray(result.defeatFacts) && result.defeatFacts.length <= 3 && result.defeatFacts.every(text));
      if (result.mechanicReport != null) check(object(result.mechanicReport) && ["warnings", "bursts", "guardedHits", "unguardedHits", "burstDamage", "burstKnockouts", "weaknessHits"].every(key => integer(result.mechanicReport[key])));
      if (result.strategyReport != null) check(object(result.strategyReport) && ["areaHits", "penetrationHits", "magicWeaknessHits", "magicWeaknessDamage", "rearHits", "rearDamage", "rearKnockouts"].every(key => integer(result.strategyReport[key])));
      if (result.survivors != null) check(Array.isArray(result.survivors) && result.survivors.every(member => object(member) && text(member.name) && number(member.hp) && number(member.maxHp)));
      if (result.memberReports != null) check(Array.isArray(result.memberReports) && result.memberReports.length <= 6 && result.memberReports.every(member => object(member) && text(member.name) && ["damageDealt", "damageTaken", "healingDone", "criticalHits", "remainingHp", "maxHp"].every(key => integer(member[key])) && ["attackAttempts", "attackHits", "healingAttempted", "overhealing", "attackActions", "techniqueActions", "spellActions", "healingActions", "defendActions", "guardSkillActions", "statusSkippedTurns", "routeSuccesses", "treasureOpenings", "teamSurveys"].every(key => member[key] == null || integer(member[key])) && (member.routeEventSuccesses == null || object(member.routeEventSuccesses) && Object.entries(member.routeEventSuccesses).every(([id, count]) => (data.config.explorationEvents?.routeEvents || []).some(event => event.id === id) && integer(count) && count > 0) && Object.values(member.routeEventSuccesses).reduce((sum, count) => sum + count, 0) === (member.routeSuccesses || 0)) && (member.attackHits == null || member.attackAttempts == null || member.attackHits <= member.attackAttempts) && (member.overhealing == null || member.healingAttempted == null || member.overhealing <= member.healingAttempted) && known(data.jobs, member.jobId)));
      if (result.bondFormations != null) check(validBondFormations(result.bondFormations, data, characters), "探索結果の戦列連携が不正です。");
      ["encountersCleared", "totalEncounters", "monstersDefeated"].forEach(key => check(result[key] == null || integer(result[key])));
      for (const key of ["monsterCounts", "monsterEncounters"]) if (result[key] != null) check(object(result[key]) && Object.entries(result[key]).every(([id, count]) => known(data.monsters, id) && integer(count)));
      if (result.monsterObservations != null) check(object(result.monsterObservations) && Object.entries(result.monsterObservations).every(([id, observed]) => known(data.monsters, id) && object(observed) && ["incomingAttempts", "incomingHits", "enemyTurns", "maxAttackCount"].every(key => integer(observed[key])) && observed.incomingHits <= observed.incomingAttempts && typeof observed.magicAttack === "boolean" && typeof observed.rearTargeting === "boolean" && ["attackElements", "statusAttacks", "elementWeaknesses", "elementResistances", "statusResisted", "statusLanded", "burstRounds", "difficultySkillIds", "drops"].every(key => Array.isArray(observed[key])) && observed.difficultySkillIds.every(skillId => known(data.monsterSkills, skillId))));
    }
    return state;
  }
  function parse(raw) {
    try {
      check(typeof raw === "string" && new Blob([raw]).size <= MAX_BYTES, "ファイルは2MB以下にしてください。");
      const state = JSON.parse(raw.replace(/^\uFEFF/, ""));
      safeTree(state, 0);
      return { ok: true, state: validate(state) };
    } catch (error) { return { ok: false, message: error instanceof SyntaxError ? "JSONファイルを読み取れませんでした。" : error.message }; }
  }
  function restore(candidate) {
    const parsed = parse(JSON.stringify(candidate));
    if (!parsed.ok) return parsed;
    try {
      const current = window.GameState.data;
      const next = parsed.state;
      window.GameState.ensurePartyCapacity(next);
      window.GameState.ensureFacilities(next);
      window.SaveSystem.replaceWithBackup(next, current);
      Object.keys(current).forEach(key => delete current[key]);
      Object.assign(current, next);
      return { ok: true };
    } catch (error) { return { ok: false, message: "保存できませんでした。空き容量やブラウザの保存設定を確認してください。現在の進行状況は変更していません。" }; }
  }
  function download(previous) {
    const raw = previous ? window.SaveSystem.readBackup() : JSON.stringify(window.GameState.data, null, 2);
    check(raw, "読み込み前のバックアップはまだありません。");
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `guild-chronicle${previous ? "-before-import" : ""}-${new Date(window.GameRuntime.now()).toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(link);
    link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  window.SaveTransfer = { parse, restore, download, MAX_BYTES, backupKey };
})();
