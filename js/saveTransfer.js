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
    window.GameState.ensureFacilities(state);
    check(object(state.facilities) && state.facilities.version === 3, "施設データが不正です。");
    check(Object.keys(state.facilities).every(key => key === "version" || data.facilities.order.includes(key)), "未知の施設データが含まれています。");
    for (const id of data.facilities.order) {
      const facility = state.facilities[id];
      const definition = data.facilities.definitions[id];
      check(object(facility) && number(facility.startedAt) && number(facility.storedDuration) && integer(facility.gold)
        && object(facility.materials) && object(facility.bonusProgress) && object(facility.levels), "施設の蓄積データが不正です。");
      check(facility.activatedAt === null || number(facility.activatedAt), "施設の解放時刻が不正です。");
      data.facilities.trackOrder.forEach(trackId => check(integer(facility.levels[trackId]) && facility.levels[trackId] >= 1
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
    const dungeonUnlocked = dungeon => requirementsMet(dungeon.unlockRequirements);
    check(object(story) && story.version === 1 && Array.isArray(story.completed) && story.completed.length <= chapterIds.length && story.completed.every((id, index) => id === chapterIds[index]), "物語の進行データが不正です。");
    check(object(story.facts) && typeof story.facts.departed === "boolean" && Array.isArray(story.facts.clears) && new Set(story.facts.clears).size === story.facts.clears.length && story.facts.clears.every(id => known(data.dungeons, id)));
    if (story.facts.discoveries != null) check(Array.isArray(story.facts.discoveries) && new Set(story.facts.discoveries).size === story.facts.discoveries.length && story.facts.discoveries.every(id => known(data.dungeons, id)));
    if (story.facts.difficultyClears != null) check(Array.isArray(story.facts.difficultyClears) && new Set(story.facts.difficultyClears).size === story.facts.difficultyClears.length && story.facts.difficultyClears.every(key => {
      const [dungeonId, difficultyId] = String(key).split(":");
      return known(data.dungeons, dungeonId) && ["abyss", "divine"].includes(difficultyId);
    }), "高難易度の攻略記録が不正です。");
    check(story.completed.every(id => chapterSatisfied(chapterDefinitions.find(chapter => chapter.id === id))), "物語の達成条件と進行状況が一致しません。");
    const commissions = state.commissions, quests = data.commissions || [];
    check(object(commissions) && commissions.version === 1 && object(commissions.progress) && Array.isArray(commissions.claimed), "依頼の進行データが不正です。");
    check(Object.entries(commissions.progress).every(([id, amount]) => { const quest = quests.find(quest => quest.id === id); return quest && integer(amount) && amount <= quest.target; }), "依頼の討伐数・攻略数が不正です。");
    check(new Set(commissions.claimed).size === commissions.claimed.length && commissions.claimed.every(id => { const quest = quests.find(quest => quest.id === id); return quest && commissions.progress[id] === quest.target; }), "依頼の受け取り状況が不正です。");
    const recurring = state.recurringMissions, recurringDefinitions = data.recurringMissions?.groups;
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
    check(object(encyclopedia) && encyclopedia.version === 4 && object(encyclopedia.items) && object(encyclopedia.monsters) && Array.isArray(encyclopedia.unreadItems) && Array.isArray(encyclopedia.unreadMonsters), "図鑑データが不正です。");
    check(Object.entries(encyclopedia.items).every(([id, count]) => known(data.items, id) && integer(count) && count > 0), "アイテム図鑑が不正です。");
    check(new Set(encyclopedia.unreadItems).size === encyclopedia.unreadItems.length && encyclopedia.unreadItems.every(id => known(data.items, id) && encyclopedia.items[id] > 0), "アイテム図鑑の新着情報が不正です。");
    check(new Set(encyclopedia.unreadMonsters).size === encyclopedia.unreadMonsters.length && encyclopedia.unreadMonsters.every(id => known(data.monsters, id) && encyclopedia.monsters[id]), "モンスター図鑑の新着情報が不正です。");
    check(Object.entries(encyclopedia.monsters).every(([id, entry]) => {
      if (!known(data.monsters, id) || !object(entry) || !integer(entry.encountered) || entry.encountered <= 0 || !integer(entry.defeated) || entry.defeated > entry.encountered || !object(entry.observations)) return false;
      const observed = entry.observations;
      if (!["incomingAttempts", "incomingHits", "enemyTurns", "maxAttackCount"].every(key => integer(observed[key])) || observed.incomingHits > observed.incomingAttempts || typeof observed.magicAttack !== "boolean" || typeof observed.rearTargeting !== "boolean") return false;
      if (!["attackElements", "statusAttacks", "elementWeaknesses", "elementResistances", "statusResisted", "statusLanded", "burstRounds", "drops"].every(key => Array.isArray(observed[key]) && new Set(observed[key]).size === observed[key].length)) return false;
      if (!object(entry.difficulties)) return false;
      return Object.entries(entry.difficulties).every(([difficultyId, difficulty]) => ["normal", "abyss", "divine"].includes(difficultyId) && object(difficulty)
        && integer(difficulty.encountered) && difficulty.encountered > 0 && integer(difficulty.defeated) && difficulty.defeated <= difficulty.encountered
        && Array.isArray(difficulty.drops) && new Set(difficulty.drops).size === difficulty.drops.length && difficulty.drops.every(id => known(data.items, id)));
    }), "モンスター図鑑が不正です。");
    const observationJournal = state.observationJournal;
    const observationIds = new Set((data.observationNotes || []).map(entry => entry.id));
    check(object(observationJournal) && observationJournal.version === 1 && Array.isArray(observationJournal.readIds)
      && new Set(observationJournal.readIds).size === observationJournal.readIds.length
      && observationJournal.readIds.every(id => observationIds.has(id)), "観察日記の既読情報が不正です。");
    const dailyShop = state.dailyShop, dailyOfferCount = data.shop?.daily?.offerCount || 10;
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
    const characters = new Map(), equipment = new Map(), used = new Set();
    state.inventory.equipment.forEach(item => {
      check(object(item) && typeof item.locked === "boolean", "装備のロック設定が不正です。");
      const maximum = (data.upgrades?.limits || []).reduce((amount, entry) => story.completed.includes(entry.chapterId) ? Math.max(amount, entry.maximum) : amount, 0);
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
      check(object(character.base) && ["hp", "attack", "defense"].every(key => integer(character.base[key])) && character.base.hp > 0 && Array.isArray(character.equipment));
      ["magicAttack", "magicDefense", "magicHealing"].forEach(key => check(character.base[key] == null || integer(character.base[key])));
      check(known(data.jobs, character.jobId) && known(data.races, character.raceId) && known(data.births, character.birthId));
      check(character.gender == null || ["male", "female"].includes(character.gender), "冒険者の性別情報が不正です。");
      check(character.nameCulture == null || Object.prototype.hasOwnProperty.call(data.recruitment?.nameCultures || {}, character.nameCulture), "冒険者の名前系統が不正です。");
      check(character.career === null || object(character.career) && known(data.jobs, character.career.previousJobId) && Array.isArray(character.career.retainedSkillIds) && new Set(character.career.retainedSkillIds).size === character.career.retainedSkillIds.length && character.career.retainedSkillIds.every(id => known(data.skills, id)) && typeof character.career.master === "boolean" && integer(character.career.levelBefore) && character.career.levelBefore >= 1 && number(character.career.changedAt), "転職履歴が不正です。");
      if (character.career) {
        const allowedFormerSkills = new Set((data.skillGrants.job[character.career.previousJobId] || []).filter(entry => entry.initial).map(entry => entry.skillId));
        check(character.career.retainedSkillIds.length === allowedFormerSkills.size && character.career.retainedSkillIds.every(id => allowedFormerSkills.has(id)), "前職から引き継いだスキルが不正です。");
      }
      if (character.career?.master) check(character.career.previousJobId === character.jobId && character.career.levelBefore >= 50, "マスター職の履歴が不正です。");
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
      const definitions = data.recruitment?.fields || [{ id: "jobId", table: "jobs", unlockAfter: null }, { id: "raceId", table: "races", unlockAfter: "roadside" }, { id: "birthId", table: "births", unlockAfter: "seal" }, { id: "focus", table: "recruitmentTalents", unlockAfter: "starfall" }];
      check(object(pending.requirements) && Object.keys(pending.requirements).length === definitions.length);
      const fields = definitions.map(field => [field.id, field.table === "recruitmentTalents" ? talents : data[field.table], field.unlockAfter]);
      fields.forEach(([key, table, unlockAfter]) => check(pending.requirements[key] === "any" || (optionUnlocked(table, pending.requirements[key]) && (!unlockAfter || story.completed.includes(unlockAfter))), "募集条件が未解放または不正です。"));
      check(Array.isArray(pending.candidates) && pending.candidates.length >= 1 && pending.candidates.length <= 5);
      pending.candidates.forEach((candidate, index) => {
        check(object(candidate) && candidate.id === `applicant-${batch}-${index + 1}` && text(candidate.name) && candidate.name.trim().length > 0 && candidate.name.length <= 16);
        check(["male", "female"].includes(candidate.gender) && Object.prototype.hasOwnProperty.call(data.recruitment.names[candidate.gender], candidate.nameCulture), "応募者の名前情報が不正です。");
        check(data.recruitment.names[candidate.gender][candidate.nameCulture].includes(candidate.name), "応募者名が名前候補と一致しません。");
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
    const slotRules = data.partyProgression?.partySlots || {
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
      {
        check(Array.isArray(expedition.partySnapshot) && expedition.partySnapshot.length === expedition.partyIds.length);
        expedition.partySnapshot.forEach((member, index) => {
          check(object(member));
          check(object(member) && member.id === expedition.partyIds[index] && text(member.name) && integer(member.level) && member.level > 0 && member.position === index && known(data.jobs, member.jobId));
          check(["melee", "ranged", "mixed"].includes(member.weaponRange) && Array.isArray(member.skillIds) && member.skillIds.every(id => known(data.skills, id)) && new Set(member.skillIds).size === member.skillIds.length);
          if (member.basicDamageType != null) check(["physical", "magic"].includes(member.basicDamageType), "探索中の通常攻撃種別が不正です。");
          if (member.equipmentSkillIds != null) check(Array.isArray(member.equipmentSkillIds) && member.equipmentSkillIds.length <= Object.keys(data.equipmentSkills).length && new Set(member.equipmentSkillIds).size === member.equipmentSkillIds.length && member.equipmentSkillIds.every(id => known(data.equipmentSkills, id)), "探索中の装備スキルが不正です。");
          check(object(member.stats) && ["hp", "attack", "defense", "speed", "criticalRate"].every(key => number(member.stats[key])) && member.stats.hp > 0 && member.stats.criticalRate <= 1);
          ["magicAttack", "magicDefense", "magicHealing"].forEach(key => check(number(member.stats[key])));
          ["hitRate", "evasionRate"].forEach(key => check(number(member.stats[key]) && member.stats[key] <= (key === "hitRate" ? 1.2 : .6)));
          check(member.stats.attackCount == null || integer(member.stats.attackCount) && member.stats.attackCount >= 1 && member.stats.attackCount <= 8, "探索中の攻撃回数が不正です。");
          ["skillPower", "healingPower"].forEach(key => check(member.stats[key] == null || number(member.stats[key])));
          ["physicalPower", "magicPower"].forEach(key => check(member.stats[key] == null || number(member.stats[key]) && member.stats[key] >= 1 && member.stats[key] <= 3));
          check(validRates(member.actionRates), "探索中の行動率が不正です。");
          if (member.specialEquipment != null) check(Array.isArray(member.specialEquipment) && new Set(member.specialEquipment).size === member.specialEquipment.length && member.specialEquipment.every(id => known(data.items, id) && data.items[id].unique));
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
      if (result.storyMoments != null) check(Array.isArray(result.storyMoments) && result.storyMoments.every(moment => object(moment) && ["opening", "discovery", "ending"].includes(moment.kind) && known(data.dungeons, moment.dungeonId) && known(data.storyScenes, moment.sceneId)));
      if (result.newObservationIds != null) check(Array.isArray(result.newObservationIds) && new Set(result.newObservationIds).size === result.newObservationIds.length && result.newObservationIds.every(id => (data.observationNotes || []).some(note => note.id === id)));
      check(object(result) && known(data.dungeons, result.dungeonId) && typeof result.success === "boolean" && integer(result.gold) && integer(result.exp) && number(result.completedAt));
      check(result.viewed == null || typeof result.viewed === "boolean", "探索結果の既読状態が不正です。");
      if (result.experienceGains != null) check(Array.isArray(result.experienceGains) && result.experienceGains.every(entry => object(entry) && text(entry.id) && text(entry.name) && integer(entry.amount) && entry.amount >= 0));
      check(Array.isArray(result.partyNames) && result.partyNames.every(text) && Array.isArray(result.levelUps) && result.levelUps.every(entry => object(entry) && text(entry.name) && integer(entry.level)));
      check(Array.isArray(result.drops) && result.drops.every(drop => object(drop) && known(data.items, drop.itemId) && integer(drop.quantity) && (drop.displayName == null || text(drop.displayName)) && (drop.qualityId == null || known(data.qualities, drop.qualityId)) && (drop.newDiscovery == null || typeof drop.newDiscovery === "boolean")));
      if (result.newItemIds != null) check(Array.isArray(result.newItemIds) && new Set(result.newItemIds).size === result.newItemIds.length && result.newItemIds.every(id => known(data.items, id)));
      if (result.autoSellGold != null) check(integer(result.autoSellGold));
      if (result.autoSold != null) check(Array.isArray(result.autoSold) && result.autoSold.every(entry => object(entry) && known(data.items, entry.itemId) && text(entry.displayName) && known(data.qualities, entry.qualityId) && integer(entry.value) && typeof entry.ruleId === "string" && /^auto-sell-[1-9]\d*$/.test(entry.ruleId)));
      if (result.battleLog != null) check(Array.isArray(result.battleLog) && result.battleLog.length <= 10000 && result.battleLog.every(entry => object(entry) && text(entry.text) && ["system", "formation", "encounter", "round", "hero", "skill", "heal", "guard", "enemy", "victory", "defeat", "recovery", "warning", "burst", "weakness", "status", "arrival", "explore", "story", "treasure", "treasureGold", "treasureItem", "stairs"].includes(entry.kind)));
      if (result.defeatFacts != null) check(Array.isArray(result.defeatFacts) && result.defeatFacts.length <= 3 && result.defeatFacts.every(text));
      if (result.mechanicReport != null) check(object(result.mechanicReport) && ["warnings", "bursts", "guardedHits", "unguardedHits", "burstDamage", "burstKnockouts", "weaknessHits"].every(key => integer(result.mechanicReport[key])));
      if (result.strategyReport != null) check(object(result.strategyReport) && ["areaHits", "penetrationHits", "magicWeaknessHits", "magicWeaknessDamage", "rearHits", "rearDamage", "rearKnockouts"].every(key => integer(result.strategyReport[key])));
      if (result.survivors != null) check(Array.isArray(result.survivors) && result.survivors.every(member => object(member) && text(member.name) && number(member.hp) && number(member.maxHp)));
      if (result.memberReports != null) check(Array.isArray(result.memberReports) && result.memberReports.length <= 6 && result.memberReports.every(member => object(member) && text(member.name) && ["damageDealt", "damageTaken", "healingDone", "criticalHits", "remainingHp", "maxHp"].every(key => integer(member[key])) && ["attackAttempts", "attackHits"].every(key => member[key] == null || integer(member[key])) && (member.attackHits == null || member.attackAttempts == null || member.attackHits <= member.attackAttempts) && known(data.jobs, member.jobId)));
      ["encountersCleared", "totalEncounters", "monstersDefeated"].forEach(key => check(result[key] == null || integer(result[key])));
      for (const key of ["monsterCounts", "monsterEncounters"]) if (result[key] != null) check(object(result[key]) && Object.entries(result[key]).every(([id, count]) => known(data.monsters, id) && integer(count)));
      if (result.monsterObservations != null) check(object(result.monsterObservations) && Object.entries(result.monsterObservations).every(([id, observed]) => known(data.monsters, id) && object(observed) && ["incomingAttempts", "incomingHits", "enemyTurns", "maxAttackCount"].every(key => integer(observed[key])) && observed.incomingHits <= observed.incomingAttempts && typeof observed.magicAttack === "boolean" && typeof observed.rearTargeting === "boolean" && ["attackElements", "statusAttacks", "elementWeaknesses", "elementResistances", "statusResisted", "statusLanded", "burstRounds", "drops"].every(key => Array.isArray(observed[key]))));
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
