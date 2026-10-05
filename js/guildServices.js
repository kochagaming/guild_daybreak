(function () {
  "use strict";
  const definitions = () => window.GameData.config.guildServices?.pages || {};
  function definition(pageId) { return definitions()[pageId] || null; }
  function unlocked(pageId, state = window.GameState.data) {
    const entry = definition(pageId);
    if (!entry) return false;
    if (entry.initiallyAvailable) return true;
    const unlock = entry.unlock;
    if (unlock?.type === "sceneRead") return (state.story?.readSceneIds || []).includes(unlock.sceneId);
    if (unlock?.type === "chapterCompleted") return (state.story?.completed || []).includes(unlock.chapterId);
    return false;
  }
  function unlockedIds(state = window.GameState.data) {
    return Object.keys(definitions()).filter(pageId => unlocked(pageId, state));
  }
  function newlyUnlocked(previousIds, state = window.GameState.data) {
    const previous = previousIds instanceof Set ? previousIds : new Set(previousIds || []);
    return unlockedIds(state).filter(pageId => !previous.has(pageId)).map(pageId => ({ pageId, ...definition(pageId), keeper: window.GameData.storyCharacters?.[definition(pageId)?.keeperCharacterId] || null }));
  }
  function keeper(pageId) {
    const entry = definition(pageId);
    return entry?.keeperCharacterId ? window.GameData.storyCharacters?.[entry.keeperCharacterId] || null : null;
  }
  function lockedMessage(pageId) {
    const entry = definition(pageId), scene = window.GameData.storyScenes?.[entry?.unlock?.sceneId];
    return scene ? `「${scene.name}」を読み終えると利用できます。` : "物語を進めると利用できます。";
  }
  window.GuildServices = { definition, unlocked, unlockedIds, newlyUnlocked, keeper, lockedMessage };
})();
