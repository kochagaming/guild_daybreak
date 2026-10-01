// Test-only fixture factory. The game recruits characters through Recruitment.hire.
exports.createCharacter = function (game, name, jobId = "warrior", raceId = "human", birthId = "common", selectedPortraitId) {
  const state = game.GameState.data;
  const id = `adventurer-${state.meta.nextCharacterId++}`;
  const variance = state.meta.nextCharacterId % 3;
  state.characters.push({
    id, name, jobId, raceId, birthId, level: 1, exp: 0,
    portraitId: game.Characters.portraitId({ jobId, portraitId: selectedPortraitId }),
    actionRates: Object.assign({}, game.GameData.combatRules.defaultActionRates),
    base: { hp: 48 + variance * 3, attack: 9 + variance, defense: 7 + (2 - variance) },
    equipment: [], career: null, createdAt: game.GameRuntime.now()
  });
  game.GameState.save();
  return { ok: true, id };
};

exports.completeChapter = function (game, chapterId) {
  const chapter = game.GameData.storyChapters.find(entry => entry.id === chapterId);
  if (!chapter) throw new Error(`Unknown chapter: ${chapterId}`);
  if (chapterId === "prologue") {
    game.Story.recordDeparture("meadow");
    return;
  }
  game.Story.chapterDungeons(chapterId).filter(dungeon => dungeon.requiredForStory).forEach(dungeon => {
    game.Story.recordResult({ success: true, dungeonId: dungeon.id });
  });
};

exports.completeThrough = function (game, chapterId) {
  for (const chapter of game.GameData.storyChapters) {
    if (!game.GameState.data.story.completed.includes(chapter.id)) exports.completeChapter(game, chapter.id);
    if (chapter.id === chapterId) return;
  }
  throw new Error(`Unknown chapter: ${chapterId}`);
};
