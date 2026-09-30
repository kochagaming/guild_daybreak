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

const blackwood = game.GameData.dungeons.night_bloom_sanctuary;
const counterParty = balance.buildParty(game, "balanced", blackwood);
const counterSkills = new Set(counterParty.flatMap(member => member.fixture.equipment).flatMap(itemId => game.GameData.items[itemId].skillIds || []));
assert([...counterSkills].some(id => ["plant_slayer_15", "demon_slayer_15", "poison_resistance_20", "burn_resistance_20"].includes(id)), "chapter threat-aware fixtures should prefer at least one relevant counter skill");

const chapterFour = balance.generate({ runs: 20, chapterId: "ember_crown", difficulty: "normal", profiles: ["balanced"] });
const chapterFourRates = Object.fromEntries(chapterFour.entries.map(entry => [entry.dungeonId, entry.results[0].winRate]));
assert(chapterFourRates.skyfall_road >= chapterFourRates.cinder_throne, "chapter four should become harder toward its climax");
assert(chapterFourRates.cinder_throne < 100 && chapterFourRates.elder_dragon_crater < 100, "climax and optional challenge must not be guaranteed wins");
const dragonAnalysis = chapterFour.entries.find(entry => entry.dungeonId === "elder_dragon_crater").results[0].failureAnalysis;
assert(dragonAnalysis.failures > 0 && dragonAnalysis.encounters.length > 0 && dragonAnalysis.causes.length > 0);
assert(dragonAnalysis.burstDamage > 0 && dragonAnalysis.guardedBurstRate != null);

console.log("Balance report test passed: real master data, chapter-available jobs/gear, four party profiles, aggregate metrics, warnings and text output");
