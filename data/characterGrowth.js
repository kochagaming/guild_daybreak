(function () {
  "use strict";

  const data = window.GameData = window.GameData || {};
  const characterGrowth = Object.freeze({
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
