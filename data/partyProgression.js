(function () {
  "use strict";
  window.GameData.partyProgression = {
    memberLimit: {
      initial: 3, maximum: 6,
      unlocks: [{ chapterId: "roadside", size: 4 }, { chapterId: "seal", size: 5 }, { chapterId: "starfall", size: 6 }]
    },
    partySlots: {
      initial: 1, maximum: 8,
      unlocks: [
        { slot: 2, chapterNumber: 1, gold: 1000, seals: 2 },
        { slot: 3, chapterNumber: 2, gold: 2500, seals: 4 },
        { slot: 4, chapterNumber: 3, gold: 5000, seals: 6 },
        { slot: 5, chapterNumber: 4, gold: 10000, seals: 8 },
        { slot: 6, chapterNumber: 5, gold: 20000, seals: 10 },
        { slot: 7, chapterNumber: 6, gold: 40000, seals: 12 },
        { slot: 8, codeOnly: true, gold: 80000, seals: 15 }
      ]
    }
  };
  const chapters = window.GameData.storyChapters || [];
  window.GameData.partyProgression.memberLimit.unlocks.forEach(entry => {
    const chapter = chapters.find(chapter => chapter.id === entry.chapterId);
    if (chapter) chapter.unlockText += `、パーティ人数${entry.size}人まで`;
  });
  window.GameData.partyProgression.partySlots.unlocks.filter(entry => !entry.codeOnly).forEach(entry => {
    const chapter = chapters.find(chapter => chapter.number === entry.chapterNumber);
    if (chapter) chapter.unlockText += `、第${entry.slot}パーティの増設権`;
  });
})();
