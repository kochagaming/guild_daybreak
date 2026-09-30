const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
let now = 1700000000000;
function load() {
  const context = vm.createContext({ window: {}, Date, Math, Blob, console });
  const scripts = Array.from(fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g), match => match[1]).filter(file => !["js/ui.js", "js/main.js"].includes(file));
  for (const file of scripts) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
    if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .5 });
    if (file === "js/storage.js") context.window.SaveStorage.use({ get: key => storage.get(key) || null, set: (key, value) => storage.set(key, value), remove: key => storage.delete(key) });
  }
  return context.window;
}
let game = load();
const originalBoss = JSON.parse(JSON.stringify(game.GameData.monsters.storm_regent));
const boss = game.GameData.monsters.storm_regent;
boss.hp = 99999; boss.attack = 80;
const dungeon = { id: "observatory", name: "試験場", encounters: [{ name: "翼王の祭壇", groups: [["storm_regent"]] }], rewards: { gold: [1, 1], exp: [1, 1] }, drops: [] };
const member = behavior => ({ id: "adventurer-1", name: "遅い戦士", level: 8, jobId: "warrior", position: 0, actionRates: behavior === "aggressive" ? { attack: 100, technique: 0, spell: 0, healing: 0 } : { attack: 100, technique: 100, spell: 0, healing: 0 }, weaponRange: "melee", skillIds: ["iron_guard"], stats: { magicDefense: 20, hp: 9999, attack: 40, defense: 20, speed: 1, criticalRate: 0 } });
const expedition = behavior => ({ seed: 42, partyIds: [], partySnapshot: [member(behavior)] });
const seeded = game.Battle.resolve(expedition("balanced"), dungeon);
assert.strictEqual(JSON.stringify(seeded), JSON.stringify(game.Battle.resolve(expedition("balanced"), dungeon)));
assert.strictEqual(JSON.stringify(boss.mechanic), JSON.stringify(originalBoss.mechanic), "Mechanic definitions must not be mutated.");
// Constant draws isolate damage, phase order and guard timing from RNG variance.
const seededRandom = game.GameRuntime.seededRandom;
game.GameRuntime.seededRandom = () => () => .5;
const balanced = game.Battle.resolve(expedition("balanced"), dungeon);
const aggressive = game.Battle.resolve(expedition("aggressive"), dungeon);
const support = game.Battle.resolve(expedition("supportive"), dungeon);
assert.strictEqual(balanced.mechanicReport.warnings, 8);
assert.strictEqual(balanced.mechanicReport.bursts, 8);
assert.strictEqual(balanced.mechanicReport.guardedHits, 3);
assert.strictEqual(balanced.mechanicReport.unguardedHits, 5);
assert.strictEqual(support.mechanicReport.guardedHits, 3);
assert.strictEqual(aggressive.mechanicReport.guardedHits, 0);
assert.strictEqual(balanced.mechanicReport.weaknessHits, 5);
assert.strictEqual(balanced.battleLog.filter(entry => entry.kind === "enemy" && entry.round === 4).length, 2);
assert(balanced.battleLog.some(entry => entry.kind === "warning" && entry.round === 1));
assert(!balanced.battleLog.some(entry => entry.kind === "burst" && entry.round === 1));
assert(balanced.battleLog.some(entry => entry.kind === "burst" && entry.round === 2));
assert(balanced.battleLog.some(entry => entry.kind === "weakness" && entry.round === 3));
assert(!balanced.battleLog.some(entry => entry.kind === "enemy" && entry.round === 3));
const damage = entry => Number(entry.text.match(/に(\d+)ダメージ/)[1]);
const firstBlast = result => result.battleLog.find(entry => entry.kind === "enemy" && entry.text.includes("天雷崩落"));
assert.strictEqual(damage(firstBlast(balanced)), Math.round(damage(firstBlast(aggressive)) * .5));
const normalHit = balanced.battleLog.find(entry => entry.kind === "hero" && entry.round === 2);
const weaknessHit = balanced.battleLog.find(entry => entry.kind === "hero" && entry.round === 3);
assert.strictEqual(damage(weaknessHit), Math.round(damage(normalHit) * 1.5));
assert(weaknessHit.text.includes("被ダメージ1.5倍"));
assert(balanced.survivors[0].hp > aggressive.survivors[0].hp);
assert(aggressive.defeatFacts.some(fact => fact.includes("30ターン")));
assert(balanced.defeatFacts.some(fact => fact.includes("総被ダメージ")));
// No guard skill: do not invent a defense action; explain it after a loss.
const fragile = expedition("balanced"); fragile.partySnapshot[0].stats.hp = 80; fragile.partySnapshot[0].skillIds = [];
const defeated = game.Battle.resolve(fragile, dungeon);
assert(!defeated.success && defeated.mechanicReport.burstKnockouts === 1);
assert.strictEqual(defeated.mechanicReport.guardedHits, 0);
assert(defeated.defeatFacts.some(fact => fact.includes("軽減なし")));
// Every living party member receives the blast, independently guarded.
const mixed = expedition("balanced");
mixed.partySnapshot.push({ ...member("aggressive"), id: "adventurer-2", name: "攻撃役", position: 1 });
const mixedReport = game.Battle.resolve(mixed, dungeon);
assert.strictEqual(mixedReport.mechanicReport.guardedHits, 3);
assert.strictEqual(mixedReport.mechanicReport.unguardedHits, 13);
// Kill during the response window: cancel the queued blast, no phantom hit.
boss.hp = 1;
const cancelled = game.Battle.resolve(expedition("balanced"), dungeon);
assert(cancelled.success && cancelled.mechanicReport.warnings === 1 && cancelled.mechanicReport.bursts === 0);
assert.strictEqual(cancelled.defeatFacts.length, 0);
assert(!cancelled.battleLog.some(entry => entry.kind === "burst"));
game.GameData.monsters.storm_regent = originalBoss;
game.GameRuntime.seededRandom = seededRandom;
async function persistence() {
  assert((await game.GameClient.execute("recruitment.post", { jobId: "warrior" })).ok);
  const hero = (await game.GameClient.execute("recruitment.hire", { applicantId: game.Recruitment.state().pending.candidates.find(candidate => candidate.jobId === "warrior").id, name: "保存する戦士" })).id;
  game.Characters.get(hero).level = 8;
  require("./helpers").completeThrough(game, "starfall");
  assert((await game.GameClient.execute("party.toggle", { characterId: hero })).ok);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "observatory" })).ok);
  game.GameState.save();
  game = load(); now += 180000;
  const result = await game.GameClient.execute("expedition.collect");
  assert(result.ok && result.result && !result.result.success);
  assert(result.result.defeatFacts.length > 0);
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  const clone = () => JSON.parse(JSON.stringify(game.GameState.data));
  const invalidHints = clone(); invalidHints.lastResult.defeatFacts = [42];
  assert(!game.SaveTransfer.parse(JSON.stringify(invalidHints)).ok);
  const invalidReport = clone(); invalidReport.lastResult.mechanicReport.guardedHits = -1;
  assert(!game.SaveTransfer.parse(JSON.stringify(invalidReport)).ok);
  const old = clone();
  [old.lastResult, ...old.partyResults].filter(Boolean).forEach(report => { delete report.defeatFacts; delete report.mechanicReport; });
  assert(game.SaveTransfer.parse(JSON.stringify(old)).ok);
  const gold = game.GameState.data.gold;
  game = load();
  assert(game.GameState.data.lastResult.defeatFacts.length > 0);
  assert.strictEqual((await game.GameClient.execute("expedition.collect")).result, null);
  assert.strictEqual(game.GameState.data.gold, gold);
  console.log("Boss mechanics test passed: telegraph timing, slow guards, policies, group burst/half damage, exposed damage, cancellation, deterministic results, defeat evidence and offline/save compatibility");
}
persistence().catch(error => { console.error(error); process.exitCode = 1; });
