const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
let now = 1700000000000;
const context = vm.createContext({ window: {}, Date, Math, Blob, console });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  if (file === "js/runtime.js") context.window.GameRuntime.configure({ now: () => now, random: () => .5 });
  if (file === "js/storage.js") context.window.SaveStorage.use({ get: key => storage.get(key) || null, set: (key, value) => storage.set(key, value), remove: key => storage.delete(key) });
}
const game = context.window;
assert.strictEqual(game.GameData.skills.fireball.category, "spell");
assert.strictEqual(game.GameData.skills.heal.category, "healing");
assert.strictEqual(game.GameData.skills.power_strike.category, "technique");
assert.strictEqual(game.GameData.skills.rear_protection.category, "passive");
assert.strictEqual(game.GameData.skills.emergency_heal.category, "reaction");
function hero(id, skills, overrides = {}) {
  return { id, name: id, level: 5, jobId: "warrior", position: 0, weaponRange: "melee", actionRates: { attack: 0, technique: 100, spell: 0, healing: 0 }, skillIds: skills,
    stats: { hp: 99999, attack: 10, defense: 0, magicAttack: 20, magicDefense: 0, magicHealing: 10, hitRate: 1.2, evasionRate: 0, speed: 100, criticalRate: 0, ...overrides } };
}
const dungeon = { id: "meadow", name: "分類試験", encounters: [{ name: "長期戦", groups: [["slime"]] }], rewards: { gold: [1, 1], exp: [1, 1] }, drops: [] };
Object.assign(game.GameData.monsters.slime, { hp: 99999, attack: 1, magicAttack: 1, defense: 0, magicDefense: 0, speed: 1, hitRate: 1.2, evasionRate: 0, criticalRate: 0 });
game.GameRuntime.seededRandom = () => () => .5;
function fight(members, targetDungeon = dungeon) { return game.Battle.resolve({ seed: 42, partyIds: [], partySnapshot: members }, targetDungeon); }
const techniqueUser = hero("技使用者", ["power_strike"]);
const spellUser = hero("呪文使用者", ["fireball"]); spellUser.actionRates = { attack: 0, technique: 0, spell: 100, healing: 0 };
const cooldown = fight([techniqueUser, spellUser]);
// Obsolete metadata cannot select a different combat implementation.
for (const battleVersion of [1, 2, 3, 4, 5, 6]) {
  const tagged = game.Battle.resolve({ seed: 42, battleVersion, explorationVersion: 1, partyIds: [], partySnapshot: [techniqueUser, spellUser] }, dungeon);
  assert.strictEqual(JSON.stringify(tagged), JSON.stringify(cooldown));
}
const uses = cooldown.battleLog.filter(entry => entry.text.includes("次の同種スキル"));
assert.deepStrictEqual(Array.from(uses, entry => entry.round), [1, 1, 11, 11, 21, 21]);
assert(cooldown.battleLog.some(entry => entry.kind === "guard"), "A technique-only policy should defend while its technique is on cooldown");
const rear = hero("後列", [], { speed: 90 }); rear.position = 1;
Object.assign(game.GameData.monsters.slime, { attack: 30, targetRule: "rear" });
const unprotected = fight([hero("前列", []), rear]);
const protectedResult = fight([hero("前列", ["rear_protection"]), rear]);
const taken = result => result.memberReports.find(entry => entry.name === "後列").damageTaken;
assert(taken(protectedResult) < taken(unprotected));
assert(protectedResult.battleLog.some(entry => entry.text.includes("後方守護・2/3倍")));
const supporter = hero("号令役", ["battle_command"]);
const attacker = hero("攻撃役", []); attacker.position = 1; attacker.actionRates = { attack: 100, technique: 0, spell: 0, healing: 0 };
assert(fight([supporter, attacker]).memberReports[1].damageDealt > fight([hero("号令役", []), attacker]).memberReports[1].damageDealt);
// The same aura does not stack; death disables it immediately.
const a = { currentHp: 1, position: 0, skillIds: ["battle_command", "rear_protection"] };
const b = { currentHp: 1, position: 1, skillIds: ["battle_command", "rear_protection"] };
const unit = { currentHp: 1, position: 2, allies: [a, b] };
assert.strictEqual(game.SkillCombat.attackMultiplier(unit), 1.2);
assert.strictEqual(game.SkillCombat.protection(unit), 2 / 3);
a.currentHp = b.currentHp = 0;
assert.strictEqual(game.SkillCombat.attackMultiplier(unit), 1);
assert.strictEqual(game.SkillCombat.protection(unit), 1);
Object.assign(game.GameData.monsters.slime, { targetRule: null, attack: 35 });
const reaction = fight([hero("回復役", ["emergency_heal"], { hp: 200, speed: 1 })]);
assert.strictEqual(reaction.battleLog.filter(entry => entry.text.includes("【リアクション】")).length, 1);
const lethal = fight([hero("回復役", ["emergency_heal"], { hp: 1, speed: 1 })]);
assert(!lethal.battleLog.some(entry => entry.text.includes("【リアクション】")));
game.GameRuntime.seededRandom = () => () => .1;
const counter = fight([hero("反撃役", ["counter_stance"], { hp: 9999 })]);
assert(counter.battleLog.some(entry => entry.text.includes("【パッシブ・反撃】")));
assert(counter.battleLog.length < 500);
const restart = fight([hero("使用者", ["power_strike"])], { ...dungeon, encounters: [{ name: "一戦目", groups: [["horn_rabbit"]] }, { name: "二戦目", groups: [["horn_rabbit"]] }] });
assert.strictEqual(restart.battleLog.filter(entry => entry.text.includes("次の同種スキル") && entry.round === 1).length, 2);
async function run() {
  const id = require("./helpers").createCharacter(game, "分類保存", "warrior", "human", "guard").id;
  game.Characters.get(id).level = 40; game.Party.toggle(id);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow" })).ok);
  assert(!("battleVersion" in game.GameState.data.expeditions[0]));
  assert(game.GameState.data.expeditions[0].partySnapshot[0].skillIds.includes("rear_protection"));
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  now += 30000; await game.GameClient.execute("expedition.collect");
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  console.log("Skill categories test passed: four types, independent 10-turn category cooldowns, normal fallback, aura/protection/no stacking/death, immediate one-shot healing/lethal guards, bounded counters, encounter reset and saved/offline rules");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
