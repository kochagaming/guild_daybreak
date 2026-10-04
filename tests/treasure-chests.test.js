const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), context = vm.createContext({ window: {}, console, Date, Math, Blob, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window;
const tiers = game.GameData.config.explorationEvents.treasure.types;
assert.deepStrictEqual(Array.from(tiers, tier => tier.id), ["weathered", "ironbound", "starsealed"]);
assert(tiers.every((tier, index) => tier.rank === index && tier.weight > 0 && tier.equipmentChanceMultiplier > 0 && tier.goldMultiplier > 0));
assert(tiers[1].challenge.aptitudeIds.includes("scouting") && tiers[2].challenge.aptitudeIds.includes("arcana"), "Better chests use distinct exploration talents rather than opening automatically");

function samples(difficultyId) {
  const dungeon = game.DungeonDifficulty.variant("meadow", difficultyId), counts = Object.fromEntries(tiers.map(tier => [tier.id, 0]));
  for (let seed = 1; seed <= 800; seed += 1) {
    const journey = game.Exploration.journey(dungeon, 1, seed * 7919, undefined, [], []);
    const chests = journey.flatMap(floor => floor.entries.filter(entry => entry.kind === "treasure"));
    assert(chests.length >= 1 && chests.every(entry => counts[entry.treasureTierId] != null && entry.treasureTierRank === tiers.find(tier => tier.id === entry.treasureTierId).rank));
    chests.forEach(entry => { counts[entry.treasureTierId] += 1; });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(journey)), JSON.parse(JSON.stringify(game.Exploration.journey(dungeon, 1, seed * 7919, undefined, [], []))), "Chest outcomes must remain deterministic for an expedition seed");
  }
  return counts;
}
const normal = samples("normal"), divine = samples("divine");
assert(Object.values(normal).every(count => count > 0), "All three chest tiers can appear during ordinary exploration");
const rareShare = counts => (counts.ironbound + counts.starsealed * 2) / Object.values(counts).reduce((sum, count) => sum + count, 0);
assert(rareShare(divine) > rareShare(normal), "Harder dungeon modes should shift treasure toward better chests");

function openingRate(partySnapshot) {
  let challenged = 0, opened = 0;
  const dungeon = game.DungeonDifficulty.variant("meadow", "divine");
  for (let seed = 1; seed <= 1600; seed += 1) {
    game.Exploration.journey(dungeon, 1, seed * 3571, undefined, partySnapshot, []).flatMap(floor => floor.entries)
      .filter(entry => entry.kind === "treasure" && entry.treasureTierRank > 0).forEach(entry => {
        challenged += 1;
        if (entry.treasureOpened) opened += 1;
      });
  }
  return opened / challenged;
}
const untrainedRate = openingRate([]);
const specialistRate = openingRate([{ name: "鍵師", jobId: "thief", raceId: "elf", birthId: "hunter" }]);
assert(specialistRate > untrainedRate + .1, "A suitable party member should materially improve the chance of opening better treasure");
const practicedRate = openingRate([{ name: "旅慣れた開錠役", jobId: "warrior", raceId: "human", birthId: "common", treasureOpenings: 10 }]);
assert(practicedRate > untrainedRate + .02, "An adventurer who repeatedly opened sealed chests should carry a small personal advantage into later expeditions");
const practicedChest = game.Exploration.journey(game.DungeonDifficulty.variant("meadow", "divine"), 1, 3571, undefined, [{ name: "旅慣れた開錠役", jobId: "warrior", raceId: "human", birthId: "common", treasureOpenings: 10 }], [])
  .flatMap(floor => floor.entries).find(entry => entry.kind === "treasure" && entry.treasureTierRank > 0);
assert(practicedChest && practicedChest.treasurePersonalPracticeApplied && practicedChest.explorationActorName === "旅慣れた開錠役", "Chest logs preserve the practiced opener credited at departure");
const masteredRate = (() => {
  let challenged = 0, opened = 0;
  const dungeon = game.DungeonDifficulty.variant("meadow", "divine");
  for (let seed = 1; seed <= 1600; seed += 1) {
    game.Exploration.journey(dungeon, 1, seed * 3571, undefined, [], [], [], ["ironbound", "starsealed"]).flatMap(floor => floor.entries)
      .filter(entry => entry.kind === "treasure" && entry.treasureTierRank > 0).forEach(entry => {
        challenged += 1;
        assert(entry.treasureMasteryApplied);
        if (entry.treasureOpened) opened += 1;
      });
  }
  return opened / challenged;
})();
assert(masteredRate > untrainedRate, "Shared opening records should improve later parties without changing earlier expeditions");
const ironNote = game.GameData.observationNotes.find(note => note.id === "ironbound_locks");
const practiceNote = game.GameData.observationNotes.find(note => note.id === "treasure_opening_practice");
for (let attempt = 0; attempt < 3; attempt += 1) game.Story.recordResult({
  success: false, dungeonId: "meadow", difficultyId: "normal",
  battleLog: [{ kind: "treasure", treasureTierId: "ironbound", treasureTierRank: 1, treasureOpened: true, treasureMasteryApplied: false, text: "鉄縁の宝箱を開いた" }]
});
assert.deepStrictEqual(JSON.parse(JSON.stringify(game.GameState.data.story.facts.treasureTiers.ironbound)), { encounters: 3, openings: 3 });
assert(game.ObservationJournal.unlocked(ironNote) && game.ObservationJournal.unlocked(practiceNote), "Encounter and mastery field notes should unlock from actual chest records");
const parsedTreasureKnowledge = game.SaveTransfer.parse(JSON.stringify(game.GameState.data));
assert(parsedTreasureKnowledge.ok, parsedTreasureKnowledge.message || "Treasure knowledge must survive strict save validation");
const highlights = game.Dungeon.memberHighlights({
  memberReports: [
    { id: "scout", name: "斥候", damageDealt: 12, healingDone: 0, damageTaken: 0, remainingHp: 20, maxHp: 20 },
    { id: "fighter", name: "戦士", damageDealt: 80, healingDone: 0, damageTaken: 10, remainingHp: 20, maxHp: 30 }
  ],
  battleLog: [
    { kind: "secret", routeEventId: "hidden_passage", routeEventSuccess: true, explorationActorId: "scout", explorationActorName: "斥候" },
    { kind: "treasure", treasureTierId: "ironbound", treasureTierRank: 1, treasureOpened: true, explorationActorId: "scout", explorationActorName: "斥候" }
  ]
});
assert.deepStrictEqual(JSON.parse(JSON.stringify(highlights[0])), { kind: "exploration", memberId: "scout", name: "斥候", value: 2, routeSuccesses: 1, chestsOpened: 1 }, "Non-combat contributions should be credited to the adventurer who handled them");
const panel = game.GameUIViews.results.treasurePanel({ battleLog: [
  { kind: "treasure", encounter: 1, treasureTierId: "starsealed", treasureTierRank: 2, treasureOpened: false, treasurePersonalPracticeApplied: true, text: "星紋の宝箱を発見" },
  { kind: "treasureGold", encounter: 1, treasureTierId: "starsealed", treasureTierRank: 2, treasureOpened: false, text: "星紋の宝箱から100Gを手に入れた。" }
] }, { escape: value => String(value) });
assert(panel.includes("TREASURE FOUND") && panel.includes("星紋の宝箱") && panel.includes("100G") && panel.includes("rank-2") && panel.includes("一部回収") && panel.includes("本人の開錠経験を活用"));
console.log("Treasure chest test passed: three tiers, deterministic rolls, aptitude and personal-practice opening, shared mastery, credited exploration and return-report summary");
