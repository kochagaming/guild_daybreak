const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {} });
for (const file of ["data/qualities.js", "data/ultraRareTitles.js", "data/creatureFamilies.js", "data/observationNotes.js"]) {
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
assert.deepStrictEqual(Array.from(data.qualityTables.drop, row => Array.from(row)), [["broken",10],["worn",18],["standard",35],["familiar",14],["hefty",8],["featherlight",8],["fine",5.5],["divine",1.5]]);
assert(byId.quality_weights.paragraphs.join("").includes("神がかった1.5"), "The diary mirrors the drop-quality table");
assert.strictEqual(data.ultraRareConfig.dropChance, .001);
assert.strictEqual(data.ultraRareConfig.statMultiplier, 2);
assert(byId.ultra_rare_titles.paragraphs.join("").includes("千個に一個") && byId.ultra_rare_titles.paragraphs.join("").includes("2倍"));
assert.strictEqual(data.monsterLoot.normalChance, .1);
assert.strictEqual(data.monsterLoot.bossChance, .2);
assert(byId.monster_spoils.findings.includes("通常装備：一般10%・ボス20%が基準"));
console.log("Observation notes test passed: unique progressive diary entries and master-data-aligned findings");
