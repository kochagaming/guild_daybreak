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
const member = (position, skills = []) => ({ id: `adventurer-${position + 1}`, name: `仲間${position}`, level: 4, jobId: "mage", position, actionRates: { attack: skills.length ? 0 : 100, technique: skills.some(id => game.GameData.skills[id]?.category === "technique") ? 100 : 0, spell: skills.some(id => game.GameData.skills[id]?.category === "spell") ? 100 : 0, healing: 0 }, weaponRange: "ranged", skillIds: skills, stats: { hp: 9999, attack: 20, defense: 5, speed: 1, criticalRate: 0 } });
const expedition = members => ({ seed: 42, partyIds: [], partySnapshot: members });
const dungeon = ids => ({ id: "cave", name: "試験場", strategy: { preparation: ["penetration"] }, encounters: [{ name: "試験戦闘", groups: [ids] }], rewards: { gold: [1, 1], exp: [1, 1] }, drops: [] });
const originalMonsters = JSON.stringify(game.GameData.monsters);
const attack = result => Number(result.battleLog.find(entry => entry.kind === "skill").text.match(/に(\d+)ダメージ/)[1]);
game.GameRuntime.seededRandom = () => () => .5;
const magic = expedition([member(2, ["fireball"])]);
const current = game.Battle.resolve(magic, dungeon(["stone_golem"]));
assert(current.strategyReport.magicWeaknessHits > 0);
assert(current.strategyReport.penetrationHits === current.strategyReport.magicWeaknessHits);
assert(current.strategyReport.magicWeaknessDamage > 0);
assert(current.battleLog.some(entry => entry.text.includes("魔法弱点・1.25倍")));
assert.strictEqual(JSON.stringify(game.GameData.monsters), originalMonsters, "Master definitions are immutable.");
const weak = member(2, ["power_strike"]); weak.stats.attack = 1;
const physical = game.Battle.resolve(expedition([weak]), dungeon(["stone_golem"]));
assert.strictEqual(physical.strategyReport.magicWeaknessHits, 0);
assert(physical.defeatFacts.every(text => !text.includes("しましょう") && !text.includes("検討")));
const caster = member(2, ["arcane_burst"]); caster.stats.attack = 100;
const area = game.Battle.resolve(expedition([caster]), dungeon(["slime", "slime"]));
assert.strictEqual(area.strategyReport.areaHits, 2, "Count each target of an area attack.");
assert.strictEqual(area.strategyReport.penetrationHits, 2);
const group = [member(0), member(1), member(2)]; group[2].stats.hp = 1;
game.GameData.monsters.wraith.hp = 99999;
const rear = game.Battle.resolve(expedition(group), dungeon(["wraith"]));
const enemy = rear.battleLog.filter(entry => entry.kind === "enemy");
assert(enemy[0].text.includes("仲間2") && enemy[0].text.includes("後列狙い"));
assert(enemy[1].text.includes("仲間1"), "Fall back to the last living position.");
assert.strictEqual(rear.strategyReport.rearHits, enemy.length);
assert.strictEqual(rear.strategyReport.rearKnockouts, 1);
assert(rear.defeatFacts.some(text => text.includes("後列狙い")));
const solo = game.Battle.resolve(expedition([member(0)]), dungeon(["wraith"]));
assert(solo.strategyReport.rearHits > 0, "Rear rule also works for a one-person party.");
require("./helpers").createCharacter(game, "育成中", "mage", "human", "common", "mage");
const character = game.GameState.data.characters[0];
character.level = 4;
// Offline result persistence, import validation, exactly-once rewards and old-version saves.
async function persistence() {
  game.Party.toggle(character.id);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow" })).ok);
  assert(!("battleVersion" in game.GameState.data.expeditions[0]));
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  game = load(); now += 30000;
  const response = await game.GameClient.execute("expedition.collect");
  assert(response.ok && response.result.strategyReport);
  const saved = JSON.stringify(game.GameState.data);
  assert(game.SaveTransfer.parse(saved).ok);
  const bad = JSON.parse(saved); bad.lastResult.strategyReport.rearDamage = -1;
  assert(!game.SaveTransfer.parse(JSON.stringify(bad)).ok);
  const gold = game.GameState.data.gold;
  game = load();
  assert.strictEqual(JSON.stringify(game.GameState.data.lastResult.strategyReport), JSON.stringify(response.result.strategyReport));
  assert.strictEqual((await game.GameClient.execute("expedition.collect")).result, null);
  assert.strictEqual(game.GameState.data.gold, gold);
  console.log("Dungeon strategy test passed: magic vulnerability, penetration/area metrics, rear targeting/fallback, current rules, preparation, offline/save validation and exactly-once rewards");
}
persistence().catch(error => { console.error(error); process.exitCode = 1; });
