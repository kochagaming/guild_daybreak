(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};

  data.elements = {
    neutral: { id: "neutral", name: "無属性", icon: "◇" },
    fire: { id: "fire", name: "炎", icon: "🔥" },
    ice: { id: "ice", name: "氷", icon: "❄" },
    lightning: { id: "lightning", name: "雷", icon: "ϟ" },
    nature: { id: "nature", name: "自然", icon: "❧" },
    dark: { id: "dark", name: "闇", icon: "☾" },
    arcane: { id: "arcane", name: "魔力", icon: "✦" }
  };
  data.statusEffects = {
    poison: { id: "poison", name: "毒", icon: "☠", defaultDuration: 3, defaultPotency: .04, periodic: true, description: "ターン開始時に最大HPの4%前後のダメージ" },
    burn: { id: "burn", name: "火傷", icon: "🔥", defaultDuration: 3, defaultPotency: .03, periodic: true, attackMultiplier: .9, description: "ターン開始時にダメージを受け、物理攻撃力が10%低下" },
    paralysis: { id: "paralysis", name: "麻痺", icon: "ϟ", defaultDuration: 1, skipTurn: true, description: "次のターンの行動を行えない" },
    chill: { id: "chill", name: "凍寒", icon: "❄", defaultDuration: 3, speedMultiplier: .7, evasionMultiplier: .65, description: "行動速度30%・回避35%低下" }
  };

  Object.assign(data.races.dwarf, { statusResistances: { poison: .12, burn: .12, chill: .15 } });
  Object.assign(data.races.dragonewt, { elementModifiers: { fire: .75 }, statusResistances: { burn: .35 } });
  Object.assign(data.races.automaton, { statusResistances: { poison: 1, paralysis: .2, chill: .25 } });
  Object.assign(data.races.celestial, { elementModifiers: { lightning: .8, dark: 1.2 }, statusResistances: { paralysis: .2 } });
  Object.assign(data.races.undead, { elementModifiers: { dark: .7, fire: 1.15 }, statusResistances: { poison: 1 } });
  Object.assign(data.births.alchemist, { statusResistances: { poison: .25, burn: .15 } });
  Object.assign(data.births.dragon_ward, { elementModifiers: { fire: .85, lightning: .9 } });

  Object.assign(data.monsters.slime, { elementModifiers: { fire: 1.25, ice: .75 }, statusResistances: { poison: .5 } });
  Object.assign(data.monsters.cave_spider, { elementModifiers: { fire: 1.25, nature: .75 }, statusAttack: { statusId: "poison", chance: .35, duration: 3, potency: .04 } });
  Object.assign(data.monsters.stone_golem, { elementModifiers: { lightning: 1.2, fire: .8 }, statusResistances: { poison: 1, paralysis: .5 } });
  Object.assign(data.monsters.wraith, { element: "dark", elementModifiers: { dark: .65, fire: 1.15 }, statusResistances: { poison: 1 }, statusAttack: { statusId: "paralysis", chance: .25, duration: 1 } });
  Object.assign(data.monsters.rune_guardian, { element: "arcane", elementModifiers: { arcane: .7, lightning: 1.2 }, statusResistances: { paralysis: .35 } });
  Object.assign(data.monsters.ancient_sentinel, { element: "arcane", elementModifiers: { arcane: .7, lightning: 1.2 }, statusResistances: { poison: .6, paralysis: .5 } });
  Object.assign(data.monsters.star_harrier, { element: "lightning", elementModifiers: { lightning: .65, ice: 1.25 }, statusAttack: { statusId: "paralysis", chance: .2, duration: 1 } });
  Object.assign(data.monsters.sky_knight, { element: "lightning", elementModifiers: { lightning: .75, ice: 1.15 }, statusResistances: { paralysis: .3 } });
  Object.assign(data.monsters.storm_regent, { element: "lightning", elementModifiers: { lightning: .5, ice: 1.3 }, statusResistances: { poison: .5, paralysis: .7 } });
})();
