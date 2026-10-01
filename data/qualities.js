(function () {
  "use strict";

  window.GameData = window.GameData || {};
  window.GameData.qualities = {
    broken: { id: "broken", prefix: "壊れかけの", qualityBand: "low", rank: 10, statMultiplier: 0.5, weightMultiplier: 1, valueMultiplier: 0.5, affixes: [0, 0], color: "broken" },
    worn: { id: "worn", prefix: "使い古しの", qualityBand: "low", rank: 20, statMultiplier: 0.5, weightMultiplier: 1, valueMultiplier: 0.5, affixes: [0, 1], color: "worn" },
    featherlight: { id: "featherlight", prefix: "羽根のような", qualityBand: "high", rank: 25, statMultiplier: 0.5, weightMultiplier: 0.5, valueMultiplier: 0.5, affixes: [1, 2], color: "featherlight" },
    crude: { id: "crude", prefix: "粗末な", qualityBand: "low", rank: 30, statMultiplier: 0.5, weightMultiplier: 1, valueMultiplier: 0.5, affixes: [0, 1], color: "crude" },
    standard: { id: "standard", prefix: "", qualityBand: "standard", rank: 40, statMultiplier: 1, weightMultiplier: 1, valueMultiplier: 1, affixes: [0, 1], color: "standard" },
    wellmade: { id: "wellmade", prefix: "出来の良い", qualityBand: "high", rank: 50, statMultiplier: 1.5, weightMultiplier: 1, valueMultiplier: 1.5, affixes: [1, 1], color: "wellmade" },
    familiar: { id: "familiar", prefix: "手になじむ", qualityBand: "high", rank: 60, statMultiplier: 2, weightMultiplier: 1, valueMultiplier: 2, affixes: [1, 1], color: "familiar" },
    refined: { id: "refined", prefix: "精巧な", qualityBand: "high", rank: 70, statMultiplier: 2.5, weightMultiplier: 1, valueMultiplier: 2.5, affixes: [1, 2], color: "refined" },
    fine: { id: "fine", prefix: "上質な", qualityBand: "high", rank: 80, statMultiplier: 3, weightMultiplier: 1, valueMultiplier: 3, affixes: [1, 2], color: "fine" },
    exquisite: { id: "exquisite", prefix: "極上の", qualityBand: "high", rank: 90, statMultiplier: 3.5, weightMultiplier: 1, valueMultiplier: 3.5, affixes: [2, 2], color: "exquisite" },
    hefty: { id: "hefty", prefix: "ずっしりとした", qualityBand: "high", rank: 100, statMultiplier: 4, weightMultiplier: 2, valueMultiplier: 4, affixes: [1, 2], color: "hefty" },
    legendary: { id: "legendary", prefix: "伝説の", qualityBand: "high", rank: 110, statMultiplier: 4.5, weightMultiplier: 1, valueMultiplier: 4.5, affixes: [2, 3], color: "legendary" },
    divine: { id: "divine", prefix: "神がかった", qualityBand: "high", rank: 120, statMultiplier: 5, weightMultiplier: 1, valueMultiplier: 5, affixes: [2, 3], color: "divine" }
  };

  window.GameData.qualityTables = {
    drop: [
      ["broken", 8], ["worn", 14], ["crude", 14], ["standard", 28], ["wellmade", 12],
      ["familiar", 8], ["refined", 4], ["fine", 4], ["exquisite", 2], ["hefty", 2],
      ["featherlight", 2], ["legendary", 1], ["divine", 1]
    ],
    craft: [
      ["standard", 25], ["wellmade", 15], ["familiar", 15], ["refined", 10], ["fine", 15],
      ["exquisite", 8], ["hefty", 4], ["featherlight", 4], ["legendary", 2], ["divine", 2]
    ],
    daily_shop: [
      ["standard", 35], ["wellmade", 18], ["familiar", 14], ["refined", 8], ["fine", 10],
      ["exquisite", 5], ["hefty", 3], ["featherlight", 3], ["legendary", 2], ["divine", 2]
    ]
  };
})();
