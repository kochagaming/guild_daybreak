const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, console });
const load = file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });

["data/masterSchema.js", "data/monsters.js", "data/dungeons.js", "data/story.js"].forEach(load);
const data = context.window.GameData;
const coreDungeonIds = ["meadow", "cave", "ruins", "observatory"];
const coreSceneIds = ["roadside_opening", "seal_opening", "starfall_opening"];
const before = JSON.parse(JSON.stringify({
  dungeons: Object.fromEntries(coreDungeonIds.map(id => [id, data.dungeons[id]])),
  scenes: Object.fromEntries(coreSceneIds.map(id => [id, data.storyScenes[id]])),
  objectives: Object.fromEntries(data.storyChapters.filter(chapter => ["roadside", "seal", "starfall"].includes(chapter.id)).map(chapter => [chapter.id, chapter.objective]))
}));

load("data/chapters/earlyExpansion.js");

assert.deepStrictEqual(JSON.parse(JSON.stringify(Object.fromEntries(coreDungeonIds.map(id => [id, data.dungeons[id]])))), before.dungeons, "Early expansion must not rewrite core dungeon entities");
assert.deepStrictEqual(JSON.parse(JSON.stringify(Object.fromEntries(coreSceneIds.map(id => [id, data.storyScenes[id]])))), before.scenes, "Early expansion must not rewrite core story scenes");
assert.deepStrictEqual(JSON.parse(JSON.stringify(Object.fromEntries(data.storyChapters.filter(chapter => ["roadside", "seal", "starfall"].includes(chapter.id)).map(chapter => [chapter.id, chapter.objective])))), before.objectives, "Early expansion must not rewrite core chapter objectives");
for (const id of ["whispering_brook", "moonfang_den", "fungal_depths", "earthpulse_altar", "lunar_archive", "astral_core"]) {
  assert(data.dungeons[id]?.monsterScaling, `${id} must own its final scaling data when registered`);
}

console.log("Early data ownership test passed: core dungeons, story scenes and chapter objectives are canonical; expansion data only registers new entities");
