(function () {
  "use strict";
  const data = window.GameData;
  const itemCombatStats = Object.fromEntries(Object.values(data.items).filter(item => item.type !== "material").map(item => [item.id, {
      magicAttack: item.magicAttack ?? (item.weaponType === "staff" ? item.attack || 0 : 0),
      magicHealing: item.magicHealing ?? (item.weaponType === "staff" ? Math.round((item.attack || 0) * .8) : 0),
      magicDefense: item.magicDefense ?? (item.type === "armor" ? Math.round((item.defense || 0) * (item.armorType === "cloth" ? 1.5 : .6)) : 0)
    }]));
  const monsterCombatStats = Object.fromEntries(Object.values(data.monsters).map(monster => [monster.id, {
      magicAttack: monster.magicAttack ?? monster.attack,
      magicDefense: monster.magicDefense ?? Math.round(monster.defense * .75),
      hitRate: monster.hitRate ?? (monster.boss ? 1 : .95),
      evasionRate: monster.evasionRate ?? (monster.boss ? .02 : .03)
    }]));
  data.registry.derived("itemCombatStats", itemCombatStats);
  data.registry.derived("monsterCombatStats", monsterCombatStats);
})();
