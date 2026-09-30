(function () {
  "use strict";
  window.GameData.accessCodes = {
    party_expansion_trial: {
      id: "party_expansion_trial", code: "0000", inputArea: "partyExpansion",
      name: "追加パーティ増設権", description: "章進行とは別に、次のパーティを1枠分増設可能にします。増設費用は別途必要です。",
      effects: [{ type: "partySlotRight", amount: 1 }]
    },
    half_exploration_trial: {
      id: "half_exploration_trial", code: "0001", inputArea: "explorationTime",
      name: "探索時間半減", description: "解放後に開始するすべての探索時間を半分にします。進行中の探索には影響しません。",
      effects: [{ type: "explorationDurationMultiplier", multiplier: .5 }]
    },
    double_experience_trial: {
      id: "double_experience_trial", code: "0002", inputArea: "experienceReward",
      name: "取得経験値2倍", description: "解放後に開始する探索で、パーティ全員が得る基本経験値を2倍にします。",
      effects: [{ type: "acquisitionModifier", metric: "experience", scope: "party", operation: "multiplier", value: 2 }]
    },
    double_gold_trial: {
      id: "double_gold_trial", code: "0003", inputArea: "goldReward",
      name: "取得金額2倍", description: "解放後に開始する探索で、戦闘報酬と宝箱を含む取得金額を2倍にします。",
      effects: [{ type: "acquisitionModifier", metric: "gold", scope: "party", operation: "multiplier", value: 2 }]
    },
    double_quality_trial: {
      id: "double_quality_trial", code: "0004", inputArea: "qualityReward",
      name: "品質付与率2倍", description: "解放後に開始する探索で、ドロップ装備に標準以外の品質が付く確率を2倍にします。",
      effects: [{ type: "acquisitionModifier", metric: "qualityRate", scope: "party", operation: "multiplier", value: 2 }]
    },
    double_item_rate_trial: {
      id: "double_item_rate_trial", code: "0005", inputArea: "itemReward",
      name: "アイテム獲得率2倍", description: "解放後に開始する探索で、素材・装備・宝箱アイテムの獲得判定を2倍にします。",
      effects: [{ type: "acquisitionModifier", metric: "itemRate", scope: "party", operation: "multiplier", value: 2 }]
    }
  };
})();
