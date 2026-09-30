(function () {
  "use strict";
  const definitions = () => window.GameData.equipmentSkills;
  function typeId(template) { return template.weaponType || template.armorType; }
  function baseIds(template) { return (template.skillIds || []).slice(); }
  function upgradeIds(instance, template) {
    const level = instance.upgradeLevel || 0;
    return ((window.GameData.upgradeSkillProgression || {})[typeId(template)] || []).filter(entry => level >= entry.level).map(entry => entry.skillId);
  }
  function ultraRareId(instance) {
    return instance.ultraRareTitleId ? (window.GameData.ultraRareTitles || {})[instance.ultraRareTitleId]?.skillId : null;
  }
  function ids(instance) {
    const template = window.GameData.items[instance.templateId];
    if (!template) return [];
    return [...new Set([...baseIds(template), ...upgradeIds(instance, template), ultraRareId(instance)].filter(Boolean))];
  }
  function descriptions(instance) { return ids(instance).map(id => definitions()[id]).filter(Boolean); }
  function pool(template) { return baseIds(template); }
  function aggregate(instances) {
    const unique = new Map();
    instances.forEach(instance => ids(instance).forEach(id => { if (definitions()[id] && !unique.has(id)) unique.set(id, definitions()[id]); }));
    const result = {
      multipliers: { hp: 1, attack: 1, defense: 1, magicAttack: 1, magicDefense: 1, magicHealing: 1 },
      bonuses: { hitRate: 0, evasionRate: 0, speed: 0, attackCount: 0, criticalRate: 0 },
      conversions: [], slayers: {}, statusResistances: {}, physicalPower: 1, magicPower: 1, healingPower: 1
    };
    unique.forEach(skill => (skill.effects || []).forEach(effect => {
      if (effect.type === "multiplier") result.multipliers[effect.stat] *= effect.value;
      if (effect.type === "bonus") result.bonuses[effect.stat] += effect.value;
      if (effect.type === "conversion") result.conversions.push(effect);
      if (effect.type === "power") result[effect.damageType === "magic" ? "magicPower" : "physicalPower"] += effect.value;
      if (effect.type === "healingPower") result.healingPower += effect.value;
      if (effect.type === "slayer") result.slayers[effect.familyId] = Math.max(result.slayers[effect.familyId] || 1, effect.value);
      if (effect.type === "statusResistance") result.statusResistances[effect.statusId] = 1 - (1 - (result.statusResistances[effect.statusId] || 0)) * (1 - effect.value);
    }));
    return result;
  }
  function title(instance) { return instance.ultraRareTitleId ? (window.GameData.ultraRareTitles || {})[instance.ultraRareTitleId] || null : null; }
  function skillSources(instance) {
    const template = window.GameData.items[instance.templateId];
    const base = new Set(baseIds(template));
    const upgrade = new Set(upgradeIds(instance, template));
    return ids(instance).map(id => ({ skill: definitions()[id], source: base.has(id) ? "固有" : upgrade.has(id) ? `強化＋${((window.GameData.upgradeSkillProgression || {})[typeId(template)] || []).find(entry => entry.skillId === id)?.level}` : "超レア称号" }));
  }
  window.EquipmentSkills = { ids, descriptions, pool, aggregate, title, skillSources };
})();
