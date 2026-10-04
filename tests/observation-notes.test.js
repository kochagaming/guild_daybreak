const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {} });
for (const file of ["data/masterSchema.js", "data/qualities.js", "data/ultraRareTitles.js", "data/creatureFamilies.js", "data/observationNotes.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const data = context.window.GameData;
const notes = data.observationNotes;
assert(Array.isArray(notes) && notes.length >= 10, "The journal has enough entries to grow with progress");
assert.strictEqual(new Set(notes.map(note => note.id)).size, notes.length, "Journal IDs are unique");
for (const note of notes) {
  assert(note.category && note.title && note.author && note.lead, `${note.id} has diary metadata`);
  assert(note.unlock?.type && note.unlockHint, `${note.id} has an unlock rule and hint`);
  assert(note.paragraphs.length >= 2 && note.findings.length >= 2, `${note.id} has prose and margin notes`);
}
const byId = Object.fromEntries(notes.map(note => [note.id, note]));
assert.strictEqual(byId.choosing_an_action.unlock.type, "always");
assert.deepStrictEqual(Array.from(data.config.qualityTables.drop, row => Array.from(row)), [["broken",8],["worn",14],["crude",14],["standard",28],["wellmade",12],["familiar",8],["refined",4],["fine",4],["exquisite",2],["hefty",2],["featherlight",2],["legendary",1],["divine",1]]);
assert(byId.quality_weights.paragraphs.join("").includes("極上2") && byId.quality_weights.paragraphs.join("").includes("神がかった1"), "The diary mirrors the expanded drop-quality table");
assert.strictEqual(byId.weight_efficiency.unlock.type, "itemDiscovered");
assert.strictEqual(byId.ironbound_locks.unlock.type, "treasureTierEncountered");
assert.strictEqual(byId.starsealed_locks.unlock.treasureTierId, "starsealed");
assert.strictEqual(byId.treasure_opening_practice.unlock.type, "treasureTierMastered");
assert.strictEqual(byId.treasure_opening_practice.unlock.openings, 3);
assert.strictEqual(byId.weight_efficiency.unlock.itemId, "steel_sword");
assert(!byId.weight_efficiency.paragraphs.join("").includes("重量効率") && byId.weight_efficiency.paragraphs.join("").includes("荷袋"));
assert.strictEqual(data.config.ultraRare.dropChance, .001);
assert.strictEqual(data.config.ultraRare.statMultiplier, 2);
assert(byId.ultra_rare_titles.paragraphs.join("").includes("千個に一個") && byId.ultra_rare_titles.paragraphs.join("").includes("2倍"));
assert.strictEqual(data.config.monsterLoot.normalChance, .1);
assert.strictEqual(data.config.monsterLoot.bossChance, .2);
assert(byId.monster_spoils.findings.includes("通常装備：一般10%・ボス20%が基準"));
assert.strictEqual(byId.ailment_triage.unlock.chapterId, "starfall");
assert(byId.ailment_triage.paragraphs.join("").includes("麻痺") && byId.ailment_triage.paragraphs.join("").includes("錬金工房"));
assert(byId.ailment_triage.findings.some(entry => entry.includes("通常行動を待たず")));
const routeNoteIds = ["hidden_passage_signs", "sheltered_camp_signs", "unstable_footing_signs", "forgotten_inscription_signs", "material_traces_signs"];
assert.deepStrictEqual(Array.from(routeNoteIds, id => byId[id].unlock.routeEventId).sort(), ["hidden_passage", "sheltered_camp", "unstable_footing", "forgotten_inscription", "material_traces"].sort());
routeNoteIds.forEach(id => {
  assert.strictEqual(byId[id].unlock.type, "routeEventEncountered");
  assert(!byId[id].paragraphs.join("").includes("%"), `${id} leaves exact odds for the player to infer`);
});
const practicedRouteNoteIds = ["hidden_passage_practice", "sheltered_camp_practice", "unstable_footing_practice", "forgotten_inscription_practice", "material_traces_practice"];
assert.deepStrictEqual(Array.from(practicedRouteNoteIds, id => byId[id].unlock.routeEventId).sort(), ["hidden_passage", "sheltered_camp", "unstable_footing", "forgotten_inscription", "material_traces"].sort());
practicedRouteNoteIds.forEach(id => {
  assert.strictEqual(byId[id].unlock.type, "routeEventMastered");
  assert.strictEqual(byId[id].unlock.successes, 3);
  assert(!byId[id].paragraphs.join("").includes("%"), `${id} describes learned clues without exposing hidden odds`);
});
assert.strictEqual(byId.familiar_companion_signals.unlock.type, "sharedSorties");
assert.strictEqual(byId.familiar_companion_signals.unlock.minimum, 5);
assert.strictEqual(byId.trusted_companion_formation.unlock.minimum, 20);
assert(!byId.familiar_companion_signals.paragraphs.join("").match(/1\.0[24]|%/), "Relationship observations leave their hidden battle and route modifiers for the player to infer");
console.log("Observation notes test passed: unique progressive diary entries and master-data-aligned findings");
