const fs = require("fs"), path = require("path"), vm = require("vm"), assert = require("assert");
const root = path.resolve(__dirname, ".."), context = vm.createContext({ window: {}, console, Date, Math, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
for (const [, file] of fs.readFileSync(path.join(root, "index.html"), "utf8").matchAll(/src="([^"]+\.js)"/g)) {
  if (["js/ui.js", "js/main.js"].includes(file)) continue;
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const game = context.window;
const dungeon = game.DungeonDifficulty.variant(game.GameData.dungeons.meadow, "normal");
function party(sharedSorties, companions = false) {
  return [
    { id: "adventurer-1", name: "アルト", jobId: "warrior", raceId: "human", birthId: "common", companionId: companions ? "mina" : null, sharedSorties: { "adventurer-2": sharedSorties } },
    { id: "adventurer-2", name: "ベル", jobId: "cleric", raceId: "elf", birthId: "sacred", companionId: companions ? "elena" : null, sharedSorties: { "adventurer-1": sharedSorties } }
  ];
}
function moments(seed, members) {
  return game.Exploration.journey(dungeon, 1, seed, undefined, members, []).flatMap(floor => floor.entries.filter(entry => entry.kind === "bond"));
}

const definitions = new Map(game.GameData.config.explorationEvents.adventurerBondMoments.map(entry => [entry.id, entry]));
assert.strictEqual(moments(1, party(4)).length, 0, "A pair needs five shared departures before a travel-companion scene can occur");
for (let seed = 1; seed <= 100; seed += 1) assert.strictEqual(moments(seed, party(4)).length, 0, "An unfamiliar pair never rolls a relationship scene");
for (let seed = 1; seed <= 100; seed += 1) assert.strictEqual(moments(seed, party(20, true)).length, 0, "Authored companions use their authored scenes instead of generic recruit moments");

let first = null, deeper = null;
for (let seed = 1; seed <= 300; seed += 1) {
  const entries = moments(seed, party(20));
  assert(entries.length <= 1, "A single expedition contains at most one generic relationship scene");
  if (!entries.length) continue;
  const entry = entries[0], definition = definitions.get(entry.adventurerBondMomentId);
  assert(definition, "Every relationship scene refers to master data");
  assert.strictEqual(JSON.stringify(entry.adventurerBondMemberNames), JSON.stringify(["アルト", "ベル"]));
  assert.strictEqual(entry.sharedSorties, 20);
  assert(entry.text.includes("アルト") && entry.text.includes("ベル") && !entry.text.includes("{"), "The scene resolves both adventurer names");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(entries)), JSON.parse(JSON.stringify(moments(seed, party(20)))), "The departure seed reproduces the same relationship scene");
  first ||= entry;
  if (definition.minimumSharedSorties === 20) deeper ||= entry;
}
assert(first, "A familiar pair can create a short scene during exploration");
assert(deeper, "Twenty shared departures unlock deeper relationship scenes");

const basicIds = game.GameData.config.explorationEvents.adventurerBondMoments.filter(entry => entry.minimumSharedSorties === 5).map(entry => entry.id);
const rememberedParty = party(20);
rememberedParty[0].bondMomentIds = { "adventurer-2": basicIds };
rememberedParty[1].bondMomentIds = { "adventurer-1": basicIds };
let unseenAfterBasics = null;
for (let seed = 1; seed <= 100 && !unseenAfterBasics; seed += 1) unseenAfterBasics = moments(seed, rememberedParty)[0] || null;
assert(unseenAfterBasics && definitions.get(unseenAfterBasics.adventurerBondMomentId).minimumSharedSorties === 20, "A pair sees newly unlocked memories before repeating earlier scenes");

const routeKinds = new Set(game.GameData.config.explorationEvents.routeEvents.map(entry => entry.kind));
const routeEntry = (seed, members) => game.Exploration.journey(dungeon, 1, seed, undefined, members, [])
  .flatMap(floor => floor.entries).find(entry => routeKinds.has(entry.kind));
let unfamiliarSuccesses = 0, familiarSuccesses = 0, familiarRoute = null;
for (let seed = 1; seed <= 1200; seed += 1) {
  const unfamiliar = routeEntry(seed, party(4)), familiar = routeEntry(seed, party(20));
  assert.strictEqual(familiar.routeEventId, unfamiliar.routeEventId, "A relationship changes how a sign is handled, not which route event was rolled");
  unfamiliarSuccesses += unfamiliar.routeEventSuccess ? 1 : 0;
  familiarSuccesses += familiar.routeEventSuccess ? 1 : 0;
  familiarRoute ||= familiar;
}
assert(familiarSuccesses > unfamiliarSuccesses, "A pair that repeatedly travels together becomes slightly more reliable during route events");
assert.strictEqual(familiarRoute.routeBondSupportApplied, true, "The route log records when a familiar companion supported its guide");
assert.deepStrictEqual(JSON.parse(JSON.stringify(familiarRoute.routeBondSupportMemberNames)).sort(), ["アルト", "ベル"], "Relationship support identifies both adventurers without exposing its numeric bonus");
assert(game.GameData.config.explorationEvents.adventurerBondRouteSupport.some(tier => tier.label === familiarRoute.routeBondSupportLabel), "Relationship support uses a data-defined narrative tier");
const routePanel = game.GameUIViews.results.routeEventPanel({ battleLog: [familiarRoute] }, { escape: value => String(value) });
assert(routePanel.includes(familiarRoute.routeBondSupportLabel) && routePanel.includes("息を合わせた者") && routePanel.includes("アルト") && routePanel.includes("ベル") && !routePanel.includes("%"), "The return report shows who worked in step without revealing the hidden probability bonus");

game.GameState.data.characters.push(
  { id: "adventurer-1", name: "アルト", jobId: "warrior", level: 1, expeditionRecord: game.Characters.emptyExpeditionRecord() },
  { id: "adventurer-2", name: "ベル", jobId: "cleric", level: 1, expeditionRecord: game.Characters.emptyExpeditionRecord() }
);
const familiarNote = game.ObservationJournal.note("familiar_companion_signals"), trustedNote = game.ObservationJournal.note("trusted_companion_formation");
game.GameState.data.adventurerBonds.pairs["adventurer-1::adventurer-2"] = 4;
assert(!game.ObservationJournal.unlocked(familiarNote) && !game.ObservationJournal.unlocked(trustedNote), "Relationship field notes remain blank before the first shared-travel threshold");
game.GameState.data.adventurerBonds.pairs["adventurer-1::adventurer-2"] = 5;
assert(game.ObservationJournal.unlocked(familiarNote) && !game.ObservationJournal.unlocked(trustedNote), "Five shared expeditions reveal the first diary observation only");
game.GameState.data.adventurerBonds.pairs["adventurer-1::adventurer-2"] = 20;
assert(game.ObservationJournal.unlocked(trustedNote), "Twenty shared expeditions reveal the deeper formation observation");
assert.strictEqual(game.Characters.recordBondMemory(["adventurer-2", "adventurer-1"], deeper.adventurerBondMomentId), true, "A newly witnessed scene is stored for the pair");
assert.strictEqual(game.Characters.recordBondMemory(["adventurer-1", "adventurer-2"], deeper.adventurerBondMomentId), false, "The same scene is not stored twice");
assert(game.Characters.bondMemories("adventurer-1", "adventurer-2").includes(deeper.adventurerBondMomentId), "Either adventurer can read the shared memory archive");
assert(game.Characters.sharedSorties(game.GameState.data.characters[0])[0].memoryIds.includes(deeper.adventurerBondMomentId), "The adventurer relationship summary exposes witnessed memories");

const panel = game.GameUIViews.results.adventurerBondMomentPanel({ battleLog: [first], newAdventurerBondMomentIds: [first.adventurerBondMomentId] }, { escape: value => String(value) });
assert(panel.includes("旅を重ねた仲間のひと幕") && panel.includes("アルトとベル") && panel.includes("同行20回") && panel.includes("NEW") && panel.includes(definitions.get(first.adventurerBondMomentId).title) && panel.includes("open-adventurer-bonds"), "The return report surfaces and links to a newly archived relationship scene");
const tierPanel = game.GameUIViews.results.adventurerBondTierPanel({ newAdventurerBondTiers: [{ memberIds: ["adventurer-1", "adventurer-2"], memberNames: ["アルト", "ベル"], sharedSorties: 5, routeLabel: "歩調の合う支え", battleLabel: "合図の通る間合い" }] }, { escape: value => String(value) });
assert(tierPanel.includes("旅を重ねた二人の呼吸が変わりました") && tierPanel.includes("アルトとベル") && tierPanel.includes("同行5回") && tierPanel.includes("歩調の合う支え") && tierPanel.includes("合図の通る間合い") && tierPanel.includes("open-adventurer-bonds") && !tierPanel.includes("1.02"), "A newly reached relationship tier is celebrated in-world without exposing hidden modifiers");
const archive = game.GameUIViews.archives.adventurerRecords({ escape: value => String(value), portraitImage: () => "" });
assert(archive.includes("旅仲間の記憶") && archive.includes("アルトとベル") && archive.includes(definitions.get(deeper.adventurerBondMomentId).title) && archive.includes(deeper.text), "The archive offers a tap-open, mobile-readable copy of every shared memory");
const observationArchive = game.GameUIViews.archives.observations({ escape: value => String(value) });
assert(observationArchive.includes("言葉より先に合う歩幅") && observationArchive.includes("背中を預ける、ということ") && !observationArchive.includes("1.02") && !observationArchive.includes("1.04"), "The progressive diary explains relationship clues in-world without exposing internal modifiers");
console.log("Adventurer bond moment test passed: generic recruits gain deterministic memories, progressive field notes and archive-readable relationships");
