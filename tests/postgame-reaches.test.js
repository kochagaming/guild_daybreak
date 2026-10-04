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
for (const route of routes) {
  const storyLinks = data.relations.dungeonStoryLinks[route.id];
  for (const sceneId of [storyLinks.openingStoryId, storyLinks.discoveryStoryId, route.clearStoryId || route.optionalStoryId]) assert(data.storyScenes[sceneId], `${sceneId} exists`);
}

for (const id of routes.flatMap(route => route.encounters.flatMap(encounter => encounter.groups.flat()))) {
  const monster = data.monsters[id];
  assert(monster && data.relations.monsterFamilies[id]?.length, `${id} has combat and family data`);
  const signature = data.relations.monsterSignatureDrops[id];
  assert(signature.materials.length && data.items[signature.equipment.itemId]?.dropOnly, `${id} has fixed material and equipment drops`);
}
assert.strictEqual(data.monsters.ashsea_leviathan.bossDrop.itemId, "ashsea_crown");
assert.strictEqual(data.monsters.distant_observer.bossDrop.itemId, "distant_eye_bow");
assert.strictEqual(data.monsters.reach_devourer.bossDrop.itemId, "boundary_plate");
for (const id of ["ashwake_sabre", "cinderveil_cloak", "graytide_aegis", "aftersea_staff", "horizon_rapier", "watcher_robe", "ashsea_crown", "distant_eye_bow", "boundary_plate"]) assert(data.relations.itemSkillGrants[id].length >= 4, `${id} has fixed skills`);
const stagedRecipes = [
  ["forge_aftersea_staff", "gray_ash_sea"],
  ["forge_horizon_rapier", "inverted_glass_canyon"],
  ["forge_watcher_robe", "worldskin_garden"]
];
stagedRecipes.forEach(([recipeId, dungeonId]) => assert.strictEqual(data.recipes.find(recipe => recipe.id === recipeId).unlockAfter, dungeonId));

require("./helpers").createCharacter(game, "星後の遠征者", "warrior");
require("./helpers").completeThrough(game, "end_of_starless_night");
assert(game.Story.mainComplete() && game.Story.current() === undefined, "The main story remains complete before postgame progression");
assert(!game.Story.canEnter(dungeon.id), "The first reach still requires the chapter-15 optional sanctum");
game.Story.recordResult({ success: true, dungeonId: "afterstar_sanctum" });
while (game.Story.pendingEpisode()) game.Story.readPending();
assert(game.Story.canEnter(dungeon.id) && !state.story.completed.includes(region.id));
assert(stagedRecipes.every(([recipeId]) => !game.Story.canCraft(data.recipes.find(recipe => recipe.id === recipeId))));
const beforeGold = state.gold;
required.forEach((route, index) => {
  const result = { success: true, dungeonId: route.id };
  game.Story.recordResult(result);
  if (index < stagedRecipes.length) {
    const [recipeId] = stagedRecipes[index];
    const recipe = data.recipes.find(entry => entry.id === recipeId);
    assert(game.Story.canCraft(recipe), `${recipeId} unlocks after ${route.id}`);
    assert(game.Story.recipeCondition(recipe).includes("攻略で解放"));
    assert.deepStrictEqual(Array.from(result.newRecipeIds), [recipeId]);
  }
  assert.strictEqual(state.story.completed.includes(region.id), index === required.length - 1);
});
assert(state.logs.some(entry => entry.text.includes("新しい製作記録") && entry.text.includes("星後海の導杖")));
assert(state.story.completed.includes(region.id) && state.gold === beforeGold + region.rewards.gold);
assert.strictEqual(game.Items.count("watcher_lens"), 2);
assert(game.Story.canEnter("five_reaches_nest"));
assert(game.Story.mainComplete() && game.Story.current() === undefined && game.Story.focus().chapter.id === "end_of_starless_night", "Postgame progress never reopens or replaces the main-story finale");
assert(game.SaveTransfer.parse(JSON.stringify(state)).ok);
console.log("Postgame reaches test passed: separate chapter kind, five Lv110-115 routes, optional challenge, fixed loot, story continuity, rewards and save validation");
