(function () {
  "use strict";
  const data = window.GameData = window.GameData || {};
  const partyProgression = {
    memberLimit: {
      initial: 3, maximum: 6,
      unlocks: [{ chapterId: "roadside", size: 4 }, { chapterId: "seal", size: 5 }, { chapterId: "starfall", size: 6 }]
    },
    partySlots: {
      initial: 1, maximum: 8,
      unlocks: [
        { slot: 2, chapterNumber: 1, gold: 10000, seals: 2 },
        { slot: 3, chapterNumber: 2, gold: 100000, seals: 4 },
        { slot: 4, chapterNumber: 3, gold: 500000, seals: 6 },
        { slot: 5, chapterNumber: 4, gold: 2000000, seals: 8 },
        { slot: 6, chapterNumber: 5, gold: 8000000, seals: 10 },
        { slot: 7, chapterNumber: 6, gold: 30000000, seals: 12 },
        { slot: 8, codeOnly: true, gold: 100000000, seals: 15 }
      ]
    }
  };
  data.registry.config("partyProgression", partyProgression);
  const chapterIdByNumber = Object.fromEntries((data.storyChapters || []).map(chapter => [chapter.number, chapter.id]));
  data.registry.relationList("chapterUnlockAdditions", [
    ...partyProgression.memberLimit.unlocks.map(entry => ({ id: `party-members-${entry.chapterId}`, chapterId: entry.chapterId, text: `パーティ人数${entry.size}人まで` })),
    ...partyProgression.partySlots.unlocks.filter(entry => !entry.codeOnly).map(entry => ({ id: `party-slot-${entry.slot}`, chapterId: chapterIdByNumber[entry.chapterNumber], text: `第${entry.slot}パーティの増設権` }))
  ]);
})();
