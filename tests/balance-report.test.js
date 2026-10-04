const assert = require("assert");
const balance = require("../tools/balance-report");

const game = balance.loadGame();
const dungeon = game.GameData.dungeons.frost_coast;
for (const profileId of Object.keys(balance.profileDefinitions)) {
  const party = balance.buildParty(game, profileId, dungeon);
  assert.strictEqual(party.length, 6);
  party.forEach((member, index) => {
    assert.strictEqual(member.position, index);
    assert(member.stats.hp > 0 && member.stats.attack > 0 && member.stats.defense > 0);
    assert(member.fixture.equipment.length > 0);
    assert(member.fixture.weight <= member.fixture.maximumWeight);
    Object.values(member.actionRates).forEach(rate => assert(Number.isInteger(rate) && rate >= 0 && rate <= 100));
  });
}

const report = balance.generate({ runs: 3, chapterId: "mirror_tide", difficulty: "normal", profiles: ["balanced", "physical"] });
assert.strictEqual(report.entries.length, 6);
assert(report.entries.every(entry => entry.results.length === 2 && Array.isArray(entry.warnings)));
report.entries.flatMap(entry => entry.results).forEach(result => {
  assert(result.winRate >= 0 && result.winRate <= 100);
  assert(result.remainingHpRate >= 0 && result.remainingHpRate <= 100);
  assert(result.averageRounds >= 0 && result.averageGold >= 0 && result.averageExperience >= 0);
  assert(result.party.length === 6);
  assert(result.failureAnalysis && result.failureAnalysis.failureRate >= 0 && result.failureAnalysis.failureRate <= 100);
  assert(Array.isArray(result.failureAnalysis.encounters) && Array.isArray(result.failureAnalysis.causes));
  assert(result.failureAnalysis.hitRate >= 0 && result.failureAnalysis.hitRate <= 100);
});
const text = balance.textReport(report);
assert(text.includes("自動バランスレポート") && text.includes("白霜の海岸") && text.includes("均衡型"));

const singleRoute = balance.generate({ runs: 20, dungeonId: "moonfang_den", profiles: ["balanced", "no_healer"] });
assert.strictEqual(singleRoute.entries.length, 1);
assert.strictEqual(singleRoute.entries[0].dungeonId, "moonfang_den");
assert(singleRoute.entries[0].results.find(result => result.profileId === "balanced").averageHealing > 0, "the chapter-one healer fixture should actually heal");
assert(!singleRoute.entries[0].warnings.includes("回復なし編成が均衡型を20pt以上上回る"), "the chapter-one healer should not create a large party-composition inversion");

const earlyPhysicalParty = balance.buildParty(game, "physical", game.GameData.dungeons.moonfang_den);
const earlyMagicParty = balance.buildParty(game, "magic", game.GameData.dungeons.moonfang_den);
assert.strictEqual(earlyPhysicalParty.length, 3);
assert.strictEqual(earlyMagicParty.length, 3);
assert(earlyPhysicalParty.some(member => member.fixture.role === "physical") && earlyPhysicalParty.some(member => member.fixture.role === "healer"), "the early physical profile must include both its damage role and a healer");
assert(earlyMagicParty.some(member => member.fixture.role === "magic") && earlyMagicParty.some(member => member.fixture.role === "healer"), "the early magic profile must include both its damage role and a healer");
assert.strictEqual(earlyMagicParty.at(-1).fixture.role, "magic", "the early magic attacker belongs in the rear formation");
assert.deepStrictEqual(balance.rolesForProfile("magic", 5), ["tank", "healer", "support", "magic", "magic"]);
assert.deepStrictEqual(balance.rolesForProfile("physical", 5), ["tank", "physical", "healer", "physical", "ranged"]);
assert.strictEqual(balance.rolesForProfile("no_healer", 6).includes("healer"), false);
assert.throws(() => balance.generate({ runs: 1, dungeonId: "unknown-route" }), /No dungeons found for dungeon unknown-route/);
const inversionWarnings = balance.warningsFor(
  { requiredForStory: true, encounters: [{}, {}, {}] },
  [
    { profileId: "balanced", winRate: 45, averageRounds: 8, timeoutRate: 0 },
    { profileId: "no_healer", winRate: 70, averageRounds: 6, timeoutRate: 0 }
  ]
);
assert(inversionWarnings.includes("回復なし編成が均衡型を20pt以上上回る"));

const preparedReport = balance.generate({
  runs: 1,
  chapterId: "afterstar_reaches_1",
  difficulty: "normal",
  profiles: ["balanced"],
  quality: "refined",
  enhancement: "half"
});
assert.strictEqual(preparedReport.quality, "refined");
assert.strictEqual(preparedReport.enhancement, "half");
preparedReport.entries.flatMap(entry => entry.results).flatMap(result => result.party).forEach(member => {
  assert.strictEqual(member.qualityId, "refined");
  assert(member.upgradeLevel > 0);
});
const preparedText = balance.textReport(preparedReport);
assert(preparedText.includes("装備品質 refined") && preparedText.includes("装備強化 解放上限の半分"));
assert.throws(() => balance.generate({ runs: 1, quality: "unknown" }), /Unknown quality/);
assert.throws(() => balance.generate({ runs: 1, enhancement: "unknown" }), /Unknown enhancement mode/);
assert.throws(() => balance.generate({ runs: 1, preparation: "unknown" }), /Unknown preparation mode/);

const progressionReport = balance.generate({
  runs: 1,
  chapterId: "end_of_starless_night",
  profiles: ["balanced"],
  preparation: "progression"
});
assert.strictEqual(progressionReport.preparation, "progression");
progressionReport.entries.flatMap(entry => entry.results).flatMap(result => result.party).forEach(member => {
  assert.strictEqual(member.qualityId, "wellmade");
  assert(member.upgradeLevel > 0);
});
assert(balance.textReport(progressionReport).includes("進行相応装備"));
assert.deepStrictEqual(balance.progressionPreparation(4), { quality: "standard", enhancement: "none" });
assert.deepStrictEqual(balance.progressionPreparation(9), { quality: "wellmade", enhancement: "quarter" });
assert.deepStrictEqual(balance.progressionPreparation(16), { quality: "familiar", enhancement: "quarter" });

const blackwood = game.GameData.dungeons.night_bloom_sanctuary;
const counterParty = balance.buildParty(game, "balanced", blackwood);
const counterSkills = new Set(counterParty.flatMap(member => member.fixture.equipment).flatMap(itemId => game.GameData.relations.itemSkillGrants[itemId] || []));
assert([...counterSkills].some(id => ["plant_slayer_15", "demon_slayer_15", "poison_resistance_20", "burn_resistance_20"].includes(id)), "chapter threat-aware fixtures should prefer at least one relevant counter skill");

const chapterFour = balance.generate({ runs: 50, chapterId: "ember_crown", difficulty: "normal", profiles: ["balanced"] });
const chapterFourRates = Object.fromEntries(chapterFour.entries.map(entry => [entry.dungeonId, entry.results[0].winRate]));
assert(chapterFourRates.skyfall_road >= chapterFourRates.cinder_throne, "chapter four should become harder toward its climax");
assert(chapterFourRates.cinder_throne < 100 && chapterFourRates.elder_dragon_crater < 100, "climax and optional challenge must not be guaranteed wins");
const dragonAnalysis = chapterFour.entries.find(entry => entry.dungeonId === "elder_dragon_crater").results[0].failureAnalysis;
assert(dragonAnalysis.failures > 0 && dragonAnalysis.encounters.length > 0 && dragonAnalysis.causes.length > 0);
assert(dragonAnalysis.burstDamage > 0 && dragonAnalysis.guardedBurstRate != null);

console.log("Balance report test passed: real master data, chapter-available jobs/gear, quality/enhancement fixtures, four party profiles, aggregate metrics, warnings and text output");
