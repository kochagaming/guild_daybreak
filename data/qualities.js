(function () {
  "use strict";

  window.GameData = window.GameData || {};
  window.GameData.qualities = {
    broken: { id: "broken", prefix: "壊れかけの", qualityBand: "low", statMultiplier: 0.25, weightMultiplier: 1, valueMultiplier: 0.15, affixes: [0, 0], color: "broken" },
    worn: { id: "worn", prefix: "使い古しの", qualityBand: "low", statMultiplier: 0.5, weightMultiplier: 1, valueMultiplier: 0.3, affixes: [0, 1], color: "worn" },
    standard: { id: "standard", prefix: "", qualityBand: "standard", statMultiplier: 1, weightMultiplier: 1, valueMultiplier: 1, affixes: [0, 1], color: "standard" },
    familiar: { id: "familiar", prefix: "手になじむ", qualityBand: "high", statMultiplier: 1.2, weightMultiplier: 1, valueMultiplier: 1.35, affixes: [1, 1], color: "familiar" },
    hefty: { id: "hefty", prefix: "ずっしりとした", qualityBand: "high", statMultiplier: 2, weightMultiplier: 2, valueMultiplier: 2, affixes: [1, 2], color: "hefty" },
    featherlight: { id: "featherlight", prefix: "羽根のような", qualityBand: "high", statMultiplier: 0.5, weightMultiplier: 0.5, valueMultiplier: 1.1, affixes: [1, 2], color: "featherlight" },
    fine: { id: "fine", prefix: "上質な", qualityBand: "high", statMultiplier: 1.5, weightMultiplier: 1, valueMultiplier: 1.8, affixes: [1, 2], color: "fine" },
    divine: { id: "divine", prefix: "神がかった", qualityBand: "high", statMultiplier: 3, weightMultiplier: 1, valueMultiplier: 4, affixes: [2, 3], color: "divine" }
  };

  window.GameData.qualityTables = {
    drop: [
      ["broken", 10], ["worn", 18], ["standard", 35], ["familiar", 14],
      ["hefty", 8], ["featherlight", 8], ["fine", 5.5], ["divine", 1.5]
    ],
    craft: [
      ["standard", 30], ["familiar", 20], ["hefty", 10],
      ["featherlight", 10], ["fine", 25], ["divine", 5]
    ],
    daily_shop: [
      ["standard", 45], ["familiar", 20], ["hefty", 8],
      ["featherlight", 10], ["fine", 14], ["divine", 3]
    ]
  };
})();
