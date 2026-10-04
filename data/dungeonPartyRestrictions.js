(function () {
  "use strict";
  const data = window.GameData;

  data.registry.relations("dungeonPartyRestrictions", {
    elder_dragon_crater: [
      { type: "allowedRaces", raceIds: ["dragonewt"] }
    ],
    forgotten_titan_tomb: [
      { type: "onlyCompanions", companionIds: ["tio"] }
    ],
    leviathan_trench: [
      { type: "requiredCompanions", companionIds: ["shia"], match: "all" }
    ],
    worldscar_glacier: [
      { type: "requiredCompanions", companionIds: ["noah"], match: "all" }
    ],
    white_dragon_roost: [
      { type: "requiredCompanions", companionIds: ["kai"], match: "all" }
    ],
    void_star_prison: [
      { type: "requiredCompanions", companionIds: ["elena"], match: "all" }
    ],
    star_eater_rootpit: [
      { type: "requiredCompanions", companionIds: ["rize"], match: "all" }
    ],
    hollow_coronation: [
      { type: "requiredCompanions", companionIds: ["garm"], match: "all" }
    ]
  });
})();
