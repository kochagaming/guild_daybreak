const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), context = vm.createContext({ window: {}, console, Date, Math, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window;
const character = { id: "rival-hero", name: "リヒト", expeditionRecord: game.Characters.emptyExpeditionRecord() };
const firstDefeat = game.Characters.recordBossEncounter(character, "storm_regent", false, 1000);
assert(firstDefeat.started && !firstDefeat.avenged, "A first boss defeat starts a rivalry");
assert.strictEqual(game.Characters.activeBossRivalries(character).length, 1);
const repeatedDefeat = game.Characters.recordBossEncounter(character, "storm_regent", false, 2000);
assert(!repeatedDefeat.started && !repeatedDefeat.avenged, "Repeated defeats continue one rivalry instead of duplicating it");
const revenge = game.Characters.recordBossEncounter(character, "storm_regent", true, 3000);
assert(revenge.avenged && !revenge.started, "A victory after defeat records revenge");
assert.strictEqual(game.Characters.activeBossRivalries(character).length, 0);
assert.strictEqual(game.Characters.bossRivalries(character)[0].defeats, 2);
assert.strictEqual(game.Characters.bossRivalries(character)[0].victories, 1);

function member(withRivalry) {
  return {
    id: "rival-hero", name: "リヒト", level: 12, jobId: "warrior", raceId: "human", birthId: "common", position: 0,
    actionRates: { healing: 0, spell: 0, technique: 0, attack: 100 }, weaponRange: "melee", basicDamageType: "physical",
    skillIds: [], equipmentSkillIds: [], equipmentSetBonuses: [], specialEquipment: [], sharedSorties: {},
    bossRivalries: withRivalry ? { storm_regent: { defeats: 1, victories: 0, lastOutcome: "defeat", lastAt: 1000 } } : {},
    stats: { hp: 9999, attack: 120, defense: 40, magicAttack: 5, magicDefense: 40, magicHealing: 5, hitRate: .95, evasionRate: .05, speed: 12, attackCount: 1, criticalRate: 0, skillPower: 1, healingPower: 1, physicalPower: 1, magicPower: 1, slayerMultipliers: {} }
  };
}
const dungeon = { id: "rival_trial", name: "再戦試験場", color: "red", duration: 1, encounters: [{ name: "風王の間", groups: [["storm_regent"]] }], rewards: { gold: [1, 1], exp: [1, 1] }, drops: [], combatRules: { maxTurnsPerEncounter: 2, betweenEncounterRecovery: 0 } };
const snapshot = member(true), before = JSON.stringify(snapshot);
const result = game.Battle.resolve({ seed: 881, timeMultiplier: 1, partyIds: [snapshot.id], partySnapshot: [snapshot] }, dungeon);
assert.strictEqual(JSON.stringify(snapshot), before, "Rivalry support never mutates the saved departure snapshot");
const rivalryLog = result.battleLog.find(entry => entry.kind === "formation" && entry.text.includes("【因縁の再戦】"));
assert(rivalryLog && rivalryLog.text.includes("リヒト") && rivalryLog.text.includes(game.GameData.monsters.storm_regent.name) && !rivalryLog.text.includes("%"), "The battle log gives a rematch clue without exposing its hidden modifier");
const ordinary = game.Battle.resolve({ seed: 881, timeMultiplier: 1, partyIds: [snapshot.id], partySnapshot: [member(false)] }, dungeon);
assert(!ordinary.battleLog.some(entry => entry.text.includes("【因縁の再戦】")), "A hero without the matching defeat record receives no rivalry support");

const panel = game.GameUIViews.results.bossRivalryPanel({
  newBossRivalries: [{ characterId: "rival-hero", name: "リヒト", bossId: "storm_regent", bossName: "風王" }],
  bossRevengeVictories: [{ characterId: "revenge-hero", name: "エルマ", bossId: "storm_regent", bossName: "風王" }]
}, { escape: value => String(value) });
assert(panel.includes("撤退の痛みを忘れない") && panel.includes("因縁を越えた") && panel.includes("リヒト") && panel.includes("エルマ") && !panel.includes("%"));
console.log("Boss rivalry test passed: personal defeat records, rematch clue, hidden support, revenge and return-report presentation");
