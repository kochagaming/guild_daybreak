(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};
  const races = {
    human: { id: "human", name: "人間", description: "偏りのない能力と柔軟な戦い方。" },
    elf: { id: "elf", name: "エルフ", description: "HPは低いが素早く、細剣・弓と布装備に優れる。", hpMultiplier: .9, magicAttackMultiplier: 1.1, magicDefenseMultiplier: 1.1, speedBonus: 2, criticalBonus: .03, hitBonus: .01, evasionBonus: .03, weightMultiplier: .9 },
    dwarf: { id: "dwarf", name: "ドワーフ", description: "頑丈で重装備・盾・小手が得意だが、動きは遅い。", hpMultiplier: 1.15, defenseMultiplier: 1.1, magicDefenseMultiplier: 1.1, speedBonus: -2, evasionBonus: -.01, weightMultiplier: 1.2, statusResistances: { poison: .12, burn: .12, chill: .15 } },
    beastkin: { id: "beastkin", name: "獣人", description: "高い速度と会心率を持つ野性的な種族。", hpMultiplier: 1.02, attackMultiplier: 1.08, speedBonus: 2, criticalBonus: .05, hitBonus: .01, evasionBonus: .03, weightMultiplier: 1.02 },
    halfling: { id: "halfling", name: "ハーフリング", unlockAfter: "roadside", description: "小柄で身軽。高い回避と命中で危機を切り抜ける。", hpMultiplier: .86, defenseMultiplier: .92, speedBonus: 3, criticalBonus: .04, hitBonus: .03, evasionBonus: .07, weightMultiplier: .72 },
    gnome: { id: "gnome", name: "ノーム", unlockAfter: "roadside", description: "魔法と工作に秀でた小柄な知恵者。", hpMultiplier: .88, magicAttackMultiplier: 1.14, magicDefenseMultiplier: 1.12, weightMultiplier: .78, speedBonus: 1 },
    orc: { id: "orc", name: "オーク", unlockAfter: "roadside", description: "強靭な体と腕力を持つが、魔法には不慣れ。", hpMultiplier: 1.22, attackMultiplier: 1.16, defenseMultiplier: 1.04, magicAttackMultiplier: .72, magicDefenseMultiplier: .82, magicHealingMultiplier: .7, weightMultiplier: 1.25, speedBonus: -1 },
    goblin: { id: "goblin", name: "ゴブリン", unlockAfter: "roadside", description: "非力だが素早く、急所を狙うことに長ける。", hpMultiplier: .88, attackMultiplier: .96, defenseMultiplier: .84, speedBonus: 3, criticalBonus: .07, hitBonus: .02, evasionBonus: .05, weightMultiplier: .8 },
    dragonewt: { id: "dragonewt", name: "竜人", unlockAfter: "seal", description: "高いHPと魔法耐性を併せ持つ竜の末裔。", hpMultiplier: 1.18, attackMultiplier: 1.1, defenseMultiplier: 1.08, magicAttackMultiplier: 1.08, magicDefenseMultiplier: 1.2, weightMultiplier: 1.18, speedBonus: -1, elementModifiers: { fire: .75 }, statusResistances: { burn: .35 } },
    fairy: { id: "fairy", name: "妖精", unlockAfter: "seal", description: "非常に軽く脆いが、魔法・回復・回避に優れる。", hpMultiplier: .68, defenseMultiplier: .68, magicAttackMultiplier: 1.25, magicDefenseMultiplier: 1.18, magicHealingMultiplier: 1.22, weightMultiplier: .5, speedBonus: 4, evasionBonus: .1 },
    automaton: { id: "automaton", name: "機巧人", unlockAfter: "seal", description: "重く頑丈な人工生命。回避は低いが防御が高い。", hpMultiplier: 1.12, defenseMultiplier: 1.25, magicDefenseMultiplier: 1.05, magicHealingMultiplier: .75, weightMultiplier: 1.35, speedBonus: -2, evasionBonus: -.02, statusResistances: { poison: 1, paralysis: .2, chill: .25 } },
    giantkin: { id: "giantkin", name: "巨人族", unlockAfter: "seal", description: "圧倒的なHP・攻撃・装備重量を持つ大型種族。", hpMultiplier: 1.35, attackMultiplier: 1.2, defenseMultiplier: 1.08, weightMultiplier: 1.5, speedBonus: -3, hitBonus: -.02, evasionBonus: -.03 },
    demonkin: { id: "demonkin", name: "魔族", unlockAfter: "starfall", description: "攻撃魔法と会心に優れ、聖なる回復は不得手。", hpMultiplier: .94, attackMultiplier: 1.05, magicAttackMultiplier: 1.25, magicDefenseMultiplier: 1.12, magicHealingMultiplier: .72, criticalBonus: .04, weightMultiplier: .9 },
    celestial: { id: "celestial", name: "天翼人", unlockAfter: "starfall", description: "魔法防御と回復に優れる空の民。", hpMultiplier: .92, magicAttackMultiplier: 1.08, magicDefenseMultiplier: 1.28, magicHealingMultiplier: 1.3, speedBonus: 2, evasionBonus: .05, weightMultiplier: .82, elementModifiers: { lightning: .8, dark: 1.2 }, statusResistances: { paralysis: .2 } },
    undead: { id: "undead", name: "不死者", unlockAfter: "starfall", description: "高い耐久と魔法耐性を持つが、行動は遅い。", hpMultiplier: 1.2, defenseMultiplier: 1.05, magicDefenseMultiplier: 1.3, magicHealingMultiplier: .6, weightMultiplier: 1.08, speedBonus: -2, criticalBonus: .02, elementModifiers: { dark: .7, fire: 1.15 }, statusResistances: { poison: 1 } }
  };
  const raceAttributeModifiers = {
    human: {},
    elf: { vitality: -1, strength: -1, fortitude: -1, intelligence: 2, spirit: 2, dexterity: 2, agility: 1, luck: 1 },
    dwarf: { vitality: 2, strength: 1, fortitude: 3, spirit: 1, dexterity: 1, agility: -2 },
    beastkin: { vitality: 1, strength: 2, intelligence: -1, dexterity: 1, agility: 3, luck: 1 },
    halfling: { vitality: -2, strength: -2, fortitude: -1, dexterity: 2, agility: 4, luck: 3 },
    gnome: { vitality: -1, strength: -2, intelligence: 3, spirit: 2, dexterity: 3, agility: 1, luck: 1 },
    orc: { vitality: 3, strength: 4, fortitude: 2, intelligence: -3, spirit: -2, dexterity: -1, agility: -1 },
    goblin: { vitality: -1, strength: -2, fortitude: -2, spirit: -1, dexterity: 2, agility: 4, luck: 3 },
    dragonewt: { vitality: 3, strength: 2, fortitude: 2, intelligence: 1, spirit: 2, agility: -1 },
    fairy: { vitality: -4, strength: -4, fortitude: -3, intelligence: 4, spirit: 3, dexterity: 2, agility: 4, luck: 2 },
    automaton: { vitality: 2, strength: 1, fortitude: 4, intelligence: 1, dexterity: 2, agility: -2, luck: -2 },
    giantkin: { vitality: 5, strength: 5, fortitude: 2, intelligence: -3, spirit: -2, dexterity: -2, agility: -3, luck: -1 },
    demonkin: { strength: 1, fortitude: -1, intelligence: 4, spirit: 2, dexterity: 1, agility: 1, luck: 2 },
    celestial: { strength: -2, fortitude: -1, intelligence: 2, spirit: 4, dexterity: 1, agility: 2, luck: 1 },
    undead: { vitality: 3, strength: 1, fortitude: 2, intelligence: 1, spirit: 4, dexterity: -1, agility: -2, luck: -2 }
  };
  const births = {
    common: { id: "common", name: "平凡な家", description: "特別な補正がない、自由な出自。" },
    guard: { id: "guard", name: "衛兵の家", description: "HP・防御・重量上限と剣・重装備・盾を伸ばす。", hpMultiplier: 1.08, defenseMultiplier: 1.08, weightMultiplier: 1.1 },
    hunter: { id: "hunter", name: "狩人の家", description: "速度・会心率と細剣・弓・革装備・小手を伸ばす。", speedBonus: 1, criticalBonus: .04, hitBonus: .02, evasionBonus: .02 },
    arcane: { id: "arcane", name: "魔術師の家", description: "攻撃力とスキル威力、杖・布装備を伸ばす。", attackMultiplier: 1.1, magicAttackMultiplier: 1.1, magicDefenseMultiplier: 1.08, skillPower: 1.1 },
    sacred: { id: "sacred", name: "神官の家", description: "回復威力と杖・布装備を伸ばす。", magicHealingMultiplier: 1.15, magicDefenseMultiplier: 1.1, healingPower: 1.2 },
    noble: { id: "noble", name: "貴族の家", unlockAfter: "roadside", description: "教育と指揮術を受け、守りと魔法耐性に優れる。", defenseMultiplier: 1.05, magicDefenseMultiplier: 1.08, weightMultiplier: 1.05 },
    mercenary: { id: "mercenary", name: "傭兵団育ち", unlockAfter: "roadside", description: "実戦経験により攻撃・HP・革装備を伸ばす。", hpMultiplier: 1.06, attackMultiplier: 1.08, criticalBonus: .02, weightMultiplier: 1.08 },
    merchant: { id: "merchant", name: "商家の生まれ", unlockAfter: "roadside", description: "護身と目利きを学び、命中と回避に優れる。", hitBonus: .02, evasionBonus: .02, speedBonus: 1 },
    blacksmith: { id: "blacksmith", name: "鍛冶師の家", unlockAfter: "seal", description: "重装備と武器の扱いに慣れ、重量上限が高い。", attackMultiplier: 1.05, defenseMultiplier: 1.08, weightMultiplier: 1.18 },
    scholar: { id: "scholar", name: "学者の家", unlockAfter: "seal", description: "魔法攻撃・魔法防御と杖の扱いを伸ばす。", magicAttackMultiplier: 1.12, magicDefenseMultiplier: 1.12, hitBonus: .01 },
    frontier: { id: "frontier", name: "辺境の村", unlockAfter: "seal", description: "厳しい環境で鍛えられ、HP・回避・革装備に優れる。", hpMultiplier: 1.1, speedBonus: 1, evasionBonus: .03, weightMultiplier: 1.05 },
    orphan: { id: "orphan", name: "孤児院育ち", unlockAfter: "seal", description: "身軽さと機転で生き抜き、速度と会心が高い。", hpMultiplier: .96, speedBonus: 2, criticalBonus: .04, evasionBonus: .03, weightMultiplier: .92 },
    troupe: { id: "troupe", name: "旅芸人一座", unlockAfter: "starfall", description: "身のこなしと歌に長け、速度・回避・回復を伸ばす。", speedBonus: 2, evasionBonus: .04, magicHealingMultiplier: 1.08 },
    alchemist: { id: "alchemist", name: "錬金工房", unlockAfter: "starfall", description: "魔力と精密作業を学び、魔法・命中・小手に優れる。", magicAttackMultiplier: 1.12, magicHealingMultiplier: 1.08, hitBonus: .03, statusResistances: { poison: .25, burn: .15 } },
    dragon_ward: { id: "dragon_ward", name: "竜守の里", unlockAfter: "starfall", description: "竜との戦いに備え、HP・魔法防御・重装備を鍛える。", hpMultiplier: 1.1, attackMultiplier: 1.05, magicDefenseMultiplier: 1.15, weightMultiplier: 1.12, elementModifiers: { fire: .85, lightning: .9 } }
  };
  const birthAttributeModifiers = {
    common: {}, guard: { vitality: 1, strength: 1, fortitude: 2 }, hunter: { dexterity: 2, agility: 1, luck: 1 },
    arcane: { intelligence: 2, spirit: 1, dexterity: 1 }, sacred: { intelligence: 1, spirit: 3 },
    noble: { fortitude: 1, intelligence: 1, spirit: 1 }, mercenary: { vitality: 1, strength: 2, fortitude: 1 },
    merchant: { dexterity: 1, agility: 1, luck: 2 }, blacksmith: { strength: 1, fortitude: 2, dexterity: 1 },
    scholar: { intelligence: 2, spirit: 1, dexterity: 2 }, frontier: { vitality: 2, fortitude: 1, agility: 1 },
    orphan: { vitality: -1, dexterity: 2, agility: 2, luck: 2 }, troupe: { spirit: 1, dexterity: 1, agility: 2, luck: 1 },
    alchemist: { intelligence: 2, spirit: 1, dexterity: 2, luck: 1 }, dragon_ward: { vitality: 2, strength: 1, fortitude: 1, spirit: 2 }
  };
  Object.entries(races).forEach(([id, race]) => { race.attributeModifiers = Object.freeze(Object.assign({}, raceAttributeModifiers[id])); });
  Object.entries(births).forEach(([id, birth]) => { birth.attributeModifiers = Object.freeze(Object.assign({}, birthAttributeModifiers[id])); });
  data.registry.entities("races", races);
  data.registry.entities("births", births);
})();
