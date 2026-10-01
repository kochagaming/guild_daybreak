const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map(), nodes = new Map(), listeners = {};
let now = 1700000000000;
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { innerHTML: "", textContent: "", value: "1", classList: { toggle() {} }, querySelectorAll: () => [], addEventListener() {} });
  return nodes.get(id);
}
const document = { getElementById: node, querySelector: node, querySelectorAll: () => [], addEventListener(type, handler) { listeners[type] = handler; } };
const context = vm.createContext({ window: {}, document, Date, Math, Blob, console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (file === "js/main.js") continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .5 });
}
const game = context.window;
const html = () => node("app").innerHTML;
async function click(action, data = {}) {
  const button = { dataset: { action, ...data }, classList: { contains: () => false } };
  await listeners.click({ target: { closest: () => button } });
}
async function run() {
  game.UI.init();
  assert(html().includes("これまでのストーリー") && html().includes("まだ達成済みの章はありません"));
  assert(!html().includes('data-detail="story-'));
  for (const chapter of game.GameData.storyChapters) assert(!html().includes(game.Story.scene(chapter.clearStoryId).text), "Unfinished endings must not be revealed");
  require("./helpers").createCharacter(game, "語り部", "warrior");
  game.Story.recordDeparture("meadow");
  game.UI.render();
  const first = game.GameData.storyChapters[0];
  assert(html().includes('data-detail="story-' + first.id + '"'));
  for (const text of [game.Story.scene(first.openingStoryId).text, game.Story.scene(first.clearStoryId).text, first.objective, first.unlockText, "古い宿屋の看板", "最初の出発", "章報酬（受取済み）"]) assert(html().includes(text), text);
  for (const chapter of game.GameData.storyChapters.slice(1)) assert(!html().includes(game.Story.scene(chapter.clearStoryId).text));
  const meadowDiscovery = game.Story.dungeonDiscoveryScene(game.GameData.dungeons.meadow);
  game.Story.recordResult({ dungeonId: "meadow", success: false, battleLog: [{ kind: "story", sceneId: meadowDiscovery.id, text: meadowDiscovery.text }] });
  game.UI.render();
  assert(game.Story.ensure().facts.discoveries.includes("meadow") && html().includes("探索で判明") && html().includes(meadowDiscovery.text), "A clue found during a failed expedition should remain readable in the home archive");
  const mainRoutes = game.Story.mainChapters().slice(1).flatMap(chapter => game.Story.chapterDungeons(chapter.id).filter(dungeon => dungeon.requiredForStory).map(dungeon => dungeon.id));
  for (const dungeonId of mainRoutes) {
    game.Story.recordResult({ dungeonId, success: true });
    game.UI.render();
    for (const chapter of game.GameData.storyChapters) {
      const completed = game.Story.ensure().completed.includes(chapter.id);
      assert.strictEqual(html().includes('data-detail="story-' + chapter.id + '"'), completed);
      assert.strictEqual(html().includes(game.Story.scene(chapter.clearStoryId).text), completed);
    }
  }
  assert.strictEqual(game.Story.ensure().completed.length, game.Story.mainChapters().length);
  game.Story.recordResult({ dungeonId: "afterstar_sanctum", success: true });
  require("./helpers").completeChapter(game, "afterstar_reaches_1");
  game.UI.render();
  assert.strictEqual(game.Story.ensure().completed.length, game.GameData.storyChapters.length);
  let previous = -1;
  for (const chapter of game.GameData.storyChapters) {
    const position = html().indexOf('data-detail="story-' + chapter.id + '"');
    assert(position > previous, "Archives follow chapter order"); previous = position;
    assert(html().includes(game.Story.scene(chapter.openingStoryId).text) && html().includes(game.Story.scene(chapter.clearStoryId).text));
  }
  assert(html().includes('data-detail="story-optional-observatory"') && html().includes(game.GameData.storyScenes.observatory_opening.text));
  assert(!html().includes(game.GameData.storyScenes.observatory_clear.text), "Optional ending must remain hidden until clear");
  game.Story.recordResult({ dungeonId: "observatory", success: true });
  game.UI.render();
  assert(html().includes('data-detail="story-optional-observatory"') && html().includes(game.GameData.storyScenes.observatory_clear.text));
  const state = JSON.stringify(game.GameState.data);
  for (let i = 0; i < 3; i++) { game.UI.navigate("guild"); game.UI.navigate("home"); game.UI.render(); }
  assert.strictEqual(JSON.stringify(game.GameState.data), state, "Reading never changes progress, money or materials");
  for (const text of ["facilities-panel", "セーブのバックアップ", "data-countdown=", "LATEST REPORT"]) assert(!html().includes(text));
  console.log("Story archive test passed: full completed chapters, chronological order, hidden unfinished endings, empty state and read-only navigation");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
