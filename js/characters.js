(function () {
  "use strict";

  function get(id) {
    return window.GameState.data.characters.find((character) => character.id === id);
  }

  const actionRateKeys = ["attack", "technique", "spell", "healing"];
  const defaultActionRates = () => Object.assign({}, window.GameData.combatRules.defaultActionRates);
  function actionRates(character) {
    const rates = character && character.actionRates;
    return rates && actionRateKeys.every(key => Number.isInteger(rates[key]) && rates[key] >= 0 && rates[key] <= 100)
      ? Object.assign({}, rates) : defaultActionRates();
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
      Object.entries(window.GameData.equipmentAffinities[source.type][source.id] || {}).forEach(([type, multiplier]) => {
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
    const configured = window.GameData.characterGrowth?.averageEquipmentWeight;
    if (Number.isFinite(configured) && configured > 0) return configured;
    const weights = Object.values(window.GameData.items || {}).filter(item => ["weapon", "armor"].includes(item.type) && Number.isFinite(item.weight)).map(item => item.weight);
    return weights.length ? weights.reduce((total, weight) => total + weight, 0) / weights.length : 4;
  }

  function equipmentCapacityAtLevel(level) {
    const growth = window.GameData.characterGrowth || {};
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
    const milestones = window.GameData.characterGrowth?.equipmentWeightUnitMilestones;
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
    const speed = Math.max(1, job.speed + Math.floor(growth / 3) + buffs.speedBonus + bonuses.speed + gearSkills.bonuses.speed);
    const raw = {
      hp: Math.round((character.base.hp + growth * 9) * buffs.hpMultiplier) + bonuses.hp,
      attack: Math.round((character.base.attack + growth * 3) * buffs.attackMultiplier) + bonuses.attack,
      defense: Math.round((character.base.defense + growth * 2) * buffs.defenseMultiplier) + bonuses.defense,
      magicAttack: Math.round(((character.base.magicAttack ?? character.base.attack) + growth * 3) * buffs.magicAttackMultiplier) + bonuses.magicAttack,
      magicDefense: Math.round(((character.base.magicDefense ?? character.base.defense) + growth * 2) * buffs.magicDefenseMultiplier) + bonuses.magicDefense,
      magicHealing: Math.round(((character.base.magicHealing ?? character.base.attack) + growth * 3) * buffs.magicHealingMultiplier) + bonuses.magicHealing,
      hitRate: Math.min(1.2, Math.max(.1, (job.hitRate ?? .96) + buffs.hitBonus + bonuses.hitRate + gearSkills.bonuses.hitRate)),
      evasionRate: Math.min(.6, Math.max(0, (job.evasionRate ?? .03) + buffs.evasionBonus + bonuses.evasionRate + gearSkills.bonuses.evasionRate)),
      speed,
      attackCount: Math.min(8, Math.max(1, 1 + Math.floor(Math.max(0, speed - 8) / 8) + bonuses.attackCount + gearSkills.bonuses.attackCount)),
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
      (window.GameData.skillGrants[source.type][source.id] || []).forEach((entry) => {
        grant(entry.skillId, entry, source.data.name);
      });
    });
    if (character.career) {
      const former = window.GameData.jobs[character.career.previousJobId];
      (character.career.retainedSkillIds || []).forEach(id => grant(id, { level: 1, initial: true }, `前職・${former.name}`));
      if (character.career.master) {
        const masterSkillId = window.GameData.classChanges[character.jobId].masterSkillId;
        grant(masterSkillId, { level: 1, initial: true }, `${window.GameData.jobs[character.jobId].name}マスター`);
      }
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

  window.Characters = { get, stats, statBreakdown, addExperience, expToNext, maxWeight, baseMaxWeight, equipmentCapacityAtLevel, averageEquipmentWeight, equipmentWeightUnitAtLevel, equipmentWeight, learnedSkills, weaponRange, basicDamageType, origins, profile, equipmentEffects, skillProgression, portraitId, portraitChoices, matchingPortraits, actionRates, setActionRates, setPortrait, specialEquipment, jobName };
})();
