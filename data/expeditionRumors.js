(function () {
  "use strict";

  const data = window.GameData = window.GameData || {};
  data.registry.entityList("expeditionRumors", [
    { id: "merchant_tracks", name: "商隊の轍", icon: "◇", text: "荷を失った商隊が、取り戻した品には礼を惜しまないらしい。", effect: { metric: "gold", operation: "multiplier", value: 1.25 } },
    { id: "wandering_scholar", name: "旅学者の覚え書き", icon: "▤", text: "見慣れぬ足跡を追う旅学者が、同行者へ惜しみなく知見を語っている。", effect: { metric: "experience", operation: "multiplier", value: 1.2 } },
    { id: "overflowing_chests", name: "鍵師の置き手紙", icon: "▣", text: "古い宝箱の錠が緩む夜がある、と宿の鍵師が書き残している。", effect: { metric: "itemRate", operation: "multiplier", value: 1.35 } },
    { id: "clear_forge_sign", name: "澄んだ炉の火", icon: "✦", text: "鍛冶師は、今夜持ち帰られる品には澄んだ火の気配が宿ると話した。", effect: { metric: "qualityRate", operation: "multiplier", value: 1.5 } }
  ]);
})();
