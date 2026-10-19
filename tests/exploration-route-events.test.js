const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), context = vm.createContext({ window: {}, console, Date, Math, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const game = context.window, dungeon = game.DungeonDifficulty.variant(game.GameData.dungeons.meadow, "normal");
const eventKinds = new Set(["secret", "camp", "hazard", "lore", "gather"]);
const routeEventIds = game.GameData.config.explorationEvents.routeEvents.map(event => event.id);
const ordinaryParty = [{ name: "術師", jobId: "mage", raceId: "human", birthId: "common" }];
const naturallyGiftedParty = [{ ...ordinaryParty[0], name: "道を見る術師", level: 1, primaryAttributes: { vitality: 20, strength: 20, fortitude: 20, intelligence: 20, spirit: 20, dexterity: 20, agility: 20, luck: 20 } }];
const practicedParty = [{ ...ordinaryParty[0], name: "旅慣れた術師", routeEventSuccesses: Object.fromEntries(routeEventIds.map(id => [id, game.GameData.config.explorationEvents.personalPractice.successes])) }];
const familiarParty = Array.from({ length: 4 }, (_, index) => ({ ...ordinaryParty[0], id: `route-veteran-${index + 1}`, name: `道を知る術師${index + 1}`, destinationClearExperience: true, destinationClearCount: 10 }));
const mentorParty = [
  { ...ordinaryParty[0], id: "route-guide", name: "古道の案内役", destinationClearExperience: true, destinationClearCount: 10 },
  { ...ordinaryParty[0], id: "route-apprentice", name: "初めて歩く術師", destinationClearExperience: false, destinationClearCount: 0 }
];
const inheritedMentorParty = [
  { ...ordinaryParty[0], id: "inherited-route-guide", name: "継承した案内役", destinationClearExperience: true, destinationClearCount: 10, inheritedRouteGuide: true },
  ...Array.from({ length: 3 }, (_, index) => ({ ...ordinaryParty[0], id: `inherited-route-apprentice-${index + 1}`, name: `初めて歩く仲間${index + 1}`, destinationClearExperience: false, destinationClearCount: 0 }))
];
const lineageParty = [
  { ...ordinaryParty[0], id: "first-route-guide", name: "最初の案内役", destinationClearExperience: true, destinationClearCount: 10 },
  { ...ordinaryParty[0], id: "inherited-route-guide", name: "道を継いだ案内役", destinationClearExperience: true, destinationClearCount: 10, inheritedRouteGuide: true, routeMentorIds: ["first-route-guide"] },
  { ...ordinaryParty[0], id: "third-route-apprentice", name: "三人目の新人", destinationClearExperience: false, destinationClearCount: 0 }
];
const teamSurveyParty = [
  { id: "pathfinder-a", name: "道探し", jobId: "thief", raceId: "human", birthId: "common", routeEventSuccesses: Object.fromEntries(routeEventIds.slice(0, 2).map(id => [id, game.GameData.config.explorationEvents.personalPractice.successes])) },
  { id: "pathfinder-b", name: "記録係", jobId: "mage", raceId: "human", birthId: "common", routeEventSuccesses: { [routeEventIds[2]]: game.GameData.config.explorationEvents.personalPractice.successes } }
];
const originParty = [
  { name: "森育ちの術師", jobId: "mage", raceId: "elf", birthId: "hunter" },
  { name: "祈り手の術師", jobId: "mage", raceId: "fairy", birthId: "sacred" },
  { name: "山育ちの術師", jobId: "mage", raceId: "dwarf", birthId: "guard" }
];
const specialistParty = [
  { name: "斥候", jobId: "thief", raceId: "elf", birthId: "hunter" },
  { name: "癒し手", jobId: "cleric", raceId: "fairy", birthId: "sacred" },
  { name: "盾役", jobId: "warrior", raceId: "dwarf", birthId: "guard" },
  { name: "碑文読み", jobId: "mage", raceId: "elf", birthId: "scholar" }
];
const ordinarySuccesses = { secret: 0, camp: 0, hazard: 0, lore: 0, gather: 0 }, familiarSuccesses = { secret: 0, camp: 0, hazard: 0, lore: 0, gather: 0 }, giftedSuccesses = { secret: 0, camp: 0, hazard: 0, lore: 0, gather: 0 }, practicedSuccesses = { secret: 0, camp: 0, hazard: 0, lore: 0, gather: 0 }, masteredSuccesses = { secret: 0, camp: 0, hazard: 0, lore: 0, gather: 0 }, originSuccesses = { secret: 0, camp: 0, hazard: 0, lore: 0, gather: 0 }, specialistSuccesses = { secret: 0, camp: 0, hazard: 0, lore: 0, gather: 0 }, seenKinds = new Set(), seenRouteIds = new Set();
let meadowRumorMatches = 0;

for (const [environmentId, environment] of Object.entries(game.GameData.config.explorationEvents.environments)) {
  assert(environment.rumors.length >= 2 && environment.rumors.every(rumor => rumor.eventId && rumor.text && !rumor.text.includes("%")), `${environmentId} offers event-linked narrative route clues without exact odds`);
}
const meadowRumor = game.Exploration.routeRumor(dungeon);
assert.strictEqual(game.Exploration.routeRumor(dungeon), meadowRumor, "A destination keeps the same field rumor while the party is being prepared");
const meadowRumorEntry = game.Exploration.routeRumorEntry(dungeon);
assert.strictEqual(meadowRumorEntry.text, meadowRumor, "The public field rumor text comes from its structured clue entry");
assert(game.GameData.config.explorationEvents.environments.green.rumors.some(rumor => rumor.text === meadowRumor), "The field rumor follows the destination environment");
assert(game.GameData.config.explorationEvents.routeEvents.some(event => event.id === meadowRumorEntry.eventId), "Every field rumor refers to an existing route event");
const unknownReadiness = game.Exploration.routeReadiness(dungeon, specialistParty, []);
assert.strictEqual(unknownReadiness.state, "unknown", "A rumor remains an uncertain clue until its field record is mastered");
const ordinaryReadiness = game.Exploration.routeReadiness(dungeon, ordinaryParty, [meadowRumorEntry.eventId]);
const specialistReadiness = game.Exploration.routeReadiness(dungeon, specialistParty, [meadowRumorEntry.eventId]);
const practicedReadiness = game.Exploration.routeReadiness(dungeon, practicedParty, [meadowRumorEntry.eventId]);
assert.notStrictEqual(ordinaryReadiness.state, "unknown", "Mastered field knowledge can be compared with the current party");
assert(["ready", "strong"].includes(specialistReadiness.state), "A broadly skilled party is recognized narratively without exposing an exact success rate");
assert.strictEqual(practicedReadiness.state, "strong");
assert(practicedReadiness.text.includes("旅慣れた術師") && practicedReadiness.text.includes("実地で何度も解いている"), "A practiced adventurer is named narratively without exposing the exact bonus");
assert(!ordinaryReadiness.text.includes("%") && !specialistReadiness.text.includes("%"), "Party readiness stays descriptive rather than revealing probabilities");

const teamSurveyJourney = game.Exploration.journey(dungeon, 1, 424242, undefined, teamSurveyParty, []);
const teamSurveyRecords = teamSurveyJourney.flatMap((floor, floorIndex) => floor.entries.filter(entry => eventKinds.has(entry.kind)).map(entry => ({ entry, floorIndex })));
assert.strictEqual(teamSurveyRecords.length, 2, "Two adventurers covering three practiced disciplines uncover one additional route event");
assert.strictEqual(teamSurveyRecords.filter(record => record.entry.routeTeamSurveyApplied).length, 1, "Only the additional discovery is marked as a specialist team survey");
const coordinatedRecord = teamSurveyRecords.find(record => record.entry.routeTeamSurveyApplied).entry;
assert.strictEqual(JSON.stringify(coordinatedRecord.routeTeamSurveyMemberIds), JSON.stringify(["pathfinder-a", "pathfinder-b"]), "The coordinated discovery preserves which practiced adventurers combined their field notes");
assert.strictEqual(JSON.stringify(coordinatedRecord.routeTeamSurveyMemberNames), JSON.stringify(["道探し", "記録係"]), "The coordinated discovery can credit both adventurers in player-facing records");
assert.strictEqual(new Set(teamSurveyRecords.map(record => record.entry.routeEventId)).size, 2, "A coordinated survey finds a different sign instead of repeating the ordinary event");
assert.strictEqual(game.Exploration.journey(dungeon, 1, 424242, undefined, practicedParty, []).flatMap(floor => floor.entries.filter(entry => eventKinds.has(entry.kind))).length, 1, "One broadly experienced adventurer alone does not replace a team of field specialists");
const teamSurveyPanel = game.GameUIViews.results.routeEventPanel({ battleLog: teamSurveyRecords.map(record => ({ ...record.entry, text: record.entry.text })) }, { escape: value => String(value) });
assert(teamSurveyPanel.includes("熟練者の連携探索") && teamSurveyPanel.includes("道探し、記録係"), "The return report credits the coordinated explorers without displaying its hidden numeric requirement");

function routeRecord(seed, party, targetDungeon = dungeon) {
  const floors = game.Exploration.journey(targetDungeon, 1, seed, undefined, party, []);
  const records = floors.flatMap((floor, floorIndex) => floor.entries.filter(entry => eventKinds.has(entry.kind)).map(entry => ({ entry, floor, floorIndex })));
  assert.strictEqual(records.length, 1, "Each departure contains one compact non-combat route event");
  const record = records[0];
  assert(!record.entry.text.includes("{"), "Route-event text resolves every narrative placeholder");
  assert.strictEqual(record.entry.routeRumorMatched, record.entry.routeEventId === game.Exploration.routeRumorEntry(targetDungeon).eventId, "Route logs mark only events that agree with the destination rumor");
  if (floors.length > 2) assert(record.floorIndex > 0 && record.floorIndex < floors.length - 1, "The route event appears between the opening and boss floors");
  if (record.entry.routeEventId === "hidden_passage" && record.entry.routeEventSuccess) assert(record.floor.gold > 0, "A successful hidden passage carries gold");
  if (record.entry.kind === "camp") assert.strictEqual(record.floor.routeEffect?.type || null, record.entry.routeEventSuccess ? "recovery" : null);
  if (record.entry.kind === "hazard") assert.strictEqual(record.floor.routeEffect?.type || null, record.entry.routeEventSuccess ? null : "damage");
  if (record.entry.routeEventId === "forgotten_inscription") assert.strictEqual(record.floor.exp > 0, record.entry.routeEventSuccess, "A deciphered inscription carries an experience reward");
  if (record.entry.routeEventId === "ancient_ward") assert.strictEqual(record.floor.routeEffect?.type || null, record.entry.routeEventSuccess ? "ward" : null, "A restored ward protects only the immediately following battle");
  if (record.entry.routeEventId === "enemy_tracks") assert.strictEqual(record.floor.routeEffect?.type || null, record.entry.routeEventSuccess ? "initiative" : null, "Successfully read tracks prepare the party only for the immediately following battle");
  if (record.entry.kind === "gather" && record.entry.routeEventSuccess) assert(record.floor.drops.some(drop => game.GameData.items[drop.itemId]?.type === "material"), "Successful fieldwork adds a local crafting material");
  return record;
}

const mentorshipRecord = routeRecord(7919, mentorParty).entry;
assert.strictEqual(mentorshipRecord.routeMentorshipApplied, true, "An established guide teaches the exact route to a newcomer during field events");
assert.strictEqual(mentorshipRecord.routeMentorName, "古道の案内役");
assert.deepStrictEqual(JSON.parse(JSON.stringify(mentorshipRecord.routeApprenticeNames)), ["初めて歩く術師"]);
assert(mentorshipRecord.text.includes("帰り道の目印を教えた"), "Route mentorship appears as an in-world scene rather than a bare system bonus");
const mentorshipPanel = game.GameUIViews.results.routeEventPanel({ battleLog: [mentorshipRecord] }, { escape: value => String(value) });
assert(mentorshipPanel.includes("案内役の教え") && mentorshipPanel.includes("道を教えた者：古道の案内役") && mentorshipPanel.includes("教わった者：初めて歩く術師"), "The return report names both sides of route mentorship");
const inheritedMentorshipRecord = routeRecord(7919, inheritedMentorParty).entry;
assert.strictEqual(inheritedMentorshipRecord.routeMentorshipInherited, true, "A guide who once learned this exact route retains inherited teaching in the departure snapshot");
assert.strictEqual(inheritedMentorshipRecord.routeMentorshipBonus, .03, "Inherited teaching slightly strengthens non-combat route support");
assert.strictEqual(inheritedMentorshipRecord.routeApprenticeNames.length, 3, "An inherited guide can look after one more newcomer than an ordinary guide");
assert(inheritedMentorshipRecord.text.includes("かつて教わった目印") && inheritedMentorshipRecord.text.includes("自分の工夫"), "Inherited guidance is narrated as knowledge that changed while being passed onward");
const inheritedMentorshipPanel = game.GameUIViews.results.routeEventPanel({ battleLog: [inheritedMentorshipRecord] }, { escape: value => String(value) });
assert(inheritedMentorshipPanel.includes("継承案内役の教え") && inheritedMentorshipPanel.includes("初めて歩く仲間1、初めて歩く仲間2、初めて歩く仲間3"), "The return report distinguishes inherited guidance and credits every newcomer");
const lineageRecord = routeRecord(7919, lineageParty).entry;
assert.strictEqual(lineageRecord.routeLineageSupportApplied, true, "A first guide, inherited guide and newcomer can carry one exact route together");
assert.strictEqual(lineageRecord.routeLineagePredecessorName, "最初の案内役");
assert.strictEqual(lineageRecord.routeMentorshipBonus, .04, "Bringing the prior mentor gives the three-generation party one additional bounded route bonus");
assert(lineageRecord.text.includes("最初の目印") && lineageRecord.text.includes("三人目の帰り道"), "Three-generation guidance receives its own journey narration");
const lineageJourneyPanel = game.GameUIViews.results.routeEventPanel({ battleLog: [lineageRecord] }, { escape: value => String(value) });
assert(lineageJourneyPanel.includes("三代の道継ぎ") && lineageJourneyPanel.includes("最初の案内役：最初の案内役") && lineageJourneyPanel.includes("道を継いだ者：道を継いだ案内役") && lineageJourneyPanel.includes("教わった者：三人目の新人"), "The return report makes every role in a three-generation route party readable");
const traditionJourney = game.Exploration.journey(dungeon, 1, 7919, undefined, lineageParty, [], [], [], true);
const traditionRecord = traditionJourney.flatMap(floor => floor.entries).find(entry => entry.routeEventId);
assert.strictEqual(traditionRecord.routeTraditionApplied, true, "An established guild route marker is snapshotted into the exact route event");
assert(traditionRecord.text.includes("三代の案内役") && traditionRecord.text.includes("帰還簿"), "Guild route knowledge is narrated as an inherited field marker rather than a naked probability bonus");
const traditionFounderNames = ["最初の案内役", "道を継いだ案内役", "三人目の新人"];
const founderTraditionRecord = game.Exploration.journey(dungeon, 1, 7919, undefined, lineageParty, [], [], [], { tierId: "worn_route", founderNames: traditionFounderNames }).flatMap(floor => floor.entries).find(entry => entry.routeEventId);
assert.deepStrictEqual(JSON.parse(JSON.stringify(founderTraditionRecord.routeTraditionFounderNames)), traditionFounderNames, "A later expedition carries the route marker founders into its factual journey log");
assert(founderTraditionRecord.text.includes("最初の案内役、道を継いだ案内役、三人目の新人が残した"), "The field narration credits the named adventurers whose judgment made the route safer");
const founderTraditionPanel = game.GameUIViews.results.routeEventPanel({ battleLog: [founderTraditionRecord] }, { escape: value => String(value) });
assert(founderTraditionPanel.includes("道を残した三人：最初の案内役、道を継いだ案内役、三人目の新人"), "The return report keeps the founders readable after another party uses their route");
assert.strictEqual(game.Exploration.routeTraditionTier(0).id, "ledger_marker", "A newly established route begins as a ledger marker");
assert.strictEqual(game.Exploration.routeTraditionTier(3).id, "worn_route", "Three later returns turn the marker into a worn route");
assert.strictEqual(game.Exploration.routeTraditionTier(10).id, "guild_road", "Ten later returns establish the guild road's final tier");
const matureTraditionRecord = game.Exploration.journey(dungeon, 1, 7919, undefined, lineageParty, [], [], [], "guild_road").flatMap(floor => floor.entries).find(entry => entry.routeEventId);
assert(matureTraditionRecord.text.includes("ギルドの街道"), "A matured marker names its current shared route tier during exploration");
let maturationBenefitObserved = false;
for (let seed = 1; seed <= 1000 && !maturationBenefitObserved; seed += 1) {
  const ledger = game.Exploration.journey(dungeon, 1, seed * 3571, undefined, ordinaryParty, [], [], [], "ledger_marker").flatMap(floor => floor.entries).find(entry => entry.routeEventId);
  const road = game.Exploration.journey(dungeon, 1, seed * 3571, undefined, ordinaryParty, [], [], [], "guild_road").flatMap(floor => floor.entries).find(entry => entry.routeEventId);
  maturationBenefitObserved = !ledger.routeEventSuccess && road.routeEventSuccess;
}
assert(maturationBenefitObserved, "A matured guild road can turn a route failure into a success with the same deterministic departure conditions");
const traditionJourneyPanel = game.GameUIViews.results.routeEventPanel({ battleLog: [traditionRecord] }, { escape: value => String(value) });
assert(traditionJourneyPanel.includes("ギルドの道標"), "The return report identifies when shared guild route knowledge supported the expedition");
const traditionGrowthPanel = game.GameUIViews.results.routeTraditionPanel({ routeTraditionGrowth: { dungeonId: "meadow", difficultyId: "normal", assistedSorties: 3, tierId: "worn_route", tierLabel: "踏み固められた道", successChanceBonus: .02, description: "幾度もの帰還で足跡そのものが案内になった。" } }, { escape: value => String(value) });
assert(traditionGrowthPanel.includes("踏み固められた道") && traditionGrowthPanel.includes("後続 3遠征") && traditionGrowthPanel.includes("道中判定 +2%") && traditionGrowthPanel.includes("育った道標を道標帳で見る"), "The return report celebrates a route marker that matured through later expeditions");
const traditionResultPanel = game.GameUIViews.results.routeTraditionPanel({ newRouteTradition: { dungeonId: "meadow", difficultyId: "normal", memberNames: ["最初の案内役", "道を継いだ案内役", "三人目の新人"] } }, { escape: value => String(value) });
assert(traditionResultPanel.includes('data-action="open-route-atlas"') && traditionResultPanel.includes('data-dungeon="meadow"') && traditionResultPanel.includes("道標帳に刻まれた頁を見る"), "A newly established route links directly to its permanent atlas entry");
assert(traditionResultPanel.includes("三人の帰り道") && traditionResultPanel.includes("道中判定 +1%"), "The first establishment explains the permanent benefit and credits all three guides");

for (let sample = 1; sample <= 600; sample += 1) {
  const seed = sample * 7919;
  const ordinary = routeRecord(seed, ordinaryParty), familiar = routeRecord(seed, familiarParty), gifted = routeRecord(seed, naturallyGiftedParty), practiced = routeRecord(seed, practicedParty), origin = routeRecord(seed, originParty), specialist = routeRecord(seed, specialistParty);
  const masteredFloors = game.Exploration.journey(dungeon, 1, seed, undefined, ordinaryParty, [], game.GameData.config.explorationEvents.routeEvents.map(event => event.id));
  const mastered = masteredFloors.flatMap((floor, floorIndex) => floor.entries.filter(entry => eventKinds.has(entry.kind)).map(entry => ({ entry, floor, floorIndex })))[0];
  assert.strictEqual(specialist.entry.routeEventId, ordinary.entry.routeEventId, "Party composition changes the outcome, not which scene was rolled");
  assert.strictEqual(familiar.entry.routeEventId, ordinary.entry.routeEventId, "Destination familiarity changes the outcome, not which scene was rolled");
  assert.strictEqual(familiar.entry.routeDestinationFamiliarityApplied, true, "Adventurers who cleared this exact route bring their destination familiarity on departure");
  assert.strictEqual(familiar.entry.routeDestinationFamiliarityMemberNames.length, familiarParty.length, "The factual route log credits every current adventurer who remembers clearing the route");
  assert.strictEqual(practiced.entry.routeEventId, ordinary.entry.routeEventId, "Personal experience changes the outcome, not which scene was rolled");
  assert.strictEqual(gifted.entry.routeEventId, ordinary.entry.routeEventId, "Primary attributes change the outcome, not which scene was rolled");
  assert.strictEqual(gifted.entry.routeNaturalAptitudeApplied, true, "A guide using above-average primary attributes is identified in the factual route log");
  const giftedEvent = game.GameData.config.explorationEvents.routeEvents.find(event => event.id === gifted.entry.routeEventId);
  const giftedAptitude = game.GameData.config.explorationEvents.aptitudes[giftedEvent.aptitudeId];
  assert(gifted.entry.explorationAttributeIds.length >= 1 && gifted.entry.explorationAttributeIds.length <= 2 && gifted.entry.explorationAttributeIds.every(id => id in giftedAptitude.attributeWeights), "A route record names the strongest relevant attributes without exposing the hidden success rate");
  assert.strictEqual(practiced.entry.routeEventPersonalPracticeApplied, true, "A practiced guide records that personal field experience was used");
  assert.strictEqual(origin.entry.routeEventId, ordinary.entry.routeEventId, "Race and birth aptitude do not change which scene was rolled");
  assert.strictEqual(mastered.entry.routeEventId, ordinary.entry.routeEventId, "Recorded field knowledge changes the outcome, not which scene was rolled");
  assert.strictEqual(mastered.entry.routeEventMasteryApplied, true, "A mastered route event records that field knowledge was used");
  assert.strictEqual(specialist.floorIndex, ordinary.floorIndex, "Party composition does not move a rolled scene to another floor");
  seenKinds.add(ordinary.entry.kind);
  seenRouteIds.add(ordinary.entry.routeEventId);
  if (ordinary.entry.routeRumorMatched) meadowRumorMatches += 1;
  if (ordinary.entry.routeEventSuccess) ordinarySuccesses[ordinary.entry.kind] += 1;
  if (familiar.entry.routeEventSuccess) familiarSuccesses[familiar.entry.kind] += 1;
  if (gifted.entry.routeEventSuccess) giftedSuccesses[gifted.entry.kind] += 1;
  if (practiced.entry.routeEventSuccess) practicedSuccesses[practiced.entry.kind] += 1;
  if (mastered.entry.routeEventSuccess) masteredSuccesses[mastered.entry.kind] += 1;
  if (origin.entry.routeEventSuccess) originSuccesses[origin.entry.kind] += 1;
  if (specialist.entry.routeEventSuccess) specialistSuccesses[specialist.entry.kind] += 1;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(game.Exploration.journey(dungeon, 1, seed, undefined, specialistParty, []))), JSON.parse(JSON.stringify(game.Exploration.journey(dungeon, 1, seed, undefined, specialistParty, []))), "The same departure snapshot reproduces its route event");
}
assert.deepStrictEqual([...seenKinds].sort(), ["camp", "gather", "hazard", "lore", "secret"]);
assert(seenRouteIds.has("ancient_ward"), "The expanded route pool can produce an ancient ward scene");
assert(seenRouteIds.has("enemy_tracks"), "The expanded route pool can produce a monster-tracking scene");
assert(meadowRumorMatches > 180, "The destination rumor meaningfully favors its matching route event without guaranteeing it");
assert(Object.keys(ordinarySuccesses).every(kind => familiarSuccesses[kind] >= ordinarySuccesses[kind]) && Object.values(familiarSuccesses).reduce((sum, count) => sum + count, 0) > Object.values(ordinarySuccesses).reduce((sum, count) => sum + count, 0), "A party that has cleared the exact destination gains a small, bounded advantage across its non-combat route checks");
const familiarPanelRecord = routeRecord(7919, familiarParty).entry;
const familiarPanel = game.GameUIViews.results.routeEventPanel({ battleLog: [familiarPanelRecord] }, { escape: value => String(value) });
assert(familiarPanel.includes("土地勘を活用") && familiarPanel.includes("道を覚えていた者"), "The return report explains that remembered terrain helped without exposing a hidden numeric rate");
const giftedCluePanelRecord = routeRecord(7919, naturallyGiftedParty).entry;
const giftedCluePanel = game.GameUIViews.results.routeEventPanel({ battleLog: [giftedCluePanelRecord] }, { escape: value => String(value) });
assert(giftedCluePanel.includes("導いた者：道を見る術師") && giftedCluePanel.includes("基礎能力を活用"), "The return report connects a non-combat success to the adventurer and attributes that helped");
for (const kind of seenKinds) {
  assert(giftedSuccesses[kind] > ordinarySuccesses[kind], `${kind} can improve through matching primary attributes without exposing its exact rate`);
  assert(practicedSuccesses[kind] > ordinarySuccesses[kind], `${kind} becomes easier when an adventurer has repeatedly solved the same route event`);
  assert(masteredSuccesses[kind] > ordinarySuccesses[kind], `${kind} becomes easier after the guild has accumulated enough successful field notes`);
  assert(originSuccesses[kind] > ordinarySuccesses[kind], `${kind} outcomes can improve through race and birth even without a matching job`);
  assert(kind === "lore" ? specialistSuccesses[kind] >= originSuccesses[kind] : specialistSuccesses[kind] > originSuccesses[kind], `${kind} combines job, race and birth aptitude without guaranteeing success`);
}
const environmentCounts = {
  green: { hidden_passage: 0, sheltered_camp: 0, unstable_footing: 0, forgotten_inscription: 0, material_traces: 0, ancient_ward: 0, enemy_tracks: 0 },
  purple: { hidden_passage: 0, sheltered_camp: 0, unstable_footing: 0, forgotten_inscription: 0, material_traces: 0, ancient_ward: 0, enemy_tracks: 0 },
  red: { hidden_passage: 0, sheltered_camp: 0, unstable_footing: 0, forgotten_inscription: 0, material_traces: 0, ancient_ward: 0, enemy_tracks: 0 }
};
for (let sample = 1; sample <= 600; sample += 1) {
  for (const color of Object.keys(environmentCounts)) {
    const record = routeRecord(sample * 3571, ordinaryParty, { ...dungeon, color });
    environmentCounts[color][record.entry.routeEventId] += 1;
  }
}
assert(environmentCounts.green.hidden_passage > environmentCounts.green.unstable_footing, "Open green routes favor discovering side paths over unstable terrain");
assert(environmentCounts.green.material_traces > environmentCounts.green.unstable_footing, "Open green routes favor gathering local traces over unstable terrain");
assert(environmentCounts.purple.forgotten_inscription > environmentCounts.purple.unstable_footing, "Ancient ruins favor finding inscriptions over unstable terrain");
assert(environmentCounts.red.unstable_footing > environmentCounts.red.hidden_passage, "Volcanic routes favor hazardous footing over hidden passages");
const longJourney = game.Exploration.journey(dungeon, 6, 8675309, undefined, specialistParty, []);
const longRouteEvents = longJourney.flatMap((floor, floorIndex) => floor.entries.filter(entry => eventKinds.has(entry.kind)).map(entry => ({ entry, floorIndex })));
assert.strictEqual(longRouteEvents.length, 3, "A sixfold expedition contains three route events rather than stretching one scene across the whole journey");
assert.strictEqual(new Set(longRouteEvents.map(record => record.entry.routeEventId)).size, 3, "One long expedition samples distinct route-event families");
assert.strictEqual(new Set(longRouteEvents.map(record => record.floorIndex)).size, 3, "Long-journey route events occur on separate floors");
assert(longRouteEvents.every(record => record.floorIndex > 0 && record.floorIndex < longJourney.length - 1), "Long-journey route events remain between the opening and boss floors");
assert(longRouteEvents.length < 6, "One sixfold expedition remains less event-efficient than six short departures");

const originalJourney = game.Exploration.journey;
const originalSeededRandom = game.GameRuntime.seededRandom;
const wardTrialDungeon = {
  id: "ward_trial",
  name: "守護陣試験場",
  color: "purple",
  combatRules: { maxTurnsPerEncounter: 2, betweenEncounterRecovery: 0 },
  encounters: [{ name: "試験戦", groups: [["slime"]] }],
  rewards: { gold: [1, 1], exp: [1, 1] },
  drops: []
};
const wardTrialMember = {
  id: "ward-tester",
  name: "試験役",
  level: 1,
  jobId: "warrior",
  raceId: "human",
  position: 0,
  weaponRange: "melee",
  actionRates: { attack: 100, technique: 0, spell: 0, healing: 0 },
  skillIds: [],
  equipmentSkillIds: [],
  specialEquipment: [],
  stats: {
    hp: 9999,
    attack: 1,
    defense: 0,
    magicAttack: 1,
    magicDefense: 0,
    magicHealing: 1,
    hitRate: 1.2,
    evasionRate: 0,
    speed: 1,
    attackCount: 1,
    criticalRate: 0,
    skillPower: 1,
    healingPower: 1,
    physicalPower: 1,
    magicPower: 1,
    slayerMultipliers: {}
  }
};
const plainFloor = { entries: [{ kind: "lore", text: "守護陣を調べた。" }], gold: 0, exp: 0, drops: [] };
try {
  game.GameRuntime.seededRandom = () => () => .5;
  game.Exploration.journey = () => [{ ...plainFloor }];
  const plainWardTrial = game.Battle.resolve({ seed: 1, partyIds: [], partySnapshot: [wardTrialMember] }, wardTrialDungeon);
  game.Exploration.journey = () => [{ ...plainFloor, routeEffect: { type: "ward", rate: .15 } }];
  const protectedWardTrial = game.Battle.resolve({ seed: 1, partyIds: [], partySnapshot: [wardTrialMember] }, wardTrialDungeon);
  assert(protectedWardTrial.memberReports[0].damageTaken < plainWardTrial.memberReports[0].damageTaken, "A restored ward reduces damage in the immediately following battle");
  assert(protectedWardTrial.battleLog.some(entry => entry.kind === "lore" && entry.text.includes("15%軽減")), "The expedition log explains the ancient ward's temporary protection");
} finally {
  game.Exploration.journey = originalJourney;
  game.GameRuntime.seededRandom = originalSeededRandom;
}
const trackingTrialMember = JSON.parse(JSON.stringify(wardTrialMember));
trackingTrialMember.id = "tracking-tester";
trackingTrialMember.name = "追跡役";
trackingTrialMember.stats.hitRate = .45;
try {
  game.GameRuntime.seededRandom = () => () => .5;
  game.Exploration.journey = () => [{ ...plainFloor }];
  const unpreparedTrial = game.Battle.resolve({ seed: 1, partyIds: [], partySnapshot: [trackingTrialMember] }, wardTrialDungeon);
  game.Exploration.journey = () => [{ ...plainFloor, routeEffect: { type: "initiative", rate: .2 } }];
  const preparedTrial = game.Battle.resolve({ seed: 1, partyIds: [], partySnapshot: [trackingTrialMember] }, wardTrialDungeon);
  assert(preparedTrial.memberReports[0].damageDealt > unpreparedTrial.memberReports[0].damageDealt, "Reading monster tracks improves the next battle's opening accuracy");
  assert(preparedTrial.battleLog.some(entry => entry.kind === "secret" && entry.text.includes("行動速度と命中精度")), "The expedition log explains the temporary advantage gained from reading tracks");
} finally {
  game.Exploration.journey = originalJourney;
  game.GameRuntime.seededRandom = originalSeededRandom;
}
console.log("Exploration route event test passed: narrative rumors, personal and shared knowledge, specialist team surveys, deterministic scenes, environment weighting and scaled long-journey variety");
