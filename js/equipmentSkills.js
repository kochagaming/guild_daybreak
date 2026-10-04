(function () {
  "use strict";
  const definitions = () => window.GameData.equipmentSkills;
  function typeId(template) { return template.weaponType || template.armorType; }
  function baseIds(template) {
    return template ? (window.GameData.relations?.itemSkillGrants?.[template.id] || []).slice() : [];
  }
  function upgradeIds(instance, template) {
    const level = instance.upgradeLevel || 0;
    return ((window.GameData.relations.upgradeSkillProgression || {})[typeId(template)] || []).filter(entry => level >= entry.level).map(entry => entry.skillId);
  }
  function ultraRareId(instance) {
    return instance.ultraRareTitleId ? (window.GameData.ultraRareTitles || {})[instance.ultraRareTitleId]?.skillId : null;
  }
  function ids(instance) {
    const template = window.GameData.items[instance.templateId];
    if (!template) return [];
    return [...new Set([...baseIds(template), ...upgradeIds(instance, template), ultraRareId(instance)].filter(Boolean))];
  }
  function setProgress(instances) {
    const templates = new Set((instances || []).map(instance => instance?.templateId).filter(Boolean));
    return Object.values(window.GameData.equipmentSets || {}).map(definition => {
      const equippedItemIds = definition.itemIds.filter(id => templates.has(id));
      const bonuses = definition.bonuses.map(bonus => ({
        count: bonus.count,
        skillId: bonus.skillId,
        skill: definitions()[bonus.skillId],
        active: equippedItemIds.length >= bonus.count
      }));
      return { definition, equippedItemIds, count: equippedItemIds.length, bonuses, active: bonuses.some(bonus => bonus.active) };
    }).filter(entry => entry.count > 0);
  }
  function activeSetBonuses(instances) {
    return setProgress(instances).flatMap(entry => entry.bonuses.filter(bonus => bonus.active).map(bonus => ({ ...bonus, set: entry.definition })));
  }
  function activeIds(instances) {
    return [...new Set([
      ...(instances || []).flatMap(instance => ids(instance)),
      ...activeSetBonuses(instances).map(entry => entry.skillId)
    ])];
  }
  function setsForTemplate(templateId) {
    return Object.values(window.GameData.equipmentSets || {}).filter(definition => definition.itemIds.includes(templateId));
  }
  function equipPreviews(instances, candidate) {
    if (!candidate?.templateId) return [];
    const currentTemplates = new Set((instances || []).map(instance => instance?.templateId).filter(Boolean));
    return setsForTemplate(candidate.templateId).map(definition => {
      const currentCount = definition.itemIds.filter(itemId => currentTemplates.has(itemId)).length;
      const afterCount = Math.min(definition.itemIds.length, currentCount + (currentTemplates.has(candidate.templateId) ? 0 : 1));
      const newBonuses = definition.bonuses.filter(bonus => currentCount < bonus.count && afterCount >= bonus.count).map(bonus => ({
        ...bonus,
        skill: definitions()[bonus.skillId]
      }));
      return { definition, currentCount, afterCount, total: definition.itemIds.length, advances: afterCount > currentCount, newBonuses };
    });
  }
  function discoveryCounts() {
    return Object.fromEntries(Object.values(window.GameData.equipmentSets || {}).map(definition => [
      definition.id,
      definition.itemIds.filter(itemId => window.Encyclopedia?.item(itemId)).length
    ]));
  }
  function discoveryAdvances(previousCounts) {
    const before = previousCounts || {};
    return Object.values(window.GameData.equipmentSets || {}).map(definition => {
      const previousCount = Number(before[definition.id] || 0);
      const count = definition.itemIds.filter(itemId => window.Encyclopedia?.item(itemId)).length;
      if (count <= previousCount) return null;
      const newBonusSkillIds = definition.bonuses
        .filter(bonus => previousCount < bonus.count && count >= bonus.count)
        .map(bonus => bonus.skillId);
      return { setId: definition.id, previousCount, count, newBonusSkillIds, complete: count === definition.itemIds.length };
    }).filter(Boolean);
  }
  function descriptions(instance) { return ids(instance).map(id => definitions()[id]).filter(Boolean); }
  function pool(template) { return baseIds(template); }
  function aggregate(instances) {
    const unique = new Map();
    activeIds(instances).forEach(id => { if (definitions()[id] && !unique.has(id)) unique.set(id, definitions()[id]); });
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
    return ids(instance).map(id => ({ skill: definitions()[id], source: base.has(id) ? "固有" : upgrade.has(id) ? `強化＋${((window.GameData.relations.upgradeSkillProgression || {})[typeId(template)] || []).find(entry => entry.skillId === id)?.level}` : "超レア称号" }));
  }
  window.EquipmentSkills = { ids, activeIds, activeSetBonuses, setProgress, setsForTemplate, equipPreviews, discoveryCounts, discoveryAdvances, descriptions, pool, aggregate, title, skillSources };
})();
