(function () {
  "use strict";

  function get(id) {
    return window.GameState.data.characters.find((character) => character.id === id);
  }

  function emptyExpeditionRecord() {
    return {
      sorties: 0, victories: 0, retreats: 0, encounterClears: 0,
      routeSuccesses: 0, routeEventSuccesses: {}, treasureOpenings: 0, teamSurveys: 0,
      damageDealt: 0, healingDone: 0, damageTaken: 0, criticalHits: 0, knockouts: 0,
      bestDamage: 0, bestHealing: 0, bestEndurance: 0, lastAt: null
    };
  }

  function expeditionRecord(character) {
    const record = character?.expeditionRecord;
    const normalized = Object.assign(emptyExpeditionRecord(), record && typeof record === "object" && !Array.isArray(record) ? record : {});
    normalized.routeEventSuccesses = Object.assign({}, record?.routeEventSuccesses || {});
    return normalized;
  }

  function routeExperience(character) {
    const counts = expeditionRecord(character).routeEventSuccesses;
    return Object.freeze((window.GameData.config.explorationEvents?.routeEvents || [])
      .map((event, index) => Object.freeze({ id: event.id, name: event.name, label: event.recordLabel, count: Math.max(0, Number(counts[event.id]) || 0), index }))
      .filter(entry => entry.count > 0)
      .sort((left, right) => right.count - left.count || left.index - right.index));
  }

  function routeSpecialties(character) {
    const threshold = window.GameData.config.explorationEvents?.personalPractice?.successes || 5;
    const milestones = window.GameData.adventurerMilestones || [];
    return Object.freeze(routeExperience(character).filter(entry => entry.count >= threshold).map(entry => {
      const milestone = milestones.find(candidate => candidate.condition?.type === "routeEventRecord" && candidate.condition.routeEventId === entry.id);
      return Object.freeze(Object.assign({}, entry, {
        icon: milestone?.icon || "路",
        title: milestone?.name || `${entry.name}の記章`
      }));
    }));
  }

  function treasureSpecialty(character) {
    const threshold = window.GameData.config.explorationEvents?.treasurePersonalPractice?.openings || 10;
    const count = expeditionRecord(character).treasureOpenings;
    if (count < threshold) return null;
    const milestone = (window.GameData.adventurerMilestones || []).find(candidate => candidate.id === "ten_sealed_chests");
    return Object.freeze({
      id: "treasure_opening", name: "開錠", label: "封印箱を開けた", count,
      icon: milestone?.icon || "鍵", title: milestone?.name || "開錠の記章"
    });
  }

  function fieldSpecialties(character) {
    const treasure = treasureSpecialty(character);
    return Object.freeze([...routeSpecialties(character), ...(treasure ? [treasure] : [])]);
  }

  function bondKey(leftId, rightId) { return [String(leftId), String(rightId)].sort().join("::"); }

  function sharedSorties(character) {
    if (!character?.id) return Object.freeze([]);
    const bonds = window.GameState.data.adventurerBonds || {}, pairs = bonds.pairs || {}, memories = bonds.memories || {};
    return Object.freeze(Object.entries(pairs).map(([key, count]) => {
      const ids = key.split("::");
      if (ids.length !== 2 || !ids.includes(character.id)) return null;
      const companionId = ids[0] === character.id ? ids[1] : ids[0];
      const companion = get(companionId);
      return companion ? Object.freeze({ characterId: companionId, name: companion.name, count: Math.max(0, Number(count) || 0), memoryIds: Object.freeze([...(memories[key] || [])]) }) : null;
    }).filter(Boolean).sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, "ja")));
  }

  function recordSharedSortie(memberIds) {
    const unique = [...new Set((memberIds || []).filter(id => get(id)))];
    const store = window.GameState.data.adventurerBonds || (window.GameState.data.adventurerBonds = { version: 1, pairs: {}, memories: {} });
    if (!store.pairs || typeof store.pairs !== "object" || Array.isArray(store.pairs)) store.pairs = {};
    for (let left = 0; left < unique.length; left += 1) for (let right = left + 1; right < unique.length; right += 1) {
      const key = bondKey(unique[left], unique[right]);
      store.pairs[key] = Math.max(0, Number(store.pairs[key]) || 0) + 1;
    }
    return unique.length;
  }

  function bondMemories(leftId, rightId) {
    return Object.freeze([...(window.GameState.data.adventurerBonds?.memories?.[bondKey(leftId, rightId)] || [])]);
  }

  function recordBondMemory(memberIds, momentId) {
    const ids = [...new Set(memberIds || [])];
    if (ids.length !== 2 || ids.some(id => !get(id)) || !(window.GameData.config.explorationEvents?.adventurerBondMoments || []).some(moment => moment.id === momentId)) return false;
    const store = window.GameState.data.adventurerBonds || (window.GameState.data.adventurerBonds = { version: 1, pairs: {}, memories: {} });
    if (!store.memories || typeof store.memories !== "object" || Array.isArray(store.memories)) store.memories = {};
    const key = bondKey(ids[0], ids[1]), memories = store.memories[key] || (store.memories[key] = []);
    if (memories.includes(momentId)) return false;
    memories.push(momentId);
    return true;
  }

  function expeditionMilestones(character) {
    const record = expeditionRecord(character);
    return (window.GameData.adventurerMilestones || []).map(definition => {
      const condition = definition.condition;
      const current = condition.type === "routeEventRecord"
        ? Math.max(0, Number(record.routeEventSuccesses?.[condition.routeEventId]) || 0)
        : condition.type === "specialtyCount"
          ? fieldSpecialties(character).length
          : condition.type === "sharedSorties"
            ? (sharedSorties(character)[0]?.count || 0)
          : Math.max(0, Number(record[condition.field]) || 0);
      const target = definition.condition.minimum;
      return Object.freeze(Object.assign({}, definition, {
        current,
        target,
        complete: current >= target,
        ratio: Math.min(1, current / target)
      }));
    });
  }

  function recordTitle(character) {
    if (!character?.recordTitleId) return null;
    return expeditionMilestones(character).find(entry => entry.id === character.recordTitleId && entry.complete) || null;
  }

  function setRecordTitle(id, milestoneId) {
    const character = get(id);
    if (!character) return { ok: false, message: "冒険者が見つかりません。" };
    if (milestoneId == null) {
      character.recordTitleId = null;
      window.GameState.save();
      return { ok: true, message: "表示する記章を外しました。" };
    }
    const milestone = expeditionMilestones(character).find(entry => entry.id === milestoneId);
    if (!milestone || !milestone.complete) return { ok: false, message: "まだ獲得していない記章です。" };
    character.recordTitleId = milestone.id;
    window.GameState.save();
    return { ok: true, message: `「${milestone.name}」を表示する記章にしました。` };
  }

  function recordExpedition(character, report, success, encounterClears, completedAt) {
    if (!character || !report) return null;
    const record = expeditionRecord(character);
    const damage = Math.max(0, Math.round(Number(report.damageDealt) || 0));
    const healing = Math.max(0, Math.round(Number(report.healingDone) || 0));
    const taken = Math.max(0, Math.round(Number(report.damageTaken) || 0));
    record.sorties += 1;
    record.victories += success ? 1 : 0;
    record.retreats += success ? 0 : 1;
    record.encounterClears += Math.max(0, Math.round(Number(encounterClears) || 0));
    record.routeSuccesses += Math.max(0, Math.round(Number(report.routeSuccesses) || 0));
    Object.entries(report.routeEventSuccesses || {}).forEach(([eventId, count]) => {
      if (!(window.GameData.config.explorationEvents?.routeEvents || []).some(event => event.id === eventId)) return;
      record.routeEventSuccesses[eventId] = (record.routeEventSuccesses[eventId] || 0) + Math.max(0, Math.round(Number(count) || 0));
    });
    record.treasureOpenings += Math.max(0, Math.round(Number(report.treasureOpenings) || 0));
    record.teamSurveys += Math.max(0, Math.round(Number(report.teamSurveys) || 0));
    record.damageDealt += damage;
    record.healingDone += healing;
    record.damageTaken += taken;
    record.criticalHits += Math.max(0, Math.round(Number(report.criticalHits) || 0));
    record.knockouts += Number(report.remainingHp) <= 0 ? 1 : 0;
    record.bestDamage = Math.max(record.bestDamage, damage);
    record.bestHealing = Math.max(record.bestHealing, healing);
    if (Number(report.remainingHp) > 0) record.bestEndurance = Math.max(record.bestEndurance, taken);
    record.lastAt = Number(completedAt) || window.GameRuntime.now();
    character.expeditionRecord = record;
    return record;
  }
  function companionDefinition(character) {
    return character?.source?.type === "companion" ? window.GameData.companions?.[character.source.companionId] || null : null;
  }
  function baseStats(character) { return companionDefinition(character)?.baseStats || character.base; }

  const actionRateKeys = ["attack", "technique", "spell", "healing"];
  const defaultActionRates = () => Object.assign({}, window.GameData.config.combatRules.defaultActionRates);
  function actionRates(character) {
    const rates = character && character.actionRates;
    return rates && actionRateKeys.every(key => Number.isInteger(rates[key]) && rates[key] >= 0 && rates[key] <= 100)
      ? Object.assign({}, rates) : defaultActionRates();
  }

  function attackCountRules() {
    return window.GameData.config.combatRules?.attackCountProgression || {
      minimum: 1, maximum: 8, speedBaseline: 8, speedPerAdditionalAttack: 8,
      speedWeights: { job: 1, level: 1, profile: 1, equipment: 1, equipmentSkills: 1 }, jobBonuses: {}
    };
  }

  function attackCountForSpeed(speed, jobId, explicitBonus) {
    const rules = attackCountRules();
    const speedAttacks = Math.floor(Math.max(0, Number(speed || 0) - rules.speedBaseline) / rules.speedPerAdditionalAttack);
    const count = rules.minimum + speedAttacks + (rules.jobBonuses?.[jobId] || 0) + (Number(explicitBonus) || 0);
    return Math.min(rules.maximum, Math.max(rules.minimum, Math.round(count)));
  }

  function attackCountFor(parts) {
    const rules = attackCountRules(), weights = rules.speedWeights || {};
    const weightedSpeed = ["job", "level", "profile", "equipment", "equipmentSkills"].reduce((total, key) =>
      total + (Number(parts?.[key]) || 0) * (Number(weights[key]) || 0), 0
    );
    return attackCountForSpeed(weightedSpeed, parts?.jobId, parts?.explicitBonus);
  }

  function matchingPortraits(character) {
    return Object.values(window.GameData.portraits || {}).filter(portrait =>
      portrait.sourceType === "job" && portrait.sourceId === character.jobId
      || portrait.sourceType === "race" && portrait.sourceId === character.raceId
      || portrait.sourceType === "birth" && portrait.sourceId === character.birthId
    );
  }

  function portraitChoices() {
    return Object.values(window.GameData.portraits || {});
  }

  function portraitId(character, random) {
    const defaults = { warrior: "knight", thief: "rogue", mage: "mage", cleric: "priest", knight: "knight", ranger: "ranger", berserker: "dwarf", monk: "rogue", samurai: "lancer", ninja: "rogue", bard: "ranger", druid: "priest", hexer: "mage", spellblade: "knight", summoner: "mage" };
    if (Object.prototype.hasOwnProperty.call(window.GameData.portraits || {}, character.portraitId)) return character.portraitId;
    const matches = matchingPortraits(character);
    if (matches.length) return matches[Math.floor((random ? random() : 0) * matches.length)].id;
    return defaults[character.jobId] || "knight";
  }

  function expToNext(level) { return 60 + (level - 1) * 45; }

  function origins(character) {
    return [
      window.GameData.races[character.raceId] || window.GameData.races.human,
      window.GameData.jobs[character.jobId] || window.GameData.jobs.warrior,
      window.GameData.births[character.birthId] || window.GameData.births.common
    ];
  }

  function identityLayers(character) {
    return [
      { type: "race", id: character.raceId, data: window.GameData.races[character.raceId] || window.GameData.races.human },
      { type: "job", id: character.jobId, data: window.GameData.jobs[character.jobId] || window.GameData.jobs.warrior },
      { type: "birth", id: character.birthId, data: window.GameData.births[character.birthId] || window.GameData.births.common }
    ];
  }

  function profile(character) {
    const result = { hpMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, weightMultiplier: 1, magicAttackMultiplier: 1, magicDefenseMultiplier: 1, magicHealingMultiplier: 1, hitBonus: 0, evasionBonus: 0, skillPower: 1, healingPower: 1, speedBonus: 0, criticalBonus: 0, weaponAffinity: {}, armorAffinity: {}, elementModifiers: {}, statusResistances: {} };
    identityLayers(character).forEach((source) => {
      const layer = source.data;
      ["hpMultiplier", "attackMultiplier", "defenseMultiplier", "weightMultiplier", "skillPower", "healingPower"].forEach((key) => { result[key] *= layer[key] == null ? 1 : layer[key]; });
      result.speedBonus += layer.speedBonus || 0;
      result.criticalBonus += layer.criticalBonus || 0;
      ["magicAttackMultiplier", "magicDefenseMultiplier", "magicHealingMultiplier"].forEach(key => { result[key] *= layer[key] == null ? 1 : layer[key]; });
      result.hitBonus += layer.hitBonus || 0;
      result.evasionBonus += layer.evasionBonus || 0;
      Object.entries(layer.elementModifiers || {}).forEach(([id, multiplier]) => { result.elementModifiers[id] = (result.elementModifiers[id] || 1) * multiplier; });
      Object.entries(layer.statusResistances || {}).forEach(([id, resistance]) => { result.statusResistances[id] = 1 - (1 - (result.statusResistances[id] || 0)) * (1 - resistance); });
      Object.entries(window.GameData.relations.equipmentAffinities[source.type][source.id] || {}).forEach(([type, multiplier]) => {
        const category = window.GameData.equipmentTypes[type].category;
        const target = category === "weapon" ? result.weaponAffinity : result.armorAffinity;
        target[type] = (target[type] || 1) * multiplier;
      });
    });
    return result;
  }

  function equipmentEffects(character, instance) {
    const effect = window.Items.effects(instance);
    const item = window.Items.template(instance.templateId);
    const buffs = profile(character);
    const multiplier = item.type === "weapon" ? buffs.weaponAffinity[item.weaponType] || 1 : buffs.armorAffinity[item.armorType] || 1;
    return { hp: Math.round(effect.hp * multiplier), attack: Math.round(effect.attack * multiplier), defense: Math.round(effect.defense * multiplier), magicAttack: Math.round(effect.magicAttack * multiplier), magicDefense: Math.round(effect.magicDefense * multiplier), magicHealing: Math.round(effect.magicHealing * multiplier), hitRate: effect.hitRate || 0, evasionRate: effect.evasionRate || 0, speed: effect.speed || 0, attackCount: effect.attackCount || 0, weight: effect.weight, affinity: multiplier };
  }

  function averageEquipmentWeight() {
    const configured = window.GameData.config.characterGrowth?.averageEquipmentWeight;
    if (Number.isFinite(configured) && configured > 0) return configured;
    const weights = Object.values(window.GameData.items || {}).filter(item => ["weapon", "armor"].includes(item.type) && Number.isFinite(item.weight)).map(item => item.weight);
    return weights.length ? weights.reduce((total, weight) => total + weight, 0) / weights.length : 4;
  }

  function equipmentCapacityAtLevel(level) {
    const growth = window.GameData.config.characterGrowth || {};
    const milestones = growth.equipmentCapacityMilestones || [[1, 1], [200, 23]];
    const currentLevel = Math.max(1, Number(level) || 1);
    if (currentLevel <= milestones[0][0]) return milestones[0][1];
    for (let index = 1; index < milestones.length; index += 1) {
      const previous = milestones[index - 1], next = milestones[index];
      if (currentLevel <= next[0]) {
        const progress = (currentLevel - previous[0]) / (next[0] - previous[0]);
        return previous[1] + (next[1] - previous[1]) * progress;
      }
    }
    const last = milestones[milestones.length - 1];
    const extended = last[1] + (currentLevel - last[0]) / (growth.postMilestoneLevelsPerItem || 17);
    return Math.min(growth.maximumAverageItems || extended, extended);
  }

  function equipmentWeightUnitAtLevel(level) {
    const milestones = window.GameData.config.characterGrowth?.equipmentWeightUnitMilestones;
    if (!Array.isArray(milestones) || !milestones.length) return averageEquipmentWeight();
    const currentLevel = Math.max(1, Number(level) || 1);
    if (currentLevel <= milestones[0][0]) return milestones[0][1];
    for (let index = 1; index < milestones.length; index += 1) {
      const previous = milestones[index - 1], next = milestones[index];
      if (currentLevel <= next[0]) {
        const progress = (currentLevel - previous[0]) / (next[0] - previous[0]);
        return previous[1] + (next[1] - previous[1]) * progress;
      }
    }
    return milestones[milestones.length - 1][1];
  }

  function baseMaxWeight(level) { return equipmentCapacityAtLevel(level) * equipmentWeightUnitAtLevel(level); }

  function maxWeight(character) {
    return Math.round(baseMaxWeight(character.level) * profile(character).weightMultiplier * 10) / 10;
  }

  function equipmentWeight(character) {
    return character.equipment.reduce((total, instanceId) => {
      const instance = window.Items.getInstance(instanceId);
      return Math.round((total + (instance ? window.Items.effects(instance).weight : 0)) * 10) / 10;
    }, 0);
  }

  function stats(character, equipmentOverride) {
    const job = window.GameData.jobs[character.jobId] || window.GameData.jobs.warrior;
    const base = baseStats(character);
    const buffs = profile(character);
    const equipped = (equipmentOverride || character.equipment).map(entry => typeof entry === "string" ? window.Items.getInstance(entry) : entry).filter(Boolean);
    const bonuses = equipped.reduce((total, instance) => {
      const effect = equipmentEffects(character, instance);
      total.hp += effect.hp;
      total.attack += effect.attack;
      total.defense += effect.defense;
      total.magicAttack += effect.magicAttack;
      total.magicDefense += effect.magicDefense;
      total.magicHealing += effect.magicHealing;
      total.hitRate += effect.hitRate;
      total.evasionRate += effect.evasionRate;
      total.speed += effect.speed;
      total.attackCount += effect.attackCount;
      return total;
    }, { hp: 0, attack: 0, defense: 0, magicAttack: 0, magicDefense: 0, magicHealing: 0, hitRate: 0, evasionRate: 0, speed: 0, attackCount: 0 });
    const growth = character.level - 1;
    const gearSkills = window.EquipmentSkills.aggregate(equipped);
    const speedParts = {
      jobId: character.jobId,
      job: job.speed,
      level: Math.floor(growth / 3),
      profile: buffs.speedBonus,
      equipment: bonuses.speed,
      equipmentSkills: gearSkills.bonuses.speed,
      explicitBonus: bonuses.attackCount + gearSkills.bonuses.attackCount
    };
    const speed = Math.max(1, speedParts.job + speedParts.level + speedParts.profile + speedParts.equipment + speedParts.equipmentSkills);
    const raw = {
      hp: Math.round((base.hp + growth * 9) * buffs.hpMultiplier) + bonuses.hp,
      attack: Math.round((base.attack + growth * 3) * buffs.attackMultiplier) + bonuses.attack,
      defense: Math.round((base.defense + growth * 2) * buffs.defenseMultiplier) + bonuses.defense,
      magicAttack: Math.round(((base.magicAttack ?? base.attack) + growth * 3) * buffs.magicAttackMultiplier) + bonuses.magicAttack,
      magicDefense: Math.round(((base.magicDefense ?? base.defense) + growth * 2) * buffs.magicDefenseMultiplier) + bonuses.magicDefense,
      magicHealing: Math.round(((base.magicHealing ?? base.attack) + growth * 3) * buffs.magicHealingMultiplier) + bonuses.magicHealing,
      hitRate: Math.min(1.2, Math.max(.1, (job.hitRate ?? .96) + buffs.hitBonus + bonuses.hitRate + gearSkills.bonuses.hitRate)),
      evasionRate: Math.min(.6, Math.max(0, (job.evasionRate ?? .03) + buffs.evasionBonus + bonuses.evasionRate + gearSkills.bonuses.evasionRate)),
      speed,
      attackCount: attackCountFor(speedParts),
      criticalRate: Math.min(0.8, Math.max(0, job.criticalRate + buffs.criticalBonus + gearSkills.bonuses.criticalRate))
    };
    const scaled = {};
    Object.keys(gearSkills.multipliers).forEach(key => { scaled[key] = raw[key] * gearSkills.multipliers[key]; });
    const converted = {};
    gearSkills.conversions.forEach(skill => {
      converted[skill.target] = (converted[skill.target] || 0) + scaled[skill.source] * skill.value;
    });
    Object.keys(gearSkills.multipliers).forEach(key => {
      raw[key] = Math.max(1, Math.round(scaled[key] + (converted[key] || 0) * gearSkills.multipliers[key]));
    });
    raw.physicalPower = gearSkills.physicalPower;
    raw.magicPower = gearSkills.magicPower;
    raw.skillPower = buffs.skillPower;
    raw.healingPower = equipped.reduce((power, instance) => (window.Items.template(instance.templateId).specialEffects || []).filter(effect => effect.kind === "healing_boost").reduce((value, effect) => value * effect.multiplier, power), buffs.healingPower * gearSkills.healingPower);
    raw.elementModifiers = Object.assign({}, buffs.elementModifiers);
    raw.statusResistances = Object.assign({}, buffs.statusResistances);
    Object.entries(gearSkills.statusResistances).forEach(([id, resistance]) => {
      raw.statusResistances[id] = 1 - (1 - (raw.statusResistances[id] || 0)) * (1 - resistance);
    });
    raw.slayerMultipliers = Object.assign({}, gearSkills.slayers);
    return raw;
  }

  function statBreakdown(character, equipmentOverride) {
    const equipment = equipmentOverride == null ? character.equipment : equipmentOverride;
    const base = stats(character, []);
    const total = stats(character, equipment);
    const contribution = {};
    ["hp", "attack", "defense", "magicAttack", "magicDefense", "magicHealing", "hitRate", "evasionRate", "speed", "attackCount", "criticalRate", "physicalPower", "magicPower", "skillPower", "healingPower"].forEach(key => {
      contribution[key] = (total[key] || 0) - (base[key] || 0);
    });
    return { base, equipment: contribution, total };
  }

  function skillProgression(character) {
    const grants = new Map();
    function grant(id, entry, source) {
      const skill = window.GameData.skills[id];
      if (!skill) return;
      const previous = grants.get(id);
      const initial = Boolean(entry.initial), level = initial ? 1 : entry.level;
      grants.set(id, Object.assign({}, skill, {
        level: previous ? Math.min(previous.level, level) : level,
        initial: Boolean(previous?.initial || initial),
        sources: previous ? [...previous.sources, source] : [source]
      }));
    }
    identityLayers(character).forEach((source) => {
      (window.GameData.relations.skillGrants[source.type][source.id] || []).forEach((entry) => {
        grant(entry.skillId, entry, source.data.name);
      });
    });
    if (character.career) {
      const former = window.GameData.jobs[character.career.previousJobId];
      (character.career.retainedSkillIds || []).forEach(id => grant(id, { level: 1, initial: true }, `前職・${former.name}`));
      if (character.career.master) {
        const masterSkillId = window.GameData.config.classChanges[character.jobId].masterSkillId;
        grant(masterSkillId, { level: 1, initial: true }, `${window.GameData.jobs[character.jobId].name}マスター`);
      }
    }
    const companion = companionDefinition(character);
    if (companion) {
      (window.Companions?.skillGrants(companion.id) || window.GameData.relations?.companionSkillGrants?.[companion.id] || []).forEach(entry => grant(entry.skillId, entry, `${companion.name}固有`));
    }
    return Array.from(grants.values()).sort((a, b) => Number(b.initial) - Number(a.initial) || a.level - b.level);
  }

  function jobName(character) {
    const name = (window.GameData.jobs[character.jobId] || window.GameData.jobs.warrior).name;
    return character.career?.master ? `${name}マスター` : name;
  }

  function learnedSkills(character) {
    return skillProgression(character).filter((skill) => skill.initial || character.level >= skill.level);
  }

  function weaponRange(character) {
    const ranges = new Set(character.equipment.map(window.Items.getInstance).filter(item => item && window.Items.template(item.templateId).type === "weapon").map(item => window.Items.template(item.templateId).range || "melee"));
    return ranges.size > 1 ? "mixed" : ranges.has("ranged") ? "ranged" : "melee";
  }

  function basicDamageType(character, equipmentOverride) {
    const equipment = equipmentOverride || character.equipment.map(window.Items.getInstance).filter(Boolean);
    const weapons = equipment.map(entry => typeof entry === "string" ? window.Items.getInstance(entry) : entry).filter(Boolean)
      .map(instance => window.Items.template(instance.templateId)).filter(item => item?.type === "weapon");
    return weapons.length && weapons.every(item => window.GameData.equipmentTypes[item.weaponType]?.basicDamageType === "magic") ? "magic" : "physical";
  }

  function specialEquipment(character) {
    return [...new Set(character.equipment.map(window.Items.getInstance).filter(Boolean).filter(instance => (window.Items.template(instance.templateId).specialEffects || []).length).map(instance => instance.templateId))];
  }

  function addExperience(character, amount) {
    character.exp += amount;
    let levels = 0;
    while (character.exp >= expToNext(character.level)) {
      character.exp -= expToNext(character.level);
      character.level += 1;
      levels += 1;
    }
    return levels;
  }

  function setActionRates(id, rates) {
    const character = get(id);
    if (!character) return { ok: false, message: "冒険者が見つかりません。" };
    if (!rates || !actionRateKeys.every(key => Number.isInteger(rates[key]) && rates[key] >= 0 && rates[key] <= 100)) return { ok: false, message: "4種類の行動率を、それぞれ0〜100%で設定してください。" };
    character.actionRates = Object.fromEntries(actionRateKeys.map(key => [key, rates[key]]));
    window.GameState.save();
    return { ok: true, message: "行動率を保存しました。" };
  }

  function setPortrait(id, selectedId) {
    const character = get(id);
    if (!character) return { ok: false, message: "冒険者が見つかりません。" };
    if (!Object.prototype.hasOwnProperty.call(window.GameData.portraits, selectedId)) return { ok: false, message: "画像が不正です。" };
    character.portraitId = selectedId;
    window.GameState.save();
    return { ok: true, message: "キャラクター画像を変更しました。" };
  }

  window.Characters = { get, stats, statBreakdown, addExperience, emptyExpeditionRecord, expeditionRecord, expeditionMilestones, routeExperience, routeSpecialties, treasureSpecialty, fieldSpecialties, sharedSorties, recordSharedSortie, bondMemories, recordBondMemory, recordTitle, setRecordTitle, recordExpedition, expToNext, maxWeight, baseMaxWeight, equipmentCapacityAtLevel, averageEquipmentWeight, equipmentWeightUnitAtLevel, equipmentWeight, learnedSkills, weaponRange, basicDamageType, origins, profile, equipmentEffects, skillProgression, portraitId, portraitChoices, matchingPortraits, actionRates, setActionRates, setPortrait, specialEquipment, jobName, baseStats, companionDefinition, attackCountFor, attackCountForSpeed };
})();
