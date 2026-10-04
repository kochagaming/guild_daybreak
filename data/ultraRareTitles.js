(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};
  data.registry.config("ultraRare", { dropChance: .001, statMultiplier: 2, saleMultiplier: 25 });
  const ultraRareTitles = {
    worldbreaker: { id: "worldbreaker", name: "天地を砕く", skillId: "ultra_worldbreaker" },
    starcaster: { id: "starcaster", name: "星界を呼ぶ", skillId: "ultra_starcaster" },
    eternal: { id: "eternal", name: "永劫を生きる", skillId: "ultra_eternal" },
    bastion: { id: "bastion", name: "決して崩れない", skillId: "ultra_bastion" },
    gale: { id: "gale", name: "時を追い越す", skillId: "ultra_gale" },
    fate: { id: "fate", name: "運命を見通す", skillId: "ultra_fate" },
    lifebringer: { id: "lifebringer", name: "命を巡らせる", skillId: "ultra_lifebringer" },
    transcendent: { id: "transcendent", name: "理を越える", skillId: "ultra_transcendent" }
  };
  data.registry.entities("ultraRareTitles", ultraRareTitles);
})();
