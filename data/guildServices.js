(function () {
  "use strict";
  const data = window.GameData;

  // 施設の担当・解放条件は人物の身元から分離し、同じ人物を別の役割や加入へ再利用できるようにする。
  data.registry.config("guildServices", {
    version: 2,
    order: ["home", "characters", "party", "inventory", "shop", "blacksmith", "archives", "guild", "settings"],
    pages: {
      home: { initiallyAvailable: true },
      characters: { initiallyAvailable: true },
      party: { initiallyAvailable: true },
      inventory: { initiallyAvailable: true },
      settings: { initiallyAvailable: true },
      shop: {
        keeperCharacterId: "merchant_marta",
        unlock: { type: "sceneRead", sceneId: "prologue_opening" },
        unlockMessage: "マルタが宿の一角に旅支度の店を開きました。"
      },
      blacksmith: {
        keeperCharacterId: "blacksmith_gregor",
        unlock: { type: "sceneRead", sceneId: "meadow_clear" },
        unlockMessage: "グレゴールが古い馬房へ炉を据え、鍛冶屋を開きました。"
      },
      archives: {
        keeperCharacterId: "archivist_else",
        unlock: { type: "sceneRead", sceneId: "whispering_brook_clear" },
        unlockMessage: "エルゼが散らばった記録を集め、冒険者資料室を開きました。"
      },
      guild: {
        keeperCharacterId: "receptionist_rina",
        unlock: { type: "sceneRead", sceneId: "roadside_clear" },
        unlockMessage: "町に認められたギルドの運営設備を整えられるようになりました。"
      }
    }
  });
})();
