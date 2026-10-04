const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window, state = game.GameState.data;
const expected = {
  roadside: [["meadow", "whispering_brook", "brigand_pass", "abandoned_station", "moonfang_den"], [1, 2, 3, 5, 7]],
  seal: [["cave", "fungal_depths", "crystal_vein", "sealed_workshop", "earthpulse_altar"], [7, 9, 11, 12, 14]],
  starfall: [["ruins", "lunar_archive", "inverted_cloister", "stargrave_corridor", "astral_core"], [14, 16, 17, 19, 20]]
};

for (const [chapterId, [ids, levels]] of Object.entries(expected)) {
  const routes = game.Story.chapterDungeons(chapterId).filter(dungeon => dungeon.requiredForStory);
  assert.deepStrictEqual(Array.from(routes, dungeon => dungeon.id), ids);
  assert.deepStrictEqual(Array.from(routes, dungeon => dungeon.recommendedLevel), levels);
  routes.forEach((dungeon, index) => {
    assert(dungeon.clearStoryId && game.GameData.storyScenes[dungeon.clearStoryId]);
    if (index) assert.deepStrictEqual(JSON.parse(JSON.stringify(dungeon.unlockRequirements)), [{ type: "dungeonClear", dungeonId: routes[index - 1].id }]);
  });
}

require("./helpers").createCharacter(game, "街道から星環まで", "warrior");
game.Story.recordDeparture("meadow");
assert(state.story.completed.includes("prologue") && game.Story.canEnter("meadow") && !game.Story.canEnter("whispering_brook"));
assert.strictEqual(game.Story.focus().dungeon.id, "meadow");
assert.strictEqual(game.Story.focus().scene.id, "meadow_opening");
for (const chapterId of Object.keys(expected)) {
  const chapter = game.GameData.storyChapters.find(entry => entry.id === chapterId);
  const routes = game.Story.chapterDungeons(chapterId).filter(dungeon => dungeon.requiredForStory);
  const gold = state.gold;
  routes.forEach((dungeon, index) => {
    assert(game.Story.canEnter(dungeon.id), `${dungeon.id} should be unlocked in sequence`);
    const result = { success: true, dungeonId: dungeon.id };
    const completed = game.Story.recordResult(result);
    assert(result.storyMoments.some(moment => moment.kind === "ending" && moment.dungeonId === dungeon.id), `${dungeon.id} needs a clear story moment`);
    if (index + 1 < routes.length) assert(game.Story.pendingEpisode()?.entries.some(entry => entry.kind === "dungeonOpening" && entry.dungeon?.id === routes[index + 1].id), `${routes[index + 1].id} needs a home reading moment`);
    assert.strictEqual(completed.includes(chapterId), index === routes.length - 1, `${chapterId} completed at the wrong route`);
    while (game.Story.pendingEpisode()) game.Story.readPending();
    if (index + 1 < routes.length) assert(game.Story.canEnter(routes[index + 1].id));
  });
  assert.strictEqual(state.gold, gold + chapter.rewards.gold);
  assert.strictEqual(game.Story.sync().length, 0, "Chapter rewards are granted once");
}
assert(game.Story.canEnter("observatory") && game.Story.current().id === "ember_crown");
assert.strictEqual(game.Story.routeStories().filter(entry => ["roadside", "seal", "starfall"].includes(entry.dungeon.chapterId)).length, 12);
assert(game.SaveTransfer.parse(JSON.stringify(state)).ok);

const main = ["roadside", "seal", "starfall", "ember_crown"].flatMap(id => game.Story.chapterDungeons(id).filter(dungeon => dungeon.requiredForStory));
for (let index = 1; index < main.length; index++) {
  assert(main[index].recommendedLevel >= main[index - 1].recommendedLevel, "Recommended levels must not go backwards");
  const previousExp = main[index - 1].rewards.exp.reduce((a, b) => a + b, 0) / 2;
  const currentExp = main[index].rewards.exp.reduce((a, b) => a + b, 0) / 2;
  assert(currentExp >= previousExp, `Expected EXP goes backwards at ${main[index].id}`);
}
console.log("Early chapter expansion test passed: five main routes per chapter, ordered unlocks, Lv1-20 curve, route stories, one-time rewards and smooth EXP progression");
