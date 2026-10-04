const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, setTimeout, clearTimeout,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["data/masterFinalize.js", "js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window;

assert.deepStrictEqual(Object.keys(game.GameData.statusEffects), ["poison", "burn", "paralysis", "chill"]);
["neutral", "fire", "ice", "lightning", "nature", "dark", "arcane"].forEach(id => assert(game.GameData.elements[id]));
for (const skill of Object.values(game.GameData.skills)) {
  skill.effects.filter(effect => effect.type === "damage" && effect.element).forEach(effect => assert(game.GameData.elements[effect.element]));
  skill.effects.filter(effect => effect.type === "applyStatus").forEach(effect => assert(game.GameData.statusEffects[effect.statusId] && effect.chance > 0 && effect.duration > 0));
  skill.effects.filter(effect => effect.type === "cleanse" && effect.statusIds !== "all").forEach(effect => effect.statusIds.forEach(id => assert(game.GameData.statusEffects[id])));
}

const log = [], source = { name: "術者", metrics: { damageDealt: 0, statusDamageDealt: 0 }, strategyReport: { statusInflicted: 0, statusResisted: 0, statusDamage: 0 } };
const target = { name: "標的", hp: 100, currentHp: 100, statuses: {}, statusResistances: {}, metrics: { damageTaken: 0 } };
const chanceFailure = game.StatusCombat.apply(() => .9, source, target, { statusId: "poison", chance: .4, duration: 3 }, log, 1, 0);
assert(!chanceFailure.applied && !chanceFailure.resisted && chanceFailure.reason === "chance");
assert(log.some(entry => entry.text.includes("状態異常不発")) && source.strategyReport.statusResisted === 0, "A failed base proc must not be reported as enemy resistance.");
assert(game.StatusCombat.apply(() => 0, source, target, { statusId: "poison", chance: 1, duration: 3, potency: .04 }, log, 1, 1).applied);
for (let round = 2; round <= 4; round += 1) {
  game.StatusCombat.beginRound([target], log, 1, round);
  game.StatusCombat.endRound([target], log, 1, round);
}
assert.strictEqual(target.currentHp, 88);
assert(!target.statuses.poison && source.metrics.statusDamageDealt === 12 && source.strategyReport.statusDamage === 12);

const reactive = {
  side: "hero", name: "反応役", hp: 100, currentHp: 51, statuses: {}, statusResistances: {},
  skillIds: ["emergency_heal"], reactionsUsed: new Set(),
  metrics: { damageTaken: 0, healingDone: 0, healingAttempted: 0, overhealing: 0 }
};
game.StatusCombat.apply(() => 0, source, reactive, { statusId: "poison", chance: 1, duration: 1, potency: .04 }, log, 1, 4);
game.StatusCombat.beginRound([reactive], log, 1, 5);
assert.strictEqual(reactive.currentHp, 67, "Falling below half HP from periodic damage should trigger the one-shot emergency heal.");
assert(log.some(entry => entry.kind === "heal" && entry.text.includes("反応役") && entry.text.includes("リアクション")));
game.StatusCombat.beginRound([reactive], log, 1, 6);
assert.strictEqual(Array.from(reactive.reactionsUsed).length, 1, "The same health reaction remains limited to once per encounter.");

const detox = {
  side: "hero", name: "調薬役", hp: 100, currentHp: 100, statuses: {}, statusResistances: {},
  skillIds: ["instant_detox"], reactionsUsed: new Set(), reactionUseCounts: {},
  metrics: { damageTaken: 0, healingDone: 0, healingAttempted: 0, overhealing: 0 }
};
assert(game.StatusCombat.apply(() => 0, source, detox, { statusId: "poison", chance: 1, duration: 3 }, log, 1, 6).applied);
assert(!detox.statuses.poison && detox.reactionsUsed.has("instant_detox"), "A status-applied reaction should immediately remove its matching condition.");
assert(log.some(entry => entry.kind === "skill" && entry.text.includes("即時調薬")));
game.StatusCombat.apply(() => 0, source, detox, { statusId: "poison", chance: 1, duration: 3 }, log, 1, 7);
assert(detox.statuses.poison, "The once-per-encounter detox reaction must not trigger a second time.");

game.StatusCombat.apply(() => 0, source, target, { statusId: "burn", chance: 1, duration: 3 }, log, 1, 5);
assert.strictEqual(game.StatusCombat.attackMultiplier(target), .9);
assert.deepStrictEqual(Array.from(game.StatusCombat.cleanse(target, { type: "cleanse", count: 1, statusIds: ["burn"] }, log, 1, 5, "治療役")), ["burn"]);
assert.strictEqual(game.StatusCombat.attackMultiplier(target), 1);

const priorityTarget = { name: "複合異常役", hp: 100, currentHp: 100, statuses: {}, statusResistances: {} };
game.StatusCombat.apply(() => 0, source, priorityTarget, { statusId: "poison", chance: 1, duration: 3 }, log, 1, 5);
game.StatusCombat.apply(() => 0, source, priorityTarget, { statusId: "paralysis", chance: 1, duration: 1 }, log, 1, 5);
assert.deepStrictEqual(Array.from(game.StatusCombat.cleanseableStatusIds(priorityTarget, { type: "cleanse", count: 1, statusIds: "all" })), ["paralysis"], "A one-status cleanse should remove action denial before earlier, less urgent ailments.");
game.StatusCombat.cleanse(priorityTarget, { type: "cleanse", count: 1, statusIds: "all" }, log, 1, 5, "治療役");
assert(priorityTarget.statuses.poison && !priorityTarget.statuses.paralysis);

game.StatusCombat.apply(() => 0, source, target, { statusId: "paralysis", chance: 1, duration: 1 }, log, 1, 6);
game.StatusCombat.beginRound([target], log, 1, 7);
assert(target.skipTurn && log.some(entry => entry.text.includes("このターン行動できない")));
assert.strictEqual(game.StatusCombat.speedMultiplier(target), 1);
assert(target.skipTurn, "Reading speed modifiers for turn order must not accidentally clear paralysis.");
game.StatusCombat.endRound([target], log, 1, 7);
assert(!target.statuses.paralysis);

game.StatusCombat.apply(() => 0, source, target, { statusId: "paralysis", chance: 1, duration: 1 }, log, 1, 7);
game.StatusCombat.beginRound([target], log, 1, 8);
assert(target.skipTurn);
game.StatusCombat.cleanse(target, { type: "cleanse", count: 1, statusIds: ["paralysis"] }, log, 1, 8, "治療役");
assert(!target.skipTurn, "Cleansing paralysis before a unit acts should restore that turn.");

game.StatusCombat.apply(() => 0, source, target, { statusId: "chill", chance: 1, duration: 3 }, log, 1, 8);
assert.strictEqual(game.StatusCombat.speedMultiplier(target), .7);
assert.strictEqual(game.StatusCombat.evasionMultiplier(target), .65);
assert(log.some(entry => entry.text.includes("行動速度30%・回避35%低下")));
game.StatusCombat.cleanse(target, { type: "cleanse", count: 1, statusIds: ["chill"] }, log, 1, 8, "治療役");
assert.strictEqual(game.StatusCombat.speedMultiplier(target), 1);
assert.strictEqual(game.StatusCombat.evasionMultiplier(target), 1);

const automatonId = require("./helpers").createCharacter(game, "機巧試験", "warrior", "automaton", "common").id;
const automatonStats = game.Characters.stats(game.Characters.get(automatonId));
assert.strictEqual(automatonStats.statusResistances.poison, 1);
const immune = { name: "機巧試験", hp: 100, currentHp: 100, statusResistances: automatonStats.statusResistances, statuses: {} };
assert(game.StatusCombat.apply(() => 0, source, immune, { statusId: "poison", chance: 1, duration: 3 }, log, 1, 1).resisted);
const resistantEnemy = { name: "耐性標的", side: "enemy", hp: 100, currentHp: 100, statusResistances: { poison: .5 }, statuses: {}, observation: { statusResisted: [], statusLanded: [] } };
const resisted = game.StatusCombat.apply(() => .75, { ...source, side: "hero" }, resistantEnemy, { statusId: "poison", chance: 1, duration: 3 }, log, 1, 1);
assert(resisted.resisted && resisted.reason === "resistance" && resistantEnemy.observation.statusResisted.includes("poison"));
assert.strictEqual(game.StatusCombat.elementMultiplier({ elementModifiers: { fire: .75 } }, "fire"), .75);

function hero(skillIds) {
  return { id: "hero", name: "属性術師", level: 10, jobId: "mage", position: 0, weaponRange: "ranged", actionRates: { attack: 0, technique: 0, spell: 100, healing: 0 }, skillIds,
    stats: { hp: 9999, attack: 10, defense: 100, magicAttack: 40, magicDefense: 100, magicHealing: 10, hitRate: 1.2, evasionRate: 0, speed: 100, criticalRate: 0, skillPower: 1, healingPower: 1, physicalPower: 1, magicPower: 1, elementModifiers: {}, statusResistances: {} } };
}
const dungeon = { id: "test", name: "属性試験", encounters: [{ name: "試験場", groups: [["slime"]] }], rewards: { gold: [1, 1], exp: [1, 1] }, drops: [] };
Object.assign(game.GameData.monsters.slime, { hp: 99999, attack: 1, defense: 0, magicDefense: 0, speed: 1, hitRate: 1.2, evasionRate: 0, criticalRate: 0 });
game.GameRuntime.seededRandom = () => () => .1;
const fire = game.Battle.resolve({ seed: 1, partyIds: ["hero"], partySnapshot: [hero(["fireball"])] }, dungeon);
assert(fire.battleLog.some(entry => entry.text.includes("炎属性・弱点1.25倍")));
assert(fire.battleLog.some(entry => entry.kind === "status" && entry.text.includes("火傷")));
assert(fire.strategyReport.elementWeaknessHits > 0 && fire.strategyReport.statusInflicted > 0 && fire.memberReports[0].statusDamageDealt > 0);

const paralysisBattle = game.Battle.resolve({ seed: 2, partyIds: ["hero"], partySnapshot: [hero(["rune_spark"])] }, dungeon);
const stopped = paralysisBattle.battleLog.find(entry => entry.kind === "status" && entry.text.includes("このターン行動できない"));
assert(stopped, "Paralysis applied in battle must suppress a later turn.");
assert(!paralysisBattle.battleLog.some(entry => entry.kind === "enemy" && entry.round === stopped.round), "A paralyzed monster must not attack after speed-based turn ordering is calculated.");

Object.assign(game.GameData.monsters.slime, { statusAttack: { statusId: "paralysis", chance: 1, duration: 1 }, speed: 120 });
const suppressedHero = game.Battle.resolve({ seed: 3, partyIds: ["hero"], partySnapshot: [hero(["fireball"])] }, dungeon);
assert(suppressedHero.memberReports[0].statusSkippedTurns > 0, "Lost turns from paralysis must be preserved in member battle metrics.");
assert(suppressedHero.defeatFacts.some(fact => fact.includes("状態異常で行動不能")), "A failed expedition should expose lost actions as a battle fact.");

console.log("Status and element test passed: typed effects, duration/ticks, attack penalty, paralysis, chill speed/evasion penalties, cleanse, racial resistance, elemental weakness, logs and battle metrics");
