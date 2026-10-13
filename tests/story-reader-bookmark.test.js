const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
let now = 1700000000000;
const context = vm.createContext({ window: {}, console, JSON, localStorage: {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key)
} });
context.window.GameRuntime = { now: () => now };
for (const file of ["js/storage.js", "js/storyReaderBookmark.js"]) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
const bookmark = context.window.StoryReaderBookmark;
assert.strictEqual(bookmark.read("episode-a"), null, "An unread episode starts without a bookmark");
assert(bookmark.write("episode-a", { sceneIndex: 2, sceneOffset: 135.5, scrollTop: 930 }), "A reading position can be stored independently from the game save");
assert.deepStrictEqual(JSON.parse(JSON.stringify(bookmark.read("episode-a"))), { version: 2, episodeId: "episode-a", sceneIndex: 2, sceneOffset: 135.5, scrollTop: 930, updatedAt: now });
assert.strictEqual(bookmark.read("episode-b"), null, "A bookmark never jumps into a different pending episode");
now += 1000;
assert(bookmark.write("archive:chapter:roadside", { sceneIndex: 8, sceneOffset: 42, scrollTop: 5432 }), "A long chapter replay keeps its own reading position");
assert(bookmark.read("episode-a") && bookmark.read("archive:chapter:roadside")?.sceneIndex === 8, "Pending stories and chapter replays keep independent bookmarks");
assert.deepStrictEqual(Array.from(bookmark.list(), entry => entry.episodeId), ["archive:chapter:roadside", "episode-a"], "Reading bookmarks are listed with the most recently used first");
assert.strictEqual(bookmark.clear("episode-b"), false, "Clearing an unknown episode cannot remove existing bookmarks");
assert(bookmark.clear("episode-a") && bookmark.read("episode-a") === null, "Reading completion clears the matching bookmark");
assert(bookmark.read("archive:chapter:roadside"), "Completing another story does not erase a paused chapter replay");
storage.set(bookmark.key, "broken-json");
assert.strictEqual(bookmark.read("episode-a"), null, "Corrupt UI-only bookmark data never blocks game startup");
console.log("Story reader bookmark test passed: episode isolation, exact resume position, safe clearing and corrupt-data tolerance");
