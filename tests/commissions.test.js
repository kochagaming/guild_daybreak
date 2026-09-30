const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
let now = 1700000000000, failSave = false;
function load() {
  const context = vm.createContext({ window: {}, Date, Math, Blob, console: { ...console, warn() {} } });
  const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1]).filter(file => !["js/ui.js", "js/main.js"].includes(file));
  for (const file of scripts) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
    if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .5 });
    if (file === "js/storage.js") context.window.SaveStorage.use({ get: key => storage.get(key) || null, set: (key, value) => { if (failSave) throw Error("full"); storage.set(key, value); }, remove: key => storage.delete(key) });
  }
  return context.window;
}
let game = load();
assert.strictEqual(game.GameData.commissions.length, 22);
assert.strictEqual(new Set(game.GameData.commissions.map(quest => quest.id)).size, 22);
for (const quest of game.GameData.commissions) {
  assert(game.GameData.dungeons[quest.dungeonId]);
  if (quest.type === "kills") assert(game.GameData.monsters[quest.monsterId]);
  for (const id of Object.keys(quest.rewards.materials)) assert.strictEqual(game.GameData.items[id].type, "material");
}
for (const [dungeonId, monsterId, materialId, seals] of [
  ["cinder_throne", "cinder_sovereign", "crown_core", 2],
  ["mirror_palace", "mirror_queen", "tide_heart", 2],
  ["hourglass_palace", "time_queen", "royal_spring", 3],
  ["night_bloom_sanctuary", "nightbloom_oracle", "saint_thorn", 3],
  ["aurora_summit", "aurora_warden", "aurora_feather", 3],
  ["eclipsed_throne", "eclipse_regent", "eclipse_shard", 3],
  ["blackmoon_core", "blackmoon_heart", "royal_eclipse_fragment", 3]
]) {
  const clear = game.GameData.commissions.find(quest => quest.id === `first_${dungeonId}`);
  const hunt = game.GameData.commissions.find(quest => quest.id === `hunt_${dungeonId}`);
  assert(clear && hunt && hunt.monsterId === monsterId);
  assert.strictEqual(clear.rewards.materials[materialId], 2);
  assert.strictEqual(clear.rewards.materials.guild_seal, seals);
}
game.Commissions.recordResult({ dungeonId: "meadow", success: false }, { slime: 2, horn_rabbit: 1 });
assert.strictEqual(game.Commissions.state().progress.first_meadow, 0);
assert.strictEqual(game.Commissions.state().progress.hunt_meadow, 2);
assert.strictEqual(game.Commissions.state().progress.hunt_cave, undefined);
game.Commissions.recordResult({ dungeonId: "meadow", success: true }, { slime: 4 });
assert.strictEqual(game.Commissions.state().progress.hunt_meadow, 5);
assert.strictEqual(game.Commissions.state().progress.first_meadow, 1);
async function run() {
  assert(!(await game.GameClient.execute("commission.claim", { commissionId: "unknown" })).ok);
  assert(!(await game.GameClient.execute("commission.claim", { commissionId: "first_cave" })).ok);
  const gold = game.GameState.data.gold, materials = JSON.stringify(game.GameState.data.inventory.materials);
  failSave = true;
  assert(!(await game.GameClient.execute("commission.claim", { commissionId: "first_meadow" })).ok);
  failSave = false;
  assert.strictEqual(game.GameState.data.gold, gold);
  assert.strictEqual(JSON.stringify(game.GameState.data.inventory.materials), materials);
  assert.strictEqual(game.Commissions.state().claimed.length, 0);
  const claims = await Promise.all([game.GameClient.execute("commission.claim", { commissionId: "first_meadow" }), game.GameClient.execute("commission.claim", { commissionId: "first_meadow" })]);
  assert.strictEqual(claims.filter(result => result.ok).length, 1);
  assert.strictEqual(game.GameState.data.gold, gold + 60);
  assert.strictEqual(game.GameState.data.inventory.materials.beast_hide, 2);
  assert.strictEqual(game.GameState.data.inventory.materials.guild_seal, 5);
  game = load();
  assert(game.Commissions.state().claimed.includes("first_meadow"));
  assert(!(await game.GameClient.execute("commission.claim", { commissionId: "first_meadow" })).ok);
  assert((await game.GameClient.execute("commission.claim", { commissionId: "hunt_meadow" })).ok);
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  const saved = JSON.stringify(game.GameState.data), bad = JSON.parse(saved);
  bad.commissions.claimed.push("hunt_meadow");
  assert(!game.SaveTransfer.parse(JSON.stringify(bad)).ok);
  for (const [id, value] of [["hunt_meadow", -1], ["hunt_meadow", 6], ["missing", 1]]) {
    const invalid = JSON.parse(saved); invalid.commissions.progress[id] = value;
    assert(!game.SaveTransfer.parse(JSON.stringify(invalid)).ok);
  }
  const invalidClaim = JSON.parse(saved); invalidClaim.commissions.claimed.push("first_cave");
  assert(!game.SaveTransfer.parse(JSON.stringify(invalidClaim)).ok);
  // Actual partial fight counts only kills, not enemies that appeared or remained alive.
  const testDungeon = { id: "meadow", name: "試験", encounters: [{ name: "戦場", groups: [["slime", "ancient_sentinel"]] }], rewards: { gold: [1, 1], exp: [1, 1] }, drops: [] };
  const weak = { id: "adventurer-1", name: "挑戦者", level: 1, jobId: "warrior", position: 0, weaponRange: "melee", skillIds: [], stats: { hp: 1, attack: 30, defense: 0, speed: 100, criticalRate: 0 } };
  game.GameRuntime.seededRandom = () => () => 0;
  const outcome = game.Battle.resolve({ seed: 1, partyIds: [], partySnapshot: [weak] }, testDungeon);
  assert(!outcome.success && outcome.monsterCounts.slime === 1 && !outcome.monsterCounts.ancient_sentinel);
  assert.strictEqual(Object.values(outcome.monsterCounts).reduce((sum, count) => sum + count, 0), outcome.monstersDefeated);
  game.GameState.reset();
  const a = require("./helpers").createCharacter(game, "攻略隊", "warrior", "human", "common").id;
  const b = require("./helpers").createCharacter(game, "収集隊", "mage", "human", "common").id;
  game.Characters.get(a).level = 50; game.Characters.get(b).level = 50;
  require("./helpers").completeThrough(game, "seal");
  game.GameState.data.unlockedPartyCount = 2;
  game.Party.toggle(a, 0); game.Party.toggle(b, 1);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", partyIndex: 0 })).ok);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow", partyIndex: 1 })).ok);
  game = load(); now += 30000;
  const collected = await game.GameClient.execute("expedition.collect");
  assert(collected.ok && game.GameState.data.partyResults.slice(0, 2).every(result => result.success));
  assert.strictEqual(game.Commissions.state().progress.first_meadow, 1);
  assert(game.Commissions.state().progress.hunt_meadow > 0);
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  const progress = JSON.stringify(game.Commissions.state());
  game = load();
  assert.strictEqual((await game.GameClient.execute("expedition.collect")).result, null);
  assert.strictEqual(JSON.stringify(game.Commissions.state()), progress);
  game.GameState.reset();
  assert.strictEqual(Object.keys(game.Commissions.state().progress).length, 0);
  console.log("Commissions test passed: clear/partial kill progress, guild-seal rewards, caps, locks, once-only rewards, atomic rollback, backups/reset and simultaneous offline party aggregation");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
