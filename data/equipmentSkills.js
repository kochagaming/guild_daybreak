(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};
  const skill = (id, name, description, effects) => ({ id, name, description, effects });
  const multiplier = (stat, value) => ({ type: "multiplier", stat, value });
  const bonus = (stat, value) => ({ type: "bonus", stat, value });
  const power = (damageType, value) => ({ type: "power", damageType, value });
  const conversion = (source, target, value) => ({ type: "conversion", source, target, value });
  const slayer = (familyId, value) => ({ type: "slayer", familyId, value });
  const statusResistance = (statusId, value) => ({ type: "statusResistance", statusId, value });
  data.equipmentSkills = Object.fromEntries([
    skill("physical_power_3", "物理攻撃威力+3%", "物理攻撃で与えるダメージが3%増加する。", [power("physical", .03)]),
    skill("magic_power_3", "魔法攻撃威力+3%", "魔法攻撃で与えるダメージが3%増加する。", [power("magic", .03)]),
    skill("attack_105", "物理攻撃力1.05倍", "装備を含む物理攻撃力が1.05倍になる。", [multiplier("attack", 1.05)]),
    skill("defense_105", "防御力1.05倍", "装備を含む物理防御力が1.05倍になる。", [multiplier("defense", 1.05)]),
    skill("hp_105", "最大HP1.05倍", "装備を含む最大HPが1.05倍になる。", [multiplier("hp", 1.05)]),
    skill("magic_attack_105", "魔法攻撃力1.05倍", "装備を含む魔法攻撃力が1.05倍になる。", [multiplier("magicAttack", 1.05)]),
    skill("magic_defense_105", "魔法防御力1.05倍", "装備を含む魔法防御力が1.05倍になる。", [multiplier("magicDefense", 1.05)]),
    skill("magic_healing_105", "魔法回復力1.05倍", "装備を含む魔法回復力が1.05倍になる。", [multiplier("magicHealing", 1.05)]),
    skill("accuracy_4", "命中精度+4%", "命中精度が4ポイント増加する。", [bonus("hitRate", .04)]),
    skill("evasion_4", "回避率+4%", "回避率が4ポイント増加する。", [bonus("evasionRate", .04)]),
    skill("speed_2", "行動速度+2", "行動速度が2増加する。", [bonus("speed", 2)]),
    skill("critical_4", "会心率+4%", "会心率が4ポイント増加する。", [bonus("criticalRate", .04)]),
    skill("attack_count_1", "攻撃回数+1", "通常攻撃の攻撃回数が1増加する。", [bonus("attackCount", 1)]),
    skill("healing_power_5", "回復威力+5%", "技・呪文による回復量が5%増加する。", [{ type: "healingPower", value: .05 }]),
    skill("chill_resistance_20", "凍寒耐性+20%", "凍寒を受ける確率を20%軽減する。種族・生まれによる耐性とは確率合成される。", [statusResistance("chill", .2)]),
    skill("chill_resistance_35", "凍寒耐性+35%", "凍寒を受ける確率を35%軽減する。種族・生まれによる耐性とは確率合成される。", [statusResistance("chill", .35)]),
    skill("paralysis_resistance_20", "麻痺耐性+20%", "麻痺を受ける確率を20%軽減する。種族・生まれによる耐性とは確率合成される。", [statusResistance("paralysis", .2)]),
    skill("paralysis_resistance_35", "麻痺耐性+35%", "麻痺を受ける確率を35%軽減する。種族・生まれによる耐性とは確率合成される。", [statusResistance("paralysis", .35)]),
    skill("poison_resistance_20", "毒耐性+20%", "毒を受ける確率を20%軽減する。種族・生まれによる耐性とは確率合成される。", [statusResistance("poison", .2)]),
    skill("poison_resistance_35", "毒耐性+35%", "毒を受ける確率を35%軽減する。種族・生まれによる耐性とは確率合成される。", [statusResistance("poison", .35)]),
    skill("burn_resistance_20", "火傷耐性+20%", "火傷を受ける確率を20%軽減する。種族・生まれによる耐性とは確率合成される。", [statusResistance("burn", .2)]),
    skill("burn_resistance_35", "火傷耐性+35%", "火傷を受ける確率を35%軽減する。種族・生まれによる耐性とは確率合成される。", [statusResistance("burn", .35)]),
    skill("attack_to_hp_1", "ステータス変換1% 攻撃力→HP", "物理攻撃力の1%を最大HPへ加算する。", [conversion("attack", "hp", .01)]),
    skill("defense_to_hp_2", "ステータス変換2% 防御力→HP", "物理防御力の2%を最大HPへ加算する。", [conversion("defense", "hp", .02)]),
    skill("magic_attack_to_hp_1", "ステータス変換1% 魔法攻撃力→HP", "魔法攻撃力の1%を最大HPへ加算する。", [conversion("magicAttack", "hp", .01)]),
    skill("magic_healing_to_hp_1", "ステータス変換1% 魔法回復力→HP", "魔法回復力の1%を最大HPへ加算する。", [conversion("magicHealing", "hp", .01)]),
    skill("beast_slayer_10", "獣特攻1.10倍", "獣分類の敵へ与えるダメージが1.10倍になる。", [slayer("beast", 1.1)]),
    skill("construct_slayer_15", "造物特攻1.15倍", "機械・造物分類の敵へ与えるダメージが1.15倍になる。", [slayer("construct", 1.15)]),
    skill("dragon_slayer_10", "竜特攻1.10倍", "竜分類の敵へ与えるダメージが1.10倍になる。", [slayer("dragon", 1.1)]),
    skill("undead_slayer_20", "不死特攻1.20倍", "不死分類の敵へ与えるダメージが1.20倍になる。", [slayer("undead", 1.2)]),
    skill("plant_slayer_15", "植物特攻1.15倍", "植物分類の敵へ与えるダメージが1.15倍になる。", [slayer("plant", 1.15)]),
    skill("demon_slayer_15", "魔族特攻1.15倍", "魔族分類の敵へ与えるダメージが1.15倍になる。", [slayer("demon", 1.15)]),
    skill("rapier_training", "細剣術", "命中精度と会心率が上昇する。", [bonus("hitRate", .03), bonus("criticalRate", .02)]),
    skill("rapier_mastery", "連撃の間合い", "攻撃回数が1増加する。", [bonus("attackCount", 1)]),
    skill("sword_training", "剣術", "物理攻撃力が1.05倍になる。", [multiplier("attack", 1.05)]),
    skill("sword_mastery", "攻防一体", "物理攻撃威力と防御力が上昇する。", [power("physical", .04), multiplier("defense", 1.05)]),
    skill("katana_training", "斬撃の冴え", "物理攻撃威力が6%増加する。", [power("physical", .06)]),
    skill("katana_mastery", "一刀の極意", "会心率が6ポイント増加する。", [bonus("criticalRate", .06)]),
    skill("bow_training", "遠射術", "命中精度が6ポイント増加する。", [bonus("hitRate", .06)]),
    skill("bow_mastery", "連射術", "攻撃回数が1増加する。", [bonus("attackCount", 1)]),
    skill("staff_training", "魔力収束", "魔法攻撃威力が5%増加する。", [power("magic", .05)]),
    skill("staff_mastery", "祈りの導管", "魔法攻撃力と魔法回復力が1.05倍になる。", [multiplier("magicAttack", 1.05), multiplier("magicHealing", 1.05)]),
    skill("cloth_training", "魔力織り", "魔法防御力と魔法回復力が1.05倍になる。", [multiplier("magicDefense", 1.05), multiplier("magicHealing", 1.05)]),
    skill("cloth_mastery", "術式補助", "魔法攻撃威力と回復威力が増加する。", [power("magic", .04), { type: "healingPower", value: .06 }]),
    skill("leather_training", "軽装歩法", "行動速度と回避率が上昇する。", [bonus("speed", 2), bonus("evasionRate", .03)]),
    skill("leather_mastery", "影走り", "命中精度・回避率・会心率が上昇する。", [bonus("hitRate", .03), bonus("evasionRate", .03), bonus("criticalRate", .03)]),
    skill("heavy_training", "重装訓練", "最大HPと物理防御力が1.05倍になる。", [multiplier("hp", 1.05), multiplier("defense", 1.05)]),
    skill("heavy_mastery", "不動の構え", "物理防御力と魔法防御力が1.08倍になる。", [multiplier("defense", 1.08), multiplier("magicDefense", 1.08)]),
    skill("shield_training", "盾術", "物理防御力が1.05倍になる。", [multiplier("defense", 1.05)]),
    skill("shield_mastery", "堅牢な守り", "最大HPと魔法防御力が1.08倍になる。", [multiplier("hp", 1.08), multiplier("magicDefense", 1.08)]),
    skill("gauntlet_training", "篭手捌き", "物理攻撃力と命中精度が上昇する。", [multiplier("attack", 1.05), bonus("hitRate", .03)]),
    skill("gauntlet_mastery", "連環の型", "攻撃回数と行動速度が増加する。", [bonus("attackCount", 1), bonus("speed", 2)]),
    skill("ultra_worldbreaker", "世界を砕く力", "物理攻撃威力が18%増加する。", [power("physical", .18)]),
    skill("ultra_starcaster", "星界の魔力", "魔法攻撃威力が18%増加する。", [power("magic", .18)]),
    skill("ultra_eternal", "不滅の生命", "最大HPが1.25倍になる。", [multiplier("hp", 1.25)]),
    skill("ultra_bastion", "絶対城塞", "物理防御力と魔法防御力が1.18倍になる。", [multiplier("defense", 1.18), multiplier("magicDefense", 1.18)]),
    skill("ultra_gale", "時を追い越す歩み", "行動速度+5、回避率+8%。", [bonus("speed", 5), bonus("evasionRate", .08)]),
    skill("ultra_fate", "運命を射抜く眼", "命中精度+10%、会心率+8%。", [bonus("hitRate", .1), bonus("criticalRate", .08)]),
    skill("ultra_lifebringer", "命を巡らせる祈り", "魔法回復力1.20倍、回復威力+20%。", [multiplier("magicHealing", 1.2), { type: "healingPower", value: .2 }]),
    skill("ultra_transcendent", "理を越えた才", "物理攻撃力と魔法攻撃力が1.12倍になる。", [multiplier("attack", 1.12), multiplier("magicAttack", 1.12)])
  ].map(entry => [entry.id, entry]));
  data.upgradeSkillProgression = {
    rapier: [{ level: 3, skillId: "rapier_training" }, { level: 6, skillId: "rapier_mastery" }],
    sword: [{ level: 3, skillId: "sword_training" }, { level: 6, skillId: "sword_mastery" }],
    katana: [{ level: 3, skillId: "katana_training" }, { level: 6, skillId: "katana_mastery" }],
    bow: [{ level: 3, skillId: "bow_training" }, { level: 6, skillId: "bow_mastery" }],
    staff: [{ level: 3, skillId: "staff_training" }, { level: 6, skillId: "staff_mastery" }],
    cloth: [{ level: 3, skillId: "cloth_training" }, { level: 6, skillId: "cloth_mastery" }],
    leather: [{ level: 3, skillId: "leather_training" }, { level: 6, skillId: "leather_mastery" }],
    heavy: [{ level: 3, skillId: "heavy_training" }, { level: 6, skillId: "heavy_mastery" }],
    shield: [{ level: 3, skillId: "shield_training" }, { level: 6, skillId: "shield_mastery" }],
    gauntlet: [{ level: 3, skillId: "gauntlet_training" }, { level: 6, skillId: "gauntlet_mastery" }]
  };
})();
