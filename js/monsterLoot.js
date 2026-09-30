(function () {
  "use strict";
  function familyIdsForRace(raceId) { return (window.GameData.adventurerFamilies?.[raceId] || []).slice(); }
  function familyIdsForMonster(monsterId) { return (window.GameData.monsterFamilies?.[monsterId] || []).slice(); }
  function familyIds(unit) {
    if (Array.isArray(unit?.familyIds)) return unit.familyIds;
    return unit?.side === "enemy" ? familyIdsForMonster(unit.id) : familyIdsForRace(unit?.raceId);
  }
  function labels(ids) { return (ids || []).map(id => window.GameData.creatureFamilies?.[id]?.name).filter(Boolean); }

  function standardPool(dungeon) {
    const all = Object.values(window.GameData.items).filter(item => (item.type === "weapon" || item.type === "armor") && !item.unique && !item.craftOnly && !item.dropOnly);
    const maximumTier = Math.max(1, ...all.map(item => item.tier || 1));
    const targetTier = Math.min(maximumTier, Math.max(1, 1 + Math.floor((dungeon.recommendedLevel - 1) / 6)));
    const exact = all.filter(item => (item.tier || 1) === targetTier);
    return exact.length ? exact : all.filter(item => (item.tier || 1) === Math.max(1, targetTier - 1));
  }
  function allowedTypes(monster) {
    const weaponTypes = new Set(), armorTypes = new Set();
    familyIdsForMonster(monster.id).forEach(id => {
      const family = window.GameData.creatureFamilies[id];
      (family?.weaponTypes || []).forEach(type => weaponTypes.add(type));
      (family?.armorTypes || []).forEach(type => armorTypes.add(type));
    });
    return { weaponTypes, armorTypes };
  }
  function candidates(dungeon, monster) {
    let pool = standardPool(dungeon), allowed = allowedTypes(monster);
    let weapons = pool.filter(item => item.type === "weapon" && allowed.weaponTypes.has(item.weaponType));
    let armor = pool.filter(item => item.type === "armor" && allowed.armorTypes.has(item.armorType));
    if (!weapons.length && !armor.length) {
      const tier = Math.max(1, ...pool.map(item => item.tier || 1));
      pool = Object.values(window.GameData.items).filter(item => !item.unique && !item.craftOnly && !item.dropOnly && ["weapon", "armor"].includes(item.type) && (item.tier || 1) < tier);
      weapons = pool.filter(item => item.type === "weapon" && allowed.weaponTypes.has(item.weaponType));
      armor = pool.filter(item => item.type === "armor" && allowed.armorTypes.has(item.armorType));
    }
    return { pool, weapons, armor };
  }
  function choose(random, values) { return values[Math.floor(random() * values.length)]; }
  function roll(random, dungeon, monster) {
    const config = window.GameData.monsterLoot || {};
    const baseChance = (monster.boss ? config.bossChance || .2 : config.normalChance || .1) * (dungeon.equipmentDropRate || 1);
    const chance = window.AcquisitionSkills ? window.AcquisitionSkills.chance(baseChance, dungeon.itemRateModifier) : baseChance;
    if (random() >= chance) return null;
    const lists = candidates(dungeon, monster);
    let selected = null;
    if (lists.weapons.length && lists.armor.length) selected = choose(random, random() < (config.weaponWeight || .62) ? lists.weapons : lists.armor);
    else selected = choose(random, lists.weapons.length ? lists.weapons : lists.armor.length ? lists.armor : lists.pool);
    return selected ? { itemId: selected.id, quantity: 1 } : null;
  }
  function preview(dungeon, monster) { return candidates(dungeon, monster).pool.filter(item => {
    const allowed = allowedTypes(monster);
    return item.type === "weapon" ? allowed.weaponTypes.has(item.weaponType) : allowed.armorTypes.has(item.armorType);
  }); }

  window.CreatureFamilies = { familyIdsForRace, familyIdsForMonster, familyIds, labels };
  window.MonsterLoot = { standardPool, candidates, roll, preview };
})();
