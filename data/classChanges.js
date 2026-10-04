(function () {
  "use strict";
  const data = window.GameData;

  const classChanges = {
    warrior: { requirements: [{ stat: "hp", label: "HP", minimum: 110 }, { stat: "attack", label: "物理攻撃", minimum: 20 }, { stat: "defense", label: "防御", minimum: 18 }], masterSkillId: "master_rear_protection" },
    thief: { requirements: [{ stat: "speed", label: "速度", minimum: 17 }, { stat: "hitRate", label: "命中率", minimum: .98, percent: true }, { stat: "evasionRate", label: "回避率", minimum: .08, percent: true }], masterSkillId: "master_counter_stance" },
    mage: { requirements: [{ stat: "magicAttack", label: "魔法攻撃", minimum: 24 }, { stat: "magicDefense", label: "魔法防御", minimum: 16 }], masterSkillId: "master_arcane_burst" },
    cleric: { requirements: [{ stat: "magicHealing", label: "魔法回復", minimum: 24 }, { stat: "magicDefense", label: "魔法防御", minimum: 18 }, { stat: "hp", label: "HP", minimum: 80 }], masterSkillId: "master_prayer" },
    knight: { requirements: [{ stat: "hp", label: "HP", minimum: 120 }, { stat: "defense", label: "防御", minimum: 24 }, { stat: "magicDefense", label: "魔法防御", minimum: 16 }], masterSkillId: "master_rear_protection" },
    ranger: { requirements: [{ stat: "attack", label: "物理攻撃", minimum: 22 }, { stat: "hitRate", label: "命中率", minimum: 1, percent: true }, { stat: "speed", label: "速度", minimum: 15 }], masterSkillId: "master_counter_stance" },
    berserker: { requirements: [{ stat: "hp", label: "HP", minimum: 110 }, { stat: "attack", label: "物理攻撃", minimum: 29 }, { stat: "criticalRate", label: "会心率", minimum: .12, percent: true }], masterSkillId: "master_counter_stance" },
    monk: { requirements: [{ stat: "speed", label: "速度", minimum: 17 }, { stat: "evasionRate", label: "回避率", minimum: .1, percent: true }, { stat: "attack", label: "物理攻撃", minimum: 22 }], masterSkillId: "master_counter_stance" },
    samurai: { requirements: [{ stat: "attack", label: "物理攻撃", minimum: 28 }, { stat: "criticalRate", label: "会心率", minimum: .15, percent: true }, { stat: "hitRate", label: "命中率", minimum: .98, percent: true }], masterSkillId: "master_counter_stance" },
    ninja: { requirements: [{ stat: "speed", label: "速度", minimum: 19 }, { stat: "evasionRate", label: "回避率", minimum: .15, percent: true }, { stat: "criticalRate", label: "会心率", minimum: .18, percent: true }], masterSkillId: "master_counter_stance" },
    bard: { requirements: [{ stat: "magicHealing", label: "魔法回復", minimum: 22 }, { stat: "speed", label: "速度", minimum: 13 }, { stat: "magicDefense", label: "魔法防御", minimum: 17 }], masterSkillId: "master_prayer" },
    druid: { requirements: [{ stat: "magicAttack", label: "魔法攻撃", minimum: 22 }, { stat: "magicHealing", label: "魔法回復", minimum: 22 }, { stat: "magicDefense", label: "魔法防御", minimum: 18 }], masterSkillId: "master_prayer" },
    hexer: { requirements: [{ stat: "magicAttack", label: "魔法攻撃", minimum: 30 }, { stat: "magicDefense", label: "魔法防御", minimum: 20 }], masterSkillId: "master_arcane_burst" },
    spellblade: { requirements: [{ stat: "attack", label: "物理攻撃", minimum: 23 }, { stat: "magicAttack", label: "魔法攻撃", minimum: 23 }, { stat: "defense", label: "防御", minimum: 16 }], masterSkillId: "master_arcane_burst" },
    summoner: { requirements: [{ stat: "magicAttack", label: "魔法攻撃", minimum: 26 }, { stat: "magicHealing", label: "魔法回復", minimum: 20 }, { stat: "magicDefense", label: "魔法防御", minimum: 18 }], masterSkillId: "master_prayer" }
  };
  data.registry.config("classChanges", classChanges);
})();
