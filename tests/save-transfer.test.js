const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");
const storage = new Map();
let failKey = null, clicked = 0, revoked = 0;
const context = vm.createContext({ console, window: {}, Date, Math, Blob, setTimeout: fn => fn(),
  URL: { createObjectURL: blob => { assert(blob instanceof Blob); return "blob:test"; }, revokeObjectURL: () => revoked++ },
  document: { body: { appendChild: () => {} }, createElement: () => ({ click: () => clicked++, remove: () => {} }) },
  localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => { if (key === failKey) throw new Error("quota"); storage.set(key, value); }, removeItem: key => storage.delete(key) }
});
["data/items.js", "data/facilities.js", "data/qualities.js", "data/equipmentSkills.js", "data/skills.js", "data/jobs.js", "data/origins.js", "data/affinities.js", "data/skillGrants.js", "data/portraits.js", "data/monsters.js", "data/dungeons.js", "data/recipes.js", "js/runtime.js", "js/storage.js", "js/save.js", "js/gameState.js", "js/equipmentSkills.js", "js/characters.js", "js/items.js", "js/party.js", "js/exploration.js", "data/skillCategories.js", "js/skillCombat.js", "js/statusCombat.js", "js/battle.js", "js/dungeon.js", "js/saveTransfer.js"].forEach(file => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context));
const game = context.window, transfer = game.SaveTransfer;
const created = require("./helpers").createCharacter(game, "バックアップ", "cleric", "elf", "sacred", "archer");
game.Items.equip(created.id, "item-1");
game.Party.toggle(created.id);
game.Characters.setActionRates(created.id, { attack: 10, technique: 10, spell: 10, healing: 70 });
assert(game.Dungeon.start("meadow").ok);
const clone = () => JSON.parse(JSON.stringify(game.GameState.data));
const snapshot = clone();
{ const parsed = transfer.parse(JSON.stringify(snapshot)); assert(parsed.ok, parsed.message); }
assert(transfer.parse("\uFEFF" + JSON.stringify(snapshot)).ok);
game.GameState.data.gold = 12345;
game.GameState.save();
const previous = JSON.stringify(game.GameState.data);
assert(transfer.restore(snapshot).ok);
assert.strictEqual(game.GameState.data.gold, snapshot.gold);
assert.strictEqual(storage.get(transfer.backupKey), previous);
assert.strictEqual(game.GameState.data.expeditions[0].partySnapshot[0].actionRates.healing, 70);
assert.strictEqual(game.Characters.get(created.id).portraitId, "archer");
transfer.download(); transfer.download(true);
assert.strictEqual(clicked, 2); assert.strictEqual(revoked, 2);
function invalid(change) {
  const bad = clone(); change(bad);
  const before = JSON.stringify(game.GameState.data), persisted = storage.get(game.SaveSystem.exportKey);
  assert(!transfer.restore(bad).ok);
  assert.strictEqual(JSON.stringify(game.GameState.data), before);
  assert.strictEqual(storage.get(game.SaveSystem.exportKey), persisted);
}
invalid(state => state.version = 99);
invalid(state => state.gold = -1);
invalid(state => state.characters[0].exp = Number.MAX_SAFE_INTEGER);
invalid(state => state.inventory.equipment.push(state.inventory.equipment[0]));
invalid(state => state.characters[0].equipment.push("item-999"));
invalid(state => state.inventory.equipment[0].templateId = "missing");
invalid(state => state.parties[0].push(created.id));
invalid(state => state.meta.nextItemId = 1);
invalid(state => state.expeditions[0].partySnapshot[0].stats.attack = "<script>");
invalid(state => state.expeditions[0].partySnapshot[0].skillIds = ["invalid"]);
invalid(state => state.expeditions[0].trackedItemId = "missing-item");
invalid(state => { state.partyPlans[0] = { dungeonId: "missing", difficultyId: "normal", timeMultiplier: 1 }; });
invalid(state => { state.partyNames[0] = " "; });
assert(!transfer.parse("{broken").ok);
assert(!transfer.parse('{"__proto__": {}}').ok);
assert(!transfer.parse(" ".repeat(transfer.MAX_BYTES + 1)).ok);
for (const key of [transfer.backupKey, game.SaveSystem.exportKey]) {
  const before = JSON.stringify(game.GameState.data), persisted = storage.get(game.SaveSystem.exportKey);
  failKey = key;
  assert(!transfer.restore(snapshot).ok);
  assert.strictEqual(JSON.stringify(game.GameState.data), before);
  assert.strictEqual(storage.get(game.SaveSystem.exportKey), persisted);
  failKey = null;
}
game.GameState.data.expeditions[0].endsAt = Date.now() - 1;
game.Dungeon.completeIfReady();
assert(transfer.parse(JSON.stringify(game.GameState.data)).ok, "戦績とドロップを含む完了データも読み込めること");
const invalidHistoryBattle = clone();
invalidHistoryBattle.partyHistory[0][0].battle.damageDealt = -1;
assert(!transfer.parse(JSON.stringify(invalidHistoryBattle)).ok, "Negative expedition-history battle totals must be rejected");
const invalidHistorySetup = clone();
invalidHistorySetup.partyHistory[0][0].partySetup[0].equipmentWeight = invalidHistorySetup.partyHistory[0][0].partySetup[0].maximumWeight + 1;
assert(!transfer.parse(JSON.stringify(invalidHistorySetup)).ok, "Invalid expedition-history loadouts must be rejected");
const invalidRecipeResult = clone();
invalidRecipeResult.lastResult.newRecipeIds = ["missing-recipe"];
assert(!transfer.parse(JSON.stringify(invalidRecipeResult)).ok, "Unknown recipe unlocks must be rejected");
const invalidUltraResult = clone();
invalidUltraResult.lastResult.drops.push({ itemId: "wooden_sword", quantity: 1, displayName: "未知の称号付き木の剣", qualityId: "standard", ultraRareTitleId: "missing-title" });
assert(!transfer.parse(JSON.stringify(invalidUltraResult)).ok, "Unknown ultra-rare result titles must be rejected");
const invalidTrackedResult = clone();
invalidTrackedResult.lastResult.trackedItemId = "missing-item";
invalidTrackedResult.lastResult.trackedItemQuantity = 1;
assert(!transfer.parse(JSON.stringify(invalidTrackedResult)).ok, "Unknown tracked result items must be rejected");
const completed = clone();
game.GameState.reset();
assert(transfer.restore(completed).ok);
assert(game.GameState.data.lastResult.memberReports.length === 1);
console.log("Save transfer test passed: round trip, downloads, offline expedition, results, validation, backup and storage failures");

