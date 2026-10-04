(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};
  const labels = { hp: "HP", attack: "攻撃", defense: "防御", magicAttack: "魔法攻撃", magicDefense: "魔法防御", magicHealing: "魔法回復", hitRate: "命中", evasionRate: "回避", speed: "速度", attackCount: "攻撃回数" };
  const profiles = {
    rapier: { attack: 4, hitRate: 7, speed: 5, evasionRate: 3, attackCount: 5 },
    sword: { attack: 6, hp: 3, defense: 2, speed: 2, hitRate: 3, attackCount: 2 },
    katana: { attack: 8, hitRate: 2, speed: 2, hp: 2 },
    bow: { attack: 3, hitRate: 6, speed: 4, evasionRate: 2, attackCount: 6 },
    staff: { magicAttack: 6, magicHealing: 5, magicDefense: 3, hp: 2 },
    cloth: { magicDefense: 5, magicHealing: 3, evasionRate: 5, hp: 3 },
    leather: { evasionRate: 5, speed: 4, hp: 3, defense: 3, attackCount: 1 },
    heavy: { hp: 5, defense: 6, magicDefense: 3 },
    shield: { defense: 7, magicDefense: 5, hp: 5 },
    gauntlet: { attack: 4, defense: 3, hitRate: 6, speed: 4, attackCount: 2 }
  };
  data.registry.config("affixes", { labels, profiles });
})();
