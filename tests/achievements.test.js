const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const game = context.window, definitions = game.GameData.achievements;
assert(definitions.length >= 15, "The ledger provides enough goals for long-term play");
assert.strictEqual(new Set(definitions.map(entry => entry.id)).size, definitions.length, "Achievement IDs are unique");
const conditionTypes = new Set(["characters", "partyMembers", "chapters", "postgameChapters", "specificDungeonClear", "dungeonClears", "optionalClears", "divineClears", "monsterSpecies", "monsterDefeats", "itemTypes", "equipmentSetCompletions", "companionMemories", "companionPairMemories", "companionBonds", "routeEventEncounters", "routeRumorConfirmations", "routeEventMasteries", "teamSurveys", "treasureTierMasteries", "ultraRareOwned", "facilityUpgrades"]);
for (const entry of definitions) {
  assert(entry.id && entry.name && entry.description && entry.category && entry.icon, `${entry.id} has display metadata`);
  assert(entry.secret == null || typeof entry.secret === "boolean", `${entry.id} has a valid secrecy flag`);
  assert((Number.isInteger(entry.condition.target) && entry.condition.target > 0) || (["routeEventEncounters", "routeRumorConfirmations", "routeEventMasteries", "treasureTierMasteries"].includes(entry.condition.type) && entry.condition.target === "all"), `${entry.id} has a positive or data-driven target`);
  assert(conditionTypes.has(entry.condition.type), `${entry.id} has a supported condition type`);
  if (entry.condition.type === "specificDungeonClear") assert(game.GameData.dungeons[entry.condition.dungeonId], `${entry.id} points to a known dungeon`);
}

game.GameState.reset();
assert.strictEqual(game.Achievements.summary().completed, 0, "A new guild starts with an empty achievement ledger");
assert(definitions.find(entry => entry.id === "five_reaches_wedge").secret, "The optional postgame boss remains a secret until defeated");
const state = game.GameState.data;
state.characters = Array.from({ length: 30 }, (_, index) => ({ id: `hero-${index + 1}` }));
state.parties[0] = state.characters.slice(0, 6).map(character => character.id);
state.story.completed = game.GameData.storyChapters.filter(chapter => chapter.number >= 1).map(chapter => chapter.id);
state.story.facts.clears = Object.keys(game.GameData.dungeons);
state.story.facts.difficultyClears = Object.keys(game.GameData.dungeons).slice(0, 10).map(id => `${id}:divine`);
state.encyclopedia.items = Object.fromEntries(Object.keys(game.GameData.items).slice(0, 100).map(id => [id, 1]));
Object.values(game.GameData.equipmentSets).flatMap(definition => definition.itemIds).forEach(id => { state.encyclopedia.items[id] = 1; });
state.encyclopedia.monsters = Object.fromEntries(Object.keys(game.GameData.monsters).slice(0, 30).map(id => [id, { encountered: 4, defeated: 4 }]));
const allTravelMemories = game.GameData.config.explorationEvents.companionMoments.flatMap(moment => moment.lines.map((_, index) => `${moment.id}:${index}`));
const pairTravelMemory = game.GameData.config.explorationEvents.companionMoments.find(moment => moment.companionIds.length > 1);
state.story.facts.companionMoments = [...allTravelMemories.slice(0, 11), `${pairTravelMemory.id}:0`];
state.inventory.equipment.push({ id: "ultra-test", templateId: "wooden_sword", ultraRareTitleId: "dragon_slayer" });
game.GameData.config.facilities.trackOrder.forEach(trackId => { state.facilities.mine.levels[trackId] = 3; });
assert.strictEqual(game.Achievements.count({ type: "companionMemories" }, state), 12);
assert(game.Achievements.count({ type: "companionPairMemories" }, state) >= 1, "Pair memories are derived from witnessed two-person scenes");
assert.strictEqual(game.Achievements.count({ type: "companionBonds" }, state), 0, "Incomplete pair memories do not count as travel bonds");
state.story.facts.companionMoments = allTravelMemories;
state.story.facts.routeEvents = Object.fromEntries(game.GameData.config.explorationEvents.routeEvents.map(event => [event.id, { encounters: 3, successes: 3, rumorMatches: 1 }]));
state.story.facts.treasureTiers = Object.fromEntries(game.GameData.config.explorationEvents.treasure.types.filter(tier => tier.challenge).map(tier => [tier.id, { encounters: 3, openings: 3 }]));
state.story.facts.teamSurveys = 10;

const all = game.Achievements.entries();
assert(all.every(entry => entry.complete && entry.ratio === 1), "Every milestone can be derived from an advanced current save");
assert.strictEqual(game.Achievements.summary().completed, definitions.length);
assert.strictEqual(game.Achievements.count({ type: "monsterDefeats" }, state), 120);
assert.strictEqual(game.Achievements.count({ type: "facilityUpgrades" }, state), 6);
assert.strictEqual(game.Achievements.count({ type: "equipmentSetCompletions" }, state), Object.keys(game.GameData.equipmentSets).length);
assert.strictEqual(game.Achievements.count({ type: "postgameChapters" }, state), 1);
assert.strictEqual(game.Achievements.count({ type: "specificDungeonClear", dungeonId: "five_reaches_nest" }, state), 1);
assert.strictEqual(game.Achievements.count({ type: "companionBonds" }, state), 8, "A bond is derived only after every line of a pair moment is witnessed");
const routeEventCount = game.GameData.config.explorationEvents.routeEvents.length;
assert.strictEqual(game.Achievements.count({ type: "routeEventEncounters" }, state), routeEventCount, "Every distinct route event can be discovered");
assert.strictEqual(game.Achievements.count({ type: "routeRumorConfirmations" }, state), routeEventCount, "Every distinct route rumor can be confirmed in the field");
assert.strictEqual(game.Achievements.count({ type: "routeEventMasteries" }, state), routeEventCount, "Every route event can become shared field knowledge");
assert.strictEqual(game.Achievements.count({ type: "treasureTierMasteries" }, state), 2, "Only challenged sealed-chest tiers count toward opening mastery");
assert.strictEqual(game.Achievements.count({ type: "teamSurveys" }, state), 10, "Coordinated surveys use the durable guild exploration fact");
state.partyHistory[0] = [];
assert.strictEqual(game.Achievements.count({ type: "teamSurveys" }, state), 10, "Survey progress survives visible history trimming");
assert(["first_travel_memory", "shared_travel_memory", "travel_memory_keeper", "four_travel_bonds", "eight_travel_bonds", "all_route_signs", "all_rumors_confirmed", "field_guide_complete", "first_team_survey", "ten_team_surveys", "sealed_chest_scholar"].every(id => definitions.find(entry => entry.id === id).secret), "Discovery achievements remain concealed until completed");
assert(Object.isFrozen(all[0]), "Achievement results are read-only views, not save records");
assert(!Object.prototype.hasOwnProperty.call(state, "achievements"), "Achievements do not add derived data to the save format");
console.log("Achievements test passed: unique definitions, current-state derivation, all condition types, capped progress and no save-schema changes");
