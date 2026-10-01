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
for (const entry of definitions) {
  assert(entry.id && entry.name && entry.description && entry.category && entry.icon, `${entry.id} has display metadata`);
  assert(Number.isInteger(entry.condition.target) && entry.condition.target > 0, `${entry.id} has a positive target`);
}

game.GameState.reset();
assert.strictEqual(game.Achievements.summary().completed, 0, "A new guild starts with an empty achievement ledger");
const state = game.GameState.data;
state.characters = Array.from({ length: 30 }, (_, index) => ({ id: `hero-${index + 1}` }));
state.parties[0] = state.characters.slice(0, 6).map(character => character.id);
state.story.completed = game.GameData.storyChapters.filter(chapter => chapter.number >= 1).map(chapter => chapter.id);
state.story.facts.clears = Object.keys(game.GameData.dungeons);
state.story.facts.difficultyClears = Object.keys(game.GameData.dungeons).slice(0, 10).map(id => `${id}:divine`);
state.encyclopedia.items = Object.fromEntries(Object.keys(game.GameData.items).slice(0, 100).map(id => [id, 1]));
state.encyclopedia.monsters = Object.fromEntries(Object.keys(game.GameData.monsters).slice(0, 30).map(id => [id, { encountered: 4, defeated: 4 }]));
state.inventory.equipment.push({ id: "ultra-test", templateId: "wooden_sword", ultraRareTitleId: "dragon_slayer" });
game.GameData.facilities.trackOrder.forEach(trackId => { state.facilities.mine.levels[trackId] = 3; });

const all = game.Achievements.entries();
assert(all.every(entry => entry.complete && entry.ratio === 1), "Every milestone can be derived from an advanced current save");
assert.strictEqual(game.Achievements.summary().completed, definitions.length);
assert.strictEqual(game.Achievements.count({ type: "monsterDefeats" }, state), 120);
assert.strictEqual(game.Achievements.count({ type: "facilityUpgrades" }, state), 6);
assert(Object.isFrozen(all[0]), "Achievement results are read-only views, not save records");
assert(!Object.prototype.hasOwnProperty.call(state, "achievements"), "Achievements do not add derived data to the save format");
console.log("Achievements test passed: unique definitions, current-state derivation, all condition types, capped progress and no save-schema changes");
