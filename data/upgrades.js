(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};
  const upgrades = {
    limits: [
      { chapterId: "prologue", maximum: 1 },
      { chapterId: "roadside", maximum: 3 },
      { chapterId: "seal", maximum: 5 },
      { chapterId: "starfall", maximum: 7 },
      { chapterId: "ember_crown", maximum: 9 },
      { chapterId: "mirror_tide", maximum: 11 },
      { chapterId: "clockwork_desert", maximum: 13 },
      { chapterId: "blackwood_pilgrimage", maximum: 15 },
      { chapterId: "thunder_snow_peaks", maximum: 17 },
      { chapterId: "falling_sky_castle", maximum: 19 },
      { chapterId: "black_moon_prison", maximum: 21 },
      { chapterId: "primordial_forest", maximum: 23 },
      { chapterId: "starsea_corridor", maximum: 25 },
      { chapterId: "northern_star_tomb", maximum: 27 },
      { chapterId: "returnless_capital", maximum: 29 },
      { chapterId: "end_of_starless_night", maximum: 31 }
    ],
    bonus: { weapon: { attack: 2, defense: 0, hp: 0 }, armor: { attack: 0, defense: 2, hp: 3 } },
    goldPerTierAndLevel: 30
  };
  data.registry.config("upgrades", upgrades);
  data.registry.relationList("chapterUnlockAdditions", upgrades.limits.map(entry => ({
    id: `upgrade-limit-${entry.chapterId}`,
    chapterId: entry.chapterId,
    text: `装備強化＋${entry.maximum}まで`
  })));
})();
