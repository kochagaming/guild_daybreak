const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const context = vm.createContext({ window: {}, Date, Math, Blob, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
[
  "data/items.js", "data/facilities.js", "data/qualities.js", "data/equipmentSkills.js", "data/skills.js", "data/jobs.js", "data/origins.js", "data/affinities.js", "data/skillGrants.js", "data/portraits.js", "data/monsters.js", "data/dungeons.js", "data/recipes.js", "data/story.js",
  "js/runtime.js", "js/storage.js", "js/save.js", "js/gameState.js", "js/equipmentSkills.js", "js/characters.js", "js/items.js", "js/shop.js", "js/party.js", "js/exploration.js", "data/skillCategories.js", "js/skillCombat.js", "js/statusCombat.js", "js/battle.js", "js/dungeon.js", "js/blacksmith.js", "js/story.js"
].forEach(file => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context));
const game = context.window, state = game.GameState.data;

game.GameData.storyScenes.future_opening = { id: "future_opening", name: "次章の始まり", text: "二つの本編攻略路と一つの寄り道がある。" };
game.GameData.storyScenes.future_clear = { id: "future_clear", name: "次章の終わり", text: "二つの本編攻略路を突破した。" };
game.GameData.storyScenes.future_side = { id: "future_side", name: "寄り道の記録", text: "本編には必須ではない発見を得た。" };
game.GameData.storyChapters.push({ id: "future", order: 4, number: 4, title: "第4章：構造テスト", recommendedLevelRange: [20, 27], openingStoryId: "future_opening", clearStoryId: "future_clear", objective: "二つの本編ダンジョンを攻略", entryRequirements: [], unlockText: "次章", rewards: { gold: 123, materials: {} } });
game.GameData.dungeons.future_a = { id: "future_a", name: "第一経路", chapterId: "future", orderInChapter: 1, requiredForStory: true, unlockRequirements: [{ type: "chapterCompleted", chapterId: "starfall" }] };
game.GameData.dungeons.future_b = { id: "future_b", name: "第二経路", chapterId: "future", orderInChapter: 2, requiredForStory: true, unlockRequirements: [{ type: "dungeonClear", dungeonId: "future_a" }] };
game.GameData.dungeons.future_side = { id: "future_side", name: "寄り道", chapterId: "future", orderInChapter: 3, requiredForStory: false, unlockRequirements: [{ type: "chapterCompleted", chapterId: "future" }], optionalStoryId: "future_side" };

require("./helpers").createCharacter(game, "進行テスト", "warrior");
state.story.facts.departed = true;
state.story.facts.clears.push("meadow", "cave", "ruins");
game.Story.sync();
assert.strictEqual(game.Story.current().id, "future");
assert(game.Story.canEnter("future_a") && !game.Story.canEnter("future_b") && !game.Story.canEnter("future_side"));
const gold = state.gold;
assert.deepStrictEqual(Array.from(game.Story.recordResult({ success: true, dungeonId: "future_a" })), []);
assert(!state.story.completed.includes("future") && game.Story.canEnter("future_b"));
assert(game.Story.recordResult({ success: true, dungeonId: "future_b" }).includes("future"));
assert.strictEqual(state.gold, gold + 123);
assert(game.Story.canEnter("future_side"));
assert.strictEqual(game.Story.optionalStories().length, 0);
game.Story.recordResult({ success: true, dungeonId: "future_side" });
assert(game.Story.optionalStories().some(entry => entry.scene.id === "future_side"));
assert.strictEqual(state.gold, gold + 123, "Optional clears never pay the chapter reward again");
console.log("Chapter progression test passed: multi-route chapters, generic unlocks, optional high-difficulty stories and one-time rewards");

