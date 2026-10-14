// Test-only fixture factory. The game recruits characters through Recruitment.hire.
exports.createCharacter = function (game, name, jobId = "warrior", raceId = "human", birthId = "common", selectedPortraitId) {
  const state = game.GameState.data;
  const id = `adventurer-${state.meta.nextCharacterId++}`;
  const variance = state.meta.nextCharacterId % 3;
  state.characters.push({
    id, name, jobId, raceId, birthId, level: 1, exp: 0,
    portraitId: game.Characters.portraitId({ jobId, portraitId: selectedPortraitId }),
    actionRates: Object.assign({}, game.GameData.config.combatRules.defaultActionRates),
    attributes: { vitality: 10 + variance, strength: 10 + variance, fortitude: 12 - variance, intelligence: 10, spirit: 10, dexterity: 10, agility: 10, luck: 10 },
    source: { type: "recruitment" },
    equipment: [], career: null, expeditionRecord: game.Characters.emptyExpeditionRecord(), recordTitleId: null, createdAt: game.GameRuntime.now()
  });
  game.GameState.save();
  return { ok: true, id };
};

exports.completeChapter = function (game, chapterId) {
  const chapter = game.GameData.storyChapters.find(entry => entry.id === chapterId);
  if (!chapter) throw new Error(`Unknown chapter: ${chapterId}`);
  if (chapterId === "prologue") {
    game.Story.recordDeparture("meadow");
    while (game.Story.pendingEpisode?.()) game.Story.readPending();
    return;
  }
  game.Story.chapterDungeons(chapterId).filter(dungeon => dungeon.requiredForStory).forEach(dungeon => {
    while (game.Story.pendingEpisode?.()) game.Story.readPending();
    game.Story.recordResult({ success: true, dungeonId: dungeon.id });
  });
  while (game.Story.pendingEpisode?.()) game.Story.readPending();
};

exports.completeThrough = function (game, chapterId) {
  for (const chapter of game.GameData.storyChapters) {
    if (!game.GameState.data.story.completed.includes(chapter.id)) exports.completeChapter(game, chapter.id);
    if (chapter.id === chapterId) return;
  }
  throw new Error(`Unknown chapter: ${chapterId}`);
};
