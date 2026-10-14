(function () {
  "use strict";

  const data = window.GameData = window.GameData || {};
  const attributeOrder = Object.freeze(["vitality", "strength", "fortitude", "intelligence", "spirit", "dexterity", "agility", "luck"]);
  const attributeDefinitions = Object.freeze({
    vitality: Object.freeze({ id: "vitality", name: "生命", shortName: "生命", description: "最大HPと回復を受ける力の基礎。" }),
    strength: Object.freeze({ id: "strength", name: "筋力", shortName: "筋力", description: "物理攻撃、物理威力、装備可能重量の基礎。" }),
    fortitude: Object.freeze({ id: "fortitude", name: "頑健", shortName: "頑健", description: "物理防御、最大HP、肉体系の耐性の基礎。" }),
    intelligence: Object.freeze({ id: "intelligence", name: "知力", shortName: "知力", description: "魔法攻撃、呪文威力、呪文による状態異常成功の基礎。" }),
    spirit: Object.freeze({ id: "spirit", name: "精神", shortName: "精神", description: "魔法防御、魔法回復、回復威力、精神系の耐性の基礎。" }),
    dexterity: Object.freeze({ id: "dexterity", name: "技巧", shortName: "技巧", description: "命中、会心、攻撃回数を支える技量。" }),
    agility: Object.freeze({ id: "agility", name: "敏捷", shortName: "敏捷", description: "行動速度、回避、攻撃回数を支える身軽さ。" }),
    luck: Object.freeze({ id: "luck", name: "幸運", shortName: "幸運", description: "会心、状態異常、宝箱、ドロップ、品質に僅かに影響する巡り合わせ。" })
  });
  const characterGrowth = Object.freeze({
    attributes: Object.freeze({
      order: attributeOrder,
      definitions: attributeDefinitions,
      recruitmentRange: Object.freeze([8, 12]),
      expectedInitial: 10,
      growthPerLevel: .1,
      jobGrowthModifierPerPoint: .04,
      chartStandard: 50,
      chartMaximum: 100,
      derived: Object.freeze({
        hp: Object.freeze({ base: 50, perLevel: 9, weights: Object.freeze({ vitality: .2, fortitude: .1 }), floor: .7 }),
        attack: Object.freeze({ base: 10, perLevel: 3, weights: Object.freeze({ strength: .2, dexterity: .05 }), floor: .75 }),
        defense: Object.freeze({ base: 8, perLevel: 2, weights: Object.freeze({ fortitude: .25, vitality: .05 }), floor: .7 }),
        magicAttack: Object.freeze({ base: 10, perLevel: 3, weights: Object.freeze({ intelligence: .22, spirit: .03 }), floor: .75 }),
        magicDefense: Object.freeze({ base: 9, perLevel: 2, weights: Object.freeze({ spirit: .2, intelligence: .06, fortitude: .04 }), floor: .7 }),
        magicHealing: Object.freeze({ base: 10, perLevel: 3, weights: Object.freeze({ spirit: .22, intelligence: .03 }), floor: .75 })
      }),
      rates: Object.freeze({
        hitBase: .75, hitDexterity: .015, hitAgility: .005, hitMinimum: .1, hitMaximum: 1.2,
        evasionBase: 0, evasionAgility: .012, evasionDexterity: .003, evasionOffset: 5, evasionMaximum: .6,
        criticalBase: .02, criticalLuck: .005, criticalDexterity: .003, criticalMaximum: .8,
        speedBase: 0, speedAgility: 1.2
      }),
      powerMultipliers: Object.freeze({
        physicalPower: Object.freeze({ attribute: "strength", coefficient: .25, minimum: .8, maximum: 1.5 }),
        magicPower: Object.freeze({ attribute: "intelligence", coefficient: .25, minimum: .8, maximum: 1.5 }),
        healingPower: Object.freeze({ attribute: "spirit", coefficient: .25, minimum: .8, maximum: 1.5 })
      }),
      luck: Object.freeze({
        statusChancePerPoint: .002,
        treasureChancePerPoint: .002,
        acquisitionPerChartPoint: .002,
        acquisitionMaximum: 1.1
      })
    }),
    // 現在の武器・防具マスター全体の平均重量。装備追加時はテストで実平均との差を検出する。
    averageEquipmentWeight: 6.975,
    // 序盤装備は全装備平均よりかなり軽いため、Lv.1から全体平均を使うと軽装を積みすぎられる。
    // 装備数の成長曲線は維持し、1枠ぶんの基準重量だけをLv.89まで段階的に全体平均へ近づける。
    equipmentWeightUnitMilestones: Object.freeze([
      [1, 3], [20, 5], [49, 6.25], [89, 6.975]
    ]),
    equipmentCapacityMilestones: Object.freeze([
      [1, 1], [3, 2], [6, 3], [9, 4], [12, 5], [16, 6], [20, 7], [25, 8], [30, 9],
      [36, 10], [42, 11], [49, 12], [58, 13], [67, 14], [77, 15], [89, 16],
      [102, 17], [118, 18], [134, 19], [150, 20], [166, 21], [183, 22], [200, 23]
    ]),
    postMilestoneLevelsPerItem: 17,
    maximumAverageItems: 28
  });
  data.registry.config("characterGrowth", characterGrowth);
})();
