const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map(), nodes = new Map(), listeners = {};
let now = 1700000000000;
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { innerHTML: "", textContent: "", value: "1", dataset: {}, classList: { toggle() {} }, querySelectorAll: () => [], addEventListener() {} });
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
  while (game.Story.pendingEpisode()) game.Story.readPending();
  game.UI.render();
  assert(game.Story.readTimeline().length >= 2 && game.Story.storyGuide().latest, "The story guide derives a spoiler-safe recap from read scenes");
  assert(game.Story.searchReadScenes("帰ってきた者の名").some(event => event.scene.id === "prologue_opening"), "The archive index searches full dialogue as well as scene summaries");
  assert.strictEqual(game.Story.searchReadScenes("王座").length, 0, "The archive index never reveals unread future scenes");
  assert(game.Story.characterChronicles().some(record => record.character.id === "receptionist_rina" && record.events.length), "Read stories can be revisited by character");
  assert(html().includes("PREVIOUSLY · 前回まで") && html().includes("人物から物語を振り返る") && html().includes("最後に読んだ記録") && html().includes("この章を最初から通して読む"), "Home presents recap, bookmark, chapter replay and character-led archive navigation");
  assert(html().includes("CHAPTER SUMMARY") && html().includes("章の節目を振り返る") && html().includes("FULL TIMELINE") && html().includes("場面の記録を開く"), "Long chapter archives lead with three compact story beats and keep the complete timeline available on demand");
  assert(html().includes("言葉や人物から記録を探す"), "The archive offers a full-text index after the first scenes have been read");
  await click("open-story-index");
  assert(node("modal-root").innerHTML.includes("物語の索引") && node("modal-root").innerHTML.includes("読み終えた物語だけ") && node("modal-root").innerHTML.includes("prologue_opening"), "The story index opens with recent spoiler-safe results and direct replay links");
  await click("close-modal");
  const first = game.GameData.storyChapters[0];
  assert(html().includes('data-detail="story-' + first.id + '"'));
  for (const text of [game.Story.scene(first.openingStoryId).text, game.Story.scene(first.clearStoryId).text, first.objective, first.unlockText, "古い宿屋の看板", "最初の出発", "章報酬（受取済み）"]) assert(html().includes(text), text);
  assert(html().includes(`data-action="replay-story-scene" data-scene="${first.openingStoryId}"`), "Every archived scene opens its full dialogue and scenery");
  const beforeReplay = JSON.stringify(game.GameState.data);
  await click("replay-story-scene", { scene: first.openingStoryId });
  const replayHtml = node("modal-root").innerHTML;
  assert(replayHtml.includes("STORY ARCHIVE") && replayHtml.includes("回想：") && replayHtml.includes("story-reader-dialogue") && replayHtml.includes("story-speaker-tone-") && replayHtml.includes("is-reply") && replayHtml.includes("story-reader-toc") && replayHtml.includes("story-reader-text-controls") && replayHtml.includes("story-reader-status") && replayHtml.includes("story-reader-scene-ending") && replayHtml.includes("story-reader-cast") && replayHtml.includes("この物語に登場する人々") && replayHtml.includes("人物をタップすると") && replayHtml.includes("この記録の節目") && replayHtml.includes("story-reader-ending-notes") && replayHtml.includes("読了目安 約") && replayHtml.includes("回想を閉じる"), "Archive replay visually connects replies while retaining speaker colors, cast, recap, reading-time guidance, text sizing, progress and scene navigation");
  await click("story-reader-text-size", { storySize: "large" });
  assert.strictEqual(node(".story-reader-modal").dataset.storyTextSize, "large", "Readers can enlarge story text without reopening the scene");
  assert.strictEqual(storage.get("guildChronicleStoryTextSize_v1"), "large", "The preferred story text size is kept outside save data for future readers");
  await click("story-reader-layout", { storyLayout: "compact" });
  assert.strictEqual(node(".story-reader-modal").dataset.storyLayout, "compact", "Readers can switch a long scene to the compact transcript without reopening it");
  assert.strictEqual(storage.get("guildChronicleStoryLayout_v1"), "compact", "The preferred story density is kept outside save data for future readers");
  await click("story-reader-theme", { storyTheme: "night" });
  assert.strictEqual(node(".story-reader-modal").dataset.storyTheme, "night", "Readers can switch long scenes to a low-glare night background without reopening them");
  assert.strictEqual(storage.get("guildChronicleStoryTheme_v1"), "night", "The preferred story background is kept outside save data for future readers");
  await click("story-speaker-focus", { storySpeaker: "receptionist_rina" });
  assert.strictEqual(node(".story-reader-modal").dataset.storySpeakerFocus, "receptionist_rina", "Tapping a speaker can focus that character across a crowded conversation");
  assert.strictEqual(node("[data-story-focus-name]").textContent, "リナの発言を表示中", "The reader keeps the selected speaker visible in its navigation bar");
  await click("story-speaker-focus-clear");
  assert.strictEqual(node(".story-reader-modal").dataset.storySpeakerFocus, "", "The persistent focus bar returns to the complete conversation without finding the same speaker again");
  assert(!replayHtml.includes('data-action="finish-story-reader"'), "Replaying a story never asks to complete it again");
  await click("replay-story-chapter", { chapter: first.id });
  const chapterReplayHtml = node("modal-root").innerHTML;
  assert(chapterReplayHtml.includes("回想録：") && chapterReplayHtml.includes("場面 1 / ") && chapterReplayHtml.includes("story-reader-toc") && chapterReplayHtml.includes("story-reader-bridge") && chapterReplayHtml.includes("前の場面から") && (chapterReplayHtml.match(/story-reader-scene/g) || []).length > 2, "Completed chapters replay as one chronological multi-scene reading experience with context preserved at every jump");
  assert(!chapterReplayHtml.includes('data-action="finish-story-reader"'), "Chapter replay remains read-only");
  const chapterScroller = node("[data-story-reader-scroll]");
  chapterScroller.scrollTop = 480;
  await click("close-modal");
  assert.strictEqual(game.StoryReaderBookmark.read(`archive:chapter:${first.id}`).scrollTop, 480, "Closing a long chapter replay preserves its reading position");
  game.UI.render();
  assert(html().includes("読みかけの章回想") && html().includes(`${first.title} · 場面 1/`) && html().includes("から再開"), "The archive exposes paused chapter replays instead of hiding their bookmarks behind chapter lists");
  await click("replay-story-chapter", { chapter: first.id });
  assert.strictEqual(chapterScroller.scrollTop, 480, "Chapter replay resumes from its saved position");
  await click("finish-story-replay", { episode: `archive:chapter:${first.id}` });
  assert.strictEqual(game.StoryReaderBookmark.read(`archive:chapter:${first.id}`), null, "Reaching the end clears only that chapter replay bookmark");
  assert.strictEqual(JSON.stringify(game.GameState.data), beforeReplay, "Replaying archived story never mutates the save");
  for (const chapter of game.GameData.storyChapters.slice(1)) assert(!html().includes(game.Story.scene(chapter.clearStoryId).text));
  const meadowDiscovery = game.Story.dungeonDiscoveryScene(game.GameData.dungeons.meadow);
  game.Story.recordResult({ dungeonId: "meadow", success: false, battleLog: [{ kind: "story", sceneId: meadowDiscovery.id, text: meadowDiscovery.text }] });
  await click("open-story-reader");
  const discoveryReader = node("modal-root").innerHTML;
  assert(discoveryReader.includes("この先へ続く手掛かり") && discoveryReader.includes("story-reader-thread-notes") && discoveryReader.includes("街道へ向けられた獣") && discoveryReader.includes("帳面の余白"), "A story ending connects its new evidence to the next unresolved thread without revealing future evidence");
  await click("close-modal");
  while (game.Story.pendingEpisode()) game.Story.readPending();
  game.UI.render();
  assert(game.Story.ensure().facts.discoveries.includes("meadow") && html().includes("探索で判明") && html().includes(meadowDiscovery.text), "A clue found during a failed expedition should remain readable in the home archive");
  const roadsideMystery = game.Story.mysteries().find(mystery => mystery.id === "roadside_manipulation");
  assert(roadsideMystery && !roadsideMystery.resolved && html().includes("いま追っている手掛かり") && html().includes(roadsideMystery.latestEvidence.note), "Read discoveries open spoiler-safe long-running mystery threads");
  assert.strictEqual(roadsideMystery.evidenceCount, 1, "Only read scenes count as discovered mystery evidence");
  assert(html().includes(`手掛かり 1/${roadsideMystery.evidenceTotal}`) && html().includes("帳面の余白") && html().includes(roadsideMystery.latestEvidence.margin), "Active mysteries show compact progress and an in-world lead");
  assert(!html().includes(roadsideMystery.evidence[1].note), "Future mystery evidence remains hidden");
  const meadowMysteryUpdates = game.Story.mysteryUpdates([meadowDiscovery.id]);
  assert(meadowMysteryUpdates.length === 1 && meadowMysteryUpdates[0].updatedEvidence[0].sceneId === meadowDiscovery.id && meadowMysteryUpdates[0].evidenceCountAtUpdate === 1 && !meadowMysteryUpdates[0].resolvedByUpdate, "A return report can derive only the mystery evidence and contemporaneous progress advanced by that expedition");
  const mainRoutes = game.Story.mainChapters().slice(1).flatMap(chapter => game.Story.chapterDungeons(chapter.id).filter(dungeon => dungeon.requiredForStory).map(dungeon => dungeon.id));
  for (const dungeonId of mainRoutes) {
    game.Story.recordResult({ dungeonId, success: true });
    while (game.Story.pendingEpisode()) game.Story.readPending();
    game.UI.render();
    for (const chapter of game.GameData.storyChapters) {
      const completed = game.Story.ensure().completed.includes(chapter.id);
      assert.strictEqual(html().includes('data-detail="story-' + chapter.id + '"'), completed);
      assert.strictEqual(html().includes(game.Story.scene(chapter.clearStoryId).text), completed);
    }
  }
  assert.strictEqual(game.Story.ensure().completed.length, game.Story.mainChapters().length);
  const resolvedRoadsideMystery = game.Story.mysteries().find(mystery => mystery.id === "roadside_manipulation");
  assert(resolvedRoadsideMystery?.resolved && resolvedRoadsideMystery.evidenceCount === resolvedRoadsideMystery.evidenceTotal && html().includes("解明した記録") && html().includes("集めた記録"), "Reading the resolution closes a mystery and exposes its complete evidence trail without extra save state");
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
