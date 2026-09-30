(function () {
  "use strict";
  const data = window.GameData;
  const jobs = {
    warrior: [0.7, 0.85, 0.6, .96, .03], thief: [0.75, 0.8, 0.65, .99, .12],
    mage: [1.35, 1.2, 0.9, .95, .04], cleric: [1, 1.25, 1.3, .96, .04]
  };
  Object.entries(jobs).forEach(([id, values]) => Object.assign(data.jobs[id], {
    magicAttackMultiplier: values[0], magicDefenseMultiplier: values[1], magicHealingMultiplier: values[2], hitRate: values[3], evasionRate: values[4]
  }));
  Object.assign(data.races.elf, { magicAttackMultiplier: 1.1, magicDefenseMultiplier: 1.1, hitBonus: .01, evasionBonus: .03 });
  Object.assign(data.races.dwarf, { magicDefenseMultiplier: 1.1, evasionBonus: -.01 });
  Object.assign(data.births.arcane, { magicAttackMultiplier: 1.1, magicDefenseMultiplier: 1.08 });
  Object.assign(data.births.sacred, { magicHealingMultiplier: 1.15, magicDefenseMultiplier: 1.1 });
  Object.assign(data.births.hunter, { hitBonus: .02, evasionBonus: .02 });
  Object.values(data.items).filter(item => item.type !== "material").forEach(item => {
    item.magicAttack = item.magicAttack ?? (item.weaponType === "staff" ? item.attack || 0 : 0);
    item.magicHealing = item.magicHealing ?? (item.weaponType === "staff" ? Math.round((item.attack || 0) * .8) : 0);
    item.magicDefense = item.type === "armor" ? Math.round((item.defense || 0) * (item.armorType === "cloth" ? 1.5 : .6)) : 0;
  });
  Object.values(data.monsters).forEach(monster => {
    monster.magicAttack = monster.magicAttack ?? monster.attack;
    monster.magicDefense = monster.magicDefense ?? Math.round(monster.defense * .75);
    monster.hitRate = monster.hitRate ?? (monster.boss ? 1 : .95);
    monster.evasionRate = monster.evasionRate ?? (monster.boss ? .02 : .03);
  });
  ["wraith", "rune_guardian"].forEach(id => { data.monsters[id].damageType = "magic"; });
})();
