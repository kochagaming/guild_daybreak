(function () {
  "use strict";
  window.GameData.upgrades = {
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
      { chapterId: "black_moon_prison", maximum: 21 }
    ],
    bonus: { weapon: { attack: 2, defense: 0, hp: 0 }, armor: { attack: 0, defense: 2, hp: 3 } },
    goldPerTierAndLevel: 30
  };
  window.GameData.upgrades.limits.forEach(entry => {
    const chapter = window.GameData.storyChapters.find(chapter => chapter.id === entry.chapterId);
    if (chapter) chapter.unlockText += `、装備強化＋${entry.maximum}まで`;
  });
})();
