const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), storage = new Map();
const context = vm.createContext({ window: {}, console, Date, Math, Blob, setTimeout, clearTimeout,
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
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
assert(game.StatusCombat.apply(() => 0, source, target, { statusId: "poison", chance: 1, duration: 3, potency: .04 }, log, 1, 1).applied);
for (let round = 2; round <= 4; round += 1) {
  game.StatusCombat.beginRound([target], log, 1, round);
  game.StatusCombat.endRound([target], log, 1, round);
}
assert.strictEqual(target.currentHp, 88);
assert(!target.statuses.poison && source.metrics.statusDamageDealt === 12 && source.strategyReport.statusDamage === 12);

game.StatusCombat.apply(() => 0, source, target, { statusId: "burn", chance: 1, duration: 3 }, log, 1, 5);
assert.strictEqual(game.StatusCombat.attackMultiplier(target), .9);
assert.deepStrictEqual(Array.from(game.StatusCombat.cleanse(target, { type: "cleanse", count: 1, statusIds: ["burn"] }, log, 1, 5, "治療役")), ["burn"]);
assert.strictEqual(game.StatusCombat.attackMultiplier(target), 1);

game.StatusCombat.apply(() => 0, source, target, { statusId: "paralysis", chance: 1, duration: 1 }, log, 1, 6);
game.StatusCombat.beginRound([target], log, 1, 7);
assert(target.skipTurn && log.some(entry => entry.text.includes("このターン行動できない")));
game.StatusCombat.endRound([target], log, 1, 7);
assert(!target.statuses.paralysis);

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

console.log("Status and element test passed: typed effects, duration/ticks, attack penalty, paralysis, chill speed/evasion penalties, cleanse, racial resistance, elemental weakness, logs and battle metrics");
