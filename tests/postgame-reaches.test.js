const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const game = context.window, data = game.GameData, state = game.GameState.data;
const region = data.storyChapters.find(chapter => chapter.id === "afterstar_reaches_1");
const dungeon = data.dungeons.gray_ash_sea;
assert(region && region.kind === "postgame" && region.number === 16 && region.recommendedLevelRange[1] === 115);
assert(dungeon && dungeon.chapterId === region.id && dungeon.recommendedLevel === 110 && dungeon.requiredForStory);
const routes = game.Story.chapterDungeons(region.id), required = routes.filter(route => route.requiredForStory), optional = routes.filter(route => !route.requiredForStory);
assert.deepStrictEqual(Array.from(required, route => route.id), ["gray_ash_sea", "inverted_glass_canyon", "worldskin_garden", "silent_iron_city", "distant_observatory"]);
assert.deepStrictEqual(Array.from(required, route => route.recommendedLevel), [110, 111, 112, 113, 115]);
assert.deepStrictEqual(Array.from(optional, route => route.id), ["five_reaches_nest"]);
assert.deepStrictEqual(Array.from(game.Story.postgameChapters(), chapter => chapter.id), [region.id]);
assert.strictEqual(game.Story.mainChapters().filter(chapter => chapter.number >= 1).length, 15);
for (const route of routes) for (const sceneId of [route.openingStoryId, route.discoveryStoryId, route.clearStoryId || route.optionalStoryId]) assert(data.storyScenes[sceneId], `${sceneId} exists`);

for (const id of routes.flatMap(route => route.encounters.flatMap(encounter => encounter.groups.flat()))) {
  const monster = data.monsters[id];
  assert(monster && data.monsterFamilies[id]?.length, `${id} has combat and family data`);
  assert(monster.signatureDrops.materials.length && data.items[monster.signatureDrops.equipment.itemId]?.dropOnly, `${id} has fixed material and equipment drops`);
}
assert.strictEqual(data.monsters.ashsea_leviathan.bossDrop.itemId, "ashsea_crown");
assert.strictEqual(data.monsters.distant_observer.bossDrop.itemId, "distant_eye_bow");
assert.strictEqual(data.monsters.reach_devourer.bossDrop.itemId, "boundary_plate");
for (const id of ["ashwake_sabre", "cinderveil_cloak", "graytide_aegis", "aftersea_staff", "horizon_rapier", "watcher_robe", "ashsea_crown", "distant_eye_bow", "boundary_plate"]) assert(data.items[id].skillIds.length >= 4, `${id} has fixed skills`);
assert.strictEqual(data.recipes.filter(recipe => recipe.unlockAfter === region.id).length, 3);

require("./helpers").createCharacter(game, "星後の遠征者", "warrior");
require("./helpers").completeThrough(game, "end_of_starless_night");
assert(game.Story.mainComplete() && game.Story.current() === undefined, "The main story remains complete before postgame progression");
assert(!game.Story.canEnter(dungeon.id), "The first reach still requires the chapter-15 optional sanctum");
game.Story.recordResult({ success: true, dungeonId: "afterstar_sanctum" });
assert(game.Story.canEnter(dungeon.id) && !state.story.completed.includes(region.id));
const beforeGold = state.gold;
required.forEach((route, index) => {
  game.Story.recordResult({ success: true, dungeonId: route.id });
  assert.strictEqual(state.story.completed.includes(region.id), index === required.length - 1);
});
assert(state.story.completed.includes(region.id) && state.gold === beforeGold + region.rewards.gold);
assert.strictEqual(game.Items.count("watcher_lens"), 2);
assert(game.Story.canEnter("five_reaches_nest"));
assert(game.Story.mainComplete() && game.Story.current() === undefined && game.Story.focus().chapter.id === "end_of_starless_night", "Postgame progress never reopens or replaces the main-story finale");
assert(game.SaveTransfer.parse(JSON.stringify(state)).ok);
console.log("Postgame reaches test passed: separate chapter kind, five Lv110-115 routes, optional challenge, fixed loot, story continuity, rewards and save validation");
