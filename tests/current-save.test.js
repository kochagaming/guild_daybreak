const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1]).filter(file => !["js/ui.js", "js/main.js"].includes(file));
let raw = null, writes = 0;
function load() {
  const context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: {
    getItem: () => raw, setItem: (key, value) => { raw = value; writes++; }, removeItem: () => { raw = null; }
  } });
  scripts.forEach(file => vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file }));
  return context.window;
}
let game = load();
assert(!game.GameState.loadError);
assert.strictEqual(game.Characters.create, undefined);
assert(!("legacy" in game.GameState.data.story));
game.GameState.save();
const current = raw;
game = load();
assert(!game.GameState.loadError);
assert.strictEqual(JSON.stringify(game.GameState.data), current);
assert(game.SaveTransfer.parse(current).ok);
const recruitmentV1 = JSON.parse(current);
recruitmentV1.recruitment.version = 1;
raw = JSON.stringify(recruitmentV1); game = load();
assert(game.GameState.loadError);
assert(!game.SaveTransfer.parse(raw).ok);
raw = current; game = load();
for (const version of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  const state = JSON.parse(current); state.version = version; raw = JSON.stringify(state);
  const before = raw, count = writes;
  game = load();
  assert(game.GameState.loadError);
  assert.throws(() => game.GameState.save());
  assert.strictEqual(raw, before);
  assert.strictEqual(writes, count);
  assert(!game.SaveTransfer.parse(raw).ok);
}
for (const field of ["story", "facilities", "recruitment", "commissions", "recurringMissions", "presets", "accessCodes", "parties", "unlockedPartyCount", "expeditions", "activeParty", "partyResults"]) {
  const state = JSON.parse(current); delete state[field];
  assert(!game.SaveTransfer.parse(JSON.stringify(state)).ok, field + " must not be supplied by a migration");
}
raw = current; game = load();
game.GameState.data.story.legacy = true;
assert(!game.Story.canEnter("cave"));
assert(!game.Story.canCraft(game.GameData.recipes.find(recipe => recipe.unlockAfter === "seal")));
raw = JSON.stringify({ version: 1 });
game = load(); game.GameState.reset();
assert(!game.GameState.loadError && game.SaveTransfer.parse(raw).ok);
assert.strictEqual(game.GameState.data.gold, 500);
async function startupError() {
  raw = JSON.stringify({ version: 1 });
  game = load();
  const before = raw, count = writes, nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { innerHTML: "", textContent: "", listeners: {}, addEventListener(type, action) { this.listeners[type] = action; } });
    return nodes.get(id);
  };
  let start;
  const document = { addEventListener(type, handler) { start = handler; }, getElementById: node, querySelector: node };
  game.confirm = () => false;
  game.GameClient.execute = () => { throw new Error("Automatic commands must be stopped"); };
  const context = vm.createContext({ window: game, document, console, setTimeout });
  vm.runInContext(fs.readFileSync(path.join(root, "js/main.js"), "utf8"), context);
  await start();
  assert(node("app").innerHTML.includes("download-unreadable-save"));
  assert(node("save-load-error").textContent.includes("旧形式"));
  node('[data-action="reset-save"]').listeners.click();
  assert.strictEqual(raw, before); assert.strictEqual(writes, count);
  console.log("Current save test passed: version-11 round trip, no direct creation API, old versions rejected without writes, required fields, no story bypass, explicit reset and blocked startup/cancelled reset");
}
startupError().catch(error => { console.error(error); process.exitCode = 1; });
