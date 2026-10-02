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
assert.deepStrictEqual(Array.from(data.qualityTables.drop, row => Array.from(row)), [["broken",8],["worn",14],["crude",14],["standard",28],["wellmade",12],["familiar",8],["refined",4],["fine",4],["exquisite",2],["hefty",2],["featherlight",2],["legendary",1],["divine",1]]);
assert(byId.quality_weights.paragraphs.join("").includes("極上2") && byId.quality_weights.paragraphs.join("").includes("神がかった1"), "The diary mirrors the expanded drop-quality table");
assert.strictEqual(byId.weight_efficiency.unlock.type, "itemDiscovered");
assert.strictEqual(byId.weight_efficiency.unlock.itemId, "steel_sword");
assert(!byId.weight_efficiency.paragraphs.join("").includes("重量効率") && byId.weight_efficiency.paragraphs.join("").includes("荷袋"));
assert.strictEqual(data.ultraRareConfig.dropChance, .001);
assert.strictEqual(data.ultraRareConfig.statMultiplier, 2);
assert(byId.ultra_rare_titles.paragraphs.join("").includes("千個に一個") && byId.ultra_rare_titles.paragraphs.join("").includes("2倍"));
assert.strictEqual(data.monsterLoot.normalChance, .1);
assert.strictEqual(data.monsterLoot.bossChance, .2);
assert(byId.monster_spoils.findings.includes("通常装備：一般10%・ボス20%が基準"));
console.log("Observation notes test passed: unique progressive diary entries and master-data-aligned findings");
