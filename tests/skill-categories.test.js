const fs = require("fs"), vm = require("vm"), path = require("path"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
let now = 1700000000000;
const context = vm.createContext({ window: {}, Date, Math, Blob, console });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["data/masterFinalize.js", "js/ui.js", "js/main.js"].includes(file)) continue;
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
assert.strictEqual(game.SkillCombat.healingAmount({ hp: 100, magicHealing: 999, healingPower: 9, currentHp: 1, skillIds: [] }, game.SkillCombat.effect(game.GameData.skills.emergency_heal, "heal")), 20, "Reaction healing must honor its max-HP scaling and opt out of ordinary healing modifiers.");
function hero(id, skills, overrides = {}) {
  return { id, name: id, level: 5, jobId: "warrior", position: 0, weaponRange: "melee", actionRates: { attack: 0, technique: 100, spell: 0, healing: 0 }, skillIds: skills,
    stats: { hp: 99999, attack: 10, defense: 0, magicAttack: 20, magicDefense: 0, magicHealing: 10, hitRate: 1.2, evasionRate: 0, speed: 100, criticalRate: 0, ...overrides } };
}
const dungeon = { id: "meadow", name: "分類試験", encounters: [{ name: "長期戦", groups: [["slime"]] }], rewards: { gold: [1, 1], exp: [1, 1] }, drops: [] };
Object.assign(game.GameData.monsters.slime, { hp: 99999, attack: 1, magicAttack: 1, defense: 0, magicDefense: 0, speed: 1, hitRate: 1.2, evasionRate: 0, criticalRate: 0 });
game.GameRuntime.seededRandom = () => () => .5;
function fight(members, targetDungeon = dungeon) { return game.Battle.resolve({ seed: 42, partyIds: [], partySnapshot: members }, targetDungeon); }
const techniqueUser = hero("技使用者", ["power_strike"]);
const spellUser = hero("呪文使用者", ["dark_wave"]); spellUser.actionRates = { attack: 0, technique: 0, spell: 100, healing: 0 };
const cooldown = fight([techniqueUser, spellUser]);
// Obsolete metadata cannot select a different combat implementation.
for (const battleVersion of [1, 2, 3, 4, 5, 6]) {
  const tagged = game.Battle.resolve({ seed: 42, battleVersion, explorationVersion: 1, partyIds: [], partySnapshot: [techniqueUser, spellUser] }, dungeon);
  assert.strictEqual(JSON.stringify(tagged), JSON.stringify(cooldown));
}
const uses = cooldown.battleLog.filter(entry => entry.text.includes("再使用はターン"));
assert.deepStrictEqual(Array.from(uses.filter(entry => entry.text.includes("強撃")), entry => entry.round), [1, 11, 21]);
assert.deepStrictEqual(Array.from(uses.filter(entry => entry.text.includes("暗黒波")), entry => entry.round), [1, 21]);
assert(uses.some(entry => entry.text.includes("CT 10")) && uses.some(entry => entry.text.includes("CT 20")), "The log exposes each skill's cooldown");
assert(cooldown.battleLog.some(entry => entry.kind === "guard"), "A technique-only policy should defend while its technique is on cooldown");
const techniqueRotation = fight([hero("使い分け役", ["iaijutsu", "power_strike"])]);
const rotationUses = techniqueRotation.battleLog.filter(entry => entry.text.includes("再使用はターン"));
assert(rotationUses.some(entry => entry.round === 1 && entry.text.includes("居合斬り")));
assert(rotationUses.some(entry => entry.round === 2 && entry.text.includes("強撃")), "Another technique remains usable while the first technique cools down");
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
game.GameData.skills.temporary_active_aura = {
  id: "temporary_active_aura", name: "未発動の一時号令", category: "technique",
  activation: { type: "active", cooldownTurns: 10 }, targeting: { scope: "self" },
  effects: [{ type: "damage", multiplier: 1 }, { type: "statMultiplier", target: "party", stat: "attack", multiplier: 9 }]
};
game.GameData.skills.temporary_reaction_wall = {
  id: "temporary_reaction_wall", name: "未発動の一時防壁", category: "reaction",
  activation: { type: "reaction", trigger: "hpBelow", threshold: .5 }, targeting: { scope: "self" },
  effects: [{ type: "heal", multiplier: .1 }, { type: "rearProtection", multiplier: .01 }]
};
game.GameData.skills.temporary_active_counter = {
  id: "temporary_active_counter", name: "未発動の反撃技", category: "technique",
  activation: { type: "active", cooldownTurns: 10 }, targeting: { scope: "singleEnemy" },
  effects: [{ type: "damage", multiplier: 1 }, { type: "counter", chance: 1, multiplier: 9 }]
};
const inactiveSource = { currentHp: 1, position: 0, skillIds: ["temporary_active_aura", "temporary_reaction_wall"] };
const inactiveTarget = { currentHp: 1, position: 1, skillIds: [], allies: [inactiveSource] };
assert.strictEqual(game.SkillCombat.attackMultiplier(inactiveTarget), 1, "Active effects must not become permanent party auras before use.");
assert.strictEqual(game.SkillCombat.protection(inactiveTarget), 1, "Reaction effects must not become permanent rear protection before triggering.");
const counterLog = [];
const counterHero = { currentHp: 10, hp: 10, side: "hero", skillIds: ["temporary_active_counter"], metrics: { healingDone: 0, healingAttempted: 0, overhealing: 0 }, reactionsUsed: new Set() };
const counterAttacker = { currentHp: 10, name: "攻撃役" };
let counterCalls = 0;
game.SkillCombat.afterDamage(() => 0, counterAttacker, counterHero, { actualDamage: 1 }, () => { counterCalls++; return { actualDamage: 9, missed: false }; }, counterLog, 1, 1);
assert.strictEqual(counterCalls, 0, "An unused active skill's counter effect must not trigger as a permanent passive.");
delete game.GameData.skills.temporary_active_aura;
delete game.GameData.skills.temporary_reaction_wall;
delete game.GameData.skills.temporary_active_counter;
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
assert.strictEqual(restart.battleLog.filter(entry => entry.text.includes("再使用はターン") && entry.round === 1).length, 2);
async function run() {
  const id = require("./helpers").createCharacter(game, "分類保存", "warrior", "human", "guard").id;
  game.Characters.get(id).level = 40; game.Party.toggle(id);
  assert((await game.GameClient.execute("expedition.start", { dungeonId: "meadow" })).ok);
  assert(!("battleVersion" in game.GameState.data.expeditions[0]));
  assert(game.GameState.data.expeditions[0].partySnapshot[0].skillIds.includes("rear_protection"));
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  now += 30000; await game.GameClient.execute("expedition.collect");
  assert(game.SaveTransfer.parse(JSON.stringify(game.GameState.data)).ok);
  console.log("Skill categories test passed: four types, individual skill cooldowns and same-category rotation, normal fallback, aura/protection/no stacking/death, immediate one-shot healing/lethal guards, bounded counters, encounter reset and saved/offline rules");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
