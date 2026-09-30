const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
let now = 1700000000000;
function load() {
  const context = vm.createContext({ window: {}, Date, Math, Blob, console });
  for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
    if (["js/ui.js", "js/main.js"].includes(file)) continue;
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
    if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .5 });
    if (file === "js/storage.js") context.window.SaveStorage.use({ get: key => storage.get(key) || null, set: (key, value) => storage.set(key, value), remove: key => storage.delete(key) });
  }
  return context.window;
}
let game = load();
function expectation(dungeon) {
  const totals = {};
  dungeon.encounters.forEach(encounter => encounter.groups.forEach(group => group.forEach(id => {
    (game.GameData.monsters[id].materialDrops || []).forEach(drop => {
      totals[drop.itemId] = (totals[drop.itemId] || 0) + drop.chance * (drop.quantity[0] + drop.quantity[1]) / 2 / encounter.groups.length * (dungeon.materialRates ? dungeon.materialRates[drop.itemId] : 1);
    });
  })));
  return totals;
}
for (const dungeon of Object.values(game.GameData.dungeons)) {
  const base = expectation(dungeon);
  for (let m = 1; m <= 6; m++) {
    const plan = game.Exploration.plan(dungeon, m), total = expectation(plan);
    assert.strictEqual(plan.encounters.length, dungeon.encounters.length * m);
    assert.strictEqual(plan.rewardScale, Math.sqrt(m));
    if (m === 6) for (const kind of ["gold", "exp"]) {
      assert(dungeon.rewards[kind][1] * plan.rewardScale < dungeon.rewards[kind][0] * m, "Even the highest long-run reward must be below successful short runs combined");
    }
    assert.strictEqual(plan.encounters.filter(encounter => encounter.name === dungeon.encounters.at(-1).name).length, 1, "The final encounter must occur once per departure");
    if (m > 1) {
      Object.keys(base).forEach(id => assert(total[id] < base[id] * m && total[id] <= base[id] * Math.sqrt(m) + 1e-9));
      assert(Object.values(total).reduce((a, b) => a + b, 0) > Object.values(base).reduce((a, b) => a + b, 0));
    }
  }
}
async function run() {
  const id = require("./helpers").createCharacter(game, "長時間試験", "warrior").id;
  game.Characters.get(id).base = { hp: 99999, attack: 99999, defense: 99999 };
  assert(game.Party.toggle(id).ok);
  for (const value of [0, 7, 1.5, "6", null]) assert(!(await game.GameClient.execute("expedition.start", { dungeonId: "meadow", timeMultiplier: value })).ok);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", timeMultiplier: 6 })).ok);
  const expedition = JSON.parse(JSON.stringify(game.GameState.data.expeditions[0]));
  assert.strictEqual(expedition.endsAt - expedition.startedAt, 180000);
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  const bad = JSON.parse(JSON.stringify(game.GameState.data)); bad.expeditions[0].timeMultiplier = 7;
  assert(!game.SaveTransfer.parse(JSON.stringify(bad)).ok);
  bad.expeditions[0].timeMultiplier = 2;
  assert(!game.SaveTransfer.parse(JSON.stringify(bad)).ok);
  const legacy = JSON.parse(JSON.stringify(game.GameState.data));
  delete legacy.expeditions[0].timeMultiplier;
  legacy.expeditions[0].endsAt = legacy.expeditions[0].startedAt + 30000;
  assert(!game.SaveTransfer.parse(JSON.stringify(legacy)).ok);
  const short = game.Battle.resolve({ ...expedition, timeMultiplier: 1 }, game.GameData.dungeons.meadow);
  const long = game.Battle.resolve(expedition, game.GameData.dungeons.meadow);
  assert(short.success && long.success && long.totalEncounters === 18);
  assert(long.gold > short.gold && long.exp > short.exp);
  assert(long.gold < short.gold * 6 && long.exp < short.exp * 6);
  const quest = game.GameData.commissions.find(q => q.dungeonId === "meadow" && q.type !== "clear");
  game.Commissions.recordResult({ dungeonId: "meadow", success: true, timeMultiplier: 6 }, { [quest.monsterId]: 12 });
  assert.strictEqual(game.GameState.data.commissions.progress[quest.id], 2);
  game.Commissions.recordResult({ dungeonId: "meadow", success: true, timeMultiplier: 1 }, { [quest.monsterId]: 2 });
  assert.strictEqual(game.GameState.data.commissions.progress[quest.id], 4);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(game.Battle.resolve(expedition, game.GameData.dungeons.meadow))), JSON.parse(JSON.stringify(long)));
  game = load(); now += 179999;
  await game.GameClient.execute("expedition.collect");
  assert(game.GameState.data.expeditions[0]);
  now++;
  assert((await game.GameClient.execute("expedition.collect")).ok);
  assert(!game.GameState.data.expeditions[0]);
  assert.strictEqual(game.GameState.data.lastResult.timeMultiplier, 6);
  assert.strictEqual(game.GameState.data.lastResult.totalEncounters, 18);
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  const gold = game.GameState.data.gold;
  now += 999999; await game.GameClient.execute("expedition.collect");
  assert.strictEqual(game.GameState.data.gold, gold);
  console.log("Exploration time test passed: 1–6 choices, route counts, one boss, per-material short-run efficiency, extra gold/XP, deterministic snapshots, validation, missing-field rejection and offline once-only completion without auto-repeat");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
