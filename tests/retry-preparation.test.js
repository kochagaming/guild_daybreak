const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), context = vm.createContext({ window: {}, console, Date, Math, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window;

game.GameState.data.partyHistory[0] = [
  { dungeonId: "meadow", difficultyId: "normal", success: false },
  { dungeonId: "cave", difficultyId: "normal", success: true },
  { dungeonId: "meadow", difficultyId: "normal", success: false },
  { dungeonId: "meadow", difficultyId: "normal", success: false },
  { dungeonId: "meadow", difficultyId: "normal", success: true }
];
const preparation = game.Party.retryPreparation("meadow", "normal", 0);
assert.strictEqual(preparation.failures, 3, "Only exact-route records count, even when another destination was visited between attempts");
assert.strictEqual(preparation.damageReduction, .09);
assert.strictEqual(game.Party.retryPreparation("meadow", "abyss", 0).failures, 0, "Difficulty has its own retry record");
game.GameState.data.partyHistory[0].unshift({ dungeonId: "meadow", difficultyId: "normal", success: true });
assert.strictEqual(game.Party.retryPreparation("meadow", "normal", 0).failures, 0, "A successful exact-route return closes the retry preparation streak");

function member() {
  return {
    id: "retry-hero", name: "レナ", level: 1, jobId: "warrior", raceId: "human", birthId: "common", position: 0,
    actionRates: { healing: 0, spell: 0, technique: 0, attack: 100 }, weaponRange: "melee", basicDamageType: "physical",
    skillIds: [], equipmentSkillIds: [], equipmentSetBonuses: [], specialEquipment: [], sharedSorties: {}, bossRivalries: {},
    stats: { hp: 9999, attack: 1, defense: 0, magicAttack: 1, magicDefense: 0, magicHealing: 1, hitRate: 1, evasionRate: 0, speed: 1, attackCount: 1, criticalRate: 0, skillPower: 1, healingPower: 1, physicalPower: 1, magicPower: 1, slayerMultipliers: {} }
  };
}
const dungeon = { id: "retry_trial", name: "再挑戦試験場", color: "green", duration: 1, encounters: [{ name: "傷跡の広間", groups: [["slime"]] }], rewards: { gold: [1, 1], exp: [1, 1] }, drops: [], combatRules: { maxTurnsPerEncounter: 3, betweenEncounterRecovery: 0 } };
const ordinary = game.Battle.resolve({ seed: 642, timeMultiplier: 1, partyIds: ["retry-hero"], partySnapshot: [member()] }, dungeon);
const prepared = game.Battle.resolve({ seed: 642, timeMultiplier: 1, partyIds: ["retry-hero"], partySnapshot: [member()], retryPreparationFailures: 3, retryPreparationDamageReduction: .09 }, dungeon);
const totalDamage = result => result.memberReports.reduce((sum, report) => sum + report.damageTaken, 0);
assert(totalDamage(prepared) < totalDamage(ordinary), "Retry preparation reduces battle damage with the same encounter seed");
assert(prepared.battleLog.some(entry => entry.kind === "formation" && entry.text.includes("【再挑戦の備え】3度の撤退記録")), "The battle log explains why the party entered the same fight better prepared");

const panel = game.GameUIViews.results.retryPreparationPanel({ success: true, retryPreparation: { failures: 3, damageReduction: .09 } }, { escape: value => String(value) });
assert(panel.includes("以前の撤退を、攻略の備えに変えました") && panel.includes("3度") && panel.includes("9%"), "The return report makes fail-forward progress legible");
const firstFailurePanel = game.GameUIViews.results.retryPreparationPanel({ success: false, retryPreparation: null, retryPreparationGrowth: { previousFailures: 0, failures: 1, damageReduction: .03, atMaximum: false } }, { escape: value => String(value) });
assert(firstFailurePanel.includes("撤退は次の備えになる") && firstFailurePanel.includes("0度から1度へ増え") && firstFailurePanel.includes("3%"), "The first failed return immediately explains the concrete help earned for the next attempt");
const cappedFailurePanel = game.GameUIViews.results.retryPreparationPanel({ success: false, retryPreparation: { failures: 3, damageReduction: .09 }, retryPreparationGrowth: { previousFailures: 3, failures: 3, damageReduction: .09, atMaximum: true } }, { escape: value => String(value) });
assert(cappedFailurePanel.includes("3度分で最大まで整い") && cappedFailurePanel.includes("備えは最大です"), "The report explains the cap instead of implying unlimited retry growth");
assert.strictEqual(game.GameUIViews.results.retryPreparationPanel({ success: true, retryPreparation: null }, { escape: String }), "", "Ordinary first attempts do not show an empty retry panel");

game.GameState.data.partyHistory[0] = [];
assert(!game.ObservationJournal.unlocked(game.ObservationJournal.note("retry_preparation")) && !game.ObservationJournal.unlocked(game.ObservationJournal.note("retry_preparation_overcome")), "Retry diary pages remain sealed before the guild experiences a retreat");
const recruit = require("./helpers").createCharacter(game, "撤退記録係", "warrior", "human", "common", "warrior");
game.Party.toggle(recruit.id);
assert(game.Dungeon.start("meadow").ok);
const liveExpedition = game.GameState.data.expeditions[0];
Object.assign(liveExpedition.partySnapshot[0].stats, { hp: 1, attack: 0, defense: 0, magicAttack: 0, magicDefense: 0, speed: 1, hitRate: 0, evasionRate: -10 });
liveExpedition.endsAt = Date.now() - 1;
const failedResult = game.Dungeon.completeIfReady();
assert(failedResult && !failedResult.success, "The integration fixture returns as a defeat");
assert.deepStrictEqual(JSON.parse(JSON.stringify(failedResult.retryPreparationGrowth)), { previousFailures: 0, failures: 1, damageReduction: .03, atMaximum: false }, "A completed defeat snapshots the newly earned preparation in its result");
assert(game.GameState.data.story.facts.retryPreparationObserved && !game.GameState.data.story.facts.retryPreparationOvercome, "The first retreat permanently opens only the first retry journal page");
assert(game.ObservationJournal.unlocked(game.ObservationJournal.note("retry_preparation")) && failedResult.newObservationIds.includes("retry_preparation"), "The retreat return announces the newly opened diary entry with the rest of its discoveries");
assert(failedResult.newAchievementIds.includes("first_retreat_record") && game.Achievements.entry(game.GameData.achievements.find(entry => entry.id === "first_retreat_record")).complete, "The first retained retreat discovers its hidden commemorative achievement on the same return");
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.GameState.data.partyHistory[0][0].retryPreparationGrowth)), { previousFailures: 0, failures: 1, damageReduction: .03, atMaximum: false }, "The earned preparation remains attached to expedition history");
assert.strictEqual(game.Party.retryPreparation("meadow", "normal", 0).damageReduction, .03, "The same party can immediately use the earned preparation");
game.GameState.data.story.readSceneIds.push("meadow_clear");
Object.assign(failedResult, {
  mechanicReport: { warnings: 2, bursts: 2, guardedHits: 0, unguardedHits: 2, burstDamage: 10, burstKnockouts: 1, weaknessHits: 0 },
  viewed: false
});
const council = game.GameUIViews.home.retreatCouncil({ escape: value => String(value) });
assert(council.includes("撤退のあと、宿の作戦卓で") && council.includes("グレゴール") && council.includes("防御なしの記録が2人回ある"), "A failed expedition becomes a named-character conversation grounded in its recorded combat evidence");
assert(council.includes("次回の戦闘被ダメージ-3%") && council.includes('data-action="party-open" data-party="0" data-view="results"') && council.includes('data-action="open-result-monsters" data-party="0"'), "The home conversation keeps the earned preparation and exact report routes actionable");
failedResult.viewed = true;
assert(!game.GameUIViews.home.retreatCouncil({ escape: String }).includes('data-detail="retreat-council" open'), "A reviewed retreat remains available without reopening itself on every home visit");
game.GameState.data.story.readSceneIds.push("whispering_brook_clear");
const retryVictory = Object.assign({}, failedResult, {
  id: "retry-victory", success: true, completedAt: failedResult.completedAt + 1, viewed: false,
  retryPreparation: { failures: 1, damageReduction: .03 }, retryPreparationGrowth: null
});
game.Story.recordResult(retryVictory);
game.GameState.data.partyResults[0] = retryVictory;
assert(game.GameState.data.story.facts.retryPreparationOvercome && game.ObservationJournal.unlocked(game.ObservationJournal.note("retry_preparation_overcome")), "A victory carrying retreat preparation permanently completes the second diary page");
assert(game.Achievements.entry(game.GameData.achievements.find(entry => entry.id === "retry_victory")).complete, "A successful prepared retry completes its hidden recovery achievement");
const victoryCouncil = game.GameUIViews.home.retreatCouncil({ escape: String });
assert(victoryCouncil.includes("撤退記録を越えた夜") && victoryCouncil.includes("is-overcome") && victoryCouncil.includes("エルゼ") && victoryCouncil.includes("1度の撤退記録"), "A successful retry closes the earlier failure as an in-world homecoming scene");
assert(victoryCouncil.includes("受ける傷を3%抑えた") && victoryCouncil.includes('data-view="history"') && victoryCouncil.includes("再挑戦の歩みを見る"), "The victory scene preserves the concrete preparation and links to its expedition history");
console.log("Retry preparation test passed: exact-route streaks, reset on success, battle mitigation, immediate growth feedback, return-table dialogue, retry-victory closure, cap and archived progression");
