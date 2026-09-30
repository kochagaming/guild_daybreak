const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, "..");
const storage = new Map();
let now = 1700000000000, fail = false, writes = 0;
const context = vm.createContext({ window: {}, Date, Math, Blob, console: { warn() {} } });
const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1]).filter(file => !["js/ui.js", "js/main.js"].includes(file));
for (const file of scripts) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .25 });
  if (file === "js/storage.js") context.window.SaveStorage.use({
    get: key => storage.get(key) || null,
    set: (key, value) => { if (fail) throw new Error("quota"); writes++; storage.set(key, value); },
    remove: key => storage.delete(key)
  });
}
const game = context.window;
async function run() {
  const rootReference = game.GameState.data;
  assert((await game.GameClient.execute("recruitment.post", { jobId: "warrior" })).ok);
  const created = await game.GameClient.execute("recruitment.hire", { applicantId: game.Recruitment.state().pending.candidates.find(candidate => candidate.jobId === "warrior").id, name: "時計の冒険者" });
  assert(created.ok);
  assert.strictEqual(game.Characters.get(created.id).createdAt, now);
  assert.strictEqual(game.GameState.data.meta.updatedAt, now);
  assert.strictEqual(writes, 2);
  const snapshot = game.GameClient.snapshot(); snapshot.gold = 0;
  assert.strictEqual(game.GameState.data.gold, 500 - created.cost);
  const results = await Promise.all([game.GameClient.execute("shop.buy", { itemId: "wooden_sword" }), game.GameClient.execute("shop.buy", { itemId: "cloth_clothes" })]);
  assert(results.every(result => result.ok));
  assert.strictEqual(game.GameState.data.gold, 360 - created.cost);
  results[0].instance.modifiers.attack = 999;
  assert.notStrictEqual(game.Items.getInstance(results[0].instance.id).modifiers.attack, 999);
  const before = JSON.stringify(game.GameState.data), persisted = storage.get(game.SaveSystem.exportKey);
  fail = true; now++;
  assert(!(await game.GameClient.execute("shop.buy", { itemId: "wooden_sword" })).ok);
  assert.strictEqual(JSON.stringify(game.GameState.data), before);
  assert.strictEqual(storage.get(game.SaveSystem.exportKey), persisted);
  assert.strictEqual(game.GameState.data, rootReference);
  assert(!(await game.GameClient.execute("save.reset")).ok);
  assert.strictEqual(JSON.stringify(game.GameState.data), before);
  assert.strictEqual(storage.get(game.SaveSystem.exportKey), persisted);
  fail = false;
  for (const [type, payload] of [["constructor", {}], ["shop.buy", { itemId: "constructor" }], ["equipment.unequip", { characterId: created.id, slot: "__proto__" }], ["party.select", { partyIndex: "1" }], ["expedition.collect", { now: 9999999999999 }]]) assert(!(await game.GameClient.execute(type, payload)).ok);
  assert.strictEqual(JSON.stringify(game.GameState.data), before);
  const cyclic = {}; cyclic.self = cyclic;
  assert(!(await game.GameClient.execute("bad", cyclic)).ok);
  assert((await game.GameClient.execute("party.toggle", { characterId: created.id, partyIndex: 0 })).ok);
  const startWrites = writes;
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", partyIndex: 0 })).ok);
  assert.strictEqual(writes, startWrites + 1, "Departure + chapter reward commits once.");
  assert.strictEqual(game.GameState.data.expeditions[0].startedAt, now);
  assert.strictEqual(game.GameState.data.expeditions[0].seed, Math.floor(.25 * 2147483646) + 1);
  const noOpWrites = writes;
  assert.strictEqual((await game.GameClient.execute("expedition.collect")).result, null);
  assert.strictEqual(writes, noOpWrites);
  // Set up two strong, disjoint parties and advance only the injected clock.
  game.GameState.data.expeditions[0] = null;
  require("./helpers").completeThrough(game, "seal");
  game.GameState.data.unlockedPartyCount = 2;
  assert((await game.GameClient.execute("recruitment.post")).ok);
  const ally = (await game.GameClient.execute("recruitment.hire", { applicantId: game.Recruitment.state().pending.candidates[0].id, name: "もう一つの隊" })).id;
  game.Characters.get(created.id).level = 99;
  game.Characters.get(ally).level = 99;
  assert((await game.GameClient.execute("party.toggle", { characterId: ally, partyIndex: 1 })).ok);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", partyIndex: 0 })).ok);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", partyIndex: 1 })).ok);
  const active = JSON.stringify(game.GameState.data), gold = game.GameState.data.gold;
  now += 30000; fail = true;
  assert(!(await game.GameClient.execute("expedition.collect")).ok);
  assert.strictEqual(JSON.stringify(game.GameState.data), active);
  fail = false;
  const completionWrites = writes;
  const collection = await game.GameClient.execute("expedition.collect");
  assert(collection.ok && collection.result);
  assert.strictEqual(writes, completionWrites + 1, "Both returns commit together.");
  assert.strictEqual(game.Dungeon.activeCount(), 0);
  const reports = game.GameState.data.partyResults;
  assert.strictEqual(game.GameState.data.gold, gold + reports[0].gold + reports[1].gold);
  assert.strictEqual((await game.GameClient.execute("expedition.collect")).result, null);
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  const imported = game.GameClient.snapshot(); imported.gold = 777;
  assert((await game.GameClient.execute("save.import", { state: imported })).ok);
  assert.strictEqual(game.GameState.data.gold, 777);
  assert(game.SaveSystem.readBackup());
  // A future async transport uses the same command envelope; no actual network.
  let release, calls = [];
  const barrier = new Promise(resolve => { release = resolve; });
  game.GameClient.useTransport({ execute: async command => {
    calls.push(command);
    if (calls.length === 1) await barrier;
    return { ok: true, id: command.payload.id };
  } });
  const payload = { id: "first" };
  const first = game.GameClient.execute("test.transport", payload);
  payload.id = "changed";
  const second = game.GameClient.execute("test.transport", { id: "second" });
  await Promise.resolve(); await Promise.resolve();
  assert.strictEqual(calls.length, 1);
  release();
  assert.strictEqual((await first).id, "first");
  assert.strictEqual((await second).id, "second");
  assert.strictEqual(calls[0].version, 1);
  game.GameClient.useTransport({ execute: () => { throw new Error("offline"); } });
  assert(!(await game.GameClient.execute("test.transport")).ok);
  game.GameClient.useLocal();
  assert((await game.GameClient.execute("save.reset")).ok);
  assert.strictEqual(game.GameState.data.gold, 500);
  assert.strictEqual(game.GameState.data, rootReference);
  assert.strictEqual(game.GameState.data.meta.updatedAt, now);
  console.log("Infrastructure test passed: swappable storage/clock/random, command validation, async queue and detached DTOs, atomic commits/rollback, parallel collection once, import backup and legacy APIs");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
